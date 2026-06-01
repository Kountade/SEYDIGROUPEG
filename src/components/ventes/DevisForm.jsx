// src/components/sales/DevisForm.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AxiosInstance from '../AxiosInstance';
import {
  Save, X, ArrowLeft, Search, Plus, Minus, Trash2, User, FileText,
  CheckCircle, AlertCircle, Loader2, Building2, Package
} from 'lucide-react';

const DevisForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  // États généraux
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [agence, setAgence] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [expirationDate, setExpirationDate] = useState('');
  const [notes, setNotes] = useState('');
  const [conditions, setConditions] = useState('');
  const [piedDePage, setPiedDePage] = useState('');
  const [cart, setCart] = useState([]);
  const [totals, setTotals] = useState({ sous_total: 0, tva: 0, total: 0 });
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success', details: null });

  // Modals
  const [showClientModal, setShowClientModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductForCart, setSelectedProductForCart] = useState(null);
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [priceForSelectedProduct, setPriceForSelectedProduct] = useState(0);

  const showNotification = (message, type = 'success', details = null) => {
    setNotification({ show: true, message, type, details });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success', details: null }), 8000);
  };

  // ============================================================
  // 1. Chargement automatique de l'agence de l'utilisateur
  // ============================================================
  useEffect(() => {
    const fetchUserAndAgence = async () => {
      try {
        const response = await AxiosInstance.get('/users/me/');
        const userData = response.data;
        const userAgences = userData.agences || [];

        if (userAgences.length === 0) {
          const agencesRes = await AxiosInstance.get('/agences/');
          const allAgences = agencesRes.data || [];
          if (allAgences.length > 0) setAgence(allAgences[0]);
          else showNotification('Aucune agence trouvée', 'error');
        } else {
          setAgence(userAgences[0]);
        }
      } catch (err) {
        console.error(err);
        showNotification('Erreur de chargement du profil', 'error');
      }
    };
    fetchUserAndAgence();
  }, []);

  // ============================================================
  // 2. Chargement des clients et produits
  // ============================================================
  useEffect(() => {
    if (!agence) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [clientsRes, productsRes] = await Promise.all([
          AxiosInstance.get('/clients/?is_active=true'),
          AxiosInstance.get('/products/?is_active=true')
        ]);
        setClients(clientsRes.data || []);
        setProducts(productsRes.data || []);
      } catch (err) {
        console.error(err);
        showNotification('Erreur de chargement des données', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [agence]);

  // ============================================================
  // 3. Si édition, charger le devis
  // ============================================================
  useEffect(() => {
    if (!isEditing || loading || !agence) return;
    const fetchDevis = async () => {
      try {
        const response = await AxiosInstance.get(`/devis/${id}/`);
        const devis = response.data;
        if (devis.agence && devis.agence.id !== agence.id) {
          showNotification(`Ce devis appartient à l'agence "${devis.agence.nom}". Vous ne pouvez que le consulter.`, 'error');
        }
        setSelectedClient(devis.client);
        setExpirationDate(devis.date_expiration?.split('T')[0] || '');
        setNotes(devis.notes || '');
        setConditions(devis.conditions || '');
        setPiedDePage(devis.pied_de_page || '');
        const cartItems = devis.items.map(item => ({
          id: item.id,
          product: item.product,
          product_name: item.product_name,
          product_reference: item.product_reference,
          quantity: item.quantity,
          prix_unitaire: item.prix_unitaire,
          total: item.total,
        }));
        setCart(cartItems);
        recalculTotaux(cartItems);
      } catch (err) {
        console.error(err);
        showNotification('Erreur de chargement du devis', 'error');
      }
    };
    fetchDevis();
  }, [id, isEditing, loading, agence]);

  const recalculTotaux = (items) => {
    const sous_total = items.reduce((sum, item) => sum + (item.quantity * item.prix_unitaire), 0);
    const tva = sous_total * 0.18;
    const total = sous_total + tva;
    setTotals({ sous_total, tva, total });
  };

  // Gestion panier (sans tableau)
  const openProductModal = () => {
    setProductSearch('');
    setSelectedProductForCart(null);
    setNewItemQuantity(1);
    setPriceForSelectedProduct(0);
    setShowProductModal(true);
  };

  const handleSelectProduct = (product) => {
    setSelectedProductForCart(product);
    setPriceForSelectedProduct(product.sale_price || 0);
    setNewItemQuantity(1);
  };

  const addToCart = () => {
    if (!selectedProductForCart) {
      showNotification('Sélectionnez un produit', 'error');
      return;
    }
    if (newItemQuantity < 1) {
      showNotification('Quantité invalide', 'error');
      return;
    }

    const existing = cart.find(item => item.product.id === selectedProductForCart.id);
    if (existing) {
      const newCart = cart.map(item =>
        item.product.id === selectedProductForCart.id
          ? {
              ...item,
              quantity: item.quantity + newItemQuantity,
              total: (item.quantity + newItemQuantity) * item.prix_unitaire
            }
          : item
      );
      setCart(newCart);
      recalculTotaux(newCart);
    } else {
      const newItem = {
        id: Date.now(),
        product: selectedProductForCart,
        product_name: selectedProductForCart.name,
        product_reference: selectedProductForCart.reference,
        quantity: newItemQuantity,
        prix_unitaire: priceForSelectedProduct,
        total: newItemQuantity * priceForSelectedProduct,
      };
      const newCart = [...cart, newItem];
      setCart(newCart);
      recalculTotaux(newCart);
    }
    setShowProductModal(false);
    setSelectedProductForCart(null);
    setNewItemQuantity(1);
    setPriceForSelectedProduct(0);
  };

  const updateCartQuantity = (itemId, delta) => {
    const newCart = cart
      .map(item => {
        if (item.id === itemId) {
          const newQty = item.quantity + delta;
          if (newQty < 1) return null;
          return { ...item, quantity: newQty, total: newQty * item.prix_unitaire };
        }
        return item;
      })
      .filter(Boolean);
    setCart(newCart);
    recalculTotaux(newCart);
  };

  const removeCartItem = (itemId) => {
    const newCart = cart.filter(item => item.id !== itemId);
    setCart(newCart);
    recalculTotaux(newCart);
  };

  // Soumission
  const handleSubmit = async () => {
    if (!agence) {
      showNotification('Agence non trouvée', 'error');
      return;
    }
    if (cart.length === 0) {
      showNotification('Ajoutez au moins un produit', 'error');
      return;
    }
    if (!expirationDate) {
      showNotification('Date d\'expiration requise', 'error');
      return;
    }

    setSubmitting(true);
    const payload = {
      agence: agence.id,
      client_id: selectedClient?.id || null,
      date_expiration: expirationDate,
      notes,
      conditions,
      pied_de_page: piedDePage,
      items: cart.map(item => ({
        product: item.product.id,
        quantity: item.quantity,
        prix_unitaire: item.prix_unitaire,
        tva: item.prix_unitaire * 0.18,
        remise: 0,
      })),
    };

    try {
      if (isEditing) {
        await AxiosInstance.put(`/devis/${id}/`, payload);
        showNotification('Devis modifié avec succès');
      } else {
        await AxiosInstance.post('/devis/', payload);
        showNotification('Devis créé avec succès');
      }
      setTimeout(() => navigate('/devis'), 2000);
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.error || error.response?.data?.detail || 'Erreur lors de l\'enregistrement';
      showNotification(msg, 'error', error.response?.data);
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price || 0) + ' FCFA';

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.reference?.toLowerCase().includes(productSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="text-base font-medium animate-pulse">Chargement du formulaire...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6 p-0 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-16 lg:top-20 right-3 lg:right-6 z-50 animate-slideDown w-[calc(100%-1.5rem)] lg:w-auto max-w-md">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg`}>
            {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{notification.message}</span>
            {notification.details && (
              <details className="text-xs">
                <summary>Détails</summary>
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
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-none p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-xl"><FileText className="w-7 h-7 text-primary" /></div>
              <h1 className="text-2xl sm:text-3xl font-black text-primary">{isEditing ? 'Modifier le devis' : 'Nouveau devis'}</h1>
            </div>
            <p className="text-sm text-base-content/60 ml-1">
              {agence ? `Agence : ${agence.nom}` : 'Agence non définie'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => navigate('/devis')} className="btn btn-outline btn-sm gap-2"><ArrowLeft className="w-4 h-4" /> Retour</button>
            <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary btn-sm gap-2 shadow-lg">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEditing ? 'Mettre à jour' : 'Créer le devis'}
            </button>
          </div>
        </div>
      </div>

      {/* Contenu principal - pleine largeur */}
      <div className="w-full px-4 lg:px-6">
        <div className="bg-white rounded-xl shadow-xl border border-base-200 overflow-hidden">
          <div className="p-6">
            {/* Agence, Client, Date expiration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="label font-medium"><Building2 className="w-4 h-4 inline mr-1" /> Agence</label>
                <div className="bg-gray-100 rounded-lg p-2 px-3 border border-gray-200">
                  <p className="font-medium">{agence?.nom || 'Chargement...'}</p>
                </div>
              </div>
              <div>
                <label className="label font-medium">Client</label>
                <div className="flex gap-2">
                  <input type="text" className="input input-bordered flex-1" value={selectedClient ? `${selectedClient.nom} ${selectedClient.prenom || ''}` : 'Client anonyme'} readOnly />
                  <button type="button" className="btn btn-outline gap-1" onClick={() => setShowClientModal(true)}>
                    <User className="w-4 h-4" /> {selectedClient ? 'Changer' : 'Ajouter'}
                  </button>
                </div>
              </div>
              <div>
                <label className="label font-medium">Date d'expiration *</label>
                <input type="date" className="input input-bordered w-full" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} required />
              </div>
            </div>

            {/* Panier - version sans tableau (grille de cartes) */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold"><Package className="w-5 h-5 inline mr-2 text-primary" /> Articles</h2>
                <button type="button" className="btn btn-primary btn-sm gap-1" onClick={openProductModal}>
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">Aucun article</p>
                  <button className="btn btn-outline btn-sm mt-3" onClick={openProductModal}>Ajouter un produit</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 gap-3">
                      <div className="flex-1 min-w-[150px]">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-xs text-gray-500">{item.product_reference}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="btn btn-ghost btn-xs btn-square" onClick={() => updateCartQuantity(item.id, -1)}>
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-semibold">{item.quantity}</span>
                        <button className="btn btn-ghost btn-xs btn-square" onClick={() => updateCartQuantity(item.id, 1)}>
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-right min-w-[100px]">
                        <p className="text-sm text-gray-600">{formatPrice(item.prix_unitaire)} / unité</p>
                        <p className="font-bold text-primary">{formatPrice(item.total)}</p>
                      </div>
                      <button className="btn btn-ghost btn-xs btn-square text-error" onClick={() => removeCartItem(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Récapitulatif des totaux */}
              {cart.length > 0 && (
                <div className="mt-4 p-4 bg-gray-100 rounded-xl text-right">
                  <p>Sous-total HT : <span className="font-semibold">{formatPrice(totals.sous_total)}</span></p>
                  <p>TVA (18%) : <span className="font-semibold">{formatPrice(totals.tva)}</span></p>
                  <p className="text-lg font-bold">Total TTC : <span className="text-primary">{formatPrice(totals.total)}</span></p>
                </div>
              )}
            </div>

            {/* Conditions, notes, pied de page */}
            <div className="space-y-4">
              <div>
                <label className="label">Conditions générales</label>
                <textarea className="textarea textarea-bordered w-full" rows="3" value={conditions} onChange={e => setConditions(e.target.value)} />
              </div>
              <div>
                <label className="label">Notes internes</label>
                <textarea className="textarea textarea-bordered w-full" rows="2" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div>
                <label className="label">Pied de page</label>
                <textarea className="textarea textarea-bordered w-full" rows="2" value={piedDePage} onChange={e => setPiedDePage(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 p-6 bg-base-200/50 border-t">
            <button className="btn btn-ghost" onClick={() => navigate('/devis')}>Annuler</button>
            <button className="btn btn-primary gap-2" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEditing ? 'Mettre à jour' : 'Créer le devis'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal client */}
      {showClientModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Sélectionner un client</h3>
              <button className="btn btn-sm btn-circle btn-ghost" onClick={() => setShowClientModal(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <button className="w-full text-left p-3 bg-gray-100 rounded-lg hover:bg-primary/10" onClick={() => { setSelectedClient(null); setShowClientModal(false); }}>
                <div className="font-semibold">Client anonyme</div>
              </button>
              {clients.map(c => (
                <button key={c.id} className="w-full text-left p-3 bg-gray-100 rounded-lg hover:bg-primary/10" onClick={() => { setSelectedClient(c); setShowClientModal(false); }}>
                  <div className="font-semibold">{c.nom} {c.prenom || ''}</div>
                  <div className="text-xs text-gray-500">{c.telephone}</div>
                </button>
              ))}
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowClientModal(false)}>Fermer</button>
              <button className="btn btn-primary" onClick={() => navigate('/clients/nouveau')}>+ Nouveau client</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal produit */}
      {showProductModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl p-0 overflow-hidden">
            <div className="bg-primary p-4 text-white sticky top-0">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Ajouter un produit</h2>
                <button className="btn btn-ghost btn-sm btn-circle" onClick={() => setShowProductModal(false)}><X className="w-5 h-5" /></button>
              </div>
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Rechercher..." className="input input-bordered w-full pl-10 bg-white text-gray-800" value={productSearch} onChange={e => setProductSearch(e.target.value)} autoFocus />
              </div>
            </div>
            <div className="flex flex-col lg:flex-row max-h-[60vh]">
              <div className="flex-1 overflow-y-auto p-4 border-r">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-12"><Package className="w-12 h-12 mx-auto text-gray-300" /><p>Aucun produit</p></div>
                ) : (
                  <div className="space-y-2">
                    {filteredProducts.map(p => (
                      <button key={p.id} className={`w-full text-left p-3 rounded-lg border mb-2 ${selectedProductForCart?.id === p.id ? 'border-primary bg-primary/10' : 'border-gray-200'}`} onClick={() => handleSelectProduct(p)}>
                        <div className="flex justify-between">
                          <div><p className="font-medium">{p.name}</p><p className="text-xs text-gray-500">{p.reference}</p></div>
                          <div><p className="font-semibold text-primary">{formatPrice(p.sale_price || 0)}</p></div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedProductForCart && (
                <div className="w-full lg:w-80 p-4 bg-gray-50 flex flex-col gap-4">
                  <div><label className="label">Produit sélectionné</label><p className="font-semibold">{selectedProductForCart.name}</p></div>
                  <div><label className="label">Prix unitaire (FCFA)</label><input type="number" className="input input-bordered" value={priceForSelectedProduct} onChange={e => setPriceForSelectedProduct(parseFloat(e.target.value) || 0)} /></div>
                  <div><label className="label">Quantité</label><input type="number" min="1" className="input input-bordered" value={newItemQuantity} onChange={e => setNewItemQuantity(parseInt(e.target.value) || 1)} /></div>
                  <div className="p-2 bg-white rounded-lg"><div className="flex justify-between"><span>Total :</span><span className="font-semibold">{formatPrice(newItemQuantity * priceForSelectedProduct)}</span></div></div>
                  <button className="btn btn-primary" onClick={addToCart}><Plus className="w-4 h-4" /> Ajouter au devis</button>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end"><button className="btn btn-ghost" onClick={() => setShowProductModal(false)}>Fermer</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevisForm;