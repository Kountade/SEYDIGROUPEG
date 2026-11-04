// scripts/check-pwa.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Vérification PWA StockAcha...\n');

// ✅ Le manifest est généré par VitePWA dans dist/ au build
// En dev il n'existe pas physiquement, c'est normal
const manifestInDist = path.join(__dirname, '..', 'dist', 'manifest.webmanifest');
const manifestInPublic = path.join(__dirname, '..', 'public', 'manifest.webmanifest');

if (fs.existsSync(manifestInDist)) {
  const manifest = JSON.parse(fs.readFileSync(manifestInDist, 'utf8'));
  console.log('✅ manifest.webmanifest (généré par VitePWA dans dist/)');
  console.log(`   📛 Name: ${manifest.name}`);
  console.log(`   📛 Short Name: ${manifest.short_name}`);
  console.log(`   🖼️ Icons: ${manifest.icons?.length || 0}`);
} else if (fs.existsSync(manifestInPublic)) {
  const manifest = JSON.parse(fs.readFileSync(manifestInPublic, 'utf8'));
  console.log('✅ manifest.webmanifest (dans public/)');
  console.log(`   📛 Name: ${manifest.name}`);
  console.log(`   🖼️ Icons: ${manifest.icons?.length || 0}`);
} else {
  console.log('ℹ️  manifest.webmanifest pas encore généré');
  console.log('   → Il sera créé automatiquement au build (VitePWA)');
  console.log('   → Lancez : npm run build');
}

// Icônes
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
const requiredSizes = [16, 32, 72, 76, 96, 120, 128, 144, 152, 180, 192, 384, 512];
if (fs.existsSync(iconsDir)) {
  const icons = fs.readdirSync(iconsDir);
  console.log(`\n✅ Dossier icons: ${icons.length} fichiers`);
  const missing = requiredSizes.filter(s => !icons.includes(`icon-${s}x${s}.png`));
  if (missing.length > 0) {
    console.log(`⚠️  Manquants: ${missing.join(', ')}`);
  } else {
    console.log('✅ Toutes les icônes présentes');
  }
} else {
  console.log('❌ Dossier icons manquant');
}

const check = (file, label) => {
  const p = path.join(__dirname, '..', 'public', file);
  console.log(fs.existsSync(p) ? `✅ ${label}` : `❌ ${label} manquant`);
};

check('apple-touch-icon.png', 'apple-touch-icon.png');
check('favicon.svg', 'favicon.svg');
check('og-image.png', 'og-image.png');

console.log('\n✨ Vérification terminée !');