// scripts/generate-icons.js
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Pour ESM modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tailles d'icônes à générer
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Chemin vers votre logo source
// Placez un fichier logo.png à la racine du projet frontend
const sourceImage = path.join(__dirname, '..', 'logo.png');

// Dossier de destination
const outputDir = path.join(__dirname, '..', 'public', 'icons');

// Vérifier si le dossier source existe
if (!fs.existsSync(sourceImage)) {
  console.error('❌ Logo source non trouvé !');
  console.log(`📁 Veuillez placer votre logo à : ${sourceImage}`);
  console.log('📝 Formats supportés: PNG, JPG, SVG');
  console.log('📌 Exemple: Placez logo.png dans le dossier frontend/');
  
  // Créer un logo par défaut si vous voulez
  console.log('\n💡 Alternative: Créez un logo simple avec ce script');
  process.exit(1);
}

// Créer le dossier de destination s'il n'existe pas
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`📁 Dossier créé : ${outputDir}`);
}

console.log('🎨 Génération des icônes en cours...');

// Générer les icônes
sizes.forEach(async (size) => {
  const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
  
  try {
    await sharp(sourceImage)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png({
        quality: 90,
        compressionLevel: 9
      })
      .toFile(outputPath);
    
    console.log(`✅ Icon ${size}x${size} générée`);
  } catch (error) {
    console.error(`❌ Erreur pour ${size}x${size}:`, error.message);
  }
});

console.log('✨ Génération terminée !');