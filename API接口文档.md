# 语音输入助手Chrome扩展 - API接口文档

## 📋 项目概述

语音输入助手是一个Chrome浏览器扩展，支持多种语音识别服务，为任意网页输入框提供语音输入功能。扩展支持火山引擎、阿里云、腾讯云、百度智能云、科大讯飞、华为云等主流语音识别服务。

## 🏗️ 系统架构

### 核心组件
- **content.js**: 内容脚本，负责DOM注入和语音识别控制
- **background.js**: 后台脚本，处理扩展生命周期和消息传递
- **popup.js**: 配置页面逻辑，处理用户配置和存储
- **manifest.json**: Chrome扩展配置文件（Manifest V3）

### 支持的语音识别服务
| 服务商 | 接口类型 | 认证方式 | 状态 |
|--------|----------|----------|------|
| 火山引擎 | WebSocket | APP ID + Access Token / Access Key | ✅ 完整支持 |
| 阿里云 | WebSocket | APP Key + Token | ✅ 支持 |
| 腾讯云 | WebSocket | Secret ID + Secret Key | ✅ 支持 |
| 百度智能云 | WebSocket | API Key + Secret Key | ✅ 支持 |
| 科大讯飞 | WebSocket | APP ID + API Secret | ✅ 支持 |
| 华为云 | WebSocket | 认证信息 | ✅ 支持 |
| 自定义接口 | WebSocket | 自定义认证 | ✅ 支持 |

## 🔌 API接口详解

### 1. WebSocket语音识别接口

#### 1.1 火山引擎语音识别

**主要接口地址：**
```
主接口: wss://openspeech.bytedance.com/api/v3/sauc/bigmodel (新双向流式，推荐)
备用接口: wss://openspeech.bytedance.com/ws/v1/stream
历史接口: wss://openspeech.bytedance.com/api/v2/sauc/bigmodel
         wss://openspeech.bytedance.com/api/v1/sauc/bigmodel
```

**🔥 重要更新：二进制WebSocket协议**

火山引擎已升级为二进制WebSocket协议，包含4字节消息头：
```
字节0: 协议版本 (0x01)
字节1: 消息类型 (0x01=FullClientRequest, 0x02=音频数据, 0x03=停止请求, 0x04=心跳)
字节2: 序列化方法 (0x00=原始数据, 0x01=JSON)
字节3: 保留位 (0x00)
```

**认证方式：**

**方式一：APP ID + Access Token（推荐）**
```
认证参数格式（URL参数）：
app_id={YOUR_APP_ID}&access_token={YOUR_ACCESS_TOKEN}&timestamp={TIMESTAMP}&nonce={NONCE}

示例：
app_id=7547060066&access_token=lIiI3tsagpi2Ynpm_qwbI1zPkKMctNZO&timestamp=1699123456789&nonce=abc123
```

**方式二：Access Key ID + Secret**
```
认证参数格式：
access_key_id={YOUR_ACCESS_KEY_ID}&access_key_secret={YOUR_ACCESS_KEY_SECRET}&timestamp={TIMESTAMP}&nonce={NONCE}

示例：
access_key_id=AK123456789&access_key_secret=SK987654321&timestamp=1699123456789&nonce=xyz789
```

**请求参数说明：**
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| app_id | string | 是（方式一） | 火山引擎APP ID |
| access_token | string | 是（方式一） | 访问令牌 |
| access_key_id | string | 是（方式二） | Access Key ID |
| access_key_secret | string | 是（方式二） | Access Key Secret |
| timestamp | number | 是 | 时间戳（毫秒） |
| nonce | string | 是 | 随机字符串 |

**音频格式要求：**
```
编码格式：opus
采样率：16000Hz
声道：单声道
位深度：16位
容器格式：WebM
数据分片：每250ms发送一次
```

**消息类型说明：**
| 消息类型 | 值 | 说明 |
|----------|-----|------|
| FullClientRequest | 0x01 | 初始连接请求 |
| 音频数据 | 0x02 | 音频流数据 |
| 停止请求 | 0x03 | 结束识别请求 |
| 心跳 | 0x04 | 保持连接心跳 |

**响应数据格式：**
```json
{
  "type": "final_result",
  "text": "识别出的文本内容",
  "confidence": 0.95,
  "timestamp": 1699123456789
}

{
  "type": "partial_result",
  "text": "部分识别结果",
  "timestamp": 1699123456789
}

{
  "type": "error",
  "error": {
    "code": 1001,
    "message": "认证失败"
  }
}
```

#### 1.2 其他云服务商接口

**阿里云语音识别：**
```
接口地址：wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1
认证参数：appkey={APPKEY}&token={TOKEN}
```

**腾讯云语音识别：**
```
接口地址：wss://asr.cloud.tencent.com/asr/v2/
认证参数：secret_id={SECRET_ID}&secret_key={SECRET_KEY}
```

**百度智能云语音识别：**
```
接口地址：wss://vop.baidu.com/realtime_asr
认证参数：api_key={API_KEY}&secret_key={SECRET_KEY}
```

**科大讯飞语音识别：**
```
接口地址：wss://iat-api.xfyun.cn/v2/iat
认证参数：app_id={APP_ID}&api_secret={API_SECRET}
```

### 2. Chrome扩展内部接口

#### 2.1 存储API

**配置存储结构：**
```javascript
{
  "modelType": "volcano",           // 模型类型
  "apiKey": "AK123456789",         // API密钥
  "apiSecret": "SK987654321",      // API密钥密钥
  "customApiUrl": "wss://...",     // 自定义接口地址
  "appId": "7547060066",           // APP ID
  "accessToken": "token123",       // 访问令牌
  "updatedAt": "2024-01-01T00:00:00.000Z"  // 更新时间
}
```

**存储操作：**
```javascript
// 保存配置
chrome.storage.local.set(config, callback);

// 读取配置
chrome.storage.local.get(['modelType', 'apiKey', 'apiSecret'], callback);

// 清除配置
chrome.storage.local.remove(['apiKey', 'apiSecret'], callback);
```

#### 2.2 消息传递接口

**后台脚本消息处理：**
```javascript
// 获取API配置
{
  "type": "GET_API_CONFIG"
}

// 响应格式
{
  "apiKey": "AK123456789",
  "apiSecret": "SK987654321"
}

// 检查权限
{
  "type": "CHECK_PERMISSIONS"
}

// 响应格式
{
  "microphone": "granted|prompt|denied",
  "hasStorage": true,
  "hasActiveTab": true
}
```

**内容脚本消息处理：**
```javascript
// 启动语音输入（右键菜单）
{
  "type": "START_VOICE_INPUT",
  "targetElement": elementId
}
```

#### 2.3 权限接口

**扩展权限要求：**
```json
{
  "permissions": [
    "activeTab",      // 访问当前标签页
    "scripting",      // 脚本注入
    "storage",        // 本地存储
    "contextMenus",   // 右键菜单
    "tabs"            // 标签页管理
  ],
  "host_permissions": [
    "https://openspeech.bytedance.com/*"  // 火山引擎域名访问
  ]
}
```

## 🔧 配置参数

### 3.1 模型配置

**支持的模型类型：**
```javascript
const MODEL_CONFIGS = {
  volcano: {
    name: '火山引擎语音识别',
    defaultUrl: 'wss://openspeech.bytedance.com/ws/v1/stream',
    authType: 'access_key'
  },
  custom: {
    name: '自定义模型接口',
    defaultUrl: '',
    authType: 'custom'
  }
};
```

### 3.2 音频录制配置

**录音参数：**
```javascript
{
  audio: {
    channelCount: 1,        // 单声道
    sampleRate: 16000,      // 16kHz采样率
    sampleSize: 16,         // 16位采样
    echoCancellation: true, // 回声消除
    noiseSuppression: true  // 噪声抑制
  }
}
```

**录音格式：**
```javascript
{
  mimeType: 'audio/webm;codecs=opus',  // Opus编码的WebM格式
  timeslice: 250                       // 每250ms发送一次数据
}
```

## 📊 错误处理

### 4.1 连接错误码

**WebSocket错误码：**
| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 1006 | 连接被异常关闭 | 检查认证参数、网络连接 |
| 1002 | 协议错误 | 检查WebSocket协议版本 |
| 1003 | 数据类型错误 | 检查音频数据格式 |

**认证错误：**
| 错误类型 | 说明 | 解决方案 |
|----------|------|----------|
| 401 | 认证失败 | 检查API密钥、APP ID、Access Token |
| 403 | 权限不足 | 检查服务是否启用、权限配置 |
| 404 | 接口不存在 | 检查接口地址是否正确 |

### 4.2 音频处理错误

**录音错误：**
```javascript
// 权限错误
NotAllowedError: 用户拒绝麦克风权限
NotFoundError: 未找到麦克风设备

// 处理方案
1. 引导用户授予麦克风权限
2. 检查设备连接状态
3. 提供友好的错误提示
```

## 🧪 测试工具

### 5.1 测试文件说明

**volcano_api_tester.html**: 火山引擎API专用测试器
- 支持多种认证方式测试
- 提供详细的连接诊断分析
- 支持批量测试不同端点

**debug_websocket.html**: 通用WebSocket调试工具
- 支持任意WebSocket接口测试
- 提供多种云服务商接口模板
- 实时日志显示和错误分析

**analyze_websocket_error.html**: WebSocket错误分析器
- 专门的错误诊断工具
- 提供解决方案建议

**check_config.html**: 配置检查工具
- 验证配置文件完整性
- 检查API参数格式

### 5.2 测试URL示例

**火山引擎测试URL：**
```
# 双向流式接口（推荐）
wss://openspeech.bytedance.com/api/v3/sauc/bigmodel?app_id=7547060066&access_token=lIiI3tsagpi2Ynpm_qwbI1zPkKMctNZO&timestamp=1699123456789&nonce=abc123

# 标准流式接口
wss://openspeech.bytedance.com/ws/v1/stream?access_key_id=AK123456789&access_key_secret=SK987654321&timestamp=1699123456789&nonce=xyz789
```

## 🔒 安全与隐私

### 6.1 数据安全

**API密钥存储：**
- 使用Chrome扩展的本地存储API
- 数据仅在用户设备本地保存
- 不会上传到任何服务器
- 支持配置导出/导入功能

**音频数据处理：**
- 音频数据直接发送到语音识别服务
- 不经过任何中间服务器
- 录音数据实时传输，不本地保存

### 6.2 权限管理

**最小权限原则：**
- 仅请求必要的Chrome扩展权限
- 麦克风权限需要用户明确授权
- 提供权限状态检查和错误处理

## 📚 相关资源

### 7.1 官方文档

**火山引擎语音识别：**
- [流式语音识别API文档](https://www.volcengine.com/docs/6561/79838)
- [WebSocket接口说明](https://www.volcengine.com/docs/6561/115174)

**其他云服务商：**
- 阿里云语音识别文档
- 腾讯云语音识别文档
- 百度智能云语音识别文档
- 科大讯飞语音识别文档

### 7.2 开发资源

**Chrome扩展开发：**
- [Manifest V3文档](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Extension API](https://developer.chrome.com/docs/extensions/reference/)

**WebSocket开发：**
- [WebSocket API文档](https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket)
- [WebSocket协议规范](https://tools.ietf.org/html/rfc6455)

## 🔧 部署与配置

### 8.1 扩展安装

1. 下载扩展源码
2. 打开Chrome浏览器的扩展管理页面 (`chrome://extensions/`)
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择扩展目录

### 8.2 API配置

1. 点击扩展图标打开配置页面
2. 选择语音识别服务商
3. 输入相应的API密钥和配置信息
4. 保存配置
5. 在任意网页的输入框中使用语音输入功能

### 8.3 故障排除

**常见问题：**
1. 麦克风权限未授权
2. API配置错误
3. 网络连接问题
4. 接口地址不可用

**解决方案：**
1. 使用内置的测试工具验证API连接
2. 检查浏览器控制台错误日志
3. 验证API密钥和配置信息
4. 尝试不同的接口地址

---

*本文档基于项目版本 v1.0.0 编写，更新时间：2024年1月*