// 修复WebSocket连接的脚本
// 在content.js中使用这个修复版本

// 火山引擎API配置
const VOLCANO_API_CONFIGS = {
    // 标准流式接口
    standard: {
        url: 'wss://openspeech.bytedance.com/ws/v1/stream',
        authType: 'accesskey', // 使用AccessKey认证
        requiresSignature: true
    },
    // 双向流式接口
    bidirectional: {
        url: 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel',
        authType: 'token', // 使用Token认证
        requiresSignature: false
    },
    // 备选接口
    alternative: {
        url: 'wss://openspeech.bytedance.com/api/v2/sauc/bigmodel',
        authType: 'token',
        requiresSignature: false
    }
};

// 修复的连接函数
async function connectWebSocketFixed(config) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log('=== 使用修复版WebSocket连接 ===');

            const { appId, accessToken, modelType, customApiUrl } = config;

            // 步骤1: 确定最佳接口地址
            let targetUrl;
            let authMethod;

            if (modelType === 'custom' && customApiUrl) {
                targetUrl = customApiUrl;
                authMethod = 'token';
            } else {
                // 优先尝试不同的接口配置
                const configsToTry = [
                    VOLCANO_API_CONFIGS.bidirectional,
                    VOLCANO_API_CONFIGS.standard,
                    VOLCANO_API_CONFIGS.alternative
                ];

                for (const apiConfig of configsToTry) {
                    console.log(`尝试接口: ${apiConfig.url}`);
                    const result = await testConnectionWithConfig(apiConfig, config);
                    if (result.success) {
                        targetUrl = apiConfig.url;
                        authMethod = apiConfig.authType;
                        console.log(`找到可用接口: ${targetUrl}`);
                        break;
                    }
                }

                if (!targetUrl) {
                    throw new Error('所有接口都无法连接');
                }
            }

            // 步骤2: 构建认证信息
            let finalUrl;
            if (authMethod === 'token') {
                // Token认证方式（您的配置）
                const timestamp = Date.now();
                const nonce = Math.random().toString(36).substr(2, 9);
                finalUrl = `${targetUrl}?app_id=${appId}&access_token=${accessToken}&timestamp=${timestamp}&nonce=${nonce}`;
            } else {
                // AccessKey认证方式
                const timestamp = Date.now();
                const nonce = Math.random().toString(36).substr(2, 9);
                // 这里需要实现AccessKey签名逻辑
                finalUrl = `${targetUrl}?timestamp=${timestamp}&nonce=${nonce}`;
            }

            console.log('最终连接URL:', finalUrl);

            // 步骤3: 建立WebSocket连接
            const ws = new WebSocket(finalUrl);

            // 设置连接超时
            const connectionTimeout = setTimeout(() => {
                ws.close();
                reject(new Error('WebSocket连接超时'));
            }, 15000);

            ws.onopen = () => {
                clearTimeout(connectionTimeout);
                console.log('WebSocket连接成功！');

                // 发送初始化消息（如果需要）
                if (authMethod === 'token') {
                    // 某些接口可能需要发送初始化消息
                    try {
                        ws.send(JSON.stringify({
                            type: 'start',
                            app_id: appId,
                            access_token: accessToken,
                            timestamp: Date.now()
                        }));
                        console.log('发送初始化消息');
                    } catch (e) {
                        console.log('初始化消息发送失败:', e);
                    }
                }

                resolve(ws);
            };

            ws.onmessage = (event) => {
                console.log('收到消息:', event.data);
                // 处理识别结果
                handleRecognitionResult(event.data);
            };

            ws.onerror = (error) => {
                clearTimeout(connectionTimeout);
                console.error('WebSocket错误:', error);
                reject(error);
            };

            ws.onclose = (event) => {
                console.log('连接关闭:', event.code, event.reason);
                if (event.code === 1006) {
                    console.error('连接被异常关闭，可能是认证失败');
                }
            };

        } catch (error) {
            console.error('连接失败:', error);
            reject(error);
        }
    });
}

// 测试特定配置的连接
async function testConnectionWithConfig(apiConfig, userConfig) {
    return new Promise((resolve) => {
        const { appId, accessToken } = userConfig;
        let testUrl;

        if (apiConfig.authType === 'token') {
            const timestamp = Date.now();
            const nonce = Math.random().toString(36).substr(2, 9);
            testUrl = `${apiConfig.url}?app_id=${appId}&access_token=${accessToken}&timestamp=${timestamp}&nonce=${nonce}`;
        } else {
            const timestamp = Date.now();
            const nonce = Math.random().toString(36).substr(2, 9);
            testUrl = `${apiConfig.url}?timestamp=${timestamp}&nonce=${nonce}`;
        }

        console.log(`测试连接: ${testUrl}`);

        const ws = new WebSocket(testUrl);
        let connected = false;

        const timeout = setTimeout(() => {
            ws.close();
            resolve({ success: false, error: 'timeout' });
        }, 5000);

        ws.onopen = () => {
            connected = true;
            clearTimeout(timeout);
            ws.close();
            resolve({ success: true });
        };

        ws.onerror = (error) => {
            clearTimeout(timeout);
            resolve({ success: false, error: error.type });
        };

        ws.onclose = (event) => {
            if (!connected && event.code === 1006) {
                resolve({ success: false, error: 'connection_refused' });
            }
        };
    });
}

// 处理识别结果
function handleRecognitionResult(data) {
    try {
        const result = JSON.parse(data);

        if (result.type === 'partial' && result.text) {
            // 部分识别结果
            console.log('部分识别结果:', result.text);
        } else if (result.type === 'final' && result.text) {
            // 最终识别结果
            console.log('最终识别结果:', result.text);
        } else if (result.error) {
            console.error('识别错误:', result.error);
        }
    } catch (e) {
        console.log('原始数据:', data);
    }
}

// 导出修复函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        connectWebSocketFixed,
        VOLCANO_API_CONFIGS
    };
}

// 使用示例
async function testFixedConnection() {
    const config = {
        modelType: 'volcano',
        appId: '7547060066',
        accessToken: 'lIiI3tsagpi2Ynpm_qwbI1zPkKMctNZO',
        customApiUrl: 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel'
    };

    try {
        const ws = await connectWebSocketFixed(config);
        console.log('连接成功！');
        return ws;
    } catch (error) {
        console.error('连接失败:', error);
        throw error;
    }
}