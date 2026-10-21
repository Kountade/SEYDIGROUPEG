// src/components/sales/ClientsList.jsx
import React, {
  useEffect, useState, useCallback, useRef, useMemo
} from 'react'
import { useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Plus, Edit, Trash2, Search, Users, Building2, User,
  Phone, Mail, MapPin, RefreshCw, X, CheckCircle, AlertCircle,
  Eye, Star, StarOff, Filter, ChevronLeft, ChevronRight,
  Loader2
} from 'lucide-react'

const ClientsList = () => {
  const navigate = useNavigate()

  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [clientToDelete, setClientToDelete] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })
  const [toggling, setToggling] = useState(null)

  // Refs cache
  const cacheRef = useRef(new Map())
  const fetchingRef = useRef(false)

  const unwrap = (data) => Array.isArray(data) ? data : (data?.results || [])

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000)
  }

  // ---------- Fetch avec cache ----------
  const fetchClients = useCallback(async ({ bypassCache = false } = {}) => {
    const key = 'clients_list'

    if (!bypassCache && cacheRef.current.has(key)) {
      setClients(cacheRef.current.get(key))
      setLoading(false)
      setInitialLoad(false)
      return
    }

    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)

    try {
      // ✅ page_size=500 pour avoir tous les clients (ou 200)
      const response = await AxiosInstance.get('/clients/?page_size=500')
      const data = unwrap(response.data).filter(c => c && typeof c === 'object')

      cacheRef.current.set(key, data)
      if (cacheRef.current.size > 10) {
        const firstKey = cacheRef.current.keys().next().value
        cacheRef.current.delete(firstKey)
      }

      setClients(data)
    } catch (error) {
      console.error('Erreur:', error)
      showNotification('Erreur de chargement des clients', 'error')
      setClients([])
    } finally {
      setLoading(false)
      setInitialLoad(false)
      fetchingRef.current = false
    }
  }, [])

  const refreshData = async () => {
    cacheRef.current.clear()
    await fetchClients({ bypassCache: true })
  }

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  // ---------- Actions ----------
  const handleDelete = async () => {
    if (!clientToDelete) return
    try {
      await AxiosInstance.delete(`/clients/${clientToDelete.id}/`)
      cacheRef.current.clear()
      showNotification('Client supprimé avec succès', 'success')
      fetchClients({ bypassCache: true })
      setShowDeleteModal(false)
      setClientToDelete(null)
    } catch (error) {
      showNotification(
        error.response?.data?.detail || 'Erreur lors de la suppression',
        'error'
      )
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
      showNotification(client.is_active ? 'Client désactivé' : 'Client activé', 'success')
    } catch (error) {
      showNotification('Erreur lors de la modification', 'error')
    } finally {
      setToggling(null)
    }
  }

  // ---------- Filtrage ----------
  const filteredClients = useMemo(() => {
    const search = searchTerm.toLowerCase()
    return clients.filter(client => {
      if (!client) return false
      const matchesSearch = !search
        || (client.nom || '').toLowerCase().includes(search)
        || (client.prenom || '').toLowerCase().includes(search)
        || (client.email || '').toLowerCase().includes(search)
        || (client.telephone || '').toLowerCase().includes(search)
        || (client.raison_sociale || '').toLowerCase().includes(search)

      const matchesType = typeFilter === 'all' || client.client_type === typeFilter

      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' && client.is_active)
        || (statusFilter === 'inactive' && !client.is_active)

      return matchesSearch && matchesType && matchesStatus
    })
  }, [clients, searchTerm, typeFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / itemsPerPage))
  const paginatedClients = useMemo(() => filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ), [filteredClients, currentPage, itemsPerPage])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1)
  }, [totalPages, currentPage])

  const stats = useMemo(() => ({
    total: clients.length,
    particuliers: clients.filter(c => c.client_type === 'particulier').length,
    entreprises: clients.filter(c => c.client_type === 'entreprise').length,
    revendeurs: clients.filter(c => c.est_revendeur).length,
    actifs: clients.filter(c => c.is_active).length,
  }), [clients])

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

  // ---------- Premier chargement ----------
  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <div className="loading loading-spinner loading-lg text-primary w-12 h-12 sm:w-16 sm:h-16"></div>
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement des clients...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 min-h-screen">
      {/* Spinner overlay */}
      {loading && !initialLoad && (
        <div className="fixed top-20 right-6 z-40">
          <div className="bg-base-100 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border border-base-300">
            <span className="loading loading-spinner loading-xs text-primary"></span>
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
              onClick={() => setNotification({ show: false, message: '', type: 'success' })}
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
              <button className="btn btn-ghost flex-1" onClick={() => setShowDeleteModal(false)}>
                Annuler
              </button>
              <button className="btn btn-error flex-1 gap-2" onClick={handleDelete}>
                <Trash2 className="w-4 h-4" /> Supprimer
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
              Gérez votre base de clients – {stats.total} client(s)
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
        <div className="card bg-white shadow-md rounded-xl border border-gray-200">
          <div className="card-body p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase">Total</p>
                <p className="text-xl sm:text-2xl font-bold text-primary">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-primary/20" />
            </div>
          </div>
        </div>
        <div className="card bg-white shadow-md rounded-xl border border-gray-200">
          <div className="card-body p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase">Particuliers</p>
                <p className="text-xl sm:text-2xl font-bold text-info">{stats.particuliers}</p>
              </div>
              <User className="w-8 h-8 text-info/20" />
            </div>
          </div>
        </div>
        <div className="card bg-white shadow-md rounded-xl border border-gray-200">
          <div className="card-body p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase">Entreprises</p>
                <p className="text-xl sm:text-2xl font-bold text-secondary">{stats.entreprises}</p>
              </div>
              <Building2 className="w-8 h-8 text-secondary/20" />
            </div>
          </div>
        </div>
        <div className="card bg-white shadow-md rounded-xl border border-gray-200">
          <div className="card-body p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase">Revendeurs</p>
                <p className="text-xl sm:text-2xl font-bold text-warning">{stats.revendeurs}</p>
              </div>
              <Star className="w-8 h-8 text-warning/20" />
            </div>
          </div>
        </div>
        <div className="card bg-white shadow-md rounded-xl border border-gray-200">
          <div className="card-body p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase">Actifs</p>
                <p className="text-xl sm:text-2xl font-bold text-success">{stats.actifs}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-success/20" />
            </div>
          </div>
        </div>
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
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            />
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
                <th className="py-4 font-semibold">Client</th>
                <th className="py-4 font-semibold hidden md:table-cell">Contact</th>
                <th className="py-4 font-semibold hidden lg:table-cell">Adresse</th>
                <th className="py-4 font-semibold text-center">Type</th>
                <th className="py-4 font-semibold text-center">Statut</th>
                <th className="py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                        <Users className="w-10 h-10 text-gray-300" />
                      </div>
                      <p className="text-gray-500 font-medium">Aucun client trouvé</p>
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
                paginatedClients.map((client) => (
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
                          <p className="font-semibold">{client.nom} {client.prenom || ''}</p>
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
                          onClick={() => { setClientToDelete(client); setShowDeleteModal(true) }}
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

        {/* Pagination */}
        {filteredClients.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-500">
                Affichage de <span className="font-semibold text-primary">{((currentPage - 1) * itemsPerPage) + 1}</span> à{' '}
                <span className="font-semibold text-primary">{Math.min(currentPage * itemsPerPage, filteredClients.length)}</span>{' '}
                sur <span className="font-semibold">{filteredClients.length}</span> clients
              </div>
              <div className="flex items-center gap-3">
                <select
                  className="select select-bordered select-sm"
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1) }}
                >
                  <option value="5">5 lignes</option>
                  <option value="10">10 lignes</option>
                  <option value="15">15 lignes</option>
                  <option value="20">20 lignes</option>
                </select>
                <div className="join">
                  <button
                    className="join-item btn btn-sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
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
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    className="join-item btn btn-sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
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

export default ClientsList