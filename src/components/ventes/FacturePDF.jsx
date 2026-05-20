// src/components/sales/FacturePDF.jsx
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoSvg from '../../assets/logo.svg'

const FacturePDF = async (facture) => {
  if (!facture || typeof facture !== 'object') {
    throw new Error('Données de la facture invalides')
  }

  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    
    // === MARGES ===
    const pageWidth = 210
    const margins = { left: 10, right: 10, top: 15, bottom: 20 }
    const contentWidth = pageWidth - margins.left - margins.right
    let yPosition = margins.top

    // === FONCTIONS DE FORMAT ===
    const formatNumber = (n) => {
      const num = parseFloat(n) || 0
      return new Intl.NumberFormat('fr-FR', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
      }).format(num)
    }
    
    const formatCurrency = (amount) => `${formatNumber(amount)} FCFA`
    
    const formatDate = (dateString) => {
      if (!dateString) return '-'
      try {
        return new Date(dateString).toLocaleDateString('fr-FR', { 
          day: '2-digit', month: 'long', year: 'numeric' 
        })
      } catch { return '-' }
    }

    // === CHARGEMENT DU LOGO ===
    const loadLogoAsImage = (src) => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'Anonymous'
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, img.width, img.height)
          const dataURL = canvas.toDataURL('image/png')
          resolve(dataURL)
        }
        img.onerror = (err) => {
          console.warn('Logo non chargé', err)
          reject(err)
        }
        img.src = src
      })
    }

    let logoDataURL = null
    try {
      logoDataURL = await loadLogoAsImage(logoSvg)
    } catch (err) {
      console.warn('Logo non chargé, poursuite sans logo')
    }

    // === EN-TÊTE ===
    const logoWidth = 50
    const logoHeight = 25
    const logoX = margins.left
    const logoY = yPosition

    if (logoDataURL) {
      doc.addImage(logoDataURL, 'PNG', logoX, logoY, logoWidth, logoHeight)
    } else {
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('SEYDI GROUP', logoX + (logoWidth / 2), logoY + 8, { align: 'center' })
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('SEYDI GROUP SARL', logoX + (logoWidth / 2), logoY + 14, { align: 'center' })
      doc.text('Solutions Digitales', logoX + (logoWidth / 2), logoY + 19, { align: 'center' })
    }

    // Cadre "INFORMATION DE LA SOCIÉTÉ"
    const infoSocieteY = yPosition + 2
    const infoSocieteX = pageWidth - margins.right - 95
    const infoBoxWidth = 97
    const infoBoxHeight = 40

    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.rect(infoSocieteX, infoSocieteY - 2, infoBoxWidth, infoBoxHeight, 'S')
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('INFORMATION DE LA SOCIÉTÉ', infoSocieteX + (infoBoxWidth / 2), infoSocieteY + 4, { align: 'center' })
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.2)
    doc.line(infoSocieteX + 8, infoSocieteY + 6, infoSocieteX + infoBoxWidth - 8, infoSocieteY + 6)

    let infoY = infoSocieteY + 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setFont('helvetica', 'bold')
    doc.text('Nom:', infoSocieteX + 6, infoY)
    doc.setFont('helvetica', 'normal')
    doc.text('SEYDI GROUP SARL', infoSocieteX + 18, infoY)
    infoY += 5
    doc.setFont('helvetica', 'bold')
    doc.text('Adresse:', infoSocieteX + 6, infoY)
    doc.setFont('helvetica', 'normal')
    doc.text('Dakar, Sénégal', infoSocieteX + 25, infoY)
    infoY += 5
    doc.setFont('helvetica', 'bold')
    doc.text('Tél:', infoSocieteX + 6, infoY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.text('+221 33 123 45 67', infoSocieteX + 14, infoY)
    doc.setFontSize(10)
    infoY += 7
    doc.setFont('helvetica', 'bold')
    doc.text('Email:', infoSocieteX + 6, infoY)
    doc.setFont('helvetica', 'normal')
    doc.text('contact@seydigroup.com', infoSocieteX + 20, infoY)

    yPosition = Math.max(infoSocieteY + infoBoxHeight + 5, yPosition + 35)

    // Ligne de séparation
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.2)
    doc.line(margins.left, yPosition, pageWidth - margins.right, yPosition)
    yPosition += 8

    // Titre
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    const statutFacture = facture.statut === 'payee' ? 'ACQUITTÉE' : 
                          facture.statut === 'partiellement_payee' ? 'PARTIELLEMENT PAYÉE' : 
                          facture.statut === 'en_retard' ? 'EN RETARD' : 'FACTURE'
    doc.text(`FACTURE ${statutFacture}`, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 6

    // === SECTION CLIENT / FACTURE ===
    const sectionTop = yPosition
    const sectionHeight = 35
    const sectionLeftWidth = contentWidth * 0.6
    const sectionRightWidth = contentWidth * 0.4

    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.rect(margins.left, sectionTop, contentWidth, sectionHeight, 'S')
    doc.line(margins.left + sectionLeftWidth, sectionTop, margins.left + sectionLeftWidth, sectionTop + sectionHeight)

    // Partie gauche - Client
    let clientY = sectionTop + 5
    const clientLeftMargin = margins.left + 5
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('INFORMATIONS CLIENT', clientLeftMargin, clientY)
    clientY += 8

    doc.setFontSize(10)
    const client = facture.client || {}
    doc.setFont('helvetica', 'bold')
    doc.text('Dénomination :', clientLeftMargin, clientY)
    doc.setFont('helvetica', 'normal')
    doc.text(client.nom || client.raison_sociale || '-', clientLeftMargin + 28, clientY)
    clientY += 5

    doc.setFont('helvetica', 'bold')
    doc.text('Adresse :', clientLeftMargin, clientY)
    doc.setFont('helvetica', 'normal')
    doc.text(client.adresse || '-', clientLeftMargin + 28, clientY)
    clientY += 5

    doc.setFont('helvetica', 'bold')
    doc.text('Téléphone :', clientLeftMargin, clientY)
    doc.setFont('helvetica', 'normal')
    doc.text(client.telephone || '-', clientLeftMargin + 28, clientY)
    clientY += 5

    doc.setFont('helvetica', 'bold')
    doc.text('Email :', clientLeftMargin, clientY)
    doc.setFont('helvetica', 'normal')
    doc.text(client.email || '-', clientLeftMargin + 28, clientY)
    clientY += 5

    doc.setFont('helvetica', 'bold')
    doc.text('N° TVA :', clientLeftMargin, clientY)
    doc.setFont('helvetica', 'normal')
    doc.text(client.numero_tva || '-', clientLeftMargin + 28, clientY)

    // Partie droite - Détails facture
    let factureY = sectionTop + 8
    const factureLeftMargin = margins.left + sectionLeftWidth + 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('DATE :', factureLeftMargin, factureY)
    doc.setFont('helvetica', 'normal')
    doc.text(formatDate(facture.date_facture), factureLeftMargin + 20, factureY)
    factureY += 5

    doc.setFont('helvetica', 'bold')
    doc.text('FACTURE N° :', factureLeftMargin, factureY)
    doc.setFont('helvetica', 'normal')
    doc.text(facture.reference || 'N/A', factureLeftMargin + 32, factureY)
    factureY += 5

    doc.setFont('helvetica', 'bold')
    doc.text('ÉCHÉANCE :', factureLeftMargin, factureY)
    doc.setFont('helvetica', 'normal')
    doc.text(formatDate(facture.date_echeance), factureLeftMargin + 32, factureY)
    factureY += 5

    doc.setFont('helvetica', 'bold')
    doc.text('TYPE :', factureLeftMargin, factureY)
    doc.setFont('helvetica', 'normal')
    const typeLabels = { proforma: 'Proforma', finale: 'Finale', avoir: 'Avoir' }
    doc.text(typeLabels[facture.type_facture] || facture.type_facture, factureLeftMargin + 32, factureY)

    yPosition = sectionTop + sectionHeight + 15

    // === TABLEAU DES ARTICLES ===
    const colWidths = {
      designation: 70,
      reference: 35,
      qte: 20,
      pu: 30,
      total: 35
    }

    const colPositions = {
      designation: margins.left,
      reference: margins.left + colWidths.designation,
      qte: margins.left + colWidths.designation + colWidths.reference,
      pu: margins.left + colWidths.designation + colWidths.reference + colWidths.qte,
      total: margins.left + colWidths.designation + colWidths.reference + colWidths.qte + colWidths.pu
    }

    const ligneHeight = 8
    const tableTop = yPosition

    // En-tête
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.rect(margins.left, tableTop, contentWidth, ligneHeight, 'S')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.2)
    doc.line(colPositions.reference, tableTop, colPositions.reference, tableTop + ligneHeight)
    doc.line(colPositions.qte, tableTop, colPositions.qte, tableTop + ligneHeight)
    doc.line(colPositions.pu, tableTop, colPositions.pu, tableTop + ligneHeight)
    doc.line(colPositions.total, tableTop, colPositions.total, tableTop + ligneHeight)

    const headerTextY = tableTop + 5
    doc.text('DÉSIGNATION', colPositions.designation + (colWidths.designation / 2), headerTextY, { align: 'center' })
    doc.text('RÉFÉRENCE', colPositions.reference + (colWidths.reference / 2), headerTextY, { align: 'center' })
    doc.text('QTÉ', colPositions.qte + (colWidths.qte / 2), headerTextY, { align: 'center' })
    doc.text('PRIX HT', colPositions.pu + (colWidths.pu / 2), headerTextY, { align: 'center' })
    doc.text('TOTAL HT', colPositions.total + (colWidths.total / 2), headerTextY, { align: 'center' })

    yPosition = tableTop + ligneHeight

    // Lignes de produits
    const items = Array.isArray(facture.items) ? facture.items : []
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)

    if (items.length > 0) {
      items.forEach((item, index) => {
        if (yPosition + ligneHeight > 270) {
          doc.addPage()
          yPosition = margins.top + 15
          // Redessiner l'en-tête
          doc.setDrawColor(0, 0, 0)
          doc.setLineWidth(0.5)
          doc.rect(margins.left, yPosition, contentWidth, ligneHeight, 'S')
          doc.setTextColor(0, 0, 0)
          doc.setFont('helvetica', 'bold')
          doc.text('DÉSIGNATION', colPositions.designation + (colWidths.designation / 2), yPosition + 5, { align: 'center' })
          doc.text('RÉFÉRENCE', colPositions.reference + (colWidths.reference / 2), yPosition + 5, { align: 'center' })
          doc.text('QTÉ', colPositions.qte + (colWidths.qte / 2), yPosition + 5, { align: 'center' })
          doc.text('PRIX HT', colPositions.pu + (colWidths.pu / 2), yPosition + 5, { align: 'center' })
          doc.text('TOTAL HT', colPositions.total + (colWidths.total / 2), yPosition + 5, { align: 'center' })
          doc.setDrawColor(0, 0, 0)
          doc.setLineWidth(0.2)
          doc.line(colPositions.reference, yPosition, colPositions.reference, yPosition + ligneHeight)
          doc.line(colPositions.qte, yPosition, colPositions.qte, yPosition + ligneHeight)
          doc.line(colPositions.pu, yPosition, colPositions.pu, yPosition + ligneHeight)
          doc.line(colPositions.total, yPosition, colPositions.total, yPosition + ligneHeight)
          yPosition += ligneHeight
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(0, 0, 0)
        }

        const qty = parseFloat(item.quantite) || 0
        const price = parseFloat(item.prix_unitaire_ht) || 0
        const total = parseFloat(item.montant_ht) || (qty * price)

        const designation = (item.description || item.product_name || '-').substring(0, 50)
        const reference = (item.product_reference || '-').substring(0, 30)

        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.1)
        doc.rect(margins.left, yPosition, contentWidth, ligneHeight, 'S')
        doc.line(colPositions.reference, yPosition, colPositions.reference, yPosition + ligneHeight)
        doc.line(colPositions.qte, yPosition, colPositions.qte, yPosition + ligneHeight)
        doc.line(colPositions.pu, yPosition, colPositions.pu, yPosition + ligneHeight)
        doc.line(colPositions.total, yPosition, colPositions.total, yPosition + ligneHeight)

        const cellPaddingY = 5
        doc.text(designation, colPositions.designation + 3, yPosition + cellPaddingY)
        doc.text(reference, colPositions.reference + 3, yPosition + cellPaddingY)
        doc.text(formatNumber(qty), colPositions.qte + (colWidths.qte / 2), yPosition + cellPaddingY, { align: 'center' })
        doc.text(`${formatNumber(price)} FCFA`, colPositions.pu + colWidths.pu - 3, yPosition + cellPaddingY, { align: 'right' })
        doc.setFont('helvetica', 'bold')
        doc.text(`${formatNumber(total)} FCFA`, colPositions.total + colWidths.total - 5, yPosition + cellPaddingY, { align: 'right' })
        doc.setFont('helvetica', 'normal')

        yPosition += ligneHeight
      })
    } else {
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.1)
      doc.rect(margins.left, yPosition, contentWidth, ligneHeight, 'S')
      doc.setTextColor(150, 150, 150)
      doc.text('Aucun article dans cette facture', margins.left + contentWidth / 2, yPosition + 5, { align: 'center' })
      yPosition += ligneHeight
    }

    yPosition += 5
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.2)
    doc.line(margins.left, yPosition, pageWidth - margins.right, yPosition)
    yPosition += 10

    // === TOTAUX ===
    const sousTotal = parseFloat(facture.sous_total) || 0
    const tva = parseFloat(facture.tva) || 0
    const totalTTC = parseFloat(facture.total_ttc) || 0
    const montantPaye = parseFloat(facture.montant_paye) || 0
    const montantRestant = parseFloat(facture.montant_restant) || 0

    const totalSectionTop = yPosition
    const totalColX = pageWidth - margins.right - 95
    const totalColWidth = 95
    doc.setFontSize(11)
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    const totalBoxHeight = 52
    doc.rect(totalColX, totalSectionTop, totalColWidth, totalBoxHeight, 'S')

    let currentY = totalSectionTop + 12
    for (let i = 0; i < 4; i++) {
      doc.line(totalColX + 2, currentY, totalColX + totalColWidth - 2, currentY)
      currentY += 10.5
    }
    yPosition = totalSectionTop + 9

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('SOUS-TOTAL HT:', totalColX + 8, yPosition)
    doc.setFontSize(12)
    doc.text(`${formatCurrency(sousTotal)}`, totalColX + totalColWidth - 8, yPosition, { align: 'right' })
    yPosition += 10.5

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('TVA (18%) :', totalColX + 8, yPosition)
    doc.setFontSize(12)
    doc.text(`${formatCurrency(tva)}`, totalColX + totalColWidth - 8, yPosition, { align: 'right' })
    yPosition += 10.5

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('TOTAL TTC :', totalColX + 8, yPosition)
    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text(`${formatCurrency(totalTTC)}`, totalColX + totalColWidth - 8, yPosition, { align: 'right' })
    yPosition += 10.5

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('MONTANT PAYÉ :', totalColX + 8, yPosition)
    doc.setFontSize(12)
    doc.setTextColor(34, 197, 94)
    doc.text(`${formatCurrency(montantPaye)}`, totalColX + totalColWidth - 8, yPosition, { align: 'right' })
    yPosition += 10.5

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('RESTE À PAYER :', totalColX + 8, yPosition)
    doc.setFontSize(12)
    doc.setTextColor(239, 68, 68)
    doc.text(`${formatCurrency(montantRestant)}`, totalColX + totalColWidth - 8, yPosition, { align: 'right' })

    yPosition = totalSectionTop + totalBoxHeight + 20

    // === CONDITIONS DE PAIEMENT ===
    if (facture.conditions_paiement) {
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.2)
      doc.rect(margins.left, yPosition, contentWidth, 18, 'S')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('CONDITIONS DE PAIEMENT', margins.left + 4, yPosition + 5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      const splitConditions = doc.splitTextToSize(facture.conditions_paiement, contentWidth - 8)
      doc.text(splitConditions, margins.left + 4, yPosition + 10)
      yPosition += 24
    }

    // === NOTES ===
    if (facture.notes) {
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.2)
      doc.rect(margins.left, yPosition, contentWidth, 18, 'S')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('NOTES', margins.left + 4, yPosition + 5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      const splitNotes = doc.splitTextToSize(facture.notes, contentWidth - 8)
      doc.text(splitNotes, margins.left + 4, yPosition + 10)
      yPosition += 24
    }

    // === PIED DE PAGE ===
    if (facture.pied_de_page) {
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.2)
      doc.rect(margins.left, yPosition, contentWidth, 18, 'S')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('PIED DE PAGE', margins.left + 4, yPosition + 5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      const splitPied = doc.splitTextToSize(facture.pied_de_page, contentWidth - 8)
      doc.text(splitPied, margins.left + 4, yPosition + 10)
      yPosition += 24
    }

    // === SIGNATURES ===
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.2)
    doc.line(margins.left, yPosition - 5, pageWidth - margins.right, yPosition - 5)
    yPosition += 5

    const signatureWidth = (contentWidth / 2) - 10
    const signatureHeight = 40

    // Signature client
    const signatureClientX = margins.left
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.rect(signatureClientX, yPosition, signatureWidth, signatureHeight, 'S')
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Le Client', signatureClientX + (signatureWidth / 2), yPosition + 8, { align: 'center' })
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.2)
    doc.line(signatureClientX + 15, yPosition + 10, signatureClientX + signatureWidth - 15, yPosition + 10)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const clientName = client.nom || client.raison_sociale || 'Nom du client'
    doc.text(clientName, signatureClientX + (signatureWidth / 2), yPosition + 22, { align: 'center' })
    const signatureLineY = yPosition + 30
    const signatureLineLength = signatureWidth - 30
    doc.line(
      signatureClientX + (signatureWidth / 2) - (signatureLineLength / 2),
      signatureLineY,
      signatureClientX + (signatureWidth / 2) + (signatureLineLength / 2),
      signatureLineY
    )
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text('Signature et cachet', signatureClientX + (signatureWidth / 2), signatureLineY + 6, { align: 'center' })

    // Signature entreprise
    const signatureEntrepriseX = margins.left + signatureWidth + 20
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.rect(signatureEntrepriseX, yPosition, signatureWidth, signatureHeight, 'S')
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('L\'Entreprise', signatureEntrepriseX + (signatureWidth / 2), yPosition + 8, { align: 'center' })
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.2)
    doc.line(signatureEntrepriseX + 15, yPosition + 10, signatureEntrepriseX + signatureWidth - 15, yPosition + 10)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('SEYDI GROUP SARL', signatureEntrepriseX + (signatureWidth / 2), yPosition + 22, { align: 'center' })
    doc.line(
      signatureEntrepriseX + (signatureWidth / 2) - (signatureLineLength / 2),
      signatureLineY,
      signatureEntrepriseX + (signatureWidth / 2) + (signatureLineLength / 2),
      signatureLineY
    )
    doc.text('Signature et cachet', signatureEntrepriseX + (signatureWidth / 2), signatureLineY + 6, { align: 'center' })

    yPosition += signatureHeight + 15

    // === PIED DE PAGE ===
    const footerY = Math.max(yPosition, 270)
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.setFont('helvetica', 'normal')
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.2)
    doc.line(margins.left, footerY - 5, pageWidth - margins.right, footerY - 5)
    doc.text('SEYDI GROUP SARL - Capital social: 10 000 000 FCFA - RCCM: SN DKR 2023 B 123', pageWidth / 2, footerY, { align: 'center' })
    doc.text('Adresse: Dakar, Sénégal - Tél: +221 33 123 45 67 - Email: contact@seydigroup.com', pageWidth / 2, footerY + 4, { align: 'center' })
    doc.text(`Facture générée électroniquement le ${formatDate(new Date().toISOString())} - Valide sans signature`, pageWidth / 2, footerY + 8, { align: 'center' })

    // Numéros de page
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(9)
      doc.setTextColor(150, 150, 150)
      doc.text(`Page ${i}/${pageCount}`, pageWidth - margins.right, 290, { align: 'right' })
    }

    doc.save(`Facture_${facture.reference || facture.id}.pdf`)
    return true

  } catch (error) {
    console.error('Erreur dans FacturePDF:', error)
    throw error
  }
}

export default FacturePDF