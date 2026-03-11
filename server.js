const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initDatabase, getDatabase, closeDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 初始化数据库
const db = initDatabase();

// ==================== 健康检查 ====================
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '服务器运行正常' });
});

// ==================== 客户管理 ====================

// 获取所有客户
app.get('/api/customers', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM customers ORDER BY created_at DESC');
        const customers = stmt.all();
        res.json({ success: true, data: customers });
    } catch (err) {
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
        const stmt = db.prepare(`
            UPDATE customers 
            SET name = ?, type = ?, phone = ?, address = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        stmt.run(name, type, phone, address, id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 删除客户
app.delete('/api/customers/:id', (req, res) => {
    try {
        const { id } = req.params;
        const stmt = db.prepare('DELETE FROM customers WHERE id = ?');
        stmt.run(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== 产品管理 ====================

// 获取所有产品
app.get('/api/products', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM products ORDER BY created_at DESC');
        const products = stmt.all();
        res.json({ success: true, data: products });
    } catch (err) {
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
        const stmt = db.prepare(`
            UPDATE products 
            SET name = ?, category = ?, suggested_price = ?, supplier = ?, 
                supplier_phone = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        stmt.run(name, category, suggested_price, supplier, supplier_phone, id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 删除产品
app.delete('/api/products/:id', (req, res) => {
    try {
        const { id } = req.params;
        const stmt = db.prepare('DELETE FROM products WHERE id = ?');
        stmt.run(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==================== 销售管理 ====================

// 获取所有销售记录
app.get('/api/sales', (req, res) => {
    try {
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

        const stmt = db.prepare(query);
        const sales = stmt.all(...params);
        res.json({ success: true, data: sales });
    } catch (err) {
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

        const stmt = db.prepare(query);
        const expenses = stmt.all(...params);
        res.json({ success: true, data: expenses });
    } catch (err) {
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
        const stmt = db.prepare('DELETE FROM expenses WHERE id = ?');
        stmt.run(id);
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

// 启动服务器
app.listen(PORT, () => {
    console.log(`水产批发记账系统后端服务运行在 http://localhost:${PORT}`);
    console.log(`API文档: http://localhost:${PORT}/api/health`);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    closeDatabase();
    process.exit(0);
});

module.exports = app;
