# 腾讯云开发(CloudBase)集成说明

## 概述

本系统已集成腾讯云开发(CloudBase)云存储服务,可实现数据的云端备份和同步。

## 环境配置

### 1. 云开发环境ID

当前配置的环境ID: `6162-abc-8g2fdo0a0e77ed86-1255526316`

### 2. 腾讯云API密钥(可选)

如果需要在非云函数环境中访问云开发(如在本地服务器运行),需要配置腾讯云API密钥:

- **Secret ID**: 在 [腾讯云控制台](https://console.cloud.tencent.com/cam/capi) 获取
- **Secret Key**: 在 [腾讯云控制台](https://console.cloud.tencent.com/cam/capi) 获取

#### 配置方法

**方法一: 环境变量**
```bash
export TCB_SECRET_ID="your-secret-id"
export TCB_SECRET_KEY="your-secret-key"
npm start
```

**方法二: 直接修改配置文件**

编辑 `config.js` 文件,填入密钥:
```javascript
tcb: {
    env: '6162-abc-8g2fdo0a0e77ed86-1255526316',
    secretId: 'your-secret-id',
    secretKey: 'your-secret-key',
    // ...
}
```

> ⚠️ **注意**: 不要将密钥提交到代码仓库中!

## 安装依赖

安装云开发SDK依赖:

```bash
npm install
```

## 启动服务

```bash
npm start
```

## API接口

### 同步相关接口

#### 1. 全量同步到云端

```bash
POST /api/cloud/sync/all
```

将所有本地数据同步到云开发(会覆盖云端数据)

**响应示例:**
```json
{
  "success": true,
  "message": "全量同步成功",
  "syncTime": "2026-03-12T10:00:00.000Z"
}
```

#### 2. 增量同步到云端

```bash
POST /api/cloud/sync/incremental
```

只同步自上次同步以来新增或更新的数据

**响应示例:**
```json
{
  "success": true,
  "message": "增量同步成功",
  "syncTime": "2026-03-12T10:00:00.000Z"
}
```

#### 3. 获取同步状态

```bash
GET /api/cloud/sync/status
```

查看各个表的同步状态

**响应示例:**
```json
{
  "success": true,
  "data": {
    "lastSyncTime": "2026-03-12T10:00:00.000Z",
    "syncing": false,
    "cloudInitialized": true,
    "statuses": {
      "customers": {
        "table_name": "customers",
        "last_sync_time": "2026-03-12T10:00:00.000Z",
        "updated_at": "2026-03-12T10:00:00.000Z"
      }
      // ... 其他表的状态
    }
  }
}
```

#### 4. 从云端恢复数据

```bash
POST /api/cloud/restore/:tableName
```

从云开发恢复数据到本地数据库(会覆盖本地数据)

**参数说明:**
- `tableName`: 表名称,可选值: `customers`, `products`, `sales`, `expenses`, `monthly_expenses`, `inventory`, `change_logs`

**响应示例:**
```json
{
  "success": true,
  "message": "从云开发恢复 customers 成功",
  "count": 50
}
```

## 自动同步

系统默认开启自动同步功能,每30秒执行一次增量同步。

### 修改同步配置

编辑 `config.js` 文件:

```javascript
sync: {
    enabled: true,  // 是否启用自动同步
    interval: 30000,  // 同步间隔(毫秒),默认30秒
    batchSize: 100  // 批量上传数量
}
```

## 云数据库集合

系统会在云开发中创建以下集合:

| 集合名称 | 说明 |
|---------|------|
| customers | 客户数据 |
| products | 产品数据 |
| sales | 销售记录 |
| expenses | 支出记录 |
| monthly_expenses | 月度固定支出 |
| inventory | 库存数据 |
| change_logs | 变更日志 |
| sync_status | 同步状态 |

## 使用场景

### 场景1: 数据备份

定期执行全量同步,将本地数据备份到云端:

```bash
curl -X POST http://localhost:3000/api/cloud/sync/all
```

### 场景2: 多设备同步

在多个设备上使用同一环境ID,通过增量同步实现数据实时同步:

```bash
curl -X POST http://localhost:3000/api/cloud/sync/incremental
```

### 场景3: 数据恢复

当本地数据丢失或损坏时,从云端恢复:

```bash
curl -X POST http://localhost:3000/api/cloud/restore/customers
curl -X POST http://localhost:3000/api/cloud/restore/products
# ... 恢复其他表
```

## 故障排查

### 1. 初始化失败

**错误信息**: `❌ CloudBase初始化失败`

**解决方案**:
- 检查网络连接是否正常
- 确认环境ID是否正确
- 如果在本地运行,检查是否配置了API密钥

### 2. 权限错误

**错误信息**: `PERMISSION_DENIED`

**解决方案**:
- 检查API密钥是否有足够权限
- 确认环境ID对应的环境存在

### 3. 集合不存在

**错误信息**: `DATABASE_COLLECTION_NOT_EXIST`

**解决方案**:
- 系统会自动创建集合,稍后重试即可
- 或手动在云开发控制台创建集合

## 云开发控制台

访问 [腾讯云开发控制台](https://console.cloud.tencent.com/tcb) 可以:

- 查看和管理数据库
- 查看存储的文件
- 监控API调用
- 查看日志

## 注意事项

1. **数据安全**: 定期备份重要数据
2. **成本控制**: 注意云开发的免费配额和计费规则
3. **网络依赖**: 云同步功能需要网络连接
4. **密钥安全**: 不要将API密钥暴露在代码仓库中

## 技术支持

如有问题,请参考:
- [腾讯云开发官方文档](https://docs.cloudbase.net/)
- [Node.js SDK 文档](https://docs.cloudbase.net/api-reference/server/node-sdk.html)
