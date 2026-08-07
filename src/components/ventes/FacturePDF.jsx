// src/components/sales/FacturePDF.jsx
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import logoSvg from '../../assets/logo.svg';

// ================================================================
// STYLES (identiques à DevisPDF / ExpensePDF)
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
    letterSpacing: 0.5,
  },
  clientSection: {
    marginTop: 5,
    marginBottom: 10,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'solid',
  },
  clientRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
    borderBottomStyle: 'solid',
  },
  clientRowLast: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  clientLabel: {
    width: '25%',
    fontSize: 9,
    color: '#546e7a',
  },
  clientValue: {
    width: '75%',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1a237e',
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
  statusSent: {
    backgroundColor: '#fff3e0',
    borderWidth: 1,
    borderColor: '#ff9800',
    borderStyle: 'solid',
  },
  statusPaid: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#4caf50',
    borderStyle: 'solid',
  },
  statusPartiallyPaid: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#2196f3',
    borderStyle: 'solid',
  },
  statusOverdue: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#f44336',
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
  statusTextSent: { color: '#ff9800' },
  statusTextPaid: { color: '#4caf50' },
  statusTextPartiallyPaid: { color: '#2196f3' },
  statusTextOverdue: { color: '#f44336' },
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
  colDesignation: { width: '32%', paddingRight: 4 },
  colRef: { width: '15%', paddingRight: 4 },
  colQte: { width: '10%', textAlign: 'center' },
  colPrix: { width: '15%', textAlign: 'right', paddingRight: 4 },
  colRemise: { width: '12%', textAlign: 'right', paddingRight: 4 },
  colTotal: { width: '16%', textAlign: 'right', paddingRight: 4 },
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
// UTILITAIRES
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

const getStatusInfo = (status) => {
  const map = {
    draft: { label: 'Brouillon', style: styles.statusDraft, textStyle: styles.statusTextDraft },
    sent: { label: 'Envoyée', style: styles.statusSent, textStyle: styles.statusTextSent },
    paid: { label: 'Payée', style: styles.statusPaid, textStyle: styles.statusTextPaid },
    partially_paid: { label: 'Partiellement payée', style: styles.statusPartiallyPaid, textStyle: styles.statusTextPartiallyPaid },
    overdue: { label: 'En retard', style: styles.statusOverdue, textStyle: styles.statusTextOverdue },
    cancelled: { label: 'Annulée', style: styles.statusCancelled, textStyle: styles.statusTextCancelled },
  };
  return map[status] || map.draft;
};

// ================================================================
// COMPOSANT PRINCIPAL – FacturePDF (SANS TVA)
// ================================================================
const FacturePDF = ({ facture }) => {
  const data = facture || {};
  const items = data.items || [];
  const client = data.client || {};
  const agence = data.agence || {};
  const vendeur = data.vendeur || {};

  const company = {
    name: 'SEYDI GROUP SARL',
    address: 'Dakar, Sénégal',
    phone: '+221 33 123 45 67',
    email: 'contact@seydigroup.com',
    rccm: 'SN DKR 2023 B 123',
    capital: '10 000 000 FCFA',
  };

  // Client
  const clientNom = client.nom || 'Client inconnu';
  const clientPrenom = client.prenom || '';
  const clientRaison = client.raison_sociale || '';
  const clientFull = clientRaison || (clientPrenom ? `${clientNom} ${clientPrenom}` : clientNom);
  const clientEmail = client.email || '';
  const clientTel = client.telephone || '';
  const clientAdr = client.adresse || '';

  const statusInfo = getStatusInfo(data.status);

  // Totaux (sans TVA)
  let sousTotal = 0;
  items.forEach((item) => {
    const qty = item.quantity || 0;
    const price = item.prix_unitaire || 0;
    const remise = item.remise || 0;
    sousTotal += qty * price - remise;
  });
  const total = data.total_ttc || sousTotal; // total_ttc est le total TTC (sans TVA car pas de TVA)
  const montantPaye = data.montant_paye || 0;
  const montantRestant = data.montant_restant || total - montantPaye;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark}>FACTURE</Text>

        {/* En-tête */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image src={logoSvg} style={styles.logo} />
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{company.name}</Text>
              <Text style={styles.companySub}>Capital social : {company.capital}</Text>
              <Text style={styles.companySub}>N° RCCM : {company.rccm}</Text>
              <Text style={styles.companySub}>{company.address}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.documentTitle}>FACTURE</Text>
            <Text style={styles.documentRef}>N° {data.reference || 'Sans référence'}</Text>
            <Text style={styles.documentRef}>
              Émise le {formatDate(data.date_facture || new Date().toISOString())}
            </Text>
          </View>
        </View>

        {/* Grille d'informations générales */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{formatDate(data.date_facture)}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Échéance</Text>
            <Text style={styles.infoValue}>{formatDate(data.date_echeance)}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Type</Text>
            <Text style={styles.infoValue}>
              {data.type_facture === 'proforma' ? 'Proforma' :
               data.type_facture === 'avoir' ? 'Avoir' : 'Finale'}
            </Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Agence</Text>
            <Text style={styles.infoValue}>{agence.nom || '-'}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Statut</Text>
            <View style={[styles.statusBadge, statusInfo.style]}>
              <Text style={[styles.statusText, statusInfo.textStyle]}>{statusInfo.label}</Text>
            </View>
          </View>
        </View>

        {/* Informations client */}
        <Text style={styles.sectionTitle}>INFORMATIONS CLIENT</Text>
        <View style={styles.clientSection}>
          <View style={styles.clientRow}>
            <Text style={styles.clientLabel}>Nom / Raison sociale</Text>
            <Text style={styles.clientValue}>{clientFull}</Text>
          </View>
          {clientEmail && (
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Email</Text>
              <Text style={styles.clientValue}>{clientEmail}</Text>
            </View>
          )}
          {clientTel && (
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Téléphone</Text>
              <Text style={styles.clientValue}>{clientTel}</Text>
            </View>
          )}
          {clientAdr && (
            <View style={styles.clientRowLast}>
              <Text style={styles.clientLabel}>Adresse</Text>
              <Text style={styles.clientValue}>{clientAdr}</Text>
            </View>
          )}
        </View>

        {/* Articles */}
        <Text style={styles.sectionTitle}>ARTICLES</Text>
        {items.length === 0 ? (
          <View style={styles.emptyItems}>
            <Text style={styles.emptyItemsText}>Aucun article dans cette facture.</Text>
          </View>
        ) : (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colDesignation]}>Désignation</Text>
              <Text style={[styles.tableHeaderText, styles.colRef]}>Réf.</Text>
              <Text style={[styles.tableHeaderText, styles.colQte]}>Qté</Text>
              <Text style={[styles.tableHeaderText, styles.colPrix]}>Prix unit.</Text>
              <Text style={[styles.tableHeaderText, styles.colRemise]}>Remise</Text>
              <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
            </View>
            {items.map((item, index) => {
              const qty = item.quantity || 0;
              const price = item.prix_unitaire || 0;
              const remise = item.remise || 0;
              const totalItem = qty * price - remise;
              return (
                <View style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : null]} key={index}>
                  <Text style={[styles.tableText, styles.colDesignation]}>
                    {item.product_name || item.product?.name || 'Produit inconnu'}
                  </Text>
                  <Text style={[styles.tableText, styles.colRef]}>
                    {item.product_reference || item.product?.reference || '-'}
                  </Text>
                  <Text style={[styles.tableText, styles.colQte]}>{qty}</Text>
                  <Text style={[styles.tableText, styles.colPrix]}>{formatCurrency(price)}</Text>
                  <Text style={[styles.tableText, styles.colRemise]}>{formatCurrency(remise)}</Text>
                  <Text style={[styles.tableText, styles.colTotal]}>{formatCurrency(totalItem)}</Text>
                </View>
              );
            })}
          </>
        )}

        {/* Totaux - SANS TVA */}
        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Sous-total</Text>
            <Text style={styles.totalValue}>{formatCurrency(sousTotal)}</Text>
          </View>
          <View style={styles.totalFinal}>
            <Text style={styles.totalFinalLabel}>TOTAL</Text>
            <Text style={styles.totalFinalValue}>{formatCurrency(total)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Montant payé</Text>
            <Text style={styles.totalValue}>{formatCurrency(montantPaye)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Reste à payer</Text>
            <Text style={styles.totalValue}>{formatCurrency(montantRestant)}</Text>
          </View>
        </View>

        {/* Conditions de paiement */}
        {data.conditions_paiement && data.conditions_paiement !== 'Paiement à 30 jours' && (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Conditions de paiement</Text>
            <Text style={styles.notesText}>{data.conditions_paiement}</Text>
          </View>
        )}

        {/* Notes */}
        {data.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={styles.signature}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Signature du client</Text>
            <Text style={styles.signatureSub}>Nom et date</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Signature de l'entreprise</Text>
            <Text style={styles.signatureSub}>{company.name}</Text>
          </View>
        </View>

        {/* Pied de page */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {company.name} - {company.address} - Tél: {company.phone}
          </Text>
          <Text style={styles.footerText}>RCCM: {company.rccm} | Capital: {company.capital}</Text>
          <Text style={styles.footerText}>Généré le {formatDate(new Date().toISOString())}</Text>
        </View>
      </Page>
    </Document>
  );
};

// ================================================================
// FONCTION DE TÉLÉCHARGEMENT
// ================================================================
import { pdf } from '@react-pdf/renderer';

/**
 * Télécharge la facture au format PDF
 * @param {Object} facture - Les données de la facture
 * @param {string} filename - Nom du fichier (optionnel)
 * @returns {Promise<void>}
 */
export const downloadFacturePDF = async (facture, filename = null) => {
  try {
    if (!facture || typeof facture !== 'object') {
      throw new Error('Les données de la facture sont invalides');
    }

    // Générer le blob
    const blob = await pdf(<FacturePDF facture={facture} />).toBlob();

    // Créer un lien de téléchargement
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `Facture_${facture.reference || 'sans_ref'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Erreur lors du téléchargement de la facture PDF :', error);
    throw error;
  }
};

// Export par défaut du composant (pour compatibilité)
export default FacturePDF;