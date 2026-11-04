// scripts/generate-icons.js
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🎯 SOURCE : votre favicon.svg existant
const sourceImage = path.join(__dirname, '..', 'public', 'favicon.svg');

// Tailles demandées (manifest + index.html)
const sizes = [16, 32, 72, 76, 96, 120, 128, 144, 152, 180, 192, 384, 512];

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
const publicDir = path.join(__dirname, '..', 'public');

// Vérifier que favicon.svg existe
if (!fs.existsSync(sourceImage)) {
  console.error('❌ favicon.svg non trouvé !');
  console.log(`📁 Attendu à : ${sourceImage}`);
  console.log('📝 Placez votre favicon.svg dans public/');
  process.exit(1);
}

// Créer le dossier icons
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('🎨 Génération des icônes StockAcha depuis favicon.svg...');
console.log(`📁 Source : ${sourceImage}`);

const generateIcons = async () => {
  try {
    for (const size of sizes) {
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);

      await sharp(sourceImage, { density: 384 }) // densité élevée pour SVG → PNG net
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png({ quality: 90, compressionLevel: 9 })
        .toFile(outputPath);

      console.log(`✅ icon-${size}x${size}.png`);
    }

    // ✅ apple-touch-icon.png (180x180) à la racine public/
    await sharp(sourceImage, { density: 384 })
      .resize(180, 180)
      .png({ quality: 90 })
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    console.log('✅ apple-touch-icon.png (180x180)');

    // ✅ og-image.png (1200x630) — fond bleu + logo centré
    await sharp({
      create: {
        width: 1200,
        height: 630,
        channels: 4,
        background: { r: 30, g: 64, b: 175, alpha: 1 } // #1e40af
      }
    })
      .composite([
        {
          input: await sharp(sourceImage, { density: 384 })
            .resize(400, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toBuffer(),
          top: 115,
          left: 400
        }
      ])
      .png()
      .toFile(path.join(publicDir, 'og-image.png'));
    console.log('✅ og-image.png (1200x630)');

    console.log('\n✨ Génération terminée !');
    console.log(`📁 Icônes → ${iconsDir}`);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
};

generateIcons();