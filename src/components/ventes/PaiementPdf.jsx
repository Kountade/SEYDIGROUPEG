import jsPDF from 'jspdf'
import logoSvg from '../../assets/logo.svg'

/**
 * Génère un PDF pour un paiement
 * @param {Object} paiement - L'objet paiement retourné par l'API
 * @returns {Promise<boolean>}
 */
const PaiementPdf = async (paiement) => {
  if (!paiement || typeof paiement !== 'object') {
    throw new Error('Données du paiement invalides')
  }

  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    // === CONFIGURATION ===
    const pageWidth = 210
    const margins = { left: 15, right: 15, top: 18, bottom: 18 }
    const contentWidth = pageWidth - margins.left - margins.right
    let y = margins.top

    const black = '#000000'

    // === FONCTIONS UTILES ===
    const formatNumber = (n) => {
      const num = parseFloat(n) || 0
      return new Intl.NumberFormat('fr-FR').format(num)
    }

    const formatCurrency = (amount) => {
      const num = parseFloat(amount) || 0
      return `${formatNumber(num)} FCFA`
    }

    const formatDate = (dateString) => {
      if (!dateString) return '-'
      try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return '-'
        return date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      } catch {
        return '-'
      }
    }

    // === DONNÉES ===
    const client = paiement.client || {}
    const facture = paiement.facture || {}
    const vente = paiement.vente || {}

    // === CHARGEMENT DU LOGO ===
    const loadLogo = (src) =>
      new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'Anonymous'
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          canvas.getContext('2d').drawImage(img, 0, 0)
          resolve(canvas.toDataURL('image/png'))
        }
        img.onerror = () => resolve(null)
        img.src = src
      })

    const logoData = await loadLogo(logoSvg)

    // ============================================================
    // EN-TÊTE
    // ============================================================
    if (logoData) {
      doc.addImage(logoData, 'PNG', margins.left, y, 40, 20)
    } else {
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(black)
      doc.text('SEYDI GROUP', margins.left, y + 8)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('SEYDI GROUP SARL', margins.left, y + 14)
      doc.text('Solutions Digitales', margins.left, y + 19)
    }

    const companyBox = {
      x: pageWidth - margins.right - 85,
      y: y,
      w: 85,
      h: 35,
    }
    doc.setDrawColor(black)
    doc.setLineWidth(0.2)
    doc.rect(companyBox.x, companyBox.y, companyBox.w, companyBox.h, 'S')

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('SOCIÉTÉ', companyBox.x + companyBox.w / 2, companyBox.y + 4, {
      align: 'center',
    })
    doc.setFont('helvetica', 'normal')
    doc.text('SEYDI GROUP SARL', companyBox.x + 4, companyBox.y + 10)
    doc.text('Dakar, Sénégal', companyBox.x + 4, companyBox.y + 16)
    doc.text('+221 33 123 45 67', companyBox.x + 4, companyBox.y + 22)
    doc.setFontSize(9)
    doc.text('contact@seydigroup.com', companyBox.x + 4, companyBox.y + 28)

    y = companyBox.y + companyBox.h + 8

    doc.setDrawColor(black)
    doc.setLineWidth(0.5)
    doc.line(margins.left, y, pageWidth - margins.right, y)
    y += 8

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(black)
    doc.text('REÇU DE PAIEMENT', pageWidth / 2, y, { align: 'center' })
    y += 8
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`N° ${paiement.reference || 'Sans référence'}`, pageWidth / 2, y, {
      align: 'center',
    })
    y += 12

    // ============================================================
    // INFORMATIONS PAIEMENT (encadré)
    // ============================================================
    const infoBox = { x: margins.left, y: y, w: contentWidth, h: 46 }
    doc.setDrawColor(black)
    doc.setLineWidth(0.3)
    doc.rect(infoBox.x, infoBox.y, infoBox.w, infoBox.h, 'S')

    const midX = infoBox.x + infoBox.w / 2
    doc.line(midX, infoBox.y, midX, infoBox.y + infoBox.h)

    let infoY = infoBox.y + 6
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('DÉTAILS PAIEMENT', infoBox.x + 4, infoY)
    infoY += 7

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Date :', infoBox.x + 4, infoY)
    doc.setFont('helvetica', 'normal')
    doc.text(formatDate(paiement.date_paiement), infoBox.x + 24, infoY)
    infoY += 6

    doc.setFont('helvetica', 'bold')
    doc.text('Méthode :', infoBox.x + 4, infoY)
    doc.setFont('helvetica', 'normal')
    const methodes = {
      especes: 'Espèces',
      carte: 'Carte bancaire',
      cheque: 'Chèque',
      virement: 'Virement',
      mobile_money: 'Mobile Money',
      autre: 'Autre',
    }
    const methodeLabel = methodes[paiement.methode] || paiement.methode || '-'
    doc.text(methodeLabel, infoBox.x + 24, infoY)
    infoY += 6

    doc.setFont('helvetica', 'bold')
    doc.text('Statut :', infoBox.x + 4, infoY)
    doc.setFont('helvetica', 'normal')
    const statut = paiement.statut || 'completed'
    const statutLabel = {
      pending: 'En attente',
      completed: 'Complété',
      failed: 'Échoué',
      refunded: 'Remboursé',
    }[statut]
    doc.text(statutLabel || statut, infoBox.x + 24, infoY)

    // Colonne droite de l'encadré
    infoY = infoBox.y + 6
    doc.setFont('helvetica', 'bold')
    doc.text('RÉFÉRENCES', midX + 4, infoY)
    infoY += 7

    doc.setFont('helvetica', 'bold')
    doc.text('Réf. ext. :', midX + 4, infoY)
    doc.setFont('helvetica', 'normal')
    doc.text(paiement.reference_externe || '-', midX + 24, infoY)
    infoY += 6

    if (facture.reference) {
      doc.setFont('helvetica', 'bold')
      doc.text('Facture :', midX + 4, infoY)
      doc.setFont('helvetica', 'normal')
      doc.text(facture.reference, midX + 24, infoY)
      infoY += 6
    }

    if (vente.reference) {
      doc.setFont('helvetica', 'bold')
      doc.text('Vente :', midX + 4, infoY)
      doc.setFont('helvetica', 'normal')
      doc.text(vente.reference, midX + 24, infoY)
    }

    y = infoBox.y + infoBox.h + 10

    // ============================================================
    // MONTANT (encadré)
    // ============================================================
    const amountBox = { x: margins.left, y: y, w: contentWidth, h: 35 }
    doc.setDrawColor(black)
    doc.setLineWidth(0.3)
    doc.rect(amountBox.x, amountBox.y, amountBox.w, amountBox.h, 'S')

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('MONTANT ENCAISSÉ', amountBox.x + amountBox.w / 2, amountBox.y + 10, {
      align: 'center',
    })
    doc.setFontSize(22)
    doc.setTextColor(black)
    const montant = paiement.montant || 0
    doc.text(`${formatCurrency(montant)}`, amountBox.x + amountBox.w / 2, amountBox.y + 28, {
      align: 'center',
    })

    y = amountBox.y + amountBox.h + 10

    // ============================================================
    // CLIENT
    // ============================================================
    if (client && Object.keys(client).length) {
      const clientBox = { x: margins.left, y: y, w: contentWidth, h: 40 }
      doc.setDrawColor(black)
      doc.setLineWidth(0.3)
      doc.rect(clientBox.x, clientBox.y, clientBox.w, clientBox.h, 'S')

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('CLIENT', clientBox.x + 4, clientBox.y + 6)

      doc.setFontSize(10)
      let clientY = clientBox.y + 13
      const nomComplet =
        client.raison_sociale ||
        (client.prenom ? `${client.nom} ${client.prenom}` : client.nom) ||
        '-'
      doc.setFont('helvetica', 'bold')
      doc.text('Nom :', clientBox.x + 4, clientY)
      doc.setFont('helvetica', 'normal')
      doc.text(nomComplet.substring(0, 35), clientBox.x + 24, clientY)
      clientY += 7

      if (client.email) {
        doc.setFont('helvetica', 'bold')
        doc.text('Email :', clientBox.x + 4, clientY)
        doc.setFont('helvetica', 'normal')
        doc.text(client.email.substring(0, 35), clientBox.x + 24, clientY)
        clientY += 7
      }

      if (client.telephone) {
        doc.setFont('helvetica', 'bold')
        doc.text('Tél :', clientBox.x + 4, clientY)
        doc.setFont('helvetica', 'normal')
        doc.text(client.telephone, clientBox.x + 24, clientY)
      }

      y = clientBox.y + clientBox.h + 8
    }

    // ============================================================
    // DÉTAILS FACTURE (si facture associée)
    // ============================================================
    if (facture.reference) {
      const factureBox = { x: margins.left, y: y, w: contentWidth, h: 36 }
      doc.setDrawColor(black)
      doc.setLineWidth(0.3)
      doc.rect(factureBox.x, factureBox.y, factureBox.w, factureBox.h, 'S')

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('FACTURE ASSOCIÉE', factureBox.x + 4, factureBox.y + 6)

      let fY = factureBox.y + 13
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Référence :', factureBox.x + 4, fY)
      doc.setFont('helvetica', 'normal')
      doc.text(facture.reference, factureBox.x + 35, fY)
      fY += 7

      doc.setFont('helvetica', 'bold')
      doc.text('Date :', factureBox.x + 4, fY)
      doc.setFont('helvetica', 'normal')
      doc.text(formatDate(facture.date_facture), factureBox.x + 35, fY)
      fY += 7

      doc.setFont('helvetica', 'bold')
      doc.text('Total TTC :', factureBox.x + 4, fY)
      doc.setFont('helvetica', 'normal')
      doc.text(formatCurrency(facture.total_ttc), factureBox.x + 35, fY)

      y = factureBox.y + factureBox.h + 10
    }

    // ============================================================
    // NOTES
    // ============================================================
    if (paiement.notes) {
      const lines = doc.splitTextToSize(paiement.notes, contentWidth - 10)
      const boxH = Math.max(14, lines.length * 5 + 8)
      if (y + boxH < 270) {
        doc.setDrawColor(black)
        doc.setLineWidth(0.2)
        doc.rect(margins.left, y, contentWidth, boxH, 'S')
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('NOTES', margins.left + 4, y + 4)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(black)
        doc.text(lines, margins.left + 4, y + 9)
        y += boxH + 6
      }
    }

    // ============================================================
    // PIED DE PAGE
    // ============================================================
    const footerY = 280
    doc.setDrawColor(black)
    doc.setLineWidth(0.2)
    doc.line(margins.left, footerY - 10, pageWidth - margins.right, footerY - 10)

    doc.setFontSize(9)
    doc.setTextColor(black)
    doc.setFont('helvetica', 'normal')
    doc.text(
      'SEYDI GROUP SARL - Dakar, Sénégal - Tél: +221 33 123 45 67',
      pageWidth / 2,
      footerY - 5,
      { align: 'center' }
    )
    doc.text(
      `Reçu généré le ${formatDate(new Date())}`,
      pageWidth / 2,
      footerY - 1,
      { align: 'center' }
    )

    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(9)
      doc.setTextColor(black)
      doc.text(`Page ${i}/${pageCount}`, pageWidth - margins.right, footerY, {
        align: 'right',
      })
    }

    doc.save(`Reçu_paiement_${paiement.reference || 'paiement'}.pdf`)
    return true
  } catch (error) {
    console.error('Erreur PaiementPdf:', error)
    throw error
  }
}

export default PaiementPdf