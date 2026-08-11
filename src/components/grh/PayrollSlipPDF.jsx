// src/components/drh/PayrollSlipPDF.js
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

// ========== COMPOSANT PRINCIPAL ==========
const PayrollSlipPDF = async (payroll, options = {}) => {
  if (!payroll || typeof payroll !== 'object') {
    throw new Error('Données du bulletin de paie invalides');
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

    // ========== DONNÉES DE LA PAIE ==========
    const data = payroll || {};
    
    // Récupération des données - NOMS EXACTS du modèle Payroll
    const baseSalary = parseFloat(data.base_salary) || 0;
    
    // Primes (augmentations)
    const performanceBonus = parseFloat(data.performance_bonus) || 0;
    const seniorityBonus = parseFloat(data.seniority_bonus) || 0;
    const overtimeAmount = parseFloat(data.overtime_amount) || 0;
    const transportBonus = parseFloat(data.transport_bonus) || 0;
    const phoneBonus = parseFloat(data.phone_bonus) || 0;
    const otherBonus = parseFloat(data.other_bonus) || 0;
    
    // Total des primes
    const totalBonuses = performanceBonus + seniorityBonus + overtimeAmount + 
                         transportBonus + phoneBonus + otherBonus;
    
    // Déductions (réductions)
    const socialSecurity = parseFloat(data.social_security) || 0;
    const incomeTax = parseFloat(data.income_tax) || 0;
    const pensionFund = parseFloat(data.pension_fund) || 0;
    const healthInsurance = parseFloat(data.health_insurance) || 0;
    const unpaidLeave = parseFloat(data.unpaid_leave) || 0;
    const otherDeductions = parseFloat(data.other_deductions) || 0;
    
    // Total des déductions
    const totalDeductions = socialSecurity + incomeTax + pensionFund + 
                            healthInsurance + unpaidLeave + otherDeductions;
    
    // Salaire brut et net
    const grossSalary = baseSalary + totalBonuses;
    const netSalary = grossSalary - totalDeductions;

    const employeeName = data.employee_name || data.employee?.full_name || 'Non spécifié';
    const employeeNumber = data.employee?.employee_number || data.employee_id || 'N/A';
    const period = `${data.month || 'MM'}/${data.year || 'YYYY'}`;
    const status = data.status_display || data.status || 'Brouillon';
    const payrollNumber = data.payroll_number || '2025/001';

    const totalEnLettres = nombreEnLettres(netSalary);

    // ========== CONSTRUCTION DES LIGNES DE PAIE ==========
    const payLines = [];
    
    // 1. Salaire de base
    if (baseSalary > 0) {
      payLines.push({ description: 'Salaire de base', amount: baseSalary });
    }
    
    // 2. Primes (augmentations)
    if (performanceBonus > 0) {
      payLines.push({ description: 'Prime de performance', amount: performanceBonus });
    }
    if (seniorityBonus > 0) {
      payLines.push({ description: "Prime d'ancienneté", amount: seniorityBonus });
    }
    if (overtimeAmount > 0) {
      payLines.push({ description: 'Heures supplémentaires', amount: overtimeAmount });
    }
    if (transportBonus > 0) {
      payLines.push({ description: 'Indemnité de transport', amount: transportBonus });
    }
    if (phoneBonus > 0) {
      payLines.push({ description: 'Indemnité téléphonique', amount: phoneBonus });
    }
    if (otherBonus > 0) {
      payLines.push({ description: 'Autres primes', amount: otherBonus });
    }
    
    // 3. Déductions (réductions) - montants négatifs
    if (socialSecurity > 0) {
      payLines.push({ description: 'CNSS (Sécurité sociale)', amount: -socialSecurity });
    }
    if (incomeTax > 0) {
      payLines.push({ description: 'IRPP (Impôt sur le revenu)', amount: -incomeTax });
    }
    if (pensionFund > 0) {
      payLines.push({ description: 'Fonds de pension', amount: -pensionFund });
    }
    if (healthInsurance > 0) {
      payLines.push({ description: 'Assurance santé', amount: -healthInsurance });
    }
    if (unpaidLeave > 0) {
      payLines.push({ description: 'Congé sans solde', amount: -unpaidLeave });
    }
    if (otherDeductions > 0) {
      payLines.push({ description: 'Autres déductions', amount: -otherDeductions });
    }

    // Si pas de données, afficher un message
    if (payLines.length === 0) {
      payLines.push({ description: 'Aucune donnée disponible', amount: 0 });
    }

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
    const watermarkText = options.watermark || 'BULLETIN DE PAIE';
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
    }

    const textStartX = margins.left + logoWidth + 7;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 35, 126);
    doc.text(company.name, textStartX, y + 6);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(84, 110, 122);
    doc.text(`Capital social : ${company.capital}`, textStartX, y + 12);
    doc.text(`N° RCCM : ${company.rccm}`, textStartX, y + 17);
    doc.text(company.address.toUpperCase(), textStartX, y + 22);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 35, 126);
    doc.text('BULLETIN DE PAIE', pageWidth - margins.right, y + 6, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(84, 110, 122);
    doc.text(`N° ${payrollNumber}`, pageWidth - margins.right, y + 12, { align: 'right' });
    doc.text(`Émis le ${formatDate(new Date().toISOString())}`, pageWidth - margins.right, y + 17, { align: 'right' });

    y += 30;
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
    doc.text('MATRICULE', gridX2 + 4, gridY + 4.5);
    doc.text('PÉRIODE', gridX3 + 4, gridY + 4.5);
    doc.text('STATUT', gridX4 + 4, gridY + 4.5);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 35, 126);
    doc.text(employeeName, gridX1 + 4, gridY + 12);
    doc.text(employeeNumber, gridX2 + 4, gridY + 12);
    doc.text(period, gridX3 + 4, gridY + 12);
    doc.text(status, gridX4 + 4, gridY + 12);

    y = gridY + 22;

    // ================================================================
    // DÉTAIL DES ÉMOLUMENTS
    // ================================================================
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 35, 126);
    doc.text('DÉTAIL DES ÉMOLUMENTS', margins.left, y);
    y += 2;
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(0.5);
    doc.line(margins.left, y, pageWidth - margins.right, y);
    y += 6;

    // Colonnes
    const colDescX = margins.left;
    const colBaseX = margins.left + 85;
    const colTauxX = margins.left + 115;
    const colAmountX = pageWidth - margins.right - 2;

    // En-tête du tableau
    const headerY = y;
    doc.setFillColor(26, 35, 126);
    doc.roundedRect(colDescX, headerY, contentWidth, 7, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Désignation', colDescX + 4, headerY + 4.5);
    doc.text('Base', colBaseX + 4, headerY + 4.5);
    doc.text('Taux', colTauxX + 4, headerY + 4.5);
    doc.text('Montant', colAmountX - 4, headerY + 4.5, { align: 'right' });

    y = headerY + 7;
    let currentY = y;
    let rowIndex = 0;

    for (let idx = 0; idx < payLines.length; idx++) {
      const line = payLines[idx];
      const isNegative = line.amount < 0;
      const isPositive = line.amount > 0 && idx > 0;

      if (currentY > pageHeight - 70) {
        doc.addPage();
        addWatermark(doc, watermarkText, watermarkOptions);
        
        currentY = margins.top;
        doc.setFillColor(26, 35, 126);
        doc.roundedRect(colDescX, currentY, contentWidth, 7, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('Désignation', colDescX + 4, currentY + 4.5);
        doc.text('Base', colBaseX + 4, currentY + 4.5);
        doc.text('Taux', colTauxX + 4, currentY + 4.5);
        doc.text('Montant', colAmountX - 4, currentY + 4.5, { align: 'right' });
        currentY += 7;
      }

      if (rowIndex % 2 === 0) {
        doc.setFillColor(248, 249, 250);
        doc.rect(colDescX, currentY - 0.5, contentWidth, 6.5, 'F');
      }

      doc.setDrawColor(224, 224, 224);
      doc.setLineWidth(0.1);
      doc.line(colDescX, currentY, colDescX, currentY + 6);
      doc.line(colBaseX, currentY, colBaseX, currentY + 6);
      doc.line(colTauxX, currentY, colTauxX, currentY + 6);
      doc.line(colAmountX, currentY, colAmountX, currentY + 6);

      // Description
      doc.setTextColor(isNegative ? [211, 47, 47] : isPositive ? [46, 125, 50] : [33, 33, 33]);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      let descText = line.description;
      if (isPositive) descText += ' ✚';
      if (isNegative) descText += ' ✖';
      doc.text(descText, colDescX + 4, currentY + 4);

      // Base
      doc.setTextColor(33, 33, 33);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(line.amount && idx === 0 ? formatCurrency(line.amount) : '-', colBaseX + 4, currentY + 4);

      // Taux
      doc.text(line.amount && idx === 0 ? '100%' : '-', colTauxX + 4, currentY + 4);

      // Montant
      const amountText = formatCurrency(line.amount);
      doc.setTextColor(isNegative ? [211, 47, 47] : isPositive ? [46, 125, 50] : [26, 35, 126]);
      doc.setFont('helvetica', isNegative ? 'normal' : 'bold');
      doc.text(amountText, colAmountX - 4, currentY + 4, { align: 'right' });

      currentY += 6.5;
      rowIndex++;
    }

    doc.setDrawColor(180, 180, 190);
    doc.setLineWidth(0.3);
    doc.line(colDescX, currentY, pageWidth - margins.right, currentY);
    y = currentY + 5;

    // ================================================================
    // TOTAUX
    // ================================================================
    let ay = y;

    // Salaire de base
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(66, 66, 66);
    const totalLabelX = pageWidth - margins.right - 60;
    const totalValueX = pageWidth - margins.right;

    doc.text('Salaire de base', totalLabelX, ay);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 35, 126);
    doc.text(formatCurrency(baseSalary), totalValueX, ay, { align: 'right' });
    ay += 5;

    // Total primes
    if (totalBonuses > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(46, 125, 50);
      doc.text('Total primes (+)', totalLabelX, ay);
      doc.setFont('helvetica', 'bold');
      doc.text(`+ ${formatCurrency(totalBonuses)}`, totalValueX, ay, { align: 'right' });
      ay += 5;
    }

    // Salaire brut
    ay += 2;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 35, 126);
    doc.setFontSize(10);
    doc.text('SALAIRE BRUT', totalLabelX, ay);
    doc.text(formatCurrency(grossSalary), totalValueX, ay, { align: 'right' });
    ay += 6;

    // Total déductions
    if (totalDeductions > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(211, 47, 47);
      doc.setFontSize(9);
      doc.text('Total déductions (-)', totalLabelX, ay);
      doc.setFont('helvetica', 'bold');
      doc.text(`- ${formatCurrency(totalDeductions)}`, totalValueX, ay, { align: 'right' });
      ay += 5;
    }

    ay += 4;

    // ================================================================
    // NET À PAYER
    // ================================================================
    const netBoxHeight = 18;
    doc.setFillColor(232, 234, 246);
    doc.roundedRect(margins.left, ay, contentWidth, netBoxHeight, 2, 2, 'F');
    doc.setDrawColor(197, 202, 233);
    doc.setLineWidth(0.5);
    doc.roundedRect(margins.left, ay, contentWidth, netBoxHeight, 2, 2, 'S');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 35, 126);
    doc.text('NET À PAYER', margins.left + 12, ay + 12);

    const netFormatted = formatCurrency(netSalary);
    doc.setFontSize(16);
    doc.setTextColor(26, 35, 126);
    let fontSizeNet = 16;
    let textWidthNet = doc.getTextWidth(netFormatted);
    if (textWidthNet > 80) {
      fontSizeNet = 14;
      doc.setFontSize(fontSizeNet);
      if (doc.getTextWidth(netFormatted) > 80) {
        fontSizeNet = 12;
        doc.setFontSize(fontSizeNet);
      }
    }
    doc.text(netFormatted, pageWidth - margins.right - 12, ay + 12, { align: 'right' });

    ay += netBoxHeight + 6;

    // ================================================================
    // MONTANT EN LETTRES
    // ================================================================
    const lettresBoxHeight = 14;
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(margins.left, ay, contentWidth, lettresBoxHeight, 2, 2, 'F');
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(0.5);
    doc.roundedRect(margins.left, ay, contentWidth, lettresBoxHeight, 2, 2, 'S');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(84, 110, 122);
    doc.text(`Arrêté le présent bulletin à la somme de ${totalEnLettres}`, pageWidth / 2, ay + 9, { align: 'center' });

    ay += lettresBoxHeight + 8;

    // ================================================================
    // SIGNATURES
    // ================================================================
    const signatureY = ay + 8;
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
    doc.text(`Date: ${formatDate(new Date().toISOString())}`, signatureX1 + (signatureWidth / 2), signatureY + 12, { align: 'center' });

    doc.line(signatureX2, signatureY + 5, signatureX2 + signatureWidth, signatureY + 5);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(84, 110, 122);
    doc.text("Signature de l'employeur", signatureX2 + (signatureWidth / 2), signatureY, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 144, 156);
    doc.text(company.name, signatureX2 + (signatureWidth / 2), signatureY + 12, { align: 'center' });

    ay = signatureY + 20;

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

    doc.save(`Bulletin_paie_${payrollNumber}.pdf`);
    return true;

  } catch (error) {
    console.error('Erreur PayrollSlipPDF:', error);
    throw error;
  }
};

// ========== FONCTION DE TÉLÉCHARGEMENT ==========
export const downloadPayrollSlipPDF = async (payroll, filename = null) => {
  try {
    if (!payroll || typeof payroll !== 'object') {
      throw new Error('Les données du bulletin de paie sont invalides');
    }

    const result = await PayrollSlipPDF(payroll);
    return result;
  } catch (error) {
    console.error('Erreur lors du téléchargement du bulletin de paie :', error);
    throw error;
  }
};

// Export par défaut
export default PayrollSlipPDF;