// src/components/sales/FacturePDF.jsx
import jsPDF from 'jspdf';
import logoSvg from '../../assets/logo.svg';

// ========== FONCTION POUR ÉCRIRE LES NOMBRES EN LETTRES ==========
const nombreEnLettres = (montant) => {
  const unite = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const dizaine = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
  const centaine = ['', 'cent', 'deux cents', 'trois cents', 'quatre cents', 'cinq cents', 'six cents', 'sept cents', 'huit cents', 'neuf cents'];

  const sousBloc = (n) => {
    if (n === 0) return '';
    let lettres = '';
    const cents = Math.floor(n / 100);
    const reste = n % 100;
    if (cents > 0) {
      lettres += centaine[cents];
      if (reste > 0) lettres += ' ';
    }
    if (reste > 0) {
      if (reste < 10) lettres += unite[reste];
      else if (reste < 20) {
        const u = reste - 10;
        if (u === 0) lettres += 'dix';
        else if (u === 1) lettres += 'onze';
        else if (u === 2) lettres += 'douze';
        else if (u === 3) lettres += 'treize';
        else if (u === 4) lettres += 'quatorze';
        else if (u === 5) lettres += 'quinze';
        else if (u === 6) lettres += 'seize';
        else lettres += dizaine[1] + (u ? '-' + unite[u] : '');
      } else {
        const d = Math.floor(reste / 10);
        const u = reste % 10;
        if (d === 7 || d === 9) {
          lettres += dizaine[d - 1] + '-' + (u === 0 ? '' : (u === 1 ? 'onze' : unite[u + 10]));
        } else {
          lettres += dizaine[d];
          if (u === 1 && d !== 8) lettres += ' et un';
          else if (u > 0) lettres += '-' + unite[u];
        }
      }
    }
    return lettres.trim();
  };

  const milliers = Math.floor(montant / 1000);
  const resteMilliers = montant % 1000;
  let result = '';
  if (milliers > 0) {
    if (milliers === 1) result += 'mille';
    else result += sousBloc(milliers) + ' mille';
    if (resteMilliers > 0) result += ' ';
  }
  if (resteMilliers > 0) result += sousBloc(resteMilliers);
  if (result === '') result = 'zéro';
  return result.charAt(0).toUpperCase() + result.slice(1) + ' Francs CFA';
};

// ========== FONCTIONS DE FORMATAGE ==========
const formatNumber = (n) => {
  const num = parseFloat(n) || 0;
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

const formatCurrency = (amt) => `${formatNumber(amt)} FCFA`;

const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

// ========== FONCTION POUR AJOUTER UN FILIGRANE OBLIQUE ==========
const addWatermark = (doc, text, options = {}) => {
  const {
    fontSize = 40,
    color = [200, 200, 200],
    opacity = 0.15,
    angle = -45,
    repeat = true,
    spacing = 100
  } = options;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  const currentFontSize = doc.internal.getFontSize();
  const currentTextColor = doc.internal.getTextColor();
  
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(color[0], color[1], color[2]);
  
  doc.setGState(new doc.GState({ opacity: opacity }));
  
  const diagonal = Math.sqrt(pageWidth * pageWidth + pageHeight * pageHeight);
  const textWidth = doc.getTextWidth(text);
  
  const numX = Math.ceil((diagonal + textWidth) / (textWidth + spacing));
  const numY = Math.ceil(diagonal / spacing);
  
  const offsetX = (pageWidth - numX * (textWidth + spacing)) / 2;
  const offsetY = (pageHeight - numY * spacing) / 2;
  
  if (!repeat) {
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;
    doc.text(text, centerX, centerY, { 
      align: 'center',
      angle: angle,
      baseline: 'middle'
    });
  } else {
    for (let i = 0; i < numY; i++) {
      for (let j = 0; j < numX; j++) {
        const x = offsetX + j * (textWidth + spacing);
        const y = offsetY + i * spacing;
        doc.text(text, x, y, {
          angle: angle,
          baseline: 'middle'
        });
      }
    }
  }
  
  doc.setFontSize(currentFontSize);
  doc.setTextColor(currentTextColor[0], currentTextColor[1], currentTextColor[2]);
  doc.setGState(new doc.GState({ opacity: 1 }));
};

// ========== FONCTION DE TÉLÉCHARGEMENT PRINCIPALE ==========
const FacturePDF = async (facture, options = {}) => {
  if (!facture || typeof facture !== 'object') {
    throw new Error('Données de la facture invalides');
  }

  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const pageHeight = 297;
    const margins = { left: 15, right: 15, top: 18, bottom: 18 };
    const contentWidth = pageWidth - margins.left - margins.right;
    let y = margins.top;

    // ========== INFORMATIONS DE L'ENTREPRISE ==========
    const company = {
      name: 'SEYDI GROUP SARL',
      address: 'Dakar, Sénégal',
      phone: '+221 33 123 45 67',
      email: 'contact@seydigroup.com',
      rccm: 'SN DKR 2023 B 123',
      capital: '10 000 000 FCFA'
    };

    // ========== DONNÉES CLIENT ==========
    const client = facture.client || {};
    const clientNom = client.raison_sociale || client.nom || 'Client inconnu';
    const clientPrenom = client.prenom || '';
    const clientFull = clientPrenom ? `${clientNom} ${clientPrenom}` : clientNom;
    const clientEmail = client.email || '';
    const clientTel = client.telephone || '';
    const clientAdr = client.adresse || '';

    // ========== DONNÉES FACTURE ==========
    const reference = facture.reference || 'Sans référence';
    const dateFacture = facture.date_facture || new Date().toISOString().split('T')[0];
    const dateEcheance = facture.date_echeance || '';
    const typeFacture = facture.type_facture || 'finale';
    const agenceNom = facture.agence?.nom || 'Agence principale';
    const statusFacture = facture.status || 'draft';

    const items = facture.items || [];
    const sousTotal = parseFloat(facture.sous_total) || 0;
    const total = parseFloat(facture.total_ttc) || parseFloat(facture.total) || 0;
    const montantPaye = parseFloat(facture.montant_paye) || 0;
    const montantRestant = parseFloat(facture.montant_restant) || (total - montantPaye);
    const conditionsPaiement = facture.conditions_paiement || 'Paiement à 30 jours';
    const notes = facture.notes || '';

    const totalEnLettres = nombreEnLettres(total);

    // Libellé du type de facture
    const typeFactureLabel = typeFacture === 'proforma' ? 'Proforma' :
                              typeFacture === 'avoir' ? 'Avoir' : 'Finale';

    // Libellé du statut
    const statusLabels = {
      draft: 'Brouillon',
      sent: 'Envoyée',
      paid: 'Payée',
      partially_paid: 'Partiellement payée',
      overdue: 'En retard',
      cancelled: 'Annulée'
    };
    const statusLabel = statusLabels[statusFacture] || statusFacture;
    
    // Couleur du statut
    const statusColors = {
      draft: [150, 150, 150],
      sent: [255, 152, 0],
      paid: [76, 175, 80],
      partially_paid: [33, 150, 243],
      overdue: [244, 67, 54],
      cancelled: [150, 150, 150]
    };
    const statusColor = statusColors[statusFacture] || [150, 150, 150];

    // ========== CHARGEMENT DU LOGO ==========
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

    // Filigrane
    const watermarkText = options.watermark || 'FACTURE';
    const watermarkOptions = {
      fontSize: options.watermarkSize || 40,
      color: options.watermarkColor || [200, 200, 200],
      opacity: options.watermarkOpacity || 0.15,
      angle: options.watermarkAngle || -45,
      repeat: options.watermarkRepeat !== undefined ? options.watermarkRepeat : true,
      spacing: options.watermarkSpacing || 100
    };

    // ================================================================
    // EN-TÊTE
    // ================================================================
    const logoWidth = 26;
    const logoHeight = 26;
    
    if (logoData) {
      doc.addImage(logoData, 'PNG', margins.left, y, logoWidth, logoHeight);
    } else {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(company.name, margins.left, y + 5);
    }

    const textStartX = margins.left + logoWidth + 7;
    doc.setFontSize(13.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 35, 126);
    doc.text(company.name, textStartX, y + 5.5);
    
    doc.setFontSize(7.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(84, 110, 122);
    doc.text(`Capital social : ${company.capital}`, textStartX, y + 10.5);
    doc.text(`N° RCCM : ${company.rccm}`, textStartX, y + 14.5);
    doc.text(company.address.toUpperCase(), textStartX, y + 18.5);
    
    doc.setFontSize(13.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 35, 126);
    doc.text('FACTURE', pageWidth - margins.right, y + 5.5, { align: 'right' });
    
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(84, 110, 122);
    doc.text(`N° ${reference}`, pageWidth - margins.right, y + 10.5, { align: 'right' });
    doc.text(`Émise le ${formatDate(dateFacture)}`, pageWidth - margins.right, y + 14.5, { align: 'right' });

    y += 27;
    doc.setDrawColor(26, 35, 126);
    doc.setLineWidth(0.4);
    doc.line(margins.left, y, pageWidth - margins.right, y);
    y += 8;

    // ================================================================
    // GRILLE D'INFORMATIONS (5 colonnes)
    // ================================================================
    const gridY = y;
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(margins.left, gridY, contentWidth, 18, 2, 2, 'F');
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(0.5);
    doc.roundedRect(margins.left, gridY, contentWidth, 18, 2, 2, 'S');

    const colWidth = contentWidth / 5;
    const gridX1 = margins.left;
    const gridX2 = margins.left + colWidth;
    const gridX3 = margins.left + colWidth * 2;
    const gridX4 = margins.left + colWidth * 3;
    const gridX5 = margins.left + colWidth * 4;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 144, 156);
    
    doc.text('DATE', gridX1 + 4, gridY + 4.5);
    doc.text('ÉCHÉANCE', gridX2 + 4, gridY + 4.5);
    doc.text('TYPE', gridX3 + 4, gridY + 4.5);
    doc.text('AGENCE', gridX4 + 4, gridY + 4.5);
    doc.text('STATUT', gridX5 + 4, gridY + 4.5);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 35, 126);
    doc.text(formatDate(dateFacture), gridX1 + 4, gridY + 12);
    doc.text(dateEcheance ? formatDate(dateEcheance) : '-', gridX2 + 4, gridY + 12);
    doc.text(typeFactureLabel, gridX3 + 4, gridY + 12);
    doc.text(agenceNom, gridX4 + 4, gridY + 12);
    
    // Statut avec couleur
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(statusLabel, gridX5 + 4, gridY + 12);
    doc.setTextColor(26, 35, 126);

    y = gridY + 22;

    // ================================================================
    // INFORMATIONS CLIENT
    // ================================================================
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 35, 126);
    doc.text('INFORMATIONS CLIENT', margins.left, y);
    y += 2;
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(0.5);
    doc.line(margins.left, y, pageWidth - margins.right, y);
    y += 6;

    const clientY = y;
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(margins.left, clientY, contentWidth, 30, 2, 2, 'F');
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(0.5);
    doc.roundedRect(margins.left, clientY, contentWidth, 30, 2, 2, 'S');

    let clientRowY = clientY + 4;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(84, 110, 122);
    doc.text('Nom / Raison sociale', margins.left + 6, clientRowY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(26, 35, 126);
    doc.text(clientFull, margins.left + 50, clientRowY);

    clientRowY += 6;
    if (clientEmail) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(84, 110, 122);
      doc.text('Email', margins.left + 6, clientRowY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(26, 35, 126);
      doc.text(clientEmail, margins.left + 50, clientRowY);
      clientRowY += 6;
    }
    if (clientTel) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(84, 110, 122);
      doc.text('Téléphone', margins.left + 6, clientRowY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(26, 35, 126);
      doc.text(clientTel, margins.left + 50, clientRowY);
      clientRowY += 6;
    }
    if (clientAdr) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(84, 110, 122);
      doc.text('Adresse', margins.left + 6, clientRowY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(26, 35, 126);
      const adrLines = doc.splitTextToSize(clientAdr, contentWidth - 56);
      doc.text(adrLines, margins.left + 50, clientRowY);
    }

    y = clientY + 34;

    // ================================================================
    // TABLEAU DES ARTICLES - Réf. AVANT Désignation
    // ================================================================
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 35, 126);
    doc.text('ARTICLES', margins.left, y);
    y += 2;
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(0.5);
    doc.line(margins.left, y, pageWidth - margins.right, y);
    y += 6;

    // ✅ COLONNES : Réf. | Désignation | Qté | Prix unit. | Remise | Total
    const colRefX = margins.left;                    // Réf. commence à la marge gauche
    const colDescX = margins.left + 22;              // Désignation après Réf. (22mm)
    const colQtyX = margins.left + 90;               // Qté après Désignation (68mm)
    const colPriceX = margins.left + 105;            // Prix unit. après Qté (15mm)
    const colRemiseX = margins.left + 128;           // Remise après Prix unit. (23mm)
    const colTotalX = pageWidth - margins.right - 2; // Total aligné à droite

    const headerY = y;
    doc.setFillColor(26, 35, 126);
    doc.roundedRect(colRefX, headerY, contentWidth, 7, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Réf.', colRefX + 3, headerY + 4.5);
    doc.text('Désignation', colDescX + 3, headerY + 4.5);
    doc.text('Qté', colQtyX + 3, headerY + 4.5);
    doc.text('Prix unit.', colPriceX + 3, headerY + 4.5);
    doc.text('Remise', colRemiseX + 3, headerY + 4.5);
    doc.text('Total', colTotalX - 3, headerY + 4.5, { align: 'right' });

    y = headerY + 7;
    let currentY = y;
    let rowIndex = 0;

    if (items.length === 0) {
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text('Aucun article dans cette facture.', colRefX + 3, currentY + 5);
      currentY += 10;
    } else {
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        const productName = item.product_name || item.product?.name || 'Produit inconnu';
        const productRef = item.product_reference || item.product?.reference || '-';
        const qty = item.quantity || 0;
        const price = parseFloat(item.prix_unitaire) || 0;
        const remise = parseFloat(item.remise) || 0;
        const itemTotal = parseFloat(item.total) || (qty * price - remise);

        if (currentY > pageHeight - 60) {
          doc.addPage();
          addWatermark(doc, watermarkText, watermarkOptions);
          
          currentY = margins.top;
          doc.setFillColor(26, 35, 126);
          doc.roundedRect(colRefX, currentY, contentWidth, 7, 2, 2, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          doc.text('Réf.', colRefX + 3, currentY + 4.5);
          doc.text('Désignation', colDescX + 3, currentY + 4.5);
          doc.text('Qté', colQtyX + 3, currentY + 4.5);
          doc.text('Prix unit.', colPriceX + 3, currentY + 4.5);
          doc.text('Remise', colRemiseX + 3, currentY + 4.5);
          doc.text('Total', colTotalX - 3, currentY + 4.5, { align: 'right' });
          currentY += 7;
        }

        // Fond alterné
        if (rowIndex % 2 === 0) {
          doc.setFillColor(248, 249, 250);
          doc.rect(colRefX, currentY - 0.5, contentWidth, 6.5, 'F');
        }

        // Lignes verticales
        doc.setDrawColor(224, 224, 224);
        doc.setLineWidth(0.1);
        doc.line(colRefX, currentY, colRefX, currentY + 6);
        doc.line(colDescX, currentY, colDescX, currentY + 6);
        doc.line(colQtyX, currentY, colQtyX, currentY + 6);
        doc.line(colPriceX, currentY, colPriceX, currentY + 6);
        doc.line(colRemiseX, currentY, colRemiseX, currentY + 6);
        doc.line(colTotalX, currentY, colTotalX, currentY + 6);

        // Texte des cellules
        doc.setTextColor(33, 33, 33);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');

        // Troncature du nom si trop long
        const maxDescWidth = colQtyX - colDescX - 6;
        let displayName = productName;
        if (doc.getTextWidth(displayName) > maxDescWidth) {
          while (doc.getTextWidth(displayName + '...') > maxDescWidth && displayName.length > 3) {
            displayName = displayName.slice(0, -1);
          }
          displayName += '...';
        }

        // Troncature de la référence si trop longue
        const maxRefWidth = colDescX - colRefX - 6;
        let displayRef = productRef;
        if (doc.getTextWidth(displayRef) > maxRefWidth) {
          while (doc.getTextWidth(displayRef + '...') > maxRefWidth && displayRef.length > 3) {
            displayRef = displayRef.slice(0, -1);
          }
          displayRef += '...';
        }

        doc.text(displayRef, colRefX + 3, currentY + 4);
        doc.text(displayName, colDescX + 3, currentY + 4);
        doc.text(qty.toString(), colQtyX + 3, currentY + 4);
        doc.text(formatCurrency(price), colPriceX + 3, currentY + 4);
        doc.text(remise > 0 ? formatCurrency(remise) : '-', colRemiseX + 3, currentY + 4);
        
        const totalText = formatCurrency(itemTotal);
        const maxWidth = colTotalX - colRemiseX - 6;
        if (doc.getTextWidth(totalText) > maxWidth) {
          doc.setFontSize(6.5);
          doc.text(totalText, colTotalX - 3, currentY + 4, { align: 'right' });
          doc.setFontSize(7.5);
        } else {
          doc.text(totalText, colTotalX - 3, currentY + 4, { align: 'right' });
        }

        currentY += 6.5;
        rowIndex++;
      }
    }

    doc.setDrawColor(180, 180, 190);
    doc.setLineWidth(0.3);
    doc.line(colRefX, currentY, pageWidth - margins.right, currentY);
    y = currentY + 5;

    // ================================================================
    // TOTAUX - Style structuré
    // ================================================================
    let ay = y;

    // 1. Bloc TOTAL
    const amountBoxWidth = 70;
    const amountBoxX = pageWidth - margins.right - amountBoxWidth;
    const amountBoxHeight = 12;

    doc.setFillColor(26, 35, 126);
    doc.roundedRect(amountBoxX - 7, ay - 2, amountBoxWidth + 8, amountBoxHeight, 2, 2, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL', amountBoxX + 4, ay + 6);

    const totalFormatted = formatCurrency(total);
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    let fontSizeTotal = 12;
    let textWidthTotal = doc.getTextWidth(totalFormatted);
    if (textWidthTotal > amountBoxWidth - 10) {
      fontSizeTotal = 10;
      doc.setFontSize(fontSizeTotal);
      if (doc.getTextWidth(totalFormatted) > amountBoxWidth - 10) {
        fontSizeTotal = 8;
        doc.setFontSize(fontSizeTotal);
      }
    }
    doc.text(totalFormatted, amountBoxX + amountBoxWidth, ay + 6, { align: 'right' });

    ay += amountBoxHeight + 4;

    // 2. Détails des totaux (Sous-total, Payé, Restant)
    const detailsBoxHeight = 20;
    const detailsBoxWidth = 90;
    const detailsBoxX = pageWidth - margins.right - detailsBoxWidth;
    
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(detailsBoxX, ay, detailsBoxWidth, detailsBoxHeight, 2, 2, 'F');
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(0.5);
    doc.roundedRect(detailsBoxX, ay, detailsBoxWidth, detailsBoxHeight, 2, 2, 'S');

    let detailY = ay + 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(84, 110, 122);
    doc.text('Sous-total', detailsBoxX + 4, detailY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(33, 33, 33);
    doc.text(formatCurrency(sousTotal), detailsBoxX + detailsBoxWidth - 4, detailY, { align: 'right' });

    detailY += 5;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(84, 110, 122);
    doc.text('Montant payé', detailsBoxX + 4, detailY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(76, 175, 80);
    doc.text(formatCurrency(montantPaye), detailsBoxX + detailsBoxWidth - 4, detailY, { align: 'right' });

    detailY += 5;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(84, 110, 122);
    doc.text('Reste à payer', detailsBoxX + 4, detailY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(244, 67, 54);
    doc.text(formatCurrency(montantRestant), detailsBoxX + detailsBoxWidth - 4, detailY, { align: 'right' });

    ay += detailsBoxHeight + 4;

    // 3. Montant en toutes lettres
    const lettresBoxHeight = 14;
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(margins.left, ay, contentWidth, lettresBoxHeight, 2, 2, 'F');
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(0.5);
    doc.roundedRect(margins.left, ay, contentWidth, lettresBoxHeight, 2, 2, 'S');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(84, 110, 122);
    doc.text('Montant en toutes lettres :', margins.left + 6, ay + 9);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(33, 33, 33);

    const lettresStartX = margins.left + 65;
    const lettresAvailableWidth = contentWidth - 70;

    let lettresFontSize = 8;
    doc.setFontSize(lettresFontSize);
    let lettresWidth = doc.getTextWidth(totalEnLettres);

    while (lettresWidth > lettresAvailableWidth && lettresFontSize > 5) {
      lettresFontSize -= 0.5;
      doc.setFontSize(lettresFontSize);
      lettresWidth = doc.getTextWidth(totalEnLettres);
    }

    if (lettresWidth > lettresAvailableWidth) {
      const splitLettres = doc.splitTextToSize(totalEnLettres, lettresAvailableWidth);
      doc.text(splitLettres, lettresStartX, ay + 5);
    } else {
      doc.text(totalEnLettres, lettresStartX, ay + 9);
    }

    ay += lettresBoxHeight + 6;

    // 4. Conditions de paiement
    if (conditionsPaiement && conditionsPaiement !== 'Paiement à 30 jours') {
      const condBoxHeight = 14;
      doc.setFillColor(232, 234, 246);
      doc.roundedRect(margins.left, ay, contentWidth, condBoxHeight, 2, 2, 'F');
      doc.setDrawColor(197, 202, 233);
      doc.setLineWidth(0.5);
      doc.roundedRect(margins.left, ay, contentWidth, condBoxHeight, 2, 2, 'S');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 35, 126);
      doc.text('CONDITIONS DE PAIEMENT', margins.left + 6, ay + 4.5);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(66, 66, 66);
      const splitCond = doc.splitTextToSize(conditionsPaiement, contentWidth - 12);
      doc.text(splitCond, margins.left + 6, ay + 10);
      
      ay += condBoxHeight + 4;
    }

    // 5. Notes
    if (notes && typeof notes === 'string' && notes.trim()) {
      const notesBoxHeight = 20;
      doc.setFillColor(255, 248, 230);
      doc.roundedRect(margins.left, ay, contentWidth, notesBoxHeight, 2, 2, 'F');
      doc.setDrawColor(255, 204, 128);
      doc.setLineWidth(0.5);
      doc.roundedRect(margins.left, ay, contentWidth, notesBoxHeight, 2, 2, 'S');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(230, 81, 0);
      doc.text('NOTES', margins.left + 6, ay + 5);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(66, 66, 66);
      const splitNotes = doc.splitTextToSize(notes, contentWidth - 12);
      doc.text(splitNotes, margins.left + 6, ay + 12);
      
      ay += notesBoxHeight + 6;
    }

    y = ay;

    // ================================================================
    // SIGNATURES
    // ================================================================
    const signatureY = y + 8;
    const signatureWidth = 85;
    const signatureX1 = margins.left;
    const signatureX2 = pageWidth - margins.right - signatureWidth;

    doc.setDrawColor(66, 66, 66);
    doc.setLineWidth(0.5);
    doc.line(signatureX1, signatureY + 5, signatureX1 + signatureWidth, signatureY + 5);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(84, 110, 122);
    doc.text('Signature du client', signatureX1 + (signatureWidth / 2), signatureY, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 144, 156);
    doc.text('Nom et date', signatureX1 + (signatureWidth / 2), signatureY + 12, { align: 'center' });

    doc.line(signatureX2, signatureY + 5, signatureX2 + signatureWidth, signatureY + 5);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(84, 110, 122);
    doc.text('Signature de l\'entreprise', signatureX2 + (signatureWidth / 2), signatureY, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 144, 156);
    doc.text(company.name, signatureX2 + (signatureWidth / 2), signatureY + 12, { align: 'center' });

    y = signatureY + 20;

    // ================================================================
    // PIED DE PAGE
    // ================================================================
    const footerY = pageHeight - margins.bottom - 10;
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(0.5);
    doc.line(margins.left, footerY - 5, pageWidth - margins.right, footerY - 5);
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 144, 156);
    doc.text('SEYDI GROUP SARL - DAKAR, SÉNÉGAL', pageWidth / 2, footerY, { align: 'center' });
    doc.text(`Tél: ${company.phone} - Email: ${company.email}`, pageWidth / 2, footerY + 4, { align: 'center' });
    doc.text(`RCCM: ${company.rccm} | Capital: ${company.capital}`, pageWidth / 2, footerY + 8, { align: 'center' });

    // ================================================================
    // NUMÉROTATION DES PAGES ET FILIGRANE FINAL
    // ================================================================
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      addWatermark(doc, watermarkText, watermarkOptions);
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 170);
      doc.text(`Page ${i}/${pageCount}`, pageWidth - margins.right, pageHeight - margins.bottom, { align: 'right' });
    }

    // Sauvegarde du PDF
    const filename = options.filename || `Facture_${reference}.pdf`;
    doc.save(filename);
    return true;

  } catch (error) {
    console.error('Erreur FacturePDF:', error);
    throw error;
  }
};

// ========== FONCTION DE TÉLÉCHARGEMENT ALTERNATIVE (pour usage dans React) ==========
export const downloadFacturePDF = async (facture, filename = null) => {
  return FacturePDF(facture, { filename });
};

// Export par défaut
export default FacturePDF;