// 腾讯云开发(CloudBase)集成模块
const cloudbase = require('@cloudbase/node-sdk');
const config = require('./config');

class CloudStorage {
    constructor() {
        this.app = null;
        this.db = null;
        this.initialized = false;
    }

    // 初始化CloudBase连接
    async init() {
        if (this.initialized) {
            console.log('✅ CloudBase已初始化');
            return true;
        }

        try {
            const initConfig = {
                env: config.tcb.env
            };

            // 如果配置了密钥,则添加到配置中
            if (config.tcb.secretId && config.tcb.secretKey) {
                initConfig.secretId = config.tcb.secretId;
                initConfig.secretKey = config.tcb.secretKey;
            }

            this.app = cloudbase.init(initConfig);
            this.db = this.app.database();
            
            // 测试连接
            await this.testConnection();
            
            this.initialized = true;
            console.log('✅ CloudBase初始化成功');
            console.log(`📌 环境ID: ${config.tcb.env}`);
            return true;
        } catch (error) {
            console.error('❌ CloudBase初始化失败:', error.message);
            console.log('ℹ️  提示: 如果在云函数内运行,可以不配置secretId和secretKey');
            return false;
        }
    }

    // 测试连接
    async testConnection() {
        try {
            const result = await this.db.collection('sync_status').limit(1).get();
            console.log('✅ CloudBase连接测试成功');
            return true;
        } catch (error) {
            // 如果集合不存在,创建它
            if (error.code === 'DATABASE_COLLECTION_NOT_EXIST') {
                console.log('ℹ️  首次连接,将创建必要的集合');
                await this.createCollections();
                return true;
            }
            throw error;
        }
    }

    // 创建所有必要的集合
    async createCollections() {
        const collections = Object.values(config.tcb.collections);
        
        for (const collectionName of collections) {
            try {
                await this.db.createCollection(collectionName);
                console.log(`✅ 创建集合: ${collectionName}`);
            } catch (error) {
                // 集合已存在,忽略错误
                if (error.code !== 'DATABASE_COLLECTION_EXIST') {
                    console.warn(`⚠️  创建集合 ${collectionName} 失败:`, error.message);
                }
            }
        }
    }

    // 添加记录
    async add(collectionName, data) {
        if (!this.initialized) {
            throw new Error('CloudBase未初始化');
        }

        try {
            const collection = this.db.collection(collectionName);
            const result = await collection.add(data);
            console.log(`✅ 添加记录到 ${collectionName}:`, result.id);
            return result;
        } catch (error) {
            console.error(`❌ 添加记录到 ${collectionName} 失败:`, error.message);
            throw error;
        }
    }

    // 批量添加记录
    async addMany(collectionName, dataList) {
        if (!this.initialized) {
            throw new Error('CloudBase未初始化');
        }

        try {
            const collection = this.db.collection(collectionName);
            const result = await collection.add(dataList);
            console.log(`✅ 批量添加${dataList.length}条记录到 ${collectionName}`);
            return result;
        } catch (error) {
            console.error(`❌ 批量添加记录到 ${collectionName} 失败:`, error.message);
            throw error;
        }
    }

    // 获取记录
    async get(collectionName, query = {}) {
        if (!this.initialized) {
            throw new Error('CloudBase未初始化');
        }

        try {
            let collection = this.db.collection(collectionName);
            
            if (query.where) {
                collection = collection.where(query.where);
            }
            
            if (query.orderBy) {
                collection = collection.orderBy(query.orderBy.field, query.orderBy.order || 'desc');
            }
            
            if (query.limit) {
                collection = collection.limit(query.limit);
            }
            
            if (query.offset) {
                collection = collection.skip(query.offset);
            }

            const result = await collection.get();
            return result.data || [];
        } catch (error) {
            console.error(`❌ 获取记录从 ${collectionName} 失败:`, error.message);
            throw error;
        }
    }

    // 根据ID获取单条记录
    async getById(collectionName, id) {
        if (!this.initialized) {
            throw new Error('CloudBase未初始化');
        }

        try {
            const result = await this.db.collection(collectionName).doc(id).get();
            return result.data[0] || null;
        } catch (error) {
            console.error(`❌ 获取记录 ${id} 失败:`, error.message);
            throw error;
        }
    }

    // 更新记录
    async update(collectionName, id, data) {
        if (!this.initialized) {
            throw new Error('CloudBase未初始化');
        }

        try {
            const result = await this.db.collection(collectionName).doc(id).update({
                ...data,
                updated_at: new Date().toISOString()
            });
            console.log(`✅ 更新记录 ${id} 在 ${collectionName}`);
            return result;
        } catch (error) {
            console.error(`❌ 更新记录 ${id} 失败:`, error.message);
            throw error;
        }
    }

    // 删除记录
    async delete(collectionName, id) {
        if (!this.initialized) {
            throw new Error('CloudBase未初始化');
        }

        try {
            const result = await this.db.collection(collectionName).doc(id).remove();
            console.log(`✅ 删除记录 ${id} 从 ${collectionName}`);
            return result;
        } catch (error) {
            console.error(`❌ 删除记录 ${id} 失败:`, error.message);
            throw error;
        }
    }

    // 清空集合
    async clearCollection(collectionName) {
        if (!this.initialized) {
            throw new Error('CloudBase未初始化');
        }

        try {
            // 获取所有记录ID
            const records = await this.get(collectionName, { limit: 1000 });
            
            for (const record of records) {
                await this.delete(collectionName, record._id);
            }
            
            console.log(`✅ 清空集合 ${collectionName}`);
            return true;
        } catch (error) {
            console.error(`❌ 清空集合 ${collectionName} 失败:`, error.message);
            throw error;
        }
    }

    // 同步状态管理
    async updateSyncStatus(tableName, syncTime) {
        if (!this.initialized) {
            throw new Error('CloudBase未初始化');
        }

        try {
            const collection = this.db.collection(config.tcb.collections.sync_status);
            
            // 查找是否已存在该表的同步状态
            const existing = await collection.where({ table_name: tableName }).get();
            
            const statusData = {
                table_name: tableName,
                last_sync_time: syncTime,
                updated_at: new Date().toISOString()
            };

            if (existing.data && existing.data.length > 0) {
                await collection.doc(existing.data[0]._id).update(statusData);
            } else {
                await collection.add(statusData);
            }
            
            console.log(`✅ 更新同步状态: ${tableName}`);
        } catch (error) {
            console.error(`❌ 更新同步状态失败:`, error.message);
            throw error;
        }
    }

    async getSyncStatus(tableName) {
        if (!this.initialized) {
            throw new Error('CloudBase未初始化');
        }

        try {
            const result = await this.db.collection(config.tcb.collections.sync_status)
                .where({ table_name: tableName })
                .get();
            
            return result.data && result.data.length > 0 ? result.data[0] : null;
        } catch (error) {
            console.error(`❌ 获取同步状态失败:`, error.message);
            return null;
        }
    }
}

// 导出单例
const cloudStorage = new CloudStorage();
module.exports = cloudStorage;
