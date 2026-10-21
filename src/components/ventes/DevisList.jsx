// src/components/sales/DevisList.jsx
import React, {
  useEffect, useState, useCallback, useRef, useMemo
} from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import { downloadDevisPDF } from './DevisPDF'
import {
  FileText, Eye, CheckCircle, XCircle, Clock, Search, RefreshCw,
  Filter, AlertCircle, ChevronLeft, ChevronRight, Plus, AlertTriangle,
  Trash2, Printer, Send, Ban, ShoppingCart, Edit, X, Grid3x3,
  Table2, MoreVertical, Calendar, User, DollarSign, Loader2
} from 'lucide-react'

const DevisList = () => {
  const navigate = useNavigate()

  const [devisList, setDevisList] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [devisToDelete, setDevisToDelete] = useState(null)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })
  const [sortField, setSortField] = useState('date_creation')
  const [sortDirection, setSortDirection] = useState('desc')
  const [generatingPDF, setGeneratingPDF] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const [showFilters, setShowFilters] = useState(false)

  const cacheRef = useRef(new Map())
  const fetchingRef = useRef(false)

  const unwrap = (data) => Array.isArray(data) ? data : (data?.results || [])

  const statutConfig = {
    draft: { label: 'Brouillon', icon: Clock, color: 'text-gray-500', bgColor: 'bg-gray-100' },
    sent: { label: 'Envoyé', icon: Send, color: 'text-blue-500', bgColor: 'bg-blue-100' },
    accepted: { label: 'Accepté', icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-100' },
    refused: { label: 'Refusé', icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-100' },
    converted: { label: 'Converti', icon: ShoppingCart, color: 'text-purple-500', bgColor: 'bg-purple-100' },
    expired: { label: 'Expiré', icon: AlertCircle, color: 'text-orange-500', bgColor: 'bg-orange-100' },
    cancelled: { label: 'Annulé', icon: Ban, color: 'text-gray-500', bgColor: 'bg-gray-100' },
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000)
  }

  // ---------- Fetch avec cache ----------
  const fetchDevis = useCallback(async ({ bypassCache = false } = {}) => {
    const key = 'devis_list'

    if (!bypassCache && cacheRef.current.has(key)) {
      setDevisList(cacheRef.current.get(key))
      setLoading(false)
      setInitialLoad(false)
      return
    }

    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)

    try {
      // ✅ page_size=500 pour tout charger en 1 requête
      const response = await AxiosInstance.get('/devis/?page_size=500')
      const data = unwrap(response.data).filter(d => d && typeof d === 'object')

      cacheRef.current.set(key, data)
      if (cacheRef.current.size > 10) {
        const firstKey = cacheRef.current.keys().next().value
        cacheRef.current.delete(firstKey)
      }

      setDevisList(data)
    } catch (error) {
      console.error(error)
      showNotification('Erreur de chargement des devis', 'error')
      setDevisList([])
    } finally {
      setLoading(false)
      setInitialLoad(false)
      fetchingRef.current = false
    }
  }, [])

  const refreshData = async () => {
    cacheRef.current.clear()
    await fetchDevis({ bypassCache: true })
  }

  useEffect(() => {
    fetchDevis()
  }, [fetchDevis])

  // ---------- Responsive itemsPerPage ----------
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

  // ---------- Stats ----------
  const stats = useMemo(() => {
    const totalMontant = devisList.reduce((sum, d) => sum + (Number(d.total) || 0), 0)
    return {
      total: devisList.length,
      draft: devisList.filter(d => d.status === 'draft').length,
      sent: devisList.filter(d => d.status === 'sent').length,
      accepted: devisList.filter(d => d.status === 'accepted').length,
      converted: devisList.filter(d => d.status === 'converted').length,
      expired: devisList.filter(d => d.status === 'expired').length,
      totalMontant,
    }
  }, [devisList])

  // ---------- Actions ----------
  const handleGeneratePDF = async (devis, e) => {
    e?.stopPropagation?.()
    setGeneratingPDF(devis.id)
    try {
      const cacheKey = `devis_detail_${devis.id}`
      let data
      if (cacheRef.current.has(cacheKey)) {
        data = cacheRef.current.get(cacheKey)
      } else {
        const res = await AxiosInstance.get(`/devis/${devis.id}/`)
        data = res.data
        cacheRef.current.set(cacheKey, data)
      }
      await downloadDevisPDF(data)
      showNotification('PDF généré avec succès', 'success')
    } catch (error) {
      console.error(error)
      showNotification('Erreur lors de la génération du PDF', 'error')
    } finally {
      setGeneratingPDF(null)
    }
  }

  const handleAction = async (devisId, action, successMessage, data = null) => {
    setActionLoading(devisId)
    try {
      await AxiosInstance.post(`/devis/${devisId}/${action}/`, data)
      cacheRef.current.clear()
      showNotification(successMessage, 'success')
      await fetchDevis({ bypassCache: true })
    } catch (error) {
      showNotification(
        error.response?.data?.error || `Erreur lors de l'action ${action}`,
        'error'
      )
    } finally {
      setActionLoading(null)
    }
  }

  const handleConvertToVente = async (devisId) => {
    setActionLoading(devisId)
    try {
      const response = await AxiosInstance.post(`/devis/${devisId}/convertir_en_vente/`)
      cacheRef.current.clear()
      showNotification('Devis converti en vente avec succès', 'success')
      if (response.data.vente?.id) navigate(`/ventes/${response.data.vente.id}`)
      else await fetchDevis({ bypassCache: true })
    } catch (error) {
      showNotification(
        error.response?.data?.error || 'Erreur lors de la conversion',
        'error'
      )
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteDevis = async () => {
    if (!devisToDelete) return
    setActionLoading(devisToDelete.id)
    try {
      await AxiosInstance.delete(`/devis/${devisToDelete.id}/`)
      cacheRef.current.clear()
      showNotification('Devis supprimé avec succès', 'success')
      setShowDeleteModal(false)
      setDevisToDelete(null)
      await fetchDevis({ bypassCache: true })
    } catch (error) {
      showNotification('Erreur lors de la suppression', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('asc') }
  }

  const isExpired = (devis) => {
    if (!devis.date_expiration) return false
    return new Date(devis.date_expiration) < new Date()
      && devis.status !== 'converted'
      && devis.status !== 'cancelled'
  }

  // ---------- Filtrage + tri ----------
  const filteredAndSortedDevis = useMemo(() => {
    const filtered = devisList.filter(devis => {
      if (!devis) return false
      const search = searchTerm.toLowerCase()
      const ref = (devis.reference || '').toLowerCase()
      const client = (devis.client_nom || '').toLowerCase()
      return (ref.includes(search) || client.includes(search))
        && (!filterStatut || devis.status === filterStatut)
        && (!dateRange.start || new Date(devis.date_creation) >= new Date(dateRange.start))
        && (!dateRange.end || new Date(devis.date_creation) <= new Date(dateRange.end))
    })

    filtered.sort((a, b) => {
      let aVal, bVal
      switch (sortField) {
        case 'total':
          aVal = Number(a.total) || 0
          bVal = Number(b.total) || 0
          break
        case 'date_creation':
        case 'date_expiration':
          aVal = new Date(a[sortField] || 0).getTime()
          bVal = new Date(b[sortField] || 0).getTime()
          break
        default:
          aVal = (a[sortField] || '').toString().toLowerCase()
          bVal = (b[sortField] || '').toString().toLowerCase()
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [devisList, searchTerm, filterStatut, dateRange, sortField, sortDirection])

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedDevis.length / itemsPerPage))
  const paginatedDevis = useMemo(() => filteredAndSortedDevis.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ), [filteredAndSortedDevis, currentPage, itemsPerPage])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1)
  }, [totalPages, currentPage])

  // ---------- Helpers ----------
  const formatPrice = (price) => {
    const n = Number(price)
    if (!Number.isFinite(n)) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }

  const getStatusBadge = (statut) => {
    const config = statutConfig[statut] || statutConfig.draft
    const Icon = config.icon
    return (
      <span className={`badge ${config.bgColor} ${config.color} gap-1 px-3 py-2 text-xs`}>
        <Icon className="w-3 h-3" /> {config.label}
      </span>
    )
  }

  // ---------- Premier chargement ----------
  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <div className="loading loading-spinner loading-lg text-primary w-12 h-12 sm:w-16 sm:h-16"></div>
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement des devis...
          </p>
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
            <button
              className="btn btn-ghost btn-xs btn-circle"
              onClick={() => setNotification({ ...notification, show: false })}
            >
              <X className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-base-content bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Devis
          </h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            Gérez vos devis ({stats.total} au total)
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button onClick={refreshData} className="btn btn-sm sm:btn-md btn-outline gap-1 sm:gap-2" disabled={loading}>
            <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Actualiser</span>
          </button>
          <button onClick={() => navigate('/devis/nouveau')} className="btn btn-sm sm:btn-md btn-primary gap-1 sm:gap-2">
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Nouveau devis</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-primary"><FileText className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Total</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black">{stats.total}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-gray-500"><Clock className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Brouillons</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black">{stats.draft}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-blue-500"><Send className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Envoyés</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black">{stats.sent}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-green-500"><CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Acceptés</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black">{stats.accepted}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-purple-500"><ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Converties</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black">{stats.converted}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-primary"><DollarSign className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Montant total</div>
          <div className="stat-value text-base sm:text-lg lg:text-2xl font-black">{formatPrice(stats.totalMontant)}</div>
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
                placeholder="Rechercher par référence, client..."
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

          <div className={`${showFilters ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row gap-3`}>
            <select
              className="select select-bordered w-full sm:w-40 text-sm"
              value={filterStatut}
              onChange={(e) => { setFilterStatut(e.target.value); setCurrentPage(1) }}
            >
              <option value="">Tous statuts</option>
              <option value="draft">Brouillon</option>
              <option value="sent">Envoyé</option>
              <option value="accepted">Accepté</option>
              <option value="refused">Refusé</option>
              <option value="converted">Converti</option>
              <option value="expired">Expiré</option>
            </select>

            <input
              type="date"
              className="input input-bordered w-full sm:w-40 text-sm"
              value={dateRange.start}
              onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />

            <input
              type="date"
              className="input input-bordered w-full sm:w-40 text-sm"
              value={dateRange.end}
              onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />

            <button
              className="btn btn-outline gap-2"
              onClick={() => {
                setFilterStatut(''); setDateRange({ start: '', end: '' })
                setSearchTerm(''); setCurrentPage(1)
              }}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Réinitialiser</span>
            </button>

            <div className="join ml-auto">
              <button
                className={`join-item btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                className={`join-item btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('table')}
              >
                <Table2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden">
        {filteredAndSortedDevis.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <FileText className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 text-base-content/30" />
            <p className="text-lg sm:text-xl font-semibold text-base-content/50">Aucun devis trouvé</p>
            <p className="text-sm sm:text-base text-base-content/40 mt-2">
              Essayez de modifier vos critères de recherche
            </p>
            <button className="btn btn-primary mt-6 gap-2" onClick={() => navigate('/devis/nouveau')}>
              <Plus className="w-4 h-4" /> Créer un devis
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="p-3 sm:p-4 lg:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {paginatedDevis.map((devis) => {
                const config = statutConfig[devis.status] || statutConfig.draft
                const Icon = config.icon
                const expired = isExpired(devis)

                return (
                  <div
                    key={devis.id}
                    className={`bg-base-200 rounded-xl p-4 sm:p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border ${expired ? 'border-error/50' : 'border-base-300'}`}
                    onClick={() => navigate(`/devis/${devis.id}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`avatar placeholder ${config.bgColor} rounded-xl w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center`}>
                          <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${config.color}`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-base sm:text-lg text-base-content line-clamp-1">
                            {devis.reference}
                          </h3>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {getStatusBadge(devis.status)}
                          </div>
                        </div>
                      </div>

                      <div className="dropdown dropdown-end" onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-ghost btn-xs btn-circle">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        <ul className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-44">
                          <li>
                            <button onClick={(e) => handleGeneratePDF(devis, e)} disabled={generatingPDF === devis.id}>
                              {generatingPDF === devis.id
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Printer className="w-4 h-4" />}
                              PDF
                            </button>
                          </li>
                          <li>
                            <Link to={`/devis/${devis.id}`}>
                              <Eye className="w-4 h-4" /> Détails
                            </Link>
                          </li>
                          {devis.status === 'draft' && (
                            <>
                              <li>
                                <Link to={`/devis/${devis.id}/edit`}>
                                  <Edit className="w-4 h-4" /> Modifier
                                </Link>
                              </li>
                              <li>
                                <button onClick={() => handleAction(devis.id, 'envoyer', 'Devis envoyé')}>
                                  <Send className="w-4 h-4" /> Envoyer
                                </button>
                              </li>
                            </>
                          )}
                          {devis.status === 'accepted' && (
                            <li>
                              <button onClick={() => handleConvertToVente(devis.id)}>
                                <ShoppingCart className="w-4 h-4" /> Convertir
                              </button>
                            </li>
                          )}
                          {devis.status !== 'converted' && devis.status !== 'cancelled' && (
                            <li>
                              <button
                                className="text-error"
                                onClick={() => { setDevisToDelete(devis); setShowDeleteModal(true) }}
                              >
                                <Trash2 className="w-4 h-4" /> Supprimer
                              </button>
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-base-content/70">
                        <User className="w-3 h-3 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                        <span className="truncate">{devis.client_nom || 'Anonyme'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-base-content/70">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                        <span>Créé le {formatDate(devis.date_creation)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-base-content/70">
                        <AlertCircle className={`w-3 h-3 sm:w-4 sm:h-4 ${expired ? 'text-error' : 'text-primary'} flex-shrink-0`} />
                        <span className={expired ? 'text-error font-semibold' : ''}>
                          Expire le {formatDate(devis.date_expiration)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-base-300 flex items-center justify-between">
                      <span className="font-bold text-primary text-base sm:text-lg">
                        {formatPrice(devis.total)}
                      </span>
                      <span className="text-xs text-base-content/40">
                        {devis.items?.length || 0} article(s)
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-xs sm:table-sm lg:table-md w-full">
              <thead>
                <tr className="text-xs sm:text-sm">
                  <th>Référence</th>
                  <th>Client</th>
                  <th>Date création</th>
                  <th className="hidden md:table-cell">Expiration</th>
                  <th>Total</th>
                  <th>Statut</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDevis.map((devis) => {
                  const expired = isExpired(devis)
                  return (
                    <tr
                      key={devis.id}
                      className="hover cursor-pointer"
                      onClick={() => navigate(`/devis/${devis.id}`)}
                    >
                      <td className="font-mono text-sm font-semibold">{devis.reference}</td>
                      <td>{devis.client_nom || 'Anonyme'}</td>
                      <td className="text-sm">{formatDate(devis.date_creation)}</td>
                      <td className={`hidden md:table-cell text-sm ${expired ? 'text-error font-semibold' : ''}`}>
                        {formatDate(devis.date_expiration)}
                      </td>
                      <td className="font-bold text-primary">{formatPrice(devis.total)}</td>
                      <td>{getStatusBadge(devis.status)}</td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1 sm:gap-2">
                          <button
                            className="btn btn-ghost btn-xs sm:btn-sm text-info"
                            onClick={(e) => handleGeneratePDF(devis, e)}
                            disabled={generatingPDF === devis.id}
                          >
                            {generatingPDF === devis.id
                              ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                              : <Printer className="w-3 h-3 sm:w-4 sm:h-4" />}
                          </button>
                          <button
                            className="btn btn-ghost btn-xs sm:btn-sm"
                            onClick={(e) => { e.stopPropagation(); navigate(`/devis/${devis.id}`) }}
                          >
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          {devis.status === 'draft' && (
                            <button
                              className="btn btn-ghost btn-xs sm:btn-sm text-info"
                              onClick={(e) => { e.stopPropagation(); navigate(`/devis/${devis.id}/edit`) }}
                            >
                              <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          )}
                          {devis.status === 'draft' && (
                            <button
                              className="btn btn-ghost btn-xs sm:btn-sm text-blue-500"
                              onClick={(e) => { e.stopPropagation(); handleAction(devis.id, 'envoyer', 'Devis envoyé') }}
                            >
                              <Send className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          )}
                          {devis.status === 'accepted' && (
                            <button
                              className="btn btn-ghost btn-xs sm:btn-sm text-purple-500"
                              onClick={(e) => { e.stopPropagation(); handleConvertToVente(devis.id) }}
                            >
                              <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          )}
                          {devis.status !== 'converted' && devis.status !== 'cancelled' && (
                            <button
                              className="btn btn-ghost btn-xs sm:btn-sm text-error"
                              onClick={(e) => { e.stopPropagation(); setDevisToDelete(devis); setShowDeleteModal(true) }}
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filteredAndSortedDevis.length > 0 && (
          <div className="p-3 sm:p-4 border-t border-base-300">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="text-xs sm:text-sm text-base-content/60 order-2 sm:order-1">
                {((currentPage - 1) * itemsPerPage) + 1} -{' '}
                {Math.min(currentPage * itemsPerPage, filteredAndSortedDevis.length)} sur{' '}
                {filteredAndSortedDevis.length}
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
                    disabled={currentPage === 1}
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
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    className="join-item btn btn-xs sm:btn-sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal suppression */}
      {showDeleteModal && devisToDelete && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-md p-4 sm:p-6">
            <div className="text-center mb-4 sm:mb-6">
              <div className="avatar placeholder mb-3 sm:mb-4">
                <div className="bg-error/10 text-error rounded-full w-16 h-16 sm:w-20 sm:h-20">
                  <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10" />
                </div>
              </div>
              <h3 className="font-bold text-lg sm:text-xl mb-2">Confirmer la suppression</h3>
              <p className="text-sm text-base-content/70">
                Voulez-vous vraiment supprimer ce devis ?
              </p>
              <p className="text-base font-bold text-error mt-2">"{devisToDelete.reference}"</p>
            </div>
            <div className="flex gap-3">
              <button className="btn btn-ghost flex-1" onClick={() => setShowDeleteModal(false)}>
                Annuler
              </button>
              <button className="btn btn-error flex-1" onClick={handleDeleteDevis}>
                Supprimer
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

export default DevisList