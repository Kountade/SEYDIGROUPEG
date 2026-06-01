// src/components/sales/DevisDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AxiosInstance from '../AxiosInstance';
import DevisPDF from './DevisPDF';
import { 
  ArrowLeft, Send, Check, Ban, ShoppingCart, Printer, 
  Edit, AlertCircle, CheckCircle, Clock, X
} from 'lucide-react';

const DevisDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [devis, setDevis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const statutConfig = {
    draft: { label: 'Brouillon', icon: Clock, color: 'text-gray-500', bgColor: 'bg-gray-100' },
    sent: { label: 'Envoyé', icon: Send, color: 'text-blue-500', bgColor: 'bg-blue-100' },
    accepted: { label: 'Accepté', icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-100' },
    refused: { label: 'Refusé', icon: Ban, color: 'text-red-500', bgColor: 'bg-red-100' },
    converted: { label: 'Converti en vente', icon: ShoppingCart, color: 'text-purple-500', bgColor: 'bg-purple-100' },
    expired: { label: 'Expiré', icon: AlertCircle, color: 'text-orange-500', bgColor: 'bg-orange-100' },
    cancelled: { label: 'Annulé', icon: Ban, color: 'text-gray-500', bgColor: 'bg-gray-100' }
  };

  const fetchDevis = async () => {
    setLoading(true);
    try {
      const response = await AxiosInstance.get(`/devis/${id}/`);
      setDevis(response.data);
    } catch (error) {
      console.error(error);
      showNotification('Erreur de chargement du devis', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevis();
  }, [id]);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000);
  };

  const handleAction = async (action, successMessage, data = null) => {
    if (!window.confirm(`Confirmer l'action : ${successMessage} ?`)) return;
    setActionLoading(true);
    try {
      await AxiosInstance.post(`/devis/${id}/${action}/`, data);
      showNotification(successMessage, 'success');
      fetchDevis();
    } catch (error) {
      showNotification(error.response?.data?.error || `Erreur lors de l'action`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToVente = async () => {
    if (!window.confirm('Convertir ce devis en vente ?')) return;
    setActionLoading(true);
    try {
      const response = await AxiosInstance.post(`/devis/${id}/convertir_en_vente/`);
      showNotification('Devis converti en vente avec succès', 'success');
      if (response.data.vente?.id) {
        navigate(`/ventes/${response.data.vente.id}`);
      } else {
        fetchDevis();
      }
    } catch (error) {
      showNotification(error.response?.data?.error || 'Erreur lors de la conversion', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      await DevisPDF(devis);
      showNotification('PDF généré avec succès', 'success');
    } catch (error) {
      showNotification('Erreur lors de la génération du PDF', 'error');
    }
  };

  const formatPrice = (price) => {
    if (!price) return '0 FCFA';
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const getStatusBadge = () => {
    if (!devis) return null;
    const config = statutConfig[devis.status] || statutConfig.draft;
    const Icon = config.icon;
    return (
      <span className={`badge ${config.bgColor} ${config.color} gap-2 px-4 py-3 text-base`}>
        <Icon className="w-4 h-4" /> {config.label}
      </span>
    );
  };

  const isExpired = () => {
    if (!devis || !devis.date_expiration) return false;
    return new Date(devis.date_expiration) < new Date() && devis.status !== 'converted' && devis.status !== 'cancelled';
  };

  const canSend = devis?.status === 'draft';
  const canAccept = devis?.status === 'sent' && !isExpired();
  const canRefuse = devis?.status === 'sent' && !isExpired();
  const canConvert = devis?.status === 'accepted';
  const canEdit = devis?.status === 'draft';

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!devis) {
    return (
      <div className="text-center p-10">
        <AlertCircle className="w-12 h-12 mx-auto text-error mb-4" />
        <h2 className="text-xl font-bold">Devis non trouvé</h2>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen w-full">
      {/* Notification flottante */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-slideDown">
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
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/devis')} className="btn btn-ghost btn-circle">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Devis {devis.reference}</h1>
            <p className="text-sm text-gray-500">Créé le {formatDate(devis.date_creation)}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canSend && (
            <button onClick={() => handleAction('envoyer', 'Devis envoyé')} className="btn btn-primary btn-sm gap-2" disabled={actionLoading}>
              <Send className="w-4 h-4" /> Envoyer
            </button>
          )}
          {canAccept && (
            <button onClick={() => handleAction('accepter', 'Devis accepté')} className="btn btn-success btn-sm gap-2" disabled={actionLoading}>
              <Check className="w-4 h-4" /> Accepter
            </button>
          )}
          {canRefuse && (
            <button
              onClick={() => {
                const motif = prompt('Motif du refus :');
                if (motif && motif.trim()) {
                  handleAction('refuser', 'Devis refusé', { motif: motif.trim() });
                } else if (motif === '') {
                  showNotification('Le motif ne peut pas être vide', 'error');
                }
              }}
              className="btn btn-error btn-sm gap-2"
              disabled={actionLoading}
            >
              <Ban className="w-4 h-4" /> Refuser
            </button>
          )}
          {canConvert && (
            <button onClick={handleConvertToVente} className="btn btn-secondary btn-sm gap-2" disabled={actionLoading}>
              <ShoppingCart className="w-4 h-4" /> Convertir en vente
            </button>
          )}
          {canEdit && (
            <button onClick={() => navigate(`/devis/${id}/edit`)} className="btn btn-outline btn-sm gap-2">
              <Edit className="w-4 h-4" /> Modifier
            </button>
          )}
          <button onClick={handleGeneratePDF} className="btn btn-outline btn-sm gap-2">
            <Printer className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* Informations générales */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-500 mb-2">Client</h3>
            {devis.client ? (
              <div className="space-y-1">
                <p className="font-medium">{devis.client.nom} {devis.client.prenom || ''}</p>
                <p className="text-sm">{devis.client.email || '-'}</p>
                <p className="text-sm">{devis.client.telephone || '-'}</p>
                <p className="text-sm">{devis.client.adresse || '-'}</p>
              </div>
            ) : (
              <p className="text-gray-400">Aucun client associé</p>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-500 mb-2">Détails du devis</h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-gray-600">Agence :</span><span>{devis.agence?.nom || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Vendeur :</span><span>{devis.vendeur?.email || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Expiration :</span><span className={isExpired() ? 'text-error font-semibold' : ''}>{formatDate(devis.date_expiration)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Statut :</span>{getStatusBadge()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des articles */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">Articles</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Référence</th>
                <th>Qté</th>
                <th>Prix unitaire</th>
                <th>Remise</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {devis.items && devis.items.length > 0 ? (
                devis.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.product_name}</td>
                    <td className="font-mono text-xs">{item.product_reference}</td>
                    <td>{item.quantity}</td>
                    <td>{formatPrice(item.prix_unitaire)}</td>
                    <td>{formatPrice(item.remise)}</td>
                    <td className="font-semibold">{formatPrice(item.total)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-6">Aucun article</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t bg-gray-50 text-right">
          <div className="space-y-1">
            <p>Sous-total : <span className="font-mono">{formatPrice(devis.sous_total)}</span></p>
            {devis.remise > 0 && (
              <p>Remise : <span className="font-mono text-error">-{formatPrice(devis.remise)}</span></p>
            )}
            <p className="text-xl font-bold">Total TTC : <span className="text-primary">{formatPrice(devis.total)}</span></p>
          </div>
        </div>
      </div>

      {/* Conditions, notes, pied de page */}
      {(devis.conditions || devis.notes || devis.pied_de_page) && (
        <div className="bg-white rounded-xl shadow-md p-6">
          {devis.conditions && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-500 mb-1">Conditions générales</h3>
              <p className="whitespace-pre-wrap">{devis.conditions}</p>
            </div>
          )}
          {devis.notes && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-500 mb-1">Notes</h3>
              <p className="whitespace-pre-wrap">{devis.notes}</p>
            </div>
          )}
          {devis.pied_de_page && (
            <div>
              <h3 className="font-semibold text-gray-500 mb-1">Pied de page</h3>
              <p className="whitespace-pre-wrap">{devis.pied_de_page}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DevisDetail;