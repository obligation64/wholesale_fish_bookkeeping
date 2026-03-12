const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initDatabase, getDatabase, closeDatabase } = require('./database');
const syncManager = require('./sync-manager');
const storageManager = require('./storage-manager');

const app = express();
const PORT = process.env.PORT || 3000;

// 日志中间件
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// 中间件
app.use(cors({
    origin: '*',  // 允许所有来源
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 记录数据变更的辅助函数
function logChange(tableName, recordId, operation, oldData, newData) {
    try {
        const stmt = db.prepare(`
            INSERT INTO change_logs (table_name, record_id, operation, old_data, new_data)
            VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(
            tableName,
            recordId,
            operation,
            oldData ? JSON.stringify(oldData) : null,
            newData ? JSON.stringify(newData) : null
        );
    } catch (err) {
        console.error('记录数据变更失败:', err.message);
    }
}

// 初始化数据库
console.log('正在初始化数据库...');
let db;
try {
    db = initDatabase();
    console.log('✅ 数据库初始化成功');
} catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
}

// 异步初始化函数
async function initializeServices() {
    // 初始化存储管理器
    console.log('正在初始化存储管理器...');
    try {
        await storageManager.initialize();
    } catch (error) {
        console.error('❌ 存储管理器初始化失败:', error);
    }

    // 初始化云开发同步(仅hybrid或cloud模式)
    if (storageManager.isCloudMode() || storageManager.isHybridMode()) {
        console.log('正在初始化云开发同步...');
        try {
            await syncManager.init();
            console.log('✅ 云开发同步初始化成功');
        } catch (error) {
            console.warn('⚠️  云开发同步初始化失败:', error.message);
            console.log('ℹ️  系统将继续运行,但云同步功能不可用');
        }
    } else {
        console.log('ℹ️  本地模式,跳过云开发同步初始化');
    }
}

// 调用初始化函数
initializeServices().catch(err => {
    console.error('❌ 服务初始化失败:', err);
    process.exit(1);
});

// ==================== 健康检查 ====================
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '服务器运行正常' });
});

// ==================== 客户管理 ====================

// 获取所有客户
app.get('/api/customers', (req, res) => {
    try {
        console.log('正在获取客户列表...');
        console.log('数据库对象:', db ? '存在' : '不存在');

        if (!db) {
            throw new Error('数据库未初始化');
        }

        const stmt = db.prepare('SELECT * FROM customers ORDER BY created_at DESC');
        console.log('SQL语句准备完成');

        const customers = stmt.all();
        console.log(`✅ 获取到 ${customers.length} 个客户`);
        res.json({ success: true, data: customers });
    } catch (err) {
        console.error('❌ 获取客户列表失败:', err);
        console.error('错误堆栈:', err.stack);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 添加客户
app.post('/api/customers', (req, res) => {
    try {
        const { name, type, phone, address } = req.body;
        const stmt = db.prepare(`
            INSERT INTO customers (name, type, phone, address)
            VALUES (?, ?, ?, ?)
        `);
        const result = stmt.run(name, type, phone, address);
        logChange('customers', result.lastInsertRowid, 'INSERT', null, { name, type, phone, address });
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 更新客户
app.put('/api/customers/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, phone, address } = req.body;
        const oldRecord = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
        const stmt = db.prepare(`
            UPDATE customers 
            SET name = ?, type = ?, phone = ?, address = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        stmt.run(name, type, phone, address, id);
        logChange('customers', parseInt(id), 'UPDATE', oldRecord, { name, type, phone, address });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 删除客户
app.delete('/api/customers/:id', (req, res) => {
    try {
        const { id } = req.params;
        const oldRecord = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
        const stmt = db.prepare('DELETE FROM customers WHERE id = ?');
        stmt.run(id);
        logChange('customers', parseInt(id), 'DELETE', oldRecord, null);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== 产品管理 ====================

// 获取所有产品
app.get('/api/products', (req, res) => {
    try {
        console.log('正在获取产品列表...');
        console.log('数据库对象:', db ? '存在' : '不存在');

        if (!db) {
            throw new Error('数据库未初始化');
        }

        const stmt = db.prepare('SELECT * FROM products ORDER BY created_at DESC');
        console.log('SQL语句准备完成');

        const products = stmt.all();
        console.log(`✅ 获取到 ${products.length} 个产品`);
        res.json({ success: true, data: products });
    } catch (err) {
        console.error('❌ 获取产品列表失败:', err);
        console.error('错误堆栈:', err.stack);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 添加产品
app.post('/api/products', (req, res) => {
    try {
        const { name, category, suggested_price, supplier, supplier_phone } = req.body;
        const stmt = db.prepare(`
            INSERT INTO products (name, category, suggested_price, supplier, supplier_phone)
            VALUES (?, ?, ?, ?, ?)
        `);
        const result = stmt.run(name, category, suggested_price, supplier, supplier_phone);
        logChange('products', result.lastInsertRowid, 'INSERT', null, { name, category, suggested_price, supplier, supplier_phone });
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 更新产品
app.put('/api/products/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, suggested_price, supplier, supplier_phone } = req.body;
        const oldRecord = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
        const stmt = db.prepare(`
            UPDATE products 
            SET name = ?, category = ?, suggested_price = ?, supplier = ?, 
                supplier_phone = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        stmt.run(name, category, suggested_price, supplier, supplier_phone, id);
        logChange('products', parseInt(id), 'UPDATE', oldRecord, { name, category, suggested_price, supplier, supplier_phone });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 删除产品
app.delete('/api/products/:id', (req, res) => {
    try {
        const { id } = req.params;
        const oldRecord = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
        const stmt = db.prepare('DELETE FROM products WHERE id = ?');
        stmt.run(id);
        logChange('products', parseInt(id), 'DELETE', oldRecord, null);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== 销售管理 ====================

// 获取所有销售记录
app.get('/api/sales', (req, res) => {
    try {
        console.log('正在获取销售记录...');
        const { customer_id, product_id, payment_status, start_date, end_date } = req.query;
        let query = `
            SELECT s.*, c.name as customer_name, p.name as product_name, p.category as product_category
            FROM sales s
            JOIN customers c ON s.customer_id = c.id
            JOIN products p ON s.product_id = p.id
            WHERE 1=1
        `;
        const params = [];

        if (customer_id) {
            query += ' AND s.customer_id = ?';
            params.push(customer_id);
        }
        if (product_id) {
            query += ' AND s.product_id = ?';
            params.push(product_id);
        }
        if (payment_status && payment_status !== 'all') {
            query += ' AND s.payment_status = ?';
            params.push(payment_status);
        }
        if (start_date) {
            query += ' AND s.sale_date >= ?';
            params.push(start_date);
        }
        if (end_date) {
            query += ' AND s.sale_date <= ?';
            params.push(end_date);
        }

        query += ' ORDER BY s.sale_date DESC, s.created_at DESC';

        console.log('SQL查询:', query);
        console.log('参数:', params);

        const stmt = db.prepare(query);
        const sales = stmt.all(...params);
        console.log(`✅ 获取到 ${sales.length} 条销售记录`);
        res.json({ success: true, data: sales });
    } catch (err) {
        console.error('❌ 获取销售记录失败:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 添加销售记录
app.post('/api/sales', (req, res) => {
    try {
        const { customer_id, product_id, quantity, unit_price, total_amount, payment_status, paid_amount, sale_date, notes } = req.body;

        // 开启事务
        const insertSale = db.transaction((data) => {
            // 插入销售记录
            const stmt = db.prepare(`
                INSERT INTO sales (customer_id, product_id, quantity, unit_price, total_amount, payment_status, paid_amount, sale_date, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const result = stmt.run(
                data.customer_id,
                data.product_id,
                data.quantity,
                data.unit_price,
                data.total_amount,
                data.payment_status,
                data.paid_amount || 0,
                data.sale_date,
                data.notes || ''
            );

            // 记录变更
            logChange('sales', result.lastInsertRowid, 'INSERT', null, data);

            // 更新客户统计
            const updateCustomer = db.prepare(`
                UPDATE customers 
                SET total_sales = total_sales + ?,
                    total_debt = total_debt + ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `);
            updateCustomer.run(data.total_amount, data.total_amount - (data.paid_amount || 0), data.customer_id);

            // 更新产品统计
            const updateProduct = db.prepare(`
                UPDATE products 
                SET total_quantity = total_quantity + ?,
                    total_sales = total_sales + ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `);
            updateProduct.run(data.quantity, data.total_amount, data.product_id);

            return result.lastInsertRowid;
        });

        const saleId = insertSale({
            customer_id, product_id, quantity, unit_price,
            total_amount, payment_status, paid_amount, sale_date, notes
        });

        res.json({ success: true, id: saleId });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 更新销售记录
app.put('/api/sales/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { customer_id, product_id, quantity, unit_price, total_amount, payment_status, paid_amount, sale_date, notes } = req.body;

        // 获取原记录
        const oldSale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
        if (!oldSale) {
            return res.status(404).json({ success: false, error: '记录不存在' });
        }

        // 开启事务
        const updateSale = db.transaction((oldData, newData) => {
            // 更新销售记录
            const stmt = db.prepare(`
                UPDATE sales 
                SET customer_id = ?, product_id = ?, quantity = ?, unit_price = ?,
                    total_amount = ?, payment_status = ?, paid_amount = ?,
                    sale_date = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `);
            stmt.run(
                newData.customer_id, newData.product_id, newData.quantity, newData.unit_price,
                newData.total_amount, newData.payment_status, newData.paid_amount,
                newData.sale_date, newData.notes, id
            );

            // 调整客户统计
            const oldDebt = oldData.total_amount - oldData.paid_amount;
            const newDebt = newData.total_amount - (newData.paid_amount || 0);
            const debtDiff = newDebt - oldDebt;

            const updateCustomer = db.prepare(`
                UPDATE customers 
                SET total_sales = total_sales + ?,
                    total_debt = total_debt + ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `);
            updateCustomer.run(
                newData.total_amount - oldData.total_amount,
                debtDiff,
                oldData.customer_id
            );

            // 调整产品统计
            const updateProduct = db.prepare(`
                UPDATE products 
                SET total_quantity = total_quantity + ?,
                    total_sales = total_sales + ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `);
            updateProduct.run(
                newData.quantity - oldData.quantity,
                newData.total_amount - oldData.total_amount,
                oldData.product_id
            );
        });

        updateSale(oldSale, {
            customer_id, product_id, quantity, unit_price,
            total_amount, payment_status, paid_amount, sale_date, notes
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 删除销售记录
app.delete('/api/sales/:id', (req, res) => {
    try {
        const { id } = req.params;

        // 获取原记录
        const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
        if (!sale) {
            return res.status(404).json({ success: false, error: '记录不存在' });
        }

        // 记录变更
        logChange('sales', parseInt(id), 'DELETE', sale, null);

        // 开启事务
        const deleteSale = db.transaction((data) => {
            // 删除销售记录
            const stmt = db.prepare('DELETE FROM sales WHERE id = ?');
            stmt.run(data.id);

            // 调整客户统计
            const debt = data.total_amount - data.paid_amount;
            const updateCustomer = db.prepare(`
                UPDATE customers 
                SET total_sales = total_sales - ?,
                    total_debt = total_debt - ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `);
            updateCustomer.run(data.total_amount, debt, data.customer_id);

            // 调整产品统计
            const updateProduct = db.prepare(`
                UPDATE products 
                SET total_quantity = total_quantity - ?,
                    total_sales = total_sales - ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `);
            updateProduct.run(data.quantity, data.total_amount, data.product_id);
        });

        deleteSale(sale);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== 支出管理 ====================

// 获取所有支出记录
app.get('/api/expenses', (req, res) => {
    try {
        console.log('正在获取支出记录...');
        const { category, start_date, end_date } = req.query;
        let query = 'SELECT * FROM expenses WHERE 1=1';
        const params = [];

        if (category && category !== 'all') {
            query += ' AND category = ?';
            params.push(category);
        }
        if (start_date) {
            query += ' AND expense_date >= ?';
            params.push(start_date);
        }
        if (end_date) {
            query += ' AND expense_date <= ?';
            params.push(end_date);
        }

        query += ' ORDER BY expense_date DESC, created_at DESC';

        console.log('SQL查询:', query);
        console.log('参数:', params);

        const stmt = db.prepare(query);
        const expenses = stmt.all(...params);
        console.log(`✅ 获取到 ${expenses.length} 条支出记录`);
        res.json({ success: true, data: expenses });
    } catch (err) {
        console.error('❌ 获取支出记录失败:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 添加支出记录
app.post('/api/expenses', (req, res) => {
    try {
        const { category, amount, description, payment_method, expense_date } = req.body;
        const stmt = db.prepare(`
            INSERT INTO expenses (category, amount, description, payment_method, expense_date)
            VALUES (?, ?, ?, ?, ?)
        `);
        const result = stmt.run(category, amount, description, payment_method, expense_date);
        logChange('expenses', result.lastInsertRowid, 'INSERT', null, { category, amount, description, payment_method, expense_date });
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 更新支出记录
app.put('/api/expenses/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { category, amount, description, payment_method, expense_date } = req.body;
        const oldRecord = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
        const stmt = db.prepare(`
            UPDATE expenses 
            SET category = ?, amount = ?, description = ?, payment_method = ?,
                expense_date = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        stmt.run(category, amount, description, payment_method, expense_date, id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 删除支出记录
app.delete('/api/expenses/:id', (req, res) => {
    try {
        const { id } = req.params;
        const oldRecord = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
        const stmt = db.prepare('DELETE FROM expenses WHERE id = ?');
        stmt.run(id);
        logChange('expenses', parseInt(id), 'DELETE', oldRecord, null);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== 统计分析 ====================

// 获取仪表板数据
app.get('/api/dashboard', (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // 今日数据
        const todaySales = db.prepare(`
            SELECT COALESCE(SUM(total_amount), 0) as total,
                   COALESCE(SUM(quantity), 0) as quantity,
                   COUNT(*) as count
            FROM sales WHERE sale_date = ?
        `).get(today);

        const todayExpenses = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
            FROM expenses WHERE expense_date = ?
        `).get(today);

        // 本月数据
        const monthSales = db.prepare(`
            SELECT COALESCE(SUM(total_amount), 0) as total,
                   COALESCE(SUM(quantity), 0) as quantity
            FROM sales WHERE sale_date >= ?
        `).get(firstDayOfMonth);

        const monthExpenses = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as total
            FROM expenses WHERE expense_date >= ?
        `).get(firstDayOfMonth);

        // 近7天销售趋势
        const trendData = db.prepare(`
            SELECT sale_date, SUM(total_amount) as total
            FROM sales WHERE sale_date >= ?
            GROUP BY sale_date
            ORDER BY sale_date
        `).all(sevenDaysAgo);

        // 产品销售占比
        const productSales = db.prepare(`
            SELECT p.name, SUM(s.total_amount) as total
            FROM sales s
            JOIN products p ON s.product_id = p.id
            GROUP BY p.id, p.name
            ORDER BY total DESC
        `).all();

        // 支出分类统计
        const expenseByCategory = db.prepare(`
            SELECT category, SUM(amount) as total
            FROM expenses
            GROUP BY category
            ORDER BY total DESC
        `).all();

        // 客户排行榜
        const topCustomers = db.prepare(`
            SELECT c.name, SUM(s.total_amount) as total
            FROM sales s
            JOIN customers c ON s.customer_id = c.id
            GROUP BY c.id, c.name
            ORDER BY total DESC
            LIMIT 10
        `).all();

        res.json({
            success: true,
            data: {
                today: {
                    sales: todaySales.total,
                    salesCount: todaySales.count,
                    salesQuantity: todaySales.quantity,
                    expenses: todayExpenses.total,
                    profit: todaySales.total - todayExpenses.total
                },
                month: {
                    sales: monthSales.total,
                    salesQuantity: monthSales.quantity,
                    expenses: monthExpenses.total,
                    profit: monthSales.total - monthExpenses.total,
                    avgPrice: monthSales.quantity > 0 ? monthSales.total / monthSales.quantity : 0
                },
                trend: trendData,
                productSales,
                expenseByCategory,
                topCustomers
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 生成报表
app.get('/api/report', (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({ success: false, error: '缺少日期参数' });
        }

        // 总计
        const summary = db.prepare(`
            SELECT 
                COALESCE(SUM(total_amount), 0) as total_sales,
                COALESCE(SUM(quantity), 0) as total_quantity,
                COUNT(*) as sales_count
            FROM sales WHERE sale_date BETWEEN ? AND ?
        `).get(start_date, end_date);

        const expenseSummary = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as total_expenses, COUNT(*) as expense_count
            FROM expenses WHERE expense_date BETWEEN ? AND ?
        `).get(start_date, end_date);

        // 产品明细
        const productDetails = db.prepare(`
            SELECT p.name, p.category, SUM(s.total_amount) as total,
                   SUM(s.quantity) as quantity, AVG(s.unit_price) as avg_price
            FROM sales s
            JOIN products p ON s.product_id = p.id
            WHERE s.sale_date BETWEEN ? AND ?
            GROUP BY p.id, p.name, p.category
            ORDER BY total DESC
        `).all(start_date, end_date);

        // 客户明细
        const customerDetails = db.prepare(`
            SELECT c.name, c.type, SUM(s.total_amount) as total, COUNT(*) as count
            FROM sales s
            JOIN customers c ON s.customer_id = c.id
            WHERE s.sale_date BETWEEN ? AND ?
            GROUP BY c.id, c.name, c.type
            ORDER BY total DESC
        `).all(start_date, end_date);

        res.json({
            success: true,
            data: {
                period: { start_date, end_date },
                summary: {
                    total_sales: summary.total_sales,
                    total_quantity: summary.total_quantity,
                    sales_count: summary.sales_count,
                    total_expenses: expenseSummary.total_expenses,
                    expense_count: expenseSummary.expense_count,
                    net_profit: summary.total_sales - expenseSummary.total_expenses,
                    avg_price: summary.total_quantity > 0 ? summary.total_sales / summary.total_quantity : 0
                },
                productDetails,
                customerDetails
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== 每月固定支出管理 ====================

// 获取所有每月固定支出
app.get('/api/monthly-expenses', (req, res) => {
    try {
        console.log('正在获取每月固定支出...');
        const { is_active } = req.query;
        let query = 'SELECT * FROM monthly_expenses';
        const params = [];

        if (is_active !== undefined) {
            query += ' WHERE is_active = ?';
            params.push(parseInt(is_active));
        }

        query += ' ORDER BY category, name';

        const expenses = db.prepare(query).all(...params);
        console.log(`✅ 获取到 ${expenses.length} 条每月固定支出记录`);
        res.json({ success: true, data: expenses });
    } catch (err) {
        console.error('❌ 获取每月固定支出失败:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 添加每月固定支出
app.post('/api/monthly-expenses', (req, res) => {
    try {
        const { name, category, amount, payment_method, description, is_active, start_date, cycle_type } = req.body;
        const stmt = db.prepare(`
            INSERT INTO monthly_expenses (name, category, amount, payment_method, description, is_active, start_date, cycle_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(name, category, amount, payment_method, description, is_active !== undefined ? parseInt(is_active) : 1, start_date, cycle_type || 'monthly');
        logChange('monthly_expenses', result.lastInsertRowid, 'INSERT', null, { name, category, amount, payment_method, description, is_active, start_date, cycle_type });
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 更新每月固定支出
app.put('/api/monthly-expenses/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, amount, payment_method, description, is_active, start_date, cycle_type } = req.body;
        const oldRecord = db.prepare('SELECT * FROM monthly_expenses WHERE id = ?').get(id);
        const stmt = db.prepare(`
            UPDATE monthly_expenses 
            SET name = ?, category = ?, amount = ?, payment_method = ?, 
                description = ?, is_active = ?, start_date = ?, cycle_type = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        stmt.run(name, category, amount, payment_method, description, is_active !== undefined ? parseInt(is_active) : 1, start_date, cycle_type || 'monthly', id);
        logChange('monthly_expenses', parseInt(id), 'UPDATE', oldRecord, { name, category, amount, payment_method, description, is_active, start_date, cycle_type });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 删除每月固定支出
app.delete('/api/monthly-expenses/:id', (req, res) => {
    try {
        const { id } = req.params;
        const oldRecord = db.prepare('SELECT * FROM monthly_expenses WHERE id = ?').get(id);
        const stmt = db.prepare('DELETE FROM monthly_expenses WHERE id = ?');
        stmt.run(id);
        logChange('monthly_expenses', parseInt(id), 'DELETE', oldRecord, null);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== 库存管理 ====================

// 获取所有库存
app.get('/api/inventory', (req, res) => {
    try {
        console.log('正在获取库存数据...');
        const { is_active } = req.query;
        let query = `
            SELECT i.*, p.name as product_name, p.category as product_category
            FROM inventory i
            JOIN products p ON i.product_id = p.id
            WHERE 1=1
        `;
        const params = [];

        if (is_active !== undefined) {
            query += ' AND i.is_active = ?';
            params.push(parseInt(is_active));
        }

        query += ' ORDER BY i.created_at DESC';

        const inventory = db.prepare(query).all(...params);
        console.log(`✅ 获取到 ${inventory.length} 条库存记录`);
        res.json({ success: true, data: inventory });
    } catch (err) {
        console.error('❌ 获取库存失败:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 添加库存
app.post('/api/inventory', (req, res) => {
    try {
        const { product_id, quantity, unit, supplier, purchase_price, purchase_date, notes, is_active } = req.body;
        const stmt = db.prepare(`
            INSERT INTO inventory (product_id, quantity, unit, supplier, purchase_price, purchase_date, notes, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            product_id,
            quantity || 0,
            unit || '斤',
            supplier,
            purchase_price || 0,
            purchase_date,
            notes,
            is_active !== undefined ? parseInt(is_active) : 1
        );
        logChange('inventory', result.lastInsertRowid, 'INSERT', null, { product_id, quantity, unit, supplier, purchase_price, purchase_date, notes, is_active });
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 更新库存
app.put('/api/inventory/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { product_id, quantity, unit, supplier, purchase_price, purchase_date, notes, is_active } = req.body;
        const oldRecord = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
        const stmt = db.prepare(`
            UPDATE inventory 
            SET product_id = ?, quantity = ?, unit = ?, supplier = ?, 
                purchase_price = ?, purchase_date = ?, notes = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        stmt.run(product_id, quantity || 0, unit || '斤', supplier, purchase_price || 0, purchase_date, notes, is_active !== undefined ? parseInt(is_active) : 1, id);
        logChange('inventory', parseInt(id), 'UPDATE', oldRecord, { product_id, quantity, unit, supplier, purchase_price, purchase_date, notes, is_active });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 删除库存
app.delete('/api/inventory/:id', (req, res) => {
    try {
        const { id } = req.params;
        const oldRecord = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
        const stmt = db.prepare('DELETE FROM inventory WHERE id = ?');
        stmt.run(id);
        logChange('inventory', parseInt(id), 'DELETE', oldRecord, null);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== 数据备份 ====================

// 导出所有数据
app.get('/api/export', (req, res) => {
    try {
        const data = {
            customers: db.prepare('SELECT * FROM customers').all(),
            products: db.prepare('SELECT * FROM products').all(),
            sales: db.prepare('SELECT * FROM sales').all(),
            expenses: db.prepare('SELECT * FROM expenses').all(),
            export_time: new Date().toISOString()
        };

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== 变更记录 ====================

// 获取变更记录
app.get('/api/change-logs', (req, res) => {
    try {
        const { table_name, operation, limit = 100 } = req.query;
        
        let sql = 'SELECT * FROM change_logs';
        const params = [];
        const conditions = [];

        if (table_name) {
            conditions.push('table_name = ?');
            params.push(table_name);
        }

        if (operation) {
            conditions.push('operation = ?');
            params.push(operation);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY changed_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const logs = db.prepare(sql).all(...params);
        res.json({ success: true, data: logs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 获取单条记录的变更历史
app.get('/api/change-logs/:tableName/:recordId', (req, res) => {
    try {
        const { tableName, recordId } = req.params;
        const logs = db.prepare(`
            SELECT * FROM change_logs
            WHERE table_name = ? AND record_id = ?
            ORDER BY changed_at DESC
        `).all(tableName, parseInt(recordId));

        res.json({ success: true, data: logs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== 存储模式切换接口 ====================

// 获取当前存储模式
app.get('/api/storage/mode', (req, res) => {
    try {
        const status = storageManager.getStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 切换存储模式
app.post('/api/storage/mode', async (req, res) => {
    try {
        const { mode } = req.body;

        if (!mode) {
            return res.status(400).json({ success: false, error: '缺少mode参数' });
        }

        await storageManager.setMode(mode);
        const status = storageManager.getStatus();

        res.json({
            success: true,
            message: '存储模式切换成功',
            data: status
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== 云开发同步接口 ====================

// 手动触发全量同步
app.post('/api/cloud/sync/all', async (req, res) => {
    try {
        console.log('📥 收到全量同步请求');
        const result = await syncManager.syncAllToCloud();
        res.json({
            success: result,
            message: result ? '全量同步成功' : '全量同步失败',
            syncTime: syncManager.lastSyncTime
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 手动触发增量同步
app.post('/api/cloud/sync/incremental', async (req, res) => {
    try {
        console.log('📥 收到增量同步请求');
        const result = await syncManager.syncIncrementalToCloud();
        res.json({
            success: result,
            message: result ? '增量同步成功' : '增量同步失败',
            syncTime: syncManager.lastSyncTime
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取同步状态
app.get('/api/cloud/sync/status', async (req, res) => {
    try {
        const cloudStorage = require('./cloud-storage');
        const config = require('./config');

        const statuses = {};
        for (const [key, collection] of Object.entries(config.tcb.collections)) {
            if (key === 'sync_status') continue;
            const status = await cloudStorage.getSyncStatus(key);
            statuses[key] = status;
        }

        res.json({
            success: true,
            data: {
                lastSyncTime: syncManager.lastSyncTime,
                syncing: syncManager.syncing,
                cloudInitialized: cloudStorage.initialized,
                statuses
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 从云开发恢复数据
app.post('/api/cloud/restore/:tableName', async (req, res) => {
    try {
        const { tableName } = req.params;
        const tableMapping = {
            customers: 'customers',
            products: 'products',
            sales: 'sales',
            expenses: 'expenses',
            monthly_expenses: 'monthly_expenses',
            inventory: 'inventory',
            change_logs: 'change_logs'
        };

        const cloudCollection = tableMapping[tableName];
        if (!cloudCollection) {
            return res.status(400).json({ success: false, error: '不支持的表名' });
        }

        const count = await syncManager.restoreFromCloud(cloudCollection, tableName);
        res.json({
            success: true,
            message: `从云开发恢复 ${tableName} 成功`,
            count
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 启动服务器
app.listen(PORT, '0.0.0.0', async () => {
    console.log('');
    console.log('========================================');
    console.log('  水产批发记账系统后端服务');
    console.log('========================================');
    console.log('');
    console.log(`✅ 服务已启动`);
    console.log(`🌐 本地访问: http://localhost:${PORT}`);
    console.log(`🌐 网络访问: http://0.0.0.0:${PORT}`);
    console.log(`📋 健康检查: http://localhost:${PORT}/api/health`);
    console.log(`👥 客户列表: http://localhost:${PORT}/api/customers`);
    console.log(`📦 产品列表: http://localhost:${PORT}/api/products`);
    console.log('');
    console.log(`📊 存储模式: ${storageManager.getStatus().description}`);
    console.log(`💾 存储模式管理: GET/POST http://localhost:${PORT}/api/storage/mode`);
    console.log('');

    // 根据模式显示不同的信息
    if (storageManager.isCloudMode() || storageManager.isHybridMode()) {
        console.log('🌤️  云开发功能:');
        console.log(`🔄 全量同步: POST http://localhost:${PORT}/api/cloud/sync/all`);
        console.log(`🔄 增量同步: POST http://localhost:${PORT}/api/cloud/sync/incremental`);
        console.log(`📊 同步状态: GET http://localhost:${PORT}/api/cloud/sync/status`);
        console.log('');
    }

    console.log('按 Ctrl+C 停止服务');
    console.log('========================================');
    console.log('');

    // 启动自动同步(仅在混合模式)
    if (storageManager.isHybridMode()) {
        try {
            syncManager.startAutoSync();
        } catch (error) {
            console.warn('⚠️  启动自动同步失败:', error.message);
        }
    }
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    closeDatabase();
    process.exit(0);
});

module.exports = app;
