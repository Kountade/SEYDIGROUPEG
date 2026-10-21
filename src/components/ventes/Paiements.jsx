// src/components/paiements/Paiements.jsx
import React, {
  useEffect, useState, useCallback, useRef,
} from 'react'
import { useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import { downloadPaiementPDF } from './PaiementPdf'
import {
  Plus, Edit, Trash2, Search, RefreshCw, Filter, CreditCard,
  X, AlertCircle, CheckCircle, Eye, MoreVertical, ChevronLeft,
  ChevronRight, ArrowUpDown, LayoutGrid, List, Calendar,
  DollarSign, Clock, XCircle, FileText, Download, Receipt, Loader2,
} from 'lucide-react'

// ============================================================
// CONSTANTES
// ============================================================
const DEBOUNCE_MS = 300
const CACHE_TTL_MS = 2 * 60 * 1000
const CACHE_MAX = 20

const methodesPaiement = {
  especes: 'Espèces',
  carte: 'Carte bancaire',
  cheque: 'Chèque',
  virement: 'Virement',
  mobile_money: 'Mobile Money',
  autre: 'Autre',
}

const statutsPaiement = {
  pending: 'En attente',
  completed: 'Complété',
  failed: 'Échoué',
  refunded: 'Remboursé',
}

const unwrap = (payload) =>
  Array.isArray(payload) ? payload : (payload?.results || [])

// ============================================================
// COMPOSANT
// ============================================================
const Paiements = () => {
  const navigate = useNavigate()

  // ---------- État principal ----------
  const [paiements, setPaiements] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState(null)

  // ---------- Filtres serveur ----------
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterMethode, setFilterMethode] = useState('')
  const [filterStatut, setFilterStatut] = useState('')

  // ---------- Pagination serveur ----------
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // ---------- Tri serveur ----------
  const [sortField, setSortField] = useState('date_paiement')
  const [sortDirection, setSortDirection] = useState('desc')

  // ---------- UI ----------
  const [viewMode, setViewMode] = useState('table')
  const [showFilters, setShowFilters] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [paiementToDelete, setPaiementToDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [pdfLoadingId, setPdfLoadingId] = useState(null)
  const [notification, setNotification] = useState({
    show: false, message: '', type: 'success',
  })

  // ---------- Stats ----------
  const [stats, setStats] = useState({
    total: 0, total_montant: 0, montant_jour: 0,
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
    methode: filterMethode,
    statut: filterStatut,
    sort: `${sortField}:${sortDirection}`,
  }), [currentPage, itemsPerPage, debouncedSearch, filterMethode,
       filterStatut, sortField, sortDirection])

  // ============================================================
  // FETCH PRINCIPAL
  // ============================================================
  const fetchData = useCallback(async ({ bypassCache = false } = {}) => {
    const key = buildCacheKey()

    if (!bypassCache) {
      const cached = cacheGet(key)
      if (cached) {
        setPaiements(cached.results)
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
      if (filterMethode) params.methode = filterMethode
      if (filterStatut) params.statut = filterStatut

      const response = await AxiosInstance.get('/paiements/', {
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

      setPaiements(results)
      setTotalCount(count)
      setTotalPages(nbPages)
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
      console.error('Erreur chargement paiements:', err)
      if (err.response?.status === 401) {
        setError('Session expirée, veuillez vous reconnecter')
      } else if (err.response?.status === 403) {
        setError("Vous n'avez pas les droits")
      } else {
        setError('Erreur de chargement des paiements')
      }
      showNotification('Erreur de chargement', 'error')
      setPaiements([])
    } finally {
      if (abortRef.current === controller) {
        setLoading(false)
        setInitialLoad(false)
      }
    }
  }, [buildCacheKey, currentPage, itemsPerPage, debouncedSearch,
      filterMethode, filterStatut, sortField, sortDirection,
      showNotification, cacheGet, cacheSet])

  // ✅ UN SEUL useEffect
  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildCacheKey])

  // ============================================================
  // FETCH STATS (serveur)
  // ============================================================
  const fetchStats = useCallback(async () => {
    try {
      const res = await AxiosInstance.get('/paiements/stats/')
      const d = res.data || {}
      setStats({
        total: d.total || 0,
        total_montant: parseFloat(d.total_montant) || 0,
        montant_jour: parseFloat(d.montant_jour) || 0,
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
      fetchData({ bypassCache: true }),
      fetchStats(),
    ])
  }

  // ============================================================
  // ACTIONS
  // ============================================================
  const handleDelete = async () => {
    if (!paiementToDelete) return
    setDeleteLoading(true)
    try {
      await AxiosInstance.delete(`/paiements/${paiementToDelete.id}/`)
      cacheRef.current.clear()
      showNotification(
        `Paiement ${paiementToDelete.reference} supprimé`, 'success'
      )
      setShowDeleteModal(false)
      setPaiementToDelete(null)
      await Promise.all([
        fetchData({ bypassCache: true }),
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

  const handleDownloadPDF = async (paiement, id) => {
    setPdfLoadingId(id)
    try {
      const cacheKey = `paiement_detail_${id}`
      let data = cacheGet(cacheKey)?.value
      if (!data) {
        const res = await AxiosInstance.get(`/paiements/${id}/`)
        data = res.data
        cacheRef.current.set(cacheKey, {
          value: data,
          expiresAt: Date.now() + CACHE_TTL_MS,
        })
      }
      await downloadPaiementPDF(data)
      showNotification('Reçu PDF généré avec succès', 'success')
    } catch (err) {
      console.error(err)
      showNotification('Erreur lors de la génération du PDF', 'error')
    } finally {
      setPdfLoadingId(null)
    }
  }

  const handleViewDetail = (id) => navigate(`/paiements/${id}`)

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

  // ============================================================
  // HELPERS RENDU
  // ============================================================
  const formatPrice = (v) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
  }

  const formatDate = (date) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }

  const getStatutBadge = (statut) => {
    const config = {
      completed: { class: 'badge-success', icon: CheckCircle, label: 'Complété' },
      pending: { class: 'badge-warning', icon: Clock, label: 'En attente' },
      failed: { class: 'badge-error', icon: XCircle, label: 'Échoué' },
      refunded: { class: 'badge-info', icon: RefreshCw, label: 'Remboursé' },
    }
    const { class: bgClass, icon: Icon, label } = config[statut] || config.completed
    return (
      <div className={`badge ${bgClass} gap-1 text-xs`}>
        <Icon className="w-3 h-3" /> {label}
      </div>
    )
  }

  const getFactureRef = (paiement) =>
    paiement.facture_ref || paiement.facture?.reference || '-'

  const getClientName = (paiement) => {
    if (paiement.facture_client_nom && paiement.facture_client_nom !== 'Anonyme')
      return paiement.facture_client_nom
    if (paiement.client_nom && paiement.client_nom !== 'Anonyme')
      return paiement.client_nom
    return 'Anonyme'
  }

  // ============================================================
  // LOADING / ERROR
  // ============================================================
  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-6">
          <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
          <p className="text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement des paiements...
          </p>
        </div>
      </div>
    )
  }

  if (error && paiements.length === 0) {
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
    <div className="space-y-6 p-4 lg:p-6">
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
        <div className="fixed top-20 right-6 z-50 animate-slideDown max-w-md">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg`}>
            {notification.type === 'success'
              ? <CheckCircle className="w-5 h-5 flex-shrink-0" />
              : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span className="font-semibold whitespace-pre-line">{notification.message}</span>
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
            Paiements
          </h1>
          <p className="text-base text-base-content/60">
            Gestion des encaissements et reçus — {totalCount.toLocaleString('fr-FR')} paiement(s)
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={refreshData} className="btn btn-outline gap-2" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <button onClick={() => navigate('/paiements/nouveau')} className="btn btn-primary gap-2">
            <Plus className="w-4 h-4" /> Nouveau paiement
          </button>
        </div>
      </div>

      {/* Stats serveur */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total encaissé"
          value={formatPrice(stats.total_montant)}
          description={`${stats.total.toLocaleString('fr-FR')} transactions`}
          icon={CreditCard}
          color="text-primary"
        />
        <StatCard
          title="Aujourd'hui"
          value={formatPrice(stats.montant_jour)}
          icon={Calendar}
          color="text-success"
        />
        <StatCard
          title="Moyenne par paiement"
          value={
            stats.total > 0
              ? formatPrice(stats.total_montant / stats.total)
              : '0 FCFA'
          }
          icon={DollarSign}
          color="text-info"
        />
      </div>

      {/* Filtres */}
      <div className="bg-base-100 rounded-xl shadow-md border border-base-300 p-4 lg:p-6">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
            <input
              type="text"
              placeholder="Rechercher par référence, client, facture..."
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
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-outline btn-sm lg:hidden gap-2"
          >
            <Filter className="w-4 h-4" /> Filtres
          </button>
          <div className={`${showFilters ? 'flex' : 'hidden'} lg:flex flex-wrap items-center gap-3`}>
            <select
              className="select select-bordered select-sm w-44"
              value={filterMethode}
              onChange={(e) => { setFilterMethode(e.target.value); setCurrentPage(1) }}
            >
              <option value="">Toutes méthodes</option>
              {Object.entries(methodesPaiement).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              className="select select-bordered select-sm w-40"
              value={filterStatut}
              onChange={(e) => { setFilterStatut(e.target.value); setCurrentPage(1) }}
            >
              <option value="">Tous statuts</option>
              {Object.entries(statutsPaiement).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <button
              className="btn btn-sm btn-ghost gap-1"
              onClick={() => {
                setFilterMethode('')
                setFilterStatut('')
                setSearchTerm('')
                setCurrentPage(1)
              }}
            >
              <X className="w-4 h-4" /> Réinitialiser
            </button>
            <div className="join ml-auto">
              <button
                className={`join-item btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                className={`join-item btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('table')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden">
        {paiements.length === 0 ? (
          <div className="text-center py-16">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-base-content/30" />
            <p className="text-lg font-semibold text-base-content/50">
              {debouncedSearch || filterMethode || filterStatut
                ? 'Aucun paiement ne correspond à vos critères'
                : 'Aucun paiement trouvé'}
            </p>
            <button
              className="btn btn-primary mt-6 gap-2"
              onClick={() => navigate('/paiements/nouveau')}
            >
              <Plus className="w-4 h-4" /> Nouveau paiement
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 p-6">
            {paiements.map(p => (
              <div
                key={p.id}
                className="bg-base-200 rounded-2xl p-5 hover:shadow-md transition-all border border-base-300"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-mono font-bold text-lg">{p.reference}</div>
                    <div className="text-xs text-base-content/50">
                      {formatDate(p.date_paiement)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleViewDetail(p.id)}
                      className="btn btn-ghost btn-sm btn-circle text-primary"
                      title="Détails"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(p, p.id)}
                      className="btn btn-ghost btn-sm btn-circle text-info"
                      title="PDF"
                      disabled={pdfLoadingId === p.id}
                    >
                      {pdfLoadingId === p.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Download className="w-4 h-4" />}
                    </button>
                    <div className="dropdown dropdown-end">
                      <button className="btn btn-ghost btn-sm btn-circle">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      <ul className="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-2xl w-44">
                        <li>
                          <button onClick={() => navigate(`/paiements/${p.id}/edit`)}>
                            <Edit className="w-4 h-4" /> Modifier
                          </button>
                        </li>
                        <li>
                          <button
                            className="text-error"
                            onClick={() => {
                              setPaiementToDelete(p)
                              setShowDeleteModal(true)
                            }}
                          >
                            <Trash2 className="w-4 h-4" /> Supprimer
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-2xl font-bold text-primary">
                    <DollarSign className="w-5 h-5" /> {formatPrice(p.montant)}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="w-4 h-4" /> {methodesPaiement[p.methode] || p.methode}
                  </div>
                  <div className="flex items-center gap-2 text-sm truncate">
                    <FileText className="w-4 h-4 text-base-content/50" />
                    Facture: {getFactureRef(p)}
                  </div>
                  <div className="flex items-center gap-2 text-sm truncate">
                    <Receipt className="w-4 h-4 text-base-content/50" />
                    {getClientName(p)}
                  </div>
                </div>
                <div className="mt-4 pt-3 flex justify-between items-center border-t border-base-300/50">
                  {getStatutBadge(p.statut)}
                  {p.reference_externe && (
                    <span className="text-xs text-base-content/40">
                      Ref: {p.reference_externe}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead className="bg-base-200">
                <tr>
                  <th>
                    <button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('reference')}>
                      Référence <SortIcon field="reference" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                  </th>
                  <th>
                    <button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('date_paiement')}>
                      Date <SortIcon field="date_paiement" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                  </th>
                  <th>Client</th>
                  <th>Facture</th>
                  <th className="text-right">
                    <button className="flex items-center gap-1 hover:text-primary ml-auto" onClick={() => handleSort('montant')}>
                      Montant <SortIcon field="montant" sortField={sortField} sortDirection={sortDirection} />
                    </button>
                  </th>
                  <th>Méthode</th>
                  <th>Statut</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paiements.map(p => (
                  <tr key={p.id} className="hover">
                    <td className="font-mono font-medium">{p.reference}</td>
                    <td>{formatDate(p.date_paiement)}</td>
                    <td>{getClientName(p)}</td>
                    <td className="font-mono">{getFactureRef(p)}</td>
                    <td className="text-right font-semibold">{formatPrice(p.montant)}</td>
                    <td>{methodesPaiement[p.methode] || p.methode}</td>
                    <td>{getStatutBadge(p.statut)}</td>
                    <td className="text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => handleViewDetail(p.id)}
                          className="btn btn-ghost btn-xs"
                          title="Détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(p, p.id)}
                          className="btn btn-ghost btn-xs text-info"
                          title="PDF"
                          disabled={pdfLoadingId === p.id}
                        >
                          {pdfLoadingId === p.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Download className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => navigate(`/paiements/${p.id}/edit`)}
                          className="btn btn-ghost btn-xs text-primary"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setPaiementToDelete(p)
                            setShowDeleteModal(true)
                          }}
                          className="btn btn-ghost btn-xs text-error"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ✅ Pagination serveur */}
        {totalCount > 0 && (
          <div className="p-4 border-t border-base-300">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-base-content/60 order-2 sm:order-1">
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
                paiements
              </div>
              <div className="flex items-center gap-2 order-1 sm:order-2">
                <select
                  className="select select-bordered select-sm"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(parseInt(e.target.value))
                    setCurrentPage(1)
                  }}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
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
                        className={`join-item btn btn-sm ${currentPage === pageNum ? 'btn-primary' : ''}`}
                        onClick={() => setCurrentPage(pageNum)}
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
          </div>
        )}
      </div>

      {/* Modal suppression */}
      {showDeleteModal && paiementToDelete && (
        <div className="modal modal-open">
          <div className="modal-box rounded-2xl">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-error mx-auto mb-3" />
              <h3 className="font-bold text-xl">Confirmer la suppression</h3>
              <p className="py-4">
                Supprimer définitivement le paiement{' '}
                <span className="font-bold">{paiementToDelete.reference}</span> ?
              </p>
              <div className="flex gap-3">
                <button
                  className="btn btn-ghost flex-1"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteLoading}
                >
                  Annuler
                </button>
                <button
                  className="btn btn-error flex-1"
                  onClick={handleDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Suppression...</>
                  ) : 'Supprimer'}
                </button>
              </div>
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

// ============================================================
// Composants helpers
// ============================================================
const StatCard = ({ title, value, description, icon: Icon, color }) => (
  <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300 p-4">
    <div className={`stat-figure ${color}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div className="stat-title text-sm font-semibold">{title}</div>
    <div className="stat-value text-2xl font-black truncate">{value}</div>
    {description && <div className="stat-desc text-sm">{description}</div>}
  </div>
)

const SortIcon = ({ field, sortField, sortDirection }) => {
  if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />
  return sortDirection === 'asc'
    ? <ChevronRight className="w-3 h-3 rotate-[-90deg]" />
    : <ChevronRight className="w-3 h-3 rotate-90" />
}

export default Paiements