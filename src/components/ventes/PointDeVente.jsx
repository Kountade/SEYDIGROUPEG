// src/components/pos/PointDeVente.jsx
import React, {
  useState, useEffect, useRef, useMemo, useCallback,
} from 'react'
import { useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Plus, Minus, Trash2, Search, RefreshCw, Filter, ShoppingCart, X,
  AlertCircle, CheckCircle, ChevronLeft, ChevronRight, ArrowUpDown,
  LayoutGrid, List, Tag, Package, AlertTriangle, Warehouse, User,
  Users, Phone, Mail, Barcode, Receipt, Loader, Building2, MapPin,
  Star, ArrowDown,
} from 'lucide-react'

// ============================================================
// CONSTANTES
// ============================================================
const DEBOUNCE_MS = 300
const CACHE_TTL_MS = 3 * 60 * 1000
const PAGE_SIZE = 50
const SCROLL_THRESHOLD = 200  // px avant le bas pour déclencher load more

const unwrap = (payload) =>
  Array.isArray(payload) ? payload : (payload?.results || [])

const safeNumber = (val, fallback = 0) => {
  if (val === null || val === undefined || val === '') return fallback
  const n = typeof val === 'number' ? val : parseFloat(val)
  return Number.isFinite(n) ? n : fallback
}

const safeInt = (val, fallback = 0) => {
  if (val === null || val === undefined || val === '') return fallback
  const n = typeof val === 'number' ? val : parseInt(val, 10)
  return Number.isFinite(n) ? n : fallback
}

// ============================================================
// COMPOSANT
// ============================================================
const PointDeVente = () => {
  const navigate = useNavigate()
  const searchInputRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const notifTimerRef = useRef(null)
  const abortRef = useRef(null)
  const cacheRef = useRef(new Map())

  // ---------- États ----------
  const [loadingUser, setLoadingUser] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [initialProductsLoad, setInitialProductsLoad] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // ---------- Données ----------
  const [products, setProducts] = useState([])
  const [totalProducts, setTotalProducts] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(true)

  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [showClientModal, setShowClientModal] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [debouncedClientSearch, setDebouncedClientSearch] = useState('')

  const [notification, setNotification] = useState({
    show: false, message: '', type: 'success', details: null,
  })

  // ---------- Contexte ----------
  const [agence, setAgence] = useState(null)
  const [entrepot, setEntrepot] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [agences, setAgences] = useState([])
  const [selectedAgenceFilter, setSelectedAgenceFilter] = useState(null)
  const [warehouses, setWarehouses] = useState([])
  const [loadingWarehouses, setLoadingWarehouses] = useState(false)
  const [categories, setCategories] = useState([])
  const [notes, setNotes] = useState('')

  // ---------- Filtres ----------
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true)
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [viewMode, setViewMode] = useState('grid')

  // ---------- Lots par produit (cache) ----------
  const [lotsByProduct, setLotsByProduct] = useState({})
  const [loadingLots, setLoadingLots] = useState({})

  // ---------- Panier ----------
  const [items, setItems] = useState(() => {
    // ✅ Récupérer panier depuis localStorage (persistance)
    try {
      const saved = localStorage.getItem('pos_cart')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [totals, setTotals] = useState({ subtotal: 0, tax_amount: 0, total: 0 })

  // ============================================================
  // CACHE avec TTL
  // ============================================================
  const cacheGet = useCallback((key) => {
    const entry = cacheRef.current.get(key)
    if (!entry) return null
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      cacheRef.current.delete(key)
      return null
    }
    return entry.value
  }, [])

  const cacheSet = useCallback((key, value) => {
    cacheRef.current.set(key, {
      value,
      expiresAt: Date.now() + CACHE_TTL_MS,
    })
  }, [])

  // ============================================================
  // NOTIFICATION
  // ============================================================
  const showNotification = useCallback((message, type = 'success', details = null) => {
    setNotification({ show: true, message, type, details })
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current)
    notifTimerRef.current = setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success', details: null })
    }, 5000)
  }, [])

  useEffect(() => {
    return () => {
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  // ============================================================
  // PANIER : persistance localStorage
  // ============================================================
  useEffect(() => {
    try {
      localStorage.setItem('pos_cart', JSON.stringify(items))
    } catch { /* ignore */ }
  }, [items])

  // ============================================================
  // DEBOUNCE RECHERCHE PRODUITS + CLIENTS
  // ============================================================
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchTerm])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedClientSearch(clientSearch), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [clientSearch])

  // ============================================================
  // HELPERS IMAGE / PRIX
  // ============================================================
  const getImageUrl = (product) => {
    if (!product) return null
    const img = product.main_image || product.image_url || product.image
    if (!img) return null
    if (typeof img === 'string') return img
    if (typeof img === 'object' && img.url) return img.url
    return null
  }

  const formatPrice = (price) => {
    const n = safeNumber(price, 0)
    try {
      return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
    } catch {
      return n.toString() + ' FCFA'
    }
  }

  const isProductAvailable = (product) => {
    if (!product) return false
    const stock = safeNumber(product.stock_quantity, 0)
    const price = safeNumber(product.sale_price, 0)
    return stock > 0 && price > 0
  }

  // ============================================================
  // 1. CHARGER USER + AGENCE + ENTREPÔT + CATÉGORIES
  // ============================================================
  const fetchWarehouses = useCallback(async (agenceId) => {
    setLoadingWarehouses(true)
    try {
      const cacheKey = `warehouses_${agenceId}`
      let list = cacheGet(cacheKey)
      if (!list) {
        const res = await AxiosInstance.get(
          `/warehouses/?agence=${agenceId}&is_active=true&page_size=100`
        )
        list = unwrap(res.data)
        cacheSet(cacheKey, list)
      }
      setWarehouses(list)
      return list
    } catch (err) {
      console.error('Erreur entrepôts:', err)
      setWarehouses([])
      return []
    } finally {
      setLoadingWarehouses(false)
    }
  }, [cacheGet, cacheSet])

  const loadUserAndAgence = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoadingUser(true)
    setError(null)

    try {
      // 1) User
      let userData = cacheGet('user_me')
      if (!userData) {
        const res = await AxiosInstance.get('/users/me/', {
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        userData = res.data || {}
        cacheSet('user_me', userData)
      }
      setCurrentUser(userData)

      // 2) Agences
      const agencesUser = unwrap(userData.agences || [])
      let agenceUtilisateur = agencesUser[0]
      let allAgences = agencesUser

      if (allAgences.length === 0) {
        let agencesList = cacheGet('agences_list')
        if (!agencesList) {
          const res = await AxiosInstance.get(
            '/agences/?page_size=200',
            { signal: controller.signal }
          )
          if (controller.signal.aborted) return
          agencesList = unwrap(res.data)
          cacheSet('agences_list', agencesList)
        }
        allAgences = agencesList
        if (allAgences.length > 0) agenceUtilisateur = allAgences[0]
      }
      setAgences(allAgences)

      // 3) Entrepôt
      if (agenceUtilisateur) {
        setAgence(agenceUtilisateur)
        setSelectedAgenceFilter(agenceUtilisateur.id)
        const list = await fetchWarehouses(agenceUtilisateur.id)
        if (list.length > 0) {
          const def = list.find(w => w.is_default) || list[0]
          setEntrepot(def)
        }
      }

      // 4) Catégories
      let cats = cacheGet('categories')
      if (!cats) {
        try {
          const catRes = await AxiosInstance.get('/categories/?page_size=200')
          cats = unwrap(catRes.data)
          cacheSet('categories', cats)
        } catch (err) {
          console.warn('Catégories non chargées:', err)
          cats = []
        }
      }
      setCategories(cats)
    } catch (err) {
      if (err.name === 'CanceledError') return
      if (err.response?.status === 401) {
        setError('Session expirée')
        setTimeout(() => navigate('/login'), 2000)
      } else {
        setError('Erreur de chargement du profil')
      }
      showNotification('Erreur de chargement du profil', 'error')
    } finally {
      setLoadingUser(false)
    }
  }, [cacheGet, cacheSet, fetchWarehouses, navigate, showNotification])

  useEffect(() => {
    loadUserAndAgence()
  }, [loadUserAndAgence])

  // ============================================================
  // 2. ✅ CHARGER PRODUITS — search-first + pagination serveur
  // ============================================================
  // Paramètres de la requête produits (memoïsé)
  const productParams = useMemo(() => {
    const params = {
      is_active: true,
      page_size: PAGE_SIZE,
      ordering: `${sortDirection === 'desc' ? '-' : ''}${sortField}`,
    }
    if (entrepot?.id) params.warehouse_id = entrepot.id
    if (debouncedSearch) params.search = debouncedSearch
    if (selectedCategory !== 'all') params.category = selectedCategory
    if (showOnlyAvailable) params.has_stock = 'true'
    return params
  }, [entrepot, debouncedSearch, selectedCategory, showOnlyAvailable,
      sortField, sortDirection])

  const buildProductCacheKey = useCallback((page) => JSON.stringify({
    ...productParams,
    page,
  }), [productParams])

  // Charger une page
  const loadProducts = useCallback(async (page = 1, { append = false } = {}) => {
    if (!entrepot?.id) return

    if (!append) setLoadingProducts(true)
    else setLoadingMore(true)

    const cacheKey = buildProductCacheKey(page)

    // Cache hit
    if (!append) {
      const cached = cacheGet(cacheKey)
      if (cached) {
        setProducts(cached.results)
        setTotalProducts(cached.count)
        setCurrentPage(page)
        setHasNextPage(!!cached.next)
        setLoadingProducts(false)
        setInitialProductsLoad(false)
        return
      }
    }

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await AxiosInstance.get('/products/', {
        params: { ...productParams, page },
        signal: controller.signal,
      })
      if (controller.signal.aborted) return

      const payload = res.data
      let results = unwrap(payload)
      const count = payload.count ?? results.length

      // ✅ Enrichir avec pricing + stock (2 requêtes en parallèle)
      if (entrepot?.id && results.length > 0) {
        const productIds = results.map(p => p.id)
        const [pricingMap, stockMap] = await Promise.all([
          loadPricingMap(entrepot.id, productIds, controller.signal),
          loadStockMap(entrepot.id, productIds, controller.signal),
        ])
        if (controller.signal.aborted) return

        results = results.map(product => {
          const price = pricingMap[product.id]
          const stock = stockMap[`${product.id}_null`] || { quantity: 0, minimum: 0 }
          const salePrice = safeNumber(
            price?.sale_price ?? product.sale_price ?? product.price, 0
          )
          const wholesalePrice = price?.wholesale_price != null
            ? safeNumber(price.wholesale_price) : null
          return {
            ...product,
            image_url: getImageUrl(product),
            sale_price: salePrice,
            wholesale_price: wholesalePrice,
            has_wholesale: !!wholesalePrice && wholesalePrice > 0,
            has_price: salePrice > 0,
            stock_quantity: stock.quantity,
            min_stock_level: stock.minimum,
          }
        })
      }

      // Cache seulement si première page
      if (!append) {
        cacheSet(cacheKey, {
          results,
          count,
          next: payload.next,
        })
      }

      if (append) {
        // ✅ Concat sans doublons (sécurité)
        setProducts(prev => {
          const existingIds = new Set(prev.map(p => p.id))
          const fresh = results.filter(p => !existingIds.has(p.id))
          return [...prev, ...fresh]
        })
      } else {
        setProducts(results)
      }
      setTotalProducts(count)
      setCurrentPage(page)
      setHasNextPage(!!payload.next)
    } catch (err) {
      if (err.name === 'CanceledError') return
      console.error('Erreur produits:', err)
      showNotification('Erreur de chargement des produits', 'error')
    } finally {
      setLoadingProducts(false)
      setLoadingMore(false)
      setInitialProductsLoad(false)
    }
  }, [entrepot, productParams, buildProductCacheKey, cacheGet, cacheSet, showNotification])

  // Charger pricing + stock en parallèle (filtré sur les IDs de la page)
  const loadPricingMap = async (warehouseId, productIds, signal) => {
    try {
      const res = await AxiosInstance.get('/product-prices/', {
        params: {
          warehouse_id: warehouseId,
          is_current: true,
          product_id__in: productIds.join(','),
          page_size: 500,
        },
        signal,
      })
      const pricings = unwrap(res.data)
      return pricings.reduce((acc, p) => {
        acc[p.product] = p
        return acc
      }, {})
    } catch (err) {
      console.warn('Pricing non chargé:', err)
      return {}
    }
  }

  const loadStockMap = async (warehouseId, productIds, signal) => {
    try {
      const res = await AxiosInstance.get('/warehouse-stocks/by_warehouse/', {
        params: {
          warehouse_id: warehouseId,
          product_id__in: productIds.join(','),
          page_size: 500,
        },
        signal,
      })
      const stocks = unwrap(res.data)
      return stocks.reduce((acc, s) => {
        acc[`${s.product}_${s.variant || 'null'}`] = {
          quantity: safeNumber(s.quantity, 0),
          minimum: safeNumber(s.minimum_stock, 0),
        }
        return acc
      }, {})
    } catch (err) {
      console.warn('Stocks non chargés:', err)
      return {}
    }
  }

  // ✅ Trigger load quand filtres changent (reset page 1)
  useEffect(() => {
    if (!entrepot?.id) return
    setCurrentPage(1)
    setHasNextPage(true)
    loadProducts(1, { append: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrepot, debouncedSearch, selectedCategory, showOnlyAvailable,
      sortField, sortDirection])

  // ✅ Infinite scroll : détecter scroll bas
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    if (!hasNextPage || loadingMore || loadingProducts) return
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceToBottom < SCROLL_THRESHOLD) {
      loadProducts(currentPage + 1, { append: true })
    }
  }, [hasNextPage, loadingMore, loadingProducts, currentPage, loadProducts])

  // ============================================================
  // 3. CLIENTS
  // ============================================================
  useEffect(() => {
    const loadClients = async () => {
      try {
        let data = cacheGet('clients_active')
        if (!data) {
          const res = await AxiosInstance.get(
            '/clients/?is_active=true&page_size=500'
          )
          data = unwrap(res.data)
          cacheSet('clients_active', data)
        }
        setClients(data)
      } catch (err) {
        console.error('Erreur clients:', err)
      }
    }
    loadClients()
  }, [cacheGet, cacheSet])

  // ============================================================
  // 4. CHANGEMENT AGENCE / ENTREPÔT
  // ============================================================
  const handleAgenceChange = async (agenceId) => {
    const newAgence = agences.find(a => a.id === parseInt(agenceId))
    if (!newAgence) return
    setAgence(newAgence)
    setSelectedAgenceFilter(newAgence.id)
    setEntrepot(null)
    setItems([])
    const newWarehouses = await fetchWarehouses(newAgence.id)
    if (newWarehouses.length > 0) {
      const def = newWarehouses.find(w => w.is_default) || newWarehouses[0]
      setEntrepot(def)
    }
    showNotification(`Agence changée : ${newAgence.nom}`, 'success')
  }

  const handleEntrepotChange = (warehouseId) => {
    const newEntrepot = warehouses.find(w => w.id === parseInt(warehouseId))
    if (!newEntrepot) return
    setEntrepot(newEntrepot)
    setItems([])
    showNotification(`Entrepôt changé : ${newEntrepot.name}`, 'success')
  }

  // ============================================================
  // 5. LOTS PAR PRODUIT (à la demande)
  // ============================================================
  const fetchLotsForProduct = useCallback(async (productId) => {
    const pid = safeInt(productId)
    if (!pid || !entrepot?.id) return
    if (lotsByProduct[pid] !== undefined) return

    setLoadingLots(prev => ({ ...prev, [pid]: true }))
    try {
      const res = await AxiosInstance.get(
        `/lots/by-product/${pid}/?page_size=100`
      )
      const lots = unwrap(res.data)
      const available = lots.filter(lot =>
        safeInt(lot.warehouse) === safeInt(entrepot.id)
        && lot.quality_status === 'good'
        && safeNumber(lot.quantity, 0) > 0
      )
      setLotsByProduct(prev => ({ ...prev, [pid]: available }))
    } catch {
      setLotsByProduct(prev => ({ ...prev, [pid]: [] }))
    } finally {
      setLoadingLots(prev => ({ ...prev, [pid]: false }))
    }
  }, [entrepot, lotsByProduct])

  // ============================================================
  // 6. PANIER
  // ============================================================
  const isProductAlreadyAdded = (productId) => {
    const pid = safeInt(productId)
    return items.some(item => safeInt(item.product_id) === pid)
  }

  const handleAddItem = (product) => {
    if (!product) return
    if (!isProductAvailable(product)) {
      const stock = safeNumber(product.stock_quantity, 0)
      const price = safeNumber(product.sale_price, 0)
      if (stock <= 0) showNotification(`"${product.name}" en rupture`, 'warning')
      else if (price <= 0) showNotification(`"${product.name}" sans prix`, 'warning')
      return
    }

    const pid = safeInt(product.id)
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
      showNotification(`Stock max pour ${item.product_name} : ${maxQty}`, 'warning')
    }
    handleItemChange(itemId, 'quantity', safeQty)
  }

  // ============================================================
  // 7. TOTAUX
  // ============================================================
  useEffect(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + safeNumber(item.total, 0), 0
    )
    setTotals({ subtotal, tax_amount: 0, total: subtotal })
  }, [items])

  // ============================================================
  // 8. SUBMIT
  // ============================================================
  const handleSubmit = async () => {
    if (items.length === 0) {
      showNotification('Ajoutez au moins un produit', 'error')
      return
    }
    if (!agence?.id || !entrepot?.id) {
      showNotification('Agence ou entrepôt manquant', 'error')
      return
    }

    // ✅ Validation stock cumulée
    const stockCheck = {}
    items.forEach(i => {
      if (!stockCheck[i.product_id]) {
        stockCheck[i.product_id] = {
          name: i.product_name,
          needed: 0,
          available: i.stock_max || 0,
        }
      }
      stockCheck[i.product_id].needed += i.quantity
    })
    const stockErrors = []
    Object.values(stockCheck).forEach(s => {
      if (s.needed > s.available) {
        stockErrors.push(`${s.name} : ${s.available} dispo, ${s.needed} demandé`)
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
      notes: notes || `Vente POS du ${new Date().toLocaleString('fr-FR')}`,
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
      cacheRef.current.clear()
      localStorage.removeItem('pos_cart')
      showNotification('Vente créée avec succès !', 'success')
      setItems([])
      setSelectedClient(null)
      setNotes('')
      setTimeout(() => navigate('/ventes'), 1500)
    } catch (err) {
      console.error(err)
      let msg = 'Erreur lors de la création'
      const d = err.response?.data
      if (typeof d === 'string') msg = d
      else if (d?.error) msg = d.error
      else if (d?.detail) msg = d.detail
      else if (Array.isArray(d?.non_field_errors))
        msg = d.non_field_errors.join(', ')
      else if (d?.items) msg = 'Erreur articles : ' + JSON.stringify(d.items)
      showNotification(msg, 'error', d)
    } finally {
      setSubmitting(false)
    }
  }

  // ============================================================
  // 9. FILTRAGE CLIENTS (recherche locale sur les 500 chargés)
  // ============================================================
  const filteredClients = useMemo(() => {
    if (!debouncedClientSearch) return clients
    const q = debouncedClientSearch.toLowerCase()
    return clients.filter(c =>
      (c.nom || '').toLowerCase().includes(q)
      || (c.prenom || '').toLowerCase().includes(q)
      || (c.telephone || '').toLowerCase().includes(q)
      || (c.email || '').toLowerCase().includes(q)
    )
  }, [clients, debouncedClientSearch])

  // ============================================================
  // 10. BADGE PRODUIT
  // ============================================================
  const getStatusBadge = (product) => {
    const stock = safeNumber(product?.stock_quantity, 0)
    const minLevel = safeNumber(product?.min_stock_level, 0)
    const price = safeNumber(product?.sale_price, 0)
    const hasPrice = product?.has_price !== false && price > 0

    if (!hasPrice) {
      return (
        <div className="badge badge-error gap-1 font-semibold">
          <AlertTriangle className="w-3 h-3" /> Prix manquant
        </div>
      )
    }
    if (stock <= 0) {
      return (
        <div className="badge badge-error gap-1 font-semibold">
          <AlertTriangle className="w-3 h-3" /> Rupture
        </div>
      )
    }
    if (minLevel > 0 && stock <= minLevel) {
      return (
        <div className="badge badge-warning gap-1 font-semibold">
          <AlertCircle className="w-3 h-3" /> Stock faible
        </div>
      )
    }
    return (
      <div className="badge badge-success gap-1 font-semibold">
        <CheckCircle className="w-3 h-3" /> En stock
      </div>
    )
  }

  // ============================================================
  // 11. IMAGE FALLBACK
  // ============================================================
  const ProductImage = ({ src, alt, className }) => {
    const [errored, setErrored] = useState(false)
    if (!src || errored) {
      return (
        <div className={`${className} flex items-center justify-center bg-base-300`}>
          <Package className="w-8 h-8 text-base-content/30" />
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
  // RENDU
  // ============================================================
  if ((loadingUser || initialProductsLoad) && loadingProducts) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-6">
          <Loader className="w-16 h-16 text-primary animate-spin mx-auto" />
          <p className="text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement du point de vente...
          </p>
        </div>
      </div>
    )
  }

  if (error && !agence) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Erreur</h2>
          <p className="text-base-content/60 mb-4">{error}</p>
          <button onClick={loadUserAndAgence} className="btn btn-primary gap-2">
            <RefreshCw className="w-4 h-4" /> Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Spinner overlay */}
      {(loadingProducts || loadingMore) && !initialProductsLoad && (
        <div className="fixed top-20 right-6 z-40">
          <div className="bg-base-100 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border border-base-300">
            <Loader className="w-3 h-3 animate-spin text-primary" />
            <span className="text-xs text-base-content/60">
              {loadingMore ? 'Chargement...' : 'Actualisation...'}
            </span>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification.show && (
        <div className="fixed top-20 right-6 z-50 animate-slideDown max-w-md">
          <div className={`alert ${
            notification.type === 'success' ? 'alert-success'
            : notification.type === 'warning' ? 'alert-warning'
            : 'alert-error'
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
          <p className="text-base text-base-content/60">
            {totalProducts.toLocaleString('fr-FR')} produits disponibles
            {agence && ` • ${agence.nom}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => loadProducts(1, { append: false })}
            className="btn btn-outline gap-2"
            disabled={loadingProducts}
          >
            <RefreshCw className={`w-4 h-4 ${loadingProducts ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <button
            onClick={() => navigate('/ventes')}
            className="btn btn-primary gap-2"
          >
            <ShoppingCart className="w-4 h-4" /> Voir les ventes
          </button>
        </div>
      </div>

      {/* Sélecteurs */}
      <div className="bg-base-100 rounded-xl shadow-md border border-base-300 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {agences.length > 1 && (
            <div>
              <label className="label py-0">
                <span className="label-text text-xs font-medium text-base-content/60">
                  Agence
                </span>
              </label>
              <select
                className="select select-bordered w-full"
                value={selectedAgenceFilter || ''}
                onChange={(e) => handleAgenceChange(e.target.value)}
                disabled={submitting}
              >
                {agences.map(a => (
                  <option key={a.id} value={a.id}>{a.nom}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label py-0">
              <span className="label-text text-xs font-medium text-base-content/60">
                Entrepôt ({warehouses.length})
              </span>
            </label>
            {loadingWarehouses ? (
              <div className="flex items-center gap-2 bg-base-200 rounded-lg px-3 h-12">
                <Loader className="w-4 h-4 animate-spin" />
              </div>
            ) : (
              <select
                className="select select-bordered w-full"
                value={entrepot?.id || ''}
                onChange={(e) => handleEntrepotChange(e.target.value)}
                disabled={submitting || warehouses.length <= 1}
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.is_default ? '⭐' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="label py-0">
              <span className="label-text text-xs font-medium text-base-content/60">
                Client
              </span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-outline flex-1 justify-start gap-2"
                onClick={() => setShowClientModal(true)}
                disabled={submitting}
              >
                <User className="w-4 h-4" />
                <span className="truncate">
                  {selectedClient
                    ? `${selectedClient.nom || ''} ${selectedClient.prenom || ''}`.trim()
                    : 'Client anonyme'}
                </span>
              </button>
              {selectedClient && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedClient(null)}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-base-100 rounded-xl shadow-md border border-base-300 p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Rechercher par nom, référence, code-barres..."
              className="input input-bordered w-full pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle"
                onClick={() => setSearchTerm('')}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              className="select select-bordered min-w-[160px]"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">Toutes catégories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name || cat.nom}
                </option>
              ))}
            </select>
            <select
              className="select select-bordered min-w-[150px]"
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
            >
              <option value="name">Nom</option>
              <option value="sale_price">Prix</option>
              <option value="stock_quantity">Stock</option>
            </select>
            <button
              className="btn btn-ghost"
              onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
            <label className="label cursor-pointer gap-2 bg-base-200 px-3 py-2 rounded-lg">
              <span className="label-text text-sm">Dispo</span>
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={showOnlyAvailable}
                onChange={(e) => setShowOnlyAvailable(e.target.checked)}
              />
            </label>
            <button
              className="btn btn-outline"
              onClick={() => {
                setSelectedCategory('all')
                setSearchTerm('')
                setShowOnlyAvailable(true)
              }}
            >
              <Filter className="w-4 h-4" />
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

      {/* Grille : produits + panier */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Produits */}
        <div className="lg:col-span-3 bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-base-300 bg-base-200/50 flex items-center justify-between">
            <h2 className="font-semibold text-sm">
              Produits
              <span className="badge badge-ghost badge-sm ml-2">
                {products.length.toLocaleString('fr-FR')} / {totalProducts.toLocaleString('fr-FR')}
              </span>
            </h2>
          </div>

          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto max-h-[70vh]"
          >
            {products.length === 0 && !loadingProducts ? (
              <div className="p-12 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-base-content/30" />
                <p className="text-lg font-semibold text-base-content/50">
                  Aucun produit trouvé
                </p>
                <p className="text-sm text-base-content/40 mt-2">
                  {debouncedSearch
                    ? `Aucun résultat pour "${debouncedSearch}"`
                    : 'Essayez de modifier vos filtres'}
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {products.map((product) => {
                  const pid = safeInt(product.id)
                  const isInCart = isProductAlreadyAdded(pid)
                  const stock = safeNumber(product.stock_quantity, 0)
                  const price = safeNumber(product.sale_price, 0)
                  const isAvailable = isProductAvailable(product)

                  return (
                    <button
                      key={pid}
                      type="button"
                      className={`bg-base-200 rounded-lg overflow-hidden hover:shadow-lg transition-all text-left relative ${
                        !isAvailable
                          ? 'opacity-60 cursor-not-allowed'
                          : isInCart
                            ? 'border-2 border-primary'
                            : 'border border-base-300 hover:border-primary/50'
                      }`}
                      onClick={() => isAvailable && handleAddItem(product)}
                      disabled={!isAvailable || submitting}
                    >
                      <div className="relative h-32 bg-base-300 overflow-hidden">
                        <ProductImage
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1.5 right-1.5">
                          {getStatusBadge(product)}
                        </div>
                        {isInCart && (
                          <div className="absolute top-1.5 left-1.5">
                            <span className="badge badge-primary badge-xs">✓</span>
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <h3 className="font-semibold text-xs truncate">
                          {product.name || 'Sans nom'}
                        </h3>
                        <p className="text-[10px] text-base-content/50 truncate">
                          {product.reference || '—'}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs font-bold text-primary">
                            {formatPrice(price)}
                          </span>
                          <span className={`text-[10px] font-semibold ${
                            stock <= 0 ? 'text-error' : 'text-success'
                          }`}>
                            {stock}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>Référence</th>
                      <th>Prix</th>
                      <th>Stock</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(product => {
                      const pid = safeInt(product.id)
                      const stock = safeNumber(product.stock_quantity, 0)
                      const price = safeNumber(product.sale_price, 0)
                      const isAvailable = isProductAvailable(product)
                      return (
                        <tr key={pid} className={!isAvailable ? 'opacity-60' : ''}>
                          <td className="font-semibold text-sm">{product.name}</td>
                          <td className="font-mono text-xs">{product.reference || '—'}</td>
                          <td className="font-semibold text-primary">{formatPrice(price)}</td>
                          <td>
                            <span className={`badge ${stock <= 0 ? 'badge-error' : 'badge-success'} badge-sm`}>
                              {stock}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-primary btn-xs gap-1"
                              onClick={() => handleAddItem(product)}
                              disabled={!isAvailable || submitting}
                            >
                              <Plus className="w-3 h-3" /> Ajouter
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Load more indicator */}
            {loadingMore && (
              <div className="p-4 text-center">
                <Loader className="w-6 h-6 animate-spin text-primary mx-auto" />
                <p className="text-xs text-base-content/60 mt-2">Chargement...</p>
              </div>
            )}

            {!hasNextPage && products.length > 0 && (
              <div className="p-4 text-center text-xs text-base-content/40 border-t border-base-300">
                ✓ Tous les produits sont chargés ({products.length})
              </div>
            )}
          </div>
        </div>

        {/* Panier */}
        <div className="lg:col-span-1 bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden flex flex-col max-h-[80vh]">
          <div className="p-3 border-b border-base-300 bg-base-200/50 flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Panier
              <span className="badge badge-primary badge-sm">{items.length}</span>
            </h2>
            {items.length > 0 && (
              <button
                className="btn btn-ghost btn-xs text-error"
                onClick={() => setItems([])}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-12 h-12 mx-auto text-base-content/30 mb-3" />
                <p className="text-sm text-base-content/50">Panier vide</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map(item => {
                  const pid = safeInt(item.product_id)
                  const availableLots = lotsByProduct[pid] || []
                  const isLoadingLots = loadingLots[pid]
                  return (
                    <div key={item.id} className="bg-base-200 rounded-lg p-2">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-base-300 rounded overflow-hidden flex-shrink-0">
                          <ProductImage
                            src={item.image_url}
                            alt={item.product_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate">{item.product_name}</p>
                          <p className="text-[10px] text-primary font-semibold">
                            {formatPrice(item.unit_price)}
                          </p>
                        </div>
                        <button
                          className="btn btn-ghost btn-xs btn-square text-error"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <button
                            className="btn btn-ghost btn-xs btn-square"
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            className="btn btn-ghost btn-xs btn-square"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock_max}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-xs font-bold text-primary">
                          {formatPrice(item.total)}
                        </span>
                      </div>
                      {item.has_wholesale && (
                        <select
                          className="select select-bordered select-xs w-full mt-1"
                          value={item.price_type}
                          onChange={(e) => handlePriceTypeChange(item.id, e.target.value)}
                        >
                          <option value="retail">Détail</option>
                          <option value="wholesale">Gros</option>
                        </select>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-base-300 bg-base-200/50">
            {items.length > 0 ? (
              <>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Total</span>
                  <span className="text-lg font-bold text-primary">
                    {formatPrice(totals.total)}
                  </span>
                </div>
                <input
                  type="text"
                  className="input input-bordered input-sm w-full mb-2"
                  placeholder="Notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <button
                  className="btn btn-primary w-full gap-2"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting
                    ? <><Loader className="w-4 h-4 animate-spin" /> Traitement...</>
                    : <><Receipt className="w-4 h-4" /> Valider {formatPrice(totals.total)}</>}
                </button>
              </>
            ) : (
              <p className="text-xs text-base-content/40 text-center">
                Ajoutez des produits
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal client avec recherche */}
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
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
              <input
                type="text"
                placeholder="Rechercher..."
                className="input input-bordered w-full pl-9 text-sm"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <button
                className="w-full text-left p-3 bg-base-200 rounded-lg hover:bg-primary/10"
                onClick={() => { setSelectedClient(null); setShowClientModal(false) }}
              >
                <div className="font-semibold">Client anonyme</div>
              </button>
              {filteredClients.length === 0 ? (
                <div className="text-center py-4 text-sm text-base-content/40">
                  Aucun client trouvé
                </div>
              ) : (
                filteredClients.map(client => (
                  <button
                    key={client.id}
                    className="w-full text-left p-3 bg-base-200 rounded-lg hover:bg-primary/10"
                    onClick={() => { setSelectedClient(client); setShowClientModal(false) }}
                  >
                    <div className="font-semibold">
                      {client.nom} {client.prenom || ''}
                    </div>
                    <div className="text-xs text-base-content/50">
                      {client.telephone || '—'}
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowClientModal(false)}>
                Fermer
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