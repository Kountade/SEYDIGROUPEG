// src/components/comptabilite/PlanComptable.jsx
import React, {
  useEffect, useState, useCallback, useRef, useMemo
} from 'react'
import { useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Plus, Edit, Trash2, Search, RefreshCw, Filter, X, AlertCircle,
  CheckCircle, ChevronLeft, ChevronRight, ArrowUpDown, FolderOpen,
  FileText, FolderTree, ChevronDown, List, Shield, TrendingUp,
  TrendingDown, PiggyBank, Loader2,
} from 'lucide-react'

const DEBOUNCE_MS = 300
const CACHE_TTL_MS = 2 * 60 * 1000

const typeIcons = {
  actif: <FolderOpen className="w-4 h-4 text-blue-500" />,
  passif: <Shield className="w-4 h-4 text-orange-500" />,
  capitaux: <PiggyBank className="w-4 h-4 text-purple-500" />,
  charges: <TrendingDown className="w-4 h-4 text-red-500" />,
  produits: <TrendingUp className="w-4 h-4 text-green-500" />,
}

const typeColors = {
  actif: 'badge-info',
  passif: 'badge-warning',
  capitaux: 'badge-secondary',
  charges: 'badge-error',
  produits: 'badge-success',
}

const typeLabels = {
  actif: 'Actif',
  passif: 'Passif',
  capitaux: 'Capitaux propres',
  charges: 'Charges',
  produits: 'Produits',
}

const niveauLabels = {
  1: 'Classe',
  2: 'Compte',
  3: 'Sous-compte',
  4: 'Sous-sous-compte',
}

const unwrapList = (payload) =>
  Array.isArray(payload) ? payload : (payload?.results || [])

const PlanComptable = () => {
  const navigate = useNavigate()

  // ---------- État principal ----------
  const [comptes, setComptes] = useState([])
  const [allComptes, setAllComptes] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState(null)

  // ---------- Filtres serveur ----------
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterNiveau, setFilterNiveau] = useState('')

  // ---------- Pagination serveur ----------
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // ---------- Tri serveur ----------
  const [sortField, setSortField] = useState('code')
  const [sortDirection, setSortDirection] = useState('asc')

  // ---------- UI ----------
  const [viewMode, setViewMode] = useState('tree')
  const [expandedNodes, setExpandedNodes] = useState(new Set())
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [compteToDelete, setCompteToDelete] = useState(null)
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

  // ============================================================
  // ✅ CACHE KEY STABLE (inclut le MODE)
  // ============================================================
  const buildCacheKey = useCallback(() => JSON.stringify({
    mode: viewMode,
    page: currentPage,
    size: itemsPerPage,
    q: debouncedSearch,
    type: filterType,
    niveau: filterNiveau,
    sort: `${sortField}:${sortDirection}`,
  }), [viewMode, currentPage, itemsPerPage, debouncedSearch, filterType, filterNiveau, sortField, sortDirection])

  // ============================================================
  // ✅ FETCH UNIFIÉ (comme Journaux)
  // ============================================================
  const fetchData = useCallback(async ({ bypassCache = false } = {}) => {
    const key = buildCacheKey()
    if (!bypassCache && cacheRef.current.has(key)) {
      const c = cacheRef.current.get(key)
      if (viewMode === 'tree') {
        setAllComptes(c.results)
        setExpandedNodes(prev => {
          if (prev.size > 0) return prev
          return new Set(c.results.filter(x => x.niveau === 1).map(x => x.id))
        })
      } else {
        setComptes(c.results)
        setTotalCount(c.count)
        setTotalPages(c.totalPages)
      }
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
      const params = viewMode === 'tree'
        ? { page_size: 500, is_active: true, ordering: 'code' }
        : (() => {
            const p = {
              page: currentPage,
              page_size: itemsPerPage,
              ordering: `${sortDirection === 'desc' ? '-' : ''}${sortField}`,
            }
            if (debouncedSearch) p.search = debouncedSearch
            if (filterType) p.type_compte = filterType
            if (filterNiveau) p.niveau = filterNiveau
            return p
          })()

      const response = await AxiosInstance.get('/plan-comptable/', {
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

      if (viewMode === 'tree') {
        setAllComptes(results)
        setExpandedNodes(prev => {
          if (prev.size > 0) return prev
          return new Set(results.filter(x => x.niveau === 1).map(x => x.id))
        })
      } else {
        setComptes(results)
        setTotalCount(count)
        setTotalPages(nbPages)
      }
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
      console.error('Erreur chargement plan comptable:', err)
      if (err.response?.status === 401) setError('Session expirée, veuillez vous reconnecter')
      else if (err.response?.status === 403) setError("Vous n'avez pas les droits")
      else setError('Erreur de chargement du plan comptable')
      showNotification('Erreur de chargement', 'error')
      if (viewMode === 'tree') setAllComptes([])
      else setComptes([])
    } finally {
      if (abortRef.current === controller) {
        setLoading(false)
        setInitialLoad(false)
      }
    }
  }, [buildCacheKey, viewMode, currentPage, itemsPerPage, debouncedSearch, filterType, filterNiveau, sortField, sortDirection, showNotification])

  // ✅ UN SEUL useEffect (comme Journaux)
  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildCacheKey])

  // ---------- Responsive ----------
  useEffect(() => {
    const handleResize = () => {
      const next =
        window.innerWidth < 640 ? 10 :
        window.innerWidth < 1024 ? 20 : 20
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
    if (!compteToDelete) return
    setDeleteLoading(true)
    try {
      await AxiosInstance.delete(`/plan-comptable/${compteToDelete.id}/`)
      cacheRef.current.clear()
      showNotification(`Compte ${compteToDelete.code} supprimé`, 'success')
      setShowDeleteModal(false)
      setCompteToDelete(null)
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

  const toggleNode = (id) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ---------- Helpers ----------
  const getTypeBadge = (type) => (
    <span className={`badge ${typeColors[type] || 'badge-ghost'} gap-1 text-xs border-0`}>
      {typeLabels[type] || type || 'Inconnu'}
    </span>
  )

  const getNiveauLabel = (niveau) => niveauLabels[niveau] || `Niveau ${niveau}`

  // ---------- Rendu tree ----------
  const renderTree = (items, level = 0, parentId = null) => {
    const children = items
      .filter(item => item.parent === parentId)
      .sort((a, b) => (a.code || '').localeCompare(b.code || ''))

    if (children.length === 0) return null

    return (
      <ul className={`space-y-0.5 ${level > 0 ? 'ml-4 sm:ml-6 border-l-2 border-base-200 pl-2 sm:pl-4' : ''}`}>
        {children.map((compte) => {
          const hasChildren = items.some(c => c.parent === compte.id)
          const isExpanded = expandedNodes.has(compte.id)

          return (
            <li key={compte.id}>
              <div
                className={`flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-lg hover:bg-base-200/70 transition-all cursor-pointer group ${level === 0 ? 'bg-base-200/30 font-semibold' : ''}`}
                onClick={() => navigate(`/plan-comptable/${compte.id}/modifier`)}
              >
                {hasChildren ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleNode(compte.id) }}
                    className="btn btn-ghost btn-xs btn-square"
                  >
                    {isExpanded
                      ? <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
                      : <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />}
                  </button>
                ) : <span className="w-3 sm:w-4" />}

                <div className={`p-1 rounded ${level === 0 ? 'bg-primary/10' : ''}`}>
                  {typeIcons[compte.type_compte] || <FileText className="w-4 h-4 text-base-content/40" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-mono font-medium text-primary">{compte.code}</span>
                    <span className={`text-xs sm:text-sm ${level === 0 ? 'font-bold' : 'font-medium'} truncate`}>{compte.nom}</span>
                    {level === 0 && (
                      <span className="badge badge-ghost badge-xs text-[10px]">{getNiveauLabel(compte.niveau)}</span>
                    )}
                  </div>
                  {compte.description && (
                    <p className="text-[10px] sm:text-xs text-base-content/40 truncate">{compte.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {getTypeBadge(compte.type_compte)}
                  {compte.sous_comptes_count > 0 && (
                    <span className="badge badge-ghost badge-xs text-[10px]">{compte.sous_comptes_count}</span>
                  )}
                </div>

                <div className="flex items-center gap-0.5 sm:gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/plan-comptable/${compte.id}/modifier`) }}
                    className="btn btn-ghost btn-xs text-primary"
                    title="Modifier"
                  ><Edit className="w-3 h-3" /></button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setCompteToDelete(compte)
                      setShowDeleteModal(true)
                    }}
                    className="btn btn-ghost btn-xs text-error"
                    title="Supprimer"
                    disabled={compte.sous_comptes_count > 0}
                  ><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>

              {hasChildren && isExpanded && renderTree(items, level + 1, compte.id)}
            </li>
          )
        })}
      </ul>
    )
  }

  // ---------- Loading ----------
  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-base-200">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement du plan comptable...
          </p>
        </div>
      </div>
    )
  }

  if (error && comptes.length === 0 && allComptes.length === 0) {
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
      {loading && !initialLoad && (
        <div className="fixed top-20 right-6 z-40">
          <div className="bg-base-100 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border border-base-300">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span className="text-xs text-base-content/60">Chargement...</span>
          </div>
        </div>
      )}

      {notification.show && (
        <div className="fixed top-16 right-3 sm:right-6 z-50">
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
            Plan comptable
          </h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            {viewMode === 'tree'
              ? `Arborescence des comptes (${allComptes.length} comptes)`
              : `Liste des comptes (${totalCount} au total)`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button onClick={refreshData} className="btn btn-sm sm:btn-md btn-outline gap-1" disabled={loading}>
            <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Actualiser</span>
          </button>
          <button onClick={() => navigate('/plan-comptable/nouveau')} className="btn btn-sm sm:btn-md btn-primary gap-1">
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Nouveau compte</span>
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-3 sm:p-4">
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
              className="select select-bordered w-full sm:w-36 text-sm"
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1) }}
            >
              <option value="">Tous types</option>
              <option value="actif">Actif</option>
              <option value="passif">Passif</option>
              <option value="capitaux">Capitaux propres</option>
              <option value="charges">Charges</option>
              <option value="produits">Produits</option>
            </select>
            <select
              className="select select-bordered w-full sm:w-32 text-sm"
              value={filterNiveau}
              onChange={(e) => { setFilterNiveau(e.target.value); setCurrentPage(1) }}
            >
              <option value="">Niveau</option>
              <option value="1">Classe</option>
              <option value="2">Compte</option>
              <option value="3">Sous-compte</option>
              <option value="4">Sous-sous-compte</option>
            </select>
            <button
              className="btn btn-outline gap-2"
              onClick={() => { setFilterType(''); setFilterNiveau(''); setSearchTerm(''); setCurrentPage(1) }}
            >
              <Filter className="w-4 h-4" /> <span className="hidden sm:inline">Réinitialiser</span>
            </button>
            <div className="join ml-auto">
              <button
                className={`join-item btn btn-sm ${viewMode === 'tree' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('tree')}
              >
                <FolderTree className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Arbre</span>
              </button>
              <button
                className={`join-item btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => { setViewMode('list'); setCurrentPage(1) }}
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Liste</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Vue tree */}
      {viewMode === 'tree' && (
        <div className="bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden">
          <div className="p-3 sm:p-4 lg:p-6">
            <div className="text-xs text-base-content/40 mb-3 flex items-center gap-2">
              <span>Cliquez sur un compte pour le modifier</span>
              <span className="w-px h-4 bg-base-300"></span>
              <span>Utilisez les flèches pour développer/contracter</span>
            </div>
            {allComptes.length === 0 ? (
              <div className="p-8 text-center">
                <FolderOpen className="w-16 h-16 mx-auto mb-4 text-base-content/30" />
                <p className="text-lg font-semibold text-base-content/50">Aucun compte trouvé</p>
                <button className="btn btn-primary mt-6 gap-2" onClick={() => navigate('/plan-comptable/nouveau')}>
                  <Plus className="w-4 h-4" /> Nouveau compte
                </button>
              </div>
            ) : (
              renderTree(allComptes)
            )}
          </div>
        </div>
      )}

      {/* Vue liste */}
      {viewMode === 'list' && (
        <div className="bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden">
          {comptes.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <FolderOpen className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 text-base-content/30" />
              <p className="text-lg font-semibold text-base-content/50">Aucun compte trouvé</p>
              <button className="btn btn-primary mt-6 gap-2" onClick={() => navigate('/plan-comptable/nouveau')}>
                <Plus className="w-4 h-4" /> Nouveau compte
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table table-xs sm:table-sm lg:table-md w-full">
                  <thead>
                    <tr className="text-xs sm:text-sm">
                      <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('code')}>Code <ArrowUpDown className="w-3 h-3" /></button></th>
                      <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('nom')}>Nom <ArrowUpDown className="w-3 h-3" /></button></th>
                      <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('type_compte')}>Type <ArrowUpDown className="w-3 h-3" /></button></th>
                      <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('niveau')}>Niveau <ArrowUpDown className="w-3 h-3" /></button></th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comptes.map((compte) => (
                      <tr key={compte.id} className="hover">
                        <td className="font-mono text-sm font-medium text-primary">{compte.code}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            {typeIcons[compte.type_compte] || <FileText className="w-4 h-4 text-base-content/40" />}
                            <span className="font-medium truncate max-w-[200px]">{compte.nom}</span>
                          </div>
                        </td>
                        <td>{getTypeBadge(compte.type_compte)}</td>
                        <td><span className="badge badge-ghost badge-xs">{getNiveauLabel(compte.niveau)}</span></td>
                        <td className="text-center">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => navigate(`/plan-comptable/${compte.id}/modifier`)} className="btn btn-ghost btn-xs text-primary" title="Modifier"><Edit className="w-3 h-3" /></button>
                            <button
                              onClick={() => { setCompteToDelete(compte); setShowDeleteModal(true) }}
                              className="btn btn-ghost btn-xs text-error"
                              disabled={compte.sous_comptes_count > 0}
                              title="Supprimer"
                            ><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
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
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                      <div className="join">
                        <button className="join-item btn btn-xs sm:btn-sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1 || loading}>
                          <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        {[...Array(Math.min(5, totalPages))].map((_, i) => {
                          let pageNum
                          if (totalPages <= 5) pageNum = i + 1
                          else if (currentPage <= 3) pageNum = i + 1
                          else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                          else pageNum = currentPage - 2 + i
                          return (
                            <button key={i}
                              className={`join-item btn btn-xs sm:btn-sm ${currentPage === pageNum ? 'btn-primary' : ''}`}
                              onClick={() => setCurrentPage(pageNum)} disabled={loading}>
                              {pageNum}
                            </button>
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
            </>
          )}
        </div>
      )}

      {/* Modal suppression */}
      {showDeleteModal && compteToDelete && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-md">
            <div className="text-center mb-4">
              <div className="bg-error/10 text-error rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg mb-2">Confirmer la suppression</h3>
              <p className="text-sm text-base-content/70">Voulez-vous vraiment supprimer ce compte ?</p>
              <p className="text-base font-bold text-error mt-2">"{compteToDelete.code} - {compteToDelete.nom}"</p>
              {compteToDelete.sous_comptes_count > 0 && (
                <p className="text-xs text-warning mt-2">
                  ⚠️ Ce compte a {compteToDelete.sous_comptes_count} sous-compte(s). Supprimez-les d'abord.
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button className="btn btn-ghost flex-1" onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}>Annuler</button>
              <button className="btn btn-error flex-1" onClick={handleDelete} disabled={deleteLoading || compteToDelete.sous_comptes_count > 0}>
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

export default PlanComptable