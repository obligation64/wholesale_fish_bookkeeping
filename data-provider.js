// 数据提供者 - 根据存储模式提供统一的数据访问接口
const storageManager = require('./storage-manager');
const { getDatabase } = require('./database');

class DataProvider {
    constructor() {
        this.storageManager = storageManager;
    }

    // 获取所有记录
    async getAll(tableName) {
        const mode = this.storageManager.getMode();

        if (mode === 'local') {
            // 本地模式: 从SQLite读取
            const db = getDatabase();
            const stmt = db.prepare(`SELECT * FROM ${tableName}`);
            return stmt.all();
        } else if (mode === 'cloud') {
            // 云模式: 从CloudBase读取
            const cloudStorage = this.storageManager.getCloudStorage();
            const collectionName = this.getCollectionName(tableName);
            const data = await cloudStorage.get(collectionName);
            // 转换云数据格式
            return data.map(item => this.convertCloudToLocal(item));
        } else {
            // hybrid模式: 从本地读取
            const db = getDatabase();
            const stmt = db.prepare(`SELECT * FROM ${tableName}`);
            return stmt.all();
        }
    }

    // 根据ID获取记录
    async getById(tableName, id) {
        const mode = this.storageManager.getMode();

        if (mode === 'local' || mode === 'hybrid') {
            const db = getDatabase();
            const stmt = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
            return stmt.get(id);
        } else {
            const cloudStorage = this.storageManager.getCloudStorage();
            const collectionName = this.getCollectionName(tableName);
            const data = await cloudStorage.get(collectionName, {
                where: { local_id: id }
            });
            return data.length > 0 ? this.convertCloudToLocal(data[0]) : null;
        }
    }

    // 添加记录
    async add(tableName, data) {
        const mode = this.storageManager.getMode();

        if (mode === 'local' || mode === 'hybrid') {
            // 本地或混合模式: 写入SQLite
            const db = getDatabase();
            const columns = Object.keys(data).join(', ');
            const placeholders = Object.keys(data).map(() => '?').join(', ');
            const values = Object.values(data);
            const stmt = db.prepare(`INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`);
            const result = stmt.run(...values);
            const localId = result.lastInsertRowid;

            // 混合模式: 同步到云端
            if (mode === 'hybrid') {
                try {
                    await this.syncToCloud(tableName, { id: localId, ...data });
                } catch (error) {
                    console.warn(`⚠️  同步到云端失败: ${error.message}`);
                }
            }

            return { id: localId, success: true };
        } else {
            // 云模式: 直接写入CloudBase
            const cloudStorage = this.storageManager.getCloudStorage();
            const collectionName = this.getCollectionName(tableName);
            const cloudData = this.convertLocalToCloud(data);
            const result = await cloudStorage.add(collectionName, cloudData);
            return { id: result.id, success: true };
        }
    }

    // 更新记录
    async update(tableName, id, data) {
        const mode = this.storageManager.getMode();

        if (mode === 'local' || mode === 'hybrid') {
            // 本地或混合模式: 更新SQLite
            const db = getDatabase();
            const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
            const values = [...Object.values(data), id];
            const stmt = db.prepare(`UPDATE ${tableName} SET ${setClause} WHERE id = ?`);
            stmt.run(...values);

            // 混合模式: 同步到云端
            if (mode === 'hybrid') {
                try {
                    const cloudStorage = this.storageManager.getCloudStorage();
                    const collectionName = this.getCollectionName(tableName);
                    // 查找云端记录
                    const cloudRecords = await cloudStorage.get(collectionName, {
                        where: { local_id: id }
                    });
                    if (cloudRecords.length > 0) {
                        await cloudStorage.update(collectionName, cloudRecords[0]._id, data);
                    }
                } catch (error) {
                    console.warn(`⚠️  同步更新到云端失败: ${error.message}`);
                }
            }

            return { success: true };
        } else {
            // 云模式: 更新CloudBase
            const cloudStorage = this.storageManager.getCloudStorage();
            const collectionName = this.getCollectionName(tableName);
            await cloudStorage.update(collectionName, id, data);
            return { success: true };
        }
    }

    // 删除记录
    async delete(tableName, id) {
        const mode = this.storageManager.getMode();

        if (mode === 'local' || mode === 'hybrid') {
            // 本地或混合模式: 从SQLite删除
            const db = getDatabase();
            const stmt = db.prepare(`DELETE FROM ${tableName} WHERE id = ?`);
            stmt.run(id);

            // 混合模式: 从云端删除
            if (mode === 'hybrid') {
                try {
                    const cloudStorage = this.storageManager.getCloudStorage();
                    const collectionName = this.getCollectionName(tableName);
                    const cloudRecords = await cloudStorage.get(collectionName, {
                        where: { local_id: id }
                    });
                    for (const record of cloudRecords) {
                        await cloudStorage.delete(collectionName, record._id);
                    }
                } catch (error) {
                    console.warn(`⚠️  从云端删除失败: ${error.message}`);
                }
            }

            return { success: true };
        } else {
            // 云模式: 从CloudBase删除
            const cloudStorage = this.storageManager.getCloudStorage();
            const collectionName = this.getCollectionName(tableName);
            await cloudStorage.delete(collectionName, id);
            return { success: true };
        }
    }

    // 辅助方法: 获取集合名称
    getCollectionName(tableName) {
        const mapping = {
            customers: 'customers',
            products: 'products',
            sales: 'sales',
            expenses: 'expenses',
            monthly_expenses: 'monthly_expenses',
            inventory: 'inventory',
            change_logs: 'change_logs'
        };
        return mapping[tableName] || tableName;
    }

    // 辅助方法: 云数据转本地格式
    convertCloudToLocal(cloudData) {
        const { _id, local_id, synced_at, ...rest } = cloudData;
        return {
            id: local_id,
            ...rest
        };
    }

    // 辅助方法: 本地数据转云格式
    convertLocalToCloud(localData) {
        return {
            ...localData,
            synced_at: new Date().toISOString()
        };
    }

    // 同步到云端(混合模式专用)
    async syncToCloud(tableName, data) {
        const cloudStorage = this.storageManager.getCloudStorage();
        const collectionName = this.getCollectionName(tableName);
        const cloudData = this.convertLocalToCloud(data);
        await cloudStorage.add(collectionName, cloudData);
    }
}

// 导出单例
const dataProvider = new DataProvider();
module.exports = dataProvider;
