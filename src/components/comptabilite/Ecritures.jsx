// src/components/comptabilite/Ecritures.jsx
import React, {
  useEffect, useState, useCallback, useRef,
} from 'react'
import { useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import { pdf } from '@react-pdf/renderer'
import EcriturePdf from './EcriturePdf'
import {
  Plus, Edit, Trash2, Search, RefreshCw, Filter, X, AlertCircle,
  CheckCircle, Eye, ChevronLeft, ChevronRight, ArrowUpDown,
  Notebook, FileText, Calendar, DollarSign, Clock, XCircle,
  User, Loader2, Download,
} from 'lucide-react'

// ============================================================
// CONSTANTES
// ============================================================
const DEBOUNCE_MS = 300
const CACHE_TTL_MS = 2 * 60 * 1000
const CACHE_MAX = 20

const statusConfig = {
  brouillon: { label: 'Brouillon', color: 'badge-warning', icon: FileText },
  valide: { label: 'Validée', color: 'badge-success', icon: CheckCircle },
  annulee: { label: 'Annulée', color: 'badge-error', icon: XCircle },
  cloturee: { label: 'Clôturée', color: 'badge-neutral', icon: Clock },
}

const unwrapList = (payload) =>
  Array.isArray(payload) ? payload : (payload?.results || [])

// ============================================================
// COMPOSANT
// ============================================================
const Ecritures = () => {
  const navigate = useNavigate()

  // ---------- État principal ----------
  const [ecritures, setEcritures] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState(null)

  // ---------- Filtres serveur ----------
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterJournal, setFilterJournal] = useState('')

  // ---------- Pagination serveur ----------
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // ---------- Tri serveur ----------
  const [sortField, setSortField] = useState('date_ecriture')
  const [sortDirection, setSortDirection] = useState('desc')

  // ---------- Stats (serveur ou fallback page) ----------
  const [stats, setStats] = useState({
    total: 0, brouillon: 0, valide: 0,
    annulee: 0, cloturee: 0,
    totalDebit: 0, totalCredit: 0,
  })

  // ---------- UI ----------
  const [journaux, setJournaux] = useState([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [ecritureToDelete, setEcritureToDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(null) // id en cours
  const [showFilters, setShowFilters] = useState(false)
  const [notification, setNotification] = useState({
    show: false, message: '', type: 'success',
  })
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
    status: filterStatus,
    journal: filterJournal,
    sort: `${sortField}:${sortDirection}`,
  }), [currentPage, itemsPerPage, debouncedSearch,
       filterStatus, filterJournal, sortField, sortDirection])

  // ============================================================
  // ✅ FETCH SERVEUR — pagination + filtres + tri + stats
  // ============================================================
  const fetchData = useCallback(async ({ bypassCache = false } = {}) => {
    const key = buildCacheKey()
    if (!bypassCache && cacheRef.current.has(key)) {
      const c = cacheRef.current.get(key)
      setEcritures(c.results)
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
      if (filterStatus) params.status = filterStatus
      if (filterJournal) params.journal_id = filterJournal

      const response = await AxiosInstance.get('/ecritures/', {
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

      // ✅ Stats : utilise `payload.stats` si backend les fournit,
      //    sinon fallback sur la page courante (partiel mais rapide)
      const newStats = payload.stats || computePageStats(results, count)

      const entry = {
        results, count, totalPages: nbPages, stats: newStats,
      }
      cacheRef.current.set(key, entry)
      if (cacheRef.current.size > CACHE_MAX) {
        cacheRef.current.delete(cacheRef.current.keys().next().value)
      }

      setEcritures(results)
      setTotalCount(count)
      setTotalPages(nbPages)
      setStats(newStats)
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
      console.error('Erreur chargement écritures:', err)
      if (err.response?.status === 401) {
        setError('Session expirée, veuillez vous reconnecter')
      } else if (err.response?.status === 403) {
        setError("Vous n'avez pas les droits")
      } else {
        setError('Erreur de chargement des écritures')
      }
      showNotification('Erreur de chargement', 'error')
      setEcritures([])
    } finally {
      if (abortRef.current === controller) {
        setLoading(false)
        setInitialLoad(false)
      }
    }
  }, [buildCacheKey, currentPage, itemsPerPage, debouncedSearch,
      filterStatus, filterJournal, sortField, sortDirection, showNotification])

  // ✅ Pattern Journaux : 1 seul useEffect
  useEffect(() => { fetchData() }, [fetchData])

  // ---------- Chargement des journaux (1 seule fois) ----------
  useEffect(() => {
    const controller = new AbortController()
    AxiosInstance
      .get('/journaux/', { params: { page_size: 200 }, signal: controller.signal })
      .then(res => setJournaux(unwrapList(res.data)))
      .catch(() => {})
    return () => controller.abort()
  }, [])

  // ---------- Responsive ----------
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
    setCurrentPage(1)
    await fetchData({ bypassCache: true })
  }

  // ---------- Stats fallback (sur page) ----------
  const computePageStats = (pageData, totalCountGlobal) => {
    let brouillon = 0, valide = 0, annulee = 0, cloturee = 0
    let totalDebit = 0, totalCredit = 0
    for (const e of pageData) {
      switch (e.status) {
        case 'brouillon': brouillon++; break
        case 'valide': valide++; break
        case 'annulee': annulee++; break
        case 'cloturee': cloturee++; break
      }
      totalDebit += parseFloat(e.total_debit) || 0
      totalCredit += parseFloat(e.total_credit) || 0
    }
    // ⚠️ total = global (count serveur), mais brouillon/valide/etc = page
    return {
      total: totalCountGlobal,
      brouillon, valide, annulee, cloturee,
      totalDebit, totalCredit,
    }
  }

  // ---------- Actions ----------
  const handleDelete = async () => {
    if (!ecritureToDelete) return
    setDeleteLoading(true)
    try {
      await AxiosInstance.delete(`/ecritures/${ecritureToDelete.id}/`)
      cacheRef.current.clear()
      showNotification(
        `Écriture ${ecritureToDelete.reference} supprimée`, 'success'
      )
      setShowDeleteModal(false)
      setEcritureToDelete(null)
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

  const handleValider = async (id) => {
    setActionLoading(id)
    try {
      await AxiosInstance.post(`/ecritures/${id}/valider/`)
      cacheRef.current.clear()
      showNotification('Écriture validée', 'success')
      await fetchData({ bypassCache: true })
    } catch (err) {
      showNotification(
        err.response?.data?.error || 'Erreur lors de la validation',
        'error'
      )
    } finally {
      setActionLoading(null)
    }
  }

  const handleAnnuler = async (id) => {
    setActionLoading(id)
    try {
      await AxiosInstance.post(`/ecritures/${id}/annuler/`)
      cacheRef.current.clear()
      showNotification('Écriture annulée', 'success')
      await fetchData({ bypassCache: true })
    } catch (err) {
      showNotification(
        err.response?.data?.error || "Erreur lors de l'annulation",
        'error'
      )
    } finally {
      setActionLoading(null)
    }
  }

  const handleDownloadPDF = async (ecriture) => {
    setPdfLoading(prev => ({ ...prev, [ecriture.id]: true }))
    try {
      const response = await AxiosInstance.get(`/ecritures/${ecriture.id}/`)
      const blob = await pdf(<EcriturePdf ecriture={response.data} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ecriture_${ecriture.reference}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      showNotification('PDF téléchargé', 'success')
    } catch (err) {
      console.error('Erreur PDF:', err)
      showNotification('Erreur lors du téléchargement du PDF', 'error')
    } finally {
      setPdfLoading(prev => ({ ...prev, [ecriture.id]: false }))
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

  // ---------- Loading plein écran ----------
  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-base-200">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-success animate-spin mx-auto" />
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement des écritures...
          </p>
        </div>
      </div>
    )
  }

  if (error && ecritures.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-base-200">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Erreur de chargement</h2>
          <p className="text-base-content/60 mb-4">{error}</p>
          <button onClick={refreshData} className="btn btn-success gap-2">
            <RefreshCw className="w-4 h-4" /> Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 bg-base-200 min-h-screen">
      {/* Overlay léger */}
      {loading && !initialLoad && (
        <div className="fixed top-20 right-6 z-40">
          <div className="bg-base-100 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border border-base-300">
            <Loader2 className="w-3 h-3 animate-spin text-success" />
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
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-success to-info bg-clip-text text-transparent">
            Écritures comptables
          </h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            Gérez toutes les écritures comptables ({totalCount} au total)
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
            onClick={() => navigate('/ecritures/nouveau')}
            className="btn btn-sm sm:btn-md btn-success gap-1"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Nouvelle écriture</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats.total > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
          <StatCard label="Total" value={stats.total} icon={Notebook} color="text-primary" />
          <StatCard label="Brouillons" value={stats.brouillon} icon={FileText} color="text-warning" />
          <StatCard label="Validées" value={stats.valide} icon={CheckCircle} color="text-success" />
          <StatCard label="Annulées" value={stats.annulee} icon={XCircle} color="text-error" />
          <StatCard
            label="Volume (page)"
            value={formatCurrency(stats.totalDebit)}
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
                placeholder="Rechercher par référence ou libellé..."
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
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1) }}
            >
              <option value="">Tous statuts</option>
              <option value="brouillon">Brouillon</option>
              <option value="valide">Validée</option>
              <option value="annulee">Annulée</option>
              <option value="cloturee">Clôturée</option>
            </select>
            <select
              className="select select-bordered w-full sm:w-48 text-sm"
              value={filterJournal}
              onChange={(e) => { setFilterJournal(e.target.value); setCurrentPage(1) }}
            >
              <option value="">Tous journaux</option>
              {journaux.map(j => (
                <option key={j.id} value={j.id}>{j.code} - {j.nom}</option>
              ))}
            </select>
            <button
              className="btn btn-outline gap-2"
              onClick={() => {
                setFilterStatus('')
                setFilterJournal('')
                setSearchTerm('')
                setCurrentPage(1)
              }}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Réinitialiser</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden">
        {ecritures.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <Notebook className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 text-base-content/30" />
            <p className="text-lg sm:text-xl font-semibold text-base-content/50">
              Aucune écriture trouvée
            </p>
            <button
              className="btn btn-success mt-6 gap-2"
              onClick={() => navigate('/ecritures/nouveau')}
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
                    <th>
                      <button className="flex items-center gap-1 hover:text-success" onClick={() => handleSort('reference')}>
                        Réf. <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th>
                      <button className="flex items-center gap-1 hover:text-success" onClick={() => handleSort('libelle')}>
                        Libellé <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th>Journal</th>
                    <th>
                      <button className="flex items-center gap-1 hover:text-success" onClick={() => handleSort('date_ecriture')}>
                        Date <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th>
                      <button className="flex items-center gap-1 hover:text-success" onClick={() => handleSort('total_debit')}>
                        Débit <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th>
                      <button className="flex items-center gap-1 hover:text-success" onClick={() => handleSort('total_credit')}>
                        Crédit <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th>Statut</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ecritures.map((ecriture) => {
                    const isPdfLoading = pdfLoading[ecriture.id]
                    const isActing = actionLoading === ecriture.id
                    return (
                      <tr key={ecriture.id} className="hover">
                        <td className="font-mono text-xs text-success">
                          {ecriture.reference}
                        </td>
                        <td>
                          <div className="font-medium text-sm truncate max-w-[150px]">
                            {ecriture.libelle}
                          </div>
                          {ecriture.created_by_email && (
                            <div className="text-[10px] text-base-content/40 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {ecriture.created_by_email}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-ghost badge-xs">
                            {ecriture.journal_code || ecriture.journal}
                          </span>
                        </td>
                        <td>{formatDate(ecriture.date_ecriture)}</td>
                        <td className="font-mono text-xs text-success">
                          {formatCurrency(ecriture.total_debit)}
                        </td>
                        <td className="font-mono text-xs text-error">
                          {formatCurrency(ecriture.total_credit)}
                        </td>
                        <td>{getStatusBadge(ecriture.status)}</td>
                        <td className="text-center">
                          <div className="flex justify-center gap-1 flex-wrap">
                            <button
                              onClick={() => navigate(`/ecritures/${ecriture.id}`)}
                              className="btn btn-ghost btn-xs text-info"
                              title="Voir"
                            ><Eye className="w-3 h-3" /></button>
                            <button
                              onClick={() => navigate(`/ecritures/${ecriture.id}/modifier`)}
                              className="btn btn-ghost btn-xs text-success"
                              title="Modifier"
                              disabled={ecriture.status !== 'brouillon'}
                            ><Edit className="w-3 h-3" /></button>
                            <button
                              onClick={() => handleDownloadPDF(ecriture)}
                              className="btn btn-ghost btn-xs text-primary"
                              title="PDF"
                              disabled={isPdfLoading}
                            >
                              {isPdfLoading
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <Download className="w-3 h-3" />}
                            </button>
                            {ecriture.status === 'brouillon' && (
                              <>
                                <button
                                  onClick={() => handleValider(ecriture.id)}
                                  className="btn btn-success btn-xs"
                                  title="Valider"
                                  disabled={isActing}
                                >
                                  {isActing
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <CheckCircle className="w-3 h-3" />}
                                </button>
                                <button
                                  onClick={() => handleAnnuler(ecriture.id)}
                                  className="btn btn-warning btn-xs"
                                  title="Annuler"
                                  disabled={isActing}
                                >
                                  {isActing
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <XCircle className="w-3 h-3" />}
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => {
                                setEcritureToDelete(ecriture)
                                setShowDeleteModal(true)
                              }}
                              className="btn btn-ghost btn-xs text-error"
                              title="Supprimer"
                              disabled={ecriture.status !== 'brouillon'}
                            ><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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
                      <option value="8">8</option>
                      <option value="12">12</option>
                      <option value="15">15</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                    </select>
                    <div className="join">
                      <button
                        className="join-item btn btn-xs sm:btn-sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1 || loading}
                      >
                        <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        let pageNum
                        if (totalPages <= 5) pageNum = i + 1
                        else if (currentPage <= 3) pageNum = i + 1
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                        else pageNum = currentPage - 2 + i
                        return (
                          <button
                            key={i}
                            className={`join-item btn btn-xs sm:btn-sm ${currentPage === pageNum ? 'btn-success' : ''}`}
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
      {showDeleteModal && ecritureToDelete && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-md">
            <div className="text-center mb-4">
              <div className="bg-error/10 text-error rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg mb-2">Confirmer la suppression</h3>
              <p className="text-sm text-base-content/70">
                Voulez-vous vraiment supprimer cette écriture ?
              </p>
              <p className="text-base font-bold text-error mt-2">
                "{ecritureToDelete.reference} - {ecritureToDelete.libelle}"
              </p>
              <p className="text-xs text-base-content/50 mt-2">
                Cette action est irréversible.
              </p>
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
                disabled={deleteLoading}
              >
                {deleteLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : 'Supprimer'}
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
// StatCard
// ============================================================
const StatCard = ({ label, value, icon: Icon, color, small = false }) => (
  <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
    <div className={`stat-figure ${color}`}>
      <Icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
    </div>
    <div className="stat-title text-xs sm:text-sm font-semibold">{label}</div>
    <div className={`stat-value ${small ? 'text-xs sm:text-sm lg:text-base' : 'text-base sm:text-lg lg:text-2xl'} font-black truncate`}>
      {value}
    </div>
  </div>
)

export default Ecritures