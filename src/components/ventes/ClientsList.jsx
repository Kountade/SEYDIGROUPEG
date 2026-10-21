// src/components/sales/ClientsList.jsx
import React, {
  useEffect, useState, useCallback, useRef, useMemo,
} from 'react'
import { useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Plus, Edit, Trash2, Search, Users, Building2, User,
  Phone, Mail, MapPin, RefreshCw, X, CheckCircle, AlertCircle,
  Eye, Star, StarOff, Filter, ChevronLeft, ChevronRight,
  Loader2,
} from 'lucide-react'

// ============================================================
// CONSTANTES
// ============================================================
const DEBOUNCE_MS = 300
const CACHE_TTL_MS = 2 * 60 * 1000
const CACHE_MAX = 20

const unwrap = (payload) =>
  Array.isArray(payload) ? payload : (payload?.results || [])

// ============================================================
// COMPOSANT
// ============================================================
const ClientsList = () => {
  const navigate = useNavigate()

  // ---------- État principal ----------
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState(null)

  // ---------- Filtres serveur ----------
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // ---------- Pagination serveur ----------
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // ---------- Tri serveur ----------
  const [sortField, setSortField] = useState('nom')
  const [sortDirection, setSortDirection] = useState('asc')

  // ---------- UI ----------
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [clientToDelete, setClientToDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [toggling, setToggling] = useState(null)
  const [notification, setNotification] = useState({
    show: false, message: '', type: 'success',
  })

  // ---------- Stats ----------
  const [stats, setStats] = useState({
    total: 0, particuliers: 0, entreprises: 0,
    revendeurs: 0, actifs: 0,
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
    type: typeFilter,
    status: statusFilter,
    sort: `${sortField}:${sortDirection}`,
  }), [currentPage, itemsPerPage, debouncedSearch, typeFilter,
       statusFilter, sortField, sortDirection])

  // ============================================================
  // FETCH PRINCIPAL
  // ============================================================
  const fetchClients = useCallback(async ({ bypassCache = false } = {}) => {
    const key = buildCacheKey()

    if (!bypassCache) {
      const cached = cacheGet(key)
      if (cached) {
        setClients(cached.results)
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
      if (typeFilter !== 'all') params.client_type = typeFilter
      if (statusFilter !== 'all') params.is_active = statusFilter === 'active'

      const response = await AxiosInstance.get('/clients/', {
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

      setClients(results)
      setTotalCount(count)
      setTotalPages(nbPages)
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
      console.error('Erreur chargement clients:', err)
      if (err.response?.status === 401) {
        setError('Session expirée, veuillez vous reconnecter')
      } else if (err.response?.status === 403) {
        setError("Vous n'avez pas les droits")
      } else {
        setError('Erreur de chargement des clients')
      }
      showNotification('Erreur de chargement', 'error')
      setClients([])
    } finally {
      if (abortRef.current === controller) {
        setLoading(false)
        setInitialLoad(false)
      }
    }
  }, [buildCacheKey, currentPage, itemsPerPage, debouncedSearch,
      typeFilter, statusFilter, sortField, sortDirection,
      showNotification, cacheGet, cacheSet])

  // ✅ UN SEUL useEffect
  useEffect(() => {
    fetchClients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildCacheKey])

  // ============================================================
  // FETCH STATS (serveur si dispo, sinon fallback)
  // ============================================================
  const fetchStats = useCallback(async () => {
    try {
      const res = await AxiosInstance.get('/clients/stats/')
      const d = res.data || {}
      setStats({
        total: d.total || 0,
        particuliers: d.particuliers || 0,
        entreprises: d.entreprises || 0,
        revendeurs: d.revendeurs || 0,
        actifs: d.actifs || 0,
      })
    } catch {
      // Fallback : si l'endpoint n'existe pas, on fait une requête
      // paginée sans pagination pour compter (mais ce n'est pas idéal)
      try {
        const res = await AxiosInstance.get('/clients/', {
          params: { page_size: 1 },
        })
        const total = res.data?.count || 0
        setStats(prev => ({ ...prev, total }))
      } catch {
        // silencieux
      }
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
      fetchClients({ bypassCache: true }),
      fetchStats(),
    ])
  }

  // ============================================================
  // ACTIONS
  // ============================================================
  const handleDelete = async () => {
    if (!clientToDelete) return
    setDeleteLoading(true)
    try {
      await AxiosInstance.delete(`/clients/${clientToDelete.id}/`)
      cacheRef.current.clear()
      showNotification('Client supprimé avec succès', 'success')
      setShowDeleteModal(false)
      setClientToDelete(null)
      await Promise.all([
        fetchClients({ bypassCache: true }),
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

  const toggleActive = async (client) => {
    setToggling(client.id)
    try {
      await AxiosInstance.patch(`/clients/${client.id}/`, {
        is_active: !client.is_active,
      })
      // Optimistic update
      setClients(prev => prev.map(c =>
        c.id === client.id ? { ...c, is_active: !c.is_active } : c
      ))
      cacheRef.current.clear()
      showNotification(
        client.is_active ? 'Client désactivé' : 'Client activé', 'success'
      )
      await fetchStats()
    } catch (err) {
      showNotification('Erreur lors de la modification', 'error')
    } finally {
      setToggling(null)
    }
  }

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
  // HELPERS ICONS / LABELS
  // ============================================================
  const getClientTypeIcon = (type) => {
    switch (type) {
      case 'entreprise': return <Building2 className="w-4 h-4" />
      case 'revendeur': return <Star className="w-4 h-4" />
      default: return <User className="w-4 h-4" />
    }
  }

  const getClientTypeLabel = (type) => {
    switch (type) {
      case 'entreprise': return 'Entreprise'
      case 'revendeur': return 'Revendeur'
      default: return 'Particulier'
    }
  }

  // ============================================================
  // LOADING / ERROR
  // ============================================================
  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement des clients...
          </p>
        </div>
      </div>
    )
  }

  if (error && clients.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
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
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 min-h-screen">
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
        <div className="fixed top-20 right-4 sm:right-6 z-50 animate-slideDown">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-xl text-sm sm:text-base rounded-xl`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success'
                ? <CheckCircle className="w-4 h-4" />
                : <AlertCircle className="w-4 h-4" />}
              <span className="font-medium">{notification.message}</span>
            </div>
            <button
              className="btn btn-ghost btn-xs btn-circle"
              onClick={() => setNotification({ ...notification, show: false })}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Modal suppression */}
      {showDeleteModal && clientToDelete && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md p-0 overflow-hidden">
            <div className="bg-error/10 p-4 text-center">
              <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-8 h-8 text-error" />
              </div>
              <h3 className="text-xl font-bold text-error">Confirmer la suppression</h3>
            </div>
            <div className="p-6 text-center">
              <p className="text-base-content/70">Voulez-vous vraiment supprimer ce client ?</p>
              <p className="font-semibold text-error mt-2">
                {clientToDelete.nom} {clientToDelete.prenom || ''}
              </p>
            </div>
            <div className="flex gap-3 p-4 bg-gray-50">
              <button
                className="btn btn-ghost flex-1"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
              >Annuler</button>
              <button
                className="btn btn-error flex-1 gap-2"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Suppression...</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Supprimer</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full filter blur-3xl"></div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-primary">
                Clients
              </h1>
            </div>
            <p className="text-sm text-base-content/60 ml-1">
              Gérez votre base de clients – {totalCount.toLocaleString('fr-FR')} client(s)
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={refreshData}
              className="btn btn-sm sm:btn-md btn-outline gap-2"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
            <button
              onClick={() => navigate('/clients/nouveau')}
              className="btn btn-sm sm:btn-md btn-primary gap-2"
            >
              <Plus className="w-4 h-4" />
              Nouveau client
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total" value={stats.total} icon={Users} color="text-primary" />
        <StatCard label="Particuliers" value={stats.particuliers} icon={User} color="text-info" />
        <StatCard label="Entreprises" value={stats.entreprises} icon={Building2} color="text-secondary" />
        <StatCard label="Revendeurs" value={stats.revendeurs} icon={Star} color="text-warning" />
        <StatCard label="Actifs" value={stats.actifs} icon={CheckCircle} color="text-success" />
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, prénom, email, téléphone..."
              className="input input-bordered w-full pl-9 py-3"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
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
            className="btn btn-outline btn-sm sm:hidden gap-2"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
          </button>
          <div className={`${showFilters ? 'grid' : 'hidden'} sm:grid grid-cols-1 sm:grid-cols-3 gap-3`}>
            <select
              className="select select-bordered w-full"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1) }}
            >
              <option value="all">Tous les types</option>
              <option value="particulier">Particuliers</option>
              <option value="entreprise">Entreprises</option>
              <option value="revendeur">Revendeurs</option>
            </select>
            <select
              className="select select-bordered w-full"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
            <button
              className="btn btn-outline gap-2"
              onClick={() => {
                setTypeFilter('all')
                setStatusFilter('all')
                setSearchTerm('')
                setCurrentPage(1)
              }}
            >
              <RefreshCw className="w-4 h-4" /> Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-white text-sm">
                <th className="py-4 font-semibold">
                  <button
                    className="flex items-center gap-1 hover:text-primary"
                    onClick={() => handleSort('nom')}
                  >
                    Client {sortField === 'nom' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </button>
                </th>
                <th className="py-4 font-semibold hidden md:table-cell">Contact</th>
                <th className="py-4 font-semibold hidden lg:table-cell">Adresse</th>
                <th className="py-4 font-semibold text-center">Type</th>
                <th className="py-4 font-semibold text-center">Statut</th>
                <th className="py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                        <Users className="w-10 h-10 text-gray-300" />
                      </div>
                      <p className="text-gray-500 font-medium">
                        {debouncedSearch || typeFilter !== 'all' || statusFilter !== 'all'
                          ? 'Aucun client ne correspond à vos critères'
                          : 'Aucun client trouvé'}
                      </p>
                      <button
                        onClick={() => navigate('/clients/nouveau')}
                        className="btn btn-primary btn-sm gap-2 mt-2"
                      >
                        <Plus className="w-4 h-4" /> Ajouter un client
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 group">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          client.client_type === 'entreprise'
                            ? 'bg-secondary/10 text-secondary'
                            : client.client_type === 'revendeur'
                              ? 'bg-warning/10 text-warning'
                              : 'bg-primary/10 text-primary'
                        }`}>
                          {getClientTypeIcon(client.client_type)}
                        </div>
                        <div>
                          <p className="font-semibold">
                            {client.nom} {client.prenom || ''}
                          </p>
                          {client.raison_sociale && (
                            <p className="text-xs text-gray-500">{client.raison_sociale}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell">
                      <div className="space-y-1">
                        {client.telephone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span>{client.telephone}</span>
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <span className="truncate max-w-[150px]">{client.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="hidden lg:table-cell">
                      {client.adresse && (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span className="truncate max-w-[150px]">{client.adresse}</span>
                        </div>
                      )}
                    </td>
                    <td className="text-center">
                      <span className={`badge ${
                        client.client_type === 'entreprise' ? 'badge-secondary'
                        : client.client_type === 'revendeur' ? 'badge-warning'
                        : 'badge-primary'
                      }`}>
                        {getClientTypeLabel(client.client_type)}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={`badge ${client.is_active ? 'badge-success' : 'badge-error'}`}>
                        {client.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="flex justify-center gap-1 opacity-70 group-hover:opacity-100">
                        <button
                          onClick={() => navigate(`/clients/${client.id}`)}
                          className="btn btn-ghost btn-sm btn-circle"
                          title="Détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/clients/${client.id}/modifier`)}
                          className="btn btn-ghost btn-sm btn-circle"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(client)}
                          className="btn btn-ghost btn-sm btn-circle"
                          title={client.is_active ? 'Désactiver' : 'Activer'}
                          disabled={toggling === client.id}
                        >
                          {toggling === client.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : client.is_active
                              ? <Star className="w-4 h-4 text-success" />
                              : <StarOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => {
                            setClientToDelete(client)
                            setShowDeleteModal(true)
                          }}
                          className="btn btn-ghost btn-sm btn-circle text-error"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ Pagination serveur */}
        {totalCount > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-500">
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
                clients
              </div>
              <div className="flex items-center gap-3">
                <select
                  className="select select-bordered select-sm"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(parseInt(e.target.value))
                    setCurrentPage(1)
                  }}
                >
                  <option value="5">5 lignes</option>
                  <option value="10">10 lignes</option>
                  <option value="15">15 lignes</option>
                  <option value="20">20 lignes</option>
                  <option value="50">50 lignes</option>
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
                        onClick={() => setCurrentPage(pageNum)}
                        className={`join-item btn btn-sm ${currentPage === pageNum ? 'btn-primary' : ''}`}
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
// StatCard
// ============================================================
const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="card bg-white shadow-md rounded-xl border border-gray-200">
    <div className="card-body p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase">{label}</p>
          <p className={`text-xl sm:text-2xl font-bold ${color}`}>
            {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
          </p>
        </div>
        <Icon className={`w-8 h-8 ${color} opacity-20`} />
      </div>
    </div>
  </div>
)

export default ClientsList