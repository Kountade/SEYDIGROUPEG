// src/components/sales/VenteForm.jsx - Version corrigée
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AxiosInstance from '../AxiosInstance';
import { Save, X, ArrowLeft, Search, Plus, Minus, Trash2, User, ShoppingCart, CheckCircle, AlertCircle, Loader2, Building2, Store, Lock, Info } from 'lucide-react';

const VenteForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientIdParam = searchParams.get('client_id');

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success', details: null });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [prixUnitaire, setPrixUnitaire] = useState('');
  const [agence, setAgence] = useState(null);
  const [typeVente, setTypeVente] = useState('comptoir');
  const [entrepot, setEntrepot] = useState(null);
  const [stockDisponible, setStockDisponible] = useState(0);
  const [priceFromWarehouse, setPriceFromWarehouse] = useState(null);
  
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const showNotification = (message, type, details = null) => {
    setNotification({ show: true, message, type, details });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success', details: null }), 8000);
  };

  // =====================================================
  // CHARGEMENT DE L'UTILISATEUR CONNECTÉ
  // =====================================================
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
        console.error('❌ Erreur:', error);
        showNotification('Erreur de chargement du profil', 'error');
        setLoadingUser(false);
      }
    };
    
    fetchCurrentUser();
  }, []);

  // =====================================================
  // CHARGEMENT DE L'ENTREPÔT
  // =====================================================
  const fetchEntrepot = async (agenceId) => {
    try {
      console.log('🏢 Chargement entrepôt pour agence:', agenceId);
      const response = await AxiosInstance.get(`/warehouses/?agence=${agenceId}`);
      const warehousesData = response.data || [];
      
      const defaultWarehouse = warehousesData.find(w => w.is_default) || warehousesData[0];
      if (defaultWarehouse) {
        setEntrepot(defaultWarehouse);
        console.log('🏭 Entrepôt sélectionné:', defaultWarehouse.name);
      } else {
        console.warn('⚠️ Aucun entrepôt trouvé');
      }
      setLoadingUser(false);
    } catch (error) {
      console.error('❌ Erreur:', error);
      setLoadingUser(false);
    }
  };

  // =====================================================
  // CHARGEMENT DES PRODUITS
  // =====================================================
  useEffect(() => {
    const fetchProductsForAgence = async () => {
      if (!entrepot || !entrepot.id) return;
      
      setLoading(true);
      try {
        console.log('📦 Chargement des produits pour entrepôt:', entrepot.id);
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
          } catch (err) {
            return {
              ...product,
              warehouse_price: product.sale_price || 0,
              has_price: false
            };
          }
        }));
        
        setProducts(productsWithPrices);
        console.log(`📦 ${productsWithPrices.length} produits chargés`);
      } catch (error) {
        console.error('❌ Erreur:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProductsForAgence();
  }, [entrepot]);

  // =====================================================
  // CHARGEMENT DES CLIENTS
  // =====================================================
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
        console.error('❌ Erreur:', error);
      }
    };
    fetchClients();
  }, [clientIdParam]);

  // =====================================================
  // VÉRIFICATION DU STOCK
  // =====================================================
  const checkStock = async (productId) => {
    if (!entrepot || !entrepot.id) return 0;
    try {
      const response = await AxiosInstance.get(`/warehouse-stocks/by_product/?product_id=${productId}`);
      const stock = response.data?.find(s => s.warehouse === entrepot.id);
      const disponible = stock?.quantity || 0;
      setStockDisponible(disponible);
      return disponible;
    } catch (error) {
      return 0;
    }
  };

  // =====================================================
  // SÉLECTION D'UN PRODUIT
  // =====================================================
  const handleProductChange = async (productId) => {
    const product = products.find(p => p.id === parseInt(productId));
    if (!product) return;
    
    setSelectedProduct(product);
    const prix = product.warehouse_price || product.sale_price || 0;
    setPrixUnitaire(prix);
    setPriceFromWarehouse({ value: prix, isCustom: product.has_price });
    
    const stock = await checkStock(product.id);
    if (quantity > stock) {
      showNotification(`Stock disponible: ${stock} unités`, 'warning');
    }
  };

  const handleQuantityChange = async (newQuantity) => {
    setQuantity(newQuantity);
    if (selectedProduct) {
      const stock = await checkStock(selectedProduct.id);
      if (newQuantity > stock) {
        showNotification(`Stock insuffisant! Disponible: ${stock} unités`, 'error');
      }
    }
  };

  // =====================================================
  // SOUMISSION - STRUCTURE CORRIGÉE
  // =====================================================
  const handleSubmit = async () => {
    if (!selectedProduct) { showNotification('Sélectionnez un produit', 'error'); return; }
    if (quantity < 1) { showNotification('Quantité invalide', 'error'); return; }
    if (!prixUnitaire || prixUnitaire <= 0) { showNotification('Prix unitaire invalide', 'error'); return; }
    if (quantity > stockDisponible) { showNotification(`Stock insuffisant! Disponible: ${stockDisponible}`, 'error'); return; }
    if (!agence) { showNotification('Agence non trouvée', 'error'); return; }

    setSubmitting(true);
    
    // Structure CORRECTE selon le serializer
    const payload = {
      type_vente: typeVente,
      agence: agence.id,
      client_id: selectedClient?.id || null,
      notes: `Vente du ${new Date().toLocaleString()}`,
      items: [{
        product: selectedProduct.id,
        quantity: quantity,
        prix_unitaire: parseFloat(prixUnitaire),
        tva: parseFloat(prixUnitaire) * 0.18,
        remise: 0
      }]
    };
    
    console.log('📤 Payload envoyé:', JSON.stringify(payload, null, 2));
    
    try {
      const response = await AxiosInstance.post('/ventes/', payload);
      console.log('✅ Réponse:', response.data);
      showNotification('Vente créée avec succès!', 'success');
      setTimeout(() => navigate('/ventes'), 1500);
    } catch (error) {
      console.error('❌ Erreur:', error);
      let errorMessage = 'Erreur lors de la création';
      if (error.response?.data?.error) errorMessage = error.response.data.error;
      else if (error.response?.data?.detail) errorMessage = error.response.data.detail;
      else if (error.response?.data?.non_field_errors) errorMessage = error.response.data.non_field_errors.join(', ');
      else if (error.response?.data?.items) {
        errorMessage = 'Erreur dans les articles: ' + JSON.stringify(error.response.data.items);
      }
      showNotification(errorMessage, 'error', error.response?.data);
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price || 0) + ' FCFA';
  const total = (quantity * (parseFloat(prixUnitaire) || 0)) * 1.18;

  if (loadingUser || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <div className="loading loading-spinner loading-lg text-primary w-12 h-12 sm:w-16 sm:h-16"></div>
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {notification.show && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 animate-slideDown max-w-md w-full">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-xl rounded-xl`}>
            <div className="flex items-start gap-2">
              {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <div className="flex-1">
                <p className="font-medium">{notification.message}</p>
                {notification.details && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer">Détails</summary>
                    <pre className="mt-2 p-2 bg-black/10 rounded overflow-auto max-h-40">{JSON.stringify(notification.details, null, 2)}</pre>
                  </details>
                )}
              </div>
              <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setNotification({ show: false, message: '', type: 'success', details: null })}>
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-xl"><ShoppingCart className="w-7 h-7 text-primary" /></div>
              <h1 className="text-2xl sm:text-3xl font-black text-primary">Nouvelle vente</h1>
            </div>
            <p className="text-sm text-gray-600 ml-1">
              {agence ? `Agence: ${agence.nom}` : 'Nouvelle vente'}
              {entrepot && <span className="text-xs text-gray-400 ml-2">(Entrepôt: {entrepot.name})</span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => navigate('/ventes')} className="btn btn-outline btn-sm gap-2"><ArrowLeft className="w-4 h-4" /> Retour</button>
            <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary btn-sm gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Valider
            </button>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <div className="bg-white rounded-xl shadow-md p-6 max-w-2xl mx-auto">
        <div className="form-control mb-4">
          <label className="label"><span className="label-text font-medium">Type de vente</span></label>
          <select className="select select-bordered" value={typeVente} onChange={(e) => setTypeVente(e.target.value)}>
            <option value="comptoir">Comptoir</option><option value="livraison">Livraison</option><option value="en_ligne">En ligne</option>
          </select>
        </div>

        <div className="form-control mb-4">
          <label className="label"><span className="label-text font-medium">Client</span></label>
          <div className="flex gap-2">
            <input type="text" className="input input-bordered flex-1" value={selectedClient ? `${selectedClient.nom} ${selectedClient.prenom || ''}` : 'Client anonyme'} readOnly />
            <button onClick={() => setShowClientModal(true)} className="btn btn-outline gap-1"><User className="w-4 h-4" /> {selectedClient ? 'Changer' : 'Ajouter'}</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="form-control">
            <label className="label"><span className="label-text font-medium"><Building2 className="w-4 h-4 inline mr-1" /> Agence</span></label>
            <div className="bg-gray-100 rounded-lg p-2 px-3 border border-gray-200">
              <p className="font-medium">{agence?.nom || 'Chargement...'}</p>
            </div>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text font-medium"><Store className="w-4 h-4 inline mr-1" /> Entrepôt</span></label>
            <div className="bg-gray-100 rounded-lg p-2 px-3 border border-gray-200">
              <p className="font-medium">{entrepot?.name || 'Chargement...'}</p>
            </div>
          </div>
        </div>

        <div className="form-control mb-4">
          <label className="label"><span className="label-text font-medium">Produit <span className="text-error">*</span></span></label>
          <select className="select select-bordered" value={selectedProduct?.id || ''} onChange={(e) => handleProductChange(e.target.value)} disabled={!entrepot}>
            <option value="">{entrepot ? 'Sélectionner un produit' : 'Chargement...'}</option>
            {products.map(p => (<option key={p.id} value={p.id}>{p.name} - {formatPrice(p.warehouse_price)}{!p.has_price && <span className="text-warning ml-2">(défaut)</span>}</option>))}
          </select>
        </div>

        <div className="form-control mb-4">
          <label className="label"><span className="label-text font-medium">Quantité <span className="text-error">*</span></span></label>
          <input type="number" min="1" max={stockDisponible} className="input input-bordered" value={quantity} onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)} disabled={!selectedProduct} />
          {selectedProduct && <p className="text-xs text-gray-500 mt-1">Stock: {stockDisponible} unités</p>}
        </div>

        <div className="form-control mb-4">
          <label className="label"><span className="label-text font-medium"><Lock className="w-4 h-4 inline mr-1" /> Prix unitaire (non modifiable)</span></label>
          <input type="number" className="input input-bordered bg-gray-100 cursor-not-allowed" value={prixUnitaire} readOnly disabled />
          {priceFromWarehouse && !priceFromWarehouse.isCustom && <p className="text-xs text-warning mt-1">⚠️ Prix par défaut</p>}
          {priceFromWarehouse && priceFromWarehouse.isCustom && <p className="text-xs text-success mt-1">✓ Prix spécifique à l'entrepôt</p>}
        </div>

        {selectedProduct && prixUnitaire > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 mt-4">
            <h3 className="font-semibold mb-3">Résumé</h3>
            <div className="flex justify-between text-sm"><span>Sous-total:</span><span>{formatPrice(quantity * prixUnitaire)}</span></div>
            <div className="flex justify-between text-sm"><span>TVA (18%):</span><span>{formatPrice(quantity * prixUnitaire * 0.18)}</span></div>
            <div className="border-t pt-2 mt-2 flex justify-between font-bold"><span>Total TTC:</span><span className="text-primary text-lg">{formatPrice(total)}</span></div>
          </div>
        )}
      </div>

      {/* Modal client */}
      {showClientModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">Sélectionner un client</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <button onClick={() => { setSelectedClient(null); setShowClientModal(false); }} className="w-full text-left p-3 bg-gray-100 rounded-lg hover:bg-primary/10">
                <div className="font-semibold">Client anonyme</div><div className="text-xs text-gray-500">Vente sans client enregistré</div>
              </button>
              {clients.map(client => (
                <button key={client.id} onClick={() => { setSelectedClient(client); setShowClientModal(false); }} className="w-full text-left p-3 bg-gray-100 rounded-lg hover:bg-primary/10">
                  <div className="font-semibold">{client.nom} {client.prenom || ''}</div><div className="text-xs text-gray-500">{client.telephone}</div>
                </button>
              ))}
            </div>
            <div className="modal-action"><button className="btn btn-ghost" onClick={() => setShowClientModal(false)}>Fermer</button><button className="btn btn-primary" onClick={() => navigate('/clients/nouveau')}><Plus className="w-4 h-4" /> Nouveau client</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenteForm;