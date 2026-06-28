// scripts/create-default-logo.js
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Créer un logo SVG simple avec "SG" (Seydi Group)
const svg = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#grad)"/>
  <text x="256" y="340" font-size="280" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">SG</text>
  <circle cx="256" cy="256" r="240" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="8"/>
</svg>
`;

const outputPath = path.join(__dirname, '..', 'logo.png');

console.log('🎨 Création du logo...');

sharp(Buffer.from(svg))
  .png({
    quality: 95,
    compressionLevel: 9
  })
  .toFile(outputPath)
  .then(() => {
    console.log('✅ Logo créé avec succès !');
    console.log(`📁 Fichier : ${outputPath}`);
    console.log('🔄 Vous pouvez maintenant exécuter : npm run generate-icons');
  })
  .catch(err => {
    console.error('❌ Erreur lors de la création du logo:', err.message);
  });