# 后端数据库安装指南

本系统支持两种数据存储模式：
1. **本地存储模式**（默认）：使用浏览器 localStorage，无需安装后端
2. **数据库模式**：使用 SQLite 数据库 + Node.js 后端，数据更安全可靠

---

## 方法一：数据库模式（推荐）

### 🚀 快速启动（一键脚本）

如果您已安装 Node.js，直接运行启动脚本：

```bash
cd /home/zhoumeihua/wholesale_fish_bookkeeping
bash start_backend.sh
```

或使用中文脚本：

```bash
bash 启动后端服务.sh
```

脚本会自动：
- ✅ 检查 Node.js 环境
- ✅ 安装依赖包（首次）
- ✅ 启动后端服务

---

### 手动启动步骤

#### 1. 检查 Node.js 环境

```bash
node --version
npm --version
```

如果未安装，请先安装：

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install nodejs npm
```

**CentOS/RHEL:**
```bash
sudo yum install nodejs npm
```

或访问 [nodejs.org](https://nodejs.org/) 下载安装

#### 2. 安装依赖

### 2. 启动后端服务

```bash
npm start
```

服务将在 `http://localhost:3000` 启动

### 3. 修改前端配置

编辑 `index.html`，将 SCRIPT_FILE 改为 `'app-api.js'`：

```html
<script>
    const SCRIPT_FILE = 'app-api.js';  // 使用后端API
</script>
```

### 4. 访问应用

在浏览器中打开 `index.html` 文件，所有数据将通过后端API存储到SQLite数据库。

---

## 数据库特性

### 自动备份
- 每次启动服务时自动备份现有数据库
- 备份文件格式：`fish_bookkeeping_backup_YYYY-MM-DDTHH-MM-SS.db`

### 数据表结构

#### customers（客户表）
- id: 客户ID（自增主键）
- name: 客户名称（唯一）
- type: 客户类型（长期客户/批发商/零售客户/餐饮客户）
- phone: 联系电话
- address: 地址
- total_sales: 累计销售额
- total_debt: 累计欠款
- created_at/updated_at: 创建/更新时间

#### products（产品表）
- id: 产品ID（自增主键）
- name: 产品名称（唯一）
- category: 分类（鱼类/虾类/蟹类/贝类/软体类/其他）
- suggested_price: 建议单价
- supplier: 供应商
- supplier_phone: 供应商电话
- total_quantity: 累计销量
- total_sales: 累计销售额
- created_at/updated_at: 创建/更新时间

#### sales（销售表）
- id: 销售ID（自增主键）
- customer_id: 客户ID（外键）
- product_id: 产品ID（外键）
- quantity: 数量（斤）
- unit_price: 单价
- total_amount: 总金额
- payment_status: 付款状态（已付款/未付款/部分付款）
- paid_amount: 已付金额
- sale_date: 销售日期
- notes: 备注
- created_at/updated_at: 创建/更新时间

#### expenses（支出表）
- id: 支出ID（自增主键）
- category: 分类（薪资/车辆费用/油费/店面/水电/进货成本/运输费/包装费/其他）
- amount: 金额
- description: 描述
- payment_method: 支付方式
- expense_date: 支出日期
- created_at/updated_at: 创建/更新时间

### 性能优化
- 使用 WAL（Write-Ahead Logging）模式提高并发性能
- 建立索引加速查询
- 事务处理保证数据一致性

---

## API接口文档

### 基础地址
```
http://localhost:3000/api
```

### 健康检查
```
GET /health
```

### 客户管理
```
GET    /customers        # 获取所有客户
POST   /customers        # 添加客户
PUT    /customers/:id    # 更新客户
DELETE /customers/:id    # 删除客户
```

### 产品管理
```
GET    /products         # 获取所有产品
POST   /products         # 添加产品
PUT    /products/:id     # 更新产品
DELETE /products/:id     # 删除产品
```

### 销售管理
```
GET    /sales            # 获取销售记录（支持筛选参数）
POST   /sales            # 添加销售记录
PUT    /sales/:id        # 更新销售记录
DELETE /sales/:id        # 删除销售记录
```

### 支出管理
```
GET    /expenses         # 获取支出记录（支持筛选参数）
POST   /expenses         # 添加支出记录
PUT    /expenses/:id     # 更新支出记录
DELETE /expenses/:id     # 删除支出记录
```

### 统计分析
```
GET /dashboard           # 获取仪表板数据
GET /report              # 生成报表（需参数 start_date, end_date）
```

### 数据管理
```
GET /export              # 导出所有数据为JSON
```

---

## 方法二：本地存储模式（无需安装后端）

如果不想安装后端，可直接使用本地存储模式：

1. 编辑 `index.html`，将 SCRIPT_FILE 改为 `'app.js'`：

```html
<script>
    const SCRIPT_FILE = 'app.js';  // 使用本地存储
</script>
```

2. 直接在浏览器中打开 `index.html` 即可使用

### 优点
- 无需安装任何依赖
- 即开即用
- 数据保存在浏览器中

### 缺点
- 数据存储在浏览器中，换设备后数据不共享
- 清除浏览器缓存会丢失数据
- 不适合多用户协同工作

---

## 数据迁移

### 从本地存储迁移到数据库

1. 先使用 `app.js` 模式，点击"导出数据"按钮导出JSON文件
2. 启动后端服务，切换到 `app-api.js` 模式
3. 使用脚本导入数据（需要编写简单的导入脚本）

---

## 常见问题

### Q: 后端启动失败？
A: 检查端口3000是否被占用，或修改 `server.js` 中的 PORT 变量

### Q: 数据库文件在哪里？
A: 在项目根目录下：`fish_bookkeeping.db`

### Q: 如何备份数据库？
A: 每次启动会自动备份，或手动复制 `fish_bookkeeping.db` 文件

### Q: API调用失败？
A: 检查后端服务是否启动，以及 `app-api.js` 中的 `API_BASE_URL` 配置

---

## 生产环境部署

### 使用 PM2 守护进程

```bash
npm install -g pm2
pm2 start server.js --name fish-bookkeeping
pm2 save
pm2 startup
```

### 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        root /path/to/wholesale_fish_bookkeeping;
        index index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 技术栈

- **后端框架**: Express.js
- **数据库**: SQLite3
- **数据库驱动**: better-sqlite3
- **前端**: 纯 HTML/CSS/JavaScript（无需框架）

数据库文件可直接使用任何 SQLite 工具查看和编辑（如 DB Browser for SQLite）。
