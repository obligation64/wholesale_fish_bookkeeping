// 数据同步管理模块
const cloudStorage = require('./cloud-storage');
const { getDatabase } = require('./database');
const config = require('./config');

class SyncManager {
    constructor() {
        this.syncing = false;
        this.lastSyncTime = null;
    }

    // 初始化同步
    async init() {
        try {
            await cloudStorage.init();
            console.log('✅ 同步管理器初始化成功');
            return true;
        } catch (error) {
            console.error('❌ 同步管理器初始化失败:', error.message);
            return false;
        }
    }

    // 全量同步所有数据到云开发
    async syncAllToCloud() {
        if (this.syncing) {
            console.log('⏳ 同步正在进行中,请稍后...');
            return false;
        }

        this.syncing = true;
        console.log('🔄 开始全量同步到云开发...');

        try {
            const db = getDatabase();
            const syncTime = new Date().toISOString();

            // 同步客户数据
            await this.syncTable(db, 'customers', config.tcb.collections.customers, syncTime);

            // 同步产品数据
            await this.syncTable(db, 'products', config.tcb.collections.products, syncTime);

            // 同步销售数据
            await this.syncTable(db, 'sales', config.tcb.collections.sales, syncTime);

            // 同步支出数据
            await this.syncTable(db, 'expenses', config.tcb.collections.expenses, syncTime);

            // 同步月度固定支出数据
            await this.syncTable(db, 'monthly_expenses', config.tcb.collections.monthly_expenses, syncTime);

            // 同步库存数据
            await this.syncTable(db, 'inventory', config.tcb.collections.inventory, syncTime);

            // 同步变更日志
            await this.syncTable(db, 'change_logs', config.tcb.collections.change_logs, syncTime);

            this.lastSyncTime = syncTime;
            console.log('✅ 全量同步完成');
            return true;
        } catch (error) {
            console.error('❌ 全量同步失败:', error.message);
            return false;
        } finally {
            this.syncing = false;
        }
    }

    // 同步单个表
    async syncTable(db, tableName, cloudCollectionName, syncTime) {
        try {
            console.log(`🔄 正在同步 ${tableName}...`);

            // 获取本地数据
            const stmt = db.prepare(`SELECT * FROM ${tableName}`);
            const localData = stmt.all();

            if (localData.length === 0) {
                console.log(`ℹ️  ${tableName} 无数据,跳过`);
                return;
            }

            // 转换数据格式 (SQLite的自增ID转为_id,添加时间戳)
            const cloudData = localData.map(item => {
                const { id, ...rest } = item;
                return {
                    local_id: id, // 保留本地ID
                    ...rest,
                    synced_at: syncTime
                };
            });

            // 批量上传到云端
            const batchSize = config.tcb.sync.batchSize;
            for (let i = 0; i < cloudData.length; i += batchSize) {
                const batch = cloudData.slice(i, i + batchSize);
                await cloudStorage.addMany(cloudCollectionName, batch);
            }

            // 更新同步状态
            await cloudStorage.updateSyncStatus(tableName, syncTime);

            console.log(`✅ ${tableName} 同步完成 (${localData.length} 条记录)`);
        } catch (error) {
            console.error(`❌ 同步 ${tableName} 失败:`, error.message);
            throw error;
        }
    }

    // 增量同步 (只同步新增或更新的记录)
    async syncIncrementalToCloud() {
        if (this.syncing) {
            console.log('⏳ 同步正在进行中,请稍后...');
            return false;
        }

        this.syncing = true;
        console.log('🔄 开始增量同步到云开发...');

        try {
            const db = getDatabase();
            const syncTime = new Date().toISOString();

            const tables = [
                { local: 'customers', cloud: config.tcb.collections.customers },
                { local: 'products', cloud: config.tcb.collections.products },
                { local: 'sales', cloud: config.tcb.collections.sales },
                { local: 'expenses', cloud: config.tcb.collections.expenses },
                { local: 'monthly_expenses', cloud: config.tcb.collections.monthly_expenses },
                { local: 'inventory', cloud: config.tcb.collections.inventory },
                { local: 'change_logs', cloud: config.tcb.collections.change_logs }
            ];

            for (const table of tables) {
                await this.syncTableIncremental(db, table.local, table.cloud, syncTime);
            }

            this.lastSyncTime = syncTime;
            console.log('✅ 增量同步完成');
            return true;
        } catch (error) {
            console.error('❌ 增量同步失败:', error.message);
            return false;
        } finally {
            this.syncing = false;
        }
    }

    // 增量同步单个表
    async syncTableIncremental(db, tableName, cloudCollectionName, syncTime) {
        try {
            // 获取上次的同步时间
            const syncStatus = await cloudStorage.getSyncStatus(tableName);
            const lastSyncTime = syncStatus ? syncStatus.last_sync_time : null;

            if (!lastSyncTime) {
                // 如果没有上次同步时间,执行全量同步
                console.log(`ℹ️  ${tableName} 首次同步,执行全量同步`);
                await this.syncTable(db, tableName, cloudCollectionName, syncTime);
                return;
            }

            console.log(`🔄 正在增量同步 ${tableName} (自 ${lastSyncTime})...`);

            // 获取本地更新/新增的数据
            const stmt = db.prepare(`
                SELECT * FROM ${tableName}
                WHERE updated_at > ? OR created_at > ?
            `);
            const localData = stmt.all(lastSyncTime, lastSyncTime);

            if (localData.length === 0) {
                console.log(`ℹ️  ${tableName} 无新增/更新数据,跳过`);
                await cloudStorage.updateSyncStatus(tableName, syncTime);
                return;
            }

            // 转换数据格式
            const cloudData = localData.map(item => {
                const { id, ...rest } = item;
                return {
                    local_id: id,
                    ...rest,
                    synced_at: syncTime
                };
            });

            // 批量上传
            await cloudStorage.addMany(cloudCollectionName, cloudData);

            // 更新同步状态
            await cloudStorage.updateSyncStatus(tableName, syncTime);

            console.log(`✅ ${tableName} 增量同步完成 (${localData.length} 条记录)`);
        } catch (error) {
            console.error(`❌ 增量同步 ${tableName} 失败:`, error.message);
            throw error;
        }
    }

    // 从云开发恢复数据
    async restoreFromCloud(collectionName, localTableName) {
        try {
            console.log(`🔄 正在从云开发恢复 ${collectionName}...`);

            // 从云端获取数据
            const cloudData = await cloudStorage.get(collectionName);

            if (cloudData.length === 0) {
                console.log(`ℹ️  云端 ${collectionName} 无数据`);
                return;
            }

            const db = getDatabase();

            // 清空本地表
            db.prepare(`DELETE FROM ${localTableName}`).run();

            // 恢复数据到本地
            for (const item of cloudData) {
                const { local_id, _id, synced_at, ...data } = item;
                const columns = Object.keys(data).join(', ');
                const placeholders = Object.keys(data).map(() => '?').join(', ');
                const values = Object.values(data);

                const stmt = db.prepare(`
                    INSERT INTO ${localTableName} (${columns})
                    VALUES (${placeholders})
                `);
                stmt.run(...values);
            }

            console.log(`✅ 从云开发恢复 ${collectionName} 完成 (${cloudData.length} 条记录)`);
            return cloudData.length;
        } catch (error) {
            console.error(`❌ 从云开发恢复 ${collectionName} 失败:`, error.message);
            throw error;
        }
    }

    // 启动定时同步
    startAutoSync() {
        if (!config.tcb.sync.enabled) {
            console.log('ℹ️  自动同步已禁用');
            return;
        }

        const interval = config.tcb.sync.interval;
        console.log(`⏰ 启动自动同步,间隔: ${interval / 1000} 秒`);

        setInterval(async () => {
            try {
                await this.syncIncrementalToCloud();
            } catch (error) {
                console.error('⚠️  自动同步出错:', error.message);
            }
        }, interval);
    }
}

// 导出单例
const syncManager = new SyncManager();
module.exports = syncManager;
