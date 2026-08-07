// src/components/transferts/TransfertPdf.jsx
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer';
import { pdf } from '@react-pdf/renderer';
import logoSvg from '../../assets/logo.svg';

// Enregistrer les polices (comme dans ExpensePDF)
Font.register({
  family: 'Helvetica',
  fonts: [{ src: 'https://fonts.gstatic.com/s/helvetica/v12/...' }],
});

// ================================================================
// STYLES – identiques à ExpensePDF (adaptés pour Transfert)
// ================================================================
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#1a237e',
    borderBottomStyle: 'solid',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 50,
    height: 50,
    marginRight: 12,
  },
  companyInfo: {
    flexDirection: 'column',
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a237e',
    fontFamily: 'Helvetica',
    letterSpacing: 1,
  },
  companySub: {
    fontSize: 8,
    color: '#546e7a',
    marginTop: 1,
  },
  headerRight: {
    textAlign: 'right',
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a237e',
    fontFamily: 'Helvetica',
    letterSpacing: 2,
  },
  documentRef: {
    fontSize: 9,
    color: '#546e7a',
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'solid',
  },
  infoCol: {
    flex: 1,
    flexDirection: 'column',
    paddingHorizontal: 4,
  },
  infoLabel: {
    fontSize: 7,
    color: '#78909c',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1a237e',
    marginTop: 15,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    borderBottomStyle: 'solid',
    fontFamily: 'Helvetica',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
    alignSelf: 'flex-start',
  },
  statusDraft: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#9e9e9e',
    borderStyle: 'solid',
  },
  statusPending: {
    backgroundColor: '#fff3e0',
    borderWidth: 1,
    borderColor: '#ff9800',
    borderStyle: 'solid',
  },
  statusApproved: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#2196f3',
    borderStyle: 'solid',
  },
  statusRejected: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#f44336',
    borderStyle: 'solid',
  },
  statusInTransit: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#4caf50',
    borderStyle: 'solid',
  },
  statusPartial: {
    backgroundColor: '#fff3e0',
    borderWidth: 1,
    borderColor: '#ff9800',
    borderStyle: 'solid',
  },
  statusCompleted: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#4caf50',
    borderStyle: 'solid',
  },
  statusCancelled: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#9e9e9e',
    borderStyle: 'solid',
  },
  statusText: {
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTextDraft: { color: '#757575' },
  statusTextPending: { color: '#ff9800' },
  statusTextApproved: { color: '#2196f3' },
  statusTextRejected: { color: '#f44336' },
  statusTextInTransit: { color: '#4caf50' },
  statusTextPartial: { color: '#ff9800' },
  statusTextCompleted: { color: '#4caf50' },
  statusTextCancelled: { color: '#757575' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1a237e',
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginTop: 5,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
    borderBottomStyle: 'solid',
    backgroundColor: '#ffffff',
  },
  tableRowAlt: {
    backgroundColor: '#f8f9fa',
  },
  colRef: { width: '15%', paddingRight: 4 },
  colDesignation: { width: '30%', paddingRight: 4 },
  colQte: { width: '10%', textAlign: 'center' },
  colRecu: { width: '10%', textAlign: 'center' },
  colPrix: { width: '15%', textAlign: 'right', paddingRight: 4 },
  colTotal: { width: '20%', textAlign: 'right', paddingRight: 4 },
  tableText: {
    fontSize: 8,
    color: '#212121',
  },
  totalsBox: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#e8eaf6',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#c5cae9',
    borderStyle: 'solid',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 2,
  },
  totalLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1a237e',
    marginRight: 20,
  },
  totalValue: {
    fontSize: 9,
    color: '#1a237e',
    width: 80,
    textAlign: 'right',
  },
  totalFinal: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#1a237e',
    borderTopStyle: 'solid',
  },
  totalFinalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1a237e',
    marginRight: 20,
  },
  totalFinalValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1a237e',
    width: 80,
    textAlign: 'right',
  },
  notesBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fff3e0',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffcc80',
    borderStyle: 'solid',
  },
  notesLabel: {
    fontSize: 8,
    color: '#e65100',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 9,
    color: '#424242',
    marginTop: 2,
  },
  rejectionBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#ffebee',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#f44336',
    borderStyle: 'solid',
  },
  rejectionLabel: {
    fontSize: 8,
    color: '#c62828',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rejectionText: {
    fontSize: 9,
    color: '#424242',
    marginTop: 2,
  },
  signature: {
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    textAlign: 'center',
    width: '45%',
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#424242',
    borderBottomStyle: 'solid',
    marginBottom: 4,
    paddingTop: 10,
  },
  signatureLabel: {
    fontSize: 8,
    color: '#546e7a',
  },
  signatureSub: {
    fontSize: 7,
    color: '#78909c',
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    borderTopStyle: 'solid',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: '#78909c',
  },
  watermark: {
    position: 'absolute',
    bottom: 150,
    left: 50,
    right: 50,
    textAlign: 'center',
    fontSize: 40,
    color: 'rgba(26, 35, 126, 0.05)',
    fontFamily: 'Helvetica',
    transform: 'rotate(-30deg)',
  },
  emptyItems: {
    padding: 10,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'solid',
    borderRadius: 4,
    marginTop: 5,
  },
  emptyItemsText: {
    fontSize: 9,
    color: '#78909c',
    textAlign: 'center',
  },
});

// ================================================================
// UTILITAIRES (identique à ExpensePDF)
// ================================================================
const formatNumber = (n) => {
  if (!n && n !== 0) return '0';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '0';
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

const formatCurrency = (amt) => `${formatNumber(amt)} FCFA`;

const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

const getStatusInfo = (status) => {
  const map = {
    draft: { label: 'Brouillon', style: styles.statusDraft, textStyle: styles.statusTextDraft },
    pending_approval: { label: 'En attente', style: styles.statusPending, textStyle: styles.statusTextPending },
    approved: { label: 'Approuvé', style: styles.statusApproved, textStyle: styles.statusTextApproved },
    rejected: { label: 'Rejeté', style: styles.statusRejected, textStyle: styles.statusTextRejected },
    in_transit: { label: 'En transit', style: styles.statusInTransit, textStyle: styles.statusTextInTransit },
    partial: { label: 'Réception partielle', style: styles.statusPartial, textStyle: styles.statusTextPartial },
    completed: { label: 'Terminé', style: styles.statusCompleted, textStyle: styles.statusTextCompleted },
    cancelled: { label: 'Annulé', style: styles.statusCancelled, textStyle: styles.statusTextCancelled },
  };
  return map[status] || map.draft;
};

// ================================================================
// COMPOSANT PRINCIPAL – TransfertPDF (identique à ExpensePDF)
// ================================================================
const TransfertPDF = ({ transfer }) => {
  const data = transfer || {};
  const items = data.items || [];
  const fromAgence = data.from_agence || {};
  const toAgence = data.to_agence || {};
  const fromWarehouse = data.from_warehouse || {};
  const toWarehouse = data.to_warehouse || {};
  const statusInfo = getStatusInfo(data.status);

  const company = {
    name: 'SEYDI GROUP SARL',
    address: 'Dakar, Sénégal',
    phone: '+221 33 123 45 67',
    email: 'contact@seydigroup.com',
    rccm: 'SN DKR 2023 B 123',
    capital: '10 000 000 FCFA',
  };

  // Totaux
  const totalQuantity = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
  const totalReceived = items.reduce((sum, item) => sum + (parseFloat(item.quantity_received) || 0), 0);
  const totalAmount = items.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)), 0);
  const completionPercent = totalQuantity > 0 ? ((totalReceived / totalQuantity) * 100).toFixed(1) : 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark}>BON DE TRANSFERT</Text>

        {/* En-tête SEYDI GROUP SARL avec logo */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image src={logoSvg} style={styles.logo} />
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>SEYDI GROUP SARL</Text>
              <Text style={styles.companySub}>Capital social : 10 000 000 FCFA</Text>
              <Text style={styles.companySub}>N° RCCM : SN DKR 2023 B 123</Text>
              <Text style={styles.companySub}>DAKAR, SÉNÉGAL</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.documentTitle}>BON DE TRANSFERT</Text>
            <Text style={styles.documentRef}>N° {data.reference || 'Sans référence'}</Text>
            <Text style={styles.documentRef}>
              Émis le {formatDate(new Date().toISOString())}
            </Text>
          </View>
        </View>

        {/* Informations générales + statut */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Date création</Text>
            <Text style={styles.infoValue}>{formatDate(data.created_at)}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Dernière modif.</Text>
            <Text style={styles.infoValue}>{formatDate(data.updated_at)}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Type</Text>
            <Text style={styles.infoValue}>Transfert de stock</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Statut</Text>
            <View style={[styles.statusBadge, statusInfo.style]}>
              <Text style={[styles.statusText, statusInfo.textStyle]}>{statusInfo.label}</Text>
            </View>
          </View>
        </View>

        {/* Agences */}
        <Text style={styles.sectionTitle}>AGENCES</Text>
        <View style={{ flexDirection: 'row', marginBottom: 10 }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#1a237e' }}>AGENCE SOURCE</Text>
            <View style={{ marginTop: 5 }}>
              <Text style={styles.clientRow}>
                <Text style={styles.clientLabel}>Nom :</Text>
                <Text style={styles.clientValue}>{fromAgence.nom || 'N/A'}</Text>
              </Text>
              <Text style={styles.clientRow}>
                <Text style={styles.clientLabel}>Type :</Text>
                <Text style={styles.clientValue}>{fromAgence.type_agence === 'principale' ? 'Principale' : 'Secondaire'}</Text>
              </Text>
              <Text style={styles.clientRowLast}>
                <Text style={styles.clientLabel}>Entrepôt :</Text>
                <Text style={styles.clientValue}>{fromWarehouse.name || 'N/A'}</Text>
              </Text>
            </View>
          </View>
          <View style={{ flex: 1, paddingLeft: 10 }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#1a237e' }}>AGENCE DESTINATION</Text>
            <View style={{ marginTop: 5 }}>
              <Text style={styles.clientRow}>
                <Text style={styles.clientLabel}>Nom :</Text>
                <Text style={styles.clientValue}>{toAgence.nom || 'N/A'}</Text>
              </Text>
              <Text style={styles.clientRow}>
                <Text style={styles.clientLabel}>Type :</Text>
                <Text style={styles.clientValue}>{toAgence.type_agence === 'principale' ? 'Principale' : 'Secondaire'}</Text>
              </Text>
              <Text style={styles.clientRowLast}>
                <Text style={styles.clientLabel}>Entrepôt :</Text>
                <Text style={styles.clientValue}>{toWarehouse.name || 'N/A'}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Articles */}
        <Text style={styles.sectionTitle}>ARTICLES</Text>
        {items.length === 0 ? (
          <View style={styles.emptyItems}>
            <Text style={styles.emptyItemsText}>Aucun article dans ce transfert.</Text>
          </View>
        ) : (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colRef]}>Réf.</Text>
              <Text style={[styles.tableHeaderText, styles.colDesignation]}>Désignation</Text>
              <Text style={[styles.tableHeaderText, styles.colQte]}>Qté</Text>
              <Text style={[styles.tableHeaderText, styles.colRecu]}>Reçu</Text>
              <Text style={[styles.tableHeaderText, styles.colPrix]}>Prix U.</Text>
              <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
            </View>
            {items.map((item, index) => {
              const qty = parseFloat(item.quantity) || 0;
              const received = parseFloat(item.quantity_received) || 0;
              const price = parseFloat(item.unit_price) || 0;
              const total = qty * price;
              return (
                <View style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : null]} key={index}>
                  <Text style={[styles.tableText, styles.colRef]}>
                    {item.product?.reference || '-'}
                  </Text>
                  <Text style={[styles.tableText, styles.colDesignation]}>
                    {item.product?.name || item.product_name || 'Produit inconnu'}
                  </Text>
                  <Text style={[styles.tableText, styles.colQte]}>{qty}</Text>
                  <Text style={[styles.tableText, styles.colRecu]}>{received}</Text>
                  <Text style={[styles.tableText, styles.colPrix]}>{formatCurrency(price)}</Text>
                  <Text style={[styles.tableText, styles.colTotal]}>{formatCurrency(total)}</Text>
                </View>
              );
            })}
          </>
        )}

        {/* Totaux */}
        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Articles</Text>
            <Text style={styles.totalValue}>{items.length}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Qté totale</Text>
            <Text style={styles.totalValue}>{formatNumber(totalQuantity)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Qté reçue</Text>
            <Text style={styles.totalValue}>{formatNumber(totalReceived)} ({completionPercent}%)</Text>
          </View>
          <View style={styles.totalFinal}>
            <Text style={styles.totalFinalLabel}>VALEUR TOTALE</Text>
            <Text style={styles.totalFinalValue}>{formatCurrency(totalAmount)}</Text>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* Motif de rejet */}
        {data.status === 'rejected' && data.rejected_reason && (
          <View style={styles.rejectionBox}>
            <Text style={styles.rejectionLabel}>Motif du rejet</Text>
            <Text style={styles.rejectionText}>{data.rejected_reason}</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={styles.signature}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Signature agence source</Text>
            <Text style={styles.signatureSub}>Cachet et signature</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Signature agence destination</Text>
            <Text style={styles.signatureSub}>Cachet et signature</Text>
          </View>
        </View>

        {/* Pied de page */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            SEYDI GROUP SARL - DAKAR, SÉNÉGAL
          </Text>
          <Text style={styles.footerText}>
            Tél: (+221) 33 123 45 67 - Email: contact@seydigroup.com
          </Text>
          <Text style={styles.footerText}>
            RCCM: SN DKR 2023 B 123
          </Text>
          <Text style={styles.footerText}>
            Généré le {formatDateTime(new Date().toISOString())}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

// ================================================================
// FONCTION DE TÉLÉCHARGEMENT (exportée par défaut)
// ================================================================
/**
 * Télécharge le bon de transfert au format PDF
 * @param {Object} transfer - Les données du transfert
 * @param {string} filename - Nom du fichier (optionnel)
 * @returns {Promise<void>}
 */
const TransfertPdf = async (transfer, filename = null) => {
  try {
    if (!transfer || typeof transfer !== 'object') {
      throw new Error('Les données du transfert sont invalides');
    }

    const blob = await pdf(<TransfertPDF transfer={transfer} />).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `Transfert_${transfer.reference || 'transfert'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Erreur lors du téléchargement du bon de transfert :', error);
    throw error;
  }
};

export default TransfertPdf;