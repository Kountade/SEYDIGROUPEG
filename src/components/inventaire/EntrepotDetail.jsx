// src/pages/entrepots/EntrepotDetail.jsx
import React, {
  useState, useEffect, useCallback, useRef
} from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Edit, Trash2, MapPin, Phone, Mail, User,
  Package, Box, AlertCircle, CheckCircle, XCircle,
  Building2, Warehouse as WarehouseIcon, Plus, RefreshCw,
  Calendar, Clock, Download, Loader2
} from 'lucide-react'
import AxiosInstance from '../AxiosInstance'

const EntrepotDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [warehouse, setWarehouse] = useState(null)
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [locationsLoading, setLocationsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('info')
  const [userRole, setUserRole] = useState(null)
  const [userAgence, setUserAgence] = useState(null)

  // ✅ Refs cache
  const cacheRef = useRef(new Map())

  const unwrap = (data) => Array.isArray(data) ? data : (data?.results || [])

  const getUserInfo = () => {
    try {
      const userData = localStorage.getItem('User')
      const user = userData ? JSON.parse(userData) : null
      const agenceCourante = JSON.parse(localStorage.getItem('AgenceCourante') || '{}')
      let role = 'autre'
      if (user?.role_global === 'pdg') role = 'pdg'
      else if (user?.role_global === 'drh') role = 'drh'
      else if (user?.roles_agence) {
        const currentRole = user.roles_agence.find(
          r => r.agence_id === agenceCourante.id && r.est_actif
        )
        if (currentRole) role = currentRole.role
      }
      return { user, role, agenceCourante }
    } catch {
      return { user: null, role: 'autre', agenceCourante: {} }
    }
  }

  // ✅ Fetch avec cache
  const fetchData = useCallback(async ({ bypassCache = false } = {}) => {
    const key = `warehouse_detail_${id}`

    if (!bypassCache && cacheRef.current.has(key)) {
      const c = cacheRef.current.get(key)
      setWarehouse(c.warehouse)
      setLocations(c.locations)
      setLoading(false)
      setInitialLoad(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [whRes, locRes] = await Promise.all([
        AxiosInstance.get(`/warehouses/${id}/`),
        AxiosInstance.get(`/warehouses/${id}/locations/?page_size=200`)
          .catch(() => ({ data: [] }))
      ])

      const whData = whRes.data
      const locData = unwrap(locRes.data)

      cacheRef.current.set(key, { warehouse: whData, locations: locData })
      if (cacheRef.current.size > 10) {
        const firstKey = cacheRef.current.keys().next().value
        cacheRef.current.delete(firstKey)
      }

      setWarehouse(whData)
      setLocations(locData)

      const { role, agenceCourante } = getUserInfo()
      setUserRole(role)
      setUserAgence(agenceCourante)
    } catch (err) {
      console.error('Erreur chargement:', err)
      if (err.response?.status === 404) {
        setError('Entrepôt non trouvé')
      } else {
        setError("Impossible de charger les détails de l'entrepôt")
      }
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [id])

  useEffect(() => {
    if (id) fetchData()
  }, [id, fetchData])

  const refreshData = async () => {
    cacheRef.current.clear()
    await fetchData({ bypassCache: true })
  }

  const fetchLocations = async () => {
    setLocationsLoading(true)
    try {
      const res = await AxiosInstance.get(`/warehouses/${id}/locations/?page_size=200`)
      setLocations(unwrap(res.data))
      cacheRef.current.delete(`warehouse_detail_${id}`)
    } catch (err) {
      console.error('Erreur chargement emplacements:', err)
    } finally {
      setLocationsLoading(false)
    }
  }

  const canEdit = () => userRole === 'pdg' || userRole === 'drh' || userRole === 'chef_agence'
  const canDelete = () => userRole === 'pdg' || userRole === 'drh'
  const canManageLocations = () =>
    userRole === 'pdg' || userRole === 'drh' || userRole === 'chef_agence' || userRole === 'gestionnaire_stock'

  const handleDelete = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet entrepôt ? Cette action est irréversible.')) {
      return
    }
    try {
      await AxiosInstance.delete(`/warehouses/${id}/`)
      cacheRef.current.clear()
      navigate('/entrepots')
    } catch (err) {
      console.error('Erreur suppression:', err)
      alert('Impossible de supprimer cet entrepôt. Il est peut-être utilisé dans des mouvements de stock.')
    }
  }

  const warehouseTypes = {
    main: { label: 'Entrepôt principal', icon: Building2, color: 'primary' },
    secondary: { label: 'Entrepôt secondaire', icon: WarehouseIcon, color: 'secondary' },
    store: { label: 'Magasin', icon: Package, color: 'accent' },
    transit: { label: 'Zone de transit', icon: Box, color: 'info' },
    returns: { label: 'Zone de retour', icon: AlertCircle, color: 'warning' },
    quarantine: { label: 'Zone de quarantaine', icon: AlertCircle, color: 'error' }
  }

  const getTypeInfo = (type) =>
    warehouseTypes[type] || { label: type, icon: WarehouseIcon, color: 'neutral' }

  if (initialLoad && loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    )
  }

  if (error || !warehouse) {
    return (
      <div className="p-4">
        <div className="alert alert-error shadow-lg">
          <AlertCircle className="w-6 h-6" />
          <span>{error || 'Entrepôt non trouvé'}</span>
        </div>
        <Link to="/entrepots" className="btn btn-outline btn-sm mt-4 gap-1">
          <ArrowLeft className="w-4 h-4" />
          Retour à la liste
        </Link>
      </div>
    )
  }

  const typeInfo = getTypeInfo(warehouse.warehouse_type)
  const TypeIcon = typeInfo.icon

  return (
    <div className="p-4 md:p-6">
      {/* Spinner overlay discret */}
      {loading && !initialLoad && (
        <div className="fixed top-20 right-6 z-40 animate-slideDown">
          <div className="bg-base-100 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border border-base-300">
            <span className="loading loading-spinner loading-xs text-primary"></span>
            <span className="text-xs text-base-content/60">Chargement...</span>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Link
              to="/entrepots"
              className="text-sm text-base-content/60 hover:text-primary mb-2 inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour aux entrepôts
            </Link>
            <div className="flex items-center gap-3 mt-2">
              <div className={`p-3 rounded-xl bg-${typeInfo.color}/10`}>
                <TypeIcon className={`w-8 h-8 text-${typeInfo.color}`} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{warehouse.name}</h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="font-mono text-sm text-base-content/50">{warehouse.code}</span>
                  <span className={`badge badge-${typeInfo.color} badge-sm`}>{typeInfo.label}</span>
                  {warehouse.is_default && <span className="badge badge-info badge-sm">Défaut</span>}
                  {warehouse.is_active ? (
                    <span className="badge badge-success badge-sm gap-1">
                      <CheckCircle className="w-3 h-3" /> Actif
                    </span>
                  ) : (
                    <span className="badge badge-error badge-sm gap-1">
                      <XCircle className="w-3 h-3" /> Inactif
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={refreshData} className="btn btn-outline btn-sm gap-2">
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
            {canEdit() && (
              <Link to={`/entrepots/${id}/modifier`} className="btn btn-outline btn-primary gap-1">
                <Edit className="w-4 h-4" />
                Modifier
              </Link>
            )}
            {canDelete() && (
              <button onClick={handleDelete} className="btn btn-outline btn-error gap-1">
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-100 mb-6">
        <button
          className={`tab ${activeTab === 'info' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          Informations
        </button>
        <button
          className={`tab ${activeTab === 'locations' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('locations')}
        >
          Emplacements
          {locations.length > 0 && <span className="ml-1 badge badge-sm">{locations.length}</span>}
        </button>
        <button
          className={`tab ${activeTab === 'stock' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('stock')}
        >
          Stock
        </button>
      </div>

      <div className="space-y-6">
        {/* Tab: Informations */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card bg-base-100 shadow-md lg:col-span-2">
              <div className="card-body">
                <h2 className="card-title text-lg">Informations générales</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-medium">Adresse</h3>
                      <p className="text-base-content/70">
                        {warehouse.address}<br />
                        {warehouse.postal_code} {warehouse.city}<br />
                        {warehouse.country}
                      </p>
                    </div>
                  </div>

                  {(warehouse.phone || warehouse.email) && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-medium">Contact</h3>
                        {warehouse.phone && <p className="text-base-content/70">Tél: {warehouse.phone}</p>}
                        {warehouse.email && <p className="text-base-content/70">Email: {warehouse.email}</p>}
                      </div>
                    </div>
                  )}

                  {warehouse.manager_email && (
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-medium">Responsable</h3>
                        <p className="text-base-content/70">{warehouse.manager_email}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-medium">Agence associée</h3>
                      <p className="text-base-content/70">
                        {warehouse.agence_nom || warehouse.agence?.nom || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-md">
              <div className="card-body">
                <h2 className="card-title text-lg">Métadonnées</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-base-content/50" />
                    <div>
                      <p className="text-xs text-base-content/50">Créé le</p>
                      <p className="text-sm">
                        {warehouse.created_at
                          ? new Date(warehouse.created_at).toLocaleDateString('fr-FR')
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-base-content/50" />
                    <div>
                      <p className="text-xs text-base-content/50">Dernière modification</p>
                      <p className="text-sm">
                        {warehouse.updated_at
                          ? new Date(warehouse.updated_at).toLocaleDateString('fr-FR')
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-base-content/50" />
                    <div>
                      <p className="text-xs text-base-content/50">Emplacements</p>
                      <p className="text-sm font-semibold">{locations.length}</p>
                    </div>
                  </div>
                  {warehouse.created_by_email && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-base-content/50" />
                      <div>
                        <p className="text-xs text-base-content/50">Créé par</p>
                        <p className="text-sm">{warehouse.created_by_email}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Emplacements */}
        {activeTab === 'locations' && (
          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h2 className="card-title text-lg">Emplacements</h2>
                <div className="flex gap-2">
                  <button onClick={fetchLocations} className="btn btn-sm btn-outline gap-1">
                    <RefreshCw className={`w-4 h-4 ${locationsLoading ? 'animate-spin' : ''}`} />
                    Actualiser
                  </button>
                  {canManageLocations() && (
                    <Link
                      to={`/entrepots/${id}/emplacements/nouveau`}
                      className="btn btn-sm btn-primary gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter un emplacement
                    </Link>
                  )}
                </div>
              </div>

              {locationsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="loading loading-spinner loading-md"></div>
                </div>
              ) : locations.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto text-base-content/20 mb-3" />
                  <p className="text-base-content/60">Aucun emplacement configuré</p>
                  {canManageLocations() && (
                    <Link
                      to={`/entrepots/${id}/emplacements/nouveau`}
                      className="btn btn-sm btn-primary mt-3"
                    >
                      Ajouter un premier emplacement
                    </Link>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Allée</th>
                        <th>Rayon</th>
                        <th>Étagère</th>
                        <th>Bac</th>
                        <th>Statut</th>
                        {canManageLocations() && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {locations.map((location) => (
                        <tr key={location.id}>
                          <td className="font-mono font-medium">{location.code}</td>
                          <td>{location.aisle || '-'}</td>
                          <td>{location.rack || '-'}</td>
                          <td>{location.shelf || '-'}</td>
                          <td>{location.bin || '-'}</td>
                          <td>
                            {location.is_active ? (
                              <span className="badge badge-success badge-sm">Actif</span>
                            ) : (
                              <span className="badge badge-error badge-sm">Inactif</span>
                            )}
                          </td>
                          {canManageLocations() && (
                            <td>
                              <div className="flex gap-1">
                                <Link
                                  to={`/emplacements/${location.id}/modifier`}
                                  className="btn btn-xs btn-ghost"
                                >
                                  <Edit className="w-3 h-3" />
                                </Link>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Stock */}
        {activeTab === 'stock' && (
          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-lg">Stock dans cet entrepôt</h2>
              <p className="text-base-content/60 text-sm">
                Cette section affichera les produits disponibles dans cet entrepôt (à implémenter)
              </p>
              <div className="alert alert-info mt-4">
                <Package className="w-5 h-5" />
                <span>Fonctionnalité à venir : visualisation du stock par emplacement</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown { animation: slideDown 0.35s ease-out; }
      `}</style>
    </div>
  )
}

export default EntrepotDetail