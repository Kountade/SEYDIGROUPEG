// src/components/expenses/ExpensePDF.js
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

// ========== FONCTION POUR OBTENIR LE STATUT ==========
const getStatusInfo = (status) => {
  const map = {
    pending: { label: 'En attente', color: [255, 152, 0], bg: [255, 243, 224] },
    approved: { label: 'Validé', color: [76, 175, 80], bg: [232, 245, 233] },
    paid: { label: 'Payé', color: [33, 150, 243], bg: [227, 242, 253] },
    rejected: { label: 'Rejeté', color: [244, 67, 54], bg: [255, 235, 238] },
    cancelled: { label: 'Annulé', color: [117, 117, 117], bg: [245, 245, 245] },
  };
  return map[status] || map.pending;
};

// ========== FONCTION POUR OBTENIR LE TYPE ==========
const getTypeLabel = (type) => {
  const labels = {
    transport: 'Transport',
    meal: 'Repas',
    accommodation: 'Hébergement',
    supplies: 'Fournitures',
    client: 'Client',
    other: 'Autre'
  };
  return labels[type] || type || 'Non spécifié';
};

// ========== COMPOSANT PRINCIPAL ==========
const ExpensePDF = async (expense, options = {}) => {
  if (!expense || typeof expense !== 'object') {
    throw new Error('Données de la note de frais invalides');
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
      address: 'Conakry, République de Guinée',
      phone: '+224 600 00 00 00',
      email: 'contact@seydigroup.gn',
      rccm: 'GN.TCC.2024.B01789',
      capital: '10 000 000 FG'
    };

    // ========== DONNÉES DE LA NOTE ==========
    const data = expense || {};
    const statusInfo = getStatusInfo(data.status);
    const typeLabel = getTypeLabel(data.expense_type);

    const reference = data.reference || `EXP-${String(data.id || '').padStart(4, '0')}`;
    const employeeName = data.employee_name || data.employee?.full_name || 'Non spécifié';
    const date = data.date || new Date().toISOString().split('T')[0];
    const description = data.description || 'Sans description';
    const amount = parseFloat(data.amount) || 0;
    const approvedByName = data.approved_by_name || '';
    const paymentDate = data.payment_date || '';
    const rejectionReason = data.rejection_reason || '';
    const comments = data.comments || '';
    const hasReceipt = data.receipt || false;

    const totalEnLettres = nombreEnLettres(amount);

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
    const watermarkText = options.watermark || 'NOTE DE FRAIS';
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
    doc.text('NOTE DE FRAIS', pageWidth - margins.right, y + 5.5, { align: 'right' });
    
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(84, 110, 122);
    doc.text(`N° ${reference}`, pageWidth - margins.right, y + 10.5, { align: 'right' });
    doc.text(`Émis le ${formatDate(new Date().toISOString())}`, pageWidth - margins.right, y + 14.5, { align: 'right' });

    y += 27;
    doc.setDrawColor(26, 35, 126);
    doc.setLineWidth(0.4);
    doc.line(margins.left, y, pageWidth - margins.right, y);
    y += 8;

    // ================================================================
    // GRILLE D'INFORMATIONS
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
    
    doc.text('EMPLOYÉ', gridX1 + 4, gridY + 4.5);
    doc.text('TYPE DE FRAIS', gridX2 + 4, gridY + 4.5);
    doc.text('DATE DE LA DÉPENSE', gridX3 + 4, gridY + 4.5);
    doc.text('STATUT', gridX4 + 4, gridY + 4.5);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 35, 126);
    doc.text(employeeName, gridX1 + 4, gridY + 12);
    doc.text(typeLabel, gridX2 + 4, gridY + 12);
    doc.text(formatDate(date), gridX3 + 4, gridY + 12);

    // Badge de statut
    const statusX = gridX4 + 4;
    const statusY = gridY + 5;
    const statusW = 40;
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
    // DÉTAILS DE LA NOTE
    // ================================================================
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 35, 126);
    doc.text('DÉTAILS DE LA NOTE', margins.left, y);
    y += 2;
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(0.5);
    doc.line(margins.left, y, pageWidth - margins.right, y);
    y += 6;

    const detailY = y;
    const detailBoxHeight = (approvedByName || paymentDate) ? 30 : 24;
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(margins.left, detailY, contentWidth, detailBoxHeight, 2, 2, 'F');
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(0.5);
    doc.roundedRect(margins.left, detailY, contentWidth, detailBoxHeight, 2, 2, 'S');

    let detailRowY = detailY + 4;
    const detailLabelX = margins.left + 6;
    const detailValueX = margins.left + 55;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(84, 110, 122);
    doc.text('Description', detailLabelX, detailRowY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(26, 35, 126);
    const descLines = doc.splitTextToSize(description, contentWidth - 60);
    doc.text(descLines, detailValueX, detailRowY);

    detailRowY += Math.max(6, descLines.length * 5);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(84, 110, 122);
    doc.text('Montant', detailLabelX, detailRowY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(26, 35, 126);
    doc.text(formatCurrency(amount), detailValueX, detailRowY);

    detailRowY += 6;
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(84, 110, 122);
    doc.text('Catégorie', detailLabelX, detailRowY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(26, 35, 126);
    doc.text(typeLabel, detailValueX, detailRowY);

    if (approvedByName) {
      detailRowY += 6;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(84, 110, 122);
      doc.text('Validé par', detailLabelX, detailRowY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(26, 35, 126);
      doc.text(approvedByName, detailValueX, detailRowY);
    }

    if (paymentDate) {
      detailRowY += 6;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(84, 110, 122);
      doc.text('Date de paiement', detailLabelX, detailRowY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(26, 35, 126);
      doc.text(formatDate(paymentDate), detailValueX, detailRowY);
    }

    y = detailY + detailBoxHeight + 8;

    // ================================================================
    // MONTANT TOTAL
    // ================================================================
    const amountBoxHeight = 18;
    doc.setFillColor(232, 234, 246);
    doc.roundedRect(margins.left, y, contentWidth, amountBoxHeight, 2, 2, 'F');
    doc.setDrawColor(197, 202, 233);
    doc.setLineWidth(0.5);
    doc.roundedRect(margins.left, y, contentWidth, amountBoxHeight, 2, 2, 'S');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 35, 126);
    doc.text('MONTANT TOTAL', margins.left + 8, y + 12);

    const montantFormatted = formatCurrency(amount);
    doc.setFontSize(16);
    doc.setTextColor(26, 35, 126);
    let fontSizeMontant = 16;
    let textWidthMontant = doc.getTextWidth(montantFormatted);
    if (textWidthMontant > 70) {
      fontSizeMontant = 14;
      doc.setFontSize(fontSizeMontant);
      if (doc.getTextWidth(montantFormatted) > 70) {
        fontSizeMontant = 12;
        doc.setFontSize(fontSizeMontant);
      }
    }
    doc.text(montantFormatted, pageWidth - margins.right - 8, y + 12, { align: 'right' });

    y += amountBoxHeight + 6;

    // ================================================================
    // MONTANT EN TOUTES LETTRES
    // ================================================================
    const lettresBoxHeight = 14;
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(margins.left, y, contentWidth, lettresBoxHeight, 2, 2, 'F');
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(0.5);
    doc.roundedRect(margins.left, y, contentWidth, lettresBoxHeight, 2, 2, 'S');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(84, 110, 122);
    doc.text('Montant en toutes lettres :', margins.left + 6, y + 9);

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
      doc.text(splitLettres, lettresStartX, y + 5);
    } else {
      doc.text(totalEnLettres, lettresStartX, y + 9);
    }

    y += lettresBoxHeight + 8;

    // ================================================================
    // MOTIF DE REJET
    // ================================================================
    if (data.status === 'rejected' && rejectionReason && typeof rejectionReason === 'string' && rejectionReason.trim()) {
      const rejectBoxHeight = 20;
      doc.setFillColor(255, 235, 238);
      doc.roundedRect(margins.left, y, contentWidth, rejectBoxHeight, 2, 2, 'F');
      doc.setDrawColor(244, 67, 54);
      doc.setLineWidth(0.5);
      doc.roundedRect(margins.left, y, contentWidth, rejectBoxHeight, 2, 2, 'S');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(198, 40, 40);
      doc.text('Motif du rejet', margins.left + 6, y + 5);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(66, 66, 66);
      const splitReject = doc.splitTextToSize(rejectionReason, contentWidth - 12);
      doc.text(splitReject, margins.left + 6, y + 12);
      
      y += rejectBoxHeight + 8;
    }

    // ================================================================
    // COMMENTAIRES
    // ================================================================
    if (comments && typeof comments === 'string' && comments.trim() && data.status !== 'rejected') {
      const commentsBoxHeight = 20;
      doc.setFillColor(255, 243, 224);
      doc.roundedRect(margins.left, y, contentWidth, commentsBoxHeight, 2, 2, 'F');
      doc.setDrawColor(255, 204, 128);
      doc.setLineWidth(0.5);
      doc.roundedRect(margins.left, y, contentWidth, commentsBoxHeight, 2, 2, 'S');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(230, 81, 0);
      doc.text('Commentaires', margins.left + 6, y + 5);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(66, 66, 66);
      const splitComments = doc.splitTextToSize(comments, contentWidth - 12);
      doc.text(splitComments, margins.left + 6, y + 12);
      
      y += commentsBoxHeight + 8;
    }

    // ================================================================
    // REÇU
    // ================================================================
    if (hasReceipt) {
      const receiptBoxHeight = 16;
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(margins.left, y, contentWidth, receiptBoxHeight, 2, 2, 'F');
      doc.setDrawColor(224, 224, 224);
      doc.setLineWidth(0.5);
      doc.setLineDashPattern([2, 2]);
      doc.roundedRect(margins.left, y, contentWidth, receiptBoxHeight, 2, 2, 'S');
      doc.setLineDashPattern([]);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(84, 110, 122);
      doc.text('Un reçu est joint à cette note de frais', pageWidth / 2, y + 10, { align: 'center' });
      
      y += receiptBoxHeight + 8;
    }

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
    doc.text("Signature de l'employé", signatureX1 + (signatureWidth / 2), signatureY, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 144, 156);
    doc.text(`Date: ${formatDate(date)}`, signatureX1 + (signatureWidth / 2), signatureY + 12, { align: 'center' });

    doc.line(signatureX2, signatureY + 5, signatureX2 + signatureWidth, signatureY + 5);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(84, 110, 122);
    doc.text("Signature de l'employeur", signatureX2 + (signatureWidth / 2), signatureY, { align: 'center' });
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
    doc.text(`${company.name} - ${company.address}`, pageWidth / 2, footerY, { align: 'center' });
    doc.text(`Tél: ${company.phone} - Email: ${company.email}`, pageWidth / 2, footerY + 4, { align: 'center' });
    doc.text(`RCCM: ${company.rccm}`, pageWidth / 2, footerY + 8, { align: 'center' });

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

    doc.save(`Note_frais_${reference}.pdf`);
    return true;

  } catch (error) {
    console.error('Erreur ExpensePDF:', error);
    throw error;
  }
};

// ========== FONCTION DE TÉLÉCHARGEMENT ==========
export const downloadExpensePDF = async (expense, filename = null) => {
  try {
    if (!expense || typeof expense !== 'object') {
      throw new Error('Les données de la note de frais sont invalides');
    }

    const result = await ExpensePDF(expense);
    return result;
  } catch (error) {
    console.error('Erreur lors du téléchargement de la note de frais :', error);
    throw error;
  }
};

// Export par défaut
export default ExpensePDF;