// scripts/create-og-image.js
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e40af;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#grad)"/>
  <text x="600" y="280" font-size="120" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">SA</text>
  <text x="600" y="400" font-size="72" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">StockAcha</text>
  <text x="600" y="480" font-size="32" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="Arial, sans-serif">Votre stock, notre logistique, votre tranquillité</text>
</svg>
`;

const outputPath = path.join(__dirname, '..', 'public', 'og-image.png');

console.log('🎨 Création de og-image.png...');

sharp(Buffer.from(svg))
  .png({ quality: 90 })
  .toFile(outputPath)
  .then(() => console.log('✅ og-image.png créé !'))
  .catch(err => console.error('❌ Erreur:', err.message));