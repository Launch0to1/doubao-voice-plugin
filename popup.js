// popup.js - 配置页面逻辑
(function() {
  'use strict';

  // DOM元素
  const apiKeyInput = document.getElementById('apiKey');
  const apiSecretInput = document.getElementById('apiSecret');
  const configForm = document.getElementById('configForm');
  const clearBtn = document.getElementById('clearBtn');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');

  // 初始化
  function init() {
    loadConfig();
    bindEvents();
  }

  // 绑定事件
  function bindEvents() {
    // 表单提交事件
    configForm.addEventListener('submit', handleSave);

    // 清除按钮事件
    clearBtn.addEventListener('click', handleClear);

    // 输入框变化事件
    apiKeyInput.addEventListener('input', hideStatus);
    apiSecretInput.addEventListener('input', hideStatus);

    // 防止表单默认提交
    configForm.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave(e);
      }
    });
  }

  // 加载配置
  function loadConfig() {
    chrome.storage.local.get(['apiKey', 'apiSecret'], function(result) {
      if (result.apiKey) {
        apiKeyInput.value = result.apiKey;
      }
      if (result.apiSecret) {
        apiSecretInput.value = result.apiSecret;
      }
    });
  }

  // 保存配置
  function handleSave(e) {
    e.preventDefault();

    const apiKey = apiKeyInput.value.trim();
    const apiSecret = apiSecretInput.value.trim();

    // 验证输入
    if (!apiKey || !apiSecret) {
      showStatus('请填写完整的API密钥信息', 'error');
      return;
    }

    // 验证格式（简单的格式检查）
    if (apiKey.length < 10 || apiSecret.length < 10) {
      showStatus('API密钥格式不正确，请检查输入', 'error');
      return;
    }

    // 保存到本地存储
    const config = {
      apiKey: apiKey,
      apiSecret: apiSecret,
      updatedAt: new Date().toISOString()
    };

    chrome.storage.local.set(config, function() {
      if (chrome.runtime.lastError) {
        showStatus('保存失败：' + chrome.runtime.lastError.message, 'error');
      } else {
        showStatus('配置保存成功！', 'success');
        console.log('API配置已保存');
      }
    });
  }

  // 清除配置
  function handleClear() {
    if (confirm('确定要清除所有API配置吗？')) {
      chrome.storage.local.remove(['apiKey', 'apiSecret'], function() {
        if (chrome.runtime.lastError) {
          showStatus('清除失败：' + chrome.runtime.lastError.message, 'error');
        } else {
          apiKeyInput.value = '';
          apiSecretInput.value = '';
          showStatus('配置已清除', 'success');
          console.log('API配置已清除');
        }
      });
    }
  }

  // 显示状态信息
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    statusDiv.style.display = 'block';

    // 3秒后自动隐藏
    setTimeout(hideStatus, 3000);
  }

  // 隐藏状态信息
  function hideStatus() {
    statusDiv.style.display = 'none';
  }

  // 验证API密钥格式
  function validateApiKey(key) {
    // 火山引擎AccessKey ID通常是AK开头的一串字符
    return /^[A-Za-z0-9]{10,}$/.test(key);
  }

  function validateApiSecret(secret) {
    // 火山引擎AccessKey Secret通常是一串较长的随机字符
    return /^[A-Za-z0-9]{20,}$/.test(secret);
  }

  // 加密存储（可选功能）
  function encryptData(data) {
    // 简单的base64编码，实际应用中应该使用更安全的加密方式
    try {
      return btoa(encodeURIComponent(JSON.stringify(data)));
    } catch (e) {
      console.error('加密失败:', e);
      return data;
    }
  }

  function decryptData(encryptedData) {
    // 解密数据
    try {
      return JSON.parse(decodeURIComponent(atob(encryptedData)));
    } catch (e) {
      console.error('解密失败:', e);
      return encryptedData;
    }
  }

  // 测试API连接（可选功能）
  function testApiConnection() {
    const apiKey = apiKeyInput.value.trim();
    const apiSecret = apiSecretInput.value.trim();

    if (!apiKey || !apiSecret) {
      showStatus('请先填写API密钥', 'error');
      return;
    }

    showStatus('正在测试API连接...', 'success');

    // 这里可以添加实际的API测试逻辑
    // 由于涉及跨域和安全问题，这里只是模拟测试
    setTimeout(() => {
      showStatus('API连接测试完成（模拟）', 'success');
    }, 2000);
  }

  // 导出配置（可选功能）
  function exportConfig() {
    chrome.storage.local.get(['apiKey', 'apiSecret'], function(result) {
      const config = {
        apiKey: result.apiKey || '',
        apiSecret: result.apiSecret || '',
        exportTime: new Date().toISOString()
      };

      const dataStr = JSON.stringify(config, null, 2);
      const dataBlob = new Blob([dataStr], {type: 'application/json'});
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'voice-assistant-config.json';
      link.click();

      URL.revokeObjectURL(url);
    });
  }

  // 导入配置（可选功能）
  function importConfig(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const config = JSON.parse(e.target.result);
        if (config.apiKey && config.apiSecret) {
          apiKeyInput.value = config.apiKey;
          apiSecretInput.value = config.apiSecret;
          showStatus('配置导入成功', 'success');
        } else {
          showStatus('配置文件格式错误', 'error');
        }
      } catch (error) {
        showStatus('配置文件解析失败', 'error');
      }
    };
    reader.readAsText(file);
  }

  // 页面加载完成后初始化
  document.addEventListener('DOMContentLoaded', init);

  // 暴露一些函数供控制台调试使用
  window.popupDebug = {
    loadConfig: loadConfig,
    testApiConnection: testApiConnection,
    exportConfig: exportConfig,
    importConfig: importConfig
  };

})();