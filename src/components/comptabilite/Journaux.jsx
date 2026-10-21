// src/components/comptabilite/Journaux.jsx
import React, {
  useEffect, useState, useCallback, useRef, useMemo
} from 'react'
import { useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Plus, Edit, Trash2, Search, RefreshCw, Filter, X, AlertCircle,
  CheckCircle, Eye, ChevronLeft, ChevronRight, ArrowUpDown,
  BookOpen, FileText, Building2, Calendar, Clock, LayoutGrid, List,
  Settings, Shield, Layers, Loader2,
} from 'lucide-react'

const DEBOUNCE_MS = 300
const CACHE_TTL_MS = 2 * 60 * 1000

const typeConfig = {
  achats: { label: 'Achats', color: 'badge-info', icon: FileText },
  ventes: { label: 'Ventes', color: 'badge-success', icon: FileText },
  banque: { label: 'Banque', color: 'badge-primary', icon: Building2 },
  caisse: { label: 'Caisse', color: 'badge-warning', icon: Layers },
  od: { label: 'Opérations diverses', color: 'badge-secondary', icon: Settings },
  inventaire: { label: 'Inventaire', color: 'badge-neutral', icon: LayoutGrid },
  paie: { label: 'Paie', color: 'badge-error', icon: Calendar },
  immobilisations: { label: 'Immobilisations', color: 'badge-accent', icon: Shield },
}

const unwrapList = (payload) =>
  Array.isArray(payload) ? payload : (payload?.results || [])

const Journaux = () => {
  const navigate = useNavigate()

  // ---------- État principal ----------
  const [journaux, setJournaux] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState(null)

  // ---------- Filtres serveur ----------
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterAgence, setFilterAgence] = useState('')

  // ---------- Pagination serveur ----------
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // ---------- Tri serveur ----------
  const [sortField, setSortField] = useState('code')
  const [sortDirection, setSortDirection] = useState('asc')

  // ---------- UI ----------
  const [agences, setAgences] = useState([])
  const [viewMode, setViewMode] = useState('grid')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [journalToDelete, setJournalToDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
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
    agence: filterAgence,
    sort: `${sortField}:${sortDirection}`,
  }), [currentPage, itemsPerPage, debouncedSearch, filterType, filterAgence, sortField, sortDirection])

  // ---------- Fetch serveur ----------
  const fetchData = useCallback(async ({ bypassCache = false } = {}) => {
    const key = buildCacheKey()
    if (!bypassCache && cacheRef.current.has(key)) {
      const c = cacheRef.current.get(key)
      setJournaux(c.results)
      setTotalCount(c.count)
      setTotalPages(c.totalPages)
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
      if (filterType) params.type_journal = filterType
      if (filterAgence) params.agence_id = filterAgence

      const response = await AxiosInstance.get('/journaux/', {
        params,
        signal: controller.signal,
      })

      if (controller.signal.aborted) return

      const payload = response.data
      const results = unwrapList(payload)
      const count = Array.isArray(payload) ? results.length : (payload.count ?? results.length)
      const nbPages = Math.max(1, Math.ceil(count / itemsPerPage))

      const entry = { results, count, totalPages: nbPages }
      cacheRef.current.set(key, entry)
      if (cacheRef.current.size > 20) {
        cacheRef.current.delete(cacheRef.current.keys().next().value)
      }

      setJournaux(results)
      setTotalCount(count)
      setTotalPages(nbPages)
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
      console.error('Erreur chargement journaux:', err)
      if (err.response?.status === 401) setError('Session expirée, veuillez vous reconnecter')
      else if (err.response?.status === 403) setError("Vous n'avez pas les droits")
      else setError('Erreur de chargement des journaux')
      showNotification('Erreur de chargement', 'error')
      setJournaux([])
    } finally {
      if (abortRef.current === controller) {
        setLoading(false)
        setInitialLoad(false)
      }
    }
  }, [buildCacheKey, currentPage, itemsPerPage, debouncedSearch, filterType, filterAgence, sortField, sortDirection, showNotification])

  useEffect(() => { fetchData() }, [fetchData])

  // ---------- Chargement des agences (1 seule fois) ----------
  useEffect(() => {
    const controller = new AbortController()
    AxiosInstance.get('/agences/', { params: { page_size: 200 }, signal: controller.signal })
      .then(res => setAgences(unwrapList(res.data)))
      .catch(() => {})
    return () => controller.abort()
  }, [])

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
    if (!journalToDelete) return
    setDeleteLoading(true)
    try {
      await AxiosInstance.delete(`/journaux/${journalToDelete.id}/`)
      cacheRef.current.clear()
      showNotification(`Journal ${journalToDelete.code} supprimé`, 'success')
      setShowDeleteModal(false)
      setJournalToDelete(null)
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

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('asc') }
    setCurrentPage(1)
  }

  // ---------- Helpers ----------
  const getTypeBadge = (type) => {
    const cfg = typeConfig[type] || typeConfig.od
    return (
      <span className={`badge ${cfg.color} gap-1 text-xs border-0`}>
        {cfg.label}
      </span>
    )
  }

  const getTypeIcon = (type) => {
    const cfg = typeConfig[type] || typeConfig.od
    const Icon = cfg.icon || FileText
    return <Icon className="w-4 h-4" />
  }

  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-base-200">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement des journaux...
          </p>
        </div>
      </div>
    )
  }

  if (error && journaux.length === 0) {
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

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 bg-base-200 min-h-screen">
      {/* Spinner overlay */}
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
            {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="font-semibold">{notification.message}</span>
            <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setNotification({ ...notification, show: false })}>
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Journaux comptables
          </h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            Gérez vos journaux comptables ({totalCount} au total)
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button onClick={refreshData} className="btn btn-sm sm:btn-md btn-outline gap-1" disabled={loading}>
            <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Actualiser</span>
          </button>
          <button
            onClick={() => navigate('/journaux/nouveau')}
            className="btn btn-sm sm:btn-md btn-primary gap-1 sm:gap-2"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Nouveau journal</span>
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                <input
                  type="text"
                  placeholder="Rechercher par code ou nom..."
                  className="input input-bordered w-full pl-9 text-sm"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                />
              </div>
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className="btn btn-outline btn-sm sm:hidden gap-2">
              <Filter className="w-4 h-4" /> Filtres
            </button>
            <div className={`${showFilters ? 'flex' : 'hidden'} sm:flex flex-wrap gap-3`}>
              <select
                className="select select-bordered w-full sm:w-40 text-sm"
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1) }}
              >
                <option value="">Tous types</option>
                <option value="achats">Achats</option>
                <option value="ventes">Ventes</option>
                <option value="banque">Banque</option>
                <option value="caisse">Caisse</option>
                <option value="od">Opérations diverses</option>
                <option value="inventaire">Inventaire</option>
                <option value="paie">Paie</option>
                <option value="immobilisations">Immobilisations</option>
              </select>
              <select
                className="select select-bordered w-full sm:w-48 text-sm"
                value={filterAgence}
                onChange={(e) => { setFilterAgence(e.target.value); setCurrentPage(1) }}
              >
                <option value="">Toutes agences</option>
                {agences.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
              </select>
              <button
                className="btn btn-outline gap-2"
                onClick={() => { setFilterType(''); setFilterAgence(''); setSearchTerm(''); setCurrentPage(1) }}
              >
                <Filter className="w-4 h-4" /> <span className="hidden sm:inline">Réinitialiser</span>
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
      </div>

      {/* Grille / Tableau */}
      <div className="bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden">
        {journaux.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <BookOpen className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 text-base-content/30" />
            <p className="text-lg sm:text-xl font-semibold text-base-content/50">Aucun journal trouvé</p>
            <button className="btn btn-primary mt-6 gap-2" onClick={() => navigate('/journaux/nouveau')}>
              <Plus className="w-4 h-4" /> Nouveau journal
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 sm:p-6">
            {journaux.map((journal) => (
              <div key={journal.id} className="bg-base-200/50 rounded-xl p-4 border border-base-300 hover:shadow-lg transition-all hover:border-primary/30">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {getTypeIcon(journal.type_journal)}
                    </div>
                    <div>
                      <h3 className="font-mono font-bold text-primary text-sm">{journal.code}</h3>
                      <p className="text-xs text-base-content/60 truncate max-w-[150px]">{journal.nom}</p>
                    </div>
                  </div>
                  {journal.is_default && <span className="badge badge-primary badge-xs">Défaut</span>}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/60">Type</span>
                    {getTypeBadge(journal.type_journal)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/60">Agence</span>
                    <span className="font-medium text-xs">{journal.agence_nom || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/60">Écritures</span>
                    <span className="font-bold text-primary">{journal.ecritures_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/60">Statut</span>
                    <span className={`badge ${journal.is_active ? 'badge-success' : 'badge-error'} badge-xs`}>
                      {journal.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1 mt-4 pt-3 border-t border-base-300">
                  <button onClick={() => navigate(`/journaux/${journal.id}/modifier`)} className="btn btn-ghost btn-xs text-primary" title="Modifier">
                    <Edit className="w-3 h-3" />
                  </button>
                  <button onClick={() => navigate(`/journaux/${journal.id}/ecritures`)} className="btn btn-ghost btn-xs text-info" title="Écritures">
                    <Eye className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => { setJournalToDelete(journal); setShowDeleteModal(true) }}
                    className="btn btn-ghost btn-xs text-error"
                    disabled={journal.ecritures_count > 0}
                    title="Supprimer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-xs sm:table-sm w-full">
              <thead>
                <tr>
                  <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('code')}>Code <ArrowUpDown className="w-3 h-3" /></button></th>
                  <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('nom')}>Nom <ArrowUpDown className="w-3 h-3" /></button></th>
                  <th>Type</th>
                  <th>Agence</th>
                  <th className="text-right">Écritures</th>
                  <th>Statut</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {journaux.map(j => (
                  <tr key={j.id} className="hover">
                    <td className="font-mono text-xs text-primary">{j.code}</td>
                    <td className="font-medium">{j.nom}</td>
                    <td>{getTypeBadge(j.type_journal)}</td>
                    <td className="text-sm">{j.agence_nom || '-'}</td>
                    <td className="text-right font-bold text-primary">{j.ecritures_count || 0}</td>
                    <td>
                      <span className={`badge ${j.is_active ? 'badge-success' : 'badge-error'} badge-xs`}>
                        {j.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => navigate(`/journaux/${j.id}/modifier`)} className="btn btn-ghost btn-xs text-primary"><Edit className="w-3 h-3" /></button>
                        <button onClick={() => navigate(`/journaux/${j.id}/ecritures`)} className="btn btn-ghost btn-xs text-info"><Eye className="w-3 h-3" /></button>
                        <button
                          onClick={() => { setJournalToDelete(j); setShowDeleteModal(true) }}
                          className="btn btn-ghost btn-xs text-error"
                          disabled={j.ecritures_count > 0}
                        ><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
                  <button className="join-item btn btn-xs sm:btn-sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || loading}>
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
                        onClick={() => setCurrentPage(pageNum)} disabled={loading}>
                        {pageNum}
                      </button>
                    )
                  })}
                  <button className="join-item btn btn-xs sm:btn-sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || loading}>
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Suppression */}
      {showDeleteModal && journalToDelete && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-md">
            <div className="text-center mb-4">
              <div className="bg-error/10 text-error rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg mb-2">Confirmer la suppression</h3>
              <p className="text-sm text-base-content/70">Voulez-vous vraiment supprimer ce journal ?</p>
              <p className="text-base font-bold text-error mt-2">"{journalToDelete.code} - {journalToDelete.nom}"</p>
              {journalToDelete.ecritures_count > 0 && (
                <p className="text-xs text-warning mt-2">
                  ⚠️ Ce journal a {journalToDelete.ecritures_count} écriture(s). Supprimez-les d'abord.
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button className="btn btn-ghost flex-1" onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}>Annuler</button>
              <button className="btn btn-error flex-1" onClick={handleDelete} disabled={deleteLoading || journalToDelete.ecritures_count > 0}>
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

export default Journaux