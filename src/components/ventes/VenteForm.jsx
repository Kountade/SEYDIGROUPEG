// src/components/sales/VenteForm.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AxiosInstance from '../AxiosInstance';
import {
  Save, X, ArrowLeft, Search, Plus, Minus, Trash2, User, ShoppingCart,
  CheckCircle, AlertCircle, Loader2, Building2, Store, Lock, Info,
  RefreshCw, Package, DollarSign
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

  // Panier
  const [cart, setCart] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductForCart, setSelectedProductForCart] = useState(null);
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [stockForSelectedProduct, setStockForSelectedProduct] = useState(0);

  // Totaux
  const [totals, setTotals] = useState({ sous_total: 0, tva: 0, total: 0 });

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
            return {
              ...product,
              warehouse_price: priceRes.data.sale_price,
              has_price: true
            };
          } catch {
            return {
              ...product,
              warehouse_price: product.sale_price || 0,
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
  // 4. Vérification du stock pour un produit
  // ============================================================
  const checkStock = async (productId) => {
    if (!entrepot || !entrepot.id) return 0;
    try {
      const response = await AxiosInstance.get(`/warehouse-stocks/by_product/?product_id=${productId}`);
      const stock = response.data?.find(s => s.warehouse === entrepot.id);
      return stock?.quantity || 0;
    } catch {
      return 0;
    }
  };

  // ============================================================
  // 5. Gestion du panier
  // ============================================================
  const openProductModal = () => {
    setProductSearch('');
    setSelectedProductForCart(null);
    setNewItemQuantity(1);
    setStockForSelectedProduct(0);
    setShowProductModal(true);
  };

  const handleSelectProduct = async (product) => {
    setSelectedProductForCart(product);
    const stock = await checkStock(product.id);
    setStockForSelectedProduct(stock);
    setNewItemQuantity(1);
  };

  const addToCart = () => {
    if (!selectedProductForCart) {
      showNotification('Veuillez sélectionner un produit', 'error');
      return;
    }
    if (newItemQuantity < 1) {
      showNotification('La quantité doit être au moins 1', 'error');
      return;
    }
    if (newItemQuantity > stockForSelectedProduct) {
      showNotification(`Stock insuffisant. Maximum : ${stockForSelectedProduct}`, 'error');
      return;
    }

    const existingIndex = cart.findIndex(item => item.product.id === selectedProductForCart.id);
    if (existingIndex !== -1) {
      const newCart = [...cart];
      const newQty = newCart[existingIndex].quantity + newItemQuantity;
      if (newQty > stockForSelectedProduct) {
        showNotification(`Quantité totale (${newQty}) dépasse le stock (${stockForSelectedProduct})`, 'error');
        return;
      }
      newCart[existingIndex].quantity = newQty;
      newCart[existingIndex].total = newQty * newCart[existingIndex].prix_unitaire;
      setCart(newCart);
    } else {
      const newItem = {
        id: Date.now(),
        product: selectedProductForCart,
        quantity: newItemQuantity,
        prix_unitaire: selectedProductForCart.warehouse_price,
        total: newItemQuantity * selectedProductForCart.warehouse_price,
        stock_max: stockForSelectedProduct
      };
      setCart([...cart, newItem]);
    }
    setShowProductModal(false);
    setSelectedProductForCart(null);
    setNewItemQuantity(1);
    setStockForSelectedProduct(0);
  };

  const updateCartQuantity = (itemId, delta) => {
    const itemIndex = cart.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;
    const newCart = [...cart];
    const newQty = newCart[itemIndex].quantity + delta;
    if (newQty < 1) {
      newCart.splice(itemIndex, 1);
      setCart(newCart);
      return;
    }
    if (newQty > newCart[itemIndex].stock_max) {
      showNotification(`Stock insuffisant pour ${newCart[itemIndex].product.name}. Maximum : ${newCart[itemIndex].stock_max}`, 'error');
      return;
    }
    newCart[itemIndex].quantity = newQty;
    newCart[itemIndex].total = newQty * newCart[itemIndex].prix_unitaire;
    setCart(newCart);
  };

  const removeCartItem = (itemId) => {
    setCart(cart.filter(i => i.id !== itemId));
  };

  // Recalcul des totaux
  useEffect(() => {
    const sous_total = cart.reduce((sum, item) => sum + item.total, 0);
    const tva = sous_total * 0.18;
    const total = sous_total + tva;
    setTotals({ sous_total, tva, total });
  }, [cart]);

  // ============================================================
  // 6. Soumission de la vente
  // ============================================================
  const handleSubmit = async () => {
    if (cart.length === 0) {
      showNotification('Ajoutez au moins un produit à la vente', 'error');
      return;
    }
    if (!agence) {
      showNotification('Agence non trouvée', 'error');
      return;
    }

    setSubmitting(true);
    const payload = {
      type_vente: typeVente,
      agence: agence.id,
      client_id: selectedClient?.id || null,
      notes: `Vente du ${new Date().toLocaleString()}`,
      items: cart.map(item => ({
        product: item.product.id,
        quantity: item.quantity,
        prix_unitaire: item.prix_unitaire,
        tva: item.prix_unitaire * 0.18,
        remise: 0
      }))
    };

    try {
      const response = await AxiosInstance.post('/ventes/', payload);
      showNotification('Vente créée avec succès ! Vous pouvez la soumettre depuis la liste.', 'success');
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

  const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price || 0) + ' FCFA';

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.reference?.toLowerCase().includes(productSearch.toLowerCase())
  );

  if (loadingUser || loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="text-base font-medium text-base-content/70 animate-pulse">
            Chargement de l’environnement de vente...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6 p-3 lg:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Notification Toast */}
      {notification.show && (
        <div className="fixed top-16 lg:top-20 right-3 lg:right-6 z-50 animate-slideDown w-[calc(100%-1.5rem)] lg:w-auto max-w-md">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg`}>
            {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm lg:text-base font-medium">{notification.message}</span>
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

      {/* En-tête avec gradient */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full filter blur-3xl"></div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-xl"><ShoppingCart className="w-7 h-7 text-primary" /></div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-primary">Nouvelle vente</h1>
            </div>
            <p className="text-sm text-base-content/60 ml-1">
              {agence ? `Agence : ${agence.nom}` : 'Nouvelle vente'}
              {entrepot && <span className="text-xs text-gray-400 ml-2">(Entrepôt : {entrepot.name})</span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => navigate('/ventes')} className="btn btn-outline btn-sm lg:btn-md gap-2">
              <RefreshCw className="w-4 h-4" /> Retour
            </button>
            <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary btn-sm lg:btn-md gap-2 shadow-lg hover:shadow-xl transition-all">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Valider la vente
            </button>
          </div>
        </div>
      </div>

      {/* Carte principale */}
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl border border-base-200 overflow-hidden">
          <div className="p-6">
            {/* Informations générales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Type de vente</span></label>
                <select className="select select-bordered w-full" value={typeVente} onChange={(e) => setTypeVente(e.target.value)}>
                  <option value="comptoir">Comptoir</option>
                  <option value="livraison">Livraison</option>
                  <option value="en_ligne">En ligne</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Client</span></label>
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
            </div>

            {/* Agence et Entrepôt (lecture seule) */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="form-control">
                <label className="label"><span className="label-text font-medium"><Building2 className="w-4 h-4 inline mr-1" /> Agence</span></label>
                <div className="bg-gray-100 rounded-lg p-2 px-3 border border-gray-200">
                  <p className="font-medium">{agence?.nom || 'Chargement...'}</p>
                </div>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-medium"><Store className="w-4 h-4 inline mr-1" /> Entrepôt</span></label>
                <div className="bg-gray-100 rounded-lg p-2 px-3 border border-gray-200">
                  <p className="font-medium">{entrepot?.name || 'Entrepôt principal'}</p>
                </div>
              </div>
            </div>

            {/* Section Panier */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" /> Articles
                </h2>
                <button type="button" className="btn btn-primary btn-sm gap-1" onClick={openProductModal}>
                  <Plus className="w-4 h-4" /> Ajouter un produit
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <ShoppingCart className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">Aucun article dans le panier</p>
                  <button className="btn btn-outline btn-sm mt-3" onClick={openProductModal}>
                    Ajouter un produit
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="table table-zebra w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th>Produit</th>
                        <th className="text-center">Quantité</th>
                        <th className="text-right">Prix unitaire</th>
                        <th className="text-right">Total</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div>
                              <p className="font-medium">{item.product.name}</p>
                              <p className="text-xs text-gray-500">{item.product.reference}</p>
                            </div>
                          </td>
                          <td className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                className="btn btn-ghost btn-xs btn-square"
                                onClick={() => updateCartQuantity(item.id, -1)}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <button
                                className="btn btn-ghost btn-xs btn-square"
                                onClick={() => updateCartQuantity(item.id, 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="text-right font-mono">{formatPrice(item.prix_unitaire)}</td>
                          <td className="text-right font-semibold">{formatPrice(item.total)}</td>
                          <td className="text-center">
                            <button
                              className="btn btn-ghost btn-xs btn-square text-error"
                              onClick={() => removeCartItem(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan="3" className="text-right font-semibold">Sous-total</td>
                        <td className="text-right font-semibold">{formatPrice(totals.sous_total)}</td>
                        <td></td>
                      </tr>
                      <tr>
                        <td colSpan="3" className="text-right">TVA (18%)</td>
                        <td className="text-right">{formatPrice(totals.tva)}</td>
                        <td></td>
                      </tr>
                      <tr className="border-t">
                        <td colSpan="3" className="text-right font-bold text-lg">Total TTC</td>
                        <td className="text-right font-bold text-primary text-lg">{formatPrice(totals.total)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Notes optionnelles */}
            <div className="form-control">
              <label className="label"><span className="label-text font-medium">Notes (optionnel)</span></label>
              <textarea
                className="textarea textarea-bordered"
                rows="2"
                placeholder="Informations complémentaires..."
                value={''}
                onChange={() => {}}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 p-6 bg-base-200/50 border-t border-base-200">
            <button className="btn btn-ghost gap-2" onClick={() => navigate('/ventes')}>
              Annuler
            </button>
            <button className="btn btn-primary gap-2" onClick={handleSubmit} disabled={submitting}>
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

      {/* Modal de sélection produit */}
      {showProductModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl p-0 overflow-hidden">
            <div className="sticky top-0 z-10 bg-gradient-to-r from-primary to-primary-focus p-4 text-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Package className="w-6 h-6" />
                  <h2 className="text-xl font-bold">Ajouter un produit</h2>
                </div>
                <button className="btn btn-ghost btn-sm btn-circle" onClick={() => setShowProductModal(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou référence..."
                  className="input input-bordered w-full pl-10 bg-white text-gray-800"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="flex flex-col lg:flex-row max-h-[60vh]">
              {/* Liste des produits */}
              <div className="flex-1 overflow-y-auto p-4 border-r">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500">Aucun produit trouvé</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedProductForCart?.id === product.id
                            ? 'border-primary bg-primary/10'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => handleSelectProduct(product)}
                      >
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.reference}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-primary">{formatPrice(product.warehouse_price)}</p>
                            <p className="text-xs text-gray-400">Prix entrepôt</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Panneau de quantité */}
              {selectedProductForCart && (
                <div className="w-full lg:w-80 p-4 bg-gray-50 flex flex-col gap-4">
                  <div>
                    <label className="label text-sm font-medium">Produit sélectionné</label>
                    <p className="font-semibold">{selectedProductForCart.name}</p>
                    <p className="text-xs text-gray-500">Stock disponible : {stockForSelectedProduct}</p>
                  </div>
                  <div className="form-control">
                    <label className="label text-sm font-medium">Quantité</label>
                    <input
                      type="number"
                      min="1"
                      max={stockForSelectedProduct}
                      className="input input-bordered"
                      value={newItemQuantity}
                      onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="mt-2 p-2 bg-white rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span>Total ligne :</span>
                      <span className="font-semibold">{formatPrice(newItemQuantity * selectedProductForCart.warehouse_price)}</span>
                    </div>
                  </div>
                  <button className="btn btn-primary w-full gap-2" onClick={addToCart}>
                    <Plus className="w-4 h-4" /> Ajouter au panier
                  </button>
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button className="btn btn-ghost" onClick={() => setShowProductModal(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenteForm;