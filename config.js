// 腾讯云开发配置文件
module.exports = {
    // 存储模式配置: 'local' = 本地SQLite, 'cloud' = 云开发, 'hybrid' = 混合模式(本地为主,云同步)
    storageMode: process.env.STORAGE_MODE || 'local',

    // 腾讯云开发环境ID
    tcb: {
        env: '6162-abc-8g2fdo0a0e77ed86-1255526316',
        
        // 腾讯云API密钥 (可选,用于服务端操作)
        // 需要在腾讯云控制台获取: https://console.cloud.tencent.com/cam/capi
        secretId: process.env.TCB_SECRET_ID || '',
        secretKey: process.env.TCB_SECRET_KEY || '',
        
        // 集合名称配置
        collections: {
            customers: 'customers',
            products: 'products',
            sales: 'sales',
            expenses: 'expenses',
            monthly_expenses: 'monthly_expenses',
            inventory: 'inventory',
            change_logs: 'change_logs',
            sync_status: 'sync_status'
        },
        
        // 同步配置
        sync: {
            enabled: true,
            // 同步间隔 (毫秒)
            interval: 30000,
            // 批量同步数量
            batchSize: 100
        }
    }
};
