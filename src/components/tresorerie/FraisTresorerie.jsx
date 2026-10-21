// src/components/tresorerie/FraisTresorerie.jsx
import React, {
  useEffect, useState, useCallback, useRef, useMemo
} from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Plus, Edit, Trash2, Search, RefreshCw, Filter, X, AlertCircle, CheckCircle,
  Eye, MoreVertical, ChevronLeft, ChevronRight, ArrowUpDown, LayoutGrid, List,
  Receipt, DollarSign, Clock, Calendar, User, FileText, Loader2,
  Truck, Utensils, Briefcase, Phone, Home, Wrench, Coffee, Plane,
  GraduationCap, Landmark, ShoppingBag, Shield, XCircle
} from 'lucide-react'

const DEBOUNCE_MS = 300

const FraisTresorerie = () => {
  const navigate = useNavigate()

  const [frais, setFrais] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [stats, setStats] = useState({
    total: 0, brouillon: 0, en_attente: 0, valide: 0, paye: 0,
  })

  const [sortField, setSortField] = useState('date_frais')
  const [sortDirection, setSortDirection] = useState('desc')

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [fraisToDelete, setFraisToDelete] = useState(null)
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
    cat: filterCategory, status: filterStatus,
    debut: dateDebut, fin: dateFin,
    sort: `${sortField}:${sortDirection}`,
  }), [currentPage, itemsPerPage, debouncedSearch, filterCategory, filterStatus, dateDebut, dateFin, sortField, sortDirection])

  const fetchData = useCallback(async ({ bypassCache = false } = {}) => {
    const key = buildCacheKey()
    if (!bypassCache && cacheRef.current.has(key)) {
      const c = cacheRef.current.get(key)
      setFrais(c.results); setTotalCount(c.count); setTotalPages(c.totalPages); setStats(c.stats)
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
      if (filterCategory) params.categorie = filterCategory
      if (filterStatus) params.status = filterStatus
      if (dateDebut) params.date_debut = dateDebut
      if (dateFin) params.date_fin = dateFin

      const response = await AxiosInstance.get('/frais/', { params, signal: controller.signal })
      const payload = response.data
      const results = Array.isArray(payload) ? payload : (payload.results || [])
      const count = Array.isArray(payload) ? results.length : (payload.count ?? results.length)
      const nbPages = Math.max(1, Math.ceil(count / itemsPerPage))

      // Stats serveur : 4 count en parallèle
      let serverStats = { total: count, brouillon: 0, en_attente: 0, valide: 0, paye: 0 }
      try {
        const baseParams = {}
        if (debouncedSearch) baseParams.search = debouncedSearch
        if (dateDebut) baseParams.date_debut = dateDebut
        if (dateFin) baseParams.date_fin = dateFin

        const statuses = ['brouillon', 'en_attente', 'valide', 'paye']
        const responses = await Promise.all(statuses.map(s =>
          AxiosInstance.get('/frais/', {
            params: { ...baseParams, page_size: 1, status: s },
            signal: controller.signal,
          })
        ))
        serverStats = { total: count }
        statuses.forEach((s, i) => { serverStats[s] = responses[i].data?.count ?? 0 })
      } catch (_) {}

      const entry = { results, count, totalPages: nbPages, stats: serverStats }
      cacheRef.current.set(key, entry)
      if (cacheRef.current.size > 20) cacheRef.current.delete(cacheRef.current.keys().next().value)

      setFrais(results); setTotalCount(count); setTotalPages(nbPages); setStats(serverStats)
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
      console.error('Erreur chargement frais:', err)
      if (err.response?.status === 401) setError('Session expirée, veuillez vous reconnecter')
      else if (err.response?.status === 403) setError("Vous n'avez pas les droits pour voir ces frais")
      else setError('Erreur de chargement des frais')
      showNotification('Erreur de chargement des frais', 'error')
      setFrais([])
    } finally {
      setLoading(false); setInitialLoad(false); fetchingRef.current = false
    }
  }, [buildCacheKey, currentPage, itemsPerPage, debouncedSearch, filterCategory, filterStatus, dateDebut, dateFin, sortField, sortDirection, showNotification])

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
    if (!fraisToDelete) return
    setDeleteLoading(true)
    try {
      await AxiosInstance.delete(`/frais/${fraisToDelete.id}/`)
      cacheRef.current.clear()
      showNotification(`Frais "${fraisToDelete.titre}" supprimé avec succès`, 'success')
      setShowDeleteModal(false)
      setFraisToDelete(null)
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

  const handleAction = async (fraisItem, action) => {
    if (actionLoadingId) return
    setActionLoadingId(fraisItem.id)

    const prevStatus = fraisItem.status
    const optimisticStatus = action === 'valider' ? 'valide' : 'paye'
    setFrais(prev => prev.map(f => f.id === fraisItem.id ? { ...f, status: optimisticStatus } : f))

    try {
      await AxiosInstance.post(`/frais/${fraisItem.id}/${action}/`)
      cacheRef.current.clear()
      showNotification(
        action === 'valider' ? 'Frais validé avec succès' : 'Frais payé avec succès',
        'success'
      )
      await fetchData({ bypassCache: true })
    } catch (err) {
      setFrais(prev => prev.map(f => f.id === fraisItem.id ? { ...f, status: prevStatus } : f))
      showNotification(
        err.response?.data?.error || err.response?.data?.detail ||
        (action === 'valider' ? 'Erreur lors de la validation' : 'Erreur lors du paiement'),
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

  const getCategoryIcon = (category) => {
    const icons = {
      transport: <Truck className="w-4 h-4" />,
      restauration: <Utensils className="w-4 h-4" />,
      fournitures: <Briefcase className="w-4 h-4" />,
      communication: <Phone className="w-4 h-4" />,
      entretien: <Wrench className="w-4 h-4" />,
      formation: <GraduationCap className="w-4 h-4" />,
      mission: <Plane className="w-4 h-4" />,
      representations: <Coffee className="w-4 h-4" />,
      assurances: <Shield className="w-4 h-4" />,
      impots: <Landmark className="w-4 h-4" />,
      loyer: <Home className="w-4 h-4" />,
      services: <ShoppingBag className="w-4 h-4" />,
      autre: <FileText className="w-4 h-4" />,
    }
    return icons[category] || <FileText className="w-4 h-4" />
  }

  const getCategoryBadge = (category) => {
    const colors = {
      transport: 'badge-info', restauration: 'badge-warning',
      fournitures: 'badge-primary', communication: 'badge-secondary',
      entretien: 'badge-neutral', formation: 'badge-accent',
      mission: 'badge-info', representations: 'badge-warning',
      assurances: 'badge-success', impots: 'badge-error',
      loyer: 'badge-primary', services: 'badge-secondary', autre: 'badge-ghost',
    }
    return (
      <span className={`badge ${colors[category] || 'badge-ghost'} badge-sm gap-1`}>
        {getCategoryIcon(category)}
        {category || 'Autre'}
      </span>
    )
  }

  const getStatusBadge = (status) => {
    const map = {
      brouillon: <span className="badge badge-ghost badge-sm">Brouillon</span>,
      en_attente: <span className="badge badge-warning badge-sm gap-1"><Clock className="w-3 h-3" /> En attente</span>,
      valide: <span className="badge badge-info badge-sm gap-1"><CheckCircle className="w-3 h-3" /> Validé</span>,
      paye: <span className="badge badge-success badge-sm gap-1"><CheckCircle className="w-3 h-3" /> Payé</span>,
      refuse: <span className="badge badge-error badge-sm gap-1"><XCircle className="w-3 h-3" /> Refusé</span>,
      annule: <span className="badge badge-ghost badge-sm gap-1"><X className="w-3 h-3" /> Annulé</span>,
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

  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement des frais...
          </p>
        </div>
      </div>
    )
  }

  if (error && frais.length === 0) {
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
            📄 Frais
          </h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            Gérez vos frais et dépenses ({stats.total} au total)
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button onClick={refreshData} className="btn btn-sm sm:btn-md btn-outline gap-1 sm:gap-2" disabled={loading}>
            <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Actualiser</span>
          </button>
          <Link to="/frais/nouveau" className="btn btn-sm sm:btn-md btn-primary gap-1 sm:gap-2">
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Nouveau frais</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-primary"><Receipt className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Total</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black">{stats.total}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-warning"><Clock className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">En attente</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-warning">{stats.en_attente}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-info"><CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Validés</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-info">{stats.valide}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-success"><DollarSign className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Payés</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-success">{stats.paye}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-error"><FileText className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Brouillons</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-error">{stats.brouillon}</div>
        </div>
      </div>

      <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
              <input type="text" placeholder="Rechercher par titre, référence, bénéficiaire..."
                className="input input-bordered w-full pl-9 text-sm" value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }} />
            </div>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="btn btn-outline btn-sm sm:hidden gap-2">
            <Filter className="w-4 h-4" /> Filtres
          </button>
          <div className={`${showFilters ? 'flex' : 'hidden'} sm:flex flex-wrap gap-3 items-end`}>
            <select className="select select-bordered w-full sm:w-44 text-sm" value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1) }}>
              <option value="">Toutes catégories</option>
              <option value="transport">Transport</option>
              <option value="restauration">Restauration</option>
              <option value="fournitures">Fournitures de bureau</option>
              <option value="communication">Communication</option>
              <option value="entretien">Entretien</option>
              <option value="formation">Formation</option>
              <option value="mission">Mission</option>
              <option value="representations">Représentation</option>
              <option value="assurances">Assurances</option>
              <option value="impots">Impôts et taxes</option>
              <option value="loyer">Loyer</option>
              <option value="services">Services</option>
              <option value="autre">Autre</option>
            </select>
            <select className="select select-bordered w-full sm:w-36 text-sm" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1) }}>
              <option value="">Statut</option>
              <option value="brouillon">Brouillon</option>
              <option value="en_attente">En attente</option>
              <option value="valide">Validé</option>
              <option value="paye">Payé</option>
              <option value="refuse">Refusé</option>
              <option value="annule">Annulé</option>
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
              setFilterCategory(''); setFilterStatus(''); setSearchTerm('');
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
        {frais.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <Receipt className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 text-base-content/30" />
            <p className="text-lg sm:text-xl font-semibold text-base-content/50">Aucun frais trouvé</p>
            <Link to="/frais/nouveau" className="btn btn-primary mt-6 gap-2">
              <Plus className="w-4 h-4" /> Créer un frais
            </Link>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4">
            {frais.map((f) => {
              const busy = actionLoadingId === f.id
              return (
                <div key={f.id} className="bg-base-200 rounded-xl p-4 hover:shadow-lg transition-all hover:-translate-y-1 border border-base-300">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 rounded-xl w-12 h-12 flex items-center justify-center">
                        {getCategoryIcon(f.categorie)}
                      </div>
                      <div>
                        <h3 className="font-bold text-base truncate max-w-[140px]">{f.titre}</h3>
                        <p className="text-xs text-base-content/50">{f.reference}</p>
                      </div>
                    </div>
                    <div className="dropdown dropdown-end">
                      <button className="btn btn-ghost btn-xs btn-circle"><MoreVertical className="w-4 h-4" /></button>
                      <ul className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-44">
                        <li><Link to={`/frais/${f.id}`}><Eye className="w-4 h-4" /> Détails</Link></li>
                        <li><Link to={`/frais/${f.id}/edit`}><Edit className="w-4 h-4" /> Modifier</Link></li>
                        {f.status === 'en_attente' && (
                          <li>
                            <button onClick={() => handleAction(f, 'valider')} disabled={busy}>
                              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                              Valider
                            </button>
                          </li>
                        )}
                        {f.status === 'valide' && (
                          <li>
                            <button onClick={() => handleAction(f, 'payer')} disabled={busy}>
                              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                              Payer
                            </button>
                          </li>
                        )}
                        <li>
                          <button onClick={() => { setFraisToDelete(f); setShowDeleteModal(true) }} className="text-error" disabled={busy}>
                            <Trash2 className="w-4 h-4" /> Supprimer
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-sm text-base-content/70">
                      <DollarSign className="w-4 h-4 text-success" />
                      <span className="font-bold">{formatMontant(f.montant)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {getCategoryBadge(f.categorie)}
                      {getStatusBadge(f.status)}
                    </div>
                    {f.beneficiaire && (
                      <div className="text-xs text-base-content/50 flex items-center gap-1">
                        <User className="w-3 h-3" /> {f.beneficiaire}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-base-300 flex items-center justify-between text-xs text-base-content/40">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(f.date_frais)}</span>
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
                  <th>Catégorie</th>
                  <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('montant')}>Montant <ArrowUpDown className="w-3 h-3" /></button></th>
                  <th>Bénéficiaire</th>
                  <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('date_frais')}>Date <ArrowUpDown className="w-3 h-3" /></button></th>
                  <th>Statut</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {frais.map((f) => {
                  const busy = actionLoadingId === f.id
                  return (
                    <tr key={f.id} className="hover">
                      <td className="font-mono text-xs text-primary">{f.reference}</td>
                      <td className="font-medium max-w-[120px] truncate">{f.titre}</td>
                      <td>{getCategoryBadge(f.categorie)}</td>
                      <td className="font-bold text-success">{formatMontant(f.montant)}</td>
                      <td className="text-sm max-w-[100px] truncate">{f.beneficiaire || '-'}</td>
                      <td className="text-xs">{formatDate(f.date_frais)}</td>
                      <td>{getStatusBadge(f.status)}</td>
                      <td className="text-center">
                        <div className="flex justify-center gap-1 flex-wrap">
                          <Link to={`/frais/${f.id}`} className="btn btn-ghost btn-xs text-info"><Eye className="w-3 h-3" /></Link>
                          <Link to={`/frais/${f.id}/edit`} className="btn btn-ghost btn-xs text-primary"><Edit className="w-3 h-3" /></Link>
                          {f.status === 'en_attente' && (
                            <button onClick={() => handleAction(f, 'valider')} className="btn btn-ghost btn-xs text-info" disabled={busy}>
                              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                            </button>
                          )}
                          {f.status === 'valide' && (
                            <button onClick={() => handleAction(f, 'payer')} className="btn btn-ghost btn-xs text-success" disabled={busy}>
                              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <DollarSign className="w-3 h-3" />}
                            </button>
                          )}
                          <button onClick={() => { setFraisToDelete(f); setShowDeleteModal(true) }} className="btn btn-ghost btn-xs text-error" disabled={busy}>
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

      {showDeleteModal && fraisToDelete && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-md p-4 sm:p-6">
            <div className="text-center mb-4 sm:mb-6">
              <div className="bg-error/10 text-error rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <h3 className="font-bold text-lg sm:text-xl mb-2">Confirmer la suppression</h3>
              <p className="text-sm text-base-content/70">Voulez-vous vraiment supprimer ce frais ?</p>
              <p className="text-base font-bold text-error mt-2">"{fraisToDelete.titre}"</p>
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

export default FraisTresorerie