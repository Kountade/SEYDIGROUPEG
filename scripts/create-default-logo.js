// scripts/create-default-logo.js
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logo SVG StockAcha avec "SA"
const svg = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e40af;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#grad)"/>
  <text x="256" y="320" font-size="200" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">SA</text>
  <text x="256" y="400" font-size="48" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="Arial, sans-serif" font-weight="bold">StockAcha</text>
  <circle cx="256" cy="256" r="240" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="8"/>
</svg>
`;

// ✅ Chemin modifié : public/logo.png
const outputPath = path.join(__dirname, '..', 'public', 'logo.png');

// Créer le dossier public s'il n'existe pas
const publicDir = path.dirname(outputPath);
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('🎨 Création du logo StockAcha...');

sharp(Buffer.from(svg))
  .png({
    quality: 95,
    compressionLevel: 9
  })
  .toFile(outputPath)
  .then(() => {
    console.log('✅ Logo créé avec succès !');
    console.log(`📁 Fichier : ${outputPath}`);
    console.log('🔄 Exécutez maintenant : npm run generate-icons');
  })
  .catch(err => {
    console.error('❌ Erreur:', err.message);
  });