const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001; // 使用不同端口避免冲突

// 日志中间件
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
});

// CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// 健康检查
app.get('/api/health', (req, res) => {
    console.log('✅ /api/health 被调用');
    res.json({ status: 'ok', message: '测试服务器运行正常' });
});

// 测试客户接口
app.get('/api/customers', (req, res) => {
    console.log('✅ /api/customers 被调用');
    res.json({ success: true, data: [], message: '测试接口正常' });
});

// 测试产品接口
app.get('/api/products', (req, res) => {
    console.log('✅ /api/products 被调用');
    res.json({ success: true, data: [], message: '测试接口正常' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('========================================');
    console.log('  测试服务器');
    console.log('========================================');
    console.log(`✅ 测试服务器运行在 http://localhost:${PORT}`);
    console.log(`📋 测试健康: http://localhost:${PORT}/api/health`);
    console.log(`👥 测试客户: http://localhost:${PORT}/api/customers`);
    console.log(`📦 测试产品: http://localhost:${PORT}/api/products`);
    console.log('========================================');
    console.log('');
});
