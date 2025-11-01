// 生成图标文件的脚本
const fs = require('fs');
const path = require('path');

// 创建简单的PNG图标数据（1x1像素，蓝色）
function createSimplePNG(width, height, color) {
  // PNG文件头和IHDR chunk
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR chunk
  const ihdrLength = Buffer.from([0x00, 0x00, 0x00, 0x0D]);
  const ihdrType = Buffer.from('IHDR');
  const widthBuffer = Buffer.from([width >>> 24, width >>> 16, width >>> 8, width]);
  const heightBuffer = Buffer.from([height >>> 24, height >>> 16, height >>> 8, height]);
  const ihdrData = Buffer.concat([
    widthBuffer,
    heightBuffer,
    Buffer.from([0x08, 0x02, 0x00, 0x00, 0x00]), // 8位深度，RGB颜色类型
  ]);

  // 计算IHDR CRC
  const ihdrCrc = crc32(Buffer.concat([ihdrType, ihdrData]));
  const ihdrCrcBuffer = Buffer.from([ihdrCrc >>> 24, ihdrCrc >>> 16, ihdrCrc >>> 8, ihdrCrc]);

  // IDAT chunk (1x1像素的蓝色)
  const idatLength = Buffer.from([0x00, 0x00, 0x00, 0x0C]); // 12字节数据
  const idatType = Buffer.from('IDAT');
  const compressedData = Buffer.from([0x78, 0x9C, 0x62, 0xF8, 0xCF, 0xC0, 0x00, 0x00, 0x02, 0x81, 0x01, 0x01]); // 压缩的蓝色像素数据
  const idatCrc = crc32(Buffer.concat([idatType, compressedData]));
  const idatCrcBuffer = Buffer.from([idatCrc >>> 24, idatCrc >>> 16, idatCrc >>> 8, idatCrc]);

  // IEND chunk
  const iendLength = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  const iendType = Buffer.from('IEND');
  const iendCrc = crc32(Buffer.concat([iendType]));
  const iendCrcBuffer = Buffer.from([iendCrc >>> 24, iendCrc >>> 16, iendCrc >>> 8, iendCrc]);

  return Buffer.concat([
    pngSignature,
    ihdrLength,
    ihdrType,
    ihdrData,
    ihdrCrcBuffer,
    idatLength,
    idatType,
    compressedData,
    idatCrcBuffer,
    iendLength,
    iendType,
    iendCrcBuffer
  ]);
}

// 简单的CRC32实现
function crc32(data) {
  const crcTable = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    crcTable[i] = c;
  }

  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// 生成图标文件
function generateIcons() {
  const iconsDir = path.join(__dirname, 'icons');

  // 确保icons目录存在
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir);
  }

  // 生成不同尺寸的图标
  const sizes = [16, 48, 128];
  const color = { r: 66, g: 133, b: 244 }; // Google蓝色

  sizes.forEach(size => {
    const iconPath = path.join(iconsDir, `mic${size}.png`);
    const pngData = createSimplePNG(size, size, color);

    fs.writeFileSync(iconPath, pngData);
    console.log(`生成图标: ${iconPath}`);
  });

  console.log('图标生成完成！');
  console.log('注意：这些是临时图标，建议使用 create_icons.html 生成更专业的图标');
}

// 运行生成
if (require.main === module) {
  generateIcons();
}

module.exports = { generateIcons };