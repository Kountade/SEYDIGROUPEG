// src/components/pos/PointDeVente.jsx
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Plus, Minus, Trash2, Search, RefreshCw, Filter, ShoppingCart, X,
  AlertCircle, CheckCircle, ChevronLeft, ChevronRight, ArrowUpDown,
  LayoutGrid, List, Tag, Package, AlertTriangle, DollarSign,
  Warehouse, User, Users, Phone, Mail, Barcode, Receipt, Loader
} from 'lucide-react'

const PointDeVente = () => {
  const navigate = useNavigate()
  const searchInputRef = useRef(null)

  // ============================================================
  // ÉTATS
  // ============================================================
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [products, setProducts] = useState([])
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [showClientModal, setShowClientModal] = useState(false)
  const [notification, setNotification] = useState({
    show: false, message: '', type: 'success', details: null
  })
  const [agence, setAgence] = useState(null)
  const [entrepot, setEntrepot] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [notes, setNotes] = useState('')

  // Lots
  const [lotsByProduct, setLotsByProduct] = useState({})
  const [loadingLots, setLoadingLots] = useState({})

  // Panier
  const [items, setItems] = useState([])
  const [totals, setTotals] = useState({ subtotal: 0, tax_amount: 0, total: 0 })

  // Filtres
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [categories, setCategories] = useState([])
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true) // ✅ NOUVEAU : filtre disponibilité

  // Vue
  const [viewMode, setViewMode] = useState('grid')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')

  // ============================================================
  // HELPERS DE SÉCURITÉ
  // ============================================================
  const getImageUrl = (product) => {
    if (!product) return null
    const img = product.main_image || product.image_url || product.image
    if (!img) return null
    if (typeof img === 'string') return img
    if (typeof img === 'object' && img.url) return img.url
    return null
  }

  const safeNumber = (val, fallback = 0) => {
    if (val === null || val === undefined || val === '') return fallback
    const n = typeof val === 'number' ? val : parseFloat(val)
    return isNaN(n) ? fallback : n
  }

  const safeInt = (val, fallback = 0) => {
    if (val === null || val === undefined || val === '') return fallback
    const n = typeof val === 'number' ? val : parseInt(val, 10)
    return isNaN(n) ? fallback : n
  }

  const formatPrice = (price) => {
    const n = safeNumber(price, 0)
    try {
      return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
    } catch {
      return n.toString() + ' FCFA'
    }
  }

  const showNotification = (message, type = 'success', details = null) => {
    setNotification({ show: true, message, type, details })
    setTimeout(() => setNotification({
      show: false, message: '', type: 'success', details: null
    }), 5000)
  }

  // ============================================================
  // ✅ VÉRIFICATION DISPONIBILITÉ PRODUIT
  // ============================================================
  const isProductAvailable = (product) => {
    if (!product) return false
    const stock = safeNumber(product.stock_quantity, 0)
    const price = safeNumber(product.sale_price, 0)
    // Disponible = stock > 0 ET prix > 0
    return stock > 0 && price > 0
  }

  // ============================================================
  // ✅ BADGE DE STATUT AMÉLIORÉ (rupture / prix manquant / stock faible / dispo)
  // ============================================================
  const getStatusBadge = (product) => {
    const stock = safeNumber(product?.stock_quantity, 0)
    const minLevel = safeNumber(product?.min_stock_level, 0)
    const price = safeNumber(product?.sale_price, 0)
    const hasPrice = product?.has_price !== false && price > 0

    // ❌ Pas de prix → rupture
    if (!hasPrice) {
      return (
        <div className="badge badge-error gap-1 font-semibold">
          <AlertTriangle className="w-3 h-3" />
          Prix manquant
        </div>
      )
    }

    // ❌ Stock 0 → rupture
    if (stock <= 0) {
      return (
        <div className="badge badge-error gap-1 font-semibold">
          <AlertTriangle className="w-3 h-3" />
          Rupture
        </div>
      )
    }

    // ⚠️ Stock faible
    if (minLevel > 0 && stock <= minLevel) {
      return (
        <div className="badge badge-warning gap-1 font-semibold">
          <AlertCircle className="w-3 h-3" />
          Stock faible
        </div>
      )
    }

    // ✅ Disponible
    return (
      <div className="badge badge-success gap-1 font-semibold">
        <CheckCircle className="w-3 h-3" />
        En stock
      </div>
    )
  }

  // ============================================================
  // 1. Chargement de l'utilisateur, agence, entrepôt
  // ============================================================
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await AxiosInstance.get('/users/me/')
        const userData = response.data || {}
        setCurrentUser(userData)

        const agencesDeLUtilisateur = userData.agences || []
        if (agencesDeLUtilisateur.length > 0) {
          const agenceUtilisateur = agencesDeLUtilisateur[0]
          setAgence(agenceUtilisateur)
          await fetchEntrepot(agenceUtilisateur.id)
        } else {
          try {
            const agencesRes = await AxiosInstance.get('/agences/')
            const agencesList = Array.isArray(agencesRes.data) ? agencesRes.data : []
            if (agencesList.length > 0) {
              setAgence(agencesList[0])
              await fetchEntrepot(agencesList[0].id)
            } else {
              setLoadingUser(false)
            }
          } catch (e) {
            console.error('Erreur agences:', e)
            setLoadingUser(false)
          }
        }

        try {
          const catRes = await AxiosInstance.get('/categories/')
          setCategories(Array.isArray(catRes.data) ? catRes.data : [])
        } catch (e) {
          console.warn('Catégories non chargées:', e)
        }
      } catch (error) {
        console.error('Erreur users/me:', error)
        showNotification('Erreur de chargement du profil', 'error')
        setLoadingUser(false)
      }
    }
    fetchCurrentUser()
  }, [])

  const fetchEntrepot = async (agenceId) => {
    try {
      const response = await AxiosInstance.get(`/warehouses/?agence=${agenceId}`)
      const warehouses = Array.isArray(response.data) ? response.data : []
      const defaultWarehouse = warehouses.find(w => w.is_default) || warehouses[0]
      if (defaultWarehouse) {
        setEntrepot(defaultWarehouse)
      } else {
        console.warn('Aucun entrepôt trouvé pour cette agence')
      }
    } catch (error) {
      console.error('Erreur warehouses:', error)
    } finally {
      setLoadingUser(false)
    }
  }

  // ============================================================
  // 2. Chargement des produits
  // ============================================================
  useEffect(() => {
    if (!entrepot?.id) return

    const fetchProductsWithPrices = async () => {
      setLoading(true)
      try {
        const productsRes = await AxiosInstance.get('/products/?is_active=true')
        const allProducts = Array.isArray(productsRes.data) ? productsRes.data : []

        const productsWithPrices = await Promise.all(
          allProducts.map(async (product) => {
            const base = {
              ...product,
              image_url: getImageUrl(product),
              sale_price: safeNumber(product.sale_price || product.price, 0),
              wholesale_price: null,
              has_wholesale: false,
              stock_quantity: safeNumber(product.stock_quantity, 0),
              min_stock_level: safeNumber(product.min_stock_level, 0),
              has_price: true,
            }

            // Prix (non bloquant)
            try {
              const priceRes = await AxiosInstance.get(
                `/ventes/product_prices/?product_id=${product.id}&warehouse_id=${entrepot.id}`
              )
              base.sale_price = safeNumber(priceRes.data?.sale_price, base.sale_price)
              base.wholesale_price = priceRes.data?.wholesale_price != null
                ? safeNumber(priceRes.data.wholesale_price) : null
              base.has_wholesale = !!priceRes.data?.has_wholesale
              // Si pas de prix retourné, marquer has_price = false
              if (!priceRes.data?.sale_price || safeNumber(priceRes.data.sale_price) <= 0) {
                base.has_price = false
              }
            } catch {
              base.has_price = false
            }

            // Stock (non bloquant)
            try {
              const stockRes = await AxiosInstance.get(
                `/warehouse-stocks/by_product/?product_id=${product.id}`
              )
              const stocks = Array.isArray(stockRes.data) ? stockRes.data : []
              const stock = stocks.find(
                s => safeInt(s.warehouse) === safeInt(entrepot.id)
              )
              if (stock) {
                base.stock_quantity = safeNumber(stock.quantity, 0)
                base.min_stock_level = safeNumber(stock.minimum_stock, 0)
              }
            } catch {
              // garder stock du produit
            }

            return base
          })
        )

        setProducts(productsWithPrices)
      } catch (error) {
        console.error('Erreur produits:', error)
        showNotification('Erreur de chargement des produits', 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchProductsWithPrices()
  }, [entrepot])

  // ============================================================
  // 3. Chargement des clients
  // ============================================================
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await AxiosInstance.get('/clients/?is_active=true')
        setClients(Array.isArray(response.data) ? response.data : [])
      } catch (error) {
        console.error('Erreur clients:', error)
      }
    }
    fetchClients()
  }, [])

  // ============================================================
  // 4. Chargement des lots
  // ============================================================
  const fetchLotsForProduct = async (productId) => {
    const pid = safeInt(productId)
    if (!pid || !entrepot?.id) return

    setLoadingLots(prev => ({ ...prev, [pid]: true }))
    try {
      const response = await AxiosInstance.get(`/lots/by-product/${pid}/`)
      const lots = Array.isArray(response.data) ? response.data : []
      const availableLots = lots.filter(lot =>
        safeInt(lot.warehouse) === safeInt(entrepot.id) &&
        lot.quality_status === 'good' &&
        safeNumber(lot.quantity, 0) > 0
      )
      setLotsByProduct(prev => ({ ...prev, [pid]: availableLots }))
    } catch (error) {
      console.warn('Lots non chargés pour produit', pid, error)
      setLotsByProduct(prev => ({ ...prev, [pid]: [] }))
    } finally {
      setLoadingLots(prev => ({ ...prev, [pid]: false }))
    }
  }

  // ============================================================
  // 5. Panier
  // ============================================================
  const isProductAlreadyAdded = (productId) => {
    const pid = safeInt(productId)
    return items.some(item => safeInt(item.product_id) === pid)
  }

  const handleAddItem = (product) => {
    if (!product) {
      showNotification('Produit invalide', 'error')
      return
    }

    // ✅ Vérifier disponibilité (stock > 0 ET prix > 0)
    if (!isProductAvailable(product)) {
      const stock = safeNumber(product.stock_quantity, 0)
      const price = safeNumber(product.sale_price, 0)
      if (stock <= 0) {
        showNotification(`"${product.name}" est en rupture de stock`, 'warning')
      } else if (price <= 0) {
        showNotification(`"${product.name}" n'a pas de prix défini`, 'warning')
      }
      return
    }

    const pid = safeInt(product.id)
    if (!pid) {
      showNotification('ID produit invalide', 'error')
      return
    }

    if (isProductAlreadyAdded(pid)) {
      const existing = items.find(i => safeInt(i.product_id) === pid)
      if (existing) handleQuantityChange(existing.id, existing.quantity + 1)
      return
    }

    const defaultPrice = safeNumber(product.sale_price, 0)

    fetchLotsForProduct(pid)

    setItems(prev => [...prev, {
      id: `${pid}-${Date.now()}`,
      product_id: pid,
      product_name: product.name || 'Sans nom',
      product_reference: product.reference || '',
      quantity: 1,
      price_type: 'retail',
      unit_price: defaultPrice,
      sale_price: safeNumber(product.sale_price, 0),
      wholesale_price: product.wholesale_price != null
        ? safeNumber(product.wholesale_price) : null,
      has_wholesale: !!product.has_wholesale,
      discount: 0,
      total: defaultPrice,
      stock_max: safeNumber(product.stock_quantity, 0),
      image_url: product.image_url,
      lot: null,
    }])
  }

  const handleRemoveItem = (itemId) => {
    setItems(prev => prev.filter(item => item.id !== itemId))
  }

  const handlePriceTypeChange = (itemId, priceType) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      const newPrice = priceType === 'wholesale'
        ? safeNumber(item.wholesale_price, safeNumber(item.sale_price, 0))
        : safeNumber(item.sale_price, 0)
      const qty = safeNumber(item.quantity, 1)
      const discount = safeNumber(item.discount, 0)
      return {
        ...item,
        price_type: priceType,
        unit_price: newPrice,
        total: qty * newPrice * (1 - discount / 100),
      }
    }))
  }

  const handleItemChange = (itemId, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      const updated = { ...item, [field]: value }

      if (field === 'quantity') {
        updated.quantity = Math.max(1, safeInt(value, 1))
      }

      const qty = safeNumber(updated.quantity, 1)
      const price = safeNumber(updated.unit_price, 0)
      const discount = safeNumber(updated.discount, 0)
      updated.total = qty * price * (1 - discount / 100)

      return updated
    }))
  }

  const handleQuantityChange = (itemId, newQuantity) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const maxQty = safeNumber(item.stock_max, 999)
    const safeQty = Math.max(1, Math.min(safeInt(newQuantity, 1), maxQty))

    if (safeQty !== newQuantity) {
      showNotification(
        `Stock maximum pour ${item.product_name} : ${maxQty}`,
        'warning'
      )
    }

    handleItemChange(itemId, 'quantity', safeQty)
  }

  // ============================================================
  // 6. Totaux
  // ============================================================
  useEffect(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + safeNumber(item.total, 0), 0
    )
    setTotals({ subtotal, tax_amount: 0, total: subtotal })
  }, [items])

  // ============================================================
  // 7. Soumission
  // ============================================================
  const handleSubmit = async () => {
    if (items.length === 0) {
      showNotification('Ajoutez au moins un produit à la vente', 'error')
      return
    }
    if (!agence?.id) {
      showNotification('Agence non trouvée', 'error')
      return
    }

    const stockErrors = []
    items.forEach(item => {
      if (safeNumber(item.quantity, 0) > safeNumber(item.stock_max, 0)) {
        stockErrors.push(
          `${item.product_name} : ${item.stock_max} dispo, ${item.quantity} demandé`
        )
      }
    })
    if (stockErrors.length > 0) {
      showNotification(`Stock insuffisant :\n${stockErrors.join('\n')}`, 'error')
      return
    }

    setSubmitting(true)

    const payload = {
      type_vente: 'comptoir',
      agence: safeInt(agence.id),
      client_id: selectedClient?.id ? safeInt(selectedClient.id) : null,
      notes: notes || `Vente POS du ${new Date().toLocaleString()}`,
      items: items.map(item => ({
        product: safeInt(item.product_id),
        quantity: safeInt(item.quantity, 1),
        prix_unitaire: safeNumber(item.unit_price, 0),
        price_type: item.price_type || 'retail',
        remise: safeNumber(item.discount, 0),
        lot: item.lot ? safeInt(item.lot) : null,
      })),
    }

    try {
      await AxiosInstance.post('/ventes/', payload)
      showNotification('Vente créée avec succès !', 'success')
      setItems([])
      setSelectedClient(null)
      setNotes('')
      setTimeout(() => navigate('/ventes'), 1500)
    } catch (error) {
      console.error(error)
      let errorMessage = 'Erreur lors de la création'
      const data = error.response?.data
      if (data?.error) errorMessage = data.error
      else if (data?.detail) errorMessage = data.detail
      else if (Array.isArray(data?.non_field_errors))
        errorMessage = data.non_field_errors.join(', ')
      else if (data?.items) errorMessage = 'Erreur articles : ' + JSON.stringify(data.items)
      showNotification(errorMessage, 'error', data)
      setSubmitting(false)
    }
  }

  // ============================================================
  // 8. Filtrage / tri / pagination
  // ============================================================
  const filteredProducts = React.useMemo(() => {
    let filtered = Array.isArray(products) ? products : []

    // ✅ Filtre disponibilité (stock + prix)
    if (showOnlyAvailable) {
      filtered = filtered.filter(p => isProductAvailable(p))
    }

    // Recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(p =>
        (p.name || '').toLowerCase().includes(term) ||
        (p.reference || '').toLowerCase().includes(term) ||
        (p.barcode || '').toLowerCase().includes(term) ||
        (p.sku || '').toLowerCase().includes(term)
      )
    }

    // Catégorie
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => safeInt(p.category) === safeInt(selectedCategory))
    }

    return filtered
  }, [products, searchTerm, selectedCategory, showOnlyAvailable])

  const sortedProducts = React.useMemo(() => {
    const sorted = [...filteredProducts]
    sorted.sort((a, b) => {
      let aVal = a[sortField] ?? ''
      let bVal = b[sortField] ?? ''
      if (['stock_quantity', 'sale_price', 'wholesale_price'].includes(sortField)) {
        aVal = safeNumber(aVal, 0)
        bVal = safeNumber(bVal, 0)
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = (bVal || '').toLowerCase()
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [filteredProducts, sortField, sortDirection])

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / itemsPerPage))
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Compteur de produits indisponibles (pour info)
  const unavailableCount = React.useMemo(() => {
    return (products || []).filter(p => !isProductAvailable(p)).length
  }, [products])

  // ============================================================
  // 9. Composant Image produit (sans mutation DOM)
  // ============================================================
  const ProductImage = ({ src, alt, className }) => {
    const [errored, setErrored] = useState(false)
    if (!src || errored || src === '/placeholder-product.png') {
      return (
        <div className={`${className} flex items-center justify-center bg-base-300`}>
          <Package className="w-12 h-12 text-base-content/30" />
        </div>
      )
    }
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        loading="lazy"
        onError={() => setErrored(true)}
      />
    )
  }

  // ============================================================
  // 10. Loading
  // ============================================================
  if (loadingUser || loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-6">
          <div className="loading loading-spinner loading-lg text-primary w-16 h-16"></div>
          <p className="text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement du point de vente...
          </p>
        </div>
      </div>
    )
  }

  // ============================================================
  // 11. RENDU
  // ============================================================
  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-20 right-6 z-50 animate-slideDown max-w-md">
          <div className={`alert ${
            notification.type === 'success' ? 'alert-success' :
            notification.type === 'warning' ? 'alert-warning' : 'alert-error'
          } shadow-lg`}>
            {notification.type === 'success'
              ? <CheckCircle className="w-5 h-5" />
              : <AlertCircle className="w-5 h-5" />}
            <span className="whitespace-pre-line">{notification.message}</span>
            <button
              className="btn btn-ghost btn-xs btn-circle"
              onClick={() => setNotification({ ...notification, show: false })}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Point de Vente
          </h1>
          <p className="text-base text-base-content/60">Vente rapide et intuitive</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => window.location.reload()}
            className="btn btn-outline gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
          <button
            onClick={() => navigate('/ventes')}
            className="btn btn-primary gap-2"
          >
            <ShoppingCart className="w-4 h-4" /> Voir les ventes
          </button>
        </div>
      </div>

      {/* Entrepôt + Client */}
      <div className="bg-base-100 rounded-xl shadow-md border border-base-300 p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 flex items-center gap-3">
            <Warehouse className="w-5 h-5 text-primary" />
            <div className="bg-gray-100 rounded-lg p-2 px-3 border border-gray-200 h-12 flex items-center flex-1 max-w-xs">
              <p className="font-medium">{entrepot?.name || 'Entrepôt principal'}</p>
            </div>
          </div>
          <div className="flex-1 flex items-center gap-3">
            <User className="w-5 h-5 text-primary" />
            <button
              className="btn btn-outline flex-1 gap-2"
              onClick={() => setShowClientModal(true)}
            >
              {selectedClient
                ? `${selectedClient.nom || ''} ${selectedClient.prenom || ''}`.trim()
                : 'Client anonyme'}
            </button>
            {selectedClient && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSelectedClient(null)}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-base-100 rounded-xl shadow-md border border-base-300 p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Rechercher par nom, référence, code-barres..."
                className="input input-bordered w-full pl-12"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <select
              className="select select-bordered min-w-[150px]"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="all">Toutes catégories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name || cat.nom || 'Catégorie'}
                </option>
              ))}
            </select>

            <select
              className="select select-bordered min-w-[130px]"
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
            >
              <option value="name">Trier par nom</option>
              <option value="sale_price">Prix détail</option>
              <option value="wholesale_price">Prix gros</option>
              <option value="stock_quantity">Stock</option>
            </select>

            <button
              className="btn btn-ghost"
              onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>

            {/* ✅ FILTRE DISPONIBILITÉ */}
            <label className="label cursor-pointer gap-2 bg-base-200 px-3 py-2 rounded-lg">
              <span className="label-text text-sm">
                Disponibles uniquement
                {unavailableCount > 0 && (
                  <span className="badge badge-warning badge-sm ml-1">
                    {unavailableCount} indispo.
                  </span>
                )}
              </span>
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={showOnlyAvailable}
                onChange={(e) => {
                  setShowOnlyAvailable(e.target.checked)
                  setCurrentPage(1)
                }}
              />
            </label>

            <button
              className="btn btn-outline"
              onClick={() => {
                setSelectedCategory('all')
                setSearchTerm('')
                setShowOnlyAvailable(true)
                setCurrentPage(1)
              }}
            >
              <Filter className="w-4 h-4" /> Réinitialiser
            </button>

            <div className="join">
              <button
                className={`join-item btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                className={`join-item btn ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Produits */}
        <div className="lg:col-span-3 bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden">
          {paginatedProducts.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-20 h-20 mx-auto mb-4 text-base-content/30" />
              <p className="text-xl font-semibold text-base-content/50">
                Aucun produit trouvé
              </p>
              <p className="text-base text-base-content/40 mt-2">
                Essayez de modifier vos critères de recherche
              </p>
              {showOnlyAvailable && unavailableCount > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-warning mb-2">
                    {unavailableCount} produit(s) indisponible(s) masqué(s)
                  </p>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => setShowOnlyAvailable(false)}
                  >
                    Afficher tous les produits
                  </button>
                </div>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {paginatedProducts.map((product) => {
                  const pid = safeInt(product.id)
                  const isInCart = isProductAlreadyAdded(pid)
                  const stock = safeNumber(product.stock_quantity, 0)
                  const price = safeNumber(product.sale_price, 0)
                  const isAvailable = isProductAvailable(product)
                  const hasPrice = product.has_price !== false && price > 0

                  return (
                    <button
                      key={pid}
                      type="button"
                      className={`bg-base-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 border text-left ${
                        !isAvailable
                          ? 'border-error/30 opacity-70 cursor-not-allowed'
                          : isInCart
                            ? 'border-primary hover:-translate-y-1'
                            : 'border-base-300 hover:border-primary/50 hover:-translate-y-1'
                      } group relative`}
                      onClick={() => isAvailable && handleAddItem(product)}
                      disabled={!isAvailable || submitting}
                      title={
                        !hasPrice ? 'Prix manquant'
                          : stock <= 0 ? 'Rupture de stock'
                            : 'Cliquer pour ajouter'
                      }
                    >
                      <div className="relative h-40 bg-base-300 overflow-hidden">
                        <ProductImage
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2">
                          {getStatusBadge(product)}
                        </div>

                        {/* ✅ Overlay rupture (stock ou prix) */}
                        {!isAvailable && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center flex-col gap-1">
                            <span className="text-white font-bold text-sm bg-red-500 px-3 py-1 rounded">
                              {!hasPrice ? 'Prix manquant' : 'Rupture'}
                            </span>
                          </div>
                        )}

                        {isInCart && isAvailable && (
                          <div className="absolute top-2 left-2">
                            <span className="badge badge-primary badge-sm">✓ Ajouté</span>
                          </div>
                        )}

                        <div className="absolute bottom-2 left-2 right-2 flex gap-1 flex-wrap">
                          {hasPrice ? (
                            <span className="badge badge-sm bg-black/70 text-white border-0">
                              {formatPrice(price)}
                            </span>
                          ) : (
                            <span className="badge badge-sm bg-error text-white border-0">
                              Prix manquant
                            </span>
                          )}
                          {product.has_wholesale && product.wholesale_price != null && (
                            <span className="badge badge-sm bg-primary/80 text-white border-0">
                              Gros: {formatPrice(product.wholesale_price)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-3">
                        <h3 className="font-bold text-base-content truncate text-sm">
                          {product.name || 'Sans nom'}
                        </h3>
                        <p className="text-xs text-base-content/50 flex items-center gap-1">
                          <Barcode className="w-3 h-3" />
                          {product.reference || product.sku || '—'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-base-content/50 mt-1">
                          <Tag className="w-3 h-3" />
                          <span>{product.category_name || 'Non catégorisé'}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-base-300">
                          <span className="text-sm font-bold text-primary">
                            {hasPrice ? formatPrice(price) : '—'}
                          </span>
                          <div className="flex items-center gap-1">
                            <Warehouse className="w-3 h-3 text-base-content/40" />
                            <span className={`text-xs font-semibold ${
                              stock <= 0 ? 'text-error' :
                              (product.min_stock_level > 0 && stock <= product.min_stock_level)
                                ? 'text-warning' : 'text-success'
                            }`}>
                              {stock}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Référence</th>
                    <th>Catégorie</th>
                    <th>Prix détail</th>
                    <th>Prix gros</th>
                    <th>Stock</th>
                    <th>Statut</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((product) => {
                    const pid = safeInt(product.id)
                    const stock = safeNumber(product.stock_quantity, 0)
                    const price = safeNumber(product.sale_price, 0)
                    const isAvailable = isProductAvailable(product)
                    const hasPrice = product.has_price !== false && price > 0

                    return (
                      <tr key={pid} className={`hover ${!isAvailable ? 'opacity-60' : ''}`}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden">
                              <ProductImage
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="font-semibold">{product.name || 'Sans nom'}</span>
                          </div>
                        </td>
                        <td className="text-sm font-mono">
                          {product.reference || product.sku || '—'}
                        </td>
                        <td>
                          <span className="badge badge-ghost">
                            {product.category_name || 'Non catégorisé'}
                          </span>
                        </td>
                        <td className="font-semibold text-primary">
                          {hasPrice ? formatPrice(price) : <span className="text-error">—</span>}
                        </td>
                        <td>
                          {product.has_wholesale && product.wholesale_price != null ? (
                            <span className="font-semibold text-secondary">
                              {formatPrice(product.wholesale_price)}
                            </span>
                          ) : (
                            <span className="text-base-content/40">-</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${
                            stock <= 0 ? 'badge-error' :
                            (product.min_stock_level > 0 && stock <= product.min_stock_level)
                              ? 'badge-warning' : 'badge-success'
                          }`}>
                            {stock}
                          </span>
                        </td>
                        <td>{getStatusBadge(product)}</td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="btn btn-primary btn-sm gap-1"
                            onClick={() => handleAddItem(product)}
                            disabled={!isAvailable || submitting}
                          >
                            <Plus className="w-4 h-4" /> Ajouter
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {sortedProducts.length > 0 && (
            <div className="p-4 border-t border-base-300">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-base-content/60">
                  Affichage de {((currentPage - 1) * itemsPerPage) + 1} à{' '}
                  {Math.min(currentPage * itemsPerPage, sortedProducts.length)} sur{' '}
                  {sortedProducts.length} produits
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="select select-bordered select-sm"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(parseInt(e.target.value))
                      setCurrentPage(1)
                    }}
                  >
                    <option value="12">12 par page</option>
                    <option value="24">24 par page</option>
                    <option value="48">48 par page</option>
                    <option value="96">96 par page</option>
                  </select>
                  <div className="join">
                    <button
                      type="button"
                      className="join-item btn btn-sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum
                      if (totalPages <= 5) pageNum = i + 1
                      else if (currentPage <= 3) pageNum = i + 1
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                      else pageNum = currentPage - 2 + i
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          className={`join-item btn btn-sm ${currentPage === pageNum ? 'btn-primary' : ''}`}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      className="join-item btn btn-sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Panier */}
        <div className="lg:col-span-1 bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-base-300 bg-base-200/50">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Panier
                <span className="badge badge-primary badge-sm">{items.length}</span>
              </h2>
              {items.length > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm text-error hover:bg-error/10"
                  onClick={() => setItems([])}
                  disabled={submitting}
                >
                  <Trash2 className="w-4 h-4" /> Vider
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 max-h-[400px]">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 mx-auto text-base-content/30 mb-3" />
                <p className="text-base-content/50">Panier vide</p>
                <p className="text-sm text-base-content/40">
                  Ajoutez des produits en cliquant sur leurs cartes
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => {
                  const availableLots = lotsByProduct[safeInt(item.product_id)] || []
                  const isLoadingLots = loadingLots[safeInt(item.product_id)]
                  return (
                    <div key={item.id} className="bg-base-200 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-base-300 rounded-lg overflow-hidden flex-shrink-0">
                          <ProductImage
                            src={item.image_url}
                            alt={item.product_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.product_name}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <select
                              className="select select-bordered select-xs w-24"
                              value={item.price_type || 'retail'}
                              onChange={(e) => handlePriceTypeChange(item.id, e.target.value)}
                              disabled={submitting}
                            >
                              <option value="retail">Détail</option>
                              <option value="wholesale" disabled={!item.has_wholesale}>
                                {item.has_wholesale ? 'Gros' : 'Gros (ND)'}
                              </option>
                            </select>
                            <span className="text-xs font-semibold text-primary">
                              {formatPrice(item.unit_price)}
                            </span>
                          </div>
                          {item.has_wholesale && item.price_type === 'wholesale' && (
                            <p className="text-xs text-success">
                              ✅ Économie: {formatPrice(
                                (safeNumber(item.sale_price) - safeNumber(item.wholesale_price)) * safeNumber(item.quantity, 1)
                              )}
                            </p>
                          )}
                          <div className="mt-1">
                            <select
                              className="select select-bordered select-xs w-full max-w-[180px]"
                              value={item.lot || ''}
                              onChange={(e) => {
                                const val = e.target.value
                                handleItemChange(item.id, 'lot', val ? safeInt(val) : null)
                              }}
                              disabled={submitting || !item.product_id || isLoadingLots}
                            >
                              <option value="">Automatique (FIFO)</option>
                              {availableLots.map(lot => (
                                <option key={lot.id} value={lot.id}>
                                  {lot.lot_number} ({lot.quantity} u.)
                                  {lot.expiry_date ? ` - Exp: ${new Date(lot.expiry_date).toLocaleDateString()}` : ''}
                                </option>
                              ))}
                            </select>
                            {isLoadingLots && <span className="text-xs text-info ml-1">⏳</span>}
                            {!isLoadingLots && item.product_id && availableLots.length === 0 && (
                              <span className="text-xs text-warning ml-1">⚠️ Aucun lot</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs btn-square"
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1 || submitting}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-semibold text-sm">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs btn-square"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock_max || submitting}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs btn-square text-error"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={submitting}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-1 text-right">
                        <span className="text-sm font-semibold text-primary">
                          Total: {formatPrice(item.total)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-base-300 bg-base-200/50">
            {items.length > 0 ? (
              <>
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-base-content/60">Sous-total</span>
                    <span className="font-semibold">{formatPrice(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-base-300 pt-2">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(totals.total)}</span>
                  </div>
                </div>
                <div className="mb-3">
                  <input
                    type="text"
                    className="input input-bordered w-full input-sm"
                    placeholder="Notes (optionnel)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary w-full gap-2 shadow-md hover:shadow-lg transition-all"
                  onClick={handleSubmit}
                  disabled={items.length === 0 || submitting || !entrepot}
                >
                  {submitting ? (
                    <><Loader className="w-4 h-4 animate-spin" /> Traitement...</>
                  ) : (
                    <><Receipt className="w-4 h-4" /> Valider {formatPrice(totals.total)}</>
                  )}
                </button>
                {!entrepot && (
                  <p className="text-xs text-error text-center mt-2">⚠️ Entrepôt non trouvé</p>
                )}
              </>
            ) : (
              <p className="text-sm text-base-content/40 text-center">
                Ajoutez des produits pour commencer
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal client */}
      {showClientModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Sélectionner un client
              </h3>
              <button
                type="button"
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => setShowClientModal(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <button
                type="button"
                className="w-full text-left p-3 bg-base-200 rounded-lg hover:bg-primary/10 transition"
                onClick={() => { setSelectedClient(null); setShowClientModal(false) }}
              >
                <div className="font-semibold">Client anonyme</div>
                <div className="text-xs text-base-content/50">Vente sans client enregistré</div>
              </button>
              {clients.map(client => (
                <button
                  key={client.id}
                  type="button"
                  className="w-full text-left p-3 bg-base-200 rounded-lg hover:bg-primary/10 transition"
                  onClick={() => { setSelectedClient(client); setShowClientModal(false) }}
                >
                  <div className="font-semibold">
                    {client.nom} {client.prenom || ''}
                  </div>
                  <div className="text-xs text-base-content/50 flex items-center gap-2">
                    <Phone className="w-3 h-3" /> {client.telephone || '—'}
                    <Mail className="w-3 h-3 ml-2" /> {client.email || '—'}
                  </div>
                </button>
              ))}
            </div>
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowClientModal(false)}
              >
                Fermer
              </button>
              <button
                type="button"
                className="btn btn-primary gap-2"
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

export default PointDeVente