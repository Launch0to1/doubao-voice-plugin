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

  // 火山引擎WebSocket配置
  const VOLCANO_WS_URL = 'wss://openspeech.bytedance.com/ws/v1/stream';

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
      if (!config.apiKey || !config.apiSecret) {
        alert('请先设置API密钥：点击扩展图标进行配置');
        return;
      }

      // 获取麦克风权限
      audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

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
          ws.send(event.data);
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

  // 连接WebSocket
  async function connectWebSocket(config) {
    return new Promise((resolve, reject) => {
      try {
        // 生成认证参数（简化版，实际需要按火山引擎文档生成）
        const authParams = generateAuthParams(config);
        const wsUrl = `${VOLCANO_WS_URL}?${authParams}`;

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('WebSocket连接成功');
          resolve();
        };

        ws.onmessage = (event) => {
          handleRecognitionResult(event.data);
        };

        ws.onerror = (error) => {
          console.error('WebSocket错误:', error);
          reject(error);
        };

        ws.onclose = () => {
          console.log('WebSocket连接关闭');
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  // 生成认证参数（简化版）
  function generateAuthParams(config) {
    const timestamp = Date.now();
    const nonce = Math.random().toString(36).substr(2, 9);

    // 这里需要根据火山引擎文档实现完整的签名算法
    // 暂时使用简化版本
    return `access_key_id=${config.apiKey}&timestamp=${timestamp}&nonce=${nonce}`;
  }

  // 处理识别结果
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
      chrome.storage.local.get(['apiKey', 'apiSecret'], (result) => {
        resolve({
          apiKey: result.apiKey || '',
          apiSecret: result.apiSecret || ''
        });
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