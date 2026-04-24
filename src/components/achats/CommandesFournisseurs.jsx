// src/components/commandes-fournisseurs/CommandesFournisseurs.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Plus,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  Filter,
  ShoppingCart,
  X,
  AlertCircle,
  CheckCircle,
  Eye,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  LayoutGrid,
  List,
  Truck,
  Clock,
  DollarSign,
  Package,
  Send,
  CheckSquare,
  XCircle,
  Calendar,
  Building2,
  Users,
  FileText,
  Printer,
  Download
} from 'lucide-react'

const CommandesFournisseurs = () => {
  const navigate = useNavigate()

  const [commandes, setCommandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterUrgency, setFilterUrgency] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [commandeToDelete, setCommandeToDelete] = useState(null)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })
  const [viewMode, setViewMode] = useState('table')
  const [sortField, setSortField] = useState('order_date')
  const [sortDirection, setSortDirection] = useState('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    confirmed: 0,
    received: 0,
    cancelled: 0,
    totalAmount: 0
  })

  // Statuts des commandes
  const statusConfig = {
    draft: { label: 'Brouillon', color: 'neutral', icon: FileText },
    sent: { label: 'Envoyée', color: 'info', icon: Send },
    confirmed: { label: 'Confirmée', color: 'primary', icon: CheckCircle },
    in_transit: { label: 'En transit', color: 'warning', icon: Truck },
    partially_received: { label: 'Partiellement reçue', color: 'info', icon: Package },
    received: { label: 'Reçue', color: 'success', icon: CheckSquare },
    cancelled: { label: 'Annulée', color: 'error', icon: XCircle },
    rejected: { label: 'Rejetée', color: 'error', icon: XCircle }
  }

  const urgencyConfig = {
    normal: { label: 'Normal', color: 'success' },
    urgent: { label: 'Urgent', color: 'warning' },
    very_urgent: { label: 'Très urgent', color: 'error' }
  }

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('Token')
      if (!token) {
        setError('Veuillez vous connecter')
        setLoading(false)
        return
      }
      
      let response
      try {
        response = await AxiosInstance.get('/purchase-orders/')
      } catch (err) {
        if (err.response?.status === 404) {
          response = await AxiosInstance.get('/commandes-fournisseurs/')
        } else {
          throw err
        }
      }
      
      const orders = response.data || []
      setCommandes(orders)
      
      const total = orders.length
      const draft = orders.filter(o => o.status === 'draft').length
      const confirmed = orders.filter(o => o.status === 'confirmed').length
      const received = orders.filter(o => o.status === 'received').length
      const cancelled = orders.filter(o => o.status === 'cancelled').length
      const totalAmount = orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0)
      
      setStats({ total, draft, confirmed, received, cancelled, totalAmount })
      
    } catch (error) {
      console.error('Erreur chargement commandes:', error)
      setError('Erreur de chargement des commandes')
      showNotification('Erreur de chargement des commandes', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000)
  }

  const handleDeleteCommande = async () => {
    if (!commandeToDelete) return
    try {
      await AxiosInstance.delete(`/purchase-orders/${commandeToDelete.id}/`)
      showNotification(`Commande ${commandeToDelete.order_number} supprimée avec succès`, 'success')
      fetchData()
      setShowDeleteModal(false)
      setCommandeToDelete(null)
    } catch (error) {
      showNotification('Erreur lors de la suppression', 'error')
    }
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getStatusBadge = (status) => {
    const config = statusConfig[status] || statusConfig.draft
    const Icon = config.icon
    return (
      <div className={`badge badge-${config.color} gap-1 text-xs`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </div>
    )
  }

  const getUrgencyBadge = (urgency) => {
    const config = urgencyConfig[urgency] || urgencyConfig.normal
    return (
      <div className={`badge badge-${config.color} badge-outline gap-1 text-xs`}>
        <Clock className="w-3 h-3" />
        {config.label}
      </div>
    )
  }

  const formatCurrency = (amount) => {
    if (!amount) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('fr-FR')
  }

  // Filtrage et tri
  const filteredAndSortedOrders = React.useMemo(() => {
    let filtered = commandes.filter(order => {
      const search = searchTerm.toLowerCase()
      const orderNumber = (order.order_number || '').toLowerCase()
      const supplierName = (order.supplier_name || order.supplier?.company_name || '').toLowerCase()
      
      const matchesSearch = orderNumber.includes(search) || supplierName.includes(search)
      const matchesStatus = filterStatus === '' || order.status === filterStatus
      const matchesUrgency = filterUrgency === '' || order.urgency === filterUrgency
      
      return matchesSearch && matchesStatus && matchesUrgency
    })

    filtered.sort((a, b) => {
      let aVal = a[sortField] || ''
      let bVal = b[sortField] || ''
      
      if (sortField === 'total') {
        aVal = parseFloat(aVal) || 0
        bVal = parseFloat(bVal) || 0
      } else if (sortField === 'order_date') {
        aVal = new Date(aVal)
        bVal = new Date(bVal)
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [commandes, searchTerm, filterStatus, filterUrgency, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage)
  const paginatedOrders = filteredAndSortedOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Ajuster itemsPerPage selon la taille de l'écran
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerPage(6)
      } else if (window.innerWidth < 1024) {
        setItemsPerPage(9)
      } else {
        setItemsPerPage(12)
      }
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <div className="loading loading-spinner loading-lg text-primary w-12 h-12 sm:w-16 sm:h-16"></div>
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement des commandes...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold text-base-content mb-2">Erreur de chargement</h2>
          <p className="text-base-content/60 mb-4">{error}</p>
          <button onClick={fetchData} className="btn btn-primary gap-2">
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-16 right-3 sm:right-6 z-50 animate-slideDown">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg text-sm sm:text-base`}>
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
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
            Commandes Fournisseurs
          </h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            Gérez vos commandes d'achat ({stats.total} au total)
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button 
            onClick={fetchData}
            className="btn btn-sm sm:btn-md btn-outline gap-1 sm:gap-2"
          >
            <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Actualiser</span>
          </button>
          <button 
            onClick={() => navigate('/commandes-fournisseurs/nouveau')}
            className="btn btn-sm sm:btn-md btn-primary gap-1 sm:gap-2"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Nouvelle commande</span>
          </button>
        </div>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-primary">
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
          </div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Total</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black">{stats.total}</div>
        </div>
        
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-neutral">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
          </div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Brouillons</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black">{stats.draft}</div>
        </div>
        
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-primary">
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
          </div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Confirmées</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black">{stats.confirmed}</div>
        </div>
        
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-success">
            <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
          </div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Reçues</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black">{stats.received}</div>
        </div>
        
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-error">
            <XCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
          </div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Annulées</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black">{stats.cancelled}</div>
        </div>
        
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-info">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
          </div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Total dépensé</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black">
            {formatCurrency(stats.totalAmount)}
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
              <input
                type="text"
                placeholder="Rechercher par numéro de commande ou fournisseur..."
                className="input input-bordered w-full pl-9 text-sm"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
          </div>
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-outline btn-sm sm:hidden gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtres
            {showFilters ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          
          <div className={`${showFilters ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row gap-3`}>
            <select 
              className="select select-bordered w-full sm:w-40 text-sm"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">Tous statuts</option>
              <option value="draft">Brouillon</option>
              <option value="sent">Envoyée</option>
              <option value="confirmed">Confirmée</option>
              <option value="in_transit">En transit</option>
              <option value="partially_received">Partiellement reçue</option>
              <option value="received">Reçue</option>
              <option value="cancelled">Annulée</option>
            </select>
            
            <select 
              className="select select-bordered w-full sm:w-32 text-sm"
              value={filterUrgency}
              onChange={(e) => {
                setFilterUrgency(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">Urgence</option>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
              <option value="very_urgent">Très urgent</option>
            </select>
            
            <button 
              className="btn btn-outline gap-2"
              onClick={() => {
                setFilterStatus('')
                setFilterUrgency('')
                setSearchTerm('')
                setCurrentPage(1)
              }}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Réinitialiser</span>
            </button>
            
            <div className="join ml-auto">
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

      {/* Tableau des commandes */}
      <div className="bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden">
        {filteredAndSortedOrders.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <ShoppingCart className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 text-base-content/30" />
            <p className="text-lg sm:text-xl font-semibold text-base-content/50">
              Aucune commande trouvée
            </p>
            <p className="text-sm sm:text-base text-base-content/40 mt-2">
              Commencez par créer votre première commande fournisseur
            </p>
            <button 
              className="btn btn-primary mt-6 gap-2"
              onClick={() => navigate('/commandes-fournisseurs/nouveau')}
            >
              <Plus className="w-4 h-4" />
              Nouvelle commande
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table table-xs sm:table-sm lg:table-md w-full">
                <thead>
                  <tr className="text-xs sm:text-sm">
                    <th>
                      <button 
                        className="flex items-center gap-1 hover:text-primary"
                        onClick={() => handleSort('order_number')}
                      >
                        N° Commande
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th>Fournisseur</th>
                    <th>
                      <button 
                        className="flex items-center gap-1 hover:text-primary"
                        onClick={() => handleSort('order_date')}
                      >
                        Date
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th>Date livraison</th>
                    <th>Urgence</th>
                    <th>Statut</th>
                    <th>
                      <button 
                        className="flex items-center gap-1 hover:text-primary"
                        onClick={() => handleSort('total')}
                      >
                        Total
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-right">Actions</th>
                   </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((commande) => (
                    <tr key={commande.id} className="hover">
                      <td className="font-mono text-sm">
                        {commande.order_number || commande.id}
                      </td>
                      <td>
                        <div className="font-medium">{commande.supplier_name || commande.supplier?.company_name}</div>
                      </td>
                      <td>{formatDate(commande.order_date)}</td>
                      <td>{formatDate(commande.expected_date)}</td>
                      <td>{getUrgencyBadge(commande.urgency)}</td>
                      <td>{getStatusBadge(commande.status)}</td>
                      <td className="font-semibold">{formatCurrency(commande.total)}</td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1 sm:gap-2">
                          <button 
                            onClick={() => navigate(`/commandes-fournisseurs/${commande.id}`)}
                            className="btn btn-ghost btn-xs sm:btn-sm"
                            title="Détails"
                          >
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <button 
                            onClick={() => navigate(`/commandes-fournisseurs/${commande.id}/edit`)}
                            className="btn btn-ghost btn-xs sm:btn-sm text-primary"
                            title="Modifier"
                            disabled={commande.status === 'received' || commande.status === 'cancelled'}
                          >
                            <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <button 
                            className="btn btn-ghost btn-xs sm:btn-sm text-error"
                            onClick={() => {
                              setCommandeToDelete(commande)
                              setShowDeleteModal(true)
                            }}
                            title="Supprimer"
                            disabled={commande.status !== 'draft'}
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredAndSortedOrders.length > 0 && (
              <div className="p-3 sm:p-4 border-t border-base-300">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                  <div className="text-xs sm:text-sm text-base-content/60 order-2 sm:order-1">
                    {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredAndSortedOrders.length)} sur {filteredAndSortedOrders.length}
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
                        if (totalPages <= 3) {
                          pageNum = i + 1
                        } else if (currentPage <= 2) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 1) {
                          pageNum = totalPages - 2 + i
                        } else {
                          pageNum = currentPage - 1 + i
                        }
                        
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
          </>
        )}
      </div>

      {/* Modal Suppression */}
      {showDeleteModal && commandeToDelete && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-md p-4 sm:p-6">
            <div className="text-center mb-4 sm:mb-6">
              <div className="avatar placeholder mb-3 sm:mb-4">
                <div className="bg-error/10 text-error rounded-full w-16 h-16 sm:w-20 sm:h-20">
                  <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10" />
                </div>
              </div>
              <h3 className="font-bold text-lg sm:text-xl mb-2">Confirmer la suppression</h3>
              <p className="text-sm text-base-content/70">
                Voulez-vous vraiment supprimer la commande ?
              </p>
              <p className="text-base font-bold text-error mt-2">
                "{commandeToDelete.order_number}"
              </p>
              <p className="text-xs text-base-content/50 mt-2">
                Cette action est irréversible.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button 
                className="btn btn-ghost flex-1"
                onClick={() => setShowDeleteModal(false)}
              >
                Annuler
              </button>
              <button 
                className="btn btn-error flex-1"
                onClick={handleDeleteCommande}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CommandesFournisseurs