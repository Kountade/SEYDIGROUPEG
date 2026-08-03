import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import AxiosInstance from '../AxiosInstance';
import {
  Save, X, ArrowLeft, Plus, Minus, Trash2, ShoppingCart,
  CheckCircle, AlertCircle, Loader2, Building2,
  Package, DollarSign, FileText, Truck, Calendar,
  Users, RefreshCw, Filter, Hash
} from 'lucide-react';

const ReceptionForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  // États généraux
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commandes, setCommandes] = useState([]);
  const [commandeSelected, setCommandeSelected] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success', details: null });

  // Champs du formulaire
  const [purchaseOrder, setPurchaseOrder] = useState('');
  const [notes, setNotes] = useState('');

  // Items (lignes de produits)
  const [items, setItems] = useState([]);

  // Total
  const [totalValue, setTotalValue] = useState(0);

  const showNotification = (message, type = 'success', details = null) => {
    setNotification({ show: true, message, type, details });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success', details: null }), 8000);
  };

  // ============================================================
  // 1. Chargement des commandes éligibles
  // ============================================================
  useEffect(() => {
    const fetchCommandes = async () => {
      setLoading(true);
      try {
        const response = await AxiosInstance.get('/purchase-orders/');
        const allOrders = response.data || [];

        // Filtrer les commandes qui peuvent être réceptionnées
        const eligibleOrders = allOrders.filter(order => {
          if (order.status === 'draft' || order.status === 'received') {
            return false;
          }
          const hasRemainingItems = order.items?.some(item => {
            const ordered = item.quantity_ordered || 0;
            const received = item.quantity_received || 0;
            return received < ordered;
          });
          return hasRemainingItems;
        });

        setCommandes(eligibleOrders);

        if (isEditMode) {
          await fetchReception();
        }
      } catch (error) {
        console.error('Erreur chargement commandes:', error);
        showNotification('Erreur de chargement des commandes', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchCommandes();
  }, [id]);

  // ============================================================
  // 2. Chargement de la réception en mode édition (avec ses items)
  // ============================================================
  const fetchReception = async () => {
    try {
      const response = await AxiosInstance.get(`/purchase-receipts/${id}/`);
      const reception = response.data;

      setPurchaseOrder(reception.purchase_order?.id || reception.purchase_order || '');
      setNotes(reception.notes || '');

      // Charger les détails de la commande
      if (reception.purchase_order) {
        const orderId = reception.purchase_order.id || reception.purchase_order;
        const orderResponse = await AxiosInstance.get(`/purchase-orders/${orderId}/`);
        const order = orderResponse.data;
        setCommandeSelected(order);

        // Construire les items à partir des items de la réception
        const receptionItems = reception.items || [];
        const orderItems = order.items || [];

        const loadedItems = receptionItems.map(recItem => {
          // Trouver le order_item correspondant
          const orderItem = orderItems.find(oi => oi.id === recItem.order_item);
          if (!orderItem) return null;

          const ordered = orderItem.quantity_ordered || 0;
          const alreadyReceived = orderItem.quantity_received || 0;
          // La quantité déjà reçue inclut cette réception, mais on veut le restant avant cette réception ?
          // Pour simplifier, on utilise le restant calculé à partir de la commande.
          // Mais pour la modification, on veut que la quantité reçue puisse être ajustée.
          // On initialise la quantité à la quantité de la réception (pour permettre de la modifier)
          const qtyReceived = recItem.quantity || 0;

          return {
            id: recItem.id, // ID de la ligne de réception (pour modification)
            order_item_id: recItem.order_item,
            product_id: orderItem.product,
            product_name: orderItem.product_name || orderItem.product?.name || 'Produit',
            product_reference: orderItem.product_reference || '',
            quantity_ordered: ordered,
            quantity_received: alreadyReceived, // total déjà reçu avant cette réception
            remaining_quantity: ordered - alreadyReceived, // restant avant cette réception
            quantity: qtyReceived, // quantité de cette réception
            unit_price: parseFloat(orderItem.unit_price) || 0,
            total: (parseFloat(orderItem.unit_price) || 0) * qtyReceived,
            quality_ok: recItem.quality_ok !== false,
            lot_number: recItem.lot_number || '',
            expiry_date: recItem.expiry_date || '', // ✅ date d'expiration récupérée
            notes: recItem.notes || ''
          };
        }).filter(item => item !== null);

        setItems(loadedItems);
        calculateTotal(loadedItems);
      }
    } catch (error) {
      console.error('Erreur chargement réception:', error);
      showNotification('Erreur lors du chargement', 'error');
    }
  };

  // ============================================================
  // 3. Chargement des détails d'une commande (création)
  // ============================================================
  const loadCommandeDetails = async (orderId) => {
    if (!orderId) {
      setCommandeSelected(null);
      setItems([]);
      setTotalValue(0);
      return;
    }

    setLoading(true);
    try {
      const response = await AxiosInstance.get(`/purchase-orders/${orderId}/`);
      const order = response.data;

      if (order.status === 'draft' || order.status === 'received') {
        showNotification(`Cette commande (statut: ${order.status_display || order.status}) ne peut pas être réceptionnée`, 'error');
        setCommandeSelected(null);
        setItems([]);
        setTotalValue(0);
        setPurchaseOrder('');
        setLoading(false);
        return;
      }

      setCommandeSelected(order);

      const loadedItems = (order.items || [])
        .filter(item => {
          const ordered = item.quantity_ordered || 0;
          const received = item.quantity_received || 0;
          return received < ordered;
        })
        .map(item => {
          const ordered = item.quantity_ordered || 0;
          const received = item.quantity_received || 0;
          const remaining = ordered - received;

          return {
            id: item.id,
            order_item_id: item.id,
            product_id: item.product,
            product_name: item.product_name,
            product_reference: item.product_reference || '',
            quantity_ordered: ordered,
            quantity_received: received,
            remaining_quantity: remaining,
            quantity: 0,
            unit_price: parseFloat(item.unit_price) || 0,
            total: 0,
            quality_ok: true,
            lot_number: '',
            expiry_date: '', // ✅ champ ajouté
            notes: ''
          };
        });

      setItems(loadedItems);
      calculateTotal(loadedItems);
    } catch (error) {
      console.error('Erreur chargement détails commande:', error);
      showNotification('Erreur lors du chargement des détails', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 4. Gestion des items
  // ============================================================

  const calculateTotal = (itemsList) => {
    const total = itemsList.reduce((sum, item) => sum + (item.total || 0), 0);
    setTotalValue(total);
  };

  const handleQuantityChange = (index, newQuantity) => {
    const item = items[index];
    const maxQty = item.remaining_quantity;
    let quantity = parseInt(newQuantity) || 0;

    if (quantity > maxQty) {
      showNotification(`La quantité ne peut pas dépasser ${maxQty} (quantité restante)`, 'warning');
      quantity = maxQty;
    }
    if (quantity < 0) quantity = 0;

    const newTotal = (item.unit_price || 0) * quantity;

    const updatedItems = [...items];
    updatedItems[index] = {
      ...item,
      quantity: quantity,
      total: newTotal
    };

    setItems(updatedItems);
    calculateTotal(updatedItems);
  };

  const handleQualityChange = (index, qualityOk) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      quality_ok: qualityOk
    };
    setItems(updatedItems);
  };

  const handleLotChange = (index, lotNumber) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      lot_number: lotNumber
    };
    setItems(updatedItems);
  };

  // ✅ Nouvelle fonction pour gérer la date d'expiration
  const handleExpiryChange = (index, expiryDate) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      expiry_date: expiryDate
    };
    setItems(updatedItems);
  };

  const handleRemoveItem = (index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
    calculateTotal(updatedItems);
  };

  const selectAllItems = () => {
    const updatedItems = items.map(item => ({
      ...item,
      quantity: item.remaining_quantity,
      total: (item.unit_price || 0) * item.remaining_quantity
    }));
    setItems(updatedItems);
    calculateTotal(updatedItems);
  };

  const deselectAllItems = () => {
    const updatedItems = items.map(item => ({
      ...item,
      quantity: 0,
      total: 0
    }));
    setItems(updatedItems);
    calculateTotal(updatedItems);
  };

  // ============================================================
  // 5. Gestion de la commande sélectionnée
  // ============================================================
  const handleCommandeChange = (e) => {
    const orderId = e.target.value;
    setPurchaseOrder(orderId);
    setItems([]);
    setTotalValue(0);
    if (orderId) {
      loadCommandeDetails(orderId);
    } else {
      setCommandeSelected(null);
    }
  };

  // ============================================================
  // 6. Soumission de la réception
  // ============================================================
  const handleSubmit = async () => {
    if (!purchaseOrder) {
      showNotification('Veuillez sélectionner une commande', 'error');
      return;
    }

    const itemsToReceive = items.filter(item => item.quantity > 0);
    if (itemsToReceive.length === 0) {
      showNotification('Au moins un article doit être reçu', 'error');
      return;
    }

    setSubmitting(true);

    const payload = {
      purchase_order: parseInt(purchaseOrder),
      notes: notes,
      items: itemsToReceive.map(item => ({
        order_item: item.order_item_id || item.id, // on envoie l'ID de la ligne de commande
        quantity: parseInt(item.quantity),
        quality_checked: true,
        quality_ok: item.quality_ok !== false,
        quality_notes: '',
        lot_number: item.lot_number || '',
        expiry_date: item.expiry_date || null, // ✅ envoi de la date
        notes: item.notes || ''
      }))
    };

    try {
      if (isEditMode) {
        await AxiosInstance.put(`/purchase-receipts/${id}/`, payload);
        showNotification('Réception modifiée avec succès !', 'success');
      } else {
        await AxiosInstance.post('/purchase-receipts/', payload);
        showNotification('Réception créée avec succès !', 'success');
      }
      setTimeout(() => navigate('/receptions'), 2000);
    } catch (error) {
      console.error(error);
      let errorMessage = 'Erreur lors de l\'enregistrement';
      if (error.response?.data?.purchase_order) {
        errorMessage = error.response.data.purchase_order.join(', ');
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.non_field_errors) {
        errorMessage = error.response.data.non_field_errors.join(', ');
      }
      showNotification(errorMessage, 'error', error.response?.data);
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price || 0) + ' FCFA';

  // Vérifier si la commande a des articles à recevoir
  const hasItemsToReceive = items.some(item => item.quantity > 0);

  if (loading && isEditMode) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="text-base font-medium text-base-content/70 animate-pulse">
            Chargement de la réception...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-4 lg:py-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Notification Toast */}
      {notification.show && (
        <div className="fixed top-16 lg:top-20 right-3 lg:right-6 z-50 animate-slideDown w-[calc(100%-1.5rem)] lg:w-auto max-w-md">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : notification.type === 'warning' ? 'alert-warning' : 'alert-error'} shadow-lg`}>
            {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm lg:text-base font-medium whitespace-pre-line">{notification.message}</span>
            {notification.details && (
              <details className="text-xs">
                <summary className="cursor-pointer">Détails</summary>
                <pre className="mt-1 p-1 bg-black/5 rounded">{JSON.stringify(notification.details, null, 2)}</pre>
              </details>
            )}
            <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setNotification({ show: false, message: '', type: 'success', details: null })}>
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent py-5 px-4 lg:px-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full filter blur-3xl"></div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Package className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-primary">
                {isEditMode ? 'Modifier la réception' : 'Nouvelle réception'}
              </h1>
            </div>
            <p className="text-sm text-base-content/60 ml-1">
              Enregistrez une réception de marchandises
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/receptions" className="btn btn-outline btn-sm lg:btn-md gap-2">
              <ArrowLeft className="w-4 h-4" /> Retour
            </Link>
            <button
              onClick={handleSubmit}
              disabled={submitting || !hasItemsToReceive}
              className="btn btn-primary btn-sm lg:btn-md gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEditMode ? 'Modifier' : 'Valider'}
            </button>
          </div>
        </div>
      </div>

      {/* Carte principale */}
      <div className="max-w-full px-4 lg:px-6">
        <div className="bg-white rounded-xl shadow-xl border border-base-200 overflow-hidden">
          <div className="p-4 lg:p-6">
            {/* Sélection de la commande */}
            <div className="form-control w-full mb-6">
              <label className="label">
                <span className="label-text font-semibold flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-primary" />
                  Commande fournisseur <span className="text-error">*</span>
                </span>
              </label>
              <select
                value={purchaseOrder}
                onChange={handleCommandeChange}
                className="select select-bordered w-full"
                disabled={isEditMode || loading}
              >
                <option value="">-- Sélectionner une commande --</option>
                {commandes.map(cmd => (
                  <option key={cmd.id} value={cmd.id}>
                    {cmd.order_number} - {cmd.supplier?.company_name || cmd.supplier_name} - {new Date(cmd.order_date).toLocaleDateString()} - {cmd.status_display || cmd.status}
                  </option>
                ))}
              </select>
              {loading && (
                <span className="text-info text-xs mt-1 flex items-center gap-1">
                  <span className="loading loading-spinner loading-xs"></span>
                  Chargement...
                </span>
              )}
              {commandes.length === 0 && !loading && (
                <div className="alert alert-warning mt-2 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Aucune commande disponible pour réception. Assurez-vous que :</span>
                  <ul className="list-disc list-inside text-xs">
                    <li>La commande n'est pas un brouillon</li>
                    <li>La commande n'est pas déjà totalement reçue</li>
                    <li>Il reste des articles à recevoir</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Informations commande */}
            {commandeSelected && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-primary flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Détails de la commande
                  </h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllItems}
                      className="btn btn-xs btn-primary gap-1"
                      disabled={submitting || items.length === 0}
                    >
                      <CheckCircle className="w-3 h-3" /> Tout recevoir
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllItems}
                      className="btn btn-xs btn-ghost gap-1"
                      disabled={submitting || items.length === 0}
                    >
                      <X className="w-3 h-3" /> Tout annuler
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Fournisseur:</span>
                    <p className="font-medium">{commandeSelected.supplier?.company_name || commandeSelected.supplier_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Agence:</span>
                    <p>{commandeSelected.agence?.nom || commandeSelected.agence_nom}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Date commande:</span>
                    <p>{new Date(commandeSelected.order_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Statut:</span>
                    <p className={`badge badge-sm ${
                      commandeSelected.status === 'draft' ? 'badge-ghost' :
                      commandeSelected.status === 'sent' ? 'badge-info' :
                      commandeSelected.status === 'partially_received' ? 'badge-warning' :
                      commandeSelected.status === 'received' ? 'badge-success' :
                      'badge-neutral'
                    }`}>
                      {commandeSelected.status_display || commandeSelected.status}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Articles à recevoir */}
            {items.length > 0 && (
              <div className="border-t border-base-300 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    Articles à recevoir
                    <span className="badge badge-primary badge-sm">{items.length}</span>
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="table table-zebra table-sm w-full">
                    <thead className="bg-gray-50">
                      <tr className="text-sm">
                        <th>Produit</th>
                        <th>Référence</th>
                        <th className="text-center">Commandé</th>
                        <th className="text-center">Reçu</th>
                        <th className="text-center">Restant</th>
                        <th className="text-center">À recevoir</th>
                        <th className="text-right">Prix unit.</th>
                        <th className="text-right">Total</th>
                        <th>Lot</th>
                        <th>Date expiration</th> {/* ✅ Nouvelle colonne */}
                        <th className="text-center">Qualité</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.id || index} className="hover">
                          <td className="font-medium">{item.product_name}</td>
                          <td className="text-xs font-mono">{item.product_reference}</td>
                          <td className="text-center">
                            <span className="badge badge-neutral">{item.quantity_ordered}</span>
                          </td>
                          <td className="text-center">
                            <span className="badge badge-info">{item.quantity_received}</span>
                          </td>
                          <td className="text-center">
                            <span className="badge badge-warning">{item.remaining_quantity}</span>
                          </td>
                          <td className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                className="btn btn-ghost btn-xs btn-square"
                                onClick={() => handleQuantityChange(index, item.quantity - 1)}
                                disabled={item.quantity <= 0 || submitting}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                className="input input-bordered input-xs w-16 text-center"
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                                min="0"
                                max={item.remaining_quantity}
                                disabled={submitting}
                              />
                              <button
                                className="btn btn-ghost btn-xs btn-square"
                                onClick={() => handleQuantityChange(index, item.quantity + 1)}
                                disabled={item.quantity >= item.remaining_quantity || submitting}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="text-right">{formatPrice(item.unit_price)}</td>
                          <td className="text-right font-semibold text-primary">{formatPrice(item.total)}</td>
                          <td>
                            <input
                              type="text"
                              value={item.lot_number || ''}
                              onChange={(e) => handleLotChange(index, e.target.value)}
                              placeholder="Lot"
                              className="input input-bordered input-xs w-24"
                              disabled={item.quantity === 0 || submitting}
                            />
                          </td>
                          <td> {/* ✅ Champ date d'expiration */}
                            <input
                              type="date"
                              value={item.expiry_date || ''}
                              onChange={(e) => handleExpiryChange(index, e.target.value)}
                              className="input input-bordered input-xs w-32"
                              disabled={item.quantity === 0 || submitting}
                            />
                          </td>
                          <td className="text-center">
                            <input
                              type="checkbox"
                              checked={item.quality_ok !== false}
                              onChange={(e) => handleQualityChange(index, e.target.checked)}
                              className="checkbox checkbox-success checkbox-xs"
                              disabled={item.quantity === 0 || submitting}
                            />
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="btn btn-ghost btn-xs text-error"
                              disabled={submitting}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2">
                      <tr>
                        <td colSpan="8" className="text-right font-bold">Valeur totale à recevoir</td>
                        <td colSpan="3" className="font-bold text-primary text-lg">{formatPrice(totalValue)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Aucun article message */}
            {commandeSelected && items.length === 0 && !loading && (
              <div className="alert alert-info mt-6">
                <AlertCircle className="w-5 h-5" />
                <span>Tous les articles de cette commande ont déjà été reçus.</span>
              </div>
            )}

            {/* Notes */}
            <div className="form-control mt-6">
              <label className="label">
                <span className="label-text font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Notes (optionnel)
                </span>
              </label>
              <textarea
                className="textarea textarea-bordered"
                rows="2"
                placeholder="Observations sur la réception..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 p-4 lg:p-6 bg-gray-50/50 border-t border-base-200">
            <Link to="/receptions" className="btn btn-ghost gap-2">
              Annuler
            </Link>
            <button
              className="btn btn-primary gap-2 shadow-lg hover:shadow-xl transition-all"
              onClick={handleSubmit}
              disabled={submitting || !hasItemsToReceive}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEditMode ? 'Modifier la réception' : 'Valider la réception'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ReceptionForm;