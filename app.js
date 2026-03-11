// 数据存储
let sales = JSON.parse(localStorage.getItem('fish_sales')) || [];
let expenses = JSON.parse(localStorage.getItem('fish_expenses')) || [];
let customers = JSON.parse(localStorage.getItem('fish_customers')) || [];
let products = JSON.parse(localStorage.getItem('fish_products')) || [];

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeDateInputs();
    initializeSelectOptions();
    setupEventListeners();
    updateDashboard();
    renderSalesTable();
    renderExpenseTable();
    renderCustomerTable();
    renderProductTable();
    initializeReportDates();
});

// 初始化日期输入
function initializeDateInputs() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('salesDate').value = today;
    document.getElementById('expenseDate').value = today;
}

// 初始化下拉选项
function initializeSelectOptions() {
    updateCustomerSelects();
    updateProductSelects();
}

// 更新客户下拉列表
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

// 更新产品下拉列表
function updateProductSelects() {
    const salesProduct = document.getElementById('salesProduct');
    const salesFilterProduct = document.getElementById('salesFilterProduct');
    
    salesProduct.innerHTML = '<option value="">选择产品</option>';
    salesFilterProduct.innerHTML = '<option value="all">全部产品</option>';
    
    products.forEach(product => {
        salesProduct.innerHTML += `<option value="${product.id}" data-price="${product.suggestedPrice}">${product.name}</option>`;
        salesFilterProduct.innerHTML += `<option value="${product.id}">${product.name}</option>`;
    });
}

// 设置事件监听器
function setupEventListeners() {
    // 标签页切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            switchTab(tabId);
        });
    });

    // 销售表单自动计算
    document.getElementById('salesWeight').addEventListener('input', calculateSalesTotal);
    document.getElementById('salesPrice').addEventListener('input', calculateSalesTotal);
    document.getElementById('salesProduct').addEventListener('change', (e) => {
        const option = e.target.options[e.target.selectedIndex];
        if (option.dataset.price && option.dataset.price !== '0') {
            document.getElementById('salesPrice').value = option.dataset.price;
            calculateSalesTotal();
        }
    });

    // 表单提交
    document.getElementById('salesForm').addEventListener('submit', addSale);
    document.getElementById('expenseForm').addEventListener('submit', addExpense);
    document.getElementById('customerForm').addEventListener('submit', addCustomer);
    document.getElementById('productForm').addEventListener('submit', addProduct);
    document.getElementById('modalCustomerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        addCustomerFromModal();
    });
    document.getElementById('modalProductForm').addEventListener('submit', (e) => {
        e.preventDefault();
        addProductFromModal();
    });

    // 筛选器
    document.getElementById('salesFilterCustomer').addEventListener('change', renderSalesTable);
    document.getElementById('salesFilterProduct').addEventListener('change', renderSalesTable);
    document.getElementById('salesFilterStatus').addEventListener('change', renderSalesTable);
    document.getElementById('salesFilterDateStart').addEventListener('change', renderSalesTable);
    document.getElementById('salesFilterDateEnd').addEventListener('change', renderSalesTable);
    document.getElementById('expenseFilterCategory').addEventListener('change', renderExpenseTable);
    document.getElementById('expenseFilterDateStart').addEventListener('change', renderExpenseTable);
    document.getElementById('expenseFilterDateEnd').addEventListener('change', renderExpenseTable);

    // 模态框关闭
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal();
        }
    });
}

// 切换标签页
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');

    if (tabId === 'dashboard') {
        updateDashboard();
    }
}

// 计算销售总额
function calculateSalesTotal() {
    const weight = parseFloat(document.getElementById('salesWeight').value) || 0;
    const price = parseFloat(document.getElementById('salesPrice').value) || 0;
    const total = (weight * price).toFixed(2);
    document.getElementById('salesTotalAmount').value = `¥${total}`;
}

// 添加销售记录
function addSale(e) {
    e.preventDefault();

    const sale = {
        id: Date.now(),
        customerId: document.getElementById('salesCustomer').value,
        productId: document.getElementById('salesProduct').value,
        weight: parseFloat(document.getElementById('salesWeight').value),
        price: parseFloat(document.getElementById('salesPrice').value),
        total: parseFloat(document.getElementById('salesWeight').value) * parseFloat(document.getElementById('salesPrice').value),
        date: document.getElementById('salesDate').value,
        paymentStatus: document.getElementById('salesPaymentStatus').value,
        notes: document.getElementById('salesNotes').value
    };

    sales.unshift(sale);
    saveSales();
    renderSalesTable();
    updateDashboard();
    updateCustomerStats();
    updateProductStats();

    // 重置表单
    document.getElementById('salesWeight').value = '';
    document.getElementById('salesPrice').value = '';
    document.getElementById('salesTotalAmount').value = '';
    document.getElementById('salesNotes').value = '';
    initializeDateInputs();
}

// 添加支出记录
function addExpense(e) {
    e.preventDefault();

    const expense = {
        id: Date.now(),
        category: document.getElementById('expenseCategory').value,
        amount: parseFloat(document.getElementById('expenseAmount').value),
        date: document.getElementById('expenseDate').value,
        paymentMethod: document.getElementById('expensePaymentMethod').value,
        notes: document.getElementById('expenseNotes').value
    };

    expenses.unshift(expense);
    saveExpenses();
    renderExpenseTable();
    updateDashboard();

    // 重置表单
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseNotes').value = '';
    initializeDateInputs();
}

// 添加客户
function addCustomer(e) {
    e.preventDefault();

    const customer = {
        id: Date.now(),
        name: document.getElementById('customerName').value,
        phone: document.getElementById('customerPhone').value,
        address: document.getElementById('customerAddress').value,
        type: document.getElementById('customerType').value,
        totalSales: 0,
        totalDebt: 0
    };

    customers.push(customer);
    saveCustomers();
    renderCustomerTable();
    updateCustomerSelects();

    // 重置表单
    document.getElementById('customerForm').reset();
}

// 添加产品
function addProduct(e) {
    e.preventDefault();

    const product = {
        id: Date.now(),
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        suggestedPrice: parseFloat(document.getElementById('productPrice').value) || 0,
        supplier: document.getElementById('productSupplier').value,
        totalSales: 0,
        totalWeight: 0
    };

    products.push(product);
    saveProducts();
    renderProductTable();
    updateProductSelects();

    // 重置表单
    document.getElementById('productForm').reset();
}

// 从模态框添加客户
function addCustomerFromModal() {
    const customer = {
        id: Date.now(),
        name: document.getElementById('modalCustomerName').value,
        phone: document.getElementById('modalCustomerPhone').value,
        address: document.getElementById('modalCustomerAddress').value,
        type: document.getElementById('modalCustomerType').value,
        totalSales: 0,
        totalDebt: 0
    };

    customers.push(customer);
    saveCustomers();
    renderCustomerTable();
    updateCustomerSelects();

    // 更新销售表单的客户选择
    document.getElementById('salesCustomer').value = customer.id;
    
    closeModal();
}

// 从模态框添加产品
function addProductFromModal() {
    const product = {
        id: Date.now(),
        name: document.getElementById('modalProductName').value,
        category: document.getElementById('modalProductCategory').value,
        suggestedPrice: parseFloat(document.getElementById('modalProductPrice').value) || 0,
        supplier: document.getElementById('modalProductSupplier').value,
        totalSales: 0,
        totalWeight: 0
    };

    products.push(product);
    saveProducts();
    renderProductTable();
    updateProductSelects();

    // 更新销售表单的产品选择
    document.getElementById('salesProduct').value = product.id;
    if (product.suggestedPrice) {
        document.getElementById('salesPrice').value = product.suggestedPrice;
        calculateSalesTotal();
    }
    
    closeModal();
}

// 更新数据看板
function updateDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);

    // 今日数据
    const todaySales = sales.filter(s => s.date === today);
    const todayExpenses = expenses.filter(e => e.date === today);
    
    const todayTotalSales = todaySales.reduce((sum, s) => sum + s.total, 0);
    const todayTotalExpense = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
    const todayProfit = todayTotalSales - todayTotalExpense;

    // 本月数据
    const monthSales = sales.filter(s => s.date.startsWith(currentMonth));
    const monthExpenses = expenses.filter(e => e.date.startsWith(currentMonth));
    
    const monthTotalSales = monthSales.reduce((sum, s) => sum + s.total, 0);
    const monthTotalExpense = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const monthTotalWeight = monthSales.reduce((sum, s) => sum + s.weight, 0);
    const avgPrice = monthTotalWeight > 0 ? (monthTotalSales / monthTotalWeight).toFixed(2) : 0;

    document.getElementById('todaySales').textContent = `¥${todayTotalSales.toFixed(2)}`;
    document.getElementById('todayOrders').textContent = todaySales.length;
    document.getElementById('todayExpense').textContent = `¥${todayTotalExpense.toFixed(2)}`;
    document.getElementById('todayProfit').textContent = `¥${todayProfit.toFixed(2)}`;
    document.getElementById('monthSales').textContent = `¥${monthTotalSales.toFixed(2)}`;
    document.getElementById('monthExpense').textContent = `¥${monthTotalExpense.toFixed(2)}`;
    document.getElementById('monthWeight').textContent = `${monthTotalWeight.toFixed(1)} 斤`;
    document.getElementById('avgPrice').textContent = avgPrice;

    // 更新图表
    updateCharts();
}

// 更新图表
function updateCharts() {
    drawSalesTrendChart();
    drawProductPieChart();
    drawExpensePieChart();
    drawCustomerBarChart();
}

// 绘制销售趋势图
function drawSalesTrendChart() {
    const canvas = document.getElementById('salesTrendChart');
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = 300;

    const last7Days = [];
    const salesData = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        last7Days.push(dateStr.slice(5)); // MM-DD
        
        const daySales = sales
            .filter(s => s.date === dateStr)
            .reduce((sum, s) => sum + s.total, 0);
        salesData.push(daySales);
    }

    const maxSales = Math.max(...salesData, 100);
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;

    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制网格
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
    }

    // 绘制折线
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    salesData.forEach((value, index) => {
        const x = padding + (chartWidth / 6) * index;
        const y = padding + chartHeight - (value / maxSales) * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();

    // 绘制数据点和标签
    salesData.forEach((value, index) => {
        const x = padding + (chartWidth / 6) * index;
        const y = padding + chartHeight - (value / maxSales) * chartHeight;
        
        // 数据点
        ctx.fillStyle = '#667eea';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // 日期标签
        ctx.fillStyle = '#64748b';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(last7Days[index], x, canvas.height - 10);
        
        // 数值标签
        ctx.fillStyle = '#1e293b';
        ctx.fillText(`¥${value.toFixed(0)}`, x, y - 15);
    });
}

// 绘制产品饼图
function drawProductPieChart() {
    const canvas = document.getElementById('productPieChart');
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = 300;

    const productSales = {};
    sales.forEach(sale => {
        const product = products.find(p => p.id === sale.productId);
        if (product) {
            if (productSales[product.name]) {
                productSales[product.name] += sale.total;
            } else {
                productSales[product.name] = sale.total;
            }
        }
    });

    const productNames = Object.keys(productSales);
    const salesValues = Object.values(productSales);
    const total = salesValues.reduce((sum, v) => sum + v, 0);

    if (total === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('暂无销售数据', canvas.width / 2, canvas.height / 2);
        return;
    }

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 80;

    const colors = ['#667eea', '#764ba2', '#4ade80', '#f87171', '#60a5fa', '#fbbf24', '#f472b6', '#34d399'];
    
    let startAngle = -Math.PI / 2;

    salesValues.forEach((value, index) => {
        const sliceAngle = (value / total) * 2 * Math.PI;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = colors[index % colors.length];
        ctx.fill();

        startAngle += sliceAngle;
    });

    // 中心圆
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.5, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('产品', centerX, centerY - 10);
    ctx.fillText('销售', centerX, centerY + 15);
}

// 绘制支出饼图
function drawExpensePieChart() {
    const canvas = document.getElementById('expensePieChart');
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = 300;

    const expenseCategories = {};
    expenses.forEach(expense => {
        if (expenseCategories[expense.category]) {
            expenseCategories[expense.category] += expense.amount;
        } else {
            expenseCategories[expense.category] = expense.amount;
        }
    });

    const categoryNames = Object.keys(expenseCategories);
    const expenseValues = Object.values(expenseCategories);
    const total = expenseValues.reduce((sum, v) => sum + v, 0);

    if (total === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('暂无支出数据', canvas.width / 2, canvas.height / 2);
        return;
    }

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 80;

    const colors = ['#667eea', '#764ba2', '#4ade80', '#f87171', '#60a5fa', '#fbbf24', '#f472b6', '#34d399'];
    
    let startAngle = -Math.PI / 2;

    expenseValues.forEach((value, index) => {
        const sliceAngle = (value / total) * 2 * Math.PI;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = colors[index % colors.length];
        ctx.fill();

        startAngle += sliceAngle;
    });

    // 中心圆
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.5, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('支出', centerX, centerY - 10);
    ctx.fillText('分类', centerX, centerY + 15);
}

// 绘制客户柱状图
function drawCustomerBarChart() {
    const canvas = document.getElementById('customerBarChart');
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = 300;

    const customerSales = {};
    sales.forEach(sale => {
        const customer = customers.find(c => c.id === sale.customerId);
        if (customer) {
            if (customerSales[customer.name]) {
                customerSales[customer.name] += sale.total;
            } else {
                customerSales[customer.name] = sale.total;
            }
        }
    });

    const sortedCustomers = Object.entries(customerSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (sortedCustomers.length === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('暂无客户数据', canvas.width / 2, canvas.height / 2);
        return;
    }

    const maxSales = Math.max(...sortedCustomers.map(c => c[1]));
    const padding = 60;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const barWidth = chartWidth / sortedCustomers.length - 20;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    sortedCustomers.forEach((customer, index) => {
        const x = padding + (chartWidth / sortedCustomers.length) * index + 10;
        const barHeight = (customer[1] / maxSales) * chartHeight;
        const y = padding + chartHeight - barHeight;

        // 绘制柱子
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);

        // 客户名称
        ctx.fillStyle = '#64748b';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(customer[0].slice(0, 4), x + barWidth / 2, canvas.height - 10);

        // 金额
        ctx.fillStyle = '#1e293b';
        ctx.fillText(`¥${customer[1].toFixed(0)}`, x + barWidth / 2, y - 5);
    });
}

// 渲染销售表格
function renderSalesTable() {
    const filterCustomer = document.getElementById('salesFilterCustomer').value;
    const filterProduct = document.getElementById('salesFilterProduct').value;
    const filterStatus = document.getElementById('salesFilterStatus').value;
    const filterDateStart = document.getElementById('salesFilterDateStart').value;
    const filterDateEnd = document.getElementById('salesFilterDateEnd').value;

    let filteredSales = sales.filter(sale => {
        if (filterCustomer !== 'all' && sale.customerId !== filterCustomer) return false;
        if (filterProduct !== 'all' && sale.productId !== filterProduct) return false;
        if (filterStatus !== 'all' && sale.paymentStatus !== filterStatus) return false;
        if (filterDateStart && sale.date < filterDateStart) return false;
        if (filterDateEnd && sale.date > filterDateEnd) return false;
        return true;
    });

    const tbody = document.getElementById('salesTableBody');
    
    if (filteredSales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-message">暂无销售记录</td></tr>';
        return;
    }

    tbody.innerHTML = filteredSales.map(sale => {
        const customer = customers.find(c => c.id === sale.customerId);
        const product = products.find(p => p.id === sale.productId);
        const statusClass = `status-${sale.paymentStatus}`;
        const statusText = { paid: '已付款', unpaid: '未付款', partial: '部分付款' }[sale.paymentStatus];

        return `
            <tr>
                <td>${sale.date}</td>
                <td>${customer ? customer.name : '未知'}</td>
                <td>${product ? product.name : '未知'}</td>
                <td>${sale.weight.toFixed(1)}</td>
                <td>¥${sale.price.toFixed(2)}</td>
                <td>¥${sale.total.toFixed(2)}</td>
                <td class="${statusClass}">${statusText}</td>
                <td>${sale.notes || '-'}</td>
                <td>
                    <button class="btn-action btn-delete" onclick="deleteSale(${sale.id})">删除</button>
                </td>
            </tr>
        `;
    }).join('');
}

// 渲染支出表格
function renderExpenseTable() {
    const filterCategory = document.getElementById('expenseFilterCategory').value;
    const filterDateStart = document.getElementById('expenseFilterDateStart').value;
    const filterDateEnd = document.getElementById('expenseFilterDateEnd').value;

    let filteredExpenses = expenses.filter(expense => {
        if (filterCategory !== 'all' && expense.category !== filterCategory) return false;
        if (filterDateStart && expense.date < filterDateStart) return false;
        if (filterDateEnd && expense.date > filterDateEnd) return false;
        return true;
    });

    const tbody = document.getElementById('expenseTableBody');
    
    if (filteredExpenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-message">暂无支出记录</td></tr>';
        return;
    }

    tbody.innerHTML = filteredExpenses.map(expense => `
        <tr>
            <td>${expense.date}</td>
            <td>${expense.category}</td>
            <td>¥${expense.amount.toFixed(2)}</td>
            <td>${expense.paymentMethod}</td>
            <td>${expense.notes || '-'}</td>
            <td>
                <button class="btn-action btn-delete" onclick="deleteExpense(${expense.id})">删除</button>
            </td>
        </tr>
    `).join('');
}

// 渲染客户表格
function renderCustomerTable() {
    const tbody = document.getElementById('customerTableBody');
    
    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-message">暂无客户</td></tr>';
        return;
    }

    tbody.innerHTML = customers.map(customer => {
        const typeText = {
            regular: '长期客户',
            wholesale: '批发商',
            retail: '零售客户',
            restaurant: '餐饮客户'
        }[customer.type];

        return `
            <tr>
                <td>${customer.name}</td>
                <td>${customer.phone || '-'}</td>
                <td>${customer.address || '-'}</td>
                <td>${typeText}</td>
                <td>¥${customer.totalSales.toFixed(2)}</td>
                <td>¥${customer.totalDebt.toFixed(2)}</td>
                <td>
                    <button class="btn-action btn-delete" onclick="deleteCustomer(${customer.id})">删除</button>
                </td>
            </tr>
        `;
    }).join('');
}

// 渲染产品表格
function renderProductTable() {
    const tbody = document.getElementById('productTableBody');
    
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-message">暂无产品</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(product => `
        <tr>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>¥${product.suggestedPrice.toFixed(2)}</td>
            <td>${product.supplier || '-'}</td>
            <td>${product.totalWeight.toFixed(1)} 斤</td>
            <td>¥${product.totalSales.toFixed(2)}</td>
            <td>
                <button class="btn-action btn-delete" onclick="deleteProduct(${product.id})">删除</button>
            </td>
        </tr>
    `).join('');
}

// 更新客户统计
function updateCustomerStats() {
    customers.forEach(customer => {
        const customerSales = sales.filter(s => s.customerId === customer.id);
        customer.totalSales = customerSales.reduce((sum, s) => sum + s.total, 0);
        customer.totalDebt = customerSales
            .filter(s => s.paymentStatus !== 'paid')
            .reduce((sum, s) => sum + s.total, 0);
    });
    saveCustomers();
}

// 更新产品统计
function updateProductStats() {
    products.forEach(product => {
        const productSales = sales.filter(s => s.productId === product.id);
        product.totalWeight = productSales.reduce((sum, s) => sum + s.weight, 0);
        product.totalSales = productSales.reduce((sum, s) => sum + s.total, 0);
    });
    saveProducts();
}

// 删除销售记录
function deleteSale(id) {
    if (confirm('确定要删除这条销售记录吗？')) {
        sales = sales.filter(s => s.id !== id);
        saveSales();
        renderSalesTable();
        updateDashboard();
        updateCustomerStats();
        updateProductStats();
    }
}

// 删除支出记录
function deleteExpense(id) {
    if (confirm('确定要删除这条支出记录吗？')) {
        expenses = expenses.filter(e => e.id !== id);
        saveExpenses();
        renderExpenseTable();
        updateDashboard();
    }
}

// 删除客户
function deleteCustomer(id) {
    if (confirm('确定要删除这个客户吗？')) {
        customers = customers.filter(c => c.id !== id);
        saveCustomers();
        renderCustomerTable();
        updateCustomerSelects();
    }
}

// 删除产品
function deleteProduct(id) {
    if (confirm('确定要删除这个产品吗？')) {
        products = products.filter(p => p.id !== id);
        saveProducts();
        renderProductTable();
        updateProductSelects();
    }
}

// 清除销售筛选
function clearSalesFilters() {
    document.getElementById('salesFilterCustomer').value = 'all';
    document.getElementById('salesFilterProduct').value = 'all';
    document.getElementById('salesFilterStatus').value = 'all';
    document.getElementById('salesFilterDateStart').value = '';
    document.getElementById('salesFilterDateEnd').value = '';
    renderSalesTable();
}

// 清除支出筛选
function clearExpenseFilters() {
    document.getElementById('expenseFilterCategory').value = 'all';
    document.getElementById('expenseFilterDateStart').value = '';
    document.getElementById('expenseFilterDateEnd').value = '';
    renderExpenseTable();
}

// 初始化报表日期
function initializeReportDates() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    document.getElementById('reportStartDate').value = firstDay.toISOString().split('T')[0];
    document.getElementById('reportEndDate').value = today.toISOString().split('T')[0];
}

// 生成报表
function generateReport() {
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;

    const reportSales = sales.filter(s => s.date >= startDate && s.date <= endDate);
    const reportExpenses = expenses.filter(e => e.date >= startDate && e.date <= endDate);

    const totalSales = reportSales.reduce((sum, s) => sum + s.total, 0);
    const totalWeight = reportSales.reduce((sum, s) => sum + s.weight, 0);
    const totalExpense = reportExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalSales - totalExpense;
    const avgPrice = totalWeight > 0 ? (totalSales / totalWeight).toFixed(2) : 0;

    document.getElementById('reportTotalSales').textContent = `¥${totalSales.toFixed(2)}`;
    document.getElementById('reportTotalWeight').textContent = `${totalWeight.toFixed(1)} 斤`;
    document.getElementById('reportTotalExpense').textContent = `¥${totalExpense.toFixed(2)}`;
    document.getElementById('reportNetProfit').textContent = `¥${netProfit.toFixed(2)}`;
    document.getElementById('reportAvgPrice').textContent = `¥${avgPrice}/斤`;
    document.getElementById('reportOrderCount').textContent = `${reportSales.length} 笔`;

    // 绘制报表图表
    drawReportProductChart(reportSales);
    drawReportCustomerChart(reportSales);
}

// 绘制报表产品图表
function drawReportProductChart(reportSales) {
    const canvas = document.getElementById('reportProductChart');
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = 300;

    const productSales = {};
    reportSales.forEach(sale => {
        const product = products.find(p => p.id === sale.productId);
        if (product) {
            if (productSales[product.name]) {
                productSales[product.name] += sale.total;
            } else {
                productSales[product.name] = sale.total;
            }
        }
    });

    const sortedProducts = Object.entries(productSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    if (sortedProducts.length === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', canvas.width / 2, canvas.height / 2);
        return;
    }

    const maxSales = Math.max(...sortedProducts.map(p => p[1]));
    const padding = 60;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const barWidth = chartWidth / sortedProducts.length - 15;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    sortedProducts.forEach((product, index) => {
        const x = padding + (chartWidth / sortedProducts.length) * index + 7;
        const barHeight = (product[1] / maxSales) * chartHeight;
        const y = padding + chartHeight - barHeight;

        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, '#4ade80');
        gradient.addColorStop(1, '#22c55e');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);

        ctx.fillStyle = '#64748b';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(product[0].slice(0, 5), x + barWidth / 2, canvas.height - 10);

        ctx.fillStyle = '#1e293b';
        ctx.fillText(`¥${product[1].toFixed(0)}`, x + barWidth / 2, y - 5);
    });
}

// 绘制报表客户图表
function drawReportCustomerChart(reportSales) {
    const canvas = document.getElementById('reportCustomerChart');
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = 300;

    const customerSales = {};
    reportSales.forEach(sale => {
        const customer = customers.find(c => c.id === sale.customerId);
        if (customer) {
            if (customerSales[customer.name]) {
                customerSales[customer.name] += sale.total;
            } else {
                customerSales[customer.name] = sale.total;
            }
        }
    });

    const sortedCustomers = Object.entries(customerSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (sortedCustomers.length === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', canvas.width / 2, canvas.height / 2);
        return;
    }

    const maxSales = Math.max(...sortedCustomers.map(c => c[1]));
    const padding = 60;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const barWidth = chartWidth / sortedCustomers.length - 20;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    sortedCustomers.forEach((customer, index) => {
        const x = padding + (chartWidth / sortedCustomers.length) * index + 10;
        const barHeight = (customer[1] / maxSales) * chartHeight;
        const y = padding + chartHeight - barHeight;

        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);

        ctx.fillStyle = '#64748b';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(customer[0].slice(0, 4), x + barWidth / 2, canvas.height - 10);

        ctx.fillStyle = '#1e293b';
        ctx.fillText(`¥${customer[1].toFixed(0)}`, x + barWidth / 2, y - 5);
    });
}

// 导出报表
function exportReport() {
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;

    const reportSales = sales.filter(s => s.date >= startDate && s.date <= endDate);
    const reportExpenses = expenses.filter(e => e.date >= startDate && e.date <= endDate);

    const csvContent = [
        ['水产批发报表', '', '', ''],
        ['', '', '', ''],
        ['日期范围:', startDate, '至', endDate],
        ['', '', '', ''],
        ['销售记录', '', '', ''],
        ['日期', '客户', '产品', '斤数', '单价', '金额', '状态'],
        ...reportSales.map(s => {
            const customer = customers.find(c => c.id === s.customerId);
            const product = products.find(p => p.id === s.productId);
            return [
                s.date,
                customer ? customer.name : '未知',
                product ? product.name : '未知',
                s.weight.toFixed(1),
                s.price.toFixed(2),
                s.total.toFixed(2),
                s.paymentStatus
            ];
        }),
        ['', '', '', ''],
        ['支出记录', '', '', ''],
        ['日期', '分类', '金额', '支付方式', '备注'],
        ...reportExpenses.map(e => [e.date, e.category, e.amount.toFixed(2), e.paymentMethod, e.notes]),
        ['', '', '', ''],
        ['汇总', '', '', ''],
        ['总销售额', reportSales.reduce((sum, s) => sum + s.total, 0).toFixed(2)],
        ['总销量', reportSales.reduce((sum, s) => sum + s.weight, 0).toFixed(1)],
        ['总支出', reportExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)],
        ['净利润', (reportSales.reduce((sum, s) => sum + s.total, 0) - reportExpenses.reduce((sum, e) => sum + e.amount, 0)).toFixed(2)]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `水产报表_${startDate}_${endDate}.csv`;
    link.click();
}

// 模态框操作
function openCustomerModal() {
    document.getElementById('customerModal').style.display = 'block';
}

function openProductModal() {
    document.getElementById('productModal').style.display = 'block';
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// 数据持久化
function saveSales() {
    localStorage.setItem('fish_sales', JSON.stringify(sales));
}

function saveExpenses() {
    localStorage.setItem('fish_expenses', JSON.stringify(expenses));
}

function saveCustomers() {
    localStorage.setItem('fish_customers', JSON.stringify(customers));
}

function saveProducts() {
    localStorage.setItem('fish_products', JSON.stringify(products));
}

// 窗口大小改变时重绘图表
window.addEventListener('resize', () => {
    updateCharts();
});

// 辅助函数
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
