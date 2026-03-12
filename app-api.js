// API基础配置
// 注意：如果浏览器和服务器不在同一台机器，请将 localhost 改为服务器的实际IP地址
// 例如：const API_BASE_URL = 'http://192.168.1.100:3000/api';
// const API_BASE_URL = 'http://localhost:3000/api';

const API_BASE_URL = 'http://111.230.104.223:3000/api';

// 数据存储（降级使用localStorage）
let sales = JSON.parse(localStorage.getItem('fish_sales')) || [];
let expenses = JSON.parse(localStorage.getItem('fish_expenses')) || [];
let monthlyExpenses = JSON.parse(localStorage.getItem('fish_monthly_expenses')) || [];
let customers = JSON.parse(localStorage.getItem('fish_customers')) || [];
let products = JSON.parse(localStorage.getItem('fish_products')) || [];
let inventory = JSON.parse(localStorage.getItem('fish_inventory')) || [];

// 使用API开关（可通过此开关切换本地存储和API）
let USE_API = true; // 设置为false则使用localStorage

// 检查API是否可用
async function checkApiAvailable() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            timeout: 1000
        });
        USE_API = response.ok;
        if (!USE_API) {
            console.warn('后端服务不可用，自动切换到本地存储模式');
        }
        return USE_API;
    } catch (error) {
        console.warn('后端服务不可用，自动切换到本地存储模式');
        USE_API = false;
        return false;
    }
}

// API调用函数
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    try {
        const response = await fetch(url, { ...defaultOptions, ...options });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '请求失败');
        }

        return data;
    } catch (error) {
        console.error('API调用失败:', error);
        console.warn('API调用失败，请在 index.html 中切换到 app.js 使用本地存储，或启动后端服务');
        throw error;
    }
}

// ==================== 客户管理 ====================

// 获取所有客户
async function loadCustomers() {
    if (USE_API) {
        try {
            console.log('正在从API加载客户...');
            const result = await apiCall('/customers');
            customers = result.data || [];
            console.log('从API加载到客户数量:', customers.length);
            localStorage.setItem('fish_customers', JSON.stringify(customers));
            return customers;
        } catch (err) {
            console.error('加载客户失败:', err);
            // 继续使用本地存储的数据
        }
    }
    console.log('使用本地存储的客户数据:', customers.length);
    return customers;
}

// 添加客户
async function addCustomer(customer) {
    if (USE_API) {
        try {
            // 将英文类型转换为中文类型以匹配数据库约束
            const typeMap = {
                'regular': '长期客户',
                'wholesale': '批发商',
                'retail': '零售客户',
                'restaurant': '餐饮客户'
            };
            const customerData = {
                ...customer,
                type: typeMap[customer.type] || customer.type
            };

            await apiCall('/customers', {
                method: 'POST',
                body: JSON.stringify(customerData)
            });
            await loadCustomers();
            return true;
        } catch (err) {
            console.error('添加客户失败:', err);
            alert('无法连接到后端服务，请启动后端或使用本地存储模式（app.js）');
            return false;
        }
    }

    // 本地存储模式
    customer.id = Date.now();
    customer.total_sales = 0;
    customer.total_debt = 0;
    customer.created_at = new Date().toISOString();
    customers.push(customer);
    saveCustomers();
    return true;
}

// 更新客户
async function updateCustomer(id, customer) {
    if (USE_API) {
        try {
            // 将英文类型转换为中文类型以匹配数据库约束
            const typeMap = {
                'regular': '长期客户',
                'wholesale': '批发商',
                'retail': '零售客户',
                'restaurant': '餐饮客户'
            };
            const customerData = {
                ...customer,
                type: typeMap[customer.type] || customer.type
            };

            await apiCall(`/customers/${id}`, {
                method: 'PUT',
                body: JSON.stringify(customerData)
            });
            await loadCustomers();
            return true;
        } catch (err) {
            console.error('更新客户失败:', err);
            alert('无法连接到后端服务');
            return false;
        }
    }

    const index = customers.findIndex(c => c.id === id);
    if (index !== -1) {
        customers[index] = { ...customers[index], ...customer };
        saveCustomers();
    }
    return true;
}

// 删除客户
async function deleteCustomer(id) {
    if (USE_API) {
        try {
            await apiCall(`/customers/${id}`, { method: 'DELETE' });
            await loadCustomers();
            return true;
        } catch (err) {
            console.error('删除客户失败:', err);
            alert('无法连接到后端服务');
            return false;
        }
    }

    customers = customers.filter(c => c.id !== id);
    saveCustomers();
    return true;
}

function saveCustomers() {
    localStorage.setItem('fish_customers', JSON.stringify(customers));
}

// ==================== 产品管理 ====================

// 获取所有产品
async function loadProducts() {
    if (USE_API) {
        try {
            const result = await apiCall('/products');
            products = result.data;
            localStorage.setItem('fish_products', JSON.stringify(products));
            return products;
        } catch (err) {
            return fallbackToLocal();
        }
    }
    return products;
}

// 添加产品
async function addProduct(product) {
    if (USE_API) {
        try {
            await apiCall('/products', {
                method: 'POST',
                body: JSON.stringify(product)
            });
            await loadProducts();
            return true;
        } catch (err) {
            return fallbackToLocal();
        }
    }

    product.id = Date.now();
    product.total_quantity = 0;
    product.total_sales = 0;
    product.created_at = new Date().toISOString();
    products.push(product);
    saveProducts();
    return true;
}

// 更新产品
async function updateProduct(id, product) {
    if (USE_API) {
        try {
            await apiCall(`/products/${id}`, {
                method: 'PUT',
                body: JSON.stringify(product)
            });
            await loadProducts();
            return true;
        } catch (err) {
            return fallbackToLocal();
        }
    }

    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
        products[index] = { ...products[index], ...product };
        saveProducts();
    }
    return true;
}

// 删除产品
async function deleteProduct(id) {
    if (USE_API) {
        try {
            await apiCall(`/products/${id}`, { method: 'DELETE' });
            await loadProducts();
            return true;
        } catch (err) {
            return fallbackToLocal();
        }
    }

    products = products.filter(p => p.id !== id);
    saveProducts();
    return true;
}

function saveProducts() {
    localStorage.setItem('fish_products', JSON.stringify(products));
}

// ==================== 销售管理 ====================

// 获取销售记录
async function loadSales(filters = {}) {
    if (USE_API) {
        try {
            const params = new URLSearchParams(filters).toString();
            const result = await apiCall(`/sales?${params}`);
            sales = result.data;
            localStorage.setItem('fish_sales', JSON.stringify(sales));
            return sales;
        } catch (err) {
            return fallbackToLocal();
        }
    }

    let filtered = [...sales];
    if (filters.customer_id) {
        filtered = filtered.filter(s => s.customer_id == filters.customer_id);
    }
    if (filters.product_id) {
        filtered = filtered.filter(s => s.product_id == filters.product_id);
    }
    if (filters.payment_status && filters.payment_status !== 'all') {
        filtered = filtered.filter(s => s.payment_status === filters.payment_status);
    }
    return filtered.sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date));
}

// 添加销售记录
async function addSale(sale) {
    if (USE_API) {
        try {
            await apiCall('/sales', {
                method: 'POST',
                body: JSON.stringify(sale)
            });
            await loadSales();
            await loadCustomers();
            await loadProducts();
            return true;
        } catch (err) {
            return fallbackToLocal();
        }
    }

    sale.id = Date.now();
    sale.created_at = new Date().toISOString();
    sales.push(sale);

    // 更新客户统计
    const customer = customers.find(c => c.id === sale.customer_id);
    if (customer) {
        customer.total_sales += sale.total_amount;
        customer.total_debt += sale.total_amount - (sale.paid_amount || 0);
        saveCustomers();
    }

    // 更新产品统计
    const product = products.find(p => p.id === sale.product_id);
    if (product) {
        product.total_quantity += sale.quantity;
        product.total_sales += sale.total_amount;
        saveProducts();
    }

    saveSales();
    return true;
}

// 更新销售记录
async function updateSale(id, sale) {
    if (USE_API) {
        try {
            await apiCall(`/sales/${id}`, {
                method: 'PUT',
                body: JSON.stringify(sale)
            });
            await loadSales();
            await loadCustomers();
            await loadProducts();
            return true;
        } catch (err) {
            return fallbackToLocal();
        }
    }

    const index = sales.findIndex(s => s.id === id);
    if (index !== -1) {
        const oldSale = sales[index];
        sales[index] = { ...sales[index], ...sale };

        // 调整客户统计
        const customer = customers.find(c => c.id === oldSale.customer_id);
        if (customer) {
            customer.total_sales += sale.total_amount - oldSale.total_amount;
            customer.total_debt += (sale.total_amount - (sale.paid_amount || 0)) -
                                  (oldSale.total_amount - oldSale.paid_amount);
            saveCustomers();
        }

        // 调整产品统计
        const product = products.find(p => p.id === oldSale.product_id);
        if (product) {
            product.total_quantity += sale.quantity - oldSale.quantity;
            product.total_sales += sale.total_amount - oldSale.total_amount;
            saveProducts();
        }

        saveSales();
    }
    return true;
}

// 删除销售记录
async function deleteSale(id) {
    if (USE_API) {
        try {
            await apiCall(`/sales/${id}`, { method: 'DELETE' });
            await loadSales();
            await loadCustomers();
            await loadProducts();
            return true;
        } catch (err) {
            return fallbackToLocal();
        }
    }

    const sale = sales.find(s => s.id === id);
    if (sale) {
        // 调整客户统计
        const customer = customers.find(c => c.id === sale.customer_id);
        if (customer) {
            customer.total_sales -= sale.total_amount;
            customer.total_debt -= sale.total_amount - sale.paid_amount;
            saveCustomers();
        }

        // 调整产品统计
        const product = products.find(p => p.id === sale.product_id);
        if (product) {
            product.total_quantity -= sale.quantity;
            product.total_sales -= sale.total_amount;
            saveProducts();
        }

        sales = sales.filter(s => s.id !== id);
        saveSales();
    }
    return true;
}

function saveSales() {
    localStorage.setItem('fish_sales', JSON.stringify(sales));
}

// ==================== 支出管理 ====================

// 获取支出记录
async function loadExpenses(filters = {}) {
    if (USE_API) {
        try {
            const params = new URLSearchParams(filters).toString();
            const result = await apiCall(`/expenses?${params}`);
            expenses = result.data;
            localStorage.setItem('fish_expenses', JSON.stringify(expenses));
            return expenses;
        } catch (err) {
            return fallbackToLocal();
        }
    }

    let filtered = [...expenses];
    if (filters.category && filters.category !== 'all') {
        filtered = filtered.filter(e => e.category === filters.category);
    }
    return filtered.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));
}

// 添加支出记录
async function addExpense(expense) {
    if (USE_API) {
        try {
            await apiCall('/expenses', {
                method: 'POST',
                body: JSON.stringify(expense)
            });
            await loadExpenses();
            return true;
        } catch (err) {
            return fallbackToLocal();
        }
    }

    expense.id = Date.now();
    expense.created_at = new Date().toISOString();
    expenses.push(expense);
    saveExpenses();
    return true;
}

// 更新支出记录
async function updateExpense(id, expense) {
    if (USE_API) {
        try {
            await apiCall(`/expenses/${id}`, {
                method: 'PUT',
                body: JSON.stringify(expense)
            });
            await loadExpenses();
            return true;
        } catch (err) {
            return fallbackToLocal();
        }
    }

    const index = expenses.findIndex(e => e.id === id);
    if (index !== -1) {
        expenses[index] = { ...expenses[index], ...expense };
        saveExpenses();
    }
    return true;
}

// 删除支出记录
async function deleteExpense(id) {
    if (USE_API) {
        try {
            await apiCall(`/expenses/${id}`, { method: 'DELETE' });
            await loadExpenses();
            return true;
        } catch (err) {
            return fallbackToLocal();
        }
    }

    expenses = expenses.filter(e => e.id !== id);
    saveExpenses();
    return true;
}

function saveExpenses() {
    localStorage.setItem('fish_expenses', JSON.stringify(expenses));
}

// ==================== 每月固定支出管理 ====================

// 获取所有每月固定支出
async function loadMonthlyExpenses(filters = {}) {
    if (USE_API) {
        try {
            const params = new URLSearchParams(filters).toString();
            const result = await apiCall(`/monthly-expenses?${params}`);
            monthlyExpenses = result.data;
            localStorage.setItem('fish_monthly_expenses', JSON.stringify(monthlyExpenses));
            return monthlyExpenses;
        } catch (err) {
            return fallbackToLocal();
        }
    }

    let filtered = [...monthlyExpenses];
    if (filters.is_active !== undefined && filters.is_active !== 'all') {
        filtered = filtered.filter(e => e.is_active === parseInt(filters.is_active));
    }
    return filtered.sort((a, b) => a.category.localeCompare(b.category));
}

// 添加每月固定支出
async function addMonthlyExpense(expense) {
    if (USE_API) {
        try {
            await apiCall('/monthly-expenses', {
                method: 'POST',
                body: JSON.stringify(expense)
            });
            await loadMonthlyExpenses();
            return true;
        } catch (err) {
            return fallbackToLocal();
        }
    }

    expense.id = Date.now();
    expense.created_at = new Date().toISOString();
    monthlyExpenses.push(expense);
    saveMonthlyExpenses();
    return true;
}

// 更新每月固定支出
async function updateMonthlyExpense(id, expense) {
    if (USE_API) {
        try {
            await apiCall(`/monthly-expenses/${id}`, {
                method: 'PUT',
                body: JSON.stringify(expense)
            });
            await loadMonthlyExpenses();
            return true;
        } catch (err) {
            return fallbackToLocal();
        }
    }

    const index = monthlyExpenses.findIndex(e => e.id === id);
    if (index !== -1) {
        monthlyExpenses[index] = { ...monthlyExpenses[index], ...expense };
        saveMonthlyExpenses();
    }
    return true;
}

// 删除每月固定支出
async function deleteMonthlyExpense(id) {
    if (USE_API) {
        try {
            await apiCall(`/monthly-expenses/${id}`, { method: 'DELETE' });
            await loadMonthlyExpenses();
            return true;
        } catch (err) {
            return fallbackToLocal();
        }
    }

    monthlyExpenses = monthlyExpenses.filter(e => e.id !== id);
    saveMonthlyExpenses();
    return true;
}

function saveMonthlyExpenses() {
    localStorage.setItem('fish_monthly_expenses', JSON.stringify(monthlyExpenses));
}

// ==================== 库存管理 ====================

// 获取所有库存
async function loadInventory(filters = {}) {
    if (USE_API) {
        try {
            const params = new URLSearchParams(filters).toString();
            const result = await apiCall(`/inventory?${params}`);
            inventory = result.data;
            localStorage.setItem('fish_inventory', JSON.stringify(inventory));
            return inventory;
        } catch (err) {
            return fallbackToLocal();
        }
    }

    let filtered = [...inventory];
    if (filters.is_active !== undefined && filters.is_active !== 'all') {
        filtered = filtered.filter(i => i.is_active === parseInt(filters.is_active));
    }
    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// 添加库存
async function addInventory(item) {
    if (USE_API) {
        try {
            await apiCall('/inventory', {
                method: 'POST',
                body: JSON.stringify(item)
            });
            await loadInventory();
            return true;
        } catch (err) {
            return fallbackToLocal();
        }
    }

    item.id = Date.now();
    item.created_at = new Date().toISOString();
    inventory.push(item);
    saveInventory();
    return true;
}

// 更新库存
async function updateInventory(id, item) {
    if (USE_API) {
        try {
            await apiCall(`/inventory/${id}`, {
                method: 'PUT',
                body: JSON.stringify(item)
            });
            await loadInventory();
            return true;
        } catch (err) {
            return fallbackToLocal();
        }
    }

    const index = inventory.findIndex(i => i.id === id);
    if (index !== -1) {
        inventory[index] = { ...inventory[index], ...item };
        saveInventory();
    }
    return true;
}

// 删除库存
async function deleteInventory(id) {
    if (USE_API) {
        try {
            await apiCall(`/inventory/${id}`, { method: 'DELETE' });
            await loadInventory();
            return true;
        } catch (err) {
            return fallbackToLocal();
        }
    }

    inventory = inventory.filter(i => i.id !== id);
    saveInventory();
    return true;
}

function saveInventory() {
    localStorage.setItem('fish_inventory', JSON.stringify(inventory));
}

// ==================== 统计分析 ====================

// 获取仪表板数据
async function loadDashboardData() {
    if (USE_API) {
        try {
            const result = await apiCall('/dashboard');
            return result.data;
        } catch (err) {
            return fallbackToLocal();
        }
    }

    // 本地计算
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const todaySales = sales.filter(s => s.sale_date === today);
    const todayExpenses = expenses.filter(e => e.expense_date === today);
    const monthSales = sales.filter(s => s.sale_date >= firstDayOfMonth);
    const monthExpenses = expenses.filter(e => e.expense_date >= firstDayOfMonth);

    // 趋势数据
    const trendData = {};
    sales.filter(s => new Date(s.sale_date) >= sevenDaysAgo).forEach(s => {
        if (!trendData[s.sale_date]) trendData[s.sale_date] = 0;
        trendData[s.sale_date] += s.total_amount;
    });

    // 产品销售
    const productSales = {};
    sales.forEach(s => {
        const product = products.find(p => p.id === s.product_id);
        if (product) {
            if (!productSales[product.name]) productSales[product.name] = 0;
            productSales[product.name] += s.total_amount;
        }
    });

    // 支出分类
    const expenseByCategory = {};
    expenses.forEach(e => {
        if (!expenseByCategory[e.category]) expenseByCategory[e.category] = 0;
        expenseByCategory[e.category] += e.amount;
    });

    // 客户排行榜
    const customerRank = {};
    sales.forEach(s => {
        const customer = customers.find(c => c.id === s.customer_id);
        if (customer) {
            if (!customerRank[customer.name]) customerRank[customer.name] = 0;
            customerRank[customer.name] += s.total_amount;
        }
    });

    return {
        today: {
            sales: todaySales.reduce((sum, s) => sum + s.total_amount, 0),
            salesCount: todaySales.length,
            salesQuantity: todaySales.reduce((sum, s) => sum + s.quantity, 0),
            expenses: todayExpenses.reduce((sum, e) => sum + e.amount, 0),
            profit: todaySales.reduce((sum, s) => sum + s.total_amount, 0) -
                    todayExpenses.reduce((sum, e) => sum + e.amount, 0)
        },
        month: {
            sales: monthSales.reduce((sum, s) => sum + s.total_amount, 0),
            salesQuantity: monthSales.reduce((sum, s) => sum + s.quantity, 0),
            expenses: monthExpenses.reduce((sum, e) => sum + e.amount, 0),
            profit: monthSales.reduce((sum, s) => sum + s.total_amount, 0) -
                    monthExpenses.reduce((sum, e) => sum + e.amount, 0),
            avgPrice: monthSales.reduce((sum, s) => sum + s.quantity, 0) > 0 ?
                monthSales.reduce((sum, s) => sum + s.total_amount, 0) /
                monthSales.reduce((sum, s) => sum + s.quantity, 0) : 0
        },
        trend: Object.entries(trendData).map(([date, total]) => ({ sale_date: date, total })),
        productSales: Object.entries(productSales).map(([name, total]) => ({ name, total })),
        expenseByCategory: Object.entries(expenseByCategory).map(([category, total]) => ({ category, total })),
        topCustomers: Object.entries(customerRank)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10)
    };
}

// 获取报表数据
async function fetchReportData(startDate, endDate) {
    if (USE_API) {
        try {
            const result = await apiCall(`/report?start_date=${startDate}&end_date=${endDate}`);
            return result.data;
        } catch (err) {
            return fallbackToLocal();
        }
    }

    const periodSales = sales.filter(s => s.sale_date >= startDate && s.sale_date <= endDate);
    const periodExpenses = expenses.filter(e => e.expense_date >= startDate && e.expense_date <= endDate);

    // 产品明细
    const productDetails = {};
    periodSales.forEach(s => {
        const product = products.find(p => p.id === s.product_id);
        if (product) {
            if (!productDetails[product.id]) {
                productDetails[product.id] = { name: product.name, category: product.category, total: 0, quantity: 0, unitPrices: [] };
            }
            productDetails[product.id].total += s.total_amount;
            productDetails[product.id].quantity += s.quantity;
            productDetails[product.id].unitPrices.push(s.unit_price);
        }
    });

    // 客户明细
    const customerDetails = {};
    periodSales.forEach(s => {
        const customer = customers.find(c => c.id === s.customer_id);
        if (customer) {
            if (!customerDetails[customer.id]) {
                customerDetails[customer.id] = { name: customer.name, type: customer.type, total: 0, count: 0 };
            }
            customerDetails[customer.id].total += s.total_amount;
            customerDetails[customer.id].count += 1;
        }
    });

    return {
        period: { start_date: startDate, end_date: endDate },
        summary: {
            total_sales: periodSales.reduce((sum, s) => sum + s.total_amount, 0),
            total_quantity: periodSales.reduce((sum, s) => sum + s.quantity, 0),
            sales_count: periodSales.length,
            total_expenses: periodExpenses.reduce((sum, e) => sum + e.amount, 0),
            expense_count: periodExpenses.length,
            net_profit: periodSales.reduce((sum, s) => sum + s.total_amount, 0) -
                       periodExpenses.reduce((sum, e) => sum + e.amount, 0),
            avgPrice: periodSales.reduce((sum, s) => sum + s.quantity, 0) > 0 ?
                periodSales.reduce((sum, s) => sum + s.total_amount, 0) /
                periodSales.reduce((sum, s) => sum + s.quantity, 0) : 0
        },
        productDetails: Object.values(productDetails).map(d => ({
            ...d,
            avg_price: d.unitPrices.length > 0 ?
                d.unitPrices.reduce((a, b) => a + b, 0) / d.unitPrices.length : 0
        })),
        customerDetails: Object.values(customerDetails)
    };
}

// 导出数据
async function exportAllData() {
    if (USE_API) {
        try {
            const result = await apiCall('/export');
            return result.data;
        } catch (err) {
            return {
                customers,
                products,
                sales,
                expenses,
                export_time: new Date().toISOString()
            };
        }
    }

    return {
        customers,
        products,
        sales,
        expenses,
        export_time: new Date().toISOString()
    };
}

// ==================== 重新定义原始函数（向后兼容）====================

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    initializeDateInputs();

    // 检查后端服务是否可用
    const apiAvailable = await checkApiAvailable();
    if (!apiAvailable && USE_API) {
        alert('后端服务不可用，正在使用本地存储模式。如需使用数据库，请启动后端服务：\ncd /home/zhoumeihua/wholesale_fish_bookkeeping && npm start');
    }

    await loadInitialData();
    setupEventListeners();
    setupTabNavigation();
    updateDashboard();
    renderSalesTable();
    renderExpenseTable();
    renderMonthlyExpenseTable();
    renderCustomerTable();
    renderProductTable();
    renderInventoryTable();
    initializeReportDates();
});

// 标签页导航
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');

            // 移除所有激活状态
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // 激活当前标签页
            button.classList.add('active');
            const targetContent = document.getElementById(tabId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

async function loadInitialData() {
    await loadCustomers();
    await loadProducts();
    await loadSales();
    await loadExpenses();
    await loadMonthlyExpenses();
    await loadInventory();
}

// 初始化日期输入
function initializeDateInputs() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('salesDate').value = today;
    document.getElementById('expenseDate').value = today;
    document.getElementById('monthlyExpenseStartDate').value = today;
    document.getElementById('inventoryPurchaseDate').value = today;
}

// 更新下拉列表
function updateCustomerSelects() {
    const salesCustomer = document.getElementById('salesCustomer');
    const salesFilterCustomer = document.getElementById('salesFilterCustomer');

    salesCustomer.innerHTML = '<option value="">选择客户</option>';
    salesFilterCustomer.innerHTML = '<option value="all">全部客户</option>';

    customers.forEach(customer => {
        salesCustomer.innerHTML += `<option value="${customer.id}">${customer.name}</option>`;
        salesFilterCustomer.innerHTML += `<option value="${customer.id}">${customer.name}</option>`;
    });
}

function updateProductSelects() {
    const salesProduct = document.getElementById('salesProduct');
    const salesFilterProduct = document.getElementById('salesFilterProduct');
    const salesFilterCategory = document.getElementById('salesFilterCategory');
    const inventoryProduct = document.getElementById('inventoryProduct');

    if (salesProduct) {
        salesProduct.innerHTML = '<option value="">选择产品</option>';
        products.forEach(product => {
            salesProduct.innerHTML += `<option value="${product.id}">${product.name} (${product.category})</option>`;
        });
    }

    if (salesFilterProduct) {
        salesFilterProduct.innerHTML = '<option value="all">全部产品</option>';
        products.forEach(product => {
            salesFilterProduct.innerHTML += `<option value="${product.id}">${product.name}</option>`;
        });
    }

    if (inventoryProduct) {
        inventoryProduct.innerHTML = '<option value="">选择产品</option>';
        products.forEach(product => {
            inventoryProduct.innerHTML += `<option value="${product.id}">${product.name} (${product.category})</option>`;
        });
    }

    // 获取所有唯一的品类
    const categories = [...new Set(products.map(p => p.category))].filter(c => c);

    // 更新品类筛选器
    if (salesFilterCategory) {
        salesFilterCategory.innerHTML = '<option value="all">全部品类</option>';
        categories.forEach(category => {
            salesFilterCategory.innerHTML += `<option value="${category}">${category}</option>`;
        });
    }

    // 更新产品价格提示
    const productPriceHint = document.getElementById('productPriceHint');
    if (productPriceHint) {
        productPriceHint.innerHTML = products.map(p =>
            `<option value="${p.id}">${p.name} - 建议价: ¥${p.suggested_price}/斤</option>`
        ).join('');
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 销售表单提交
    const salesForm = document.getElementById('salesForm');
    if (salesForm) {
        salesForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // 获取付款状态并转换
            const paymentStatus = document.getElementById('salesPaymentStatus').value;
            const paymentStatusMap = {
                'paid': '已付款',
                'unpaid': '未付款',
                'partial': '部分付款'
            };

            const sale = {
                customer_id: parseInt(document.getElementById('salesCustomer').value),
                product_id: parseInt(document.getElementById('salesProduct').value),
                quantity: parseFloat(document.getElementById('salesWeight').value),
                unit_price: parseFloat(document.getElementById('salesPrice').value),
                total_amount: parseFloat(document.getElementById('salesTotalAmount').value) || 0,
                payment_status: paymentStatusMap[paymentStatus] || '已付款',
                paid_amount: parseFloat(document.getElementById('salesTotalAmount').value) || 0,
                sale_date: document.getElementById('salesDate').value,
                notes: document.getElementById('salesNotes').value
            };

            if (await addSale(sale)) {
                salesForm.reset();
                initializeDateInputs();
                updateDashboard();
                await renderSalesTable();
                alert('销售记录添加成功！');
            }
        });
    }

    // 支出表单提交
    const expenseForm = document.getElementById('expenseForm');
    if (expenseForm) {
        expenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const expense = {
                category: document.getElementById('expenseCategory').value,
                amount: parseFloat(document.getElementById('expenseAmount').value),
                description: document.getElementById('expenseNotes').value,
                payment_method: document.getElementById('expensePaymentMethod').value,
                expense_date: document.getElementById('expenseDate').value
            };

            if (await addExpense(expense)) {
                expenseForm.reset();
                initializeDateInputs();
                updateDashboard();
                await renderExpenseTable();
                alert('支出记录添加成功！');
            }
        });
    }

    // 产品选择自动填充价格
    const salesProduct = document.getElementById('salesProduct');
    const salesPrice = document.getElementById('salesPrice');
    if (salesProduct && salesPrice) {
        salesProduct.addEventListener('change', (e) => {
            const product = products.find(p => p.id === parseInt(e.target.value));
            if (product && product.suggested_price > 0) {
                salesPrice.value = product.suggested_price;
                calculateTotalAmount();
            }
        });
    }

    // 数量和单价变化时计算总金额
    const salesWeight = document.getElementById('salesWeight');
    if (salesWeight) {
        salesWeight.addEventListener('input', calculateTotalAmount);
    }
    if (salesPrice) {
        salesPrice.addEventListener('input', calculateTotalAmount);
    }

    // 付款状态变化（如果需要的话）
    const salesPaymentStatus = document.getElementById('salesPaymentStatus');
    if (salesPaymentStatus) {
        salesPaymentStatus.addEventListener('change', (e) => {
            // 可以在这里添加付款状态变化的处理逻辑
            console.log('付款状态变化:', e.target.value);
        });
    }

    // 每月固定支出表单提交
    const monthlyExpenseForm = document.getElementById('monthlyExpenseForm');
    if (monthlyExpenseForm) {
        monthlyExpenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const expense = {
                name: document.getElementById('monthlyExpenseName').value,
                category: document.getElementById('monthlyExpenseCategory').value,
                amount: parseFloat(document.getElementById('monthlyExpenseAmount').value),
                payment_method: document.getElementById('monthlyExpensePaymentMethod').value,
                description: document.getElementById('monthlyExpenseNotes').value,
                is_active: parseInt(document.getElementById('monthlyExpenseStatus').value),
                start_date: document.getElementById('monthlyExpenseStartDate').value,
                cycle_type: document.getElementById('monthlyExpenseCycleType').value
            };

            if (await addMonthlyExpense(expense)) {
                monthlyExpenseForm.reset();
                document.getElementById('monthlyExpenseStatus').value = '1';
                await renderMonthlyExpenseTable();
                alert('固定支出添加成功！');
            }
        });
    }

    // 库存表单提交
    const inventoryForm = document.getElementById('inventoryForm');
    if (inventoryForm) {
        inventoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const item = {
                product_id: parseInt(document.getElementById('inventoryProduct').value),
                quantity: parseFloat(document.getElementById('inventoryQuantity').value),
                unit: document.getElementById('inventoryUnit').value,
                supplier: document.getElementById('inventorySupplier').value,
                purchase_price: parseFloat(document.getElementById('inventoryPurchasePrice').value) || 0,
                purchase_date: document.getElementById('inventoryPurchaseDate').value,
                notes: document.getElementById('inventoryNotes').value,
                is_active: 1
            };

            if (await addInventory(item)) {
                inventoryForm.reset();
                document.getElementById('inventoryUnit').value = '斤';
                await renderInventoryTable();
                alert('库存添加成功！');
            }
        });
    }

    // 销售记录筛选器事件监听 - 移除自动触发，改为手动按钮触发
    const salesFilterCustomer = document.getElementById('salesFilterCustomer');
    const salesFilterCategory = document.getElementById('salesFilterCategory');
    const salesFilterProduct = document.getElementById('salesFilterProduct');
    const salesFilterStatus = document.getElementById('salesFilterStatus');
    const salesFilterDateStart = document.getElementById('salesFilterDateStart');
    const salesFilterDateEnd = document.getElementById('salesFilterDateEnd');

    const salesFilterElements = [salesFilterCustomer, salesFilterCategory, salesFilterProduct, salesFilterStatus, salesFilterDateStart, salesFilterDateEnd];
    // 移除自动触发的事件监听器
    // salesFilterElements.forEach(element => {
    //     if (element) {
    //         element.addEventListener('change', renderSalesTable);
    //         element.addEventListener('input', renderSalesTable);
    //     }
    // });

    // 支出记录筛选器事件监听 - 移除自动触发，改为手动按钮触发
    const expenseFilterCategory = document.getElementById('expenseFilterCategory');
    const expenseFilterDateStart = document.getElementById('expenseFilterDateStart');
    const expenseFilterDateEnd = document.getElementById('expenseFilterDateEnd');

    const expenseFilterElements = [expenseFilterCategory, expenseFilterDateStart, expenseFilterDateEnd];
    // 移除自动触发的事件监听器
    // expenseFilterElements.forEach(element => {
    //     if (element) {
    //         element.addEventListener('change', renderExpenseTable);
    //         element.addEventListener('input', renderExpenseTable);
    //     }
    // });

    // 模态框销售记录表单提交
    const modalSaleForm = document.getElementById('modalSaleForm');
    if (modalSaleForm) {
        modalSaleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = parseInt(modalSaleForm.dataset.id);
            const sale = {
                customer_id: parseInt(document.getElementById('modalSaleCustomer').value),
                product_id: parseInt(document.getElementById('modalSaleProduct').value),
                quantity: parseFloat(document.getElementById('modalSaleWeight').value),
                unit_price: parseFloat(document.getElementById('modalSalePrice').value),
                total_amount: parseFloat(document.getElementById('modalSaleTotalAmount').value),
                payment_status: document.getElementById('modalSalePaymentStatus').value === 'paid' ? '已付款' :
                                 document.getElementById('modalSalePaymentStatus').value === 'unpaid' ? '未付款' : '部分付款',
                paid_amount: parseFloat(document.getElementById('modalSaleTotalAmount').value) || 0,
                sale_date: document.getElementById('modalSaleDate').value,
                notes: document.getElementById('modalSaleNotes').value
            };

            if (await updateSale(id, sale)) {
                modalSaleForm.reset();
                delete modalSaleForm.dataset.id;
                document.getElementById('saleModal').style.display = 'none';
                await renderSalesTable();
                updateDashboard();
                alert('销售记录更新成功！');
            }
        });
    }

    // 添加客户和产品按钮在HTML中使用onclick调用全局函数，不需要在这里添加监听器

    // 关闭模态框
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
                // 重置表单模式
                const form = modal.querySelector('form');
                if (form) {
                    form.reset();
                    delete form.dataset.mode;
                    delete form.dataset.id;
                    const title = modal.querySelector('h3');
                    if (title) {
                        title.textContent = title.textContent.includes('客户') ? '添加客户' : '添加产品';
                    }
                }
            });
        });
    });

    // 模态框客户表单提交
    const modalCustomerForm = document.getElementById('modalCustomerForm');
    if (modalCustomerForm) {
        modalCustomerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const mode = modalCustomerForm.dataset.mode || 'add';
            const id = parseInt(modalCustomerForm.dataset.id);
            const customer = {
                name: document.getElementById('modalCustomerName').value,
                type: document.getElementById('modalCustomerType').value,
                phone: document.getElementById('modalCustomerPhone').value,
                address: document.getElementById('modalCustomerAddress').value
            };

            if (mode === 'edit') {
                if (await updateCustomer(id, customer)) {
                    modalCustomerForm.reset();
                    delete modalCustomerForm.dataset.mode;
                    delete modalCustomerForm.dataset.id;
                    document.getElementById('customerModal').style.display = 'none';
                    await renderCustomerTable();
                    alert('客户更新成功！');
                }
            } else {
                if (await addCustomer(customer)) {
                    modalCustomerForm.reset();
                    document.getElementById('customerModal').style.display = 'none';
                    await renderCustomerTable();
                    alert('客户添加成功！');
                }
            }
        });
    }

    // 模态框产品表单提交
    const modalProductForm = document.getElementById('modalProductForm');
    if (modalProductForm) {
        modalProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const mode = modalProductForm.dataset.mode || 'add';
            const id = parseInt(modalProductForm.dataset.id);
            const product = {
                name: document.getElementById('modalProductName').value,
                category: document.getElementById('modalProductCategory').value,
                suggested_price: parseFloat(document.getElementById('modalProductPrice').value) || 0,
                supplier: document.getElementById('modalProductSupplier').value
            };

            if (mode === 'edit') {
                if (await updateProduct(id, product)) {
                    modalProductForm.reset();
                    delete modalProductForm.dataset.mode;
                    delete modalProductForm.dataset.id;
                    document.getElementById('productModal').style.display = 'none';
                    await renderProductTable();
                    alert('产品更新成功！');
                }
            } else {
                if (await addProduct(product)) {
                    modalProductForm.reset();
                    document.getElementById('productModal').style.display = 'none';
                    await renderProductTable();
                    alert('产品添加成功！');
                }
            }
        });
    }

    // 模态框每月固定支出表单提交
    const modalMonthlyExpenseForm = document.getElementById('modalMonthlyExpenseForm');
    if (modalMonthlyExpenseForm) {
        modalMonthlyExpenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = parseInt(modalMonthlyExpenseForm.dataset.id);
            const expense = {
                name: document.getElementById('modalMonthlyExpenseName').value,
                category: document.getElementById('modalMonthlyExpenseCategory').value,
                amount: parseFloat(document.getElementById('modalMonthlyExpenseAmount').value),
                payment_method: document.getElementById('modalMonthlyExpensePaymentMethod').value,
                description: document.getElementById('modalMonthlyExpenseNotes').value,
                is_active: parseInt(document.getElementById('modalMonthlyExpenseStatus').value),
                start_date: document.getElementById('modalMonthlyExpenseStartDate').value,
                cycle_type: document.getElementById('modalMonthlyExpenseCycleType').value
            };

            if (await updateMonthlyExpense(id, expense)) {
                modalMonthlyExpenseForm.reset();
                delete modalMonthlyExpenseForm.dataset.id;
                document.getElementById('monthlyExpenseModal').style.display = 'none';
                await renderMonthlyExpenseTable();
                alert('固定支出更新成功！');
            }
        });
    }

    // 模态框库存表单提交
    const modalInventoryForm = document.getElementById('modalInventoryForm');
    if (modalInventoryForm) {
        modalInventoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = parseInt(modalInventoryForm.dataset.id);
            const item = {
                product_id: parseInt(document.getElementById('modalInventoryProduct').value),
                quantity: parseFloat(document.getElementById('modalInventoryQuantity').value),
                unit: document.getElementById('modalInventoryUnit').value,
                supplier: document.getElementById('modalInventorySupplier').value,
                purchase_price: parseFloat(document.getElementById('modalInventoryPurchasePrice').value) || 0,
                purchase_date: document.getElementById('modalInventoryPurchaseDate').value,
                notes: document.getElementById('modalInventoryNotes').value,
                is_active: parseInt(document.getElementById('modalInventoryStatus').value)
            };

            if (await updateInventory(id, item)) {
                modalInventoryForm.reset();
                delete modalInventoryForm.dataset.id;
                document.getElementById('inventoryModal').style.display = 'none';
                await renderInventoryTable();
                alert('库存更新成功！');
            }
        });
    }

    // 客户表单提交（客户管理页面）
    const customerForm = document.getElementById('customerForm');
    if (customerForm) {
        customerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const customer = {
                name: document.getElementById('customerName').value,
                type: document.getElementById('customerType').value,
                phone: document.getElementById('customerPhone').value,
                address: document.getElementById('customerAddress').value
            };

            if (await addCustomer(customer)) {
                customerForm.reset();
                await renderCustomerTable();
                alert('客户添加成功！');
            }
        });
    }

    // 产品表单提交
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const product = {
                name: document.getElementById('productName').value,
                category: document.getElementById('productCategory').value,
                suggested_price: parseFloat(document.getElementById('productPrice').value) || 0,
                supplier: document.getElementById('productSupplier').value
            };

            if (await addProduct(product)) {
                productForm.reset();
                await renderProductTable();
                alert('产品添加成功！');
            }
        });
    }
}

function calculateTotalAmount() {
    const quantity = parseFloat(document.getElementById('salesWeight').value) || 0;
    const unitPrice = parseFloat(document.getElementById('salesPrice').value) || 0;
    const total = quantity * unitPrice;
    document.getElementById('salesTotalAmount').value = total.toFixed(2);
}

// 更新仪表板
async function updateDashboard() {
    const data = await loadDashboardData();

    if (!data) {
        console.warn('仪表板数据为空');
        return;
    }

    const today = data.today || {};
    const month = data.month || {};

    // 今日数据
    const todaySalesEl = document.getElementById('todaySales');
    if (todaySalesEl) todaySalesEl.textContent = `¥${Number(today.sales || 0).toFixed(2)}`;

    const todayOrdersEl = document.getElementById('todayOrders');
    if (todayOrdersEl) todayOrdersEl.textContent = `${today.salesCount || 0} 笔`;

    const todaySalesQuantityEl = document.getElementById('todaySalesQuantity');
    if (todaySalesQuantityEl) todaySalesQuantityEl.textContent = `${Number(today.salesQuantity || 0).toFixed(1)} 斤`;

    const todayExpenseEl = document.getElementById('todayExpense');
    if (todayExpenseEl) todayExpenseEl.textContent = `¥${Number(today.expenses || 0).toFixed(2)}`;

    const todayProfitEl = document.getElementById('todayProfit');
    if (todayProfitEl) todayProfitEl.textContent = `¥${Number(today.profit || 0).toFixed(2)}`;

    // 本月数据
    const monthSalesEl = document.getElementById('monthSales');
    if (monthSalesEl) monthSalesEl.textContent = `¥${Number(month.sales || 0).toFixed(2)}`;

    const monthSalesQuantityEl = document.getElementById('monthSalesQuantity');
    if (monthSalesQuantityEl) monthSalesQuantityEl.textContent = `${Number(month.salesQuantity || 0).toFixed(1)} 斤`;

    const monthExpenseEl = document.getElementById('monthExpense');
    if (monthExpenseEl) monthExpenseEl.textContent = `¥${Number(month.expenses || 0).toFixed(2)}`;

    const monthProfitEl = document.getElementById('monthProfit');
    if (monthProfitEl) monthProfitEl.textContent = `¥${Number(month.profit || 0).toFixed(2)}`;

    const monthAvgPriceEl = document.getElementById('monthAvgPrice');
    if (monthAvgPriceEl) monthAvgPriceEl.textContent = `¥${Number(month.avgPrice || 0).toFixed(2)}`;

    // 绘制图表 - 使用正确的canvas ID
    drawTrendChart(data.trend || []);
    drawProductSalesPie(data.productSales || []);
    drawExpenseBarChart(data.expenseByCategory || []);
    renderTopCustomers(data.topCustomers || []);
}

// 绘制销售趋势图
function drawTrendChart(trendData) {
    const canvas = document.getElementById('salesTrendChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (trendData.length === 0) return;

    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;

    // 绘制坐标轴
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.strokeStyle = '#ddd';
    ctx.stroke();

    // 找出最大值
    const maxSales = Math.max(...trendData.map(d => d.total || 0));
    const scale = maxSales > 0 ? chartHeight / maxSales : 1;

    // 绘制折线
    ctx.beginPath();
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;

    trendData.forEach((data, index) => {
        const x = padding + (index / (trendData.length - 1)) * chartWidth;
        const total = data.total || 0;
        const y = canvas.height - padding - total * scale;

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();

    // 绘制数据点
    trendData.forEach((data, index) => {
        const x = padding + (index / (trendData.length - 1)) * chartWidth;
        const total = data.total || 0;
        const y = canvas.height - padding - total * scale;

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#4CAF50';
        ctx.fill();
    });
}

// 绘制产品销售饼图
function drawProductSalesPie(productSales) {
    const canvas = document.getElementById('productPieChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!productSales || productSales.length === 0) return;

    const total = productSales.reduce((sum, p) => sum + (p.total || 0), 0);

    if (total === 0) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'];

    let startAngle = 0;
    productSales.forEach((product, index) => {
        const productTotal = product.total || 0;
        const sliceAngle = (productTotal / total) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.fillStyle = colors[index % colors.length];
        ctx.fill();

        startAngle = endAngle;
    });
}

// 绘制支出柱状图
function drawExpenseBarChart(expenseData) {
    const canvas = document.getElementById('expensePieChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!expenseData || expenseData.length === 0) return;

    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;

    const maxExpense = Math.max(...expenseData.map(e => e.total || 0));
    const scale = maxExpense > 0 ? chartHeight / maxExpense : 1;

    const barWidth = chartWidth / expenseData.length - 10;

    const colors = ['#FF5722', '#FFC107', '#03A9F4', '#8BC34A', '#FF9800', '#E91E63'];

    expenseData.forEach((item, index) => {
        const x = padding + index * (barWidth + 10);
        const total = item.total || 0;
        const barHeight = total * scale;
        const y = canvas.height - padding - barHeight;

        ctx.fillStyle = colors[index % colors.length];
        ctx.fillRect(x, y, barWidth, barHeight);
    });
}

// 渲染客户排行榜
function renderTopCustomers(topCustomers) {
    const canvas = document.getElementById('customerBarChart');
    if (!canvas) return;

    // 使用柱状图绘制客户排行
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!topCustomers || topCustomers.length === 0) return;

    const padding = 60;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;

    const maxSales = Math.max(...topCustomers.map(c => c.total || 0));
    const scale = maxSales > 0 ? chartHeight / maxSales : 1;

    const barWidth = chartWidth / topCustomers.length - 10;

    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#FF5722', '#FFC107', '#03A9F4', '#8BC34A'];

    topCustomers.forEach((customer, index) => {
        const x = padding + index * (barWidth + 10);
        const total = customer.total || 0;
        const barHeight = total * scale;
        const y = canvas.height - padding - barHeight;

        ctx.fillStyle = colors[index % colors.length];
        ctx.fillRect(x, y, barWidth, barHeight);

        // 绘制客户名称
        ctx.fillStyle = '#333';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        const customerName = customer.name || '未知';
        const shortName = customerName.length > 4 ? customerName.substring(0, 4) + '..' : customerName;
        ctx.fillText(shortName, x + barWidth / 2, canvas.height - padding + 15);
    });
}

// 渲染销售表格
async function renderSalesTable(salesData = null) {
    if (salesData === null) {
        salesData = await loadSales();
    }

    // 应用筛选器
    const customerFilter = document.getElementById('salesFilterCustomer')?.value || 'all';
    const categoryFilter = document.getElementById('salesFilterCategory')?.value || 'all';
    const productFilter = document.getElementById('salesFilterProduct')?.value || 'all';
    const statusFilter = document.getElementById('salesFilterStatus')?.value || 'all';
    const dateStart = document.getElementById('salesFilterDateStart')?.value || '';
    const dateEnd = document.getElementById('salesFilterDateEnd')?.value || '';

    let filteredSales = salesData.filter(sale => {
        const customer = customers.find(c => c.id === sale.customer_id);
        const product = products.find(p => p.id === sale.product_id);

        // 客户筛选
        if (customerFilter !== 'all' && sale.customer_id !== parseInt(customerFilter)) {
            return false;
        }

        // 品类筛选
        if (categoryFilter !== 'all' && product?.category !== categoryFilter) {
            return false;
        }

        // 产品筛选
        if (productFilter !== 'all' && sale.product_id !== parseInt(productFilter)) {
            return false;
        }

        // 状态筛选
        if (statusFilter !== 'all') {
            const statusMap = { 'paid': '已付款', 'unpaid': '未付款', 'partial': '部分付款' };
            if (sale.payment_status !== statusMap[statusFilter]) {
                return false;
            }
        }

        // 日期范围筛选
        if (dateStart && sale.sale_date < dateStart) {
            return false;
        }
        if (dateEnd && sale.sale_date > dateEnd) {
            return false;
        }

        return true;
    });

    const cardGrid = document.getElementById('salesCardGrid');
    if (!cardGrid) return;

    cardGrid.innerHTML = '';
    filteredSales.forEach(sale => {
        const customer = customers.find(c => c.id === sale.customer_id);
        const product = products.find(p => p.id === sale.product_id);

        const paymentStatusClass = {
            '已付款': 'payment-paid',
            '未付款': 'payment-unpaid',
            '部分付款': 'payment-partial'
        }[sale.payment_status] || '';

        cardGrid.innerHTML += `
            <div class="data-card sales">
                <div class="data-card-header">
                    <span class="data-card-title">${sale.sale_date || '-'}</span>
                    <span class="data-card-badge ${paymentStatusClass}">${sale.payment_status || '-'}</span>
                </div>
                <div class="data-card-body">
                    <div class="data-card-row">
                        <span class="data-card-label">客户</span>
                        <span class="data-card-value">${customer ? customer.name : '未知'}</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">产品</span>
                        <span class="data-card-value">${product ? product.name : '未知'}</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">数量</span>
                        <span class="data-card-value">${Number(sale.quantity || 0).toFixed(1)} 斤</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">单价</span>
                        <span class="data-card-value">¥${Number(sale.unit_price || 0).toFixed(2)}</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">金额</span>
                        <span class="data-card-value highlight">¥${Number(sale.total_amount || 0).toFixed(2)}</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">备注</span>
                        <span class="data-card-value">${sale.notes || '-'}</span>
                    </div>
                </div>
                <div class="data-card-actions">
                    <button class="btn-primary" onclick="window.editSale(${sale.id})">编辑</button>
                    <button class="btn-danger" onclick="window.deleteSaleById(${sale.id})">删除</button>
                </div>
            </div>
        `;
    });

    updateProductSelects();
    updateCustomerSelects();
}

// 渲染支出表格
async function renderExpenseTable(expensesData = null) {
    if (expensesData === null) {
        expensesData = await loadExpenses();
    }

    // 应用筛选器
    const categoryFilter = document.getElementById('expenseFilterCategory')?.value || 'all';
    const dateStart = document.getElementById('expenseFilterDateStart')?.value || '';
    const dateEnd = document.getElementById('expenseFilterDateEnd')?.value || '';

    let filteredExpenses = expensesData.filter(expense => {
        // 分类筛选
        if (categoryFilter !== 'all' && expense.category !== categoryFilter) {
            return false;
        }

        // 日期范围筛选
        if (dateStart && expense.expense_date < dateStart) {
            return false;
        }
        if (dateEnd && expense.expense_date > dateEnd) {
            return false;
        }

        return true;
    });

    const cardGrid = document.getElementById('expenseCardGrid');
    if (!cardGrid) return;

    cardGrid.innerHTML = '';
    filteredExpenses.forEach(expense => {
        cardGrid.innerHTML += `
            <div class="data-card expense">
                <div class="data-card-header">
                    <span class="data-card-title">${expense.expense_date || '-'}</span>
                    <span class="data-card-badge">${expense.category || '-'}</span>
                </div>
                <div class="data-card-body">
                    <div class="data-card-row">
                        <span class="data-card-label">分类</span>
                        <span class="data-card-value">${expense.category || '-'}</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">金额</span>
                        <span class="data-card-value highlight">¥${Number(expense.amount || 0).toFixed(2)}</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">支付方式</span>
                        <span class="data-card-value">${expense.payment_method || '-'}</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">备注</span>
                        <span class="data-card-value">${expense.description || '-'}</span>
                    </div>
                </div>
                <div class="data-card-actions">
                    <button class="btn-danger" onclick="window.deleteExpenseById(${expense.id})">删除</button>
                </div>
            </div>
        `;
    });
}

// 渲染客户表格
async function renderCustomerTable() {
    await loadCustomers();
    const tbody = document.getElementById('customerTableBody');
    if (!tbody) {
        console.warn('客户表格元素不存在');
        return;
    }

    console.log('渲染客户表格，客户数量:', customers.length);

    const typeMap = {
        'regular': '长期客户',
        'wholesale': '批发商',
        'retail': '零售客户',
        'restaurant': '餐饮客户'
    };

    const cardGrid = document.getElementById('customerCardGrid');
    if (!cardGrid) {
        console.warn('客户卡片容器不存在');
        return;
    }

    cardGrid.innerHTML = '';
    customers.forEach(customer => {
        console.log('客户数据:', customer);
        const typeText = typeMap[customer.type] || customer.type || '未知';
        cardGrid.innerHTML += `
            <div class="data-card customer">
                <div class="data-card-header">
                    <span class="data-card-title">${customer.name || '-'}</span>
                    <span class="data-card-badge">${typeText}</span>
                </div>
                <div class="data-card-body">
                    <div class="data-card-row">
                        <span class="data-card-label">电话</span>
                        <span class="data-card-value">${customer.phone || '-'}</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">地址</span>
                        <span class="data-card-value">${customer.address || '-'}</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">累计销售额</span>
                        <span class="data-card-value highlight">¥${(customer.total_sales || 0).toFixed(2)}</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">累计欠款</span>
                        <span class="data-card-value">¥${(customer.total_debt || 0).toFixed(2)}</span>
                    </div>
                </div>
                <div class="data-card-actions">
                    <button class="btn-primary" onclick="window.editCustomer(${customer.id})">编辑</button>
                    <button class="btn-danger" onclick="window.deleteCustomerById(${customer.id})">删除</button>
                </div>
            </div>
        `;
    });

    updateCustomerSelects();
}

// 渲染产品表格
async function renderProductTable() {
    await loadProducts();
    const tbody = document.getElementById('productTableBody');
    if (!tbody) return;

    const cardGrid = document.getElementById('productCardGrid');
    if (!cardGrid) return;

    cardGrid.innerHTML = '';
    products.forEach(product => {
        cardGrid.innerHTML += `
            <div class="data-card product">
                <div class="data-card-header">
                    <span class="data-card-title">${product.name || '-'}</span>
                    <span class="data-card-badge">${product.category || '-'}</span>
                </div>
                <div class="data-card-body">
                    <div class="data-card-row">
                        <span class="data-card-label">分类</span>
                        <span class="data-card-value">${product.category || '-'}</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">建议单价</span>
                        <span class="data-card-value">¥${Number(product.suggested_price || 0).toFixed(2)}/斤</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">供应商</span>
                        <span class="data-card-value">${product.supplier || '-'}</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">累计销量</span>
                        <span class="data-card-value">${Number(product.total_quantity || 0).toFixed(1)} 斤</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">累计销售额</span>
                        <span class="data-card-value highlight">¥${Number(product.total_sales || 0).toFixed(2)}</span>
                    </div>
                </div>
                <div class="data-card-actions">
                    <button class="btn-primary" onclick="window.editProduct(${product.id})">编辑</button>
                    <button class="btn-danger" onclick="window.deleteProductById(${product.id})">删除</button>
                </div>
            </div>
        `;
    });

    updateProductSelects();
}

// 渲染库存表格
async function renderInventoryTable(inventoryData = null) {
    if (inventoryData === null) {
        inventoryData = await loadInventory();
    }

    // 应用筛选器
    const statusFilter = document.getElementById('inventoryFilterStatus')?.value || 'all';

    let filteredInventory = inventoryData.filter(item => {
        if (statusFilter !== 'all' && item.is_active !== parseInt(statusFilter)) {
            return false;
        }
        return true;
    });

    const cardGrid = document.getElementById('inventoryCardGrid');
    if (!cardGrid) return;

    cardGrid.innerHTML = '';
    filteredInventory.forEach(item => {
        const statusText = item.is_active ? '启用' : '禁用';
        const statusClass = item.is_active ? 'status-active' : 'status-inactive';

        cardGrid.innerHTML += `
            <div class="data-card inventory">
                <div class="data-card-header">
                    <span class="data-card-title">${item.product_name || '未知产品'}</span>
                    <span class="data-card-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="data-card-body">
                    <div class="data-card-row">
                        <span class="data-card-label">分类</span>
                        <span class="data-card-value">${item.product_category || '-'}</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">数量</span>
                        <span class="data-card-value highlight">${Number(item.quantity || 0).toFixed(1)} ${item.unit || '斤'}</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">进货单价</span>
                        <span class="data-card-value">¥${Number(item.purchase_price || 0).toFixed(2)}/${item.unit || '斤'}</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">进货日期</span>
                        <span class="data-card-value">${item.purchase_date || '-'}</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">供应商</span>
                        <span class="data-card-value">${item.supplier || '-'}</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">备注</span>
                        <span class="data-card-value">${item.notes || '-'}</span>
                    </div>
                </div>
                <div class="data-card-actions">
                    <button class="btn-primary" onclick="window.editInventory(${item.id})">编辑</button>
                    <button class="btn-danger" onclick="window.deleteInventoryById(${item.id})">删除</button>
                </div>
            </div>
        `;
    });
}

// 渲染每月固定支出表格
async function renderMonthlyExpenseTable(monthlyExpensesData = null) {
    if (monthlyExpensesData === null) {
        monthlyExpensesData = await loadMonthlyExpenses();
    }

    // 应用筛选器
    const statusFilter = document.getElementById('monthlyExpenseFilterStatus')?.value || 'all';

    let filteredExpenses = monthlyExpensesData.filter(expense => {
        // 状态筛选
        if (statusFilter !== 'all' && expense.is_active !== parseInt(statusFilter)) {
            return false;
        }

        return true;
    });

    const tbody = document.getElementById('monthlyExpenseTableBody');
    if (!tbody) return;

    const cardGrid = document.getElementById('monthlyExpenseCardGrid');
    if (!cardGrid) return;

    cardGrid.innerHTML = '';
    filteredExpenses.forEach(expense => {
        const statusText = expense.is_active ? '启用' : '禁用';
        const statusClass = expense.is_active ? 'status-active' : 'status-inactive';

        const cycleTypeText = {
            'monthly': '每月',
            'quarterly': '每季度',
            'yearly': '每年'
        }[expense.cycle_type] || '每月';

        const cycleTypeClass = {
            'monthly': 'cycle-monthly',
            'quarterly': 'cycle-quarterly',
            'yearly': 'cycle-yearly'
        }[expense.cycle_type] || 'cycle-monthly';

        cardGrid.innerHTML += `
            <div class="data-card monthly-expense">
                <div class="data-card-header">
                    <span class="data-card-title">${expense.name || '-'}</span>
                    <span class="data-card-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="data-card-body">
                    <div class="data-card-row">
                        <span class="data-card-label">分类</span>
                        <span class="data-card-value">${expense.category || '-'}</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">金额</span>
                        <span class="data-card-value highlight">¥${Number(expense.amount || 0).toFixed(2)}</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">支付方式</span>
                        <span class="data-card-value">${expense.payment_method || '-'}</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">开始日期</span>
                        <span class="data-card-value">${expense.start_date || '-'}</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">循环周期</span>
                        <span class="data-card-badge ${cycleTypeClass}">${cycleTypeText}</span>
                    </div>
                    <div class="data-card-row">
                        <span class="data-card-label">备注</span>
                        <span class="data-card-value">${expense.description || '-'}</span>
                    </div>
                </div>
                <div class="data-card-actions">
                    <button class="btn-primary" onclick="window.editMonthlyExpense(${expense.id})">编辑</button>
                    <button class="btn-danger" onclick="window.deleteMonthlyExpenseById(${expense.id})">删除</button>
                </div>
            </div>
        `;
    });
}

// 初始化报表日期
function initializeReportDates() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    document.getElementById('reportStartDate').value = firstDayOfMonth;
    document.getElementById('reportEndDate').value = lastDayOfMonth;
}

// 渲染报表
function renderReport(reportData) {
    if (!reportData || !reportData.summary) {
        console.error('报表数据无效:', reportData);
        return;
    }

    // 更新报表汇总数据 - 处理可能的 undefined 值
    const summary = reportData.summary;
    const totalSales = summary.total_sales || 0;
    const totalWeight = summary.total_quantity || 0;
    const totalExpense = summary.total_expenses || 0;
    const netProfit = summary.net_profit !== undefined ? summary.net_profit : 0;
    const avgPrice = summary.avgPrice || summary.avg_price || 0;
    const salesCount = summary.sales_count || 0;

    const totalSalesEl = document.getElementById('reportTotalSales');
    if (totalSalesEl) totalSalesEl.textContent = `¥${Number(totalSales).toFixed(2)}`;

    const totalWeightEl = document.getElementById('reportTotalWeight');
    if (totalWeightEl) totalWeightEl.textContent = `${Number(totalWeight).toFixed(1)} 斤`;

    const totalExpenseEl = document.getElementById('reportTotalExpense');
    if (totalExpenseEl) totalExpenseEl.textContent = `¥${Number(totalExpense).toFixed(2)}`;

    const netProfitEl = document.getElementById('reportNetProfit');
    if (netProfitEl) netProfitEl.textContent = `¥${Number(netProfit).toFixed(2)}`;

    const avgPriceEl = document.getElementById('reportAvgPrice');
    if (avgPriceEl) avgPriceEl.textContent = `¥${Number(avgPrice).toFixed(2)}/斤`;

    const orderCountEl = document.getElementById('reportOrderCount');
    if (orderCountEl) orderCountEl.textContent = `${salesCount} 笔`;

    // 绘制报表图表
    drawReportProductChart(reportData.productDetails || []);
    drawReportCustomerChart(reportData.customerDetails || []);
}

// 绘制报表产品图表
function drawReportProductChart(productDetails) {
    const canvas = document.getElementById('reportProductChart');
    if (!canvas || !productDetails || productDetails.length === 0) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const total = productDetails.reduce((sum, p) => sum + (p.total || 0), 0);

    if (total === 0) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'];

    let startAngle = 0;
    productDetails.forEach((product, index) => {
        const productTotal = product.total || 0;
        const sliceAngle = (productTotal / total) * 2 * Math.PI;
        const endAngle = startAngle + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.fillStyle = colors[index % colors.length];
        ctx.fill();

        startAngle = endAngle;
    });
}

// 绘制报表客户图表
function drawReportCustomerChart(customerDetails) {
    const canvas = document.getElementById('reportCustomerChart');
    if (!canvas || !customerDetails || customerDetails.length === 0) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = 60;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;

    const maxTotal = Math.max(...customerDetails.map(c => c.total || 0));
    const scale = maxTotal > 0 ? chartHeight / maxTotal : 1;

    const barWidth = chartWidth / customerDetails.length - 10;

    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'];

    customerDetails.forEach((customer, index) => {
        const x = padding + index * (barWidth + 10);
        const customerTotal = customer.total || 0;
        const barHeight = customerTotal * scale;
        const y = canvas.height - padding - barHeight;

        ctx.fillStyle = colors[index % colors.length];
        ctx.fillRect(x, y, barWidth, barHeight);

        // 绘制客户名称
        ctx.fillStyle = '#333';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        const customerName = customer.name || '未知';
        const shortName = customerName.length > 4 ? customerName.substring(0, 4) + '..' : customerName;
        ctx.fillText(shortName, x + barWidth / 2, canvas.height - padding + 15);
    });
}

// 下载JSON文件
function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// 删除函数（供HTML调用）
window.deleteSaleById = async function(id) {
    if (confirm('确定要删除这条销售记录吗？')) {
        if (await deleteSale(id)) {
            await renderSalesTable();
            updateDashboard();
        }
    }
};

window.deleteExpenseById = async function(id) {
    if (confirm('确定要删除这条支出记录吗？')) {
        if (await deleteExpense(id)) {
            await renderExpenseTable();
            updateDashboard();
        }
    }
};

window.deleteCustomerById = async function(id) {
    if (confirm('确定要删除这个客户吗？')) {
        if (await deleteCustomer(id)) {
            await renderCustomerTable();
        }
    }
};

window.deleteProductById = async function(id) {
    if (confirm('确定要删除这个产品吗？')) {
        if (await deleteProduct(id)) {
            await renderProductTable();
        }
    }
};

window.deleteMonthlyExpenseById = async function(id) {
    if (confirm('确定要删除这条固定支出吗？')) {
        if (await deleteMonthlyExpense(id)) {
            await renderMonthlyExpenseTable();
        }
    }
};

// 编辑库存
window.editInventory = async function(id) {
    const item = inventory.find(i => i.id === id);
    if (!item) {
        alert('库存记录不存在');
        return;
    }

    // 填充模态框表单
    document.getElementById('modalInventoryProduct').innerHTML = products.map(p =>
        `<option value="${p.id}" ${p.id === item.product_id ? 'selected' : ''}>${p.name} (${p.category})</option>`
    ).join('');
    document.getElementById('modalInventoryQuantity').value = item.quantity || '';
    document.getElementById('modalInventoryUnit').value = item.unit || '斤';
    document.getElementById('modalInventoryPurchasePrice').value = item.purchase_price || '';
    document.getElementById('modalInventoryPurchaseDate').value = item.purchase_date || '';
    document.getElementById('modalInventorySupplier').value = item.supplier || '';
    document.getElementById('modalInventoryNotes').value = item.notes || '';
    document.getElementById('modalInventoryStatus').value = item.is_active !== undefined ? item.is_active.toString() : '1';

    // 更改表单行为为更新
    const form = document.getElementById('modalInventoryForm');
    form.dataset.id = id;

    // 显示模态框
    const modal = document.getElementById('inventoryModal');
    if (modal) {
        modal.style.display = 'flex';
    }
};

// 删除库存
window.deleteInventoryById = async function(id) {
    if (confirm('确定要删除这条库存记录吗？')) {
        if (await deleteInventory(id)) {
            await renderInventoryTable();
        }
    }
};

// 清除库存筛选
window.clearInventoryFilters = async function() {
    try {
        document.getElementById('inventoryFilterStatus').value = 'all';
        await renderInventoryTable();
    } catch (err) {
        console.error('清除库存筛选失败:', err);
    }
};

// 应用库存筛选
window.applyInventoryFilters = async function() {
    try {
        await renderInventoryTable();
    } catch (err) {
        console.error('应用库存筛选失败:', err);
    }
};

// 打开客户模态框
window.openCustomerModal = function() {
    const modal = document.getElementById('customerModal');
    if (modal) modal.style.display = 'flex';
};

// 编辑客户
window.editCustomer = async function(id) {
    const customer = customers.find(c => c.id === id);
    if (!customer) {
        alert('客户不存在');
        return;
    }

    // 填充模态框表单
    document.getElementById('modalCustomerName').value = customer.name || '';
    document.getElementById('modalCustomerPhone').value = customer.phone || '';
    document.getElementById('modalCustomerAddress').value = customer.address || '';
    document.getElementById('modalCustomerType').value = customer.type || 'regular';

    // 更改表单行为为更新
    const form = document.getElementById('modalCustomerForm');
    form.dataset.mode = 'edit';
    form.dataset.id = id;

    // 显示模态框
    const modal = document.getElementById('customerModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.querySelector('h3').textContent = '编辑客户';
    }
};

// 打开产品模态框
window.openProductModal = function() {
    const modal = document.getElementById('productModal');
    if (modal) modal.style.display = 'flex';
};

// 编辑销售记录
window.editSale = async function(id) {
    const sale = sales.find(s => s.id === id);
    if (!sale) {
        alert('销售记录不存在');
        return;
    }

    // 填充模态框表单
    document.getElementById('modalSaleDate').value = sale.sale_date || '';
    document.getElementById('modalSaleWeight').value = sale.quantity || '';
    document.getElementById('modalSalePrice').value = sale.unit_price || '';
    document.getElementById('modalSaleTotalAmount').value = sale.total_amount || '';
    document.getElementById('modalSaleNotes').value = sale.notes || '';

    // 填充客户选择
    const customerSelect = document.getElementById('modalSaleCustomer');
    customerSelect.innerHTML = customers.map(c =>
        `<option value="${c.id}" ${c.id === sale.customer_id ? 'selected' : ''}>${c.name}</option>`
    ).join('');

    // 填充产品选择
    const productSelect = document.getElementById('modalSaleProduct');
    productSelect.innerHTML = products.map(p =>
        `<option value="${p.id}" ${p.id === sale.product_id ? 'selected' : ''}>${p.name} (${p.category})</option>`
    ).join('');

    // 设置付款状态
    const statusMap = { '已付款': 'paid', '未付款': 'unpaid', '部分付款': 'partial' };
    const statusSelect = document.getElementById('modalSalePaymentStatus');
    statusSelect.value = statusMap[sale.payment_status] || 'paid';

    // 更改表单行为为更新
    const form = document.getElementById('modalSaleForm');
    form.dataset.id = id;

    // 显示模态框
    const modal = document.getElementById('saleModal');
    if (modal) {
        modal.style.display = 'flex';
    }
};

// 编辑产品
window.editProduct = async function(id) {
    const product = products.find(p => p.id === id);
    if (!product) {
        alert('产品不存在');
        return;
    }

    // 填充模态框表单
    document.getElementById('modalProductName').value = product.name || '';
    document.getElementById('modalProductCategory').value = product.category || '鱼类';
    document.getElementById('modalProductPrice').value = product.suggested_price || '';
    document.getElementById('modalProductSupplier').value = product.supplier || '';

    // 更改表单行为为更新
    const form = document.getElementById('modalProductForm');
    form.dataset.mode = 'edit';
    form.dataset.id = id;

    // 显示模态框
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.querySelector('h3').textContent = '编辑产品';
    }
};

// 编辑每月固定支出
window.editMonthlyExpense = async function(id) {
    const expense = monthlyExpenses.find(e => e.id === id);
    if (!expense) {
        alert('固定支出不存在');
        return;
    }

    // 填充模态框表单
    document.getElementById('modalMonthlyExpenseName').value = expense.name || '';
    document.getElementById('modalMonthlyExpenseCategory').value = expense.category || '其他';
    document.getElementById('modalMonthlyExpenseAmount').value = expense.amount || '';
    document.getElementById('modalMonthlyExpensePaymentMethod').value = expense.payment_method || '现金';
    document.getElementById('modalMonthlyExpenseNotes').value = expense.description || '';
    document.getElementById('modalMonthlyExpenseStatus').value = expense.is_active !== undefined ? expense.is_active.toString() : '1';
    document.getElementById('modalMonthlyExpenseStartDate').value = expense.start_date || '';
    document.getElementById('modalMonthlyExpenseCycleType').value = expense.cycle_type || 'monthly';

    // 更改表单行为为更新
    const form = document.getElementById('modalMonthlyExpenseForm');
    form.dataset.id = id;

    // 显示模态框
    const modal = document.getElementById('monthlyExpenseModal');
    if (modal) {
        modal.style.display = 'flex';
    }
};

// 清除销售筛选
window.clearSalesFilters = async function() {
    try {
        document.getElementById('salesFilterCustomer').value = 'all';
        document.getElementById('salesFilterCategory').value = 'all';
        document.getElementById('salesFilterProduct').value = 'all';
        document.getElementById('salesFilterStatus').value = 'all';
        document.getElementById('salesFilterDateStart').value = '';
        document.getElementById('salesFilterDateEnd').value = '';
        await renderSalesTable();
    } catch (err) {
        console.error('清除销售筛选失败:', err);
    }
};

// 应用销售筛选
window.applySalesFilters = async function() {
    try {
        await renderSalesTable();
    } catch (err) {
        console.error('应用销售筛选失败:', err);
    }
};

// 清除支出筛选
window.clearExpenseFilters = async function() {
    try {
        document.getElementById('expenseFilterCategory').value = 'all';
        document.getElementById('expenseFilterDateStart').value = '';
        document.getElementById('expenseFilterDateEnd').value = '';
        await renderExpenseTable();
    } catch (err) {
        console.error('清除支出筛选失败:', err);
    }
};

// 应用支出筛选
window.applyExpenseFilters = async function() {
    try {
        await renderExpenseTable();
    } catch (err) {
        console.error('应用支出筛选失败:', err);
    }
};

// 清除每月固定支出筛选
window.clearMonthlyExpenseFilters = async function() {
    try {
        document.getElementById('monthlyExpenseFilterStatus').value = 'all';
        await renderMonthlyExpenseTable();
    } catch (err) {
        console.error('清除每月固定支出筛选失败:', err);
    }
};

// 应用每月固定支出筛选
window.applyMonthlyExpenseFilters = async function() {
    try {
        await renderMonthlyExpenseTable();
    } catch (err) {
        console.error('应用每月固定支出筛选失败:', err);
    }
};

// 生成报表（HTML按钮调用）
window.generateReport = async function() {
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;

    if (!startDate || !endDate) {
        alert('请选择日期范围');
        return;
    }

    const reportData = await fetchReportData(startDate, endDate);
    renderReport(reportData);
};

// 导出报表为 Excel
window.exportReport = async function() {
    try {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;

        if (!startDate || !endDate) {
            alert('请选择日期范围');
            return;
        }

        // 动态加载 ExcelJS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/exceljs@4.4.0/dist/exceljs.min.js';
        script.onload = async () => {
            try {
                // 获取销售记录和支出记录
                let reportSales = [];
                let reportExpenses = [];
                let summary = {};

                if (USE_API) {
                    try {
                        const salesResult = await apiCall(`/sales?start_date=${startDate}&end_date=${endDate}`);
                        reportSales = salesResult.data || [];
                        const expensesResult = await apiCall(`/expenses?start_date=${startDate}&end_date=${endDate}`);
                        reportExpenses = expensesResult.data || [];
                        const reportData = await fetchReportData(startDate, endDate);
                        summary = reportData?.summary || {};
                    } catch (err) {
                        console.error('获取数据失败:', err);
                        alert('获取数据失败: ' + err.message);
                        return;
                    }
                } else {
                    reportSales = sales.filter(s => s.sale_date >= startDate && s.sale_date <= endDate);
                    reportExpenses = expenses.filter(e => e.expense_date >= startDate && e.expense_date <= endDate);
                    summary = {
                        total_sales: reportSales.reduce((sum, s) => sum + s.total_amount, 0),
                        total_quantity: reportSales.reduce((sum, s) => sum + s.quantity, 0),
                        total_expenses: reportExpenses.reduce((sum, e) => sum + e.amount, 0),
                        net_profit: reportSales.reduce((sum, s) => sum + s.total_amount, 0) -
                                   reportExpenses.reduce((sum, e) => sum + e.amount, 0)
                    };
                }

                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('水产批发报表');

                worksheet.columns = [
                    { width: 12 },
                    { width: 15 },
                    { width: 15 },
                    { width: 10 },
                    { width: 12 },
                    { width: 12 },
                    { width: 10 }
                ];

                let rowIndex = 1;
                const titleRow = worksheet.getRow(rowIndex);
                titleRow.font = { size: 16, bold: true };
                worksheet.mergeCells('A1:G1');
                worksheet.getCell('A1').value = '水产批发报表';
                worksheet.getCell('A1').alignment = { horizontal: 'center' };

                rowIndex += 1;
                worksheet.getRow(rowIndex).values = ['', '', '', '', '', '', ''];
                rowIndex += 1;
                worksheet.getCell(`A${rowIndex}`).value = '日期范围:';
                worksheet.getCell(`B${rowIndex}`).value = startDate;
                worksheet.getCell(`C${rowIndex}`).value = '至';
                worksheet.getCell(`D${rowIndex}`).value = endDate;

                rowIndex += 2;
                const salesTitleRow = worksheet.getRow(rowIndex);
                salesTitleRow.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
                salesTitleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } };
                worksheet.mergeCells(`A${rowIndex}:G${rowIndex}`);
                worksheet.getCell(`A${rowIndex}`).value = '销售记录';

                rowIndex += 1;
                const salesHeaderRow = worksheet.getRow(rowIndex);
                salesHeaderRow.font = { bold: true };
                salesHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
                salesHeaderRow.values = ['日期', '客户', '产品', '斤数', '单价', '金额', '状态'];
                salesHeaderRow.eachCell((cell) => {
                    cell.alignment = { horizontal: 'center' };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });

                reportSales.forEach(sale => {
                    rowIndex += 1;
                    const customer = customers.find(c => c.id === sale.customer_id);
                    const product = products.find(p => p.id === sale.product_id);
                    const row = worksheet.getRow(rowIndex);
                    row.values = [
                        sale.sale_date,
                        customer?.name || '未知',
                        product?.name || '未知',
                        Number(sale.quantity || 0),
                        Number(sale.unit_price || 0),
                        Number(sale.total_amount || 0),
                        sale.payment_status || '未支付'
                    ];
                    row.eachCell((cell) => {
                        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                        if (cell.col >= 4 && cell.col <= 6) {
                            cell.numFmt = cell.col === 4 ? '0.0' : '0.00';
                        }
                    });
                });

                rowIndex += 2;
                const expenseTitleRow = worksheet.getRow(rowIndex);
                expenseTitleRow.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
                expenseTitleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF57C00' } };
                worksheet.mergeCells(`A${rowIndex}:G${rowIndex}`);
                worksheet.getCell(`A${rowIndex}`).value = '支出记录';

                rowIndex += 1;
                const expenseHeaderRow = worksheet.getRow(rowIndex);
                expenseHeaderRow.font = { bold: true };
                expenseHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } };
                expenseHeaderRow.values = ['日期', '分类', '金额', '支付方式', '备注', '', ''];
                expenseHeaderRow.eachCell((cell) => {
                    cell.alignment = { horizontal: 'center' };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });

                reportExpenses.forEach(expense => {
                    rowIndex += 1;
                    const row = worksheet.getRow(rowIndex);
                    row.values = [
                        expense.expense_date,
                        expense.category || '-',
                        Number(expense.amount || 0),
                        expense.payment_method || '-',
                        expense.notes || '-',
                        '',
                        ''
                    ];
                    row.eachCell((cell) => {
                        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                        if (cell.col === 3) {
                            cell.numFmt = '0.00';
                        }
                    });
                });

                rowIndex += 2;
                const summaryTitleRow = worksheet.getRow(rowIndex);
                summaryTitleRow.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
                summaryTitleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2196F3' } };
                worksheet.mergeCells(`A${rowIndex}:G${rowIndex}`);
                worksheet.getCell(`A${rowIndex}`).value = '汇总';

                const totalSales = summary.total_sales || 0;
                const totalWeight = summary.total_quantity || 0;
                const totalExpense = summary.total_expenses || 0;
                const netProfit = summary.net_profit !== undefined ? summary.net_profit : totalSales - totalExpense;

                const summaryData = [
                    ['总销售额', totalSales, '', '', '', '', ''],
                    ['总销量', totalWeight, '斤', '', '', '', ''],
                    ['总支出', totalExpense, '', '', '', '', ''],
                    ['净利润', netProfit, '', '', '', '', '']
                ];

                summaryData.forEach(item => {
                    rowIndex += 1;
                    const row = worksheet.getRow(rowIndex);
                    row.font = { bold: true };
                    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
                    row.values = item;
                    row.eachCell((cell) => {
                        if (cell.value !== '' && cell.col === 2) {
                            cell.numFmt = '0.00';
                        }
                        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    });
                });

                const buffer = await workbook.xlsx.writeBuffer();
                const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `水产报表_${startDate}_${endDate}.xlsx`;
                link.click();

            } catch (error) {
                console.error('生成Excel失败:', error);
                alert('生成Excel失败: ' + error.message);
            }
        };
        script.onerror = () => {
            alert('加载Excel库失败，请检查网络连接');
        };
        document.head.appendChild(script);

    } catch (error) {
        console.error('导出报表失败:', error);
        alert('导出报表失败: ' + error.message);
    }
};
