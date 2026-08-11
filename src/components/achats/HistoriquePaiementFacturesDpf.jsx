// src/components/achats/HistoriquePaiementFacturesDpf.js
import jsPDF from 'jspdf';
import logoSvg from '../../assets/logo.svg';

// ========== FONCTIONS DE FORMATAGE ==========
const formatNumber = (n) => {
  const num = parseFloat(n) || 0;
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

const formatCurrency = (amt) => {
  const num = parseFloat(amt) || 0;
  return `${formatNumber(num)} FCFA`;
};

const formatDate = (d) => {
  if (!d) return '-';
  try {
    let date;
    if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = d.split('-').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(d);
    }
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return '-';
  }
};

const formatDateTime = (d) => {
  if (!d) return '-';
  try {
    const date = new Date(d);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return d;
  }
};

// ========== FONCTIONS UTILITAIRES ==========
const getMethodLabel = (method) => {
  const labels = {
    cash: 'Espèces',
    bank_transfer: 'Virement bancaire',
    check: 'Chèque',
    card: 'Carte bancaire',
    mobile_money: 'Mobile Money',
    other: 'Autre'
  };
  return labels[method] || method || 'Non spécifié';
};

const getStatusInfo = (status) => {
  const map = {
    pending: { label: 'En attente', color: [255, 152, 0], bg: [255, 243, 224] },
    processing: { label: 'En cours', color: [33, 150, 243], bg: [227, 242, 253] },
    completed: { label: 'Terminé', color: [76, 175, 80], bg: [232, 245, 233] },
    failed: { label: 'Échoué', color: [244, 67, 54], bg: [255, 235, 238] },
    cancelled: { label: 'Annulé', color: [117, 117, 117], bg: [245, 245, 245] }
  };
  return map[status] || map.pending;
};

// ========== FONCTION POUR AJOUTER UN FILIGRANE OBLIQUE ==========
const addWatermark = (doc, text, options = {}) => {
  const {
    fontSize = 40,
    color = [200, 200, 200],
    opacity = 0.08,
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

// ========== COMPOSANT PRINCIPAL ==========
const HistoriquePaiementFacturesDpf = async (facture, paiements, options = {}) => {
  if (!facture || typeof facture !== 'object') {
    throw new Error('Données de la facture invalides');
  }

  if (!paiements || !Array.isArray(paiements)) {
    throw new Error('Les données des paiements sont invalides');
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
      name: 'SEYDI GROUP',
      address: 'Dakar, Sénégal',
      phone: '+221 33 800 00 00',
      email: 'contact@seydigroup.sn',
      rccm: '2025/G/001',
      nif: '123456789',
      capital: '50 000 000 FCFA'
    };

    // ========== DONNÉES DE LA FACTURE ==========
    const data = facture || {};
    const payments = paiements || [];
    const statusInfo = getStatusInfo(data.status);

    const invoiceNumber = data.invoice_number || `INV-${String(data.id || '').padStart(4, '0')}`;
    const supplierName = data.supplier?.company_name || data.supplier_name || 'Non spécifié';
    const dueDate = data.due_date || '';
    const totalFacture = parseFloat(data.total) || 0;

    // Calcul des totaux
    const totalPaye = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    
    const totalRestant = totalFacture - totalPaye;
    const pourcentagePaye = totalFacture > 0 ? (totalPaye / totalFacture) * 100 : 0;

    // Statistiques supplémentaires
    const paymentStats = {
      total: payments.length,
      completed: payments.filter(p => p.status === 'completed').length,
      pending: payments.filter(p => p.status === 'pending').length,
      failed: payments.filter(p => p.status === 'failed' || p.status === 'cancelled').length,
      totalAmount: payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
    };

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
    const watermarkText = options.watermark || 'HISTORIQUE DES PAIEMENTS';
    const watermarkOptions = {
      fontSize: options.watermarkSize || 40,
      color: options.watermarkColor || [200, 200, 200],
      opacity: options.watermarkOpacity || 0.08,
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
    }

    const textStartX = margins.left + logoWidth + 7;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 35, 126);
    doc.text(company.name, textStartX, y + 6);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(84, 110, 122);
    doc.text(`S.A.R.L au capital de ${company.capital}`, textStartX, y + 12);
    doc.text(`RC: ${company.rccm} - NIF: ${company.nif}`, textStartX, y + 17);
    doc.text(company.address.toUpperCase(), textStartX, y + 22);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 35, 126);
    doc.text('HISTORIQUE DES PAIEMENTS', pageWidth - margins.right, y + 6, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(84, 110, 122);
    doc.text(`Facture N° ${invoiceNumber}`, pageWidth - margins.right, y + 12, { align: 'right' });
    doc.text(`Émis le ${formatDateTime(new Date().toISOString())}`, pageWidth - margins.right, y + 17, { align: 'right' });

    y += 30;
    doc.setDrawColor(26, 35, 126);
    doc.setLineWidth(0.4);
    doc.line(margins.left, y, pageWidth - margins.right, y);
    y += 8;

    // ================================================================
    // GRILLE D'INFORMATIONS - FACTURE
    // ================================================================
    const gridY = y;
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(margins.left, gridY, contentWidth, 18, 2, 2, 'F');
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(0.5);
    doc.roundedRect(margins.left, gridY, contentWidth, 18, 2, 2, 'S');

    const colWidth = contentWidth / 4;
    const gridX1 = margins.left;
    const gridX2 = margins.left + colWidth;
    const gridX3 = margins.left + colWidth * 2;
    const gridX4 = margins.left + colWidth * 3;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 144, 156);
    
    doc.text('FOURNISSEUR', gridX1 + 4, gridY + 4.5);
    doc.text('N° FACTURE', gridX2 + 4, gridY + 4.5);
    doc.text("DATE D'ÉCHÉANCE", gridX3 + 4, gridY + 4.5);
    doc.text('STATUT', gridX4 + 4, gridY + 4.5);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 35, 126);
    doc.text(supplierName, gridX1 + 4, gridY + 12);
    doc.text(invoiceNumber, gridX2 + 4, gridY + 12);
    doc.text(formatDate(dueDate), gridX3 + 4, gridY + 12);

    // Badge de statut
    const statusX = gridX4 + 4;
    const statusY = gridY + 5;
    const statusW = 45;
    const statusH = 10;
    doc.setFillColor(statusInfo.bg[0], statusInfo.bg[1], statusInfo.bg[2]);
    doc.setDrawColor(statusInfo.color[0], statusInfo.color[1], statusInfo.color[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(statusX, statusY, statusW, statusH, 2, 2, 'FD');
    
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(statusInfo.color[0], statusInfo.color[1], statusInfo.color[2]);
    doc.text(statusInfo.label.toUpperCase(), statusX + statusW / 2, statusY + 7, { align: 'center' });

    y = gridY + 22;

    // ================================================================
    // RÉSUMÉ DES PAIEMENTS
    // ================================================================
    const summaryY = y;
    const summaryHeight = 18;
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(margins.left, summaryY, contentWidth, summaryHeight, 2, 2, 'F');
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(0.5);
    doc.roundedRect(margins.left, summaryY, contentWidth, summaryHeight, 2, 2, 'S');

    const sumColWidth = contentWidth / 4;
    const sumX1 = margins.left;
    const sumX2 = margins.left + sumColWidth;
    const sumX3 = margins.left + sumColWidth * 2;
    const sumX4 = margins.left + sumColWidth * 3;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 144, 156);
    
    doc.text('Total paiements', sumX1 + 6, summaryY + 7);
    doc.text('Terminés', sumX2 + 6, summaryY + 7);
    doc.text('En attente', sumX3 + 6, summaryY + 7);
    doc.text('Échoués/Annulés', sumX4 + 6, summaryY + 7);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 35, 126);
    doc.text(paymentStats.total.toString(), sumX1 + 6, summaryY + 15);
    doc.setTextColor(76, 175, 80);
    doc.text(paymentStats.completed.toString(), sumX2 + 6, summaryY + 15);
    doc.setTextColor(255, 152, 0);
    doc.text(paymentStats.pending.toString(), sumX3 + 6, summaryY + 15);
    doc.setTextColor(244, 67, 54);
    doc.text(paymentStats.failed.toString(), sumX4 + 6, summaryY + 15);

    y = summaryY + summaryHeight + 8;

    // ================================================================
    // BARRE DE PROGRESSION
    // ================================================================
    if (totalFacture > 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(84, 110, 122);
      doc.text('Progression du paiement', margins.left, y);
      
      const progressText = `${Math.round(pourcentagePaye)}%`;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 35, 126);
      doc.text(progressText, pageWidth - margins.right, y, { align: 'right' });
      
      y += 4;
      
      // Barre de progression
      const barX = margins.left;
      const barY = y;
      const barWidth = contentWidth;
      const barHeight = 6;
      
      doc.setFillColor(224, 224, 224);
      doc.roundedRect(barX, barY, barWidth, barHeight, 3, 3, 'F');
      
      const fillWidth = Math.min((pourcentagePaye / 100) * barWidth, barWidth);
      if (fillWidth > 0) {
        doc.setFillColor(76, 175, 80);
        doc.roundedRect(barX, barY, fillWidth, barHeight, 3, 3, 'F');
      }
      
      y += barHeight + 8;
    }

    // ================================================================
    // TABLEAU DES PAIEMENTS
    // ================================================================
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 35, 126);
    doc.text('LISTE DES PAIEMENTS', margins.left, y);
    y += 2;
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(0.5);
    doc.line(margins.left, y, pageWidth - margins.right, y);
    y += 6;

    if (payments.length === 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(120, 144, 156);
      doc.text('Aucun paiement enregistré pour cette facture', pageWidth / 2, y + 10, { align: 'center' });
      y += 20;
    } else {
      // Colonnes
      const colNumX = margins.left;
      const colDateX = margins.left + 18;
      const colMethodX = margins.left + 48;
      const colRefX = margins.left + 88;
      const colStatusX = margins.left + 118;
      const colAmountX = pageWidth - margins.right - 2;

      // En-tête du tableau
      const headerY = y;
      doc.setFillColor(232, 234, 246);
      doc.rect(colNumX, headerY, contentWidth, 7, 'F');
      doc.setDrawColor(197, 202, 233);
      doc.setLineWidth(0.5);
      doc.line(colNumX, headerY + 7, pageWidth - margins.right, headerY + 7);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 35, 126);
      doc.text('N°', colNumX + 3, headerY + 4.5);
      doc.text('Date', colDateX + 3, headerY + 4.5);
      doc.text('Méthode', colMethodX + 3, headerY + 4.5);
      doc.text('Référence', colRefX + 3, headerY + 4.5);
      doc.text('Statut', colStatusX + 3, headerY + 4.5);
      doc.text('Montant', colAmountX - 3, headerY + 4.5, { align: 'right' });

      y = headerY + 7;
      let currentY = y;
      let rowIndex = 0;

      for (let idx = 0; idx < payments.length; idx++) {
        const payment = payments[idx];
        const pStatus = getStatusInfo(payment.status);

        if (currentY > pageHeight - 70) {
          doc.addPage();
          addWatermark(doc, watermarkText, watermarkOptions);
          
          currentY = margins.top;
          doc.setFillColor(232, 234, 246);
          doc.rect(colNumX, currentY, contentWidth, 7, 'F');
          doc.setDrawColor(197, 202, 233);
          doc.setLineWidth(0.5);
          doc.line(colNumX, currentY + 7, pageWidth - margins.right, currentY + 7);

          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(26, 35, 126);
          doc.text('N°', colNumX + 3, currentY + 4.5);
          doc.text('Date', colDateX + 3, currentY + 4.5);
          doc.text('Méthode', colMethodX + 3, currentY + 4.5);
          doc.text('Référence', colRefX + 3, currentY + 4.5);
          doc.text('Statut', colStatusX + 3, currentY + 4.5);
          doc.text('Montant', colAmountX - 3, currentY + 4.5, { align: 'right' });
          currentY += 7;
        }

        // Alternance des couleurs
        if (rowIndex % 2 === 0) {
          doc.setFillColor(255, 255, 255);
          doc.rect(colNumX, currentY - 0.5, contentWidth, 6.5, 'F');
        } else {
          doc.setFillColor(250, 250, 250);
          doc.rect(colNumX, currentY - 0.5, contentWidth, 6.5, 'F');
        }

        doc.setDrawColor(224, 224, 224);
        doc.setLineWidth(0.1);
        doc.line(colNumX, currentY, pageWidth - margins.right, currentY);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(66, 66, 66);
        
        // N°
        doc.text((idx + 1).toString(), colNumX + 3, currentY + 4);
        
        // Date
        doc.text(formatDate(payment.payment_date), colDateX + 3, currentY + 4);
        
        // Méthode
        doc.text(getMethodLabel(payment.payment_method), colMethodX + 3, currentY + 4);
        
        // Référence
        const refText = payment.reference_number || payment.payment_number || '-';
        const refMaxWidth = colStatusX - colRefX - 6;
        let refDisplay = refText;
        if (doc.getTextWidth(refText) > refMaxWidth) {
          refDisplay = refText.substring(0, Math.floor(refMaxWidth / 4)) + '...';
        }
        doc.text(refDisplay, colRefX + 3, currentY + 4);
        
        // Statut - badge
        const badgeX = colStatusX + 3;
        const badgeY = currentY + 0.5;
        const badgeW = 35;
        const badgeH = 7;
        doc.setFillColor(pStatus.bg[0], pStatus.bg[1], pStatus.bg[2]);
        doc.setDrawColor(pStatus.color[0], pStatus.color[1], pStatus.color[2]);
        doc.setLineWidth(0.3);
        doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2, 2, 'FD');
        
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(pStatus.color[0], pStatus.color[1], pStatus.color[2]);
        doc.text(pStatus.label.toUpperCase(), badgeX + badgeW / 2, badgeY + 5, { align: 'center' });
        
        // Montant
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 35, 126);
        doc.setFontSize(8);
        const amountText = formatCurrency(payment.amount);
        const amountMaxWidth = colAmountX - colStatusX - 6;
        if (doc.getTextWidth(amountText) > amountMaxWidth) {
          doc.setFontSize(6.5);
          doc.text(amountText, colAmountX - 3, currentY + 4, { align: 'right' });
          doc.setFontSize(8);
        } else {
          doc.text(amountText, colAmountX - 3, currentY + 4, { align: 'right' });
        }

        currentY += 6.5;
        rowIndex++;
      }

      doc.setDrawColor(180, 180, 190);
      doc.setLineWidth(0.3);
      doc.line(colNumX, currentY, pageWidth - margins.right, currentY);
      y = currentY + 5;

      // ================================================================
      // TOTAL GÉNÉRAL
      // ================================================================
      const totalRowHeight = 10;
      doc.setFillColor(232, 234, 246);
      doc.rect(colNumX, y, contentWidth, totalRowHeight, 'F');
      doc.setDrawColor(197, 202, 233);
      doc.setLineWidth(0.5);
      doc.line(colNumX, y + totalRowHeight, pageWidth - margins.right, y + totalRowHeight);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 35, 126);
      doc.text('TOTAL GÉNÉRAL', colNumX + 6, y + 7);

      const totalFormatted = formatCurrency(paymentStats.totalAmount);
      doc.text(totalFormatted, colAmountX - 3, y + 7, { align: 'right' });

      y += totalRowHeight + 8;
    }

    // ================================================================
    // RÉCAPITULATIF DES MONTANTS
    // ================================================================
    const recapBoxHeight = 20;
    doc.setFillColor(232, 234, 246);
    doc.roundedRect(margins.left, y, contentWidth, recapBoxHeight, 2, 2, 'F');
    doc.setDrawColor(197, 202, 233);
    doc.setLineWidth(0.5);
    doc.roundedRect(margins.left, y, contentWidth, recapBoxHeight, 2, 2, 'S');

    const recapColWidth = contentWidth / 3;
    const rX1 = margins.left;
    const rX2 = margins.left + recapColWidth;
    const rX3 = margins.left + recapColWidth * 2;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 35, 126);
    doc.text('MONTANT TOTAL', rX1 + 6, y + 7);
    doc.text('TOTAL PAYÉ', rX2 + 6, y + 7);
    doc.text('RESTANT DÛ', rX3 + 6, y + 7);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(84, 110, 122);
    doc.text(formatCurrency(totalFacture), rX1 + 6, y + 15);
    doc.setTextColor(76, 175, 80);
    doc.text(formatCurrency(totalPaye), rX2 + 6, y + 15);
    doc.setTextColor(totalRestant > 0 ? 244 : 76, totalRestant > 0 ? 67 : 175, totalRestant > 0 ? 54 : 80);
    doc.text(formatCurrency(totalRestant), rX3 + 6, y + 15);

    y += recapBoxHeight + 8;

    // ================================================================
    // DÉTAIL DES TOTAUX
    // ================================================================
    const detailHeight = 20;
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margins.left, y, contentWidth, detailHeight, 2, 2, 'F');

    const detailColWidth = contentWidth / 4;
    const dX1 = margins.left;
    const dX2 = margins.left + detailColWidth;
    const dX3 = margins.left + detailColWidth * 2;
    const dX4 = margins.left + detailColWidth * 3;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 35, 126);
    doc.text('DÉTAIL DES PAIEMENTS', margins.left + 6, y + 6);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(84, 110, 122);
    
    doc.text('Total paiements', dX1 + 6, y + 14);
    doc.text('Terminés', dX2 + 6, y + 14);
    doc.text('En attente', dX3 + 6, y + 14);
    doc.text('Échoués/Annulés', dX4 + 6, y + 14);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 35, 126);
    doc.text(paymentStats.total.toString(), dX1 + 6, y + 18);
    doc.setTextColor(76, 175, 80);
    doc.text(paymentStats.completed.toString(), dX2 + 6, y + 18);
    doc.setTextColor(255, 152, 0);
    doc.text(paymentStats.pending.toString(), dX3 + 6, y + 18);
    doc.setTextColor(244, 67, 54);
    doc.text(paymentStats.failed.toString(), dX4 + 6, y + 18);

    y += detailHeight + 8;

    // ================================================================
    // SIGNATURES
    // ================================================================
    const signatureY = y + 8;
    const signatureWidth = 80;
    const signatureX1 = margins.left;
    const signatureX2 = pageWidth - margins.right - signatureWidth;

    doc.setDrawColor(66, 66, 66);
    doc.setLineWidth(0.5);
    doc.line(signatureX1, signatureY + 5, signatureX1 + signatureWidth, signatureY + 5);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(84, 110, 122);
    doc.text('Signature du fournisseur', signatureX1 + (signatureWidth / 2), signatureY, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 144, 156);
    doc.text(`Date: ${formatDate(new Date().toISOString())}`, signatureX1 + (signatureWidth / 2), signatureY + 12, { align: 'center' });

    doc.line(signatureX2, signatureY + 5, signatureX2 + signatureWidth, signatureY + 5);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(84, 110, 122);
    doc.text('Signature SEYDI GROUP', signatureX2 + (signatureWidth / 2), signatureY, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 144, 156);
    doc.text('Responsable financier', signatureX2 + (signatureWidth / 2), signatureY + 12, { align: 'center' });

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
    doc.text(`${company.name} - ${company.address}`, pageWidth / 2, footerY, { align: 'center' });
    doc.text(`Tél: ${company.phone} - Email: ${company.email}`, pageWidth / 2, footerY + 4, { align: 'center' });
    doc.text(`RC: ${company.rccm} - NIF: ${company.nif}`, pageWidth / 2, footerY + 8, { align: 'center' });

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

    const filename = options.filename || `Historique_paiements_${invoiceNumber}.pdf`;
    doc.save(filename);
    return true;

  } catch (error) {
    console.error('Erreur HistoriquePaiementFacturesDpf:', error);
    throw error;
  }
};

// ========== FONCTION DE TÉLÉCHARGEMENT ==========
export const downloadHistoriquePaiementFacturesDpf = async (facture, paiements, filename = null) => {
  try {
    if (!facture || typeof facture !== 'object') {
      throw new Error('Les données de la facture sont invalides');
    }

    if (!paiements || !Array.isArray(paiements)) {
      throw new Error('Les données des paiements sont invalides');
    }

    const options = {};
    if (filename) options.filename = filename;
    
    const result = await HistoriquePaiementFacturesDpf(facture, paiements, options);
    return result;
  } catch (error) {
    console.error('Erreur lors du téléchargement de l\'historique des paiements :', error);
    throw error;
  }
};

// Export par défaut
export default HistoriquePaiementFacturesDpf;