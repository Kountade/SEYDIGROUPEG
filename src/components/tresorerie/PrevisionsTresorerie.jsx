// src/components/tresorerie/PrevisionsTresorerie.jsx
import React, {
  useEffect, useState, useCallback, useRef
} from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Plus, Edit, Trash2, Search, RefreshCw, Filter, X, AlertCircle, CheckCircle,
  Eye, MoreVertical, ChevronLeft, ChevronRight, ArrowUpDown, LayoutGrid, List,
  TrendingUp, TrendingDown, Calendar, Clock, DollarSign, FileText,
  Loader2, Target, ArrowUpRight, ArrowDownLeft, AlertTriangle,
} from 'lucide-react'

const DEBOUNCE_MS = 300

const PrevisionsTresorerie = () => {
  const navigate = useNavigate()

  const [previsions, setPrevisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [stats, setStats] = useState({
    total: 0, entree: 0, sortie: 0, brouillon: 0, valide: 0, realise: 0, ecart: 0,
  })

  const [sortField, setSortField] = useState('date_debut')
  const [sortDirection, setSortDirection] = useState('asc')

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [previsionToDelete, setPrevisionToDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })
  const [viewMode, setViewMode] = useState('grid')
  const [showFilters, setShowFilters] = useState(false)

  const cacheRef = useRef(new Map())
  const fetchingRef = useRef(false)
  const abortRef = useRef(null)
  const notifTimerRef = useRef(null)

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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchTerm])

  const buildCacheKey = useCallback(() => JSON.stringify({
    page: currentPage, size: itemsPerPage, q: debouncedSearch,
    type: filterType, status: filterStatus,
    debut: dateDebut, fin: dateFin,
    sort: `${sortField}:${sortDirection}`,
  }), [currentPage, itemsPerPage, debouncedSearch, filterType, filterStatus, dateDebut, dateFin, sortField, sortDirection])

  const fetchData = useCallback(async ({ bypassCache = false } = {}) => {
    const key = buildCacheKey()
    if (!bypassCache && cacheRef.current.has(key)) {
      const c = cacheRef.current.get(key)
      setPrevisions(c.results); setTotalCount(c.count); setTotalPages(c.totalPages); setStats(c.stats)
      setLoading(false); setInitialLoad(false); setError(null)
      return
    }
    if (fetchingRef.current) return
    fetchingRef.current = true

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true); setError(null)
    try {
      const params = {
        page: currentPage, page_size: itemsPerPage,
        ordering: `${sortDirection === 'desc' ? '-' : ''}${sortField}`,
      }
      if (debouncedSearch) params.search = debouncedSearch
      if (filterType) params.type_prevision = filterType
      if (filterStatus) params.statut = filterStatus
      if (dateDebut) params.date_debut = dateDebut
      if (dateFin) params.date_fin = dateFin

      const response = await AxiosInstance.get('/previsions/', { params, signal: controller.signal })
      const payload = response.data
      const results = Array.isArray(payload) ? payload : (payload.results || [])
      const count = Array.isArray(payload) ? results.length : (payload.count ?? results.length)
      const nbPages = Math.max(1, Math.ceil(count / itemsPerPage))

      // Stats serveur
      let serverStats = { total: count, entree: 0, sortie: 0, brouillon: 0, valide: 0, realise: 0, ecart: 0 }
      try {
        const baseParams = {}
        if (debouncedSearch) baseParams.search = debouncedSearch
        if (dateDebut) baseParams.date_debut = dateDebut
        if (dateFin) baseParams.date_fin = dateFin

        const [entreeRes, sortieRes, brouillonRes, valideRes, realiseRes, ecartRes] = await Promise.all([
          AxiosInstance.get('/previsions/', { params: { ...baseParams, page_size: 1, type_prevision: 'entree' }, signal: controller.signal }),
          AxiosInstance.get('/previsions/', { params: { ...baseParams, page_size: 1, type_prevision: 'sortie' }, signal: controller.signal }),
          AxiosInstance.get('/previsions/', { params: { ...baseParams, page_size: 1, statut: 'brouillon' }, signal: controller.signal }),
          AxiosInstance.get('/previsions/', { params: { ...baseParams, page_size: 1, statut: 'valide' }, signal: controller.signal }),
          AxiosInstance.get('/previsions/', { params: { ...baseParams, page_size: 1, statut: 'realise' }, signal: controller.signal }),
          AxiosInstance.get('/previsions/', { params: { ...baseParams, page_size: 1, statut: 'ecart' }, signal: controller.signal }),
        ])
        serverStats = {
          total: count,
          entree: entreeRes.data?.count ?? 0,
          sortie: sortieRes.data?.count ?? 0,
          brouillon: brouillonRes.data?.count ?? 0,
          valide: valideRes.data?.count ?? 0,
          realise: realiseRes.data?.count ?? 0,
          ecart: ecartRes.data?.count ?? 0,
        }
      } catch (_) {}

      const entry = { results, count, totalPages: nbPages, stats: serverStats }
      cacheRef.current.set(key, entry)
      if (cacheRef.current.size > 20) cacheRef.current.delete(cacheRef.current.keys().next().value)

      setPrevisions(results); setTotalCount(count); setTotalPages(nbPages); setStats(serverStats)
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
      console.error('Erreur chargement prévisions:', err)
      if (err.response?.status === 401) setError('Session expirée, veuillez vous reconnecter')
      else if (err.response?.status === 403) setError("Vous n'avez pas les droits pour voir ces prévisions")
      else setError('Erreur de chargement des prévisions')
      showNotification('Erreur de chargement des prévisions', 'error')
      setPrevisions([])
    } finally {
      setLoading(false); setInitialLoad(false); fetchingRef.current = false
    }
  }, [buildCacheKey, currentPage, itemsPerPage, debouncedSearch, filterType, filterStatus, dateDebut, dateFin, sortField, sortDirection, showNotification])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) setItemsPerPage(6)
      else if (window.innerWidth < 1024) setItemsPerPage(9)
      else setItemsPerPage(12)
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

  const handleDelete = async () => {
    if (!previsionToDelete) return
    setDeleteLoading(true)
    try {
      await AxiosInstance.delete(`/previsions/${previsionToDelete.id}/`)
      cacheRef.current.clear()
      showNotification(`Prévision "${previsionToDelete.titre}" supprimée avec succès`, 'success')
      setShowDeleteModal(false)
      setPrevisionToDelete(null)
      await fetchData({ bypassCache: true })
    } catch (err) {
      showNotification(
        err.response?.data?.detail || err.response?.data?.error || 'Erreur lors de la suppression',
        'error'
      )
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleValider = async (prevision) => {
    if (actionLoadingId) return
    setActionLoadingId(prevision.id)

    const prevStatus = prevision.statut
    setPrevisions(prev => prev.map(p => p.id === prevision.id ? { ...p, statut: 'valide' } : p))

    try {
      await AxiosInstance.patch(`/previsions/${prevision.id}/`, { statut: 'valide' })
      cacheRef.current.clear()
      showNotification('Prévision validée avec succès', 'success')
      await fetchData({ bypassCache: true })
    } catch (err) {
      setPrevisions(prev => prev.map(p => p.id === prevision.id ? { ...p, statut: prevStatus } : p))
      showNotification(
        err.response?.data?.error || err.response?.data?.detail || 'Erreur lors de la validation',
        'error'
      )
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('asc') }
    setCurrentPage(1)
  }

  const getTypeBadge = (type) => {
    if (type === 'entree') return <span className="badge badge-success badge-sm gap-1"><TrendingUp className="w-3 h-3" /> Entrée</span>
    if (type === 'sortie') return <span className="badge badge-error badge-sm gap-1"><TrendingDown className="w-3 h-3" /> Sortie</span>
    return <span className="badge badge-ghost badge-sm">{type || 'Inconnu'}</span>
  }

  const getStatusBadge = (status) => {
    const map = {
      brouillon: <span className="badge badge-ghost badge-sm">Brouillon</span>,
      en_cours: <span className="badge badge-warning badge-sm gap-1"><Clock className="w-3 h-3" /> En cours</span>,
      valide: <span className="badge badge-info badge-sm gap-1"><CheckCircle className="w-3 h-3" /> Validée</span>,
      realise: <span className="badge badge-success badge-sm gap-1"><CheckCircle className="w-3 h-3" /> Réalisée</span>,
      annule: <span className="badge badge-ghost badge-sm gap-1"><X className="w-3 h-3" /> Annulée</span>,
      ecart: <span className="badge badge-error badge-sm gap-1"><AlertTriangle className="w-3 h-3" /> Écart</span>,
    }
    return map[status] || <span className="badge badge-ghost badge-sm">{status || 'Inconnu'}</span>
  }

  const formatMontant = (montant) => {
    const n = Number(montant)
    if (!Number.isFinite(n)) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n) + ' FCFA'
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    } catch { return '-' }
  }

  const getEcartColor = (ecart) => {
    if (!ecart) return 'text-base-content/40'
    if (ecart > 0) return 'text-success'
    if (ecart < 0) return 'text-error'
    return 'text-base-content/40'
  }

  const getEcartIcon = (ecart) => {
    if (!ecart) return null
    if (ecart > 0) return <ArrowUpRight className="w-3 h-3" />
    if (ecart < 0) return <ArrowDownLeft className="w-3 h-3" />
    return null
  }

  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement des prévisions...
          </p>
        </div>
      </div>
    )
  }

  if (error && previsions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold text-base-content mb-2">Erreur de chargement</h2>
          <p className="text-base-content/60 mb-4">{error}</p>
          <button onClick={refreshData} className="btn btn-primary gap-2">
            <RefreshCw className="w-4 h-4" /> Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      {loading && !initialLoad && (
        <div className="fixed top-20 right-6 z-40">
          <div className="bg-base-100 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border border-base-300">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span className="text-xs text-base-content/60">Chargement...</span>
          </div>
        </div>
      )}

      {notification.show && (
        <div className="fixed top-16 right-3 sm:right-6 z-50 animate-slideDown">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg text-sm sm:text-base`}>
            {notification.type === 'success'
              ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              : <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
            <span className="font-semibold">{notification.message}</span>
            <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setNotification({ ...notification, show: false })}>
              <X className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-base-content">
            📊 Prévisions de trésorerie
          </h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            Planifiez vos flux financiers ({stats.total} prévisions)
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button onClick={refreshData} className="btn btn-sm sm:btn-md btn-outline gap-1 sm:gap-2" disabled={loading}>
            <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Actualiser</span>
          </button>
          <Link to="/previsions/nouveau" className="btn btn-sm sm:btn-md btn-primary gap-1 sm:gap-2">
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Nouvelle prévision</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-primary"><Target className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Total</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black">{stats.total}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-success"><TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Entrées</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-success">{stats.entree}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-error"><TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Sorties</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-error">{stats.sortie}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-info"><CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Validées</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-info">{stats.valide}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-success"><CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Réalisées</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-success">{stats.realise}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-error"><AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Écarts</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-error">{stats.ecart}</div>
        </div>
      </div>

      <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
              <input type="text" placeholder="Rechercher par titre, référence..."
                className="input input-bordered w-full pl-9 text-sm" value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }} />
            </div>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="btn btn-outline btn-sm sm:hidden gap-2">
            <Filter className="w-4 h-4" /> Filtres
          </button>
          <div className={`${showFilters ? 'flex' : 'hidden'} sm:flex flex-wrap gap-3 items-end`}>
            <select className="select select-bordered w-full sm:w-40 text-sm" value={filterType} onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1) }}>
              <option value="">Tous types</option>
              <option value="entree">Entrée</option>
              <option value="sortie">Sortie</option>
            </select>
            <select className="select select-bordered w-full sm:w-40 text-sm" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1) }}>
              <option value="">Statut</option>
              <option value="brouillon">Brouillon</option>
              <option value="en_cours">En cours</option>
              <option value="valide">Validée</option>
              <option value="realise">Réalisée</option>
              <option value="annule">Annulée</option>
              <option value="ecart">Écart</option>
            </select>
            <div className="form-control w-full sm:w-auto">
              <label className="label py-1"><span className="label-text text-xs">Du</span></label>
              <input type="date" className="input input-bordered input-sm text-sm" value={dateDebut}
                onChange={(e) => { setDateDebut(e.target.value); setCurrentPage(1) }} />
            </div>
            <div className="form-control w-full sm:w-auto">
              <label className="label py-1"><span className="label-text text-xs">Au</span></label>
              <input type="date" className="input input-bordered input-sm text-sm" value={dateFin}
                onChange={(e) => { setDateFin(e.target.value); setCurrentPage(1) }} />
            </div>
            <button className="btn btn-outline gap-2" onClick={() => {
              setFilterType(''); setFilterStatus(''); setSearchTerm('');
              setDateDebut(''); setDateFin(''); setCurrentPage(1)
            }}>
              <Filter className="w-4 h-4" /> Réinitialiser
            </button>
            <div className="join ml-auto">
              <button className={`join-item btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('grid')}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button className={`join-item btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('table')}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden">
        {previsions.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <Target className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 text-base-content/30" />
            <p className="text-lg sm:text-xl font-semibold text-base-content/50">Aucune prévision trouvée</p>
            <Link to="/previsions/nouveau" className="btn btn-primary mt-6 gap-2">
              <Plus className="w-4 h-4" /> Créer une prévision
            </Link>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4">
            {previsions.map((p) => {
              const busy = actionLoadingId === p.id
              return (
                <div key={p.id} className="bg-base-200 rounded-xl p-4 hover:shadow-lg transition-all hover:-translate-y-1 border border-base-300">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-xl w-12 h-12 flex items-center justify-center ${p.type_prevision === 'entree' ? 'bg-success/10' : 'bg-error/10'}`}>
                        {p.type_prevision === 'entree' ? <TrendingUp className="w-6 h-6 text-success" /> : <TrendingDown className="w-6 h-6 text-error" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-base truncate max-w-[140px]">{p.titre}</h3>
                        <p className="text-xs text-base-content/50">{p.reference}</p>
                      </div>
                    </div>
                    <div className="dropdown dropdown-end">
                      <button className="btn btn-ghost btn-xs btn-circle"><MoreVertical className="w-4 h-4" /></button>
                      <ul className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-44">
                        <li><Link to={`/previsions/${p.id}`}><Eye className="w-4 h-4" /> Détails</Link></li>
                        <li><Link to={`/previsions/${p.id}/edit`}><Edit className="w-4 h-4" /> Modifier</Link></li>
                        {p.statut === 'brouillon' && (
                          <li>
                            <button onClick={() => handleValider(p)} disabled={busy}>
                              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                              Valider
                            </button>
                          </li>
                        )}
                        <li>
                          <button onClick={() => { setPrevisionToDelete(p); setShowDeleteModal(true) }} className="text-error" disabled={busy}>
                            <Trash2 className="w-4 h-4" /> Supprimer
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-success" />
                      <span className="font-bold">{formatMontant(p.montant_prevu)}</span>
                      {p.montant_reel > 0 && (
                        <span className="text-xs text-base-content/40">Réel: {formatMontant(p.montant_reel)}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {getTypeBadge(p.type_prevision)}
                      {getStatusBadge(p.statut)}
                      {p.probabilite && <span className="badge badge-ghost badge-sm">{p.probabilite}%</span>}
                    </div>
                    {p.categorie && (
                      <div className="text-xs text-base-content/50 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> {p.categorie}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-base-300 flex items-center justify-between text-xs text-base-content/40">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDate(p.date_debut)} → {formatDate(p.date_fin)}
                    </span>
                    {p.ecart !== 0 && (
                      <span className={`flex items-center gap-1 ${getEcartColor(p.ecart)}`}>
                        {getEcartIcon(p.ecart)} {formatMontant(p.ecart)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-xs sm:table-sm lg:table-md w-full">
              <thead>
                <tr className="text-xs sm:text-sm">
                  <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('reference')}>Réf. <ArrowUpDown className="w-3 h-3" /></button></th>
                  <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('titre')}>Titre <ArrowUpDown className="w-3 h-3" /></button></th>
                  <th>Type</th>
                  <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('montant_prevu')}>Prévu <ArrowUpDown className="w-3 h-3" /></button></th>
                  <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('montant_reel')}>Réel <ArrowUpDown className="w-3 h-3" /></button></th>
                  <th>Période</th>
                  <th>Statut</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {previsions.map((p) => {
                  const busy = actionLoadingId === p.id
                  return (
                    <tr key={p.id} className="hover">
                      <td className="font-mono text-xs text-primary">{p.reference}</td>
                      <td className="font-medium max-w-[120px] truncate">{p.titre}</td>
                      <td>{getTypeBadge(p.type_prevision)}</td>
                      <td className="font-bold text-success">{formatMontant(p.montant_prevu)}</td>
                      <td className="font-medium">{p.montant_reel > 0 ? formatMontant(p.montant_reel) : '-'}</td>
                      <td className="text-xs">{formatDate(p.date_debut)} → {formatDate(p.date_fin)}</td>
                      <td>{getStatusBadge(p.statut)}</td>
                      <td className="text-center">
                        <div className="flex justify-center gap-1 flex-wrap">
                          <Link to={`/previsions/${p.id}`} className="btn btn-ghost btn-xs text-info"><Eye className="w-3 h-3" /></Link>
                          <Link to={`/previsions/${p.id}/edit`} className="btn btn-ghost btn-xs text-primary"><Edit className="w-3 h-3" /></Link>
                          {p.statut === 'brouillon' && (
                            <button onClick={() => handleValider(p)} className="btn btn-ghost btn-xs text-info" disabled={busy}>
                              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                            </button>
                          )}
                          <button onClick={() => { setPrevisionToDelete(p); setShowDeleteModal(true) }} className="btn btn-ghost btn-xs text-error" disabled={busy}>
                            <Trash2 className="w-3 h-3" />
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

        {totalCount > 0 && (
          <div className="p-3 sm:p-4 border-t border-base-300">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-base-content/60 order-2 sm:order-1">
                {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} sur {totalCount}
              </div>
              <div className="flex items-center gap-2 order-1 sm:order-2">
                <select className="select select-bordered select-xs sm:select-sm" value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1) }}>
                  <option value="6">6</option>
                  <option value="9">9</option>
                  <option value="12">12</option>
                  <option value="24">24</option>
                </select>
                <div className="join">
                  <button className="join-item btn btn-xs sm:btn-sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || loading}>
                    <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  {[...Array(Math.min(3, totalPages))].map((_, i) => {
                    let pageNum
                    if (totalPages <= 3) pageNum = i + 1
                    else if (currentPage <= 2) pageNum = i + 1
                    else if (currentPage >= totalPages - 1) pageNum = totalPages - 2 + i
                    else pageNum = currentPage - 1 + i
                    return (
                      <button key={i} className={`join-item btn btn-xs sm:btn-sm ${currentPage === pageNum ? 'btn-primary' : ''}`}
                        onClick={() => setCurrentPage(pageNum)} disabled={loading}>{pageNum}</button>
                    )
                  })}
                  <button className="join-item btn btn-xs sm:btn-sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || loading}>
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showDeleteModal && previsionToDelete && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-md p-4 sm:p-6">
            <div className="text-center mb-4 sm:mb-6">
              <div className="bg-error/10 text-error rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <h3 className="font-bold text-lg sm:text-xl mb-2">Confirmer la suppression</h3>
              <p className="text-sm text-base-content/70">Voulez-vous vraiment supprimer cette prévision ?</p>
              <p className="text-base font-bold text-error mt-2">"{previsionToDelete.titre}"</p>
              <p className="text-xs text-base-content/50 mt-2">Cette action est irréversible.</p>
            </div>
            <div className="flex gap-3">
              <button className="btn btn-ghost flex-1" onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}>Annuler</button>
              <button className="btn btn-error flex-1" onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Supprimer'}
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

export default PrevisionsTresorerie