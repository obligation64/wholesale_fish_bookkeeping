// 配置验证脚本
const config = require('./config');
const fs = require('fs');
const path = require('path');

console.log('');
console.log('========================================');
console.log('  批发鱼账本系统 - 配置验证');
console.log('========================================');
console.log('');

// 检查Node.js版本
const nodeVersion = process.version;
console.log(`Node.js版本: ${nodeVersion}`);

// 验证云开发配置
console.log('');
console.log('🌤️  云开发配置:');
console.log(`   环境ID: ${config.tcb.env}`);

if (config.tcb.secretId) {
    console.log(`   Secret ID: ${config.tcb.secretId.substring(0, 10)}...✓ (已配置)`);
} else {
    console.log(`   Secret ID: 未配置`);
}

if (config.tcb.secretKey) {
    console.log(`   Secret Key: ${config.tcb.secretKey.substring(0, 10)}...✓ (已配置)`);
} else {
    console.log(`   Secret Key: 未配置`);
}

console.log('');
console.log('📦 同步配置:');
console.log(`   启用自动同步: ${config.tcb.sync.enabled ? '是' : '否'}`);
console.log(`   同步间隔: ${config.tcb.sync.interval / 1000} 秒`);
console.log(`   批量大小: ${config.tcb.sync.batchSize} 条`);

// 检查集合配置
console.log('');
console.log('📊 数据集合配置:');
Object.entries(config.tcb.collections).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
});

// 检查依赖文件
console.log('');
console.log('📁 文件检查:');

const requiredFiles = [
    'server.js',
    'database.js',
    'cloud-storage.js',
    'sync-manager.js',
    'config.js',
    'app-api.js',
    'index.html'
];

requiredFiles.forEach(file => {
    const exists = fs.existsSync(path.join(__dirname, file));
    console.log(`   ${file}: ${exists ? '✓' : '✗'}`);
});

// 检查node_modules
console.log('');
const nodeModulesExists = fs.existsSync(path.join(__dirname, 'node_modules'));
console.log(`   node_modules: ${nodeModulesExists ? '✓ (已安装)' : '✗ (未安装)'}`);

if (!nodeModulesExists) {
    console.log('');
    console.log('💡 提示: 请先运行 npm install 安装依赖');
}

// 检查.env文件
console.log('');
const envExists = fs.existsSync(path.join(__dirname, '.env'));
console.log(`   .env配置文件: ${envExists ? '✓' : '✗'}`);

if (!envExists) {
    console.log('   ℹ️  云开发功能需要配置.env文件');
    console.log('   💡 提示: 可以复制 .env.example 为 .env 并填入密钥');
}

// 总结
console.log('');
console.log('========================================');
console.log('  验证完成');
console.log('========================================');
console.log('');

if (!nodeModulesExists) {
    console.log('⚠️  缺少依赖，请运行: npm install');
} else {
    console.log('✅ 配置验证通过');
    console.log('');
    console.log('📌 下一步:');
    console.log('   1. 启动服务: npm start');
    console.log('   2. 或运行测试: node test-cloud.js');
}

console.log('');
