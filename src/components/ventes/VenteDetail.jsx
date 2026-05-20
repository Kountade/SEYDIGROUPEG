// src/components/sales/VenteDetail.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AxiosInstance from '../AxiosInstance';
import {
  ArrowLeft, ShoppingCart, User, Calendar, CreditCard,
  CheckCircle, XCircle, Clock, Printer, Download,
  RefreshCw, AlertCircle, FileText, Truck, Building2
} from 'lucide-react';

const VenteDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [vente, setVente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [userRole, setUserRole] = useState(null);

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000);
  };

  const fetchVente = async () => {
    setLoading(true);
    try {
      const [venteRes, userRes] = await Promise.all([
        AxiosInstance.get(`/ventes/${id}/`),
        AxiosInstance.get('/users/me/')
      ]);
      setVente(venteRes.data);
      setUserRole(userRes.data);
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVente();
  }, [id]);

  const handleApprove = async () => {
    try {
      await AxiosInstance.post(`/ventes/${id}/approve/`);
      showNotification('Vente approuvée avec succès', 'success');
      fetchVente();
    } catch (error) {
      showNotification(error.response?.data?.error || 'Erreur lors de l\'approbation', 'error');
    }
  };

  const handleReject = async () => {
    const motif = prompt('Motif du rejet:');
    if (!motif) return;
    try {
      await AxiosInstance.post(`/ventes/${id}/reject/`, { motif });
      showNotification('Vente rejetée', 'success');
      fetchVente();
    } catch (error) {
      showNotification('Erreur lors du rejet', 'error');
    }
  };

  const handleComplete = async () => {
    try {
      await AxiosInstance.post(`/ventes/${id}/complete/`);
      showNotification('Vente complétée', 'success');
      fetchVente();
    } catch (error) {
      showNotification('Erreur', 'error');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR').format(price || 0) + ' FCFA';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const statusConfig = {
    draft: { label: 'Brouillon', icon: Clock, color: 'text-gray-600', bgColor: 'bg-gray-100' },
    pending_approval: { label: 'En attente', icon: Clock, color: 'text-orange-600', bgColor: 'bg-orange-100' },
    approved: { label: 'Approuvée', icon: CheckCircle, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    rejected: { label: 'Rejetée', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
    completed: { label: 'Complétée', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
    cancelled: { label: 'Annulée', icon: XCircle, color: 'text-gray-600', bgColor: 'bg-gray-100' }
  };

  const canApprove = vente?.status === 'pending_approval' && (userRole?.est_chef_agence || userRole?.est_pdg);
  const canComplete = vente?.status === 'approved' && vente?.montant_paye >= vente?.total;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    );
  }

  if (!vente) return null;

  const status = statusConfig[vente.status] || statusConfig.draft;
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 lg:p-8">
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-20 right-6 z-50 alert shadow-xl max-w-md">
          <div className={`flex items-center gap-2 ${notification.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/ventes')} className="btn btn-ghost btn-sm btn-circle"><ArrowLeft className="w-5 h-5" /></button>
          <div><h1 className="text-2xl font-bold text-primary">Vente {vente.reference}</h1><p className="text-sm text-gray-500">Créée le {formatDate(vente.date_vente)}</p></div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchVente} className="btn btn-outline btn-sm gap-2"><RefreshCw className="w-4 h-4" /> Actualiser</button>
          <button className="btn btn-outline btn-sm gap-2"><Printer className="w-4 h-4" /> Imprimer</button>
        </div>
      </div>

      {/* Actions */}
      {(canApprove || canComplete) && (
        <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex gap-3">
          {canApprove && <><button onClick={handleApprove} className="btn btn-success gap-2 flex-1"><CheckCircle className="w-4 h-4" /> Approuver</button><button onClick={handleReject} className="btn btn-error gap-2 flex-1"><XCircle className="w-4 h-4" /> Rejeter</button></>}
          {canComplete && <button onClick={handleComplete} className="btn btn-primary gap-2 flex-1"><CheckCircle className="w-4 h-4" /> Compléter la vente</button>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Infos principales */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6"><h2 className="text-lg font-semibold mb-4">Articles</h2><div className="overflow-x-auto"><table className="table w-full"><thead><tr><th>Produit</th><th>Qté</th><th>Prix unitaire</th><th>Total</th></tr></thead><tbody>{vente.items?.map((item, idx) => (<tr key={idx}><td>{item.product_name}</td><td>{item.quantity}</td><td>{formatPrice(item.prix_unitaire)}</td><td className="font-semibold">{formatPrice(item.total)}</td></tr>))}</tbody><tfoot><tr><td colSpan="3" className="text-right">Sous-total</td><td>{formatPrice(vente.sous_total)}</td></tr><tr><td colSpan="3" className="text-right">TVA (18%)</td><td>{formatPrice(vente.tva)}</td></tr><tr className="font-bold"><td colSpan="3" className="text-right">Total</td><td className="text-primary text-lg">{formatPrice(vente.total)}</td></tr></tfoot></table></div></div>

          <div className="bg-white rounded-xl shadow-md p-6"><h2 className="text-lg font-semibold mb-4">Paiements</h2>{vente.paiements?.length === 0 ? (<div className="text-center py-8 text-gray-400"><CreditCard className="w-12 h-12 mx-auto mb-2" /><p>Aucun paiement enregistré</p></div>) : (<div className="space-y-2">{vente.paiements?.map((p, idx) => (<div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-gray-400" /><span>{p.methode}</span><span className="text-sm text-gray-500">{new Date(p.date_paiement).toLocaleString()}</span></div><span className="font-semibold text-green-600">{formatPrice(p.montant)}</span></div>))}</div>)}<div className="mt-4 pt-3 border-t flex justify-between"><span>Montant payé</span><span className="font-semibold text-green-600">{formatPrice(vente.montant_paye)}</span></div><div className="flex justify-between"><span>Reste à payer</span><span className="font-semibold text-red-600">{formatPrice(vente.reste_a_payer)}</span></div></div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6"><h2 className="text-lg font-semibold mb-4">Informations</h2><div className="space-y-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><ShoppingCart className="w-4 h-4 text-primary" /></div><div><p className="text-xs text-gray-500">Statut</p><p className={`flex items-center gap-1 ${status.color}`}><StatusIcon className="w-4 h-4" />{status.label}</p></div></div><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><User className="w-4 h-4 text-blue-500" /></div><div><p className="text-xs text-gray-500">Client</p><p>{vente.client?.nom || 'Anonyme'} {vente.client?.prenom || ''}</p></div></div><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"><Calendar className="w-4 h-4 text-green-500" /></div><div><p className="text-xs text-gray-500">Date</p><p>{formatDate(vente.date_vente)}</p></div></div><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center"><Building2 className="w-4 h-4 text-purple-500" /></div><div><p className="text-xs text-gray-500">Agence</p><p>{vente.agence?.nom}</p></div></div></div></div>

          {vente.notes && (<div className="bg-white rounded-xl shadow-md p-6"><h2 className="text-lg font-semibold mb-2">Notes</h2><p className="text-gray-600 text-sm">{vente.notes}</p></div>)}

          {vente.motif_rejet && (<div className="bg-red-50 rounded-xl shadow-md p-6 border border-red-200"><h2 className="text-lg font-semibold text-red-700 mb-2">Motif du rejet</h2><p className="text-red-600 text-sm">{vente.motif_rejet}</p></div>)}
        </div>
      </div>
    </div>
  );
};

export default VenteDetail;