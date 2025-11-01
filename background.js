// background.js - 后台脚本
chrome.runtime.onInstalled.addListener(() => {
  console.log('语音输入助手扩展已安装');

  // 初始化存储
  chrome.storage.local.get(['apiKey', 'apiSecret'], (result) => {
    if (!result.apiKey && !result.apiSecret) {
      console.log('首次安装，需要配置API密钥');
    }
  });
});

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_API_CONFIG') {
    chrome.storage.local.get(['apiKey', 'apiSecret'], (result) => {
      sendResponse({
        apiKey: result.apiKey || '',
        apiSecret: result.apiSecret || ''
      });
    });
    return true; // 保持消息通道开放
  }

  if (request.type === 'CHECK_PERMISSIONS') {
    checkPermissions().then(sendResponse);
    return true;
  }
});

// 检查扩展权限
async function checkPermissions() {
  try {
    // 检查麦克风权限
    const microphonePermission = await navigator.permissions.query({ name: 'microphone' });

    return {
      microphone: microphonePermission.state,
      hasStorage: true, // 扩展默认有storage权限
      hasActiveTab: true // 扩展默认有activeTab权限
    };
  } catch (error) {
    console.error('权限检查失败:', error);
    return {
      microphone: 'unknown',
      hasStorage: true,
      hasActiveTab: true,
      error: error.message
    };
  }
}

// 监听扩展图标点击
chrome.action.onClicked.addListener((tab) => {
  // 如果用户点击扩展图标，可以打开配置页面
  chrome.action.setPopup({ popup: 'popup.html' });
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 可以在这里添加标签页更新时的逻辑
  if (changeInfo.status === 'complete') {
    console.log(`页面加载完成: ${tab.url}`);
  }
});

// 错误处理
chrome.runtime.onStartup.addListener(() => {
  console.log('浏览器启动，语音输入助手扩展已加载');
});

// 处理扩展卸载
chrome.runtime.onSuspend.addListener(() => {
  console.log('语音输入助手扩展即将卸载');
});

// 创建右键菜单（可选功能）
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'voice-input-assistant',
    title: '使用语音输入',
    contexts: ['editable']
  });
});

// 监听右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'voice-input-assistant') {
    // 向内容脚本发送消息，启动语音输入
    chrome.tabs.sendMessage(tab.id, {
      type: 'START_VOICE_INPUT',
      targetElement: info.targetElementId
    });
  }
});

// 监听存储变化
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    for (let key in changes) {
      if (key === 'apiKey' || key === 'apiSecret') {
        console.log(`API配置已更新: ${key}`);
      }
    }
  }
});

// 帮助函数：获取当前活动标签页
function getCurrentTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
}

// 帮助函数：向内容脚本发送消息
async function sendToContentScript(message) {
  try {
    const tab = await getCurrentTab();
    if (tab) {
      chrome.tabs.sendMessage(tab.id, message);
    }
  } catch (error) {
    console.error('发送消息到内容脚本失败:', error);
  }
}

// 导出函数供其他脚本使用
window.backgroundUtils = {
  checkPermissions,
  getCurrentTab,
  sendToContentScript
};