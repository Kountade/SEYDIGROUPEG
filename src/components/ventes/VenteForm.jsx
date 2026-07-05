// src/components/sales/VenteForm.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AxiosInstance from '../AxiosInstance';
import {
  Save, X, ArrowLeft, Plus, Minus, Trash2, User, ShoppingCart,
  CheckCircle, AlertCircle, Loader2, Building2, 
  Package, DollarSign, FileText, Warehouse
} from 'lucide-react';

const VenteForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientIdParam = searchParams.get('client_id');

  // États généraux
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success', details: null });
  const [agence, setAgence] = useState(null);
  const [typeVente, setTypeVente] = useState('comptoir');
  const [entrepot, setEntrepot] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [notes, setNotes] = useState('');
  
  // Items (lignes de produits)
  const [items, setItems] = useState([]);

  // Totaux
  const [totals, setTotals] = useState({ subtotal: 0, tax_amount: 0, total: 0 });

  const showNotification = (message, type = 'success', details = null) => {
    setNotification({ show: true, message, type, details });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success', details: null }), 8000);
  };

  // ============================================================
  // 1. Chargement de l'utilisateur, agence, entrepôt
  // ============================================================
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await AxiosInstance.get('/users/me/');
        const userData = response.data;
        setCurrentUser(userData);
        const agencesDeLUtilisateur = userData.agences || [];
        if (agencesDeLUtilisateur.length > 0) {
          const agenceUtilisateur = agencesDeLUtilisateur[0];
          setAgence(agenceUtilisateur);
          await fetchEntrepot(agenceUtilisateur.id);
        } else {
          const agencesRes = await AxiosInstance.get('/agences/');
          const agencesList = agencesRes.data || [];
          if (agencesList.length > 0) {
            setAgence(agencesList[0]);
            await fetchEntrepot(agencesList[0].id);
          }
        }
      } catch (error) {
        console.error(error);
        showNotification('Erreur de chargement du profil', 'error');
        setLoadingUser(false);
      }
    };
    fetchCurrentUser();
  }, []);

  const fetchEntrepot = async (agenceId) => {
    try {
      const response = await AxiosInstance.get(`/warehouses/?agence=${agenceId}`);
      const warehouses = response.data || [];
      const defaultWarehouse = warehouses.find(w => w.is_default) || warehouses[0];
      if (defaultWarehouse) {
        setEntrepot(defaultWarehouse);
      } else {
        console.warn('Aucun entrepôt trouvé pour cette agence');
      }
      setLoadingUser(false);
    } catch (error) {
      console.error(error);
      setLoadingUser(false);
    }
  };

  // ============================================================
  // 2. Chargement des produits (avec prix dans l'entrepôt)
  // ============================================================
  useEffect(() => {
    if (!entrepot || !entrepot.id) return;
    const fetchProductsWithPrices = async () => {
      setLoading(true);
      try {
        const productsRes = await AxiosInstance.get('/products/?is_active=true');
        const allProducts = productsRes.data || [];
        const productsWithPrices = await Promise.all(allProducts.map(async (product) => {
          try {
            const priceRes = await AxiosInstance.get(`/product-prices/by_product_and_warehouse/?product_id=${product.id}&warehouse_id=${entrepot.id}`);
            const stockRes = await AxiosInstance.get(`/warehouse-stocks/by_product/?product_id=${product.id}`);
            const stock = stockRes.data?.find(s => s.warehouse === entrepot.id);
            return {
              ...product,
              warehouse_price: priceRes.data.sale_price,
              stock_quantity: stock?.quantity || 0,
              has_price: true
            };
          } catch {
            return {
              ...product,
              warehouse_price: product.sale_price || 0,
              stock_quantity: 0,
              has_price: false
            };
          }
        }));
        setProducts(productsWithPrices);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchProductsWithPrices();
  }, [entrepot]);

  // ============================================================
  // 3. Chargement des clients
  // ============================================================
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await AxiosInstance.get('/clients/?is_active=true');
        setClients(response.data || []);
        if (clientIdParam) {
          const client = response.data.find(c => c.id === parseInt(clientIdParam));
          if (client) setSelectedClient(client);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchClients();
  }, [clientIdParam]);

  // ============================================================
  // 4. Gestion des lignes (items) - AVEC VÉRIFICATION DES DOUBLONS
  // ============================================================
  
  // Vérifier si un produit est déjà dans la liste
  const isProductAlreadyAdded = (productId) => {
    return items.some(item => item.product_id === productId);
  };

  // Ajouter un nouvel item avec vérification des doublons
  const handleAddItem = () => {
    // Si des produits sont déjà sélectionnés, on propose d'ajouter un nouveau produit
    // mais on ne peut pas ajouter de ligne vide car le select montre tous les produits
    
    // On vérifie si tous les produits disponibles sont déjà ajoutés
    const availableProducts = products.filter(p => !isProductAlreadyAdded(p.id));
    if (availableProducts.length === 0) {
      showNotification('Tous les produits sont déjà dans la liste', 'warning');
      return;
    }
    
    // Ajouter une nouvelle ligne avec le premier produit disponible
    const firstAvailable = availableProducts[0];
    setItems(prev => [...prev, {
      id: Date.now(),
      product_id: firstAvailable.id,
      product_name: firstAvailable.name,
      product_reference: firstAvailable.reference || '',
      quantity: 1,
      unit_price: firstAvailable.warehouse_price || 0,
      discount: 0,
      total: firstAvailable.warehouse_price || 0,
      stock_max: firstAvailable.stock_quantity || 0
    }]);
  };

  const handleRemoveItem = (itemId) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  const handleItemChange = (itemId, field, value) => {
    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        
        // Si le produit change, mettre à jour les infos
        if (field === 'product_id') {
          const product = products.find(p => p.id === parseInt(value));
          if (product) {
            // Vérifier si le produit est déjà utilisé ailleurs (sauf pour l'item en cours)
            const isDuplicate = items.some(other => 
              other.id !== itemId && other.product_id === parseInt(value)
            );
            
            if (isDuplicate) {
              showNotification(`Le produit "${product.name}" est déjà dans la liste`, 'warning');
              return item; // Retourner l'item inchangé
            }
            
            updatedItem.product_name = product.name;
            updatedItem.product_reference = product.reference || '';
            updatedItem.unit_price = product.warehouse_price || 0;
            updatedItem.stock_max = product.stock_quantity || 0;
          }
        }
        
        // Recalculer le total si quantité, prix ou remise change
        if (field === 'quantity' || field === 'unit_price' || field === 'discount' || field === 'product_id') {
          const qty = parseFloat(updatedItem.quantity) || 0;
          const price = parseFloat(updatedItem.unit_price) || 0;
          const discount = parseFloat(updatedItem.discount) || 0;
          updatedItem.total = qty * price * (1 - discount / 100);
        }
        
        return updatedItem;
      }
      return item;
    });
    setItems(updatedItems);
  };

  // ============================================================
  // 5. Calcul des totaux
  // ============================================================
  useEffect(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const tax_amount = 0; // TVA à 0%
    const total = subtotal + tax_amount;
    setTotals({ subtotal, tax_amount, total });
  }, [items]);

  // ============================================================
  // 6. Soumission de la vente - AVEC VÉRIFICATION DES DOUBLONS
  // ============================================================
  const handleSubmit = async () => {
    // Vérifier que tous les items ont un produit sélectionné
    const emptyItems = items.filter(item => !item.product_id);
    if (emptyItems.length > 0) {
      showNotification('Veuillez sélectionner un produit pour chaque ligne', 'error');
      return;
    }

    if (items.length === 0) {
      showNotification('Ajoutez au moins un produit à la vente', 'error');
      return;
    }
    if (!agence) {
      showNotification('Agence non trouvée', 'error');
      return;
    }

    // ✅ VÉRIFICATION DES DOUBLONS AVANT ENVOI
    const productIds = items.map(item => item.product_id);
    const uniqueProductIds = new Set(productIds);
    if (productIds.length !== uniqueProductIds.size) {
      showNotification('Des produits sont dupliqués dans la liste. Veuillez corriger.', 'error');
      return;
    }

    // ✅ VÉRIFICATION DU STOCK
    const stockErrors = [];
    items.forEach(item => {
      if (item.quantity > item.stock_max) {
        stockErrors.push(`${item.product_name} : ${item.stock_max} disponible, ${item.quantity} demandé`);
      }
    });
    if (stockErrors.length > 0) {
      showNotification(`Stock insuffisant :\n${stockErrors.join('\n')}`, 'error');
      return;
    }

    setSubmitting(true);
    
    const payload = {
      type_vente: typeVente,
      agence: agence.id,
      client_id: selectedClient?.id || null,
      notes: notes || `Vente du ${new Date().toLocaleString()}`,
      items: items.map(item => ({
        product: parseInt(item.product_id),
        quantity: item.quantity,
        prix_unitaire: item.unit_price,
        tva: 0,
        remise: item.discount || 0
      }))
    };

    try {
      await AxiosInstance.post('/ventes/', payload);
      showNotification('Vente créée avec succès !', 'success');
      setTimeout(() => navigate('/ventes'), 2000);
    } catch (error) {
      console.error(error);
      let errorMessage = 'Erreur lors de la création';
      if (error.response?.data?.error) errorMessage = error.response.data.error;
      else if (error.response?.data?.detail) errorMessage = error.response.data.detail;
      else if (error.response?.data?.non_field_errors) errorMessage = error.response.data.non_field_errors.join(', ');
      showNotification(errorMessage, 'error', error.response?.data);
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // 7. Gestion de la quantité avec limite de stock
  // ============================================================
  const handleQuantityChange = (itemId, newQuantity) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    // Limiter la quantité au stock disponible
    const maxQty = item.stock_max || 999;
    const safeQty = Math.max(1, Math.min(newQuantity, maxQty));
    
    if (safeQty !== newQuantity) {
      showNotification(`Stock maximum pour ${item.product_name} : ${maxQty}`, 'warning');
    }
    
    handleItemChange(itemId, 'quantity', safeQty);
  };

  const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price || 0) + ' FCFA';

  if (loadingUser || loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="text-base font-medium text-base-content/70 animate-pulse">
            Chargement de l'environnement de vente...
          </p>
        </div>
      </div>
    );
  }

  // Filtrer les produits disponibles (non déjà ajoutés)
  const getAvailableProducts = () => {
    const selectedIds = items.map(item => item.product_id);
    return products.filter(p => !selectedIds.includes(p.id));
  };

  return (
    <div className="px-0 lg:px-0 py-4 lg:py-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
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
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent py-5 px-4 lg:px-6 mx-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full filter blur-3xl"></div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10 max-w-full">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-xl">
                <ShoppingCart className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-primary">
                Nouvelle vente
              </h1>
            </div>
            <p className="text-sm text-base-content/60 ml-1">
              {agence ? `Agence : ${agence.nom}` : 'Nouvelle vente'}
              {entrepot && <span className="text-xs text-gray-400 ml-2">(Entrepôt : {entrepot.name})</span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => navigate('/ventes')} className="btn btn-outline btn-sm lg:btn-md gap-2">
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={submitting} 
              className="btn btn-primary btn-sm lg:btn-md gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Valider la vente
            </button>
          </div>
        </div>
      </div>

      {/* Carte principale */}
      <div className="max-w-full mx-0 px-4 lg:px-6">
        <div className="bg-white rounded-xl shadow-xl border border-base-200 overflow-hidden">
          <div className="p-4 lg:p-6">
            {/* Informations générales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                    Type de vente <span className="text-error">*</span>
                  </span>
                </label>
                <select 
                  className="select select-bordered w-full" 
                  value={typeVente} 
                  onChange={(e) => setTypeVente(e.target.value)}
                >
                  <option value="comptoir">Comptoir</option>
                  <option value="livraison">Livraison</option>
                  <option value="en_ligne">En ligne</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Client
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input input-bordered flex-1"
                    value={selectedClient ? `${selectedClient.nom} ${selectedClient.prenom || ''}` : 'Client anonyme'}
                    readOnly
                  />
                  <button type="button" className="btn btn-outline gap-1" onClick={() => setShowClientModal(true)}>
                    <User className="w-4 h-4" /> {selectedClient ? 'Changer' : 'Ajouter'}
                  </button>
                </div>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <Warehouse className="w-4 h-4 text-primary" />
                    Entrepôt
                  </span>
                </label>
                <div className="bg-gray-100 rounded-lg p-2 px-3 border border-gray-200 h-12 flex items-center">
                  <p className="font-medium">{entrepot?.name || 'Entrepôt principal'}</p>
                </div>
              </div>
            </div>

            {/* Articles */}
            <div className="border-t border-base-300 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Articles
                  <span className="badge badge-primary badge-sm">{items.length}</span>
                </h3>
                <div className="flex gap-2">
                  <span className="text-xs text-gray-500 self-center">
                    {getAvailableProducts().length} produits disponibles
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm gap-2"
                    onClick={handleAddItem}
                    disabled={submitting || getAvailableProducts().length === 0}
                  >
                    <Plus className="w-4 h-4" /> Ajouter une ligne
                  </button>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-500">Aucun article ajouté</p>
                  <p className="text-sm text-gray-400">Cliquez sur "Ajouter une ligne" pour commencer</p>
                </div>
              ) : (
                <>
                  {items.map((item, index) => {
                    const availableProducts = products.filter(p => 
                      !items.some(other => other.id !== item.id && other.product_id === p.id)
                    );
                    
                    return (
                      <div key={item.id} className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-sm">Ligne #{index + 1}</span>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                          {/* Select Produit - avec filtrage des doublons */}
                          <div className="form-control w-full md:col-span-2">
                            <label className="label">
                              <span className="label-text text-sm font-semibold">Produit</span>
                            </label>
                            <select
                              className="select select-bordered w-full"
                              value={item.product_id}
                              onChange={(e) => handleItemChange(item.id, 'product_id', parseInt(e.target.value))}
                              disabled={submitting}
                            >
                              <option value="">Sélectionner un produit</option>
                              {/* Afficher uniquement les produits non déjà sélectionnés + le produit actuel */}
                              {products.map(p => {
                                const isSelected = items.some(other => other.id !== item.id && other.product_id === p.id);
                                return (
                                  <option key={p.id} value={p.id} disabled={isSelected}>
                                    {p.name} - {p.reference} (Stock: {p.stock_quantity})
                                    {isSelected && ' ⚠️ déjà ajouté'}
                                  </option>
                                );
                              })}
                            </select>
                            {item.product_id && item.stock_max > 0 && (
                              <span className="text-xs text-success mt-1">Stock disponible: {item.stock_max}</span>
                            )}
                            {item.product_id && item.stock_max === 0 && (
                              <span className="text-xs text-error mt-1">Stock épuisé</span>
                            )}
                          </div>

                          {/* Quantité */}
                          <div className="form-control w-full">
                            <label className="label">
                              <span className="label-text text-sm font-semibold">Qté</span>
                            </label>
                            <div className="flex items-center gap-1">
                              <button
                                className="btn btn-ghost btn-xs btn-square"
                                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1 || submitting}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                className="input input-bordered w-full text-center"
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                                min="1"
                                max={item.stock_max || 999}
                                disabled={submitting}
                              />
                              <button
                                className="btn btn-ghost btn-xs btn-square"
                                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                disabled={item.quantity >= item.stock_max || submitting}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Prix unitaire */}
                          <div className="form-control w-full">
                            <label className="label">
                              <span className="label-text text-sm font-semibold">Prix unit.</span>
                            </label>
                            <input
                              type="number"
                              className="input input-bordered w-full"
                              value={item.unit_price}
                              onChange={(e) => handleItemChange(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              disabled={submitting}
                            />
                          </div>

                          {/* Remise */}
                          <div className="form-control w-full">
                            <label className="label">
                              <span className="label-text text-sm font-semibold">Remise %</span>
                            </label>
                            <input
                              type="number"
                              className="input input-bordered w-full"
                              value={item.discount}
                              onChange={(e) => handleItemChange(item.id, 'discount', parseFloat(e.target.value) || 0)}
                              min="0"
                              max="100"
                              disabled={submitting}
                            />
                          </div>

                          {/* Total */}
                          <div className="form-control w-full">
                            <label className="label">
                              <span className="label-text text-sm font-semibold text-primary">Total</span>
                            </label>
                            <div className="h-10 flex items-center justify-end px-3 bg-primary/5 rounded-lg border border-primary/20">
                              <span className="font-bold text-primary">{formatPrice(item.total)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Total général */}
                  <div className="text-right pt-4 border-t border-gray-200">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Sous-total</span>
                        <span className="font-semibold">{formatPrice(totals.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-success">
                        <span className="text-gray-600">TVA (0%)</span>
                        <span>{formatPrice(totals.tax_amount)}</span>
                      </div>
                      <div className="flex justify-between text-xl font-bold">
                        <span>Total</span>
                        <span className="text-primary">{formatPrice(totals.total)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Notes optionnelles */}
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
                placeholder="Informations complémentaires..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 p-4 lg:p-6 bg-base-200/50 border-t border-base-200">
            <button className="btn btn-ghost gap-2" onClick={() => navigate('/ventes')}>
              Annuler
            </button>
            <button 
              className="btn btn-primary gap-2 shadow-lg hover:shadow-xl transition-all" 
              onClick={handleSubmit} 
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Valider la vente
            </button>
          </div>
        </div>
      </div>

      {/* Modal de sélection client */}
      {showClientModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Sélectionner un client</h3>
              <button className="btn btn-sm btn-circle btn-ghost" onClick={() => setShowClientModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <button
                className="w-full text-left p-3 bg-gray-100 rounded-lg hover:bg-primary/10 transition"
                onClick={() => { setSelectedClient(null); setShowClientModal(false); }}
              >
                <div className="font-semibold">Client anonyme</div>
                <div className="text-xs text-gray-500">Vente sans client enregistré</div>
              </button>
              {clients.map(client => (
                <button
                  key={client.id}
                  className="w-full text-left p-3 bg-gray-100 rounded-lg hover:bg-primary/10 transition"
                  onClick={() => { setSelectedClient(client); setShowClientModal(false); }}
                >
                  <div className="font-semibold">{client.nom} {client.prenom || ''}</div>
                  <div className="text-xs text-gray-500">{client.telephone}</div>
                </button>
              ))}
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowClientModal(false)}>Fermer</button>
              <button className="btn btn-primary" onClick={() => navigate('/clients/nouveau')}>
                <Plus className="w-4 h-4" /> Nouveau client
              </button>
            </div>
          </div>
        </div>
      )}

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

export default VenteForm;