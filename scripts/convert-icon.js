/**
 * Converts assets/icon.svg to assets/icon.png so Electron and electron-builder can use it.
 * Run on postinstall and before build.
 */
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');
const svgPath = path.join(assetsDir, 'icon.svg');
const pngPath = path.join(assetsDir, 'icon.png');

if (!fs.existsSync(svgPath)) {
  process.exit(0);
}

async function convert() {
  try {
    const sharp = require('sharp');
    const svgBuffer = fs.readFileSync(svgPath);
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(pngPath);
    console.log('Generated assets/icon.png from assets/icon.svg');
  } catch (err) {
    console.error('Icon conversion failed:', err.message);
    process.exit(1);
  }
}

convert();
