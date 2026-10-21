// src/components/comptabilite/FacturesComptables.jsx
import React, {
  useEffect, useState, useCallback, useRef
} from 'react'
import { useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Plus, Edit, Trash2, Search, RefreshCw, Filter, X, AlertCircle,
  CheckCircle, Eye, ChevronLeft, ChevronRight, ArrowUpDown,
  Receipt, FileText, Calendar, DollarSign, CreditCard,
  AlertTriangle, Send, Users, Truck, Wallet, Download, XCircle,
  Loader2,
} from 'lucide-react'

// ============================================================
// CONSTANTES
// ============================================================
const DEBOUNCE_MS = 300
const CACHE_TTL_MS = 2 * 60 * 1000  // 2 min
const CACHE_MAX = 20

// ============================================================
// CONFIGS
// ============================================================
const typeConfig = {
  client: { label: 'Client', color: 'badge-success', icon: Users },
  fournisseur: { label: 'Fournisseur', color: 'badge-warning', icon: Truck },
}

const statusConfig = {
  brouillon: { label: 'Brouillon', color: 'badge-neutral', icon: FileText },
  envoyee: { label: 'Envoyée', color: 'badge-info', icon: Send },
  recue: { label: 'Reçue', color: 'badge-info', icon: Download },
  payee: { label: 'Payée', color: 'badge-success', icon: CheckCircle },
  partielle: { label: 'Partielle', color: 'badge-warning', icon: CreditCard },
  impayee: { label: 'Impayée', color: 'badge-error', icon: AlertTriangle },
  annulee: { label: 'Annulée', color: 'badge-neutral', icon: XCircle },
}

const unwrapList = (payload) =>
  Array.isArray(payload) ? payload : (payload?.results || [])

// ============================================================
// COMPOSANT
// ============================================================
const FacturesComptables = () => {
  const navigate = useNavigate()

  // ---------- État principal ----------
  const [factures, setFactures] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState(null)

  // ---------- Filtres serveur ----------
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // ---------- Pagination serveur ----------
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // ---------- Tri serveur ----------
  const [sortField, setSortField] = useState('date_facture')
  const [sortDirection, setSortDirection] = useState('desc')

  // ---------- Stats serveur ----------
  // Format attendu : {total, client, fournisseur, brouillon, envoyee,
  //                   recue, payee, partielle, impayee, annulee,
  //                   totalMontant, totalImpaye}
  const [stats, setStats] = useState({
    total: 0, client: 0, fournisseur: 0,
    brouillon: 0, envoyee: 0, recue: 0, payee: 0,
    partielle: 0, impayee: 0, annulee: 0,
    totalMontant: 0, totalImpaye: 0,
  })

  // ---------- UI ----------
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [factureToDelete, setFactureToDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [notification, setNotification] = useState({
    show: false, message: '', type: 'success',
  })

  // ---------- Refs ----------
  const cacheRef = useRef(new Map())
  const abortRef = useRef(null)
  const notifTimerRef = useRef(null)

  // ---------- Notification ----------
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

  // ---------- Debounce search ----------
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchTerm])

  // ---------- Cache key ----------
  const buildCacheKey = useCallback(() => JSON.stringify({
    page: currentPage,
    size: itemsPerPage,
    q: debouncedSearch,
    type: filterType,
    status: filterStatus,
    sort: `${sortField}:${sortDirection}`,
  }), [currentPage, itemsPerPage, debouncedSearch, filterType,
       filterStatus, sortField, sortDirection])

  // ============================================================
  // ✅ FETCH SERVEUR — pagination + filtres + tri + stats
  // ============================================================
  const fetchData = useCallback(async ({ bypassCache = false } = {}) => {
    const key = buildCacheKey()
    if (!bypassCache && cacheRef.current.has(key)) {
      const c = cacheRef.current.get(key)
      setFactures(c.results)
      setTotalCount(c.count)
      setTotalPages(c.totalPages)
      if (c.stats) setStats(c.stats)
      setLoading(false)
      setInitialLoad(false)
      setError(null)
      return
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
      if (filterType) params.type_facture = filterType
      if (filterStatus) params.status = filterStatus

      const response = await AxiosInstance.get('/factures-comptables/', {
        params,
        signal: controller.signal,
      })

      if (controller.signal.aborted) return

      const payload = response.data
      const results = unwrapList(payload)
      const count = Array.isArray(payload)
        ? results.length
        : (payload.count ?? results.length)
      const nbPages = Math.max(1, Math.ceil(count / itemsPerPage))

      // ✅ Stats :
      // 1. Si le backend renvoie `stats` dans la réponse paginée → on l'utilise
      // 2. Sinon, fallback côté client (UNIQUEMENT sur la page courante,
      //    et SEULEMENT si aucune pagination — sinon faussé)
      let newStats
      if (payload.stats) {
        newStats = payload.stats
      } else if (!Array.isArray(payload) && payload.results) {
        // ✅ Fallback : ne calcule PAS les stats côté client si paginé
        //    (sinon faux). On laisse les stats actuelles ou vides.
        newStats = stats
      } else {
        // ✅ Vraie liste complète (pas de pagination) → calcul local OK
        newStats = computeStats(results)
      }

      const entry = { results, count, totalPages: nbPages, stats: newStats }
      cacheRef.current.set(key, entry)
      if (cacheRef.current.size > CACHE_MAX) {
        cacheRef.current.delete(cacheRef.current.keys().next().value)
      }

      setFactures(results)
      setTotalCount(count)
      setTotalPages(nbPages)
      setStats(newStats)
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
      console.error('Erreur chargement factures comptables:', err)
      if (err.response?.status === 401) {
        setError('Session expirée, veuillez vous reconnecter')
      } else if (err.response?.status === 403) {
        setError("Vous n'avez pas les droits")
      } else {
        setError('Erreur de chargement des factures comptables')
      }
      showNotification('Erreur de chargement', 'error')
      setFactures([])
    } finally {
      if (abortRef.current === controller) {
        setLoading(false)
        setInitialLoad(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildCacheKey, currentPage, itemsPerPage, debouncedSearch,
      filterType, filterStatus, sortField, sortDirection, showNotification])

  // ✅ Pattern Journaux : 1 seul useEffect
  useEffect(() => { fetchData() }, [fetchData])

  // ---------- Responsive ----------
  useEffect(() => {
    const handleResize = () => {
      const next =
        window.innerWidth < 640 ? 6 :
        window.innerWidth < 1024 ? 9 : 12
      setItemsPerPage(prev => prev === next ? prev : next)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const refreshData = async () => {
    cacheRef.current.clear()
    setCurrentPage(1)
    await fetchData({ bypassCache: true })
  }

  // ---------- Actions ----------
  const handleDelete = async () => {
    if (!factureToDelete) return
    setDeleteLoading(true)
    try {
      await AxiosInstance.delete(`/factures-comptables/${factureToDelete.id}/`)
      cacheRef.current.clear()
      showNotification(
        `Facture ${factureToDelete.reference} supprimée`, 'success'
      )
      setShowDeleteModal(false)
      setFactureToDelete(null)
      await fetchData({ bypassCache: true })
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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  // ---------- Helpers ----------
  const computeStats = (data) => {
    const total = data.length
    let client = 0, fournisseur = 0
    let brouillon = 0, envoyee = 0, recue = 0, payee = 0
    let partielle = 0, impayee = 0, annulee = 0
    let totalMontant = 0, totalImpaye = 0

    for (const f of data) {
      if (f.type_facture === 'client') client++
      else if (f.type_facture === 'fournisseur') fournisseur++

      switch (f.status) {
        case 'brouillon': brouillon++; break
        case 'envoyee': envoyee++; break
        case 'recue': recue++; break
        case 'payee': payee++; break
        case 'partielle': partielle++; break
        case 'impayee': impayee++; break
        case 'annulee': annulee++; break
      }

      totalMontant += parseFloat(f.montant_ttc) || 0
      if (f.status === 'impayee' || f.status === 'partielle') {
        totalImpaye += parseFloat(f.montant_restant) || 0
      }
    }

    return {
      total, client, fournisseur,
      brouillon, envoyee, recue, payee,
      partielle, impayee, annulee,
      totalMontant, totalImpaye,
    }
  }

  const getTypeBadge = (type) => {
    const cfg = typeConfig[type] || typeConfig.client
    return (
      <span className={`badge ${cfg.color} gap-1 text-xs border-0`}>
        {cfg.label}
      </span>
    )
  }

  const getStatusBadge = (status) => {
    const cfg = statusConfig[status] || statusConfig.brouillon
    const Icon = cfg.icon
    return (
      <span className={`badge ${cfg.color} gap-1 text-xs border-0`}>
        <Icon className="w-3 h-3" /> {cfg.label}
      </span>
    )
  }

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'XOF',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try { return new Date(dateString).toLocaleDateString('fr-FR') }
    catch { return 'N/A' }
  }

  // ---------- Loading plein écran (1 seule fois) ----------
  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-base-200">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement des factures comptables...
          </p>
        </div>
      </div>
    )
  }

  if (error && factures.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-base-200">
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
  // RENDU
  // ============================================================
  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 bg-base-200 min-h-screen">
      {/* Overlay léger en actualisation */}
      {loading && !initialLoad && (
        <div className="fixed top-20 right-6 z-40">
          <div className="bg-base-100 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border border-base-300">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span className="text-xs text-base-content/60">Actualisation...</span>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification.show && (
        <div className="fixed top-16 right-3 sm:right-6 z-50 animate-slideDown">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg`}>
            {notification.type === 'success'
              ? <CheckCircle className="w-4 h-4" />
              : <AlertCircle className="w-4 h-4" />}
            <span className="font-semibold">{notification.message}</span>
            <button
              className="btn btn-ghost btn-xs btn-circle"
              onClick={() => setNotification({ ...notification, show: false })}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Factures comptables
          </h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            Gérez vos factures clients et fournisseurs ({totalCount} au total)
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={refreshData}
            className="btn btn-sm sm:btn-md btn-outline gap-1"
            disabled={loading}
          >
            <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Actualiser</span>
          </button>
          <button
            onClick={() => navigate('/factures-comptables/nouveau')}
            className="btn btn-sm sm:btn-md btn-primary gap-1"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Nouvelle facture</span>
          </button>
        </div>
      </div>

      {/* Cartes stats (si stats serveur dispo) */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 lg:gap-4">
          <StatCard label="Total" value={stats.total} icon={Receipt} color="text-primary" />
          <StatCard label="Clients" value={stats.client} icon={Users} color="text-success" />
          <StatCard label="Fournisseurs" value={stats.fournisseur} icon={Truck} color="text-warning" />
          <StatCard label="Payées" value={stats.payee} icon={CheckCircle} color="text-success" />
          <StatCard label="Partielles" value={stats.partielle} icon={CreditCard} color="text-warning" />
          <StatCard label="Impayées" value={stats.impayee} icon={AlertTriangle} color="text-error" />
          <StatCard
            label="Impayé"
            value={formatCurrency(stats.totalImpaye)}
            icon={DollarSign}
            color="text-info"
            small
          />
        </div>
      )}

      {/* Filtres */}
      <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
              <input
                type="text"
                placeholder="Rechercher par référence, client ou fournisseur..."
                className="input input-bordered w-full pl-9 text-sm"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
              />
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-outline btn-sm sm:hidden gap-2"
          >
            <Filter className="w-4 h-4" /> Filtres
          </button>
          <div className={`${showFilters ? 'flex' : 'hidden'} sm:flex flex-wrap gap-3`}>
            <select
              className="select select-bordered w-full sm:w-36 text-sm"
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1) }}
            >
              <option value="">Tous types</option>
              <option value="client">Client</option>
              <option value="fournisseur">Fournisseur</option>
            </select>
            <select
              className="select select-bordered w-full sm:w-40 text-sm"
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1) }}
            >
              <option value="">Tous statuts</option>
              <option value="brouillon">Brouillon</option>
              <option value="envoyee">Envoyée</option>
              <option value="recue">Reçue</option>
              <option value="payee">Payée</option>
              <option value="partielle">Partielle</option>
              <option value="impayee">Impayée</option>
              <option value="annulee">Annulée</option>
            </select>
            <button
              className="btn btn-outline gap-2"
              onClick={() => {
                setFilterType(''); setFilterStatus('')
                setSearchTerm(''); setCurrentPage(1)
              }}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Réinitialiser</span>
            </button>
          </div>
        </div>
      </div>

      {/* Liste */}
      <div className="bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden">
        {factures.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <Receipt className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 text-base-content/30" />
            <p className="text-lg sm:text-xl font-semibold text-base-content/50">
              Aucune facture trouvée
            </p>
            <button
              className="btn btn-primary mt-6 gap-2"
              onClick={() => navigate('/factures-comptables/nouveau')}
            >
              <Plus className="w-4 h-4" /> Nouvelle facture
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table table-xs sm:table-sm lg:table-md w-full">
                <thead>
                  <tr className="text-xs sm:text-sm">
                    <th>
                      <button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('reference')}>
                        Réf. <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th>
                      <button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('type_facture')}>
                        Type <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th>Client/Fournisseur</th>
                    <th>
                      <button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('date_facture')}>
                        Date <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th>
                      <button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('montant_ttc')}>
                        Montant <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th>
                      <button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('montant_restant')}>
                        Restant <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th>Statut</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {factures.map((facture) => (
                    <tr key={facture.id} className="hover">
                      <td className="font-mono text-xs text-primary">{facture.reference}</td>
                      <td>{getTypeBadge(facture.type_facture)}</td>
                      <td>
                        <div className="font-medium text-sm truncate max-w-[150px]">
                          {facture.client_nom || facture.fournisseur_nom || '-'}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 text-xs">
                          <Calendar className="w-3 h-3 text-base-content/40" />
                          {formatDate(facture.date_facture)}
                        </div>
                      </td>
                      <td className="font-semibold text-sm">{formatCurrency(facture.montant_ttc)}</td>
                      <td className={`font-semibold text-sm ${facture.montant_restant > 0 ? 'text-error' : 'text-success'}`}>
                        {formatCurrency(facture.montant_restant)}
                      </td>
                      <td>{getStatusBadge(facture.status)}</td>
                      <td className="text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => navigate(`/factures-comptables/${facture.id}`)}
                            className="btn btn-ghost btn-xs text-info"
                            title="Voir"
                          ><Eye className="w-3 h-3" /></button>
                          <button
                            onClick={() => navigate(`/factures-comptables/${facture.id}/modifier`)}
                            className="btn btn-ghost btn-xs text-primary"
                            title="Modifier"
                            disabled={facture.status === 'payee' || facture.status === 'annulee'}
                          ><Edit className="w-3 h-3" /></button>
                          <button
                            onClick={() => navigate(`/factures-comptables/${facture.id}/paiement`)}
                            className="btn btn-ghost btn-xs text-success"
                            title="Paiement"
                            disabled={facture.status === 'payee' || facture.status === 'annulee'}
                          ><Wallet className="w-3 h-3" /></button>
                          <button
                            onClick={() => {
                              setFactureToDelete(facture)
                              setShowDeleteModal(true)
                            }}
                            className="btn btn-ghost btn-xs text-error"
                            title="Supprimer"
                            disabled={facture.status !== 'brouillon'}
                          ><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ✅ Pagination serveur */}
            {totalCount > 0 && (
              <div className="p-3 sm:p-4 border-t border-base-300">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs sm:text-sm text-base-content/60 order-2 sm:order-1">
                    {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} sur {totalCount}
                  </div>
                  <div className="flex items-center gap-2 order-1 sm:order-2">
                    <select
                      className="select select-bordered select-xs sm:select-sm"
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(parseInt(e.target.value))
                        setCurrentPage(1)
                      }}
                    >
                      <option value="6">6</option>
                      <option value="9">9</option>
                      <option value="12">12</option>
                      <option value="24">24</option>
                      <option value="48">48</option>
                    </select>
                    <div className="join">
                      <button
                        className="join-item btn btn-xs sm:btn-sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1 || loading}
                      >
                        <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                      {[...Array(Math.min(3, totalPages))].map((_, i) => {
                        let pageNum
                        if (totalPages <= 3) pageNum = i + 1
                        else if (currentPage <= 2) pageNum = i + 1
                        else if (currentPage >= totalPages - 1) pageNum = totalPages - 2 + i
                        else pageNum = currentPage - 1 + i
                        return (
                          <button
                            key={i}
                            className={`join-item btn btn-xs sm:btn-sm ${currentPage === pageNum ? 'btn-primary' : ''}`}
                            onClick={() => setCurrentPage(pageNum)}
                            disabled={loading}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                      <button
                        className="join-item btn btn-xs sm:btn-sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || loading}
                      >
                        <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal suppression */}
      {showDeleteModal && factureToDelete && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-md">
            <div className="text-center mb-4">
              <div className="bg-error/10 text-error rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg mb-2">Confirmer la suppression</h3>
              <p className="text-sm text-base-content/70">
                Voulez-vous vraiment supprimer cette facture ?
              </p>
              <p className="text-base font-bold text-error mt-2">
                "{factureToDelete.reference}"
              </p>
              {factureToDelete.status !== 'brouillon' && (
                <p className="text-xs text-warning mt-2">
                  ⚠️ Seules les factures en brouillon peuvent être supprimées.
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                className="btn btn-ghost flex-1"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
              >Annuler</button>
              <button
                className="btn btn-error flex-1"
                onClick={handleDelete}
                disabled={deleteLoading || factureToDelete.status !== 'brouillon'}
              >
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
      `}</style>
    </div>
  )
}

// ============================================================
// Petit composant StatCard
// ============================================================
const StatCard = ({ label, value, icon: Icon, color, small = false }) => (
  <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
    <div className={`stat-figure ${color}`}>
      <Icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
    </div>
    <div className="stat-title text-xs sm:text-sm font-semibold">{label}</div>
    <div className={`stat-value ${small ? 'text-xs sm:text-sm lg:text-base' : 'text-lg sm:text-2xl lg:text-3xl'} font-black truncate`}>
      {value}
    </div>
  </div>
)

export default FacturesComptables