// src/components/sales/ClientDetail.jsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AxiosInstance from '../AxiosInstance';
import {
  ArrowLeft, User, Building2, Phone, Mail, MapPin, Edit,
  ShoppingCart, FileText, CreditCard, Star, StarOff,
  Calendar, Briefcase, Tag, AlertCircle, CheckCircle,
  RefreshCw, Trash2, Package, DollarSign, Users,
  Eye, X, ChevronLeft, ChevronRight, Loader2,
  FileDown
} from 'lucide-react';
import { downloadClientFacturesPDF } from './ClientFacturesPDF'; // Import de la fonction PDF


const ClientDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [client, setClient] = useState(null);
  const [ventes, setVentes] = useState([]);
  const [factures, setFactures] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ventes');
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await AxiosInstance.get(`/clients/${id}/`);
      
      // La réponse contient déjà toutes les données
      const data = response.data;
      setClient(data);
      setVentes(data.ventes || []);
      setFactures(data.factures || []);
      
      // Utiliser les stats calculées par le backend
      setStats({
        totalAchats: data.total_achats || 0,
        totalPaye: data.total_paye || 0,
        resteAPayer: data.reste_a_payer || 0,
        nbVentes: data.total_ventes || 0,
        nbFactures: data.total_factures || 0
      });
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur de chargement', 'error');
      if (error.response?.status === 404) {
        setTimeout(() => navigate('/clients'), 1500);
      } else if (error.response?.status === 401) {
        showNotification('Session expirée', 'error');
        setTimeout(() => navigate('/login'), 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  // ========== GÉNÉRATION PDF ==========
  const handleGeneratePDF = async () => {
    if (factures.length === 0) {
      showNotification('Aucune facture à télécharger', 'error');
      return;
    }
    try {
      // Créer un objet client avec les bonnes propriétés pour le PDF
      const clientForPDF = {
        id: client.id,
        nom: client.nom,
        prenom: client.prenom || '',
        code: client.code || `CLT-${String(client.id).padStart(4, '0')}`,
        telephone: client.telephone,
        email: client.email,
        adresse: client.adresse,
        // Pour compatibilité avec le PDF
        name: client.nom,
        phone: client.telephone,
        address: client.adresse
      };

      // Formater les factures pour le PDF
      const facturesForPDF = factures.map(f => ({
        id: f.id,
        reference: f.reference,
        total_ttc: f.total_ttc || f.total || 0,
        montant_paye: f.montant_paye || f.amount_paid || 0,
        date_facture: f.date_facture,
        date_echeance: f.date_echeance,
        status: f.status || 'draft',
        // Pour compatibilité
        total: f.total_ttc || f.total || 0,
        amount_paid: f.montant_paye || f.amount_paid || 0,
        invoice_date: f.date_facture,
        due_date: f.date_echeance,
        invoice_number: f.reference
      }));

      await downloadClientFacturesPDF(clientForPDF, facturesForPDF, {
        filename: `Releve_factures_${client.code || client.id}_${new Date().toISOString().slice(0,10)}.pdf`,
        watermark: 'RELEVÉ DE FACTURES',
        watermarkOpacity: 0.08
      });
      showNotification('PDF généré avec succès', 'success');
    } catch (error) {
      console.error('Erreur PDF:', error);
      showNotification('Erreur lors de la génération du PDF', 'error');
    }
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return '0 FCFA';
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(price) + ' FCFA';
  };

  const formatDate = (date) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit', 
        month: 'short', 
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      completed: { label: 'Complétée', className: 'badge-success' },
      approved: { label: 'Approuvée', className: 'badge-info' },
      pending_approval: { label: 'En attente', className: 'badge-warning' },
      draft: { label: 'Brouillon', className: 'badge-ghost' },
      cancelled: { label: 'Annulée', className: 'badge-error' },
      rejected: { label: 'Rejetée', className: 'badge-error' }
    };
    const config = configs[status] || { label: status, className: 'badge-ghost' };
    return <span className={`badge ${config.className}`}>{config.label}</span>;
  };

  const getFactureStatusBadge = (status) => {
    const configs = {
      paid: { label: 'Payée', className: 'badge-success' },
      partially_paid: { label: 'Partiellement payée', className: 'badge-warning' },
      overdue: { label: 'En retard', className: 'badge-error' },
      sent: { label: 'Envoyée', className: 'badge-info' },
      draft: { label: 'Brouillon', className: 'badge-ghost' },
      cancelled: { label: 'Annulée', className: 'badge-error' }
    };
    const config = configs[status] || { label: status, className: 'badge-ghost' };
    return <span className={`badge ${config.className}`}>{config.label}</span>;
  };

  // Calcul des totaux des factures
  const totalFactures = factures.reduce((sum, f) => sum + (Number(f.total_ttc || f.total) || 0), 0);
  const totalPaye = factures.reduce((sum, f) => sum + (Number(f.montant_paye || f.amount_paid) || 0), 0);
  const totalRestant = totalFactures - totalPaye;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin text-primary w-12 h-12 mx-auto" />
          <p className="text-base font-semibold text-base-content/70">
            Chargement du client...
          </p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center max-w-md p-6 bg-white rounded-xl shadow-lg">
          <AlertCircle className="w-20 h-20 text-error mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Client non trouvé</h2>
          <p className="text-gray-500 mb-6">Le client que vous recherchez n'existe pas.</p>
          <button onClick={() => navigate('/clients')} className="btn btn-primary">
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 min-h-screen">
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 animate-slideDown">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-xl rounded-xl`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{notification.message}</span>
            </div>
            <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setNotification({ show: false, message: '', type: 'success' })}>
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/clients')} className="btn btn-ghost btn-sm btn-circle">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-primary">
                {client.nom} {client.prenom || ''}
              </h1>
              {client.raison_sociale && (
                <p className="text-sm text-gray-500">{client.raison_sociale}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchData} className="btn btn-outline btn-sm gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
            </button>
            <button onClick={() => navigate(`/clients/${id}/modifier`)} className="btn btn-primary btn-sm gap-2">
              <Edit className="w-4 h-4" /> Modifier
            </button>
          </div>
        </div>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-white shadow-md rounded-xl">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Ventes</p>
                <p className="text-2xl font-bold text-primary">{stats?.nbVentes || 0}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-primary/20" />
            </div>
          </div>
        </div>
        <div className="card bg-white shadow-md rounded-xl">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Factures</p>
                <p className="text-2xl font-bold text-secondary">{stats?.nbFactures || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-secondary/20" />
            </div>
          </div>
        </div>
        <div className="card bg-white shadow-md rounded-xl">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total achats</p>
                <p className="text-lg font-bold text-success">{formatPrice(stats?.totalAchats)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-success/20" />
            </div>
          </div>
        </div>
        <div className="card bg-white shadow-md rounded-xl">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Reste à payer</p>
                <p className="text-lg font-bold text-warning">{formatPrice(stats?.resteAPayer)}</p>
              </div>
              <CreditCard className="w-8 h-8 text-warning/20" />
            </div>
          </div>
        </div>
      </div>

      {/* Informations client */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Informations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span>{client.nom} {client.prenom || ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-400" />
            <span>{client.telephone}</span>
          </div>
          {client.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span>{client.email}</span>
            </div>
          )}
          {client.adresse && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span>{client.adresse}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className={`badge ${client.client_type === 'entreprise' ? 'badge-secondary' : client.client_type === 'revendeur' ? 'badge-warning' : 'badge-primary'}`}>
              {client.client_type === 'entreprise' ? 'Entreprise' : client.client_type === 'revendeur' ? 'Revendeur' : 'Particulier'}
            </span>
            {client.est_revendeur && <span className="badge badge-warning">Revendeur</span>}
            {!client.is_active && <span className="badge badge-error">Inactif</span>}
          </div>
        </div>
      </div>

      {/* Tabs avec bouton PDF */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="tabs tabs-boxed bg-white p-1">
          <button 
            className={`tab ${activeTab === 'ventes' ? 'tab-active' : ''}`} 
            onClick={() => setActiveTab('ventes')}
          >
            <ShoppingCart className="w-4 h-4 mr-2" /> Ventes ({ventes.length})
          </button>
          <button 
            className={`tab ${activeTab === 'factures' ? 'tab-active' : ''}`} 
            onClick={() => setActiveTab('factures')}
          >
            <FileText className="w-4 h-4 mr-2" /> Factures ({factures.length})
          </button>
        </div>
        
        {/* Bouton PDF - visible uniquement dans l'onglet Factures */}
        {activeTab === 'factures' && (
          <button
            onClick={handleGeneratePDF}
            disabled={factures.length === 0}
            className={`btn btn-primary btn-sm gap-2 ${factures.length === 0 ? 'btn-disabled opacity-50 cursor-not-allowed' : ''}`}
            title={factures.length === 0 ? 'Aucune facture à télécharger' : 'Générer le PDF des factures'}
          >
            <FileDown className="w-4 h-4" /> Télécharger PDF
          </button>
        )}
      </div>

      {/* Contenu Ventes */}
      {activeTab === 'ventes' && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th>Référence</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ventes.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8">
                      <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500">Aucune vente pour ce client</p>
                    </td>
                  </tr>
                ) : (
                  ventes.map((vente) => (
                    <tr key={vente.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/ventes/${vente.id}`)}>
                      <td className="font-mono text-sm">{vente.reference}</td>
                      <td>{formatDate(vente.date_vente)}</td>
                      <td className="font-semibold">{formatPrice(vente.total)}</td>
                      <td>{getStatusBadge(vente.status)}</td>
                      <td>
                        <button className="btn btn-ghost btn-xs" onClick={(e) => { e.stopPropagation(); navigate(`/ventes/${vente.id}`); }}>
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contenu Factures */}
      {activeTab === 'factures' && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          {/* Résumé des totaux des factures */}
          {factures.length > 0 && (
            <div className="grid grid-cols-3 gap-4 px-6 py-3 bg-info/5 border-b border-gray-200">
              <div className="text-center">
                <p className="text-xs text-gray-500">Total factures</p>
                <p className="text-lg font-bold text-primary">{formatPrice(totalFactures)}</p>
              </div>
              <div className="text-center border-x border-gray-200">
                <p className="text-xs text-gray-500">Total payé</p>
                <p className="text-lg font-bold text-success">{formatPrice(totalPaye)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Reste à payer</p>
                <p className={`text-lg font-bold ${totalRestant > 0 ? 'text-error' : 'text-success'}`}>
                  {formatPrice(totalRestant)}
                </p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th>Référence</th>
                  <th>Date</th>
                  <th>Échéance</th>
                  <th>Total</th>
                  <th>Payé</th>
                  <th>Reste</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {factures.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500">Aucune facture pour ce client</p>
                    </td>
                  </tr>
                ) : (
                  factures.map((facture) => {
                    const total = Number(facture.total_ttc || facture.total) || 0;
                    const paye = Number(facture.montant_paye || facture.amount_paid) || 0;
                    const reste = total - paye;
                    const isOverdue = new Date(facture.date_echeance) < new Date() && facture.status !== 'paid';
                    
                    return (
                      <tr key={facture.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/factures/${facture.id}`)}>
                        <td className="font-mono text-sm">{facture.reference}</td>
                        <td>{formatDate(facture.date_facture)}</td>
                        <td>
                          <span className={isOverdue ? 'text-error font-medium' : ''}>
                            {formatDate(facture.date_echeance)}
                            {isOverdue && (
                              <span className="ml-1 badge badge-error badge-xs">En retard</span>
                            )}
                          </span>
                        </td>
                        <td className="font-semibold">{formatPrice(total)}</td>
                        <td className="text-success">{formatPrice(paye)}</td>
                        <td className="font-semibold">
                          <span className={reste > 0 ? 'text-error' : 'text-success'}>
                            {formatPrice(reste)}
                          </span>
                        </td>
                        <td>{getFactureStatusBadge(facture.status)}</td>
                        <td>
                          <button className="btn btn-ghost btn-xs" onClick={(e) => { e.stopPropagation(); navigate(`/factures/${facture.id}`); }}>
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {factures.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan="3" className="px-4 py-3 text-right font-bold">TOTAUX</td>
                    <td className="px-4 py-3 text-right font-bold text-primary">{formatPrice(totalFactures)}</td>
                    <td className="px-4 py-3 text-right font-bold text-success">{formatPrice(totalPaye)}</td>
                    <td className="px-4 py-3 text-right font-bold">
                      <span className={totalRestant > 0 ? 'text-error' : 'text-success'}>
                        {formatPrice(totalRestant)}
                      </span>
                    </td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetail;