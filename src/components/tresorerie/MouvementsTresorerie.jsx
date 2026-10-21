// src/components/tresorerie/MouvementsTresorerie.jsx
import React, {
  useEffect, useState, useCallback, useRef, useMemo
} from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Plus, Edit, Trash2, Search, RefreshCw, Filter, X, AlertCircle, CheckCircle,
  Eye, ChevronLeft, ChevronRight, ArrowUpDown, ArrowLeftRight,
  Clock, TrendingUp, TrendingDown, Loader2, Calendar, XCircle
} from 'lucide-react'

const DEBOUNCE_MS = 300

const MouvementsTresorerie = () => {
  const navigate = useNavigate()

  // ---------- État principal ----------
  const [mouvements, setMouvements] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState(null)

  // ---------- Filtres serveur ----------
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  // ---------- Pagination serveur ----------
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // ---------- Stats serveur ----------
  const [stats, setStats] = useState({
    total: 0, encaissements: 0, decaissements: 0, transferts: 0, en_attente: 0,
  })

  // ---------- Tri serveur ----------
  const [sortField, setSortField] = useState('date_mouvement')
  const [sortDirection, setSortDirection] = useState('desc')

  // ---------- UI ----------
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [mouvementToDelete, setMouvementToDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })
  const [showFilters, setShowFilters] = useState(false)

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
    debut: dateDebut,
    fin: dateFin,
    sort: `${sortField}:${sortDirection}`,
  }), [currentPage, itemsPerPage, debouncedSearch, filterType, filterStatus, dateDebut, dateFin, sortField, sortDirection])

  // ---------- Fetch principal ----------
  const fetchData = useCallback(async ({ bypassCache = false } = {}) => {
    const key = buildCacheKey()

    if (!bypassCache && cacheRef.current.has(key)) {
      const c = cacheRef.current.get(key)
      setMouvements(c.results)
      setTotalCount(c.count)
      setTotalPages(c.totalPages)
      setStats(c.stats)
      setLoading(false)
      setInitialLoad(false)
      setError(null)
      return
    }

    // ✅ Abort le fetch précédent (remplace le guard fetchingRef)
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
      if (filterType) params.type_mouvement = filterType
      if (filterStatus) params.status = filterStatus
      if (dateDebut) params.date_debut = dateDebut
      if (dateFin) params.date_fin = dateFin

      const response = await AxiosInstance.get('/mouvements/', {
        params, signal: controller.signal,
      })

      // ✅ Ignore si aborté entre temps
      if (controller.signal.aborted) return

      const payload = response.data
      const results = Array.isArray(payload) ? payload : (payload.results || [])
      const count = Array.isArray(payload) ? results.length : (payload.count ?? results.length)
      const nbPages = Math.max(1, Math.ceil(count / itemsPerPage))

      // ✅ Stats serveur : 4 count légers en parallèle
      let serverStats = { total: count, encaissements: 0, decaissements: 0, transferts: 0, en_attente: 0 }
      try {
        const baseParams = {}
        if (debouncedSearch) baseParams.search = debouncedSearch
        if (dateDebut) baseParams.date_debut = dateDebut
        if (dateFin) baseParams.date_fin = dateFin

        const [encRes, decRes, trfRes, attRes] = await Promise.all([
          AxiosInstance.get('/mouvements/', {
            params: { ...baseParams, page_size: 1, type_mouvement: 'encaissement' },
            signal: controller.signal,
          }),
          AxiosInstance.get('/mouvements/', {
            params: { ...baseParams, page_size: 1, type_mouvement: 'decaissement' },
            signal: controller.signal,
          }),
          AxiosInstance.get('/mouvements/', {
            params: { ...baseParams, page_size: 1, type_mouvement: 'transfert' },
            signal: controller.signal,
          }),
          AxiosInstance.get('/mouvements/', {
            params: { ...baseParams, page_size: 1, status: 'en_attente' },
            signal: controller.signal,
          }),
        ])
        if (controller.signal.aborted) return
        serverStats = {
          total: count,
          encaissements: encRes.data?.count ?? 0,
          decaissements: decRes.data?.count ?? 0,
          transferts: trfRes.data?.count ?? 0,
          en_attente: attRes.data?.count ?? 0,
        }
      } catch (statsErr) {
        // Si l'abort vient du stats fetch, on garde le résultat principal
        if (statsErr.name !== 'CanceledError' && statsErr.code !== 'ERR_CANCELED') {
          // Silencieux : les stats sont optionnelles
        }
      }

      if (controller.signal.aborted) return

      const entry = { results, count, totalPages: nbPages, stats: serverStats }
      cacheRef.current.set(key, entry)
      if (cacheRef.current.size > 20) {
        cacheRef.current.delete(cacheRef.current.keys().next().value)
      }

      setMouvements(results)
      setTotalCount(count)
      setTotalPages(nbPages)
      setStats(serverStats)
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
      console.error('Erreur chargement mouvements:', err)
      if (err.response?.status === 401) setError('Session expirée, veuillez vous reconnecter')
      else if (err.response?.status === 403) setError("Vous n'avez pas les droits pour voir ces mouvements")
      else setError('Erreur de chargement des mouvements')
      showNotification('Erreur de chargement des mouvements', 'error')
      setMouvements([])
    } finally {
      // ✅ Ne pas écraser l'état si un nouveau fetch a pris le relais
      if (abortRef.current === controller) {
        setLoading(false)
        setInitialLoad(false)
      }
    }
  }, [buildCacheKey, currentPage, itemsPerPage, debouncedSearch, filterType, filterStatus, dateDebut, dateFin, sortField, sortDirection, showNotification])

  // ✅ DÉCLENCHEMENT AUTOMATIQUE — uniquement quand les VRAIS filtres changent
  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildCacheKey])

  // ✅ Reset page si on change itemsPerPage
  useEffect(() => {
    setCurrentPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsPerPage])

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
    if (!mouvementToDelete) return
    setDeleteLoading(true)
    try {
      await AxiosInstance.delete(`/mouvements/${mouvementToDelete.id}/`)
      cacheRef.current.clear()
      showNotification('Mouvement supprimé avec succès', 'success')
      setShowDeleteModal(false)
      setMouvementToDelete(null)
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

  // ✅ Optimistic update pour valider/annuler
  const handleAction = async (mouvement, action) => {
    if (actionLoadingId) return
    setActionLoadingId(mouvement.id)

    const prevStatus = mouvement.status
    const optimisticStatus = action === 'valider' ? 'effectue' : 'annule'

    setMouvements(prev => prev.map(m =>
      m.id === mouvement.id ? { ...m, status: optimisticStatus } : m
    ))

    try {
      await AxiosInstance.post(`/mouvements/${mouvement.id}/${action}/`)
      cacheRef.current.clear()
      showNotification(
        action === 'valider' ? 'Mouvement validé avec succès' : 'Mouvement annulé avec succès',
        'success'
      )
      await fetchData({ bypassCache: true })
    } catch (err) {
      setMouvements(prev => prev.map(m =>
        m.id === mouvement.id ? { ...m, status: prevStatus } : m
      ))
      showNotification(
        err.response?.data?.error || err.response?.data?.detail ||
        (action === 'valider' ? 'Erreur lors de la validation' : "Erreur lors de l'annulation"),
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

  // ---------- Helpers ----------
  const getTypeBadge = (type) => {
    if (type === 'encaissement') return <span className="badge badge-success badge-sm gap-1"><TrendingUp className="w-3 h-3" /> Encaissement</span>
    if (type === 'decaissement') return <span className="badge badge-error badge-sm gap-1"><TrendingDown className="w-3 h-3" /> Décaissement</span>
    if (type === 'transfert') return <span className="badge badge-info badge-sm gap-1"><ArrowLeftRight className="w-3 h-3" /> Transfert</span>
    return <span className="badge badge-ghost badge-sm">{type || 'Inconnu'}</span>
  }

  const getStatusBadge = (status) => {
    const map = {
      effectue: <span className="badge badge-success badge-sm gap-1"><CheckCircle className="w-3 h-3" /> Effectué</span>,
      planifie: <span className="badge badge-warning badge-sm gap-1"><Clock className="w-3 h-3" /> Planifié</span>,
      en_attente: <span className="badge badge-info badge-sm gap-1"><Clock className="w-3 h-3" /> En attente</span>,
      annule: <span className="badge badge-ghost badge-sm gap-1"><X className="w-3 h-3" /> Annulé</span>,
      rejete: <span className="badge badge-error badge-sm gap-1"><XCircle className="w-3 h-3" /> Rejeté</span>,
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
        hour: '2-digit', minute: '2-digit',
      })
    } catch { return '-' }
  }

  // ---------- Premier chargement ----------
  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement des mouvements...
          </p>
        </div>
      </div>
    )
  }

  if (error && mouvements.length === 0) {
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

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-base-content">
            🔄 Mouvements de trésorerie
          </h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            Gérez tous les mouvements financiers ({stats.total} au total)
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button onClick={refreshData} className="btn btn-sm sm:btn-md btn-outline gap-1 sm:gap-2" disabled={loading}>
            <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Actualiser</span>
          </button>
          <Link to="/mouvements/nouveau" className="btn btn-sm sm:btn-md btn-success gap-1 sm:gap-2">
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Nouveau mouvement</span>
          </Link>
        </div>
      </div>

      {/* Stats serveur */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-primary"><ArrowLeftRight className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Total</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black">{stats.total}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-success"><TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Encaissements</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-success">{stats.encaissements}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-error"><TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Décaissements</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-error">{stats.decaissements}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-info"><ArrowLeftRight className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Transferts</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-info">{stats.transferts}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-warning"><Clock className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">En attente</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-warning">{stats.en_attente}</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
              <input
                type="text"
                placeholder="Rechercher par libellé, référence..."
                className="input input-bordered w-full pl-9 text-sm"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
              />
            </div>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="btn btn-outline btn-sm sm:hidden gap-2">
            <Filter className="w-4 h-4" /> Filtres {showFilters ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          <div className={`${showFilters ? 'flex' : 'hidden'} sm:flex flex-wrap gap-3 items-end`}>
            <select className="select select-bordered w-full sm:w-40 text-sm" value={filterType} onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1) }}>
              <option value="">Tous types</option>
              <option value="encaissement">Encaissement</option>
              <option value="decaissement">Décaissement</option>
              <option value="transfert">Transfert</option>
            </select>
            <select className="select select-bordered w-full sm:w-36 text-sm" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1) }}>
              <option value="">Statut</option>
              <option value="effectue">Effectué</option>
              <option value="planifie">Planifié</option>
              <option value="en_attente">En attente</option>
              <option value="annule">Annulé</option>
              <option value="rejete">Rejeté</option>
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
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-xs sm:table-sm lg:table-md w-full">
            <thead>
              <tr className="text-xs sm:text-sm">
                <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('reference')}>Réf. <ArrowUpDown className="w-3 h-3" /></button></th>
                <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('date_mouvement')}>Date <ArrowUpDown className="w-3 h-3" /></button></th>
                <th>Type</th>
                <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('libelle')}>Libellé <ArrowUpDown className="w-3 h-3" /></button></th>
                <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('montant')}>Montant <ArrowUpDown className="w-3 h-3" /></button></th>
                <th>Source</th>
                <th>Statut</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mouvements.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-base-content/60">
                    <ArrowLeftRight className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    Aucun mouvement trouvé
                  </td>
                </tr>
              ) : (
                mouvements.map((m) => {
                  const busy = actionLoadingId === m.id
                  return (
                    <tr key={m.id} className="hover">
                      <td className="font-mono text-xs text-primary">{m.reference || '-'}</td>
                      <td className="text-xs whitespace-nowrap">{formatDate(m.date_mouvement)}</td>
                      <td>{getTypeBadge(m.type_mouvement)}</td>
                      <td className="text-sm max-w-[150px] truncate" title={m.libelle}>{m.libelle || '-'}</td>
                      <td className={`font-mono font-bold whitespace-nowrap ${m.type_mouvement === 'encaissement' ? 'text-success' : m.type_mouvement === 'decaissement' ? 'text-error' : ''}`}>
                        {m.type_mouvement === 'encaissement' ? '+' : m.type_mouvement === 'decaissement' ? '-' : ''}
                        {formatMontant(m.montant)}
                      </td>
                      <td className="text-xs">
                        {m.source_reference
                          ? <span className="badge badge-ghost badge-xs">{m.source_reference}</span>
                          : '-'}
                      </td>
                      <td>{getStatusBadge(m.status)}</td>
                      <td className="text-center">
                        <div className="flex justify-center gap-1 flex-wrap">
                          <Link to={`/mouvements/${m.id}`} className="btn btn-ghost btn-xs text-info">
                            <Eye className="w-3 h-3" />
                          </Link>
                          <Link to={`/mouvements/${m.id}/edit`} className="btn btn-ghost btn-xs text-primary">
                            <Edit className="w-3 h-3" />
                          </Link>
                          {m.status === 'en_attente' && (
                            <button
                              onClick={() => handleAction(m, 'valider')}
                              className="btn btn-ghost btn-xs text-success"
                              disabled={busy}
                              title="Valider"
                            >
                              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                            </button>
                          )}
                          {(m.status === 'en_attente' || m.status === 'planifie') && (
                            <button
                              onClick={() => handleAction(m, 'annuler')}
                              className="btn btn-ghost btn-xs text-warning"
                              disabled={busy}
                              title="Annuler"
                            >
                              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                            </button>
                          )}
                          <button
                            onClick={() => { setMouvementToDelete(m); setShowDeleteModal(true) }}
                            className="btn btn-ghost btn-xs text-error"
                            disabled={busy}
                            title="Supprimer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination serveur */}
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
                  onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1) }}
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
      </div>

      {/* Modal Suppression */}
      {showDeleteModal && mouvementToDelete && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-md p-4 sm:p-6">
            <div className="text-center mb-4 sm:mb-6">
              <div className="bg-error/10 text-error rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <h3 className="font-bold text-lg sm:text-xl mb-2">Confirmer la suppression</h3>
              <p className="text-sm text-base-content/70">Voulez-vous vraiment supprimer ce mouvement ?</p>
              <p className="text-base font-bold text-error mt-2">"{mouvementToDelete.reference || mouvementToDelete.libelle}"</p>
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

export default MouvementsTresorerie