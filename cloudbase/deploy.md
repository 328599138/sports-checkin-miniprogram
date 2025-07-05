# 🚀 CloudBase云函数部署指南

## 📋 部署步骤

### 1. 准备工作
确保您已经：
- ✅ 开通了腾讯云CloudBase服务
- ✅ 创建了云开发环境
- ✅ 在微信开发者工具中配置了环境ID

### 2. 部署云函数

#### 方式一：使用微信开发者工具（推荐）

1. **打开微信开发者工具**
2. **右键点击 `cloudbase/functions/getOpenId` 目录**
3. **选择"创建并部署：云端安装依赖"**
4. **等待部署完成**

5. **重复步骤2-4，部署 `userManager` 云函数**

#### 方式二：使用命令行工具

```bash
# 安装CloudBase CLI
npm install -g @cloudbase/cli

# 登录腾讯云
tcb login

# 部署云函数
tcb functions:deploy getOpenId --dir ./cloudbase/functions/getOpenId
tcb functions:deploy userManager --dir ./cloudbase/functions/userManager
```

### 3. 验证部署

在微信开发者工具的"云开发"控制台中：
1. 点击"云函数"
2. 确认看到 `getOpenId` 和 `userManager` 两个函数
3. 点击函数名可以进行测试

### 4. 数据库权限设置

在云开发控制台 > 数据库 > `sports_checkin` 集合：
1. 点击"权限设置"
2. 选择"仅创建者可读写"
3. 保存设置

## 🔧 云函数功能说明

### getOpenId 云函数
- **功能**: 获取用户的微信openid
- **返回**: `{ openid, appid, unionid, env }`

### userManager 云函数
- **功能**: 统一处理用户相关操作
- **支持操作**:
  - `checkin`: 运动打卡
  - `checkToday`: 检查今日打卡状态
  - `getStats`: 获取统计数据
  - `getHistory`: 获取历史记录

## 🎯 使用示例

```javascript
// 获取openid
const openidResult = await wx.cloud.callFunction({
  name: 'getOpenId'
});

// 打卡
const checkinResult = await wx.cloud.callFunction({
  name: 'userManager',
  data: {
    action: 'checkin',
    data: {
      sportType: 'running',
      sportName: '跑步'
    }
  }
});

// 获取统计
const statsResult = await wx.cloud.callFunction({
  name: 'userManager',
  data: {
    action: 'getStats'
  }
});
```

## 🚨 注意事项

1. **首次部署**：可能需要等待几分钟云函数完全生效
2. **权限问题**：确保云函数有访问数据库的权限
3. **环境变量**：云函数会自动使用当前的云开发环境
4. **错误处理**：云函数内置了错误处理机制

## 🔍 故障排除

### 问题1：云函数调用失败
- 检查云函数是否部署成功
- 确认环境ID配置正确
- 查看云函数日志

### 问题2：数据库权限错误
- 确认数据库权限设置为"仅创建者可读写"
- 检查集合名称是否正确

### 问题3：openid获取失败
- 确认用户已授权小程序
- 检查云函数是否正常运行

## 📈 性能优化

- 云函数会自动处理并发请求
- 内置了数据库连接池
- 支持自动扩缩容
- 统计计算在云端完成，减少客户端压力 