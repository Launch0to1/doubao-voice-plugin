# 🔊 语音输入助手

一个基于Chrome扩展的语音输入工具，支持多种国内语音识别API，为任意网页输入框提供语音输入功能。

## ✨ 功能特点

- 🎯 **智能检测**: 自动检测网页中的输入框（input、textarea、contenteditable）
- 🎤 **一键录音**: 点击麦克风图标即可开始语音输入
- ⚡ **实时识别**: 集成多种国内语音识别API，实时转换语音为文字
- 🔧 **多模型支持**: 支持火山引擎、阿里云、腾讯云、百度智能云、科大讯飞、华为云等
- 🔒 **安全存储**: API密钥本地加密存储，不会上传到任何服务器
- 🌐 **全站支持**: 支持所有网站的输入框
- 🎨 **美观界面**: 现代化的UI设计，支持深色模式
- ⚙️ **灵活配置**: 支持自定义模型接口，可配置APP ID和Access Token

## 🚀 安装使用

### 1. 下载扩展
1. 克隆或下载本项目到本地
2. 确保所有文件都在同一目录下

### 2. 安装图标
1. 打开 `icons/create_icons.html` 文件
2. 右键点击图标，选择"图片另存为"
3. 保存到 `icons/` 文件夹中，文件名分别为：
   - `mic16.png` (16x16像素)
   - `mic48.png` (48x48像素)
   - `mic128.png` (128x128像素)

### 3. 加载扩展到Chrome
1. 打开Chrome浏览器，访问 `chrome://extensions/`
2. 开启右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择本项目文件夹
5. 扩展安装完成！

### 4. 配置API密钥
1. 点击浏览器工具栏上的扩展图标
2. 选择您要使用的语音识别模型（火山引擎、阿里云、腾讯云等）
3. 输入相应的API密钥信息：
   - **火山引擎**: AccessKey ID 和 AccessKey Secret
   - **自定义模型**: 接口地址、APP ID、Access Token
4. 点击"保存"按钮

#### 🔧 自定义模型配置示例
如果您使用您提到的接口：
- **接口地址**: `wss://openspeech.bytedance.com/api/v3/sauc/bigmodel`
- **APP ID**: `7547060066`
- **Access Token**: `lIiI3tsagpi2Ynpm_qwbI1zPkKMctNZO`

## 🔑 获取API密钥

### 火山引擎
1. 访问 [火山引擎控制台](https://console.volcengine.com/)
2. 注册/登录账号
3. 进入"访问控制" -> "访问密钥"
4. 创建新的AccessKey，获取AccessKey ID和AccessKey Secret

### 阿里云
1. 访问 [阿里云智能语音交互控制台](https://ai.aliyun.com/nls/)
2. 注册/登录账号
3. 创建项目，获取Appkey和AccessKey

### 腾讯云
1. 访问 [腾讯云语音识别控制台](https://console.cloud.tencent.com/asr)
2. 注册/登录账号
3. 获取SecretId和SecretKey

### 百度智能云
1. 访问 [百度智能云控制台](https://console.bce.baidu.com/ai/)
2. 注册/登录账号
3. 创建应用，获取API Key和Secret Key

### 科大讯飞
1. 访问 [科大讯飞开放平台](https://www.xfyun.cn/services/lfasr)
2. 注册/登录账号
3. 创建应用，获取APPID和APISecret

### 华为云
1. 访问 [华为云语音交互服务控制台](https://console.huaweicloud.com/sis/)
2. 注册/登录账号
3. 获取项目ID和认证信息

## 📖 使用说明

### 基本使用
1. 在任意网页的输入框中点击，使其获得焦点
2. 输入框右侧会出现麦克风图标 🎤
3. 点击麦克风图标开始录音
4. 对着麦克风说话，识别结果会实时显示在输入框中
5. 再次点击麦克风图标或停止说话结束录音

### 高级功能
- **右键菜单**: 在输入框中右键选择"使用语音输入"
- **快捷键**: 支持自定义快捷键（需要在Chrome扩展管理中设置）
- **多语言**: 支持中文、英文等多种语言识别

## 🛠️ 技术架构

```
speech-input-extension/
├── manifest.json          # 扩展配置文件
├── content.js             # 内容脚本（核心逻辑）
├── popup.html             # 配置界面
├── popup.js               # 配置逻辑
├── background.js          # 后台脚本
├── icons/                 # 图标文件
│   ├── create_icons.html  # 图标生成器
│   ├── mic16.png         # 16x16图标
│   ├── mic48.png         # 48x48图标
│   └── mic128.png        # 128x128图标
└── README.md             # 说明文档
```

## 🔧 开发说明

### 核心功能
- **DOM注入**: 自动检测输入框并注入麦克风按钮
- **音频处理**: 使用Web Audio API处理麦克风输入
- **WebSocket通信**: 与火山引擎实时语音识别API通信
- **本地存储**: 使用chrome.storage.local安全存储API密钥

### API集成
- **接口地址**: `wss://openspeech.bytedance.com/ws/v1/stream`
- **认证方式**: AccessKey ID + AccessKey Secret
- **音频格式**: WebM/Opus, 16kHz采样率
- **识别模式**: 实时流式识别

## 🚨 注意事项

1. **隐私安全**: API密钥仅存储在本地，不会上传到任何服务器
2. **网络要求**: 需要稳定的网络连接才能正常使用语音识别
3. **浏览器权限**: 需要麦克风权限才能录音（首次使用时会自动请求权限）
4. **API限制**: 注意各服务商API的调用频率和用量限制
5. **Manifest V3**: 本扩展基于Chrome Manifest V3开发，确保使用最新版Chrome浏览器

## 🐛 常见问题

### Q: 麦克风图标不显示？
A: 请检查：
- 扩展是否正确安装
- 网页是否完全加载
- 输入框是否获得焦点

### Q: 语音识别不准确？
A: 建议：
- 确保网络连接稳定
- 说话清晰，避免背景噪音
- 检查麦克风设备是否正常

### Q: API连接失败？
A: 请检查：
- API密钥是否正确配置
- 网络是否可以访问火山引擎
- API用量是否超出限制

## 📞 技术支持

- 📧 邮箱支持：请通过GitHub Issues提交问题
- 📚 文档参考：[火山引擎语音识别文档](https://www.volcengine.com/docs/6561/79838)
- 🐛 问题反馈：[GitHub Issues](https://github.com/Launch0to1/doubao-voice-plugin/issues)

## 📄 更新日志

### v1.0.0 (2024-01-XX)
- ✨ 初始版本发布
- 🎯 支持基本语音输入功能
- 🎤 集成火山引擎语音识别
- 🔒 实现本地安全存储

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！

---

**⭐ 如果这个项目对您有帮助，请给个Star支持一下！**