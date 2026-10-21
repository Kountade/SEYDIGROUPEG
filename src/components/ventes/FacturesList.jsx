// src/components/sales/FacturesList.jsx
import React, {
  useEffect, useState, useCallback, useRef, useMemo,
} from 'react'
import { useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import { downloadFacturePDF } from './FacturePDF'
import {
  FileText, Eye, CheckCircle, XCircle, Clock, Search, RefreshCw,
  Filter, AlertCircle, ChevronLeft, ChevronRight, Plus,
  AlertTriangle, ArrowUpDown, ChevronUp, ChevronDown, Trash2,
  Receipt, Printer, X, Loader2, DollarSign,
} from 'lucide-react'

// ============================================================
// CONSTANTES
// ============================================================
const DEBOUNCE_MS = 300
const CACHE_TTL_MS = 2 * 60 * 1000
const CACHE_MAX = 20

const statutConfig = {
  draft: { label: 'Brouillon', icon: Clock, color: 'text-gray-500', bgColor: 'bg-gray-100' },
  sent: { label: 'Envoyée', icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-100' },
  paid: { label: 'Payée', icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-100' },
  partially_paid: { label: 'Partielle', icon: AlertCircle, color: 'text-orange-500', bgColor: 'bg-orange-100' },
  overdue: { label: 'En retard', icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-100' },
  cancelled: { label: 'Annulée', icon: XCircle, color: 'text-gray-500', bgColor: 'bg-gray-100' },
}

const unwrap = (payload) =>
  Array.isArray(payload) ? payload : (payload?.results || [])

// ============================================================
// COMPOSANT
// ============================================================
const FacturesList = () => {
  const navigate = useNavigate()

  // ---------- État principal ----------
  const [factures, setFactures] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState(null)

  // ---------- Filtres serveur ----------
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [filterType, setFilterType] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  // ---------- Pagination serveur ----------
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // ---------- Tri serveur ----------
  const [sortField, setSortField] = useState('date_facture')
  const [sortDirection, setSortDirection] = useState('desc')

  // ---------- UI ----------
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [factureToDelete, setFactureToDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(null)
  const [notification, setNotification] = useState({
    show: false, message: '', type: 'success',
  })

  // ---------- Stats ----------
  const [stats, setStats] = useState({
    total: 0, payee: 0, partiellement_payee: 0, en_retard: 0,
    totalMontant: 0, totalPaye: 0, totalRestant: 0,
  })

  // ---------- Refs ----------
  const cacheRef = useRef(new Map())
  const abortRef = useRef(null)
  const notifTimerRef = useRef(null)

  // ============================================================
  // HELPERS
  // ============================================================
  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type })
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current)
    notifTimerRef.current = setTimeout(
      () => setNotification({ show: false, message: '', type: 'success' }),
      4000
    )
  }, [])

  useEffect(() => {
    return () => {
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  // ============================================================
  // DEBOUNCE
  // ============================================================
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchTerm])

  // ============================================================
  // CACHE TTL
  // ============================================================
  const cacheGet = useCallback((key) => {
    const entry = cacheRef.current.get(key)
    if (!entry) return null
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      cacheRef.current.delete(key)
      return null
    }
    return entry
  }, [])

  const cacheSet = useCallback((key, value) => {
    cacheRef.current.set(key, {
      ...value,
      expiresAt: Date.now() + CACHE_TTL_MS,
    })
    if (cacheRef.current.size > CACHE_MAX) {
      cacheRef.current.delete(cacheRef.current.keys().next().value)
    }
  }, [])

  // ============================================================
  // CACHE KEY
  // ============================================================
  const buildCacheKey = useCallback(() => JSON.stringify({
    page: currentPage,
    size: itemsPerPage,
    q: debouncedSearch,
    status: filterStatut,
    type: filterType,
    date_start: dateRange.start,
    date_end: dateRange.end,
    sort: `${sortField}:${sortDirection}`,
  }), [currentPage, itemsPerPage, debouncedSearch, filterStatut,
       filterType, dateRange, sortField, sortDirection])

  // ============================================================
  // FETCH PRINCIPAL
  // ============================================================
  const fetchFactures = useCallback(async ({ bypassCache = false } = {}) => {
    const key = buildCacheKey()

    if (!bypassCache) {
      const cached = cacheGet(key)
      if (cached) {
        setFactures(cached.results)
        setTotalCount(cached.count)
        setTotalPages(cached.totalPages)
        setLoading(false)
        setInitialLoad(false)
        setError(null)
        return
      }
    }

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const params = {
        page: currentPage,
        page_size: itemsPerPage,
        ordering: `${sortDirection === 'desc' ? '-' : ''}${sortField}`,
      }
      if (debouncedSearch) params.search = debouncedSearch
      if (filterStatut) params.status = filterStatut
      if (filterType) params.type_facture = filterType
      if (dateRange.start) params.date_from = dateRange.start
      if (dateRange.end) params.date_to = dateRange.end

      const response = await AxiosInstance.get('/factures/', {
        params,
        signal: controller.signal,
      })

      if (controller.signal.aborted) return

      const payload = response.data
      const results = unwrap(payload)
      const count = Array.isArray(payload)
        ? results.length
        : (payload.count ?? results.length)
      const nbPages = Math.max(1, Math.ceil(count / itemsPerPage))

      cacheSet(key, { results, count, totalPages: nbPages })

      setFactures(results)
      setTotalCount(count)
      setTotalPages(nbPages)
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
      console.error('Erreur chargement factures:', err)
      if (err.response?.status === 401) {
        setError('Session expirée, veuillez vous reconnecter')
      } else if (err.response?.status === 403) {
        setError("Vous n'avez pas les droits")
      } else {
        setError('Erreur de chargement des factures')
      }
      showNotification('Erreur de chargement', 'error')
      setFactures([])
    } finally {
      if (abortRef.current === controller) {
        setLoading(false)
        setInitialLoad(false)
      }
    }
  }, [buildCacheKey, currentPage, itemsPerPage, debouncedSearch,
      filterStatut, filterType, dateRange, sortField, sortDirection,
      showNotification, cacheGet, cacheSet])

  // ✅ UN SEUL useEffect
  useEffect(() => {
    fetchFactures()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildCacheKey])

  // ============================================================
  // FETCH STATS (serveur)
  // ============================================================
  const fetchStats = useCallback(async () => {
    try {
      const res = await AxiosInstance.get('/factures/stats/')
      const d = res.data || {}
      setStats({
        total: d.total_factures || 0,
        payee: d.par_statut?.paid?.count || 0,
        partiellement_payee: d.par_statut?.partially_paid?.count || 0,
        en_retard: d.factures_en_retard || 0,
        totalMontant: parseFloat(d.total_montant) || 0,
        totalPaye: parseFloat(d.total_paye) || 0,
        totalRestant: parseFloat(d.total_restant) || 0,
      })
    } catch {
      // silencieux
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // ============================================================
  // RESPONSIVE
  // ============================================================
  useEffect(() => {
    const handleResize = () => {
      const next =
        window.innerWidth < 640 ? 5 :
        window.innerWidth < 1024 ? 10 : 10
      setItemsPerPage(prev => prev === next ? prev : next)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const refreshData = async () => {
    cacheRef.current.clear()
    setCurrentPage(1)
    await Promise.all([
      fetchFactures({ bypassCache: true }),
      fetchStats(),
    ])
  }

  // ============================================================
  // ACTIONS
  // ============================================================
  const handleGeneratePDF = async (facture, e) => {
    e?.stopPropagation?.()
    setGeneratingPDF(facture.id)
    try {
      const cacheKey = `facture_detail_${facture.id}`
      let data = cacheGet(cacheKey)?.value
      if (!data) {
        const response = await AxiosInstance.get(`/factures/${facture.id}/`)
        data = response.data
        cacheRef.current.set(cacheKey, {
          value: data,
          expiresAt: Date.now() + CACHE_TTL_MS,
        })
      }
      await downloadFacturePDF(data)
      showNotification('PDF généré avec succès', 'success')
    } catch (err) {
      console.error('Erreur PDF:', err)
      showNotification('Erreur lors de la génération du PDF', 'error')
    } finally {
      setGeneratingPDF(null)
    }
  }

  const handleDelete = async () => {
    if (!factureToDelete) return
    setDeleteLoading(true)
    try {
      await AxiosInstance.delete(`/factures/${factureToDelete.id}/`)
      cacheRef.current.clear()
      showNotification('Facture supprimée avec succès', 'success')
      setShowDeleteModal(false)
      setFactureToDelete(null)
      await Promise.all([
        fetchFactures({ bypassCache: true }),
        fetchStats(),
      ])
    } catch (err) {
      showNotification(
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Erreur lors de la suppression',
        'error'
      )
    } finally {
      setDeleteLoading(false)
    }
  }

  // ============================================================
  // TRI
  // ============================================================
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />
    return sortDirection === 'asc'
      ? <ChevronUp className="w-3 h-3" />
      : <ChevronDown className="w-3 h-3" />
  }

  // ============================================================
  // HELPERS RENDU
  // ============================================================
  const formatPrice = (price) => {
    const n = Number(price)
    if (!Number.isFinite(n)) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }

  const getStatusBadge = (statut) => {
    const config = statutConfig[statut] || statutConfig.draft
    const Icon = config.icon
    return (
      <span className={`badge ${config.bgColor} ${config.color} gap-1 px-3 py-2 text-xs`}>
        <Icon className="w-3 h-3" /> {config.label}
      </span>
    )
  }

  const PaymentProgressBar = ({ facture }) => {
    const total = Number(facture.total_ttc) || 0
    const paye = Number(facture.montant_paye) || 0
    const percent = total === 0 ? 0 : (paye / total) * 100
    const reste = total - paye
    if (total === 0) return null
    return (
      <div className="w-full">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-success">Payé: {formatPrice(paye)}</span>
          <span className="text-error">Reste: {formatPrice(reste)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-success h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
        <div className="text-right text-xs font-semibold mt-1">
          {percent.toFixed(0)}%
        </div>
      </div>
    )
  }

  // ============================================================
  // LOADING / ERROR
  // ============================================================
  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-base font-medium text-base-content/70 animate-pulse">
            Chargement des factures...
          </p>
        </div>
      </div>
    )
  }

  if (error && factures.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Erreur de chargement</h2>
          <p className="text-base-content/60 mb-4">{error}</p>
          <button onClick={refreshData} className="btn btn-primary gap-2">
            <RefreshCw className="w-4 h-4" /> Réessayer
          </button>
        </div>
      </div>
    )
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-4 lg:space-y-6 p-3 lg:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Spinner overlay */}
      {loading && !initialLoad && (
        <div className="fixed top-20 right-6 z-40">
          <div className="bg-base-100 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border border-base-300">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span className="text-xs text-base-content/60">Chargement...</span>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification.show && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 animate-slideDown max-w-md">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-xl rounded-xl`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success'
                ? <CheckCircle className="w-4 h-4" />
                : <AlertCircle className="w-4 h-4" />}
              <span>{notification.message}</span>
            </div>
            <button
              className="btn btn-ghost btn-xs btn-circle"
              onClick={() => setNotification({ ...notification, show: false })}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Modal suppression */}
      {showDeleteModal && factureToDelete && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md p-0 overflow-hidden">
            <div className="bg-error/10 p-4 text-center">
              <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-8 h-8 text-error" />
              </div>
              <h3 className="text-xl font-bold text-error">Confirmer la suppression</h3>
            </div>
            <div className="p-6 text-center">
              <p className="text-base-content/70">
                Voulez-vous vraiment supprimer cette facture ?
              </p>
              <p className="font-semibold text-error mt-2">
                {factureToDelete.reference}
              </p>
            </div>
            <div className="flex gap-3 p-4 bg-gray-50">
              <button
                className="btn btn-ghost flex-1"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
              >Annuler</button>
              <button
                className="btn btn-error flex-1 gap-2"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Suppression...</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Supprimer</>
                )}
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
              <div className="p-2 bg-primary/10 rounded-xl">
                <Receipt className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-primary">
                Factures
              </h1>
            </div>
            <p className="text-sm text-gray-600 ml-1">
              Gérez vos factures – {totalCount.toLocaleString('fr-FR')} facture(s)
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={refreshData}
              className="btn btn-outline btn-sm gap-2"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
            <button
              onClick={() => navigate('/factures/nouveau')}
              className="btn btn-primary btn-sm gap-2"
            >
              <Plus className="w-4 h-4" /> Nouvelle facture
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <StatCard label="Total factures" value={stats.total} color="text-primary" />
        <StatCard label="Payées" value={stats.payee} color="text-green-500" />
        <StatCard label="Part. payées" value={stats.partiellement_payee} color="text-orange-500" />
        <StatCard label="En retard" value={stats.en_retard} color="text-red-500" />
        <StatCard label="Total payé" value={formatPrice(stats.totalPaye)} color="text-success" small />
        <StatCard label="Reste à payer" value={formatPrice(stats.totalRestant)} color="text-error" small />
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par référence ou client..."
            className="input input-bordered w-full pl-9"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
          />
          {searchTerm && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle"
              onClick={() => setSearchTerm('')}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="btn btn-outline btn-sm w-full sm:hidden gap-2"
        >
          <Filter className="w-4 h-4" />
          {showMobileFilters ? 'Masquer' : 'Afficher'} les filtres
        </button>
        <div className={`${showMobileFilters ? 'grid' : 'hidden'} sm:grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3`}>
          <select
            className="select select-bordered"
            value={filterStatut}
            onChange={(e) => { setFilterStatut(e.target.value); setCurrentPage(1) }}
          >
            <option value="">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="sent">Envoyée</option>
            <option value="paid">Payée</option>
            <option value="partially_paid">Partielle</option>
            <option value="overdue">En retard</option>
            <option value="cancelled">Annulée</option>
          </select>
          <select
            className="select select-bordered"
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1) }}
          >
            <option value="">Tous les types</option>
            <option value="proforma">Proforma</option>
            <option value="finale">Finale</option>
            <option value="avoir">Avoir</option>
          </select>
          <input
            type="date"
            className="input input-bordered"
            value={dateRange.start}
            onChange={(e) => { setDateRange(prev => ({ ...prev, start: e.target.value })); setCurrentPage(1) }}
          />
          <input
            type="date"
            className="input input-bordered"
            value={dateRange.end}
            onChange={(e) => { setDateRange(prev => ({ ...prev, end: e.target.value })); setCurrentPage(1) }}
          />
          <button
            className="btn btn-outline col-span-1 sm:col-span-4 gap-2"
            onClick={() => {
              setFilterStatut('')
              setFilterType('')
              setSearchTerm('')
              setDateRange({ start: '', end: '' })
              setCurrentPage(1)
            }}
          >
            <RefreshCw className="w-4 h-4" /> Réinitialiser
          </button>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr className="bg-gray-50">
                <th>
                  <button className="flex items-center gap-1" onClick={() => handleSort('reference')}>
                    Référence <SortIcon field="reference" />
                  </button>
                </th>
                <th>
                  <button className="flex items-center gap-1" onClick={() => handleSort('client__nom')}>
                    Client <SortIcon field="client__nom" />
                  </button>
                </th>
                <th>
                  <button className="flex items-center gap-1" onClick={() => handleSort('date_facture')}>
                    Date <SortIcon field="date_facture" />
                  </button>
                </th>
                <th>
                  <button className="flex items-center gap-1" onClick={() => handleSort('date_echeance')}>
                    Échéance <SortIcon field="date_echeance" />
                  </button>
                </th>
                <th>
                  <button className="flex items-center gap-1" onClick={() => handleSort('total_ttc')}>
                    Montant <SortIcon field="total_ttc" />
                  </button>
                </th>
                <th>Payé / Reste</th>
                <th>Statut</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {factures.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-16">
                    <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500">
                      {debouncedSearch || filterStatut || filterType || dateRange.start || dateRange.end
                        ? 'Aucune facture ne correspond à vos critères'
                        : 'Aucune facture trouvée'}
                    </p>
                    <button
                      onClick={() => navigate('/factures/nouveau')}
                      className="btn btn-primary btn-sm mt-4 gap-1"
                    >
                      <Plus className="w-4 h-4" /> Créer une facture
                    </button>
                  </td>
                </tr>
              ) : (
                factures.map((facture) => (
                  <tr
                    key={facture.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/factures/${facture.id}`)}
                  >
                    <td className="font-mono text-sm">{facture.reference}</td>
                    <td>{facture.client_nom || 'Anonyme'}</td>
                    <td className="text-sm">{formatDate(facture.date_facture)}</td>
                    <td className="text-sm">{formatDate(facture.date_echeance)}</td>
                    <td className="font-semibold text-primary">
                      {formatPrice(facture.total_ttc)}
                    </td>
                    <td className="min-w-[200px]">
                      <PaymentProgressBar facture={facture} />
                    </td>
                    <td>{getStatusBadge(facture.status)}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          className="btn btn-ghost btn-xs btn-square text-info"
                          onClick={(e) => handleGeneratePDF(facture, e)}
                          disabled={generatingPDF === facture.id}
                          title="Télécharger PDF"
                        >
                          {generatingPDF === facture.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Printer className="w-4 h-4" />}
                        </button>
                        <button
                          className="btn btn-ghost btn-xs btn-square"
                          onClick={(e) => { e.stopPropagation(); navigate(`/factures/${facture.id}`) }}
                          title="Voir détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="btn btn-ghost btn-xs btn-square text-error"
                          onClick={(e) => {
                            e.stopPropagation()
                            setFactureToDelete(facture)
                            setShowDeleteModal(true)
                          }}
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ Pagination serveur */}
        {totalCount > 0 && (
          <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-gray-500">
              Affichage de{' '}
              <span className="font-semibold text-primary">
                {((currentPage - 1) * itemsPerPage) + 1}
              </span>
              {' '}à{' '}
              <span className="font-semibold text-primary">
                {Math.min(currentPage * itemsPerPage, totalCount)}
              </span>
              {' '}sur{' '}
              <span className="font-semibold">
                {totalCount.toLocaleString('fr-FR')}
              </span>{' '}
              factures
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
                <option value="5">5 / page</option>
                <option value="10">10 / page</option>
                <option value="20">20 / page</option>
                <option value="50">50 / page</option>
              </select>
              <div className="join">
                <button
                  className="join-item btn btn-sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) pageNum = i + 1
                  else if (currentPage <= 3) pageNum = i + 1
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                  else pageNum = currentPage - 2 + i
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`join-item btn btn-sm ${currentPage === pageNum ? 'btn-primary' : ''}`}
                      disabled={loading}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  className="join-item btn btn-sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || loading}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

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

// ============================================================
// StatCard
// ============================================================
const StatCard = ({ label, value, color, small = false }) => (
  <div className="card bg-white shadow-md rounded-xl p-3 text-center">
    <p className="text-xs text-gray-500">{label}</p>
    <p className={`${small ? 'text-sm' : 'text-xl'} font-bold ${color} truncate`}>
      {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
    </p>
  </div>
)

export default FacturesList