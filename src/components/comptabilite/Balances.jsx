// src/components/comptabilite/Balances.jsx
import React, {
  useEffect, useState, useCallback, useRef, useMemo
} from 'react'
import { useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import { pdf } from '@react-pdf/renderer'
import BalancePdf from './BalancePdf'
import {
  Plus, Edit, Trash2, Search, RefreshCw, Filter, X, AlertCircle,
  CheckCircle, Eye, ChevronLeft, ChevronRight, ArrowUpDown, Scale,
  FileText, Calendar, Clock, BookOpen, Download, FileSpreadsheet,
  Loader2,
} from 'lucide-react'

const DEBOUNCE_MS = 300
const CACHE_TTL_MS = 2 * 60 * 1000

const typeConfig = {
  generale: { label: 'Balance générale', color: 'badge-primary' },
  comptes: { label: 'Balance des comptes', color: 'badge-info' },
  agee: { label: 'Balance âgée', color: 'badge-warning' },
}

const statusConfig = {
  brouillon: { label: 'Brouillon', color: 'badge-warning', icon: FileText },
  valide: { label: 'Validée', color: 'badge-success', icon: CheckCircle },
  archive: { label: 'Archivée', color: 'badge-neutral', icon: Clock },
}

const unwrapList = (payload) =>
  Array.isArray(payload) ? payload : (payload?.results || [])

const Balances = () => {
  const navigate = useNavigate()

  // ---------- État principal ----------
  const [balances, setBalances] = useState([])
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
  const [sortField, setSortField] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('desc')

  // ---------- UI ----------
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [balanceToDelete, setBalanceToDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })
  const [showFilters, setShowFilters] = useState(false)
  const [pdfLoading, setPdfLoading] = useState({})

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
  }), [currentPage, itemsPerPage, debouncedSearch, filterType, filterStatus, sortField, sortDirection])

  // ---------- Fetch serveur ----------
  const fetchData = useCallback(async ({ bypassCache = false } = {}) => {
    const key = buildCacheKey()
    if (!bypassCache && cacheRef.current.has(key)) {
      const c = cacheRef.current.get(key)
      setBalances(c.results)
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
      if (filterType) params.type_balance = filterType
      if (filterStatus) params.status = filterStatus

      const response = await AxiosInstance.get('/balances/', {
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

      setBalances(results)
      setTotalCount(count)
      setTotalPages(nbPages)
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
      console.error('Erreur chargement balances:', err)
      if (err.response?.status === 401) setError('Session expirée, veuillez vous reconnecter')
      else if (err.response?.status === 403) setError("Vous n'avez pas les droits")
      else setError('Erreur de chargement des balances')
      showNotification('Erreur de chargement', 'error')
      setBalances([])
    } finally {
      if (abortRef.current === controller) {
        setLoading(false)
        setInitialLoad(false)
      }
    }
  }, [buildCacheKey, currentPage, itemsPerPage, debouncedSearch, filterType, filterStatus, sortField, sortDirection, showNotification])

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
    if (!balanceToDelete) return
    setDeleteLoading(true)
    try {
      await AxiosInstance.delete(`/balances/${balanceToDelete.id}/`)
      cacheRef.current.clear()
      showNotification(`Balance ${balanceToDelete.reference} supprimée`, 'success')
      setShowDeleteModal(false)
      setBalanceToDelete(null)
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

  const handleDownloadPDF = async (balance) => {
    setPdfLoading(prev => ({ ...prev, [balance.id]: true }))
    try {
      const response = await AxiosInstance.get(`/balances/${balance.id}/`)
      const blob = await pdf(<BalancePdf balance={response.data} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `balance_${balance.reference}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      showNotification('PDF téléchargé', 'success')
    } catch (err) {
      showNotification('Erreur PDF', 'error')
    } finally {
      setPdfLoading(prev => ({ ...prev, [balance.id]: false }))
    }
  }

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('asc') }
    setCurrentPage(1)
  }

  // ---------- Helpers ----------
  const getTypeBadge = (type) => {
    const cfg = typeConfig[type] || typeConfig.generale
    return <span className={`badge ${cfg.color} gap-1 text-xs border-0`}>{cfg.label}</span>
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

  const formatDate = (dateString, withTime = false) => {
    if (!dateString) return '-'
    try {
      const opts = {
        day: '2-digit', month: '2-digit', year: 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
      }
      return new Date(dateString).toLocaleDateString('fr-FR', opts)
    } catch { return '-' }
  }

  // ---------- Loading ----------
  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-base-200">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement des balances...
          </p>
        </div>
      </div>
    )
  }

  if (error && balances.length === 0) {
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
            <span className="text-xs text-base-content/60">Actualisation...</span>
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
            Balances comptables
          </h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            Gérez vos balances comptables ({totalCount} au total)
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button onClick={refreshData} className="btn btn-sm sm:btn-md btn-outline gap-1" disabled={loading}>
            <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Actualiser</span>
          </button>
          <button onClick={() => navigate('/balances/nouveau')} className="btn btn-sm sm:btn-md btn-primary gap-1">
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Générer une balance</span>
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
                  placeholder="Rechercher par référence..."
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
                <option value="generale">Balance générale</option>
                <option value="comptes">Balance des comptes</option>
                <option value="agee">Balance âgée</option>
              </select>
              <select
                className="select select-bordered w-full sm:w-36 text-sm"
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1) }}
              >
                <option value="">Tous statuts</option>
                <option value="brouillon">Brouillon</option>
                <option value="valide">Validée</option>
                <option value="archive">Archivée</option>
              </select>
              <button
                className="btn btn-outline gap-2"
                onClick={() => { setFilterType(''); setFilterStatus(''); setSearchTerm(''); setCurrentPage(1) }}
              >
                <Filter className="w-4 h-4" /> <span className="hidden sm:inline">Réinitialiser</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Liste */}
      <div className="bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden">
        {balances.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <Scale className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 text-base-content/30" />
            <p className="text-lg sm:text-xl font-semibold text-base-content/50">Aucune balance trouvée</p>
            <button className="btn btn-primary mt-6 gap-2" onClick={() => navigate('/balances/nouveau')}>
              <Plus className="w-4 h-4" /> Générer une balance
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table table-xs sm:table-sm lg:table-md w-full">
                <thead>
                  <tr className="text-xs sm:text-sm">
                    <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('reference')}>Réf. <ArrowUpDown className="w-3 h-3" /></button></th>
                    <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('type_balance')}>Type <ArrowUpDown className="w-3 h-3" /></button></th>
                    <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('date_debut')}>Période <ArrowUpDown className="w-3 h-3" /></button></th>
                    <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('status')}>Statut <ArrowUpDown className="w-3 h-3" /></button></th>
                    <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('created_at')}>Créé le <ArrowUpDown className="w-3 h-3" /></button></th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((balance) => {
                    const isPdfLoading = pdfLoading[balance.id]
                    return (
                      <tr key={balance.id} className="hover">
                        <td className="font-mono text-xs text-primary">{balance.reference}</td>
                        <td>{getTypeBadge(balance.type_balance)}</td>
                        <td>
                          <div className="flex items-center gap-1 text-xs whitespace-nowrap">
                            <Calendar className="w-3 h-3 text-base-content/40" />
                            {formatDate(balance.date_debut)} → {formatDate(balance.date_fin)}
                          </div>
                        </td>
                        <td>{getStatusBadge(balance.status)}</td>
                        <td className="text-xs whitespace-nowrap">{formatDate(balance.created_at, true)}</td>
                        <td className="text-center">
                          <div className="flex justify-center gap-1 flex-wrap">
                            <button onClick={() => navigate(`/balances/${balance.id}`)} className="btn btn-ghost btn-xs text-info" title="Voir"><Eye className="w-3 h-3" /></button>
                            <button
                              onClick={() => handleDownloadPDF(balance)}
                              className="btn btn-ghost btn-xs text-primary"
                              disabled={isPdfLoading}
                              title="PDF"
                            >
                              {isPdfLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => { setBalanceToDelete(balance); setShowDeleteModal(true) }}
                              className="btn btn-ghost btn-xs text-error"
                              disabled={balance.status === 'valide'}
                              title="Supprimer"
                            ><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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
          </>
        )}
      </div>

      {/* Modal suppression */}
      {showDeleteModal && balanceToDelete && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-md">
            <div className="text-center mb-4">
              <div className="bg-error/10 text-error rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg mb-2">Confirmer la suppression</h3>
              <p className="text-sm text-base-content/70">Voulez-vous vraiment supprimer cette balance ?</p>
              <p className="text-base font-bold text-error mt-2">"{balanceToDelete.reference}"</p>
              {balanceToDelete.status === 'valide' && (
                <p className="text-xs text-warning mt-2">⚠️ Cette balance est validée. Suppression impossible.</p>
              )}
            </div>
            <div className="flex gap-3">
              <button className="btn btn-ghost flex-1" onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}>Annuler</button>
              <button className="btn btn-error flex-1" onClick={handleDelete} disabled={deleteLoading || balanceToDelete.status === 'valide'}>
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

export default Balances