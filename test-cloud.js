// 云开发集成测试脚本
const cloudStorage = require('./cloud-storage');
const syncManager = require('./sync-manager');

async function testCloudIntegration() {
    console.log('');
    console.log('========================================');
    console.log('  云开发集成测试');
    console.log('========================================');
    console.log('');

    // 测试1: 初始化云开发
    console.log('📋 测试1: 初始化云开发');
    try {
        const initialized = await cloudStorage.init();
        if (initialized) {
            console.log('✅ 云开发初始化成功');
        } else {
            console.log('⚠️  云开发初始化失败(可能是缺少密钥或网络问题)');
        }
    } catch (error) {
        console.error('❌ 云开发初始化异常:', error.message);
    }

    console.log('');

    // 测试2: 测试连接
    if (cloudStorage.initialized) {
        console.log('📋 测试2: 测试数据库连接');
        try {
            await cloudStorage.testConnection();
            console.log('✅ 数据库连接成功');
        } catch (error) {
            console.error('❌ 数据库连接失败:', error.message);
        }

        console.log('');

        // 测试3: 创建集合
        console.log('📋 测试3: 创建集合');
        try {
            await cloudStorage.createCollections();
            console.log('✅ 集合创建成功');
        } catch (error) {
            console.error('❌ 集合创建失败:', error.message);
        }

        console.log('');

        // 测试4: 测试添加记录
        console.log('📋 测试4: 测试添加记录');
        try {
            const testData = {
                test_field: 'test_value',
                timestamp: new Date().toISOString()
            };
            const result = await cloudStorage.add('test_collection', testData);
            console.log('✅ 添加记录成功, ID:', result.id);
        } catch (error) {
            console.error('❌ 添加记录失败:', error.message);
        }

        console.log('');

        // 测试5: 测试查询记录
        console.log('📋 测试5: 测试查询记录');
        try {
            const records = await cloudStorage.get('test_collection', { limit: 10 });
            console.log(`✅ 查询到 ${records.length} 条记录`);
            if (records.length > 0) {
                console.log('   第一条记录:', JSON.stringify(records[0]));
            }
        } catch (error) {
            console.error('❌ 查询记录失败:', error.message);
        }
    } else {
        console.log('⚠️  跳过测试2-5,因为云开发未初始化');
    }

    console.log('');
    console.log('========================================');
    console.log('  测试完成');
    console.log('========================================');
    console.log('');
    console.log('提示:');
    console.log('1. 如果测试失败,请检查网络连接');
    console.log('2. 确认环境ID是否正确: 6162-abc-8g2fdo0a0e77ed86-1255526316');
    console.log('3. 如需在本地运行,请配置腾讯云API密钥(参考CLOUD_SETUP.md)');
    console.log('');
}

// 运行测试
testCloudIntegration().catch(error => {
    console.error('测试异常:', error);
    process.exit(1);
});
