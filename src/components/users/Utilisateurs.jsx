// src/components/users/Utilisateurs.jsx
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
  Users,
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
  Mail,
  Phone,
  Shield,
  Crown,
  Store,
  Briefcase,
  UserCheck,
  UserX,
  Clock,
  Calendar,
  Building2,
  UserCircle
} from 'lucide-react'

// Configuration des rôles
const ROLE_CONFIG = {
  pdg: { label: 'PDG', icon: Crown, color: 'error', bgColor: 'bg-error/10', textColor: 'text-error', level: 100 },
  drh: { label: 'DRH', icon: Shield, color: 'secondary', bgColor: 'bg-secondary/10', textColor: 'text-secondary', level: 90 },
  chef_agence: { label: "Chef d'agence", icon: Store, color: 'primary', bgColor: 'bg-primary/10', textColor: 'text-primary', level: 80 },
  gestionnaire_stock: { label: 'Gestionnaire stock', icon: Briefcase, color: 'info', bgColor: 'bg-info/10', textColor: 'text-info', level: 70 },
  commercial: { label: 'Commercial', icon: Users, color: 'warning', bgColor: 'bg-warning/10', textColor: 'text-warning', level: 60 },
  autre: { label: 'Utilisateur', icon: UserCircle, color: 'neutral', bgColor: 'bg-base-200', textColor: 'text-base-content/70', level: 50 }
}

const Utilisateurs = () => {
  const navigate = useNavigate()

  const [utilisateurs, setUtilisateurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [userToToggle, setUserToToggle] = useState(null)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })
  const [viewMode, setViewMode] = useState('grid')
  const [sortField, setSortField] = useState('last_name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    pdg: 0,
    drh: 0,
    autre: 0
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('Token')
      if (!token) {
        showNotification('Veuillez vous connecter', 'error')
        setLoading(false)
        return
      }
      
      const response = await AxiosInstance.get('/users/')
      const users = response.data || []
      setUtilisateurs(users)
      
      // Calculer les statistiques
      const total = users.length
      const active = users.filter(u => u.is_active).length
      const inactive = total - active
      const pdg = users.filter(u => u.role_global === 'pdg').length
      const drh = users.filter(u => u.role_global === 'drh').length
      const autre = users.filter(u => u.role_global === 'autre').length
      
      setStats({ total, active, inactive, pdg, drh, autre })
      
    } catch (error) {
      console.error(error)
      showNotification('Erreur de chargement des utilisateurs', 'error')
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

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    try {
      await AxiosInstance.delete(`/users/${userToDelete.id}/`)
      showNotification(`Utilisateur supprimé avec succès`, 'success')
      fetchData()
      setShowDeleteModal(false)
      setUserToDelete(null)
    } catch (error) {
      showNotification('Erreur lors de la suppression', 'error')
    }
  }

  const handleToggleStatus = async () => {
    if (!userToToggle) return
    try {
      await AxiosInstance.patch(`/users/${userToToggle.id}/`, {
        is_active: !userToToggle.is_active
      })
      showNotification(`Utilisateur ${userToToggle.is_active ? 'désactivé' : 'activé'} avec succès`, 'success')
      fetchData()
      setShowStatusModal(false)
      setUserToToggle(null)
    } catch (error) {
      showNotification('Erreur lors de la modification', 'error')
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

  const getInitials = (firstName, lastName, email) => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    }
    if (firstName) return firstName.charAt(0).toUpperCase()
    if (lastName) return lastName.charAt(0).toUpperCase()
    return email?.charAt(0).toUpperCase() || 'U'
  }

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <div className="badge badge-success gap-1">
        <CheckCircle className="w-3 h-3" />
        Actif
      </div>
    ) : (
      <div className="badge badge-ghost gap-1">
        <Clock className="w-3 h-3" />
        Inactif
      </div>
    )
  }

  // Filtrage et tri
  const filteredAndSortedUsers = React.useMemo(() => {
    let filtered = utilisateurs.filter(user => {
      const search = searchTerm.toLowerCase()
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase()
      const email = (user.email || '').toLowerCase()
      const roleLabel = (ROLE_CONFIG[user.role_global]?.label || '').toLowerCase()
      
      const matchesSearch = fullName.includes(search) || email.includes(search) || roleLabel.includes(search)
      const matchesRole = filterRole === '' || user.role_global === filterRole
      const matchesStatus = filterStatus === '' || user.is_active === (filterStatus === 'true')
      
      return matchesSearch && matchesRole && matchesStatus
    })

    filtered.sort((a, b) => {
      let aVal, bVal
      
      if (sortField === 'full_name') {
        aVal = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase()
        bVal = `${b.first_name || ''} ${b.last_name || ''}`.toLowerCase()
      } else if (sortField === 'role') {
        const aRole = ROLE_CONFIG[a.role_global]?.level || 50
        const bRole = ROLE_CONFIG[b.role_global]?.level || 50
        aVal = aRole
        bVal = bRole
      } else {
        aVal = (a[sortField] || '').toLowerCase()
        bVal = (b[sortField] || '').toLowerCase()
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [utilisateurs, searchTerm, filterRole, filterStatus, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage)
  const paginatedUsers = filteredAndSortedUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-6">
          <div className="loading loading-spinner loading-lg text-primary w-16 h-16"></div>
          <p className="text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement des utilisateurs...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-20 right-6 z-50 animate-slideDown">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg`}>
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-semibold">{notification.message}</span>
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
          <h1 className="text-4xl font-black text-base-content mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Utilisateurs
          </h1>
          <p className="text-base text-base-content/60">
            Gérez les utilisateurs de la plateforme
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={fetchData}
            className="btn btn-outline gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
          <button 
            onClick={() => navigate('/utilisateurs/nouveau')}
            className="btn btn-primary gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouvel utilisateur
          </button>
        </div>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-primary">
            <Users className="w-8 h-8" />
          </div>
          <div className="stat-title text-base font-semibold">Total</div>
          <div className="stat-value text-3xl font-black">{stats.total}</div>
          <div className="stat-desc">Utilisateurs</div>
        </div>
        
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-success">
            <UserCheck className="w-8 h-8" />
          </div>
          <div className="stat-title text-base font-semibold">Actifs</div>
          <div className="stat-value text-3xl font-black">{stats.active}</div>
          <div className="stat-desc">{((stats.active / stats.total) * 100).toFixed(1)}% du total</div>
        </div>
        
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-error">
            <UserX className="w-8 h-8" />
          </div>
          <div className="stat-title text-base font-semibold">Inactifs</div>
          <div className="stat-value text-3xl font-black">{stats.inactive}</div>
          <div className="stat-desc">{((stats.inactive / stats.total) * 100).toFixed(1)}% du total</div>
        </div>
        
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-error">
            <Crown className="w-8 h-8" />
          </div>
          <div className="stat-title text-base font-semibold">PDG</div>
          <div className="stat-value text-3xl font-black">{stats.pdg}</div>
          <div className="stat-desc">Direction</div>
        </div>
        
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-secondary">
            <Shield className="w-8 h-8" />
          </div>
          <div className="stat-title text-base font-semibold">DRH</div>
          <div className="stat-value text-3xl font-black">{stats.drh}</div>
          <div className="stat-desc">RH</div>
        </div>
        
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-neutral">
            <UserCircle className="w-8 h-8" />
          </div>
          <div className="stat-title text-base font-semibold">Autres</div>
          <div className="stat-value text-3xl font-black">{stats.autre}</div>
          <div className="stat-desc">Utilisateurs</div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-base-100 rounded-xl shadow-md border border-base-300 p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40" />
              <input
                type="text"
                placeholder="Rechercher par nom, email ou rôle..."
                className="input input-bordered w-full pl-12"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <select 
              className="select select-bordered min-w-[150px]"
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">Tous les rôles</option>
              <option value="pdg">PDG</option>
              <option value="drh">DRH</option>
              <option value="autre">Autre</option>
            </select>
            
            <select 
              className="select select-bordered min-w-[130px]"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">Tous les statuts</option>
              <option value="true">Actif</option>
              <option value="false">Inactif</option>
            </select>
            
            <button 
              className="btn btn-outline"
              onClick={() => {
                setFilterRole('')
                setFilterStatus('')
                setSearchTerm('')
                setCurrentPage(1)
              }}
            >
              <Filter className="w-4 h-4" />
              Réinitialiser
            </button>
            
            <div className="join">
              <button 
                className={`join-item btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                className={`join-item btn ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('table')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden">
        {filteredAndSortedUsers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-20 h-20 mx-auto mb-4 text-base-content/30" />
            <p className="text-xl font-semibold text-base-content/50">
              Aucun utilisateur trouvé
            </p>
            <p className="text-base text-base-content/40 mt-2">
              Essayez de modifier vos critères de recherche ou créez un nouvel utilisateur
            </p>
            <button 
              className="btn btn-primary mt-6 gap-2"
              onClick={() => navigate('/utilisateurs/nouveau')}
            >
              <Plus className="w-4 h-4" />
              Créer un utilisateur
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Vue Grille */
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedUsers.map((user) => {
                const roleConfig = ROLE_CONFIG[user.role_global] || ROLE_CONFIG.autre
                const RoleIcon = roleConfig.icon
                const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email?.split('@')[0] || 'Utilisateur'
                const initials = getInitials(user.first_name, user.last_name, user.email)
                
                return (
                  <div 
                    key={user.id} 
                    className="bg-base-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-base-300 group"
                  >
                    {/* Lien vers le détail */}
                    <Link to={`/utilisateurs/${user.id}`} className="block">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="avatar placeholder">
                            <div className={`rounded-xl w-14 h-14 ${roleConfig.bgColor}`}>
                              <span className={`text-2xl font-bold ${roleConfig.textColor}`}>
                                {initials}
                              </span>
                            </div>
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-base-content line-clamp-1">
                              {fullName}
                            </h3>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <div className={`badge ${roleConfig.bgColor} ${roleConfig.textColor} gap-1`}>
                                <RoleIcon className="w-3 h-3" />
                                {roleConfig.label}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="dropdown dropdown-end">
                          <button className="btn btn-ghost btn-sm btn-circle" onClick={(e) => e.preventDefault()}>
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          <ul className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                            <li>
                              <Link to={`/utilisateurs/${user.id}`}>
                                <Eye className="w-4 h-4" />
                                Voir détails
                              </Link>
                            </li>
                            <li>
                              <Link to={`/utilisateurs/${user.id}/edit`}>
                                <Edit className="w-4 h-4" />
                                Modifier
                              </Link>
                            </li>
                            <li>
                              <button 
                                onClick={() => {
                                  setUserToToggle(user)
                                  setShowStatusModal(true)
                                }}
                              >
                                {user.is_active ? (
                                  <><UserX className="w-4 h-4" /> Désactiver</>
                                ) : (
                                  <><UserCheck className="w-4 h-4" /> Activer</>
                                )}
                              </button>
                            </li>
                            <li>
                              <button 
                                className="text-error"
                                onClick={() => {
                                  setUserToDelete(user)
                                  setShowDeleteModal(true)
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                                Supprimer
                              </button>
                            </li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-base-content/70">
                          <Mail className="w-4 h-4 text-primary" />
                          <span className="truncate">{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-2 text-sm text-base-content/70">
                            <Phone className="w-4 h-4 text-primary" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </div>
                      
                      {user.roles_agence && user.roles_agence.length > 0 && (
                        <div className="pt-3 border-t border-base-300">
                          <div className="flex flex-wrap gap-1">
                            {user.roles_agence.slice(0, 2).map((role, idx) => (
                              <span key={idx} className="badge badge-sm badge-ghost">
                                {role.agence_nom}: {role.role_display}
                              </span>
                            ))}
                            {user.roles_agence.length > 2 && (
                              <span className="badge badge-sm badge-ghost">
                                +{user.roles_agence.length - 2}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="pt-3 flex items-center justify-between">
                        {getStatusBadge(user.is_active)}
                        <span className="text-xs text-base-content/40">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                        </span>
                      </div>
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* Vue Tableau */
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>
                    <button 
                      className="flex items-center gap-1 hover:text-primary"
                      onClick={() => handleSort('full_name')}
                    >
                      Utilisateur
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th>Email</th>
                  <th>
                    <button 
                      className="flex items-center gap-1 hover:text-primary"
                      onClick={() => handleSort('role')}
                    >
                      Rôle
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th>Téléphone</th>
                  <th>Statut</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => {
                  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email?.split('@')[0] || 'Utilisateur'
                  const roleConfig = ROLE_CONFIG[user.role_global] || ROLE_CONFIG.autre
                  const RoleIcon = roleConfig.icon
                  
                  return (
                    <tr key={user.id} className="hover">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="avatar placeholder">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${roleConfig.bgColor}`}>
                              <span className={`text-sm font-bold ${roleConfig.textColor}`}>
                                {getInitials(user.first_name, user.last_name, user.email)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="font-semibold">{fullName}</div>
                            {user.employee_id && (
                              <div className="text-xs text-base-content/50">Matricule: {user.employee_id}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-primary" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                      </td>
                      <td>
                        <div className={`badge ${roleConfig.bgColor} ${roleConfig.textColor} gap-1`}>
                          <RoleIcon className="w-3 h-3" />
                          {roleConfig.label}
                        </div>
                      </td>
                      <td>
                        {user.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-primary" />
                            <span className="text-sm">{user.phone}</span>
                          </div>
                        ) : '-'}
                      </td>
                      <td>{getStatusBadge(user.is_active)}</td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <Link 
                            to={`/utilisateurs/${user.id}`}
                            className="btn btn-ghost btn-xs"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link 
                            to={`/utilisateurs/${user.id}/edit`}
                            className="btn btn-ghost btn-xs"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button 
                            className="btn btn-ghost btn-xs"
                            onClick={() => {
                              setUserToToggle(user)
                              setShowStatusModal(true)
                            }}
                          >
                            {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                          <button 
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => {
                              setUserToDelete(user)
                              setShowDeleteModal(true)
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
        {filteredAndSortedUsers.length > 0 && (
          <div className="p-4 border-t border-base-300">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-base-content/60">
                Affichage de {((currentPage - 1) * itemsPerPage) + 1} à{' '}
                {Math.min(currentPage * itemsPerPage, filteredAndSortedUsers.length)} sur{' '}
                {filteredAndSortedUsers.length} utilisateurs
              </div>
              
              <div className="flex items-center gap-2">
                <select 
                  className="select select-bordered select-sm"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(parseInt(e.target.value))
                    setCurrentPage(1)
                  }}
                >
                  <option value="12">12 par page</option>
                  <option value="24">24 par page</option>
                  <option value="48">48 par page</option>
                  <option value="96">96 par page</option>
                </select>
                
                <div className="join">
                  <button 
                    className="join-item btn btn-sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <button
                        key={i}
                        className={`join-item btn btn-sm ${currentPage === pageNum ? 'btn-primary' : ''}`}
                        onClick={() => setCurrentPage(pageNum)}
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

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && userToDelete && (
        <div className="modal modal-open">
          <div className="modal-box">
            <div className="text-center mb-6">
              <div className="avatar placeholder mb-4">
                <div className="bg-error/10 text-error rounded-full w-20 h-20">
                  <AlertCircle className="w-10 h-10" />
                </div>
              </div>
              <h3 className="font-bold text-2xl mb-2">Confirmer la suppression</h3>
              <p className="text-base-content/70">
                Voulez-vous vraiment supprimer l'utilisateur
              </p>
              <p className="text-xl font-bold text-error mt-2">
                "{userToDelete.email}" ?
              </p>
              <p className="text-sm text-base-content/50 mt-4">
                Cette action est irréversible.
              </p>
            </div>
            
            <div className="modal-action">
              <button 
                className="btn btn-ghost"
                onClick={() => setShowDeleteModal(false)}
              >
                Annuler
              </button>
              <button 
                className="btn btn-error"
                onClick={handleDeleteUser}
              >
                <Trash2 className="w-4 h-4" />
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation changement statut */}
      {showStatusModal && userToToggle && (
        <div className="modal modal-open">
          <div className="modal-box">
            <div className="text-center mb-6">
              <div className="avatar placeholder mb-4">
                <div className={`${userToToggle.is_active ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'} rounded-full w-20 h-20`}>
                  {userToToggle.is_active ? (
                    <UserX className="w-10 h-10" />
                  ) : (
                    <UserCheck className="w-10 h-10" />
                  )}
                </div>
              </div>
              <h3 className="font-bold text-2xl mb-2">
                {userToToggle.is_active ? 'Désactiver' : 'Activer'} l'utilisateur
              </h3>
              <p className="text-base-content/70">
                Voulez-vous vraiment {userToToggle.is_active ? 'désactiver' : 'activer'} l'utilisateur
              </p>
              <p className="text-xl font-bold mt-2">
                "{userToToggle.email}" ?
              </p>
              <p className="text-sm text-base-content/50 mt-4">
                {userToToggle.is_active 
                  ? 'L\'utilisateur ne pourra plus se connecter.'
                  : 'L\'utilisateur pourra à nouveau se connecter.'}
              </p>
            </div>
            
            <div className="modal-action">
              <button 
                className="btn btn-ghost"
                onClick={() => setShowStatusModal(false)}
              >
                Annuler
              </button>
              <button 
                className={`btn ${userToToggle.is_active ? 'btn-warning' : 'btn-success'}`}
                onClick={handleToggleStatus}
              >
                {userToToggle.is_active ? 'Désactiver' : 'Activer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Utilisateurs