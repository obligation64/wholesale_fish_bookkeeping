// 存储管理器 - 支持本地SQLite和云开发切换
const config = require('./config');
const cloudStorage = require('./cloud-storage');

class StorageManager {
    constructor() {
        this.mode = config.storageMode || 'local'; // local, cloud, hybrid
        this.cloudInitialized = false;
    }

    // 获取当前存储模式
    getMode() {
        return this.mode;
    }

    // 切换存储模式
    async setMode(mode) {
        const validModes = ['local', 'cloud', 'hybrid'];
        if (!validModes.includes(mode)) {
            throw new Error(`无效的存储模式: ${mode}, 必须是 ${validModes.join(', ')}`);
        }

        const oldMode = this.mode;
        this.mode = mode;

        // 如果切换到云相关模式,初始化云存储
        if ((mode === 'cloud' || mode === 'hybrid') && !this.cloudInitialized) {
            try {
                await cloudStorage.init();
                this.cloudInitialized = true;
            } catch (error) {
                console.warn('⚠️  云存储初始化失败:', error.message);
                console.log('💡 回退到本地模式');
                this.mode = 'local';
                throw error;
            }
        }

        console.log(`✅ 存储模式已切换: ${oldMode} -> ${mode}`);
        return true;
    }

    // 判断是否使用云存储
    isCloudMode() {
        return this.mode === 'cloud';
    }

    // 判断是否使用混合模式
    isHybridMode() {
        return this.mode === 'hybrid';
    }

    // 判断是否使用本地模式
    isLocalMode() {
        return this.mode === 'local';
    }

    // 获取云存储实例(仅在cloud或hybrid模式下使用)
    getCloudStorage() {
        if (this.mode === 'local') {
            throw new Error('当前是本地模式,无法访问云存储');
        }
        if (!this.cloudInitialized) {
            throw new Error('云存储未初始化');
        }
        return cloudStorage;
    }

    // 获取存储状态信息
    getStatus() {
        return {
            mode: this.mode,
            cloudInitialized: this.cloudInitialized,
            cloudConfigured: !!(config.tcb.secretId && config.tcb.secretKey),
            envId: config.tcb.env,
            description: this.getModeDescription()
        };
    }

    // 获取模式描述
    getModeDescription() {
        switch (this.mode) {
            case 'local':
                return '📦 本地模式 - 仅使用SQLite数据库';
            case 'cloud':
                return '☁️  云模式 - 仅使用腾讯云开发';
            case 'hybrid':
                return '🔄 混合模式 - 本地为主,云端同步';
            default:
                return '未知模式';
        }
    }

    // 初始化存储管理器
    async initialize() {
        console.log('');
        console.log('========================================');
        console.log('  存储管理器初始化');
        console.log('========================================');
        console.log('');

        console.log(`📌 当前存储模式: ${this.mode}`);
        console.log(`📌 模式说明: ${this.getModeDescription()}`);

        if (this.mode === 'local') {
            console.log('✅ 本地模式已就绪');
            return true;
        }

        // 初始化云存储
        try {
            console.log('🔄 正在初始化云存储...');
            await cloudStorage.init();
            this.cloudInitialized = true;

            // 测试连接
            await cloudStorage.testConnection();
            console.log('✅ 云存储连接成功');
            console.log(`📌 环境ID: ${config.tcb.env}`);

            if (this.mode === 'hybrid') {
                console.log('🔄 混合模式: 本地数据为主,自动同步到云端');
            } else {
                console.log('☁️  云模式: 所有数据存储在云端');
            }

            return true;
        } catch (error) {
            console.error('❌ 云存储初始化失败:', error.message);
            console.log('💡 建议: 检查网络连接或配置API密钥');
            console.log('💡 回退: 自动使用本地模式');

            // 回退到本地模式
            this.mode = 'local';
            console.log('✅ 已切换到本地模式');
            return false;
        }
    }
}

// 导出单例
const storageManager = new StorageManager();
module.exports = storageManager;
