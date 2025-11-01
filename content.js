// 语音输入助手 - 内容脚本
(function() {
  'use strict';

  // 全局变量
  let isRecording = false;
  let mediaRecorder = null;
  let audioStream = null;
  let ws = null;
  let currentInput = null;
  let micButton = null;
  let sessionId = null; // 新增：会话ID
  let heartbeatInterval = null; // 新增：心跳定时器

  // 语音识别模型配置
  const MODEL_CONFIGS = {
    volcano: {
      name: '火山引擎语音识别',
      defaultUrl: 'wss://openspeech.bytedance.com/ws/v1/stream',
      authType: 'access_key',
      // 新增：支持最新的双向流式接口
      altUrls: [
        'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel',
        'wss://openspeech.bytedance.com/api/v2/sauc/bigmodel',
        'wss://openspeech.bytedance.com/api/v1/sauc/bigmodel'
      ],
      // 新增：协议配置
      protocol: {
        // 发送音频数据的格式
        audioFormat: 'opus',
        sampleRate: 16000,
        channelCount: 1,
        // 消息类型
        messageTypes: {
          START_REQUEST: 'start_request',
          AUDIO_DATA: 'audio_data',
          STOP_REQUEST: 'stop_request',
          HEARTBEAT: 'heartbeat'
        }
      }
    },
    custom: {
      name: '自定义模型接口',
      defaultUrl: '',
      authType: 'custom',
      protocol: {
        audioFormat: 'opus',
        sampleRate: 16000,
        channelCount: 1
      }
    }
  };

  // 创建麦克风按钮
  function createMicButton() {
    const button = document.createElement('div');
    button.id = 'voice-input-mic';
    button.innerHTML = '🎤';
    button.style.cssText = `
      position: absolute;
      width: 24px;
      height: 24px;
      background: #fff;
      border: 2px solid #4285f4;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
    `;

    button.addEventListener('click', toggleRecording);
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
    });

    return button;
  }

  // 定位麦克风按钮
  function positionMicButton(input) {
    if (!micButton) {
      micButton = createMicButton();
      document.body.appendChild(micButton);
    }

    const rect = input.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    micButton.style.left = (rect.right + scrollLeft + 5) + 'px';
    micButton.style.top = (rect.top + scrollTop + (rect.height - 24) / 2) + 'px';
    micButton.style.display = 'flex';
  }

  // 隐藏麦克风按钮
  function hideMicButton() {
    if (micButton) {
      micButton.style.display = 'none';
    }
  }

  // 切换录音状态
  async function toggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }

  // 开始录音
  async function startRecording() {
    try {
      // 获取API配置
      const config = await getApiConfig();

      // 检查是否有可用的配置
      const hasValidConfig = config.modelType === 'custom' ?
        config.customApiUrl :
        (config.apiKey || config.apiSecret || config.appId || config.accessToken);

      if (!hasValidConfig) {
        alert('请先配置API信息：点击扩展图标进行配置');
        return;
      }

      // 获取麦克风权限（Manifest V3中需要通过用户交互触发）
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            sampleSize: 16,
            echoCancellation: true,
            noiseSuppression: true
          }
        });
      } catch (mediaError) {
        if (mediaError.name === 'NotAllowedError') {
          alert('需要麦克风权限才能使用语音输入功能。请在浏览器设置中允许麦克风访问。');
          return;
        } else if (mediaError.name === 'NotFoundError') {
          alert('未找到麦克风设备，请检查设备连接。');
          return;
        } else {
          throw mediaError;
        }
      }

      // 更新UI状态
      isRecording = true;
      updateMicButtonUI(true);

      // 连接WebSocket
      await connectWebSocket(config);

      // 开始录音
      mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && ws && ws.readyState === WebSocket.OPEN) {
          // 使用新的二进制协议发送音频数据
          sendAudioData(event.data);
        }
      };

      mediaRecorder.start(250); // 每250ms发送一次数据

    } catch (error) {
      console.error('开始录音失败:', error);
      alert('无法访问麦克风，请检查权限设置');
      stopRecording();
    }
  }

  // 停止录音
  function stopRecording() {
    isRecording = false;
    updateMicButtonUI(false);

    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder = null;
    }

    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      audioStream = null;
    }

    if (ws) {
      ws.close();
      ws = null;
    }
  }

  // 更新麦克风按钮UI
  function updateMicButtonUI(recording) {
    if (!micButton) return;

    if (recording) {
      micButton.innerHTML = '🔴';
      micButton.style.background = '#ff4444';
      micButton.style.borderColor = '#cc0000';
    } else {
      micButton.innerHTML = '🎤';
      micButton.style.background = '#fff';
      micButton.style.borderColor = '#4285f4';
    }
  }

  // 连接WebSocket - 支持新的二进制协议
  async function connectWebSocket(config) {
    return new Promise(async (resolve, reject) => {
      try {
        // 根据文档使用新的接口地址和认证方式
        const wsUrl = config.modelType === 'custom' ?
          config.customApiUrl :
          'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel';

        console.log('=== WebSocket连接调试信息 ===');
        console.log('模型类型:', config.modelType);
        console.log('模型名称:', config.modelName);
        console.log('WebSocket URL:', wsUrl);
        console.log('APP ID:', config.appId);
        console.log('Access Token:', config.accessToken ? '已设置' : '未设置');
        console.log('===========================');

        // 创建WebSocket连接，使用HTTP header认证
        // 注意：浏览器WebSocket API不支持自定义headers，需要使用URL参数认证
        const authParams = generateAuthParams(config);
        const fullUrl = `${wsUrl}?${authParams}`;

        console.log('完整WebSocket URL:', fullUrl);

        ws = new WebSocket(fullUrl);

        // 设置连接超时
        const connectionTimeout = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            ws.close();
            const timeoutError = new Error('WebSocket连接超时（10秒）');
            console.error('连接超时:', timeoutError);
            reject(timeoutError);
          }
        }, 10000);

        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('WebSocket连接成功');

          // 发送初始的full client request
          if (config.modelType === 'volcano') {
            sendFullClientRequest(config);
          }

          resolve();
        };

        ws.onmessage = (event) => {
          handleBinaryMessage(event.data);
        };

        ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('WebSocket连接错误:', error);
          reject(error);
        };

        ws.onclose = (event) => {
          console.log('WebSocket连接关闭, 代码:', event.code, '原因:', event.reason);
          stopHeartbeat();
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  // 生成认证参数（支持多种模型）
  function generateAuthParams(config) {
    const timestamp = Date.now();
    const nonce = Math.random().toString(36).substr(2, 9);

    // 智能判断认证方式：如果提供了APP ID和Access Token，优先使用它们
    if (config.appId || config.accessToken) {
      // 使用APP ID和Access Token模式（适用于您提到的接口）
      const params = [];
      if (config.appId) params.push(`app_id=${config.appId}`);
      if (config.accessToken) params.push(`access_token=${config.accessToken}`);
      params.push(`timestamp=${timestamp}`);
      params.push(`nonce=${nonce}`);

      // 记录生成的参数用于调试
      console.log('使用APP ID + Access Token认证模式');
      console.log('生成的认证参数:', params.join('&'));
      return params.join('&');
    } else if (config.apiKey || config.apiSecret) {
      // 传统的Access Key模式
      const params = [];
      if (config.apiKey) params.push(`access_key_id=${config.apiKey}`);
      if (config.apiSecret) params.push(`access_key_secret=${config.apiSecret}`);
      params.push(`timestamp=${timestamp}`);
      params.push(`nonce=${nonce}`);

      // 记录生成的参数用于调试
      console.log('使用Access Key认证模式');
      console.log('生成的认证参数:', params.join('&'));
      return params.join('&');
    } else {
      // 没有任何认证信息，只返回时间戳和随机数
      const params = [];
      params.push(`timestamp=${timestamp}`);
      params.push(`nonce=${nonce}`);

      console.log('使用基础认证参数（无密钥）');
      console.log('生成的认证参数:', params.join('&'));
      return params.join('&');
    }
  }

  // 新增：发送完整的客户端请求（符合火山引擎新协议）
  function sendFullClientRequest(config) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    // 构建符合火山引擎新协议的FullClientRequest
    const fullClientRequest = {
      app_id: config.appId,
      user_id: 'chrome_extension_user',
      request_id: generateRequestId(),
      audio: {
        format: 'opus',
        rate: 16000,
        bits: 16,
        channel: 1,
        language: 'zh-CN'
      },
      request: {
        core_type: 'cn.sauc.sauc-streaming.v1',
        ref_text: '',
        res_text_format: 0,
        add_punc: true,
        vad_on: true,
        vad_pause: 500,
        vad_timeout: 2000,
        max_silence: 2000,
        max_sentence_silence: 2000,
        result_type: 'single',
        enable_chunk: true,
        chunk_interval: 250,
        enable_long_speech: true,
        enable_intermediate_result: true,
        enable_punctuation: true,
        enable_word_info: false,
        enable_semantic_smoothing: true,
        vocabulary_id: '',
        vocabulary_filter: 'default'
      },
      user: {
        uid: 'chrome_extension_user',
        device_id: 'chrome_extension'
      }
    };

    console.log('发送FullClientRequest:', fullClientRequest);

    // 将JSON转换为二进制格式发送
    try {
      const jsonString = JSON.stringify(fullClientRequest);
      const encoder = new TextEncoder();
      const binaryData = encoder.encode(jsonString);

      // 创建二进制消息头（4字节）
      const header = new ArrayBuffer(4);
      const headerView = new DataView(header);

      // 协议版本 (1字节)
      headerView.setUint8(0, 0x01);
      // 消息类型 (1字节) - 0x01 表示 FullClientRequest
      headerView.setUint8(1, 0x01);
      // 序列化方法 (1字节) - 0x01 表示 JSON
      headerView.setUint8(2, 0x01);
      // 保留位 (1字节)
      headerView.setUint8(3, 0x00);

      // 组合头部和消息体
      const fullMessage = new Uint8Array(4 + binaryData.length);
      fullMessage.set(new Uint8Array(header), 0);
      fullMessage.set(binaryData, 4);

      ws.send(fullMessage);
      console.log('FullClientRequest已发送（二进制格式）');

      // 启动心跳机制
      startHeartbeat(config);

    } catch (error) {
      console.error('发送FullClientRequest失败:', error);
    }
  }

  // 新增：发送开始识别请求
  function sendStartRequest(config) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const startRequest = {
      type: 'start_request',
      request_id: generateRequestId(),
      timestamp: Date.now(),
      config: {
        audio: {
          format: config.protocol?.audioFormat || 'opus',
          sample_rate: config.protocol?.sampleRate || 16000,
          channel_count: config.protocol?.channelCount || 1,
          bits_per_sample: 16
        },
        // 新增：语音识别配置
        asr: {
          enable_intermediate_result: true,
          enable_punctuation: true,
          enable_word_info: false,
          enable_semantic_smoothing: true,
          max_sentence_silence: 2000, // 2秒静音检测
          vocabulary_id: '', // 可选：自定义词表
          vocabulary_filter: 'default' // 词汇过滤策略
        },
        // 新增：业务配置
        business: {
          sub_service_type: 'realtime',
          enable_chunk: true,
          chunk_interval: 250, // 250ms分片
          enable_long_speech: true,
          enable_vad: true, // 语音活动检测
          vad_silence_time: 500 // 500ms静音检测
        }
      }
    };

    console.log('发送开始识别请求:', startRequest);
    ws.send(JSON.stringify(startRequest));

    // 启动心跳机制
    startHeartbeat(config);
  }

  // 新增：生成请求ID
  function generateRequestId() {
    return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // 新增：启动心跳机制（二进制格式）
  function startHeartbeat(config) {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }

    heartbeatInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          const heartbeat = {
            type: 'heartbeat',
            timestamp: Date.now(),
            request_id: generateRequestId()
          };

          console.log('发送心跳:', heartbeat);

          // 将JSON转换为二进制格式发送
          const jsonString = JSON.stringify(heartbeat);
          const encoder = new TextEncoder();
          const binaryData = encoder.encode(jsonString);

          // 创建二进制消息头（4字节）
          const header = new ArrayBuffer(4);
          const headerView = new DataView(header);

          // 协议版本 (1字节)
          headerView.setUint8(0, 0x01);
          // 消息类型 (1字节) - 0x04 表示心跳
          headerView.setUint8(1, 0x04);
          // 序列化方法 (1字节) - 0x01 表示 JSON
          headerView.setUint8(2, 0x01);
          // 保留位 (1字节)
          headerView.setUint8(3, 0x00);

          // 组合头部和消息体
          const fullMessage = new Uint8Array(4 + binaryData.length);
          fullMessage.set(new Uint8Array(header), 0);
          fullMessage.set(binaryData, 4);

          ws.send(fullMessage);
          console.log('心跳已发送（二进制格式）');

        } catch (error) {
          console.error('发送心跳失败:', error);
        }
      }
    }, 30000); // 每30秒发送一次心跳
  }

  // 新增：发送音频数据（二进制格式）
  function sendAudioData(audioBlob) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    audioBlob.arrayBuffer().then(arrayBuffer => {
      try {
        // 创建二进制消息头（4字节）
        const header = new ArrayBuffer(4);
        const headerView = new DataView(header);

        // 协议版本 (1字节)
        headerView.setUint8(0, 0x01);
        // 消息类型 (1字节) - 0x02 表示音频数据
        headerView.setUint8(1, 0x02);
        // 序列化方法 (1字节) - 0x00 表示原始音频数据
        headerView.setUint8(2, 0x00);
        // 保留位 (1字节)
        headerView.setUint8(3, 0x00);

        // 组合头部和音频数据
        const fullMessage = new Uint8Array(4 + arrayBuffer.byteLength);
        fullMessage.set(new Uint8Array(header), 0);
        fullMessage.set(new Uint8Array(arrayBuffer), 4);

        ws.send(fullMessage);
        console.log('音频数据已发送（二进制格式）, 大小:', fullMessage.length, '字节');

      } catch (error) {
        console.error('发送音频数据失败:', error);
      }
    }).catch(error => {
      console.error('转换音频数据失败:', error);
    });
  }

  // 新增：发送停止识别请求（二进制格式）
  function sendStopRequest() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    try {
      // 创建停止请求消息
      const stopRequest = {
        type: 'stop_request',
        request_id: generateRequestId(),
        timestamp: Date.now()
      };

      console.log('发送停止识别请求:', stopRequest);

      // 将JSON转换为二进制格式发送
      const jsonString = JSON.stringify(stopRequest);
      const encoder = new TextEncoder();
      const binaryData = encoder.encode(jsonString);

      // 创建二进制消息头（4字节）
      const header = new ArrayBuffer(4);
      const headerView = new DataView(header);

      // 协议版本 (1字节)
      headerView.setUint8(0, 0x01);
      // 消息类型 (1字节) - 0x03 表示停止请求
      headerView.setUint8(1, 0x03);
      // 序列化方法 (1字节) - 0x01 表示 JSON
      headerView.setUint8(2, 0x01);
      // 保留位 (1字节)
      headerView.setUint8(3, 0x00);

      // 组合头部和消息体
      const fullMessage = new Uint8Array(4 + binaryData.length);
      fullMessage.set(new Uint8Array(header), 0);
      fullMessage.set(binaryData, 4);

      ws.send(fullMessage);
      console.log('停止请求已发送（二进制格式）');

    } catch (error) {
      console.error('发送停止请求失败:', error);
    }
  }

  // 处理二进制消息（火山引擎新协议）
  function handleBinaryMessage(data) {
    try {
      if (data instanceof Blob) {
        // 处理Blob数据
        const reader = new FileReader();
        reader.onload = function() {
          const arrayBuffer = reader.result;
          parseBinaryMessage(arrayBuffer);
        };
        reader.readAsArrayBuffer(data);
      } else if (data instanceof ArrayBuffer) {
        // 直接处理ArrayBuffer数据
        parseBinaryMessage(data);
      } else if (typeof data === 'string') {
        // 处理字符串数据（向后兼容）
        handleRecognitionResult(data);
      } else {
        console.warn('收到未知类型的消息:', typeof data);
      }
    } catch (error) {
      console.error('处理二进制消息失败:', error);
    }
  }

  // 解析二进制消息
  function parseBinaryMessage(arrayBuffer) {
    try {
      const dataView = new DataView(arrayBuffer);

      // 检查数据长度是否足够
      if (dataView.byteLength < 4) {
        console.warn('消息长度不足，无法解析头部');
        return;
      }

      // 解析消息头（4字节）
      const protocolVersion = dataView.getUint8(0);
      const messageType = dataView.getUint8(1);
      const serializationMethod = dataView.getUint8(2);
      const reserved = dataView.getUint8(3);

      console.log('二进制消息头:', {
        protocolVersion,
        messageType,
        serializationMethod,
        reserved
      });

      // 获取消息体
      const bodyData = new Uint8Array(arrayBuffer, 4);

      // 根据序列化方法解析消息体
      if (serializationMethod === 0x01) { // JSON格式
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(bodyData);
        console.log('消息体JSON:', jsonString);

        try {
          const message = JSON.parse(jsonString);
          handleServerMessage(message);
        } catch (e) {
          console.error('解析JSON消息体失败:', e);
        }
      } else {
        console.warn('不支持的序列化方法:', serializationMethod);
      }

    } catch (error) {
      console.error('解析二进制消息失败:', error);
    }
  }

  // 处理服务器消息
  function handleServerMessage(message) {
    if (!message) return;

    console.log('处理服务器消息:', message);

    // 根据消息类型处理
    if (message.type === 'final_result' || message.type === 'result') {
      if (message.text) {
        insertText(message.text);
      }
    } else if (message.type === 'partial_result') {
      // 中间结果，可以选择显示或忽略
      console.log('中间识别结果:', message.text);
    } else if (message.type === 'error') {
      console.error('服务器错误:', message.error);
      if (message.error && message.error.message) {
        alert(`语音识别错误: ${message.error.message}`);
      }
    } else if (message.type === 'heartbeat_response') {
      console.log('收到心跳响应');
    } else {
      console.log('收到其他类型的消息:', message);
    }
  }

  // 处理识别结果（向后兼容）
  function handleRecognitionResult(data) {
    try {
      const result = JSON.parse(data);

      if (result.type === 'final_result' && result.text) {
        insertText(result.text);
      } else if (result.type === 'partial_result' && result.text) {
        // 可以显示中间结果，这里暂时只处理最终结果
        console.log('中间识别结果:', result.text);
      }
    } catch (error) {
      console.error('解析识别结果失败:', error);
    }
  }

  // 插入文本到输入框
  function insertText(text) {
    if (!currentInput) return;

    if (currentInput.tagName === 'INPUT' || currentInput.tagName === 'TEXTAREA') {
      const start = currentInput.selectionStart;
      const end = currentInput.selectionEnd;
      const currentValue = currentInput.value;

      currentInput.value = currentValue.substring(0, start) + text + currentValue.substring(end);

      // 设置光标位置
      const newCursorPos = start + text.length;
      currentInput.setSelectionRange(newCursorPos, newCursorPos);
    } else if (currentInput.contentEditable === 'true') {
      // 处理contentEditable元素
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);

      range.deleteContents();
      range.insertNode(document.createTextNode(text));

      // 移动光标到插入文本后
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    // 触发input事件
    currentInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // 获取API配置
  async function getApiConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get([
        'modelType', 'apiKey', 'apiSecret', 'customApiUrl',
        'appId', 'accessToken'
      ], (result) => {
        const modelType = result.modelType || 'volcano';
        const modelConfig = MODEL_CONFIGS[modelType];

        const config = {
          modelType: modelType,
          modelName: modelConfig.name,
          apiKey: result.apiKey || '',
          apiSecret: result.apiSecret || '',
          // 如果有自定义接口地址，优先使用；否则使用默认地址
          customApiUrl: result.customApiUrl && result.customApiUrl.trim() !== '' ?
            result.customApiUrl : modelConfig.defaultUrl,
          appId: result.appId || '',
          accessToken: result.accessToken || '',
          authType: modelConfig.authType
        };

        // 记录当前配置用于调试
        console.log('当前API配置:', {
          modelType: config.modelType,
          modelName: config.modelName,
          hasApiKey: !!config.apiKey,
          hasApiSecret: !!config.apiSecret,
          customApiUrl: config.customApiUrl,
          hasAppId: !!config.appId,
          hasAccessToken: !!config.accessToken,
          authType: config.authType
        });

        resolve(config);
      });
    });
  }

  // 检测输入框类型
  function isValidInput(element) {
    if (!element) return false;

    const tagName = element.tagName.toLowerCase();
    const type = element.type?.toLowerCase();

    return (
      tagName === 'textarea' ||
      tagName === 'input' && (type === 'text' || type === 'search' || !type) ||
      element.contentEditable === 'true'
    );
  }

  // 处理输入框焦点事件
  function handleFocus(event) {
    const target = event.target;

    if (isValidInput(target)) {
      currentInput = target;
      positionMicButton(target);
    }
  }

  // 处理输入框失焦事件
  function handleBlur(event) {
    // 延迟隐藏，避免点击麦克风按钮时触发失焦
    setTimeout(() => {
      if (!micButton || !micButton.contains(document.activeElement)) {
        hideMicButton();
        if (currentInput === event.target) {
          currentInput = null;
        }
      }
    }, 200);
  }

  // 初始化
  function init() {
    // 监听焦点事件
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);

    // 监听页面点击，隐藏麦克风按钮
    document.addEventListener('click', (event) => {
      if (!micButton || (!micButton.contains(event.target) && !isValidInput(event.target))) {
        hideMicButton();
      }
    });

    console.log('语音输入助手已加载');
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();