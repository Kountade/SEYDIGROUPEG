// src/components/comptabilite/JournalDetail.jsx
import React, {
  useEffect, useState, useCallback, useRef, useMemo
} from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ArrowLeft, RefreshCw, AlertCircle, CheckCircle, Eye, ChevronLeft,
  ChevronRight, BookOpen, FileText, Building2, Calendar, Clock,
  LayoutGrid, Settings, Shield, Layers, Download, Printer, X,
  Loader2, Search, Filter, ArrowUpDown, Plus, Edit,
} from 'lucide-react'

// ============================================================
// CONFIG
// ============================================================
const DEBOUNCE_MS = 300
const CACHE_TTL_MS = 2 * 60 * 1000

// ✅ DÉFINI ICI (c'était manquant dans ton fichier original)
const typeColors = {
  achats: 'badge-info',
  ventes: 'badge-success',
  banque: 'badge-primary',
  caisse: 'badge-warning',
  od: 'badge-secondary',
  inventaire: 'badge-neutral',
  paie: 'badge-error',
  immobilisations: 'badge-accent',
}

const typeConfig = {
  achats: { label: 'Achats', icon: FileText },
  ventes: { label: 'Ventes', icon: FileText },
  banque: { label: 'Banque', icon: Building2 },
  caisse: { label: 'Caisse', icon: Layers },
  od: { label: 'Opérations diverses', icon: Settings },
  inventaire: { label: 'Inventaire', icon: LayoutGrid },
  paie: { label: 'Paie', icon: Calendar },
  immobilisations: { label: 'Immobilisations', icon: Shield },
}

const statusConfig = {
  brouillon: { label: 'Brouillon', color: 'warning', icon: FileText },
  valide: { label: 'Validée', color: 'success', icon: CheckCircle },
  annulee: { label: 'Annulée', color: 'error', icon: X },
  cloturee: { label: 'Clôturée', color: 'neutral', icon: Clock },
}

const unwrapList = (payload) =>
  Array.isArray(payload) ? payload : (payload?.results || [])

// ============================================================
// COMPOSANT
// ============================================================
const JournalDetail = () => {
  const navigate = useNavigate()
  const { id } = useParams()

  // ---------- États ----------
  const [journal, setJournal] = useState(null)
  const [ecritures, setEcritures] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [loadingEcritures, setLoadingEcritures] = useState(false)
  const [error, setError] = useState(null)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })

  // ---------- Filtres serveur ----------
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // ---------- Pagination serveur ----------
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // ---------- Tri serveur ----------
  const [sortField, setSortField] = useState('date_ecriture')
  const [sortDirection, setSortDirection] = useState('desc')

  // ---------- UI ----------
  const [showFilters, setShowFilters] = useState(false)

  // ---------- Refs ----------
  const cacheRef = useRef(new Map())
  const abortJournalRef = useRef(null)
  const abortEcrituresRef = useRef(null)
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
      if (abortJournalRef.current) abortJournalRef.current.abort()
      if (abortEcrituresRef.current) abortEcrituresRef.current.abort()
    }
  }, [])

  // ---------- Debounce search ----------
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchTerm])

  // ---------- Fetch journal ----------
  const fetchJournal = useCallback(async () => {
    if (!id) return
    if (abortJournalRef.current) abortJournalRef.current.abort()
    const controller = new AbortController()
    abortJournalRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const res = await AxiosInstance.get(`/journaux/${id}/`, {
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      setJournal(res.data)
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
      console.error('Erreur chargement journal:', err)
      if (err.response?.status === 404) setError('Journal introuvable')
      else if (err.response?.status === 401) setError('Session expirée, veuillez vous reconnecter')
      else if (err.response?.status === 403) setError("Vous n'avez pas les droits pour voir ce journal")
      else setError('Erreur de chargement du journal')
      showNotification('Erreur de chargement', 'error')
    } finally {
      if (abortJournalRef.current === controller) {
        setLoading(false)
        setInitialLoad(false)
      }
    }
  }, [id, showNotification])

  // ---------- Fetch écritures (paginé serveur) ----------
  const fetchEcritures = useCallback(async () => {
    if (!id) return
    if (abortEcrituresRef.current) abortEcrituresRef.current.abort()
    const controller = new AbortController()
    abortEcrituresRef.current = controller

    const cacheKey = JSON.stringify({
      id, page: currentPage, size: itemsPerPage,
      q: debouncedSearch, status: filterStatus,
      sort: `${sortField}:${sortDirection}`,
    })

    const cached = cacheRef.current.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      setEcritures(cached.results)
      setTotalCount(cached.count)
      setTotalPages(cached.totalPages)
      setLoadingEcritures(false)
      return
    }

    setLoadingEcritures(true)
    try {
      const params = {
        page: currentPage,
        page_size: itemsPerPage,
        ordering: `${sortDirection === 'desc' ? '-' : ''}${sortField}`,
      }
      if (debouncedSearch) params.search = debouncedSearch
      if (filterStatus) params.status = filterStatus

      const res = await AxiosInstance.get(`/journaux/${id}/ecritures/`, {
        params,
        signal: controller.signal,
      })

      if (controller.signal.aborted) return

      const payload = res.data
      const results = unwrapList(payload)
      const count = Array.isArray(payload) ? results.length : (payload.count ?? results.length)
      const nbPages = Math.max(1, Math.ceil(count / itemsPerPage))

      cacheRef.current.set(cacheKey, {
        results, count, totalPages: nbPages, timestamp: Date.now(),
      })

      setEcritures(results)
      setTotalCount(count)
      setTotalPages(nbPages)
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
      console.error('Erreur chargement écritures:', err)
      setEcritures([])
      setTotalCount(0)
      setTotalPages(1)
    } finally {
      if (abortEcrituresRef.current === controller) setLoadingEcritures(false)
    }
  }, [id, currentPage, itemsPerPage, debouncedSearch, filterStatus, sortField, sortDirection])

  // ---------- Effets ----------
  useEffect(() => { fetchJournal() }, [fetchJournal])
  useEffect(() => { fetchEcritures() }, [fetchEcritures])

  // ---------- Responsive ----------
  useEffect(() => {
    const handleResize = () => {
      const next =
        window.innerWidth < 640 ? 5 :
        window.innerWidth < 1024 ? 10 : 15
      setItemsPerPage(prev => prev === next ? prev : next)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const refreshData = async () => {
    cacheRef.current.clear()
    setCurrentPage(1)
    await Promise.all([fetchJournal(), fetchEcritures()])
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
      <span className={`badge ${typeColors[type] || 'badge-ghost'} gap-1 text-xs border-0`}>
        {cfg.label}
      </span>
    )
  }

  const getStatusBadge = (status) => {
    const cfg = statusConfig[status] || statusConfig.brouillon
    const Icon = cfg.icon
    return (
      <span className={`badge badge-${cfg.color} gap-1 text-xs border-0`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </span>
    )
  }

  const formatCurrency = (amount) => {
    const n = Number(amount)
    if (!Number.isFinite(n)) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n) + ' FCFA'
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try { return new Date(dateString).toLocaleDateString('fr-FR') }
    catch { return '-' }
  }

  // ---------- Stats page courante ----------
  const pageStats = useMemo(() => {
    let debit = 0, credit = 0, valide = 0, brouillon = 0
    ecritures.forEach(e => {
      debit += Number(e.total_debit) || 0
      credit += Number(e.total_credit) || 0
      if (e.status === 'valide') valide++
      if (e.status === 'brouillon') brouillon++
    })
    return { debit, credit, valide, brouillon }
  }, [ecritures])

  // ---------- Loading ----------
  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-base-200">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement du journal...
          </p>
        </div>
      </div>
    )
  }

  if (error || !journal) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-base-200">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Erreur</h2>
          <p className="text-base-content/60 mb-4">{error || 'Journal non trouvé'}</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => navigate('/journaux')} className="btn btn-ghost gap-2">
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
            <button onClick={refreshData} className="btn btn-primary gap-2">
              <RefreshCw className="w-4 h-4" /> Réessayer
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 bg-base-200 min-h-screen">
      {/* Spinner overlay */}
      {(loading || loadingEcritures) && !initialLoad && (
        <div className="fixed top-20 right-6 z-40">
          <div className="bg-base-100 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border border-base-300">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span className="text-xs text-base-content/60">Actualisation...</span>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification.show && (
        <div className="fixed top-16 right-3 sm:right-6 z-50">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg`}>
            {notification.type === 'success'
              ? <CheckCircle className="w-4 h-4" />
              : <AlertCircle className="w-4 h-4" />}
            <span className="font-semibold">{notification.message}</span>
            <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setNotification({ ...notification, show: false })}>
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <button onClick={() => navigate('/journaux')} className="btn btn-ghost btn-sm gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black">
              {journal.code || '-'} - {journal.nom || '-'}
            </h1>
            <div className="text-xs sm:text-sm text-base-content/60 mt-1 flex items-center gap-2 flex-wrap">
              <span>{getTypeBadge(journal.type_journal)}</span>
              <span className="w-px h-3 bg-base-300"></span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {journal.agence_nom || 'Agence'}
              </span>
              <span className="w-px h-3 bg-base-300"></span>
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" /> {totalCount} écriture(s)
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={refreshData} className="btn btn-sm btn-outline gap-1" disabled={loading || loadingEcritures}>
            <RefreshCw className={`w-3 h-3 ${(loading || loadingEcritures) ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Actualiser</span>
          </button>
          <button onClick={() => window.print()} className="btn btn-sm btn-outline gap-1">
            <Printer className="w-3 h-3" />
          </button>
          <button
            onClick={() => navigate(`/ecritures/nouveau?journal=${journal.id}`)}
            className="btn btn-sm btn-primary gap-1"
          >
            <Plus className="w-3 h-3" />
            <span className="hidden xs:inline">Nouvelle écriture</span>
          </button>
        </div>
      </div>

      {/* Infos journal */}
      <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-base-content/60">Code</p>
            <p className="font-mono font-bold text-primary">{journal.code || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-base-content/60">Nom</p>
            <p className="font-medium">{journal.nom || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-base-content/60">Type</p>
            <p>{typeConfig[journal.type_journal]?.label || journal.type_journal || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-base-content/60">Statut</p>
            <span className={`badge ${journal.is_active ? 'badge-success' : 'badge-error'} badge-sm`}>
              {journal.is_active ? 'Actif' : 'Inactif'}
            </span>
            {journal.is_default && <span className="badge badge-primary badge-sm ml-1">Par défaut</span>}
          </div>
        </div>
        {journal.description && (
          <div className="mt-4 pt-4 border-t border-base-200">
            <p className="text-xs text-base-content/60">Description</p>
            <p className="text-sm mt-1">{journal.description}</p>
          </div>
        )}
      </div>

      {/* Filtres */}
      <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
              <input
                type="text"
                placeholder="Rechercher par référence ou libellé..."
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
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1) }}
            >
              <option value="">Tous statuts</option>
              <option value="brouillon">Brouillon</option>
              <option value="valide">Validée</option>
              <option value="annulee">Annulée</option>
              <option value="cloturee">Clôturée</option>
            </select>
            <button
              className="btn btn-outline gap-2"
              onClick={() => { setFilterStatus(''); setSearchTerm(''); setCurrentPage(1) }}
            >
              <Filter className="w-4 h-4" /> Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden">
        {ecritures.length === 0 && !loadingEcritures ? (
          <div className="p-8 sm:p-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-base-content/30" />
            <p className="text-lg font-semibold text-base-content/50">Aucune écriture trouvée</p>
            <button
              className="btn btn-primary mt-6 gap-2"
              onClick={() => navigate(`/ecritures/nouveau?journal=${journal.id}`)}
            >
              <Plus className="w-4 h-4" /> Nouvelle écriture
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table table-xs sm:table-sm lg:table-md w-full">
                <thead>
                  <tr className="text-xs sm:text-sm">
                    <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('reference')}>Réf. <ArrowUpDown className="w-3 h-3" /></button></th>
                    <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('libelle')}>Libellé <ArrowUpDown className="w-3 h-3" /></button></th>
                    <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('date_ecriture')}>Date <ArrowUpDown className="w-3 h-3" /></button></th>
                    <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('total_debit')}>Débit <ArrowUpDown className="w-3 h-3" /></button></th>
                    <th><button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('total_credit')}>Crédit <ArrowUpDown className="w-3 h-3" /></button></th>
                    <th>Statut</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ecritures.map((ecriture) => (
                    <tr key={ecriture.id} className="hover">
                      <td className="font-mono text-xs text-primary">{ecriture.reference || '-'}</td>
                      <td>
                        <div className="font-medium text-sm truncate max-w-[150px]" title={ecriture.libelle}>
                          {ecriture.libelle || '-'}
                        </div>
                      </td>
                      <td className="text-xs whitespace-nowrap">{formatDate(ecriture.date_ecriture)}</td>
                      <td className="font-mono text-xs text-success">{formatCurrency(ecriture.total_debit)}</td>
                      <td className="font-mono text-xs text-error">{formatCurrency(ecriture.total_credit)}</td>
                      <td>{getStatusBadge(ecriture.status)}</td>
                      <td className="text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => navigate(`/ecritures/${ecriture.id}`)} className="btn btn-ghost btn-xs text-info">
                            <Eye className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => navigate(`/ecritures/${ecriture.id}/modifier`)}
                            className="btn btn-ghost btn-xs text-primary"
                            disabled={ecriture.status !== 'brouillon'}
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="15">15</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                    </select>
                    <div className="join">
                      <button className="join-item btn btn-xs sm:btn-sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1 || loadingEcritures}>
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
                            onClick={() => setCurrentPage(pageNum)} disabled={loadingEcritures}>
                            {pageNum}
                          </button>
                        )
                      })}
                      <button className="join-item btn btn-xs sm:btn-sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || loadingEcritures}>
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
    </div>
  )
}

export default JournalDetail