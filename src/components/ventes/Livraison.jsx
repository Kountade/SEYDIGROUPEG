// src/components/ventes/Livraison.jsx
import jsPDF from 'jspdf';
import logoSvg from '../../assets/logo.svg';

/**
 * Extrait un nombre depuis une chaîne ou un nombre, en supprimant tous les caractères non numériques
 * (slashs, lettres, espaces) et en convertissant la virgule en point.
 * Exemples : "1/526" → 1526, "8/260 FCFA" → 8260, "8 400" → 8400
 */
const cleanNumber = (value) => {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value !== 'string') return 0;
  // 1. Supprimer tout ce qui n'est pas chiffre, point ou virgule
  let cleaned = value.replace(/[^\d.,]/g, '');
  // 2. Remplacer la virgule par un point (pour les décimaux)
  cleaned = cleaned.replace(/,/g, '.');
  // 3. Supprimer les points de séparation des milliers (pour éviter les confusions)
  cleaned = cleaned.replace(/\.(?=\d{3})/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Formate un nombre avec espaces comme séparateurs de milliers et pas de décimales (entier).
 * Exemple : 8400 → "8 400"
 */
const formatNumber = (n) => {
  const num = cleanNumber(n);
  // Arrondir à l'entier le plus proche (car FCFA n'a pas de centimes)
  const rounded = Math.round(num);
  return new Intl.NumberFormat('fr-FR').format(rounded);
};

const formatCurrency = (amt) => `${formatNumber(amt)} FCFA`;

const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';
const formatDateTime = (d) => d ? new Date(d).toLocaleString('fr-FR') : '-';

// ⚠️ ICI : j'ai renommé la fonction en "Livraison"
const Livraison = async (vente, options = {}) => {
  if (!vente || typeof vente !== 'object') {
    throw new Error('Données de la vente invalides');
  }

  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    const pageWidth = 210;
    const pageHeight = 297;
    const margins = { left: 18, right: 18, top: 12, bottom: 15 };
    const contentWidth = pageWidth - margins.left - margins.right;
    let y = margins.top;

    const company = {
      name: 'SEYDI GROUP SARL',
      address: 'Dakar, Sénégal',
      phone: '+221 33 123 45 67',
      email: 'contact@seydigroup.com',
      rccm: 'SN DKR 2023 B 123',
      capital: '10 000 000 FCFA'
    };

    // Données client
    const client = vente.client || {};
    const clientNom = client.raison_sociale || client.nom || 'Client anonyme';
    const clientPrenom = client.prenom || '';
    const clientFull = clientPrenom ? `${clientNom} ${clientPrenom}` : clientNom;
    const clientEmail = client.email || '';
    const clientTel = client.telephone || '';
    const clientAdr = client.adresse || '';
    const clientTva = client.numero_tva || '';

    // Données vente
    const reference = vente.reference || 'Sans référence';
    const dateVente = vente.date_vente;
    const typeVente = vente.type_vente || 'comptoir';
    const agenceNom = vente.agence?.nom || 'Agence principale';
    const vendeurNom = vente.vendeur?.email || vente.vendeur_nom || 'Commercial';
    
    // Options livraison
    const dateLivraison = options.date_livraison || '';
    const adresseLivraison = options.adresse_livraison || clientAdr;
    const contactLivraison = options.contact_livraison || clientTel;
    const instructions = options.instructions || '';
    
    // Articles et totaux (nettoyage systématique)
    const items = vente.items || [];
    const sousTotal = cleanNumber(vente.sous_total);
    const tva = cleanNumber(vente.tva);
    const total = cleanNumber(vente.total);
    
    const blReference = `BL-${reference}`;

    // Logo
    const loadLogo = (src) => new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
    let logoData = null;
    try { logoData = await loadLogo(logoSvg); } catch { /* ignore */ }

    // ========== 1. EN-TÊTE ==========
    const logoW = 30, logoH = 13;
    if (logoData) doc.addImage(logoData, 'PNG', margins.left, y, logoW, logoH);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text(company.name, margins.left + logoW + 4, y + 4);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(company.address, margins.left + logoW + 4, y + 9);
    doc.setFontSize(6);
    doc.text(`RCCM: ${company.rccm} | Capital: ${company.capital}`, margins.left + logoW + 4, y + 13);
    y += 20;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('BON DE LIVRAISON', pageWidth - margins.right - 45, y - 5);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`N° ${blReference}`, pageWidth - margins.right - 45, y - 1);
    
    doc.setDrawColor(180, 180, 180);
    doc.line(margins.left, y, pageWidth - margins.right, y);
    y += 5;

    // ========== 2. INFORMATIONS VENTE ==========
    const infoH = 32;
    doc.setFillColor(248, 248, 248);
    doc.rect(margins.left, y, contentWidth, infoH, 'F');
    doc.setDrawColor(160, 160, 160);
    doc.rect(margins.left, y, contentWidth, infoH, 'S');
    doc.setFillColor(220, 220, 220);
    doc.rect(margins.left, y, contentWidth, 6, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('INFORMATIONS DE LA VENTE', margins.left + 5, y + 4.5);

    const col1 = margins.left + 10;
    const col2 = margins.left + 105;
    let iy = y + 11;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(70, 70, 70);
    doc.text('Vente N° :', col1, iy);
    doc.setFont('helvetica', 'normal');
    doc.text(reference, col1 + 20, iy);
    iy += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Date :', col1, iy);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(dateVente), col1 + 14, iy);
    iy += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Type :', col1, iy);
    doc.setFont('helvetica', 'normal');
    doc.text(typeVente === 'comptoir' ? 'Comptoir' : typeVente === 'livraison' ? 'Livraison' : 'En ligne', col1 + 14, iy);
    
    iy = y + 11;
    doc.setFont('helvetica', 'bold');
    doc.text('Agence :', col2, iy);
    doc.setFont('helvetica', 'normal');
    doc.text(agenceNom, col2 + 18, iy);
    iy += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Vendeur :', col2, iy);
    doc.setFont('helvetica', 'normal');
    doc.text(vendeurNom, col2 + 20, iy);
    
    y += infoH + 5;

    // ========== 3. CLIENT ==========
    let clientH = 28;
    if (clientEmail || clientTel || clientAdr) clientH = 38;
    if (clientTva) clientH += 6;
    
    doc.setFillColor(248, 248, 248);
    doc.rect(margins.left, y, contentWidth, clientH, 'F');
    doc.setDrawColor(160, 160, 160);
    doc.rect(margins.left, y, contentWidth, clientH, 'S');
    doc.setFillColor(220, 220, 220);
    doc.rect(margins.left, y, contentWidth, 6, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('CLIENT', margins.left + 5, y + 4.5);
    
    let cy = y + 10;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(70, 70, 70);
    doc.text('Nom :', col1, cy);
    doc.setFont('helvetica', 'normal');
    doc.text(clientFull.substring(0, 35), col1 + 14, cy);
    cy += 5.5;
    
    if (clientEmail) {
      doc.setFont('helvetica', 'bold');
      doc.text('Email :', col1, cy);
      doc.setFont('helvetica', 'normal');
      doc.text(clientEmail.substring(0, 35), col1 + 17, cy);
      cy += 5.5;
    }
    if (clientTel) {
      doc.setFont('helvetica', 'bold');
      doc.text('Tél :', col1, cy);
      doc.setFont('helvetica', 'normal');
      doc.text(clientTel, col1 + 13, cy);
      cy += 5.5;
    }
    if (clientAdr) {
      doc.setFont('helvetica', 'bold');
      doc.text('Adresse :', col1, cy);
      doc.setFont('helvetica', 'normal');
      const adrLines = doc.splitTextToSize(clientAdr, 60);
      doc.text(adrLines, col1 + 18, cy);
      cy += adrLines.length * 4;
    }
    if (clientTva) {
      doc.setFont('helvetica', 'bold');
      doc.text('N° TVA :', col1, cy);
      doc.setFont('helvetica', 'normal');
      doc.text(clientTva, col1 + 18, cy);
    }
    
    y += clientH + 5;

    // ========== 4. LIVRAISON ==========
    const livraisonH = dateLivraison ? 28 : 22;
    doc.setFillColor(248, 248, 248);
    doc.rect(margins.left, y, contentWidth, livraisonH, 'F');
    doc.setDrawColor(160, 160, 160);
    doc.rect(margins.left, y, contentWidth, livraisonH, 'S');
    doc.setFillColor(220, 220, 220);
    doc.rect(margins.left, y, contentWidth, 6, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('DESTINATAIRE / LIVRAISON', margins.left + 5, y + 4.5);
    
    let ly = y + 11;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(70, 70, 70);
    doc.text('Adresse :', col1, ly);
    doc.setFont('helvetica', 'normal');
    const adrLivraison = adresseLivraison || 'À retirer en magasin';
    const adrLines = doc.splitTextToSize(adrLivraison, 60);
    doc.text(adrLines, col1 + 18, ly);
    ly += adrLines.length * 4 + 2;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Contact :', col1, ly);
    doc.setFont('helvetica', 'normal');
    doc.text(contactLivraison || '-', col1 + 18, ly);
    
    if (dateLivraison) {
      ly += 5.5;
      doc.setFont('helvetica', 'bold');
      doc.text('Date prévue :', col1, ly);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(dateLivraison), col1 + 25, ly);
    }
    
    y += livraisonH + 5;

    // ========== 5. TABLEAU DES ARTICLES ==========
    const drawTableHeader = (currentY) => {
      doc.setFillColor(50, 50, 50);
      let x = margins.left;
      const cols = [60, 28, 20, 32, 34];
      cols.forEach((w, i) => {
        doc.rect(x, currentY, w, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        const headers = ['Désignation', 'Référence', 'Qté', 'Prix unit.', 'Total'];
        doc.text(headers[i], x + 2, currentY + 4.5);
        x += w;
      });
      return currentY + 7;
    };

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('ARTICLES À LIVRER', margins.left, y);
    y += 5;

    let tableY = drawTableHeader(y);
    y = tableY;
    
    const cols = [60, 28, 20, 32, 34];
    const bottomLimit = pageHeight - margins.bottom - 50;

    for (const item of items) {
      const productName = item.product_name || item.product?.name || 'Produit';
      const productRef = item.product_reference || item.product?.reference || '-';
      const quantity = item.quantity || 0;
      // Nettoyage systématique des prix
      const price = cleanNumber(item.prix_unitaire);
      const totalItem = cleanNumber(item.total) || (quantity * price);
      
      const maxWidthName = cols[0] - 4;
      const nameLines = doc.splitTextToSize(productName, maxWidthName);
      const rowHeight = Math.max(7, nameLines.length * 3.5 + 2);
      
      if (y + rowHeight > bottomLimit) {
        doc.addPage();
        y = margins.top;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.text('ARTICLES À LIVRER (suite)', margins.left, y);
        y += 5;
        y = drawTableHeader(y);
      }
      
      let xPos = margins.left;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      doc.text(nameLines, xPos + 2, y + 3);
      xPos += cols[0];
      
      doc.text(productRef.substring(0, 15), xPos + 2, y + 4);
      xPos += cols[1];
      
      doc.text(quantity.toString(), xPos + 2, y + 4);
      xPos += cols[2];
      
      const priceStr = formatCurrency(price);
      doc.text(priceStr, xPos + cols[3] - doc.getTextWidth(priceStr) - 2, y + 4);
      xPos += cols[3];
      
      const totalStr = formatCurrency(totalItem);
      doc.setFont('helvetica', 'bold');
      doc.text(totalStr, xPos + cols[4] - doc.getTextWidth(totalStr) - 2, y + 4);
      
      y += rowHeight + 1;
    }
    
    doc.setDrawColor(180, 180, 180);
    doc.line(margins.left, y, pageWidth - margins.right, y);
    y += 5;
    
    // ========== 6. TOTAUX ==========
    if (y + 40 > pageHeight - margins.bottom) {
      doc.addPage();
      y = margins.top;
    }
    
    const totalsRight = pageWidth - margins.right - 50;
    let ty = y;
    
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 70, 70);
    doc.text('Sous-total :', totalsRight - 30, ty);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(formatCurrency(sousTotal), totalsRight, ty);
    ty += 5;
    
    doc.setFont('helvetica', 'normal');
    doc.text('TVA (18%) :', totalsRight - 30, ty);
    doc.text(formatCurrency(tva), totalsRight, ty);
    ty += 5;
    
    doc.setDrawColor(180, 180, 180);
    doc.line(totalsRight - 35, ty, totalsRight + 40, ty);
    ty += 4;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('TOTAL TTC :', totalsRight - 35, ty);
    doc.setTextColor(40, 40, 120);
    doc.text(formatCurrency(total), totalsRight, ty);
    
    y = ty + 15;
    
    // ========== 7. INSTRUCTIONS ==========
    if (instructions) {
      if (y + 20 > pageHeight - margins.bottom) {
        doc.addPage();
        y = margins.top;
      }
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(70, 70, 70);
      doc.text('INSTRUCTIONS SPÉCIALES :', margins.left, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      const instrLines = doc.splitTextToSize(instructions, contentWidth);
      doc.text(instrLines, margins.left, y);
      y += instrLines.length * 4 + 5;
    }
    
    // ========== 8. SIGNATURES ==========
    if (y + 40 > pageHeight - margins.bottom) {
      doc.addPage();
      y = margins.top;
    }
    
    const signY = y + 5;
    doc.setDrawColor(160, 160, 160);
    doc.line(margins.left, signY, pageWidth - margins.right, signY);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(70, 70, 70);
    doc.text('VALIDATION DE LIVRAISON', pageWidth / 2, signY + 4, { align: 'center' });
    
    const sigW = (contentWidth - 12) / 2;
    const sigH = 25;
    const sigTop = signY + 8;
    
    doc.rect(margins.left, sigTop, sigW, sigH, 'S');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('LE DESTINATAIRE', margins.left + sigW / 2, sigTop + 4.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('Nom et signature', margins.left + 4, sigTop + 11);
    doc.text('Précédé de la mention', margins.left + 4, sigTop + 15.5);
    doc.text('"Bon pour réception"', margins.left + 4, sigTop + 19);
    doc.text(`Date: ${formatDate(new Date().toISOString())}`, margins.left + 4, sigTop + 23);
    
    const sigRight = margins.left + sigW + 12;
    doc.rect(sigRight, sigTop, sigW, sigH, 'S');
    doc.setFont('helvetica', 'bold');
    doc.text('L\'ENTREPRISE', sigRight + sigW / 2, sigTop + 4.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(company.name, sigRight + 4, sigTop + 11);
    doc.text('Signature et cachet', sigRight + 4, sigTop + 17);
    
    // ========== 9. PIED DE PAGE ==========
    const footY = pageHeight - margins.bottom - 6;
    doc.setDrawColor(200, 200, 200);
    doc.line(margins.left, footY - 3, pageWidth - margins.right, footY - 3);
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`${company.name} - ${company.address} - Tél: ${company.phone}`, pageWidth / 2, footY, { align: 'center' });
    doc.text(`RCCM: ${company.rccm} | Capital: ${company.capital}`, pageWidth / 2, footY + 3.5, { align: 'center' });
    doc.text(`Document généré le ${formatDateTime(new Date().toISOString())}`, pageWidth / 2, footY + 7, { align: 'center' });
    doc.text(`Bon de livraison N° ${blReference} - Vente ${reference}`, pageWidth / 2, footY + 10.5, { align: 'center' });

    doc.save(`Bon_livraison_${blReference}.pdf`);
    return true;

  } catch (error) {
    console.error('Erreur Livraison:', error); // ← message d'erreur mis à jour
    throw error;
  }
};

// ⚠️ EXPORT CORRIGÉ : maintenant le nom de la fonction et l'export coïncident
export default Livraison;