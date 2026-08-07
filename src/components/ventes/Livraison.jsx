// src/components/ventes/Livraison.jsx
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
// STYLES – identiques à ExpensePDF (adaptés pour Bon de Livraison)
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
    width: '30%',
    fontSize: 9,
    color: '#546e7a',
  },
  clientValue: {
    width: '70%',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1a237e',
  },
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
  amountBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#e8eaf6',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#c5cae9',
    borderStyle: 'solid',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a237e',
    fontFamily: 'Helvetica',
    letterSpacing: 1,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a237e',
    fontFamily: 'Helvetica',
  },
  lettresBox: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'solid',
    flexDirection: 'row',
  },
  lettresLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1a237e',
    marginRight: 10,
  },
  lettresValue: {
    fontSize: 8,
    color: '#212121',
    flex: 1,
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

// Fonction pour écrire les nombres en lettres (reprise de l'ancienne version)
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

// ================================================================
// COMPOSANT PRINCIPAL – LivraisonPDF (identique à ExpensePDF)
// ================================================================
const LivraisonPDF = ({ vente, options = {} }) => {
  const data = vente || {};
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

  // Options de livraison
  const dateLivraison = options.date_livraison || '';
  const adresseLivraison = options.adresse_livraison || clientAdr;
  const contactLivraison = options.contact_livraison || clientTel;
  const instructions = options.instructions || '';

  // Vente
  const reference = data.reference || 'Sans référence';
  const dateVente = data.date_vente || new Date().toISOString();
  const typeVente = data.type_vente || 'comptoir';
  const agenceNom = agence.nom || 'Agence principale';
  const vendeurNom = vendeur.email || vendeur.nom || 'Commercial';

  // Totaux (sans TVA)
  let sousTotal = 0;
  items.forEach((item) => {
    const qty = item.quantity || 0;
    const price = item.prix_unitaire || 0;
    const remise = item.remise || 0;
    sousTotal += qty * price - remise;
  });
  const total = data.total || sousTotal;
  const totalEnLettres = nombreEnLettres(total);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Filigrane */}
        <Text style={styles.watermark}>BON DE LIVRAISON</Text>

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
            <Text style={styles.documentTitle}>BON DE LIVRAISON</Text>
            <Text style={styles.documentRef}>N° {reference}</Text>
            <Text style={styles.documentRef}>
              Émis le {formatDate(new Date().toISOString())}
            </Text>
          </View>
        </View>

        {/* Informations générales */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Date vente</Text>
            <Text style={styles.infoValue}>{formatDate(dateVente)}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Agence</Text>
            <Text style={styles.infoValue}>{agenceNom}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Vendeur</Text>
            <Text style={styles.infoValue}>{vendeurNom}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Type</Text>
            <Text style={styles.infoValue}>
              {typeVente === 'comptoir' ? 'Comptoir' :
               typeVente === 'livraison' ? 'Livraison' :
               typeVente === 'en_ligne' ? 'En ligne' : typeVente}
            </Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Date livraison</Text>
            <Text style={styles.infoValue}>{dateLivraison ? formatDate(dateLivraison) : 'Non spécifiée'}</Text>
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
            <View style={styles.clientRow}>
              <Text style={styles.clientLabel}>Adresse</Text>
              <Text style={styles.clientValue}>{clientAdr}</Text>
            </View>
          )}
          {adresseLivraison && adresseLivraison !== clientAdr && (
            <View style={styles.clientRowLast}>
              <Text style={styles.clientLabel}>Adresse de livraison</Text>
              <Text style={styles.clientValue}>{adresseLivraison}</Text>
            </View>
          )}
          {contactLivraison && contactLivraison !== clientTel && (
            <View style={styles.clientRowLast}>
              <Text style={styles.clientLabel}>Contact livraison</Text>
              <Text style={styles.clientValue}>{contactLivraison}</Text>
            </View>
          )}
        </View>

        {/* Articles */}
        <Text style={styles.sectionTitle}>ARTICLES</Text>
        {items.length === 0 ? (
          <View style={styles.emptyItems}>
            <Text style={styles.emptyItemsText}>Aucun article dans cette commande.</Text>
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

        {/* Montant total (similaire à amountBox d'ExpensePDF) */}
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>TOTAL</Text>
          <Text style={styles.amountValue}>{formatCurrency(total)}</Text>
        </View>

        {/* Montant en toutes lettres */}
        <View style={styles.lettresBox}>
          <Text style={styles.lettresLabel}>Montant en toutes lettres :</Text>
          <Text style={styles.lettresValue}>{totalEnLettres}</Text>
        </View>

        {/* Instructions spéciales */}
        {instructions && (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Instructions spéciales</Text>
            <Text style={styles.notesText}>{instructions}</Text>
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
            SEYDI GROUP SARL - DAKAR, SÉNÉGAL
          </Text>
          <Text style={styles.footerText}>
            Tél: (+221) 33 123 45 67 - Email: contact@seydigroup.com
          </Text>
          <Text style={styles.footerText}>
            RCCM: SN DKR 2023 B 123
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
 * Télécharge le bon de livraison au format PDF
 * @param {Object} vente - Les données de la vente
 * @param {Object} options - Options de livraison
 * @param {string} filename - Nom du fichier (optionnel)
 * @returns {Promise<void>}
 */
const Livraison = async (vente, options = {}, filename = null) => {
  try {
    if (!vente || typeof vente !== 'object') {
      throw new Error('Les données de la vente sont invalides');
    }

    const blob = await pdf(<LivraisonPDF vente={vente} options={options} />).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `Bon_livraison_${vente.reference || 'vente'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Erreur lors du téléchargement du bon de livraison :', error);
    throw error;
  }
};

export default Livraison;