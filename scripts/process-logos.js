const sharp = require('sharp');
const fs = require('fs');

async function main() {
  const srcFull = 'C:/Users/Dell/.gemini/antigravity/brain/ac7bd367-3010-4954-b03e-43e8fc1293a8/.user_uploaded/media_1788262427886.png';
  const srcBadge = 'C:/Users/Dell/.gemini/antigravity/brain/ac7bd367-3010-4954-b03e-43e8fc1293a8/.user_uploaded/media_1788262427881.png';

  console.log('=== 1. Extracting Exact Horizontal Logo (757x142) ===');
  // Crop exact logo region
  const croppedLogo = await sharp(srcFull)
    .extract({ left: 145, top: 271, width: 757, height: 142 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const logoWidth = croppedLogo.info.width;
  const logoHeight = croppedLogo.info.height;
  const logoData = new Uint8Array(croppedLogo.data);
  const whiteTextData = new Uint8Array(croppedLogo.data.length);

  for (let i = 0; i < logoData.length; i += 4) {
    const r = logoData[i];
    const g = logoData[i + 1];
    const b = logoData[i + 2];
    const a = logoData[i + 3];

    // Background white detection
    const isWhite = (r >= 235 && g >= 235 && b >= 235);
    if (isWhite) {
      logoData[i + 3] = 0; // Transparent
      whiteTextData[i + 3] = 0;
    } else {
      // Content pixel
      logoData[i + 3] = 255;
      whiteTextData[i + 3] = 255;

      // Check if it's yellow (high R, high G, low B)
      const isYellow = (r > 160 && g > 130 && b < 80);
      if (isYellow) {
        whiteTextData[i] = r;
        whiteTextData[i + 1] = g;
        whiteTextData[i + 2] = b;
      } else {
        // Black text turned into pure white for dark backgrounds
        whiteTextData[i] = 255;
        whiteTextData[i + 1] = 255;
        whiteTextData[i + 2] = 255;
      }
    }
  }

  // Save standard transparent dark logo (for white backgrounds)
  await sharp(logoData, { raw: { width: logoWidth, height: logoHeight, channels: 4 } })
    .png()
    .toFile('public/logo.png');
  
  await sharp('public/logo.png').toFile('public/logo-dark.png');
  await sharp('public/logo.png').toFile('public/logo-full.png');

  // Save white text version (for dark background)
  await sharp(whiteTextData, { raw: { width: logoWidth, height: logoHeight, channels: 4 } })
    .png()
    .toFile('public/logo-white.png');

  console.log('✅ Horizontal logos saved with 0 margin padding: public/logo.png and public/logo-white.png');

  console.log('=== 2. Extracting Center Yellow/Black Icon (Circular Emblem) ===');
  // Center is roughly left: 326, top: 126, width: 425, height: 425
  const croppedIcon = await sharp(srcBadge)
    .extract({ left: 334, top: 139, width: 405, height: 405 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const iconW = croppedIcon.info.width;
  const iconH = croppedIcon.info.height;
  const iconPixels = new Uint8Array(croppedIcon.data);
  const centerX = iconW / 2;
  const centerY = iconH / 2;
  const radius = (iconW / 2) - 3;

  // Make outside circular boundary transparent (clean antialiased circle)
  for (let y = 0; y < iconH; y++) {
    for (let x = 0; x < iconW; x++) {
      const idx = (y * iconW + x) * 4;
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      if (dist > radius) {
        iconPixels[idx + 3] = 0; // Transparent outside circle
      }
    }
  }

  await sharp(iconPixels, { raw: { width: iconW, height: iconH, channels: 4 } })
    .png()
    .toFile('public/logo-icon.png');
  
  await sharp('public/logo-icon.png').toFile('public/logo-badge.png');

  console.log('✅ Round icon saved: public/logo-icon.png');
}

main().catch(console.error);
