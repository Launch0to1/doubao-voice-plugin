// 打包Chrome扩展的脚本
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 扩展信息
const extensionInfo = {
  name: '语音输入助手',
  version: '1.0.0',
  description: '支持火山引擎流式语音识别的浏览器插件'
};

// 需要打包的文件列表
const filesToPackage = [
  'manifest.json',
  'content.js',
  'popup.html',
  'popup.js',
  'background.js',
  'README.md',
  'test.html',
  'icons/mic16.png',
  'icons/mic48.png',
  'icons/mic128.png',
  'icons/create_icons.html'
];

// 创建打包目录
function createPackageDir() {
  const packageDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(packageDir)) {
    fs.mkdirSync(packageDir);
  }
  return packageDir;
}

// 验证文件是否存在
function validateFiles() {
  const missingFiles = [];

  filesToPackage.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  });

  if (missingFiles.length > 0) {
    console.error('❌ 缺少以下文件:');
    missingFiles.forEach(file => console.error(`  - ${file}`));
    return false;
  }

  return true;
}

// 创建ZIP包
function createZipPackage() {
  const packageDir = createPackageDir();
  const zipFileName = `voice-input-assistant-v${extensionInfo.version}.zip`;
  const zipFilePath = path.join(packageDir, zipFileName);

  try {
    // 使用PowerShell创建ZIP文件（Windows）
    if (process.platform === 'win32') {
      const filesList = filesToPackage.map(f => `"${f}"`).join(',');
      const command = `powershell -Command "Compress-Archive -Path ${filesList} -DestinationPath ".\\dist\\${zipFileName}" -Force"`;
      execSync(command, { cwd: __dirname });
    } else {
      // 使用zip命令（Linux/Mac）
      const filesList = filesToPackage.join(' ');
      execSync(`zip -r "${zipFilePath}" ${filesList}`, { cwd: __dirname });
    }

    console.log(`✅ ZIP包创建成功: ${zipFilePath}`);
    return zipFilePath;
  } catch (error) {
    console.error('❌ 创建ZIP包失败:', error.message);
    return null;
  }
}

// 创建Chrome Web Store包
function createChromePackage() {
  const packageDir = createPackageDir();
  const chromePackageDir = path.join(packageDir, 'chrome-extension');

  // 创建Chrome扩展目录
  if (fs.existsSync(chromePackageDir)) {
    fs.rmSync(chromePackageDir, { recursive: true });
  }
  fs.mkdirSync(chromePackageDir);

  // 复制文件到Chrome扩展目录
  filesToPackage.forEach(file => {
    const srcPath = path.join(__dirname, file);
    const destPath = path.join(chromePackageDir, file);

    // 确保目标目录存在
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.copyFileSync(srcPath, destPath);
  });

  console.log(`✅ Chrome扩展包创建成功: ${chromePackageDir}`);
  return chromePackageDir;
}

// 生成安装说明
function generateInstallInstructions() {
  const instructions = `
# 语音输入助手 - 安装说明

## 📦 安装包内容

本目录包含以下文件：
- \`voice-input-assistant-v${extensionInfo.version}.zip\` - Chrome扩展安装包
- \`chrome-extension/\` - 解压后的扩展文件

## 🚀 安装方法

### 方法1：使用ZIP包安装
1. 打开Chrome浏览器，访问 \`chrome://extensions/\`
2. 开启右上角的"开发者模式"
3. 将 \`voice-input-assistant-v${extensionInfo.version}.zip\` 文件拖拽到扩展页面
4. 扩展安装完成！

### 方法2：使用解压文件安装
1. 解压 \`chrome-extension/\` 文件夹
2. 打开Chrome浏览器，访问 \`chrome://extensions/\`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 \`chrome-extension/\` 文件夹
6. 扩展安装完成！

## ⚙️ 配置扩展

1. 点击浏览器工具栏上的扩展图标 🎤
2. 在弹出的配置页面中输入您的火山引擎API密钥
3. 点击"保存"按钮
4. 现在可以在任意网页使用语音输入功能了！

## 🔧 测试扩展

1. 打开 \`test.html\` 文件进行功能测试
2. 点击任意输入框，观察是否出现麦克风图标
3. 点击麦克风图标开始语音输入测试

## 📞 技术支持

如有问题，请访问：https://github.com/Launch0to1/doubao-voice-plugin
`;

  const packageDir = createPackageDir();
  const instructionsPath = path.join(packageDir, 'INSTALL.md');
  fs.writeFileSync(instructionsPath, instructions.trim());
  console.log(`✅ 安装说明已生成: ${instructionsPath}`);
}

// 主函数
function main() {
  console.log('🚀 开始打包语音输入助手扩展...');
  console.log(`扩展名称: ${extensionInfo.name}`);
  console.log(`版本: ${extensionInfo.version}`);
  console.log('');

  // 验证文件
  if (!validateFiles()) {
    process.exit(1);
  }

  console.log('✅ 文件验证通过');
  console.log('');

  // 创建Chrome扩展包
  const chromePackageDir = createChromePackage();

  // 创建ZIP包
  const zipPath = createZipPackage();

  // 生成安装说明
  generateInstallInstructions();

  console.log('');
  console.log('🎉 打包完成！');
  console.log('');
  console.log('📁 输出文件:');
  console.log(`  - Chrome扩展目录: ${chromePackageDir}`);
  if (zipPath) {
    console.log(`  - ZIP安装包: ${zipPath}`);
  }
  console.log(`  - 安装说明: ${path.join(createPackageDir(), 'INSTALL.md')}`);
  console.log('');
  console.log('🔧 下一步:');
  console.log('  1. 按照INSTALL.md中的说明安装扩展');
  console.log('  2. 配置API密钥');
  console.log('  3. 打开test.html进行功能测试');
  console.log('');
  console.log('📖 详细说明请查看README.md文件');
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  createPackageDir,
  validateFiles,
  createZipPackage,
  createChromePackage,
  generateInstallInstructions
};