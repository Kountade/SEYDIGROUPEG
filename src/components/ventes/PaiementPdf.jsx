// src/components/paiements/PaiementPdf.jsx
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
// STYLES (identiques à DevisPDF / FacturePDF)
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
  statusCompleted: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#4caf50',
    borderStyle: 'solid',
  },
  statusPending: {
    backgroundColor: '#fff3e0',
    borderWidth: 1,
    borderColor: '#ff9800',
    borderStyle: 'solid',
  },
  statusFailed: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#f44336',
    borderStyle: 'solid',
  },
  statusRefunded: {
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
  statusTextCompleted: { color: '#4caf50' },
  statusTextPending: { color: '#ff9800' },
  statusTextFailed: { color: '#f44336' },
  statusTextRefunded: { color: '#757575' },
  amountBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#e8eaf6',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#c5cae9',
    borderStyle: 'solid',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a237e',
    letterSpacing: 1,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a237e',
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
  factureBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'solid',
  },
  factureRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
    borderBottomStyle: 'solid',
  },
  factureRowLast: {
    flexDirection: 'row',
    paddingVertical: 3,
  },
  factureLabel: {
    width: '35%',
    fontSize: 9,
    color: '#546e7a',
  },
  factureValue: {
    width: '65%',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1a237e',
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
    completed: { label: 'Complété', style: styles.statusCompleted, textStyle: styles.statusTextCompleted },
    pending: { label: 'En attente', style: styles.statusPending, textStyle: styles.statusTextPending },
    failed: { label: 'Échoué', style: styles.statusFailed, textStyle: styles.statusTextFailed },
    refunded: { label: 'Remboursé', style: styles.statusRefunded, textStyle: styles.statusTextRefunded },
  };
  return map[status] || map.completed;
};

const getMethodLabel = (method) => {
  const map = {
    especes: 'Espèces',
    carte: 'Carte bancaire',
    cheque: 'Chèque',
    virement: 'Virement',
    mobile_money: 'Mobile Money',
    autre: 'Autre',
  };
  return map[method] || method || '-';
};

// ================================================================
// COMPOSANT PRINCIPAL – PaiementPDF
// ================================================================
const PaiementPDF = ({ paiement }) => {
  const data = paiement || {};
  const client = data.client || {};

  const company = {
    name: 'SEYDI GROUP SARL',
    address: 'Dakar, Sénégal',
    phone: '+221 33 123 45 67',
    email: 'contact@seydigroup.com',
    rccm: 'SN DKR 2023 B 123',
    capital: '10 000 000 FCFA',
  };

  // Client
  const clientNom = data.facture_client_nom || data.client_nom || client.nom || 'Client inconnu';
  const clientPrenom = data.facture_client_prenom || data.client_prenom || client.prenom || '';
  const clientRaison = data.facture_client_raison_sociale || data.client_raison_sociale || client.raison_sociale || '';
  const clientEmail = data.facture_client_email || data.client_email || client.email || '';
  const clientTel = data.facture_client_telephone || data.client_telephone || client.telephone || '';
  const clientAdr = data.facture_client_adresse || data.client_adresse || client.adresse || '';

  const clientFull = clientRaison || (clientPrenom ? `${clientNom} ${clientPrenom}` : clientNom);

  // Facture associée
  const factureRef = data.facture_ref || data.facture?.reference || '-';
  const factureDate = data.facture_date || data.facture?.date_facture;
  const factureTotal = data.facture_total ?? data.facture?.total_ttc ?? 0;
  const factureRestant = data.facture_restant ?? data.facture?.montant_restant ?? 0;

  // Paiement
  const methodLabel = getMethodLabel(data.methode);
  const statusInfo = getStatusInfo(data.statut);
  const montant = parseFloat(data.montant) || 0;
  const referenceExterne = data.reference_externe || '-';
  const encaissePar = data.encaisse_par?.email || data.encaisse_par_nom || '-';
  const notes = data.notes || '';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark}>REÇU DE PAIEMENT</Text>

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
            <Text style={styles.documentTitle}>REÇU DE PAIEMENT</Text>
            <Text style={styles.documentRef}>N° {data.reference || 'Sans référence'}</Text>
            <Text style={styles.documentRef}>
              Émis le {formatDate(new Date().toISOString())}
            </Text>
          </View>
        </View>

        {/* Grille d'informations générales */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Date paiement</Text>
            <Text style={styles.infoValue}>{formatDate(data.date_paiement)}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Méthode</Text>
            <Text style={styles.infoValue}>{methodLabel}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Réf. externe</Text>
            <Text style={styles.infoValue}>{referenceExterne}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Encaissé par</Text>
            <Text style={styles.infoValue}>{encaissePar}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Statut</Text>
            <View style={[styles.statusBadge, statusInfo.style]}>
              <Text style={[styles.statusText, statusInfo.textStyle]}>{statusInfo.label}</Text>
            </View>
          </View>
        </View>

        {/* Montant */}
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>MONTANT ENCAISSÉ</Text>
          <Text style={styles.amountValue}>{formatCurrency(montant)}</Text>
        </View>

        {/* Informations client */}
        {clientFull !== 'Client inconnu' && (
          <>
            <Text style={styles.sectionTitle}>INFORMATIONS CLIENT</Text>
            <View style={styles.clientSection}>
              <View style={styles.clientRow}>
                <Text style={styles.clientLabel}>Nom</Text>
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
          </>
        )}

        {/* Facture associée */}
        {factureRef !== '-' && (
          <>
            <Text style={styles.sectionTitle}>FACTURE ASSOCIÉE</Text>
            <View style={styles.factureBox}>
              <View style={styles.factureRow}>
                <Text style={styles.factureLabel}>Référence</Text>
                <Text style={styles.factureValue}>{factureRef}</Text>
              </View>
              {factureDate && (
                <View style={styles.factureRow}>
                  <Text style={styles.factureLabel}>Date</Text>
                  <Text style={styles.factureValue}>{formatDate(factureDate)}</Text>
                </View>
              )}
              <View style={styles.factureRow}>
                <Text style={styles.factureLabel}>Total TTC</Text>
                <Text style={styles.factureValue}>{formatCurrency(factureTotal)}</Text>
              </View>
              <View style={styles.factureRowLast}>
                <Text style={styles.factureLabel}>Reste à payer</Text>
                <Text style={styles.factureValue}>{formatCurrency(factureRestant)}</Text>
              </View>
            </View>
          </>
        )}

        {/* Notes */}
        {notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{notes}</Text>
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
 * Télécharge le reçu de paiement au format PDF
 * @param {Object} paiement - Les données du paiement
 * @param {string} filename - Nom du fichier (optionnel)
 * @returns {Promise<void>}
 */
export const downloadPaiementPDF = async (paiement, filename = null) => {
  try {
    if (!paiement || typeof paiement !== 'object') {
      throw new Error('Les données du paiement sont invalides');
    }

    const blob = await pdf(<PaiementPDF paiement={paiement} />).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `Reçu_paiement_${paiement.reference || 'paiement'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Erreur lors du téléchargement du reçu de paiement :', error);
    throw error;
  }
};

// Export par défaut du composant (pour compatibilité)
export default PaiementPDF;