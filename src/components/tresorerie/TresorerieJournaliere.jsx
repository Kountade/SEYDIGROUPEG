// src/components/tresorerie/TresorerieJournaliere.jsx
import React, {
  useEffect, useState, useCallback, useRef, useMemo
} from 'react'
import { useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Calendar, Search, RefreshCw, Filter, X, AlertCircle, CheckCircle,
  ChevronLeft, ChevronRight, ArrowUpDown,
  Wallet, TrendingUp, TrendingDown, Loader2,
  Download, Printer, BarChart3, Activity,
  ArrowUpRight, ArrowDownLeft,
} from 'lucide-react'

const DEBOUNCE_MS = 300

const todayLocal = () => {
  const d = new Date()
  const off = d.getTimezoneOffset()
  const local = new Date(d.getTime() - off * 60 * 1000)
  return local.toISOString().split('T')[0]
}

const unwrapList = (payload) => Array.isArray(payload) ? payload : (payload?.results || [])

const TresorerieJournaliere = () => {
  const navigate = useNavigate()

  const [data, setData] = useState([])
  const [agences, setAgences] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [agenceId, setAgenceId] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [sortField, setSortField] = useState('date')
  const [sortDirection, setSortDirection] = useState('desc')

  const [stats, setStats] = useState({
    total_jours: 0, solde_moyen: 0, total_entrees: 0, total_sorties: 0, flux_total: 0,
    meilleur_jour: null, pire_jour: null,
  })

  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })
  const [showFilters, setShowFilters] = useState(false)

  const cacheRef = useRef(new Map())
  const abortRef = useRef(null)
  const notifTimerRef = useRef(null)
  // ✅ Empêche le double-mount StrictMode de relancer un fetch
  const hasFetchedOnceRef = useRef(false)

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type })
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current)
    notifTimerRef.current = setTimeout(
      () => setNotification({ show: false, message: '', type: 'success' }), 4000
    )
  }, [])

  useEffect(() => {
    return () => {
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  // ✅ Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchTerm])

  // ✅ Clé de cache dépendant UNIQUEMENT des vrais filtres
  const buildCacheKey = useCallback(() => JSON.stringify({
    page: currentPage,
    size: itemsPerPage,
    q: debouncedSearch,
    debut: dateDebut,
    fin: dateFin,
    agence: agenceId,
    sort: `${sortField}:${sortDirection}`,
  }), [currentPage, itemsPerPage, debouncedSearch, dateDebut, dateFin, agenceId, sortField, sortDirection])

  // ✅ fetchData SANS guard fetchingRef (le AbortController gère)
  const fetchData = useCallback(async ({ bypassCache = false } = {}) => {
    const key = buildCacheKey()

    // Cache hit (sauf si bypass)
    if (!bypassCache && cacheRef.current.has(key)) {
      const c = cacheRef.current.get(key)
      setData(c.results)
      setTotalCount(c.count)
      setTotalPages(c.totalPages)
      setStats(c.stats)
      setLoading(false)
      setInitialLoad(false)
      setError(null)
      return
    }

    // ✅ Abort le fetch précédent
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
      if (dateDebut) params.date_debut = dateDebut
      if (dateFin) params.date_fin = dateFin
      if (agenceId) params.agence_id = agenceId

      const response = await AxiosInstance.get('/tresorerie-journaliere/', {
        params,
        signal: controller.signal,
      })

      // ✅ Ignore si aborté entre temps
      if (controller.signal.aborted) return

      const payload = response.data
      const results = unwrapList(payload)
      const count = Array.isArray(payload) ? results.length : (payload.count ?? results.length)
      const nbPages = Math.max(1, Math.ceil(count / itemsPerPage))

      // ✅ Stats globales (2ᵉ call léger)
      let serverStats = {
        total_jours: count, solde_moyen: 0,
        total_entrees: 0, total_sorties: 0, flux_total: 0,
        meilleur_jour: null, pire_jour: null,
      }
      try {
        const allParams = {
          page: 1,
          page_size: 500,
        }
        if (debouncedSearch) allParams.search = debouncedSearch
        if (dateDebut) allParams.date_debut = dateDebut
        if (dateFin) allParams.date_fin = dateFin
        if (agenceId) allParams.agence_id = agenceId

        const allRes = await AxiosInstance.get('/tresorerie-journaliere/', {
          params: allParams,
          signal: controller.signal,
        })
        if (controller.signal.aborted) return

        const allData = unwrapList(allRes.data)
        if (allData.length > 0) {
          const totalEntrees = allData.reduce((s, r) => s + (Number(r.total_entrees) || 0), 0)
          const totalSorties = allData.reduce((s, r) => s + (Number(r.total_sorties) || 0), 0)
          const soldeMoyen = allData.reduce((s, r) => s + (Number(r.solde_fermeture) || 0), 0) / allData.length

          const sorted = [...allData].sort((a, b) => {
            const fa = (Number(a.total_entrees) || 0) - (Number(a.total_sorties) || 0)
            const fb = (Number(b.total_entrees) || 0) - (Number(b.total_sorties) || 0)
            return fb - fa
          })

          serverStats = {
            total_jours: count,
            solde_moyen: soldeMoyen,
            total_entrees: totalEntrees,
            total_sorties: totalSorties,
            flux_total: totalEntrees - totalSorties,
            meilleur_jour: sorted[0] || null,
            pire_jour: sorted.length > 1 ? sorted[sorted.length - 1] : null,
          }
        }
      } catch (statsErr) {
        // Si l'abort vient du stats fetch, on garde le résultat principal
        if (statsErr.name === 'CanceledError' || statsErr.code === 'ERR_CANCELED') {
          // Ne pas propager : le fetch principal a réussi
        } else {
          // Silencieux : les stats sont optionnelles
        }
      }

      if (controller.signal.aborted) return

      const entry = { results, count, totalPages: nbPages, stats: serverStats }
      cacheRef.current.set(key, entry)
      if (cacheRef.current.size > 20) {
        cacheRef.current.delete(cacheRef.current.keys().next().value)
      }

      setData(results)
      setTotalCount(count)
      setTotalPages(nbPages)
      setStats(serverStats)
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
      console.error('Erreur chargement trésorerie journalière:', err)
      if (err.response?.status === 401) setError('Session expirée, veuillez vous reconnecter')
      else if (err.response?.status === 403) setError("Vous n'avez pas les droits pour voir ces données")
      else setError('Erreur de chargement des données')
      showNotification('Erreur de chargement des données', 'error')
      setData([])
    } finally {
      // ✅ Ne pas écraser l'état si un nouveau fetch a pris le relais
      if (abortRef.current === controller) {
        setLoading(false)
        setInitialLoad(false)
      }
    }
  }, [buildCacheKey, currentPage, itemsPerPage, debouncedSearch, dateDebut, dateFin, agenceId, sortField, sortDirection, showNotification])

  // ✅ Chargement des agences (une seule fois)
  useEffect(() => {
    const controller = new AbortController()
    const loadAgences = async () => {
      try {
        const res = await AxiosInstance.get('/agences/', {
          params: { page_size: 200 },
          signal: controller.signal,
        })
        setAgences(unwrapList(res.data))
      } catch (_) {
        // silencieux
      }
    }
    loadAgences()
    return () => controller.abort()
  }, [])

  // ✅ DÉCLENCHEMENT AUTOMATIQUE — 1ʳᵉ fois au montage + à chaque changement de filtres
  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildCacheKey])

  // ✅ Reset page si on change itemsPerPage
  useEffect(() => {
    setCurrentPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsPerPage])

  // ✅ Responsive : change itemsPerPage, ce qui re-déclenche via buildCacheKey
  useEffect(() => {
    const handleResize = () => {
      const next =
        window.innerWidth < 640 ? 8 :
        window.innerWidth < 1024 ? 12 : 15
      setItemsPerPage(prev => prev === next ? prev : next)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const refreshData = async () => {
    cacheRef.current.clear()
    await fetchData({ bypassCache: true })
  }

  const handleReset = () => {
    setDateDebut('')
    setDateFin('')
    setAgenceId('')
    setSearchTerm('')
    setCurrentPage(1)
  }

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('asc') }
    setCurrentPage(1)
  }

  const handlePrint = () => window.print()

  const handleExport = () => {
    if (data.length === 0) {
      showNotification('Aucune donnée à exporter', 'error')
      return
    }
    const header = ['Date', 'Agence', 'Solde ouverture', 'Entrées', 'Sorties', 'Solde fermeture', 'Nb opérations']
    const rows = data.map(r => [
      r.date || '',
      r.agence_nom || '',
      r.solde_ouverture ?? 0,
      r.total_entrees ?? 0,
      r.total_sorties ?? 0,
      r.solde_fermeture ?? 0,
      r.nb_operations ?? 0,
    ])
    const csv = [header, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `tresorerie_journaliere_${todayLocal()}.csv`
    link.click()
    URL.revokeObjectURL(url)
    showNotification('Export CSV généré', 'success')
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

  const getFluxColor = (flux) => {
    const n = Number(flux) || 0
    if (n > 0) return 'text-success'
    if (n < 0) return 'text-error'
    return 'text-base-content/40'
  }

  const getFluxIcon = (flux) => {
    const n = Number(flux) || 0
    if (n > 0) return <ArrowUpRight className="w-4 h-4 text-success" />
    if (n < 0) return <ArrowDownLeft className="w-4 h-4 text-error" />
    return null
  }

  const pageTotals = useMemo(() => {
    return data.reduce((acc, r) => ({
      ouverture: acc.ouverture + (Number(r.solde_ouverture) || 0),
      entrees: acc.entrees + (Number(r.total_entrees) || 0),
      sorties: acc.sorties + (Number(r.total_sorties) || 0),
      fermeture: acc.fermeture + (Number(r.solde_fermeture) || 0),
    }), { ouverture: 0, entrees: 0, sorties: 0, fermeture: 0 })
  }, [data])

  // ---------- RENDU ----------
  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement de la trésorerie journalière...
          </p>
        </div>
      </div>
    )
  }

  if (error && data.length === 0) {
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
            📅 Trésorerie journalière
          </h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            Suivi quotidien des flux financiers ({stats.total_jours} jours enregistrés)
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button onClick={refreshData} className="btn btn-sm sm:btn-md btn-outline gap-1 sm:gap-2" disabled={loading}>
            <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Actualiser</span>
          </button>
          <button onClick={handleExport} className="btn btn-sm sm:btn-md btn-outline gap-1 sm:gap-2">
            <Download className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Exporter</span>
          </button>
          <button onClick={handlePrint} className="btn btn-sm sm:btn-md btn-outline gap-1 sm:gap-2">
            <Printer className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Imprimer</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-primary"><Calendar className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Jours</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black">{stats.total_jours}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-success"><TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Total entrées</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-success">
            {formatMontant(stats.total_entrees)}
          </div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-error"><TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Total sorties</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-error">
            {formatMontant(stats.total_sorties)}
          </div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-warning"><Activity className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Flux total</div>
          <div className={`stat-value text-lg sm:text-2xl lg:text-3xl font-black ${stats.flux_total >= 0 ? 'text-success' : 'text-error'}`}>
            {stats.flux_total >= 0 ? '+' : ''}{formatMontant(stats.flux_total)}
          </div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-info"><Wallet className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Solde moyen</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-info">
            {formatMontant(stats.solde_moyen)}
          </div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-primary"><BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Meilleur jour</div>
          <div className="stat-value text-sm sm:text-base lg:text-lg font-bold truncate">
            {stats.meilleur_jour ? formatDate(stats.meilleur_jour.date) : '-'}
          </div>
          {stats.meilleur_jour && (
            <div className="stat-desc text-xs text-success">
              +{formatMontant((Number(stats.meilleur_jour.total_entrees) || 0) - (Number(stats.meilleur_jour.total_sorties) || 0))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                <input
                  type="text"
                  placeholder="Rechercher par date, agence..."
                  className="input input-bordered w-full pl-9 text-sm"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                />
              </div>
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className="btn btn-outline btn-sm sm:hidden gap-2">
              <Filter className="w-4 h-4" /> Filtres
            </button>
          </div>

          <div className={`${showFilters ? 'flex' : 'hidden'} sm:flex flex-wrap gap-3 items-end`}>
            <div className="form-control">
              <label className="label py-0"><span className="label-text text-xs">Date début</span></label>
              <input
                type="date"
                className="input input-bordered input-sm"
                value={dateDebut}
                onChange={(e) => { setDateDebut(e.target.value); setCurrentPage(1) }}
              />
            </div>
            <div className="form-control">
              <label className="label py-0"><span className="label-text text-xs">Date fin</span></label>
              <input
                type="date"
                className="input input-bordered input-sm"
                value={dateFin}
                onChange={(e) => { setDateFin(e.target.value); setCurrentPage(1) }}
              />
            </div>
            <div className="form-control">
              <label className="label py-0"><span className="label-text text-xs">Agence</span></label>
              <select
                className="select select-bordered select-sm"
                value={agenceId}
                onChange={(e) => { setAgenceId(e.target.value); setCurrentPage(1) }}
              >
                <option value="">Toutes les agences</option>
                {agences.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
              </select>
            </div>
            <button onClick={handleReset} className="btn btn-ghost btn-sm gap-1">
              <X className="w-3 h-3" /> Réinitialiser
            </button>
          </div>
        </div>
      </div>

      <div className="bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden">
        {data.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <Calendar className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 text-base-content/30" />
            <p className="text-lg sm:text-xl font-semibold text-base-content/50">Aucune donnée trouvée</p>
            <p className="text-sm sm:text-base text-base-content/40 mt-2">
              Aucun enregistrement de trésorerie journalière
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table table-xs sm:table-sm lg:table-md w-full">
                <thead>
                  <tr className="text-xs sm:text-sm">
                    <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('date')}>Date <ArrowUpDown className="w-3 h-3" /></button></th>
                    <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('agence_nom')}>Agence <ArrowUpDown className="w-3 h-3" /></button></th>
                    <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('solde_ouverture')}>Solde ouverture <ArrowUpDown className="w-3 h-3" /></button></th>
                    <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('total_entrees')}>Entrées <ArrowUpDown className="w-3 h-3" /></button></th>
                    <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('total_sorties')}>Sorties <ArrowUpDown className="w-3 h-3" /></button></th>
                    <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('solde_fermeture')}>Solde fermeture <ArrowUpDown className="w-3 h-3" /></button></th>
                    <th>Nb opérations</th>
                    <th>Flux</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => {
                    const flux = (Number(item.total_entrees) || 0) - (Number(item.total_sorties) || 0)
                    return (
                      <tr key={item.id} className="hover">
                        <td className="font-medium text-sm whitespace-nowrap">{formatDate(item.date)}</td>
                        <td className="text-sm">{item.agence_nom || '-'}</td>
                        <td className="font-mono text-sm text-primary">{formatMontant(item.solde_ouverture)}</td>
                        <td className="font-mono text-sm text-success">+{formatMontant(item.total_entrees)}</td>
                        <td className="font-mono text-sm text-error">-{formatMontant(item.total_sorties)}</td>
                        <td className={`font-mono text-sm font-bold ${(Number(item.solde_fermeture) || 0) >= 0 ? 'text-success' : 'text-error'}`}>
                          {formatMontant(item.solde_fermeture)}
                        </td>
                        <td className="text-sm">
                          <div className="flex items-center gap-1">
                            <span className="text-success">{item.nb_entrees || 0}</span>
                            <span className="text-base-content/30">/</span>
                            <span className="text-error">{item.nb_sorties || 0}</span>
                            <span className="text-xs text-base-content/40">({item.nb_operations || 0})</span>
                          </div>
                        </td>
                        <td>
                          <div className={`flex items-center gap-1 font-bold ${getFluxColor(flux)}`}>
                            {getFluxIcon(flux)}
                            {flux >= 0 ? '+' : ''}{formatMontant(flux)}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-base-200/70 font-bold border-t-2 border-base-300">
                    <td colSpan="2" className="text-right">TOTAUX (page)</td>
                    <td className="text-primary font-mono">{formatMontant(pageTotals.ouverture)}</td>
                    <td className="text-success font-mono">+{formatMontant(pageTotals.entrees)}</td>
                    <td className="text-error font-mono">-{formatMontant(pageTotals.sorties)}</td>
                    <td className="font-mono">{formatMontant(pageTotals.fermeture)}</td>
                    <td colSpan="2">
                      <div className={`flex items-center gap-1 font-bold ${(pageTotals.entrees - pageTotals.sorties) >= 0 ? 'text-success' : 'text-error'}`}>
                        {(pageTotals.entrees - pageTotals.sorties) >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                        {(pageTotals.entrees - pageTotals.sorties) >= 0 ? '+' : ''}{formatMontant(pageTotals.entrees - pageTotals.sorties)}
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

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
                      <option value="8">8</option>
                      <option value="12">12</option>
                      <option value="15">15</option>
                      <option value="20">20</option>
                      <option value="30">30</option>
                    </select>
                    <div className="join">
                      <button
                        className="join-item btn btn-xs sm:btn-sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1 || loading}
                      >
                        <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                      {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
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

      {data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
            <h3 className="text-sm font-semibold text-base-content/60 mb-3">📊 Meilleur jour</h3>
            {stats.meilleur_jour ? (
              <div>
                <p className="text-lg font-bold">{formatDate(stats.meilleur_jour.date)}</p>
                <p className="text-sm text-success">
                  +{formatMontant((Number(stats.meilleur_jour.total_entrees) || 0) - (Number(stats.meilleur_jour.total_sorties) || 0))}
                </p>
                <p className="text-xs text-base-content/40">
                  Entrées: +{formatMontant(stats.meilleur_jour.total_entrees)} | Sorties: -{formatMontant(stats.meilleur_jour.total_sorties)}
                </p>
              </div>
            ) : <p className="text-base-content/40">Aucune donnée</p>}
          </div>

          <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
            <h3 className="text-sm font-semibold text-base-content/60 mb-3">📉 Pire jour</h3>
            {stats.pire_jour ? (
              <div>
                <p className="text-lg font-bold">{formatDate(stats.pire_jour.date)}</p>
                <p className="text-sm text-error">
                  {formatMontant((Number(stats.pire_jour.total_entrees) || 0) - (Number(stats.pire_jour.total_sorties) || 0))}
                </p>
                <p className="text-xs text-base-content/40">
                  Entrées: +{formatMontant(stats.pire_jour.total_entrees)} | Sorties: -{formatMontant(stats.pire_jour.total_sorties)}
                </p>
              </div>
            ) : <p className="text-base-content/40">Aucune donnée</p>}
          </div>

          <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
            <h3 className="text-sm font-semibold text-base-content/60 mb-3">📈 Ratio entrées/sorties</h3>
            {stats.total_sorties > 0 ? (
              <div>
                <p className="text-lg font-bold text-primary">
                  {(stats.total_entrees / stats.total_sorties).toFixed(2)}
                </p>
                <p className="text-sm text-base-content/60">
                  Pour 1 FCFA de sortie, {stats.total_entrees > 0 ? (stats.total_entrees / stats.total_sorties).toFixed(2) : '0'} FCFA d'entrée
                </p>
                <div className="mt-2 w-full bg-base-300 rounded-full h-2">
                  <div
                    className="bg-success h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((stats.total_entrees / Math.max(stats.total_sorties, 1)) * 50, 100)}%` }}
                  ></div>
                </div>
              </div>
            ) : <p className="text-base-content/40">Aucune sortie enregistrée</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export default TresorerieJournaliere