// src/components/sales/VenteForm.jsx
import React, {
  useEffect, useState, useCallback, useRef, useMemo
} from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Save, X, ArrowLeft, Plus, Minus, Trash2, User, ShoppingCart,
  CheckCircle, AlertCircle, Loader2, Package, FileText, Warehouse,
  Tag, Layers
} from 'lucide-react'

const VenteForm = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clientIdParam = searchParams.get('client_id')

  // ---------- États ----------
  const [loadingUser, setLoadingUser] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [agence, setAgence] = useState(null)
  const [entrepot, setEntrepot] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  const [products, setProducts] = useState([])
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [showClientModal, setShowClientModal] = useState(false)

  const [typeVente, setTypeVente] = useState('comptoir')
  const [notes, setNotes] = useState('')

  // Lots par produit
  const [lotsByProduct, setLotsByProduct] = useState({})
  const [loadingLots, setLoadingLots] = useState({})

  // Items
  const [items, setItems] = useState([])
  const [totals, setTotals] = useState({ subtotal: 0, total: 0 })

  const [notification, setNotification] = useState({
    show: false, message: '', type: 'success', details: null
  })

  // Refs cache
  const cacheRef = useRef(new Map())
  const fetchingProductsRef = useRef(false)
  const fetchingUserRef = useRef(false)
  const fetchingClientsRef = useRef(false)
  const fetchingLotsRef = useRef({})

  const unwrap = (data) => Array.isArray(data) ? data : (data?.results || [])

  const showNotification = (message, type = 'success', details = null) => {
    setNotification({ show: true, message, type, details })
    setTimeout(() => setNotification({
      show: false, message: '', type: 'success', details: null
    }), 8000)
  }

  // ============================================================
  // 1. Charge user + agence + entrepôt
  // ============================================================
  const loadUserAndAgence = useCallback(async () => {
    if (fetchingUserRef.current) return
    fetchingUserRef.current = true
    try {
      // Cache user
      let userData
      if (cacheRef.current.has('user_me')) {
        userData = cacheRef.current.get('user_me')
      } else {
        const res = await AxiosInstance.get('/users/me/')
        userData = res.data
        cacheRef.current.set('user_me', userData)
      }
      setCurrentUser(userData)

      // Déterminer l'agence
      const agencesUser = unwrap(userData.agences || [])
      let agenceUtilisateur = agencesUser[0]

      if (!agenceUtilisateur) {
        let agencesList
        if (cacheRef.current.has('agences_list')) {
          agencesList = cacheRef.current.get('agences_list')
        } else {
          const agencesRes = await AxiosInstance.get('/agences/?page_size=200')
          agencesList = unwrap(agencesRes.data)
          cacheRef.current.set('agences_list', agencesList)
        }
        if (agencesList.length > 0) agenceUtilisateur = agencesList[0]
      }

      if (agenceUtilisateur) {
        setAgence(agenceUtilisateur)
        await loadEntrepot(agenceUtilisateur.id)
      }
    } catch (error) {
      console.error(error)
      showNotification('Erreur de chargement du profil', 'error')
    } finally {
      setLoadingUser(false)
    }
  }, [])

  const loadEntrepot = async (agenceId) => {
    try {
      let warehouses
      if (cacheRef.current.has(`warehouses_${agenceId}`)) {
        warehouses = cacheRef.current.get(`warehouses_${agenceId}`)
      } else {
        const res = await AxiosInstance.get(
          `/warehouses/?agence=${agenceId}&page_size=200`
        )
        warehouses = unwrap(res.data)
        cacheRef.current.set(`warehouses_${agenceId}`, warehouses)
      }
      const def = warehouses.find(w => w.is_default) || warehouses[0]
      if (def) setEntrepot(def)
    } catch (error) {
      console.error('Erreur entrepôts:', error)
    }
  }

  useEffect(() => {
    loadUserAndAgence()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ============================================================
  // 2. Produits : 1 requête produits + 1 requête pricing (au lieu de N)
  // ============================================================
  const loadProducts = useCallback(async () => {
    if (!entrepot?.id || fetchingProductsRef.current) return
    fetchingProductsRef.current = true
    setLoadingProducts(true)

    try {
      const cacheKey = `products_${entrepot.id}`

      // Cache → skip
      if (cacheRef.current.has(cacheKey)) {
        setProducts(cacheRef.current.get(cacheKey))
        setLoadingProducts(false)
        setLoadingInitial(false)
        fetchingProductsRef.current = false
        return
      }

      // 1) Produits actifs
      const productsRes = await AxiosInstance.get('/products/?is_active=true&page_size=500')
      const allProducts = unwrap(productsRes.data)

      // 2) Tous les prix de CET entrepôt en 1 requête
      let pricingMap = {}
      try {
        const pricingRes = await AxiosInstance.get(
          `/product-prices/?warehouse_id=${entrepot.id}&is_current=true&page_size=500`
        )
        const pricings = unwrap(pricingRes.data)
        pricingMap = pricings.reduce((acc, p) => {
          acc[p.product] = p
          return acc
        }, {})
      } catch (err) {
        console.warn('Pricing non chargé:', err)
      }

      // 3) Stocks de CET entrepôt en 1 requête
      let stockMap = {}
      try {
        const stocksRes = await AxiosInstance.get(
          `/warehouse-stocks/by_warehouse/?warehouse_id=${entrepot.id}&page_size=500`
        )
        const stocks = unwrap(stocksRes.data)
        stockMap = stocks.reduce((acc, s) => {
          const key = `${s.product}_${s.variant || 'null'}`
          acc[key] = s.quantity || 0
          return acc
        }, {})
      } catch (err) {
        console.warn('Stocks non chargés:', err)
      }

      const enriched = allProducts.map(product => {
        const price = pricingMap[product.id]
        const stock = stockMap[`${product.id}_null`] || 0
        return {
          ...product,
          sale_price: price?.sale_price ?? product.sale_price ?? 0,
          wholesale_price: price?.wholesale_price ?? null,
          has_wholesale: !!price?.wholesale_price && price.wholesale_price > 0,
          stock_quantity: stock,
          has_price: !!price,
        }
      })

      cacheRef.current.set(cacheKey, enriched)
      setProducts(enriched)
    } catch (error) {
      console.error(error)
      showNotification('Erreur de chargement des produits', 'error')
    } finally {
      setLoadingProducts(false)
      setLoadingInitial(false)
      fetchingProductsRef.current = false
    }
  }, [entrepot])

  useEffect(() => {
    if (entrepot?.id) loadProducts()
  }, [entrepot, loadProducts])

  // ============================================================
  // 3. Clients
  // ============================================================
  useEffect(() => {
    if (fetchingClientsRef.current) return
    fetchingClientsRef.current = true
    const fetchClients = async () => {
      try {
        let data
        if (cacheRef.current.has('clients_list')) {
          data = cacheRef.current.get('clients_list')
        } else {
          const res = await AxiosInstance.get('/clients/?is_active=true&page_size=200')
          data = unwrap(res.data)
          cacheRef.current.set('clients_list', data)
        }
        setClients(data)
        if (clientIdParam) {
          const found = data.find(c => c.id === parseInt(clientIdParam))
          if (found) setSelectedClient(found)
        }
      } catch (err) {
        console.error(err)
      } finally {
        fetchingClientsRef.current = false
      }
    }
    fetchClients()
  }, [clientIdParam])

  // ============================================================
  // 4. Lots par produit (chargé à la demande)
  // ============================================================
  const fetchLotsForProduct = useCallback(async (productId) => {
    if (!productId || !entrepot?.id) return
    if (lotsByProduct[productId] !== undefined) return
    if (fetchingLotsRef.current[productId]) return

    fetchingLotsRef.current[productId] = true
    setLoadingLots(prev => ({ ...prev, [productId]: true }))

    try {
      const res = await AxiosInstance.get(
        `/lots/by-product/${productId}/?page_size=100`
      )
      const data = unwrap(res.data)
      const available = data.filter(lot =>
        lot.warehouse === entrepot.id
        && lot.quality_status === 'good'
        && lot.quantity > 0
      )
      setLotsByProduct(prev => ({ ...prev, [productId]: available }))
    } catch (error) {
      console.error('Erreur lots:', error)
      setLotsByProduct(prev => ({ ...prev, [productId]: [] }))
    } finally {
      setLoadingLots(prev => ({ ...prev, [productId]: false }))
      fetchingLotsRef.current[productId] = false
    }
  }, [entrepot, lotsByProduct])

  // ============================================================
  // 5. Gestion des items
  // ============================================================
  const isProductAlreadyAdded = (productId) =>
    items.some(i => i.product_id === productId)

  const handleAddItem = () => {
    const available = products.filter(p => !isProductAlreadyAdded(p.id))
    if (available.length === 0) {
      showNotification('Tous les produits sont déjà dans la liste', 'warning')
      return
    }
    const first = available[0]
    const defaultPrice = first.sale_price || 0

    setItems(prev => [...prev, {
      id: Date.now(),
      product_id: first.id,
      product_name: first.name,
      product_reference: first.reference || '',
      quantity: 1,
      price_type: 'retail',
      unit_price: defaultPrice,
      sale_price: first.sale_price || 0,
      wholesale_price: first.wholesale_price || null,
      has_wholesale: first.has_wholesale || false,
      discount: 0,
      total: defaultPrice,
      stock_max: first.stock_quantity || 0,
      lot: null,
    }])

    fetchLotsForProduct(first.id)
  }

  const handleRemoveItem = (itemId) => {
    setItems(items.filter(i => i.id !== itemId))
  }

  const handlePriceTypeChange = (itemId, priceType) => {
    setItems(items.map(item => {
      if (item.id !== itemId) return item
      const newPrice = priceType === 'wholesale'
        ? (item.wholesale_price || item.sale_price)
        : item.sale_price
      const qty = Number(item.quantity) || 0
      const disc = Number(item.discount) || 0
      return {
        ...item,
        price_type: priceType,
        unit_price: newPrice,
        total: qty * newPrice * (1 - disc / 100),
      }
    }))
  }

  const handleItemChange = (itemId, field, value) => {
    const updated = items.map(item => {
      if (item.id !== itemId) return item
      const next = { ...item, [field]: value }

      if (field === 'product_id') {
        const product = products.find(p => p.id === parseInt(value))
        if (!product) return item

        const isDup = items.some(o =>
          o.id !== itemId && o.product_id === parseInt(value)
        )
        if (isDup) {
          showNotification(`"${product.name}" est déjà dans la liste`, 'warning')
          return item
        }

        next.product_name = product.name
        next.product_reference = product.reference || ''
        next.sale_price = product.sale_price || 0
        next.wholesale_price = product.wholesale_price || null
        next.has_wholesale = product.has_wholesale || false
        next.stock_max = product.stock_quantity || 0
        next.lot = null

        if (next.price_type === 'wholesale' && next.wholesale_price) {
          next.unit_price = next.wholesale_price
        } else {
          next.unit_price = next.sale_price
          next.price_type = 'retail'
        }

        fetchLotsForProduct(parseInt(value))
      }

      if (
        ['quantity', 'unit_price', 'discount', 'product_id', 'price_type', 'lot']
          .includes(field)
      ) {
        const qty = Number(next.quantity) || 0
        const price = Number(next.unit_price) || 0
        const disc = Number(next.discount) || 0
        next.total = qty * price * (1 - disc / 100)
      }

      return next
    })
    setItems(updated)
  }

  const handleQuantityChange = (itemId, newQty) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const max = item.stock_max || 999
    const safe = Math.max(1, Math.min(newQty, max))
    if (safe !== newQty) {
      showNotification(`Stock max pour ${item.product_name} : ${max}`, 'warning')
    }
    handleItemChange(itemId, 'quantity', safe)
  }

  // ============================================================
  // 6. Totaux
  // ============================================================
  useEffect(() => {
    const subtotal = items.reduce((s, i) => s + (Number(i.total) || 0), 0)
    setTotals({ subtotal, total: subtotal })
  }, [items])

  // ============================================================
  // 7. Soumission
  // ============================================================
  const handleSubmit = async () => {
    const emptyItems = items.filter(i => !i.product_id)
    if (emptyItems.length > 0) {
      showNotification('Veuillez sélectionner un produit pour chaque ligne', 'error')
      return
    }
    if (items.length === 0) {
      showNotification('Ajoutez au moins un produit', 'error')
      return
    }
    if (!agence) {
      showNotification('Agence non trouvée', 'error')
      return
    }

    const ids = items.map(i => i.product_id)
    if (new Set(ids).size !== ids.length) {
      showNotification('Produits dupliqués. Corrigez la liste.', 'error')
      return
    }

    const stockErrors = []
    items.forEach(i => {
      if (i.quantity > i.stock_max) {
        stockErrors.push(
          `${i.product_name} : ${i.stock_max} dispo, ${i.quantity} demandé`
        )
      }
    })
    if (stockErrors.length > 0) {
      showNotification(`Stock insuffisant :\n${stockErrors.join('\n')}`, 'error')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        type_vente: typeVente,
        agence: agence.id,
        client_id: selectedClient?.id || null,
        notes: notes || `Vente du ${new Date().toLocaleString()}`,
        items: items.map(i => ({
          product: parseInt(i.product_id),
          quantity: i.quantity,
          prix_unitaire: i.unit_price,
          price_type: i.price_type || 'retail',
          remise: i.discount || 0,
          lot: i.lot || null,
        })),
      }

      await AxiosInstance.post('/ventes/', payload)
      cacheRef.current.clear()
      showNotification('Vente créée avec succès !', 'success')
      setTimeout(() => navigate('/ventes'), 1500)
    } catch (error) {
      console.error(error)
      let msg = 'Erreur lors de la création'
      const d = error.response?.data
      if (typeof d === 'string') msg = d
      else if (d?.error) msg = d.error
      else if (d?.detail) msg = d.detail
      else if (d?.non_field_errors) msg = d.non_field_errors.join(', ')
      else if (d?.items) msg = 'Erreur articles : ' + JSON.stringify(d.items)
      showNotification(msg, 'error', d)
    } finally {
      setSubmitting(false)
    }
  }

  const formatPrice = (p) => {
    const n = Number(p)
    if (!Number.isFinite(n)) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
  }

  const formatLotLabel = (lot) => {
    let s = `${lot.lot_number}`
    if (lot.quantity !== undefined) s += ` (${lot.quantity} u.)`
    if (lot.expiry_date) {
      s += ` - Exp: ${new Date(lot.expiry_date).toLocaleDateString()}`
    }
    return s
  }

  // ============================================================
  // 8. Rendu : premier chargement
  // ============================================================
  if (loadingUser || (loadingInitial && loadingProducts)) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="text-base font-medium text-base-content/70 animate-pulse">
            Chargement de l'environnement de vente...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-0 lg:px-0 py-4 lg:py-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Spinner overlay discret */}
      {loadingProducts && !loadingInitial && (
        <div className="fixed top-20 right-6 z-40">
          <div className="bg-base-100 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border border-base-300">
            <span className="loading loading-spinner loading-xs text-primary"></span>
            <span className="text-xs text-base-content/60">Chargement...</span>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification.show && (
        <div className="fixed top-16 lg:top-20 right-3 lg:right-6 z-50 animate-slideDown w-[calc(100%-1.5rem)] lg:w-auto max-w-md">
          <div className={`alert ${
            notification.type === 'success' ? 'alert-success'
            : notification.type === 'warning' ? 'alert-warning'
            : 'alert-error'
          } shadow-lg`}>
            {notification.type === 'success'
              ? <CheckCircle className="w-4 h-4" />
              : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm lg:text-base font-medium whitespace-pre-line">
              {notification.message}
            </span>
            {notification.details && (
              <details className="text-xs">
                <summary className="cursor-pointer">Détails</summary>
                <pre className="mt-1 p-1 bg-black/5 rounded overflow-auto max-h-40">
                  {JSON.stringify(notification.details, null, 2)}
                </pre>
              </details>
            )}
            <button
              className="btn btn-ghost btn-xs btn-circle"
              onClick={() => setNotification({ show: false, message: '', type: 'success', details: null })}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent py-5 px-4 lg:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
              {entrepot && (
                <span className="text-xs text-gray-400 ml-2">
                  (Entrepôt : {entrepot.name})
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/ventes')}
              className="btn btn-outline btn-sm lg:btn-md gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn btn-primary btn-sm lg:btn-md gap-2"
            >
              {submitting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Save className="w-4 h-4" />}
              Valider la vente
            </button>
          </div>
        </div>
      </div>

      {/* Carte */}
      <div className="max-w-full mx-0 px-4 lg:px-6">
        <div className="bg-white rounded-xl shadow-xl border border-base-200 overflow-hidden">
          <div className="p-4 lg:p-6">
            {/* Infos générales */}
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
                    <User className="w-4 h-4 text-primary" /> Client
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input input-bordered flex-1"
                    value={selectedClient
                      ? `${selectedClient.nom} ${selectedClient.prenom || ''}`
                      : 'Client anonyme'}
                    readOnly
                  />
                  <button
                    type="button"
                    className="btn btn-outline gap-1"
                    onClick={() => setShowClientModal(true)}
                  >
                    <User className="w-4 h-4" />
                    {selectedClient ? 'Changer' : 'Ajouter'}
                  </button>
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <Warehouse className="w-4 h-4 text-primary" /> Entrepôt
                  </span>
                </label>
                <div className="bg-gray-100 rounded-lg p-2 px-3 border border-gray-200 h-12 flex items-center">
                  <p className="font-medium">
                    {entrepot?.name || 'Entrepôt principal'}
                  </p>
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
                    {products.filter(p => !isProductAlreadyAdded(p.id)).length} produits disponibles
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm gap-2"
                    onClick={handleAddItem}
                    disabled={submitting || products.filter(p => !isProductAlreadyAdded(p.id)).length === 0}
                  >
                    <Plus className="w-4 h-4" /> Ajouter une ligne
                  </button>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-500">Aucun article ajouté</p>
                  <p className="text-sm text-gray-400">
                    Cliquez sur "Ajouter une ligne" pour commencer
                  </p>
                </div>
              ) : (
                <>
                  {items.map((item, index) => {
                    const availableLots = lotsByProduct[item.product_id] || []
                    const isLoadingL = loadingLots[item.product_id]

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

                        <div className="grid grid-cols-1 md:grid-cols-8 gap-3">
                          {/* Produit */}
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
                              {products.map(p => {
                                const isSel = items.some(o => o.id !== item.id && o.product_id === p.id)
                                return (
                                  <option key={p.id} value={p.id} disabled={isSel}>
                                    {p.name} - {p.reference} (Stock: {p.stock_quantity})
                                    {isSel && ' ⚠️ déjà ajouté'}
                                  </option>
                                )
                              })}
                            </select>
                            {item.product_id && item.stock_max > 0 && (
                              <span className="text-xs text-success mt-1">
                                Stock disponible: {item.stock_max}
                              </span>
                            )}
                            {item.product_id && item.stock_max === 0 && (
                              <span className="text-xs text-error mt-1">Stock épuisé</span>
                            )}
                          </div>

                          {/* Type prix */}
                          <div className="form-control w-full md:col-span-1">
                            <label className="label">
                              <span className="label-text text-sm font-semibold flex items-center gap-1">
                                <Tag className="w-3 h-3" /> Prix
                              </span>
                            </label>
                            <select
                              className="select select-bordered w-full text-sm"
                              value={item.price_type || 'retail'}
                              onChange={(e) => handlePriceTypeChange(item.id, e.target.value)}
                              disabled={submitting || !item.product_id}
                            >
                              <option value="retail">Détail</option>
                              <option value="wholesale" disabled={!item.has_wholesale}>
                                {item.has_wholesale ? 'Gros' : 'Gros (ND)'}
                              </option>
                            </select>
                          </div>

                          {/* Quantité */}
                          <div className="form-control w-full md:col-span-1">
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
                          <div className="form-control w-full md:col-span-1">
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
                          <div className="form-control w-full md:col-span-1">
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
                          <div className="form-control w-full md:col-span-1">
                            <label className="label">
                              <span className="label-text text-sm font-semibold text-primary">Total</span>
                            </label>
                            <div className="h-10 flex items-center justify-end px-3 bg-primary/5 rounded-lg border border-primary/20">
                              <span className="font-bold text-primary">{formatPrice(item.total)}</span>
                            </div>
                          </div>

                          {/* Lot */}
                          <div className="form-control w-full md:col-span-1">
                            <label className="label">
                              <span className="label-text text-sm font-semibold flex items-center gap-1">
                                <Layers className="w-3 h-3" /> Lot
                              </span>
                            </label>
                            <select
                              className="select select-bordered w-full text-sm"
                              value={item.lot || ''}
                              onChange={(e) => {
                                const val = e.target.value
                                handleItemChange(item.id, 'lot', val ? parseInt(val) : null)
                              }}
                              disabled={submitting || !item.product_id || isLoadingL}
                            >
                              <option value="">Automatique (FIFO)</option>
                              {availableLots.map(lot => (
                                <option key={lot.id} value={lot.id}>
                                  {formatLotLabel(lot)}
                                </option>
                              ))}
                            </select>
                            {isLoadingL && (
                              <span className="text-xs text-info mt-1 flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> Chargement...
                              </span>
                            )}
                            {!isLoadingL && item.product_id && availableLots.length === 0 && (
                              <span className="text-xs text-warning mt-1">⚠️ Aucun lot disponible</span>
                            )}
                            {item.lot && (
                              <span className="text-xs text-success mt-1">✅ Lot sélectionné</span>
                            )}
                            {!item.lot && item.product_id && availableLots.length > 0 && (
                              <span className="text-xs text-info mt-1">⚡ FIFO automatique</span>
                            )}
                          </div>
                        </div>

                        {item.product_id && (
                          <div className="mt-2 text-xs text-gray-400 flex gap-4 flex-wrap">
                            <span>💰 Prix détail: <span className="font-medium">{formatPrice(item.sale_price)}</span></span>
                            {item.has_wholesale && (
                              <span>🏷️ Prix gros: <span className="font-medium text-primary">{formatPrice(item.wholesale_price)}</span></span>
                            )}
                            {item.has_wholesale && item.wholesale_price > 0 && (
                              <span className="text-success">
                                Économie: {formatPrice((item.sale_price - item.wholesale_price) * item.quantity)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  <div className="text-right pt-4 border-t border-gray-200">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Sous-total</span>
                        <span className="font-semibold">{formatPrice(totals.subtotal)}</span>
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

            {/* Notes */}
            <div className="form-control mt-6">
              <label className="label">
                <span className="label-text font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Notes (optionnel)
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
            <button
              className="btn btn-ghost gap-2"
              onClick={() => navigate('/ventes')}
            >
              Annuler
            </button>
            <button
              className="btn btn-primary gap-2"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Save className="w-4 h-4" />}
              Valider la vente
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
              <button
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => setShowClientModal(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <button
                className="w-full text-left p-3 bg-gray-100 rounded-lg hover:bg-primary/10 transition"
                onClick={() => { setSelectedClient(null); setShowClientModal(false) }}
              >
                <div className="font-semibold">Client anonyme</div>
                <div className="text-xs text-gray-500">Vente sans client enregistré</div>
              </button>
              {clients.map(client => (
                <button
                  key={client.id}
                  className="w-full text-left p-3 bg-gray-100 rounded-lg hover:bg-primary/10 transition"
                  onClick={() => { setSelectedClient(client); setShowClientModal(false) }}
                >
                  <div className="font-semibold">
                    {client.nom} {client.prenom || ''}
                  </div>
                  <div className="text-xs text-gray-500">{client.telephone}</div>
                </button>
              ))}
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowClientModal(false)}>
                Fermer
              </button>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/clients/nouveau')}
              >
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
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
      `}</style>
    </div>
  )
}

export default VenteForm