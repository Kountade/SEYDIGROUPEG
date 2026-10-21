// src/components/inventaire/Lots.jsx
import React, {
  useEffect, useState, useCallback, useRef, useMemo
} from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Package, Search, RefreshCw, Filter, AlertCircle, CheckCircle,
  Eye, ChevronLeft, ChevronRight, ArrowUpDown, ChevronUp, ChevronDown,
  Calendar, Building2, MoreVertical, Download, Printer, AlertTriangle,
  Layers, MapPin, QrCode, FileText, Plus, Edit, Trash2, ArrowLeft,
  XCircle
} from 'lucide-react'

const Lots = () => {
  const navigate = useNavigate()

  const [lots, setLots] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [products, setProducts] = useState([])

  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterWarehouse, setFilterWarehouse] = useState('')
  const [filterQuality, setFilterQuality] = useState('')
  const [filterExpiry, setFilterExpiry] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [sortField, setSortField] = useState('-created_at')
  const [sortDirection, setSortDirection] = useState('desc')

  // ✅ Refs cache
  const cacheRef = useRef(new Map())
  const fetchingRef = useRef(false)

  // ✅ Index O(1) pour lookup produits / entrepôts
  const productsIndex = useMemo(() => {
    const map = {}
    products.forEach(p => { map[p.id] = p })
    return map
  }, [products])

  const warehousesIndex = useMemo(() => {
    const map = {}
    warehouses.forEach(w => { map[w.id] = w })
    return map
  }, [warehouses])

  const qualityOptions = [
    { value: 'good', label: 'Bon', color: 'text-success' },
    { value: 'damaged', label: 'Endommagé', color: 'text-error' },
    { value: 'expired', label: 'Expiré', color: 'text-error' },
    { value: 'quarantine', label: 'Quarantaine', color: 'text-warning' }
  ]

  // ---------- Helpers ----------
  const unwrap = (data) => Array.isArray(data) ? data : (data?.results || [])

  const formatNumber = (number) => {
    if (!number && number !== 0) return '0'
    return new Intl.NumberFormat('fr-FR').format(number)
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })
  }

  const formatDateTime = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return null
    const today = new Date()
    const expiry = new Date(expiryDate)
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return {
        label: 'Expiré', color: 'text-error', bg: 'bg-error/10',
        icon: <XCircle className="w-3 h-3" />
      }
    }
    if (diffDays <= 30) {
      return {
        label: `Expire dans ${diffDays}j`, color: 'text-warning', bg: 'bg-warning/10',
        icon: <AlertTriangle className="w-3 h-3" />
      }
    }
    return {
      label: `Valide (${diffDays}j)`, color: 'text-success', bg: 'bg-success/10',
      icon: <CheckCircle className="w-3 h-3" />
    }
  }

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 4000)
  }

  // ---------- Fetch avec cache ----------
  const fetchData = useCallback(async ({ bypassCache = false } = {}) => {
    const key = 'lots_list'

    if (!bypassCache && cacheRef.current.has(key)) {
      const c = cacheRef.current.get(key)
      setLots(c.lots)
      setWarehouses(c.warehouses)
      setProducts(c.products)
      setLoading(false)
      setInitialLoad(false)
      return
    }

    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)

    try {
      // ✅ page_size=200 sur les selects pour éviter la pagination gênante
      const [lotsRes, warehousesRes, productsRes] = await Promise.all([
        AxiosInstance.get('/lots/?page_size=200').catch(() => ({ data: [] })),
        AxiosInstance.get('/warehouses/?page_size=200').catch(() => ({ data: [] })),
        AxiosInstance.get('/products/?page_size=200').catch(() => ({ data: [] }))
      ])

      const lotsData = unwrap(lotsRes.data)
      const warehousesData = unwrap(warehousesRes.data)
      const productsData = unwrap(productsRes.data)

      cacheRef.current.set(key, {
        lots: lotsData,
        warehouses: warehousesData,
        products: productsData
      })
      if (cacheRef.current.size > 10) {
        const firstKey = cacheRef.current.keys().next().value
        cacheRef.current.delete(firstKey)
      }

      setLots(lotsData)
      setWarehouses(warehousesData)
      setProducts(productsData)
    } catch (error) {
      console.error(error)
      showMessage('Erreur de chargement des données', 'error')
    } finally {
      setLoading(false)
      setInitialLoad(false)
      fetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refreshData = async () => {
    cacheRef.current.clear()
    await fetchData({ bypassCache: true })
    showMessage('Données actualisées', 'success')
  }

  // ---------- Suppression ----------
  const handleDelete = async (lotId, lotNumber) => {
    if (!window.confirm(
      `Êtes-vous sûr de vouloir supprimer le lot ${lotNumber || 'sans numéro'} ?`
    )) return

    try {
      await AxiosInstance.delete(`/lots/${lotId}/`)
      showMessage(`Lot ${lotNumber || 'sans numéro'} supprimé avec succès`, 'success')
      cacheRef.current.clear()
      await fetchData({ bypassCache: true })
      setCurrentPage(1)
    } catch (error) {
      console.error('Erreur lors de la suppression :', error)
      const errorMsg = error.response?.data?.detail
        || 'Erreur lors de la suppression du lot'
      showMessage(errorMsg, 'error')
    }
  }

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('asc') }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />
    return sortDirection === 'asc'
      ? <ChevronUp className="w-3 h-3" />
      : <ChevronDown className="w-3 h-3" />
  }

  // ✅ Lookups O(1)
  const getWarehouseName = (warehouseId) => {
    if (!warehouseId) return 'Inconnu'
    return warehousesIndex[warehouseId]?.name || 'Inconnu'
  }
  const getProductName = (productId) => {
    if (!productId) return 'Inconnu'
    return productsIndex[productId]?.name || 'Inconnu'
  }
  const getProductRef = (productId) => {
    if (!productId) return '-'
    return productsIndex[productId]?.reference || '-'
  }

  const getQualityBadge = (qualityStatus) => {
    const config = qualityOptions.find(q => q.value === qualityStatus)
    if (!config) return <span className="badge badge-ghost">Inconnu</span>
    const colorMap = {
      good: 'badge-success', damaged: 'badge-error',
      expired: 'badge-error', quarantine: 'badge-warning'
    }
    return (
      <span className={`badge ${colorMap[qualityStatus] || 'badge-ghost'} gap-1`}>
        {config.label}
      </span>
    )
  }

  // ---------- Stats (mémoïsées) ----------
  const stats = useMemo(() => {
    const total = lots.length
    const totalQuantity = lots.reduce((sum, l) => sum + (l.quantity || 0), 0)
    const expired = lots.filter(l => l.is_expired || l.quality_status === 'expired').length
    const expiringSoon = lots.filter(l => {
      if (!l.expiry_date || l.is_expired) return false
      const diffDays = Math.ceil(
        (new Date(l.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
      )
      return diffDays <= 30 && diffDays >= 0
    }).length
    const damaged = lots.filter(l => l.quality_status === 'damaged').length
    const warehousesCount = new Set(lots.map(l => l.warehouse)).size

    return { total, totalQuantity, expired, expiringSoon, damaged, warehouses: warehousesCount }
  }, [lots])

  // ---------- Filtrage local ----------
  const filteredAndSortedLots = useMemo(() => {
    const filtered = lots.filter(l => {
      const search = searchTerm.toLowerCase()
      const productName = getProductName(l.product).toLowerCase()
      const productRef = getProductRef(l.product).toLowerCase()
      const lotNumber = (l.lot_number || '').toLowerCase()
      const serialNumber = (l.serial_number || '').toLowerCase()
      const warehouseName = getWarehouseName(l.warehouse).toLowerCase()

      const matchesSearch = productName.includes(search)
        || productRef.includes(search)
        || lotNumber.includes(search)
        || serialNumber.includes(search)
        || warehouseName.includes(search)

      const matchesWarehouse = !filterWarehouse || l.warehouse === parseInt(filterWarehouse)
      const matchesQuality = !filterQuality || l.quality_status === filterQuality

      let matchesExpiry = true
      if (filterExpiry === 'expired') {
        matchesExpiry = l.is_expired || l.quality_status === 'expired'
      } else if (filterExpiry === 'expiring') {
        if (l.is_expired || l.quality_status === 'expired') matchesExpiry = false
        else if (l.expiry_date) {
          const diffDays = Math.ceil(
            (new Date(l.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
          )
          matchesExpiry = diffDays <= 30 && diffDays >= 0
        } else matchesExpiry = false
      } else if (filterExpiry === 'good') {
        matchesExpiry = !l.is_expired && l.quality_status !== 'expired' && l.quantity > 0
      }

      return matchesSearch && matchesWarehouse && matchesQuality && matchesExpiry
    })

    filtered.sort((a, b) => {
      let aVal, bVal
      if (sortField === 'product_name') {
        aVal = getProductName(a.product); bVal = getProductName(b.product)
      } else if (sortField === 'warehouse_name') {
        aVal = getWarehouseName(a.warehouse); bVal = getWarehouseName(b.warehouse)
      } else if (sortField === 'quantity') {
        aVal = a.quantity || 0; bVal = b.quantity || 0
      } else if (sortField === '-created_at' || sortField === 'created_at') {
        const isDesc = sortField === '-created_at'
        const dateA = new Date(a.created_at || 0)
        const dateB = new Date(b.created_at || 0)
        return isDesc ? dateB - dateA : dateA - dateB
      } else if (sortField === 'expiry_date') {
        aVal = a.expiry_date || ''; bVal = b.expiry_date || ''
      } else {
        aVal = a[sortField] || ''
        bVal = b[sortField] || ''
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lots, searchTerm, filterWarehouse, filterQuality, filterExpiry,
    sortField, sortDirection, productsIndex, warehousesIndex])

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedLots.length / itemsPerPage))
  const paginatedLots = useMemo(() => filteredAndSortedLots.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ), [filteredAndSortedLots, currentPage, itemsPerPage])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1)
  }, [totalPages, currentPage])

  // ---------- Rendu : premier chargement ----------
  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-6">
          <div className="loading loading-spinner loading-lg text-primary w-16 h-16"></div>
          <p className="text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement des lots...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Spinner overlay discret */}
      {loading && !initialLoad && (
        <div className="fixed top-20 right-6 z-40 animate-slideDown">
          <div className="bg-base-100 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border border-base-300">
            <span className="loading loading-spinner loading-xs text-primary"></span>
            <span className="text-xs text-base-content/60">Chargement...</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-base-100 border-b border-base-300 sticky top-0 z-10 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link to="/stocks" className="btn btn-ghost btn-sm gap-2">
              <ArrowLeft className="w-4 h-4" /> Retour
            </Link>
            <div className="divider divider-horizontal mx-0 h-6 hidden sm:flex"></div>
            <Package className="w-6 h-6 text-primary hidden sm:flex" />
            <h1 className="text-xl font-semibold">Gestion des lots</h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={refreshData} className="btn btn-ghost btn-sm gap-2">
              <RefreshCw className="w-4 h-4" /> Actualiser
            </button>
            <button
              onClick={() => navigate('/lots/nouveau')}
              className="btn btn-primary btn-sm gap-2"
            >
              <Plus className="w-4 h-4" /> Nouveau lot
            </button>
            <button className="btn btn-ghost btn-sm gap-2">
              <Download className="w-4 h-4" /> Exporter
            </button>
            <button className="btn btn-ghost btn-sm gap-2 hidden sm:flex">
              <Printer className="w-4 h-4" /> Imprimer
            </button>
            {message.text && (
              <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg py-2 px-4`}>
                <div className="flex items-center gap-2">
                  {message.type === 'success'
                    ? <CheckCircle className="w-4 h-4" />
                    : <XCircle className="w-4 h-4" />}
                  <span className="text-sm">{message.text}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
            <div className="stat-figure text-primary"><Package className="w-6 h-6" /></div>
            <div className="stat-title text-sm font-semibold">Total lots</div>
            <div className="stat-value text-2xl font-black">{stats.total}</div>
            <div className="stat-desc">Lots enregistrés</div>
          </div>
          <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
            <div className="stat-figure text-secondary"><Layers className="w-6 h-6" /></div>
            <div className="stat-title text-sm font-semibold">Quantité totale</div>
            <div className="stat-value text-2xl font-black">{formatNumber(stats.totalQuantity)}</div>
            <div className="stat-desc">Unités en stock</div>
          </div>
          <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
            <div className="stat-figure text-error"><XCircle className="w-6 h-6" /></div>
            <div className="stat-title text-sm font-semibold">Expirés</div>
            <div className="stat-value text-2xl font-black">{stats.expired}</div>
            <div className="stat-desc">À éliminer</div>
          </div>
          <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
            <div className="stat-figure text-warning"><AlertTriangle className="w-6 h-6" /></div>
            <div className="stat-title text-sm font-semibold">Expire bientôt</div>
            <div className="stat-value text-2xl font-black">{stats.expiringSoon}</div>
            <div className="stat-desc">Dans 30 jours</div>
          </div>
          <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
            <div className="stat-figure text-error"><AlertCircle className="w-6 h-6" /></div>
            <div className="stat-title text-sm font-semibold">Endommagés</div>
            <div className="stat-value text-2xl font-black">{stats.damaged}</div>
            <div className="stat-desc">Qualité défectueuse</div>
          </div>
          <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
            <div className="stat-figure text-info"><Building2 className="w-6 h-6" /></div>
            <div className="stat-title text-sm font-semibold">Entrepôts</div>
            <div className="stat-value text-2xl font-black">{stats.warehouses}</div>
            <div className="stat-desc">Sites actifs</div>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-base-100 rounded-xl shadow-md border border-base-300 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40" />
                <input
                  type="text"
                  placeholder="Rechercher par produit, lot, numéro de série..."
                  className="input input-bordered w-full pl-12"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                className="select select-bordered min-w-[150px]"
                value={filterWarehouse}
                onChange={(e) => { setFilterWarehouse(e.target.value); setCurrentPage(1) }}
              >
                <option value="">Tous entrepôts</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <select
                className="select select-bordered min-w-[140px]"
                value={filterQuality}
                onChange={(e) => { setFilterQuality(e.target.value); setCurrentPage(1) }}
              >
                <option value="">Toute qualité</option>
                {qualityOptions.map(q => (
                  <option key={q.value} value={q.value}>{q.label}</option>
                ))}
              </select>
              <select
                className="select select-bordered min-w-[150px]"
                value={filterExpiry}
                onChange={(e) => { setFilterExpiry(e.target.value); setCurrentPage(1) }}
              >
                <option value="">Tous statuts</option>
                <option value="good">Valides</option>
                <option value="expiring">Expire bientôt</option>
                <option value="expired">Expirés</option>
              </select>
              <button
                className="btn btn-outline gap-2"
                onClick={() => {
                  setFilterWarehouse('')
                  setFilterQuality('')
                  setFilterExpiry('')
                  setSearchTerm('')
                  setCurrentPage(1)
                }}
              >
                <Filter className="w-4 h-4" /> Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden">
          {filteredAndSortedLots.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-20 h-20 mx-auto mb-4 text-base-content/30" />
              <p className="text-xl font-semibold text-base-content/50">
                Aucun lot trouvé
              </p>
              <p className="text-base text-base-content/40 mt-2">
                Les lots sont créés automatiquement lors des réceptions de commandes
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-lg">
                <thead>
                  <tr className="bg-base-200">
                    <th>
                      <button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('product_name')}>
                        Produit <SortIcon field="product_name" />
                      </button>
                    </th>
                    <th>
                      <button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('lot_number')}>
                        Lot <SortIcon field="lot_number" />
                      </button>
                    </th>
                    <th>
                      <button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('warehouse_name')}>
                        Entrepôt <SortIcon field="warehouse_name" />
                      </button>
                    </th>
                    <th>
                      <button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('quantity')}>
                        Quantité <SortIcon field="quantity" />
                      </button>
                    </th>
                    <th>Qualité</th>
                    <th>
                      <button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('expiry_date')}>
                        Expiration <SortIcon field="expiry_date" />
                      </button>
                    </th>
                    <th>
                      <button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('-created_at')}>
                        Créé le <SortIcon field="-created_at" />
                      </button>
                    </th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLots.map((lot) => {
                    const expiryStatus = getExpiryStatus(lot.expiry_date)
                    return (
                      <tr key={lot.id} className="hover">
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="avatar placeholder">
                              <div className="bg-primary/10 text-primary rounded-lg w-10 h-10 flex items-center justify-center">
                                <Package className="w-5 h-5" />
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold">{getProductName(lot.product)}</div>
                              <div className="text-xs text-base-content/50 font-mono">
                                {getProductRef(lot.product)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col">
                            <span className="font-mono text-sm font-semibold">
                              {lot.lot_number || '-'}
                            </span>
                            {lot.serial_number && (
                              <span className="text-xs text-base-content/50 flex items-center gap-1">
                                <QrCode className="w-3 h-3" /> SN: {lot.serial_number}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-base-content/50" />
                            <span>{getWarehouseName(lot.warehouse)}</span>
                          </div>
                          {lot.location && (
                            <div className="text-xs text-base-content/50 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {lot.location}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="font-bold text-lg">{formatNumber(lot.quantity)}</span>
                        </td>
                        <td>
                          <div className="flex flex-col gap-1">
                            {getQualityBadge(lot.quality_status)}
                            {lot.is_expired && (
                              <span className="badge badge-error badge-xs">Expiré</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col">
                            <span>{formatDate(lot.expiry_date)}</span>
                            {expiryStatus && (
                              <span className={`text-xs flex items-center gap-1 ${expiryStatus.color}`}>
                                {expiryStatus.icon}
                                {expiryStatus.label}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-base-content/50" />
                            <span>{formatDateTime(lot.created_at)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex justify-end gap-2">
                            <Link to={`/lots/${lot.id}`} className="btn btn-ghost btn-xs">
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link to={`/lots/${lot.id}/modifier`} className="btn btn-ghost btn-xs">
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              className="btn btn-ghost btn-xs text-error"
                              onClick={() => handleDelete(lot.id, lot.lot_number)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filteredAndSortedLots.length > 0 && (
            <div className="p-4 border-t border-base-300">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-base-content/60">
                  Affichage de {((currentPage - 1) * itemsPerPage) + 1} à{' '}
                  {Math.min(currentPage * itemsPerPage, filteredAndSortedLots.length)} sur{' '}
                  {filteredAndSortedLots.length} lots
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
                    <option value="10">10 par page</option>
                    <option value="20">20 par page</option>
                    <option value="50">50 par page</option>
                    <option value="100">100 par page</option>
                  </select>
                  <div className="join">
                    <button
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
                          key={i}
                          className={`join-item btn btn-sm ${currentPage === pageNum ? 'btn-primary' : ''}`}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                    <button
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
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown { animation: slideDown 0.35s ease-out; }
      `}</style>
    </div>
  )
}

export default Lots