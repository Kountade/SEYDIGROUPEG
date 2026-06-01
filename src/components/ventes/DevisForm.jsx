// src/components/sales/DevisForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AxiosInstance from '../AxiosInstance';
import { Plus, Trash2, Save, X, AlertCircle, CheckCircle, Search, ChevronLeft } from 'lucide-react';

const DevisForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    agence: '',
    client_id: '',
    date_expiration: '',
    notes: '',
    conditions: '',
    pied_de_page: '',
    items: []
  });
  const [clients, setClients] = useState([]);
  const [agences, setAgences] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [calculs, setCalculs] = useState({ sous_total: 0, tva: 0, total: 0 });

  // Charger les données initiales
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [clientsRes, agencesRes, productsRes] = await Promise.all([
          AxiosInstance.get('/clients/'),
          AxiosInstance.get('/agences/'),
          AxiosInstance.get('/produits/')
        ]);
        setClients(clientsRes.data);
        setAgences(agencesRes.data);
        setProducts(productsRes.data);

        if (isEditing) {
          const devisRes = await AxiosInstance.get(`/devis/${id}/`);
          const devis = devisRes.data;
          setFormData({
            agence: devis.agence?.id || '',
            client_id: devis.client?.id || '',
            date_expiration: devis.date_expiration?.split('T')[0] || '',
            notes: devis.notes || '',
            conditions: devis.conditions || '',
            pied_de_page: devis.pied_de_page || '',
            items: devis.items.map(item => ({
              id: item.id,
              product: item.product,
              variant: item.variant || '',
              quantity: item.quantity,
              prix_unitaire: item.prix_unitaire,
              remise: item.remise || 0,
              tva: item.tva || 0,
              total: item.total
            }))
          });
          recalculTotaux(devis.items);
        }
      } catch (error) {
        showNotification('Erreur de chargement des données', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [id, isEditing]);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000);
  };

  const recalculTotaux = (items) => {
    let sous_total = 0;
    items.forEach(item => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.prix_unitaire) || 0;
      const remise = parseFloat(item.remise) || 0;
      const itemTotal = (qty * price) - remise;
      sous_total += itemTotal;
    });
    const tva = sous_total * 0.18;
    const total = sous_total + tva;
    setCalculs({ sous_total, tva, total });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    if (field === 'quantity' || field === 'prix_unitaire' || field === 'remise') {
      const qty = parseFloat(newItems[index].quantity) || 0;
      const price = parseFloat(newItems[index].prix_unitaire) || 0;
      const remise = parseFloat(newItems[index].remise) || 0;
      newItems[index].total = (qty * price) - remise;
    }
    setFormData({ ...formData, items: newItems });
    recalculTotaux(newItems);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product: '', variant: '', quantity: 1, prix_unitaire: 0, remise: 0, tva: 0, total: 0 }]
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
    recalculTotaux(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.agence) {
      showNotification('Veuillez sélectionner une agence', 'error');
      return;
    }
    if (formData.items.length === 0) {
      showNotification('Ajoutez au moins un article', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        agence: formData.agence,
        client_id: formData.client_id || null,
        date_expiration: formData.date_expiration,
        notes: formData.notes,
        conditions: formData.conditions,
        pied_de_page: formData.pied_de_page,
        items: formData.items.map(item => ({
          product: item.product,
          variant: item.variant || null,
          quantity: item.quantity,
          prix_unitaire: item.prix_unitaire,
          remise: item.remise || 0,
          tva: item.tva || 0
        }))
      };
      if (isEditing) {
        await AxiosInstance.put(`/devis/${id}/`, payload);
        showNotification('Devis mis à jour avec succès');
      } else {
        await AxiosInstance.post('/devis/', payload);
        showNotification('Devis créé avec succès');
      }
      setTimeout(() => navigate('/devis'), 1500);
    } catch (error) {
      console.error(error);
      showNotification(error.response?.data?.message || 'Erreur lors de l\'enregistrement', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-10"><span className="loading loading-spinner loading-lg"></span></div>;
  }

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Notification */}
        {notification.show && (
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} mb-4 shadow-lg`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{notification.message}</span>
            </div>
            <button className="btn btn-ghost btn-xs" onClick={() => setNotification({ show: false, message: '', type: 'success' })}><X className="w-3 h-3" /></button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/devis')} className="btn btn-ghost btn-circle"><ChevronLeft className="w-5 h-5" /></button>
          <h1 className="text-2xl font-bold">{isEditing ? 'Modifier le devis' : 'Nouveau devis'}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations générales */}
          <div className="card bg-white shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Informations générales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Agence *</label>
                <select className="select select-bordered w-full" value={formData.agence} onChange={(e) => setFormData({ ...formData, agence: e.target.value })} required>
                  <option value="">Sélectionner une agence</option>
                  {agences.map(ag => <option key={ag.id} value={ag.id}>{ag.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Client</label>
                <select className="select select-bordered w-full" value={formData.client_id} onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}>
                  <option value="">Sélectionner un client (optionnel)</option>
                  {clients.map(client => <option key={client.id} value={client.id}>{client.nom} {client.prenom || ''}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Date d'expiration *</label>
                <input type="date" className="input input-bordered w-full" value={formData.date_expiration} onChange={(e) => setFormData({ ...formData, date_expiration: e.target.value })} required />
              </div>
            </div>
          </div>

          {/* Articles */}
          <div className="card bg-white shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Articles</h2>
              <button type="button" onClick={addItem} className="btn btn-sm btn-primary gap-1"><Plus className="w-4 h-4" /> Ajouter</button>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Quantité</th>
                    <th>Prix unitaire (FCFA)</th>
                    <th>Remise (FCFA)</th>
                    <th>Total HT</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <select className="select select-bordered select-sm w-48" value={item.product} onChange={(e) => handleItemChange(idx, 'product', e.target.value)} required>
                          <option value="">Choisir</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td><input type="number" className="input input-bordered input-sm w-24" value={item.quantity} onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 0)} min="1" /></td>
                      <td><input type="number" className="input input-bordered input-sm w-32" value={item.prix_unitaire} onChange={(e) => handleItemChange(idx, 'prix_unitaire', parseFloat(e.target.value) || 0)} min="0" step="100" /></td>
                      <td><input type="number" className="input input-bordered input-sm w-32" value={item.remise} onChange={(e) => handleItemChange(idx, 'remise', parseFloat(e.target.value) || 0)} min="0" /></td>
                      <td className="font-mono">{(item.total || 0).toLocaleString()} FCFA</td>
                      <td><button type="button" onClick={() => removeItem(idx)} className="btn btn-ghost btn-xs text-error"><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Totaux */}
            <div className="mt-4 border-t pt-4 text-right">
              <p>Sous-total HT : <span className="font-mono font-bold">{calculs.sous_total.toLocaleString()} FCFA</span></p>
              <p>TVA (18%) : <span className="font-mono">{calculs.tva.toLocaleString()} FCFA</span></p>
              <p className="text-lg font-bold">Total TTC : <span className="text-primary">{calculs.total.toLocaleString()} FCFA</span></p>
            </div>
          </div>

          {/* Notes et conditions */}
          <div className="card bg-white shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Informations complémentaires</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Conditions générales</label>
                <textarea className="textarea textarea-bordered w-full" rows="3" value={formData.conditions} onChange={(e) => setFormData({ ...formData, conditions: e.target.value })} placeholder="Conditions de paiement, livraison..."></textarea>
              </div>
              <div>
                <label className="label">Notes internes</label>
                <textarea className="textarea textarea-bordered w-full" rows="2" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Remarques..."></textarea>
              </div>
              <div>
                <label className="label">Pied de page</label>
                <textarea className="textarea textarea-bordered w-full" rows="2" value={formData.pied_de_page} onChange={(e) => setFormData({ ...formData, pied_de_page: e.target.value })} placeholder="Mentions légales..."></textarea>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => navigate('/devis')} className="btn btn-ghost">Annuler</button>
            <button type="submit" className="btn btn-primary gap-2" disabled={saving}>{saving ? <span className="loading loading-spinner loading-xs"></span> : <Save className="w-4 h-4" />} Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DevisForm;