const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 数据库文件路径
const dbPath = path.join(__dirname, 'fish_bookkeeping.db');

// 初始化数据库
let db;

function initDatabase() {
    // 如果数据库已存在，先备份
    if (fs.existsSync(dbPath)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const backupPath = path.join(__dirname, `fish_bookkeeping_backup_${timestamp}.db`);
        try {
            fs.copyFileSync(dbPath, backupPath);
            console.log(`数据库已备份到: ${backupPath}`);
        } catch (err) {
            console.error('备份失败:', err.message);
        }
    }

    // 创建数据库连接
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL'); // 启用WAL模式提高并发性能

    // 创建表
    createTables();

    console.log('数据库初始化完成:', dbPath);
    return db;
}

// 创建所有表
function createTables() {
    // 客户表
    db.exec(`
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            type TEXT NOT NULL CHECK(type IN ('长期客户', '批发商', '零售客户', '餐饮客户')),
            phone TEXT,
            address TEXT,
            total_sales REAL DEFAULT 0,
            total_debt REAL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 产品表
    db.exec(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            category TEXT NOT NULL CHECK(category IN ('鱼类', '虾类', '蟹类', '贝类', '软体类', '其他')),
            suggested_price REAL DEFAULT 0,
            supplier TEXT,
            supplier_phone TEXT,
            total_quantity REAL DEFAULT 0,
            total_sales REAL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 销售表
    db.exec(`
        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity REAL NOT NULL,
            unit_price REAL NOT NULL,
            total_amount REAL NOT NULL,
            payment_status TEXT NOT NULL CHECK(payment_status IN ('已付款', '未付款', '部分付款')),
            paid_amount REAL DEFAULT 0,
            sale_date TEXT NOT NULL,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        );
    `);

    // 支出表
    db.exec(`
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL CHECK(category IN ('薪资', '车辆费用', '油费', '店面', '水电', '进货成本', '运输费', '包装费', '其他')),
            amount REAL NOT NULL,
            description TEXT,
            payment_method TEXT,
            expense_date TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 创建索引提高查询性能
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
        CREATE INDEX IF NOT EXISTS idx_sales_product ON sales(product_id);
        CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
        CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
        CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
    `);

    console.log('数据库表创建完成');
}

// 获取数据库实例
function getDatabase() {
    if (!db) {
        db = initDatabase();
    }
    return db;
}

// 关闭数据库连接
function closeDatabase() {
    if (db) {
        db.close();
        console.log('数据库连接已关闭');
    }
}

module.exports = {
    initDatabase,
    getDatabase,
    closeDatabase
};
