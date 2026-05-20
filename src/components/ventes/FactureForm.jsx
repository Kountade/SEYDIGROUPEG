// src/components/sales/FactureForm.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AxiosInstance from '../AxiosInstance';
import { Save, X, ArrowLeft, User, Calendar, Building2, CheckCircle, AlertCircle, Loader2, Receipt, DollarSign } from 'lucide-react';

const FactureForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ventes, setVentes] = useState([]);
  const [clients, setClients] = useState([]);
  const [agences, setAgences] = useState([]);
  const [selectedVente, setSelectedVente] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedAgence, setSelectedAgence] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [formData, setFormData] = useState({
    type_facture: 'finale',
    date_echeance: '',
    conditions_paiement: 'Paiement à 30 jours',
    notes: '',
    pied_de_page: ''
  });

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ventesRes, clientsRes, agencesRes] = await Promise.all([
        AxiosInstance.get('/ventes/?status=completed'),
        AxiosInstance.get('/clients/?is_active=true'),
        AxiosInstance.get('/agences/')
      ]);
      setVentes(ventesRes.data || []);
      setClients(clientsRes.data || []);
      setAgences(agencesRes.data || []);
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleVenteChange = (venteId) => {
    const vente = ventes.find(v => v.id === parseInt(venteId));
    setSelectedVente(vente);
    if (vente) {
      setSelectedClient(vente.client || null);
      setSelectedAgence(vente.agence || null);
      if (!formData.date_echeance) {
        const echeance = new Date();
        echeance.setDate(echeance.getDate() + 30);
        setFormData(prev => ({ ...prev, date_echeance: echeance.toISOString().split('T')[0] }));
      }
    } else {
      setSelectedClient(null);
      setSelectedAgence(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedVente) {
      showNotification('Sélectionnez une vente', 'error');
      return;
    }
    if (!formData.date_echeance) {
      showNotification('La date d\'échéance est requise', 'error');
      return;
    }

    setSubmitting(true);
    try {
      // On envoie l'agence si elle existe, sinon le backend la récupérera de la vente
      const payload = {
        vente: selectedVente.id,
        client: selectedClient?.id || null,
        agence: selectedAgence?.id || null,  // Peut être null, le backend gérera
        type_facture: formData.type_facture,
        date_echeance: formData.date_echeance,
        conditions_paiement: formData.conditions_paiement,
        notes: formData.notes,
        pied_de_page: formData.pied_de_page
      };
      
      console.log('Payload envoyé:', payload);
      
      if (isEditMode) {
        await AxiosInstance.put(`/factures/${id}/`, payload);
        showNotification('Facture modifiée avec succès', 'success');
      } else {
        await AxiosInstance.post('/factures/', payload);
        showNotification('Facture créée avec succès', 'success');
      }
      setTimeout(() => navigate('/factures'), 1500);
    } catch (error) {
      console.error('Erreur détaillée:', error.response?.data);
      const errorMsg = error.response?.data?.error || 
                       (typeof error.response?.data === 'object' ? JSON.stringify(error.response?.data) : error.response?.data) ||
                       'Erreur lors de l\'enregistrement';
      showNotification(errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price || 0) + ' FCFA';

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 animate-slideDown max-w-md">
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
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/factures')} className="btn btn-ghost btn-sm btn-circle">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-black text-primary">{isEditMode ? 'Modifier la facture' : 'Nouvelle facture'}</h1>
          </div>
          <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary btn-sm gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEditMode ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </div>

      {/* Formulaire */}
      <div className="bg-white rounded-xl shadow-md p-6 max-w-3xl mx-auto">
        {/* Type et Vente */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="form-control">
            <label className="label">Type de facture</label>
            <select className="select select-bordered" value={formData.type_facture} onChange={(e) => setFormData({ ...formData, type_facture: e.target.value })}>
              <option value="proforma">Proforma</option>
              <option value="finale">Finale</option>
              <option value="avoir">Avoir</option>
            </select>
          </div>
          <div className="form-control">
            <label className="label">Vente associée *</label>
            <select className="select select-bordered" value={selectedVente?.id || ''} onChange={(e) => handleVenteChange(e.target.value)}>
              <option value="">Sélectionner une vente</option>
              {ventes.map(v => (
                <option key={v.id} value={v.id}>{v.reference} - {formatPrice(v.total)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Client et Agence (lecture seule) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="form-control">
            <label className="label">Client</label>
            <input type="text" className="input input-bordered bg-gray-100" value={selectedClient?.nom || 'Aucun client'} readOnly disabled />
          </div>
          <div className="form-control">
            <label className="label">Agence</label>
            <input type="text" className="input input-bordered bg-gray-100" value={selectedAgence?.nom || 'Chargement...'} readOnly disabled />
            {!selectedAgence && selectedVente && <p className="text-warning text-xs mt-1">⚠️ L'agence sera automatiquement récupérée depuis la vente</p>}
          </div>
        </div>

        {/* Date échéance */}
        <div className="form-control mb-4">
          <label className="label">Date d'échéance *</label>
          <input type="date" className="input input-bordered" value={formData.date_echeance} onChange={(e) => setFormData({ ...formData, date_echeance: e.target.value })} />
        </div>

        {/* Conditions, notes, pied de page */}
        <div className="form-control mb-4">
          <label className="label">Conditions de paiement</label>
          <textarea className="textarea textarea-bordered" rows="2" value={formData.conditions_paiement} onChange={(e) => setFormData({ ...formData, conditions_paiement: e.target.value })} />
        </div>
        <div className="form-control mb-4">
          <label className="label">Notes</label>
          <textarea className="textarea textarea-bordered" rows="2" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
        </div>
        <div className="form-control mb-4">
          <label className="label">Pied de page</label>
          <textarea className="textarea textarea-bordered" rows="2" value={formData.pied_de_page} onChange={(e) => setFormData({ ...formData, pied_de_page: e.target.value })} />
        </div>

        {/* Résumé de la vente */}
        {selectedVente && (
          <div className="bg-gray-50 rounded-lg p-4 mt-4">
            <h3 className="font-semibold mb-2">Récapitulatif de la vente</h3>
            <div className="flex justify-between text-sm"><span>Sous-total HT</span><span>{formatPrice(selectedVente.sous_total)}</span></div>
            <div className="flex justify-between text-sm"><span>TVA (18%)</span><span>{formatPrice(selectedVente.tva)}</span></div>
            <div className="flex justify-between font-bold text-base mt-2 pt-2 border-t"><span>Total TTC</span><span className="text-primary">{formatPrice(selectedVente.total)}</span></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FactureForm;