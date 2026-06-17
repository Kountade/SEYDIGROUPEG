// src/components/sales/VenteDetail.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AxiosInstance from '../AxiosInstance';
import BonLivraisonPdf from './BonLivraisonPdf';
import { 
  ArrowLeft, ShoppingCart, User, Calendar, CreditCard, 
  CheckCircle, XCircle, Clock, Printer, AlertCircle, 
  RefreshCw, Building2, Package, Truck, FileText, Eye, Info,
  Send, ThumbsUp, ThumbsDown, CheckSquare, X, Loader2
} from 'lucide-react';

const VenteDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [vente, setVente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingBl, setGeneratingBl] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [currentUser, setCurrentUser] = useState(null);
  const [userRoles, setUserRoles] = useState({ est_pdg: false, est_chef_agence: false, est_commercial: false });
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({ montant: '', methode: 'especes', reference: '' });

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000);
  };

  // Récupérer l'utilisateur connecté
  const fetchCurrentUser = async () => {
    try {
      const response = await AxiosInstance.get('/users/me/');
      const userData = response.data;
      setCurrentUser(userData);
      
      const isPDG = userData.role_global === 'pdg' || userData.is_superuser === true;
      const isChefAgence = userData.roles_agence?.some(r => r.role === 'chef_agence') || false;
      const isCommercial = userData.roles_agence?.some(r => r.role === 'commercial') || false;
      
      setUserRoles({
        est_pdg: isPDG,
        est_chef_agence: isChefAgence,
        est_commercial: isCommercial
      });
      
      console.log('👤 Utilisateur:', userData.email);
      console.log('🎯 Est PDG:', isPDG);
      console.log('🎯 Est Chef agence:', isChefAgence);
      console.log('🎯 Est Commercial:', isCommercial);
      
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
    }
  };

  const fetchVente = async () => {
    setLoading(true);
    try {
      const response = await AxiosInstance.get(`/ventes/${id}/`);
      console.log('📦 Données vente reçues:', response.data);
      setVente(response.data);
    } catch (error) {
      console.error('❌ Erreur:', error);
      showNotification('Erreur de chargement de la vente', 'error');
      if (error.response?.status === 404) {
        setTimeout(() => navigate('/ventes'), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  // Générer le bon de livraison PDF
  const handleGenerateBonLivraison = async () => {
    if (!vente || (vente.status !== 'approved' && vente.status !== 'completed')) {
      showNotification('Seules les ventes approuvées ou complétées peuvent générer un bon de livraison', 'error');
      return;
    }
    
    setGeneratingBl(true);
    try {
      // Récupérer les détails complets de la vente (si nécessaire)
      const venteData = vente;
      
      // Options pour le bon de livraison
      const options = {
        date_livraison: new Date().toISOString().split('T')[0],
        adresse_livraison: venteData.client?.adresse || '',
        contact_livraison: venteData.client?.telephone || '',
        instructions: ''
      };
      
      await BonLivraisonPdf(venteData, options);
      showNotification(`Bon de livraison généré pour ${vente.reference}`, 'success');
    } catch (error) {
      console.error('Erreur génération bon de livraison:', error);
      showNotification('Erreur lors de la génération du bon de livraison', 'error');
    } finally {
      setGeneratingBl(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchVente();
  }, [id]);

  // Vérifier les permissions
  const canApprove = () => userRoles.est_pdg || userRoles.est_chef_agence;
  const canSubmit = () => vente?.status === 'draft' && (userRoles.est_commercial || userRoles.est_pdg || userRoles.est_chef_agence);
  const canComplete = () => vente?.status === 'approved' && vente?.montant_paye >= vente?.total;
  const canAddPayment = () => vente?.status === 'approved' && vente?.montant_paye < vente?.total;
  const canEdit = () => vente?.status === 'draft' && (userRoles.est_commercial || userRoles.est_pdg || userRoles.est_chef_agence);
  const canCancel = () => vente?.status !== 'completed' && vente?.status !== 'cancelled';
  const canGenerateBonLivraison = () => vente && (vente.status === 'approved' || vente.status === 'completed');

  // Actions
  const handleSubmit = async () => {
    try {
      await AxiosInstance.post(`/ventes/${id}/submit/`);
      showNotification('Vente soumise pour approbation avec succès', 'success');
      fetchVente();
      setShowSubmitModal(false);
    } catch (error) {
      showNotification(error.response?.data?.error || 'Erreur lors de la soumission', 'error');
    }
  };

  const handleApprove = async () => {
    try {
      await AxiosInstance.post(`/ventes/${id}/approve/`);
      showNotification('Vente approuvée avec succès', 'success');
      fetchVente();
      setShowApproveModal(false);
    } catch (error) {
      showNotification(error.response?.data?.error || 'Erreur lors de l\'approbation', 'error');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showNotification('Veuillez saisir un motif de rejet', 'error');
      return;
    }
    try {
      await AxiosInstance.post(`/ventes/${id}/reject/`, { motif: rejectReason });
      showNotification('Vente rejetée', 'success');
      fetchVente();
      setShowRejectModal(false);
      setRejectReason('');
    } catch (error) {
      showNotification(error.response?.data?.error || 'Erreur lors du rejet', 'error');
    }
  };

  const handleComplete = async () => {
    try {
      await AxiosInstance.post(`/ventes/${id}/complete/`);
      showNotification('Vente complétée avec succès', 'success');
      fetchVente();
      setShowCompleteModal(false);
    } catch (error) {
      showNotification('Erreur lors de la complétion', 'error');
    }
  };

  const handlePayment = async () => {
    if (!paymentData.montant || parseFloat(paymentData.montant) <= 0) {
      showNotification('Montant invalide', 'error');
      return;
    }
    if (parseFloat(paymentData.montant) > (vente?.reste_a_payer || 0)) {
      showNotification(`Le montant dépasse le reste à payer (${formatPrice(vente?.reste_a_payer)})`, 'error');
      return;
    }
    try {
      await AxiosInstance.post('/paiements/', {
        vente: parseInt(id),
        montant: parseFloat(paymentData.montant),
        methode: paymentData.methode,
        reference: paymentData.reference,
        notes: `Paiement du ${new Date().toLocaleString()}`
      });
      showNotification('Paiement enregistré avec succès', 'success');
      setShowPaymentModal(false);
      setPaymentData({ montant: '', methode: 'especes', reference: '' });
      fetchVente();
    } catch (error) {
      showNotification('Erreur lors de l\'enregistrement', 'error');
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir annuler cette vente ?')) return;
    try {
      await AxiosInstance.post(`/ventes/${id}/cancel/`);
      showNotification('Vente annulée avec succès', 'success');
      fetchVente();
    } catch (error) {
      showNotification(error.response?.data?.error || 'Erreur lors de l\'annulation', 'error');
    }
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return '0 FCFA';
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const statusConfig = {
    draft: { label: 'Brouillon', icon: Clock, color: 'text-gray-600', bgColor: 'bg-gray-100', nextAction: 'Soumettre' },
    pending_approval: { label: 'En attente', icon: Clock, color: 'text-orange-600', bgColor: 'bg-orange-100', nextAction: 'Approuver/Rejeter' },
    approved: { label: 'Approuvée', icon: CheckCircle, color: 'text-blue-600', bgColor: 'bg-blue-100', nextAction: 'Compléter' },
    rejected: { label: 'Rejetée', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100', nextAction: null },
    completed: { label: 'Complétée', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100', nextAction: null },
    cancelled: { label: 'Annulée', icon: XCircle, color: 'text-gray-600', bgColor: 'bg-gray-100', nextAction: null }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="text-base font-medium text-base-content/70">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!vente) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-error/10 flex items-center justify-center mb-4">
            <ShoppingCart className="w-10 h-10 text-error" />
          </div>
          <h2 className="text-xl font-bold">Vente non trouvée</h2>
          <p className="text-gray-500 mt-2">La vente que vous recherchez n'existe pas</p>
          <button onClick={() => navigate('/ventes')} className="btn btn-primary btn-sm mt-6">
            Retour aux ventes
          </button>
        </div>
      </div>
    );
  }

  const status = statusConfig[vente.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const items = vente.items || [];
  const paiements = vente.paiements || [];

  return (
    <div className="space-y-4 lg:space-y-6 p-3 lg:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
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

      {/* Modal Soumission */}
      {showSubmitModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <div className="text-center">
              <div className="avatar placeholder mb-4">
                <div className="bg-primary/10 text-primary rounded-full w-16 h-16">
                  <Send className="w-8 h-8" />
                </div>
              </div>
              <h3 className="font-bold text-xl mb-2">Soumettre la vente</h3>
              <p className="text-base-content/70">Voulez-vous vraiment soumettre cette vente pour approbation ?</p>
              <p className="font-semibold text-primary mt-2">{vente.reference}</p>
              <p className="text-sm text-base-content/60 mt-1">Montant: {formatPrice(vente.total)}</p>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowSubmitModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleSubmit}>Soumettre</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Approbation */}
      {showApproveModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <div className="text-center">
              <div className="avatar placeholder mb-4">
                <div className="bg-success/10 text-success rounded-full w-16 h-16">
                  <ThumbsUp className="w-8 h-8" />
                </div>
              </div>
              <h3 className="font-bold text-xl mb-2">Approuver la vente</h3>
              <p className="text-base-content/70">Voulez-vous vraiment approuver cette vente ?</p>
              <p className="font-semibold text-primary mt-2">{vente.reference}</p>
              <p className="text-sm text-base-content/60 mt-1">Montant: {formatPrice(vente.total)}</p>
              <p className="text-xs text-base-content/50 mt-3">Le stock sera automatiquement déduit.</p>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowApproveModal(false)}>Annuler</button>
              <button className="btn btn-success" onClick={handleApprove}>Approuver</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rejet */}
      {showRejectModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <div className="text-center">
              <div className="avatar placeholder mb-4">
                <div className="bg-error/10 text-error rounded-full w-16 h-16">
                  <ThumbsDown className="w-8 h-8" />
                </div>
              </div>
              <h3 className="font-bold text-xl mb-2">Rejeter la vente</h3>
              <p className="text-base-content/70">Vente: {vente.reference}</p>
              <div className="mt-4 text-left">
                <label className="label">Motif du rejet *</label>
                <textarea className="textarea textarea-bordered w-full" rows="3" placeholder="Expliquez la raison du rejet..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
              </div>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => { setShowRejectModal(false); setRejectReason(''); }}>Annuler</button>
              <button className="btn btn-error" onClick={handleReject}>Rejeter</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Complétion */}
      {showCompleteModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <div className="text-center">
              <div className="avatar placeholder mb-4">
                <div className="bg-success/10 text-success rounded-full w-16 h-16">
                  <CheckSquare className="w-8 h-8" />
                </div>
              </div>
              <h3 className="font-bold text-xl mb-2">Compléter la vente</h3>
              <p className="text-base-content/70">Voulez-vous vraiment marquer cette vente comme complétée ?</p>
              <p className="font-semibold text-primary mt-2">{vente.reference}</p>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowCompleteModal(false)}>Annuler</button>
              <button className="btn btn-success" onClick={handleComplete}>Compléter</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Paiement */}
      {showPaymentModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-lg mb-4">Enregistrer un paiement</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Total: {formatPrice(vente.total)}</p>
                <p className="text-sm text-green-600">Déjà payé: {formatPrice(vente.montant_paye)}</p>
                <p className="text-sm text-orange-600">Reste à payer: {formatPrice(vente.reste_a_payer)}</p>
              </div>
              <div className="form-control">
                <label className="label">Montant à payer *</label>
                <input type="number" step="1" min="1" max={vente.reste_a_payer} className="input input-bordered" value={paymentData.montant} onChange={(e) => setPaymentData({ ...paymentData, montant: e.target.value })} />
              </div>
              <div className="form-control">
                <label className="label">Mode de paiement *</label>
                <select className="select select-bordered" value={paymentData.methode} onChange={(e) => setPaymentData({ ...paymentData, methode: e.target.value })}>
                  <option value="especes">Espèces</option>
                  <option value="carte">Carte bancaire</option>
                  <option value="cheque">Chèque</option>
                  <option value="virement">Virement</option>
                  <option value="mobile_money">Mobile Money</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label">Référence (optionnel)</label>
                <input type="text" className="input input-bordered" placeholder="N° chèque, référence virement..." value={paymentData.reference} onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })} />
              </div>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowPaymentModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handlePayment}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* En-tête avec actions */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-5">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/ventes')} className="btn btn-ghost btn-sm btn-circle">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-primary">Vente {vente.reference}</h1>
              <p className="text-sm text-gray-600">Créée le {formatDate(vente.date_vente)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchVente} className="btn btn-outline btn-sm gap-2"><RefreshCw className="w-4 h-4" /> Actualiser</button>
            {/* Bouton Bon de livraison */}
            {canGenerateBonLivraison() && (
              <button 
                onClick={handleGenerateBonLivraison} 
                className="btn btn-outline btn-sm gap-2 text-info border-info hover:bg-info/10"
                disabled={generatingBl}
              >
                {generatingBl ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Truck className="w-4 h-4" />
                )}
                Bon de livraison
              </button>
            )}
            <button className="btn btn-outline btn-sm gap-2"><Printer className="w-4 h-4" /> Imprimer</button>
          </div>
        </div>
      </div>

      {/* Barre d'actions - Changement de statut */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex flex-wrap gap-3 justify-center">
          {/* Statut actuel */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100">
            <StatusIcon className="w-5 h-5" />
            <span className="font-medium">Statut: {status.label}</span>
          </div>

          {/* Actions selon statut */}
          {vente.status === 'draft' && canSubmit() && (
            <button onClick={() => setShowSubmitModal(true)} className="btn btn-primary gap-2">
              <Send className="w-4 h-4" /> Soumettre pour approbation
            </button>
          )}

          {vente.status === 'pending_approval' && canApprove() && (
            <>
              <button onClick={() => setShowApproveModal(true)} className="btn btn-success gap-2">
                <ThumbsUp className="w-4 h-4" /> Approuver
              </button>
              <button onClick={() => setShowRejectModal(true)} className="btn btn-error gap-2">
                <ThumbsDown className="w-4 h-4" /> Rejeter
              </button>
            </>
          )}

          {vente.status === 'approved' && (
            <>
              {canComplete() && (
                <button onClick={() => setShowCompleteModal(true)} className="btn btn-primary gap-2">
                  <CheckSquare className="w-4 h-4" /> Compléter la vente
                </button>
              )}
              {canAddPayment() && (
                <button onClick={() => setShowPaymentModal(true)} className="btn btn-secondary gap-2">
                  <CreditCard className="w-4 h-4" /> Enregistrer un paiement
                </button>
              )}
            </>
          )}

          {canCancel() && vente.status !== 'cancelled' && vente.status !== 'completed' && (
            <button onClick={handleCancel} className="btn btn-outline btn-error gap-2">
              <XCircle className="w-4 h-4" /> Annuler la vente
            </button>
          )}
        </div>
      </div>

      {/* Contenu principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche - Produits */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-primary" /> Articles</h2>
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-400"><Package className="w-12 h-12 mx-auto mb-2" /><p>Aucun article</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th>Produit</th>
                      <th className="text-center">Qté</th>
                      <th className="text-right">Prix unitaire</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="font-medium">{item.product_name}{item.product_reference && <span className="text-xs text-gray-400 ml-1">({item.product_reference})</span>}</td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-right">{formatPrice(item.prix_unitaire)}</td>
                        <td className="text-right font-semibold">{formatPrice(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="3" className="text-right font-semibold">Sous-total</td>
                      <td className="text-right font-semibold">{formatPrice(vente.sous_total)}</td>
                    </tr>
                    <tr>
                      <td colSpan="3" className="text-right">TVA (18%)</td>
                      <td className="text-right">{formatPrice(vente.tva)}</td>
                    </tr>
                    <tr className="border-t">
                      <td colSpan="3" className="text-right font-bold text-lg">Total</td>
                      <td className="text-right font-bold text-primary text-lg">{formatPrice(vente.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-secondary" /> Paiements</h2>
            {paiements.length === 0 ? (
              <div className="text-center py-8 text-gray-400"><CreditCard className="w-12 h-12 mx-auto mb-2" /><p>Aucun paiement enregistré</p></div>
            ) : (
              <div className="space-y-2">
                {paiements.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div><span className="font-medium">{p.methode}</span><span className="text-xs text-gray-500 ml-2">{new Date(p.date_paiement).toLocaleString()}</span></div>
                    <span className="font-semibold text-green-600">{formatPrice(p.montant)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-3 border-t"><span>Montant payé</span><span className="font-semibold text-green-600">{formatPrice(vente.montant_paye)}</span></div>
                <div className="flex justify-between"><span>Reste à payer</span><span className="font-semibold text-red-600">{formatPrice(vente.reste_a_payer)}</span></div>
              </div>
            )}
            {vente.status === 'approved' && vente.reste_a_payer > 0 && (
              <button onClick={() => setShowPaymentModal(true)} className="btn btn-secondary btn-sm w-full mt-4 gap-2">
                <CreditCard className="w-4 h-4" /> Ajouter un paiement
              </button>
            )}
          </div>
        </div>

        {/* Colonne droite - Informations */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Info className="w-5 h-5 text-info" /> Informations</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center"><ShoppingCart className="w-4 h-4 text-primary" /></div>
                <div><p className="text-xs text-gray-500">Statut</p><p className={`flex items-center gap-1 ${status.color}`}><StatusIcon className="w-4 h-4" /> {status.label}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center"><User className="w-4 h-4 text-blue-500" /></div>
                <div><p className="text-xs text-gray-500">Client</p><p className="font-medium">{vente.client?.nom || 'Anonyme'} {vente.client?.prenom || ''}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center"><Calendar className="w-4 h-4 text-green-500" /></div>
                <div><p className="text-xs text-gray-500">Date</p><p>{formatDate(vente.date_vente)}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center"><Building2 className="w-4 h-4 text-purple-500" /></div>
                <div><p className="text-xs text-gray-500">Agence</p><p>{vente.agence?.nom}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center"><Truck className="w-4 h-4 text-orange-500" /></div>
                <div><p className="text-xs text-gray-500">Type</p><p>{vente.type_vente}</p></div>
              </div>
            </div>
          </div>

          {vente.notes && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-semibold mb-2">Notes</h2>
              <p className="text-gray-600 text-sm">{vente.notes}</p>
            </div>
          )}

          {vente.motif_rejet && (
            <div className="bg-red-50 rounded-xl shadow-md p-6 border border-red-200">
              <h2 className="text-lg font-semibold text-red-700 mb-2">Motif du rejet</h2>
              <p className="text-red-600 text-sm">{vente.motif_rejet}</p>
            </div>
          )}

          {vente.approved_by && (
            <div className="bg-blue-50 rounded-xl shadow-md p-6 border border-blue-200">
              <h2 className="text-lg font-semibold text-blue-700 mb-2">Approbation</h2>
              <p className="text-blue-600 text-sm">Approuvée par: {vente.approved_by?.email || 'N/A'}</p>
              <p className="text-blue-600 text-sm">Date: {formatDate(vente.date_approbation)}</p>
            </div>
          )}

          {/* Bouton Bon de livraison dans la sidebar pour mobile */}
          {canGenerateBonLivraison() && (
            <div className="lg:hidden">
              <button 
                onClick={handleGenerateBonLivraison} 
                className="btn btn-info w-full gap-2"
                disabled={generatingBl}
              >
                {generatingBl ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Truck className="w-4 h-4" />
                )}
                Générer le bon de livraison
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VenteDetail;