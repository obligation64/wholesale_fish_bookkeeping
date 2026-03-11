// API基础配置
const API_BASE_URL = 'http://localhost:3000/api';

// 数据存储（降级使用localStorage）
let sales = JSON.parse(localStorage.getItem('fish_sales')) || [];
let expenses = JSON.parse(localStorage.getItem('fish_expenses')) || [];
let customers = JSON.parse(localStorage.getItem('fish_customers')) || [];
let products = JSON.parse(localStorage.getItem('fish_products')) || [];

// 使用API开关（可通过此开关切换本地存储和API）
const USE_API = true; // 设置为false则使用localStorage

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
        throw error;
    }
}

// 切换到本地存储模式
function fallbackToLocal() {
    console.warn('API不可用，切换到本地存储模式');
    return false;
}

// ==================== 客户管理 ====================

// 获取所有客户
async function loadCustomers() {
    if (USE_API) {
        try {
            const result = await apiCall('/customers');
            customers = result.data;
            localStorage.setItem('fish_customers', JSON.stringify(customers));
            return customers;
        } catch (err) {
            return fallbackToLocal();
        }
    }
    return customers;
}

// 添加客户
async function addCustomer(customer) {
    if (USE_API) {
        try {
            await apiCall('/customers', {
                method: 'POST',
                body: JSON.stringify(customer)
            });
            await loadCustomers();
            return true;
        } catch (err) {
            return fallbackToLocal();
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
            await apiCall(`/customers/${id}`, {
                method: 'PUT',
                body: JSON.stringify(customer)
            });
            await loadCustomers();
            return true;
        } catch (err) {
            return fallbackToLocal();
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
            return fallbackToLocal();
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

// 生成报表
async function generateReport(startDate, endDate) {
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
    await loadInitialData();
    setupEventListeners();
    updateDashboard();
    renderSalesTable();
    renderExpenseTable();
    renderCustomerTable();
    renderProductTable();
    initializeReportDates();
});

async function loadInitialData() {
    await loadCustomers();
    await loadProducts();
    await loadSales();
    await loadExpenses();
}

// 初始化日期输入
function initializeDateInputs() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('salesDate').value = today;
    document.getElementById('expenseDate').value = today;
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

    salesProduct.innerHTML = '<option value="">选择产品</option>';
    salesFilterProduct.innerHTML = '<option value="all">全部产品</option>';

    products.forEach(product => {
        salesProduct.innerHTML += `<option value="${product.id}">${product.name} (${product.category})</option>`;
        salesFilterProduct.innerHTML += `<option value="${product.id}">${product.name}</option>`;
    });

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
    document.getElementById('saleForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const sale = {
            customer_id: parseInt(document.getElementById('salesCustomer').value),
            product_id: parseInt(document.getElementById('salesProduct').value),
            quantity: parseFloat(document.getElementById('salesQuantity').value),
            unit_price: parseFloat(document.getElementById('salesUnitPrice').value),
            total_amount: parseFloat(document.getElementById('salesTotalAmount').value),
            payment_status: document.getElementById('salesPaymentStatus').value,
            paid_amount: parseFloat(document.getElementById('salesPaidAmount').value) || 0,
            sale_date: document.getElementById('salesDate').value,
            notes: document.getElementById('salesNotes').value
        };

        if (await addSale(sale)) {
            document.getElementById('saleForm').reset();
            initializeDateInputs();
            updateDashboard();
            await renderSalesTable();
            alert('销售记录添加成功！');
        }
    });

    // 支出表单提交
    document.getElementById('expenseForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const expense = {
            category: document.getElementById('expenseCategory').value,
            amount: parseFloat(document.getElementById('expenseAmount').value),
            description: document.getElementById('expenseDescription').value,
            payment_method: document.getElementById('expensePaymentMethod').value,
            expense_date: document.getElementById('expenseDate').value
        };

        if (await addExpense(expense)) {
            document.getElementById('expenseForm').reset();
            initializeDateInputs();
            updateDashboard();
            await renderExpenseTable();
            alert('支出记录添加成功！');
        }
    });

    // 产品选择自动填充价格
    document.getElementById('salesProduct').addEventListener('change', (e) => {
        const product = products.find(p => p.id === parseInt(e.target.value));
        if (product && product.suggested_price > 0) {
            document.getElementById('salesUnitPrice').value = product.suggested_price;
            calculateTotalAmount();
        }
    });

    // 数量和单价变化时计算总金额
    document.getElementById('salesQuantity').addEventListener('input', calculateTotalAmount);
    document.getElementById('salesUnitPrice').addEventListener('input', calculateTotalAmount);

    // 付款状态变化
    document.getElementById('salesPaymentStatus').addEventListener('change', (e) => {
        const paidAmountField = document.getElementById('salesPaidAmount');
        paidAmountField.disabled = e.target.value === '已付款';
        if (e.target.value === '已付款') {
            paidAmountField.value = document.getElementById('salesTotalAmount').value;
        } else if (e.target.value === '未付款') {
            paidAmountField.value = 0;
        }
    });

    // 筛选按钮
    document.getElementById('applySalesFilter').addEventListener('click', async () => {
        const filters = {
            customer_id: document.getElementById('salesFilterCustomer').value,
            product_id: document.getElementById('salesFilterProduct').value,
            payment_status: document.getElementById('salesFilterStatus').value,
            start_date: document.getElementById('salesFilterStartDate').value,
            end_date: document.getElementById('salesFilterEndDate').value
        };
        const filtered = await loadSales(filters);
        renderSalesTable(filtered);
    });

    document.getElementById('applyExpenseFilter').addEventListener('click', async () => {
        const filters = {
            category: document.getElementById('expenseFilterCategory').value,
            start_date: document.getElementById('expenseFilterStartDate').value,
            end_date: document.getElementById('expenseFilterEndDate').value
        };
        const filtered = await loadExpenses(filters);
        renderExpenseTable(filtered);
    });

    // 清除筛选
    document.getElementById('clearSalesFilter').addEventListener('click', async () => {
        document.getElementById('salesFilterCustomer').value = 'all';
        document.getElementById('salesFilterProduct').value = 'all';
        document.getElementById('salesFilterStatus').value = 'all';
        document.getElementById('salesFilterStartDate').value = '';
        document.getElementById('salesFilterEndDate').value = '';
        await renderSalesTable();
    });

    document.getElementById('clearExpenseFilter').addEventListener('click', async () => {
        document.getElementById('expenseFilterCategory').value = 'all';
        document.getElementById('expenseFilterStartDate').value = '';
        document.getElementById('expenseFilterEndDate').value = '';
        await renderExpenseTable();
    });

    // 生成报表按钮
    document.getElementById('generateReportBtn').addEventListener('click', async () => {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;

        if (!startDate || !endDate) {
            alert('请选择日期范围');
            return;
        }

        const reportData = await generateReport(startDate, endDate);
        renderReport(reportData);
    });

    // 导出数据按钮
    document.getElementById('exportDataBtn').addEventListener('click', async () => {
        const data = await exportAllData();
        downloadJSON(data, 'fish_bookkeeping_export.json');
        alert('数据导出成功！');
    });

    // 清空数据按钮
    document.getElementById('clearAllDataBtn').addEventListener('click', () => {
        if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
            localStorage.clear();
            location.reload();
        }
    });

    // 添加客户按钮
    document.getElementById('addCustomerBtn').addEventListener('click', () => {
        document.getElementById('customerModal').style.display = 'flex';
    });

    // 添加产品按钮
    document.getElementById('addProductBtn').addEventListener('click', () => {
        document.getElementById('productModal').style.display = 'flex';
    });

    // 关闭模态框
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });

    // 客户表单提交
    document.getElementById('customerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const customer = {
            name: document.getElementById('customerName').value,
            type: document.getElementById('customerType').value,
            phone: document.getElementById('customerPhone').value,
            address: document.getElementById('customerAddress').value
        };

        if (await addCustomer(customer)) {
            document.getElementById('customerForm').reset();
            document.getElementById('customerModal').style.display = 'none';
            await renderCustomerTable();
            alert('客户添加成功！');
        }
    });

    // 产品表单提交
    document.getElementById('productForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const product = {
            name: document.getElementById('productName').value,
            category: document.getElementById('productCategory').value,
            suggested_price: parseFloat(document.getElementById('productSuggestedPrice').value) || 0,
            supplier: document.getElementById('productSupplier').value,
            supplier_phone: document.getElementById('productSupplierPhone').value
        };

        if (await addProduct(product)) {
            document.getElementById('productForm').reset();
            document.getElementById('productModal').style.display = 'none';
            await renderProductTable();
            alert('产品添加成功！');
        }
    });
}

function calculateTotalAmount() {
    const quantity = parseFloat(document.getElementById('salesQuantity').value) || 0;
    const unitPrice = parseFloat(document.getElementById('salesUnitPrice').value) || 0;
    const total = quantity * unitPrice;
    document.getElementById('salesTotalAmount').value = total.toFixed(2);
}

// 更新仪表板
async function updateDashboard() {
    const data = await loadDashboardData();

    // 今日数据
    document.getElementById('todaySales').textContent = `¥${data.today.sales.toFixed(2)}`;
    document.getElementById('todaySalesCount').textContent = `${data.today.salesCount} 笔`;
    document.getElementById('todaySalesQuantity').textContent = `${data.today.salesQuantity.toFixed(1)} 斤`;
    document.getElementById('todayExpenses').textContent = `¥${data.today.expenses.toFixed(2)}`;
    document.getElementById('todayProfit').textContent = `¥${data.today.profit.toFixed(2)}`;

    // 本月数据
    document.getElementById('monthSales').textContent = `¥${data.month.sales.toFixed(2)}`;
    document.getElementById('monthSalesQuantity').textContent = `${data.month.salesQuantity.toFixed(1)} 斤`;
    document.getElementById('monthExpenses').textContent = `¥${data.month.expenses.toFixed(2)}`;
    document.getElementById('monthProfit').textContent = `¥${data.month.profit.toFixed(2)}`;
    document.getElementById('monthAvgPrice').textContent = `¥${data.month.avgPrice.toFixed(2)}`;

    // 绘制图表
    drawTrendChart(data.trend);
    drawProductSalesPie(data.productSales);
    drawExpenseBarChart(data.expenseByCategory);
    renderTopCustomers(data.topCustomers);
}

// 绘制销售趋势图
function drawTrendChart(trendData) {
    const canvas = document.getElementById('trendChart');
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
    const maxSales = Math.max(...trendData.map(d => d.total));
    const scale = maxSales > 0 ? chartHeight / maxSales : 1;

    // 绘制折线
    ctx.beginPath();
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;

    trendData.forEach((data, index) => {
        const x = padding + (index / (trendData.length - 1)) * chartWidth;
        const y = canvas.height - padding - data.total * scale;

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
        const y = canvas.height - padding - data.total * scale;

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#4CAF50';
        ctx.fill();
    });
}

// 绘制产品销售饼图
function drawProductSalesPie(productSales) {
    const canvas = document.getElementById('productSalesPie');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (productSales.length === 0) return;

    const total = productSales.reduce((sum, p) => sum + p.total, 0);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'];

    let startAngle = 0;
    productSales.forEach((product, index) => {
        const sliceAngle = (product.total / total) * 2 * Math.PI;
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
    const canvas = document.getElementById('expenseBarChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (expenseData.length === 0) return;

    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;

    const maxExpense = Math.max(...expenseData.map(e => e.total));
    const scale = maxExpense > 0 ? chartHeight / maxExpense : 1;

    const barWidth = chartWidth / expenseData.length - 10;

    const colors = ['#FF5722', '#FFC107', '#03A9F4', '#8BC34A', '#FF9800', '#E91E63'];

    expenseData.forEach((item, index) => {
        const x = padding + index * (barWidth + 10);
        const barHeight = item.total * scale;
        const y = canvas.height - padding - barHeight;

        ctx.fillStyle = colors[index % colors.length];
        ctx.fillRect(x, y, barWidth, barHeight);
    });
}

// 渲染客户排行榜
function renderTopCustomers(topCustomers) {
    const tbody = document.getElementById('topCustomersBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    topCustomers.forEach((customer, index) => {
        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${customer.name}</td>
                <td>¥${customer.total.toFixed(2)}</td>
            </tr>
        `;
    });
}

// 渲染销售表格
async function renderSalesTable(salesData = null) {
    if (salesData === null) {
        salesData = await loadSales();
    }

    const tbody = document.getElementById('salesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    salesData.forEach(sale => {
        const customer = customers.find(c => c.id === sale.customer_id);
        const product = products.find(p => p.id === sale.product_id);

        tbody.innerHTML += `
            <tr>
                <td>${sale.sale_date}</td>
                <td>${customer ? customer.name : '未知'}</td>
                <td>${product ? product.name : '未知'}</td>
                <td>${sale.quantity.toFixed(1)}</td>
                <td>¥${sale.unit_price.toFixed(2)}</td>
                <td>¥${sale.total_amount.toFixed(2)}</td>
                <td>${sale.payment_status}</td>
                <td>
                    <button class="btn-danger" onclick="deleteSaleById(${sale.id})">删除</button>
                </td>
            </tr>
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

    const tbody = document.getElementById('expenseTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    expensesData.forEach(expense => {
        tbody.innerHTML += `
            <tr>
                <td>${expense.expense_date}</td>
                <td>${expense.category}</td>
                <td>¥${expense.amount.toFixed(2)}</td>
                <td>${expense.description || '-'}</td>
                <td>${expense.payment_method || '-'}</td>
                <td>
                    <button class="btn-danger" onclick="deleteExpenseById(${expense.id})">删除</button>
                </td>
            </tr>
        `;
    });
}

// 渲染客户表格
async function renderCustomerTable() {
    await loadCustomers();
    const tbody = document.getElementById('customerTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    customers.forEach(customer => {
        tbody.innerHTML += `
            <tr>
                <td>${customer.name}</td>
                <td>${customer.type}</td>
                <td>${customer.phone || '-'}</td>
                <td>${customer.address || '-'}</td>
                <td>¥${customer.total_sales.toFixed(2)}</td>
                <td>¥${customer.total_debt.toFixed(2)}</td>
                <td>
                    <button class="btn-danger" onclick="deleteCustomerById(${customer.id})">删除</button>
                </td>
            </tr>
        `;
    });

    updateCustomerSelects();
}

// 渲染产品表格
async function renderProductTable() {
    await loadProducts();
    const tbody = document.getElementById('productTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    products.forEach(product => {
        tbody.innerHTML += `
            <tr>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>¥${product.suggested_price.toFixed(2)}</td>
                <td>${product.supplier || '-'}</td>
                <td>${product.total_quantity.toFixed(1)}</td>
                <td>¥${product.total_sales.toFixed(2)}</td>
                <td>
                    <button class="btn-danger" onclick="deleteProductById(${product.id})">删除</button>
                </td>
            </tr>
        `;
    });

    updateProductSelects();
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
    const reportSection = document.getElementById('reportSection');

    const productRows = reportData.productDetails.map(p => `
        <tr>
            <td>${p.name}</td>
            <td>${p.category}</td>
            <td>${p.quantity.toFixed(1)}</td>
            <td>¥${p.avg_price.toFixed(2)}</td>
            <td>¥${p.total.toFixed(2)}</td>
        </tr>
    `).join('');

    const customerRows = reportData.customerDetails.map(c => `
        <tr>
            <td>${c.name}</td>
            <td>${c.type}</td>
            <td>${c.count}</td>
            <td>¥${c.total.toFixed(2)}</td>
        </tr>
    `).join('');

    reportSection.innerHTML = `
        <h3>报表统计 (${reportData.period.start_date} ~ ${reportData.period.end_date})</h3>
        <div class="report-summary">
            <div class="summary-card">
                <h4>总销售额</h4>
                <p class="summary-value">¥${reportData.summary.total_sales.toFixed(2)}</p>
            </div>
            <div class="summary-card">
                <h4>总销量</h4>
                <p class="summary-value">${reportData.summary.total_quantity.toFixed(1)} 斤</p>
            </div>
            <div class="summary-card">
                <h4>销售笔数</h4>
                <p class="summary-value">${reportData.summary.sales_count} 笔</p>
            </div>
            <div class="summary-card">
                <h4>总支出</h4>
                <p class="summary-value">¥${reportData.summary.total_expenses.toFixed(2)}</p>
            </div>
            <div class="summary-card">
                <h4>净利润</h4>
                <p class="summary-value ${reportData.summary.net_profit >= 0 ? 'profit' : 'loss'}">
                    ¥${reportData.summary.net_profit.toFixed(2)}
                </p>
            </div>
            <div class="summary-card">
                <h4>平均单价</h4>
                <p class="summary-value">¥${reportData.summary.avgPrice.toFixed(2)}/斤</p>
            </div>
        </div>

        <h4>产品销售明细</h4>
        <table class="report-table">
            <thead>
                <tr>
                    <th>产品名称</th>
                    <th>分类</th>
                    <th>销量</th>
                    <th>平均单价</th>
                    <th>销售额</th>
                </tr>
            </thead>
            <tbody>${productRows}</tbody>
        </table>

        <h4>客户销售明细</h4>
        <table class="report-table">
            <thead>
                <tr>
                    <th>客户名称</th>
                    <th>类型</th>
                    <th>交易次数</th>
                    <th>总销售额</th>
                </tr>
            </thead>
            <tbody>${customerRows}</tbody>
        </table>
    `;

    reportSection.style.display = 'block';
    reportSection.scrollIntoView({ behavior: 'smooth' });
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
