// src/pages/entrepots/Entrepots.jsx
import React, {
  useState, useEffect, useCallback, useRef, useMemo
} from 'react'
import { Link } from 'react-router-dom'
import {
  Building2, MapPin, Phone, Mail, User, Plus, Eye,
  Warehouse as WarehouseIcon, Package, Box, AlertCircle,
  Search, Filter, RefreshCw, ChevronRight, Star, X,
  List, LayoutGrid
} from 'lucide-react'
import AxiosInstance from '../AxiosInstance'

const Entrepots = () => {
  const [warehouses, setWarehouses] = useState([])
  const [agences, setAgences] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedAgence, setSelectedAgence] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedDefault, setSelectedDefault] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [userAgence, setUserAgence] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [isMultiAgence, setIsMultiAgence] = useState(false)

  // ✅ Refs cache
  const cacheRef = useRef(new Map())
  const fetchingRef = useRef(false)

  // ---------- Helpers ----------
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

  // ✅ Index O(1) des agences
  const agencesIndex = useMemo(() => {
    const map = {}
    agences.forEach(a => { map[a.id] = a })
    return map
  }, [agences])

  // ---------- Fetch avec cache ----------
  const fetchData = useCallback(async ({ bypassCache = false } = {}) => {
    const key = 'warehouses_list'

    if (!bypassCache && cacheRef.current.has(key)) {
      const c = cacheRef.current.get(key)
      setWarehouses(c.warehouses)
      setAgences(c.agences)
      // Recalcule les dérivés
      const uniqueAgences = new Set(c.warehouses.map(w => w.agence || w.agence_nom))
      setIsMultiAgence(uniqueAgences.size > 1)
      setLoading(false)
      setInitialLoad(false)
      return
    }

    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)
    setError(null)

    try {
      const { agenceCourante, role } = getUserInfo()
      setUserAgence(agenceCourante)
      setUserRole(role)

      // ✅ page_size=200 + agences en parallèle
      const [whRes, agRes] = await Promise.all([
        AxiosInstance.get('/warehouses/?page_size=200').catch(() => ({ data: [] })),
        AxiosInstance.get('/agences/?page_size=200').catch(() => ({ data: [] }))
      ])

      const whData = unwrap(whRes.data)
      const agData = unwrap(agRes.data)

      cacheRef.current.set(key, { warehouses: whData, agences: agData })
      if (cacheRef.current.size > 10) {
        const firstKey = cacheRef.current.keys().next().value
        cacheRef.current.delete(firstKey)
      }

      setWarehouses(whData)
      setAgences(agData)

      const uniqueAgences = new Set(whData.map(w => w.agence || w.agence_nom))
      setIsMultiAgence(uniqueAgences.size > 1)
      if (uniqueAgences.size === 1 && agenceCourante?.id) {
        setSelectedAgence(String(agenceCourante.id))
      }
    } catch (err) {
      console.error('Erreur chargement:', err)
      setError('Impossible de charger les entrepôts. Veuillez réessayer.')
    } finally {
      setLoading(false)
      setInitialLoad(false)
      fetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refreshData = async () => {
    cacheRef.current.clear()
    await fetchData({ bypassCache: true })
  }

  // ---------- Types ----------
  const warehouseTypes = [
    { value: 'main', label: 'Entrepôt principal', icon: Building2 },
    { value: 'secondary', label: 'Entrepôt secondaire', icon: WarehouseIcon },
    { value: 'store', label: 'Magasin', icon: Package },
    { value: 'transit', label: 'Zone de transit', icon: Box },
    { value: 'returns', label: 'Zone de retour', icon: AlertCircle },
    { value: 'quarantine', label: 'Zone de quarantaine', icon: AlertCircle }
  ]

  const getTypeLabel = (type) =>
    warehouseTypes.find(t => t.value === type)?.label || type

  const getTypeIcon = (type) => {
    const Icon = warehouseTypes.find(t => t.value === type)?.icon || WarehouseIcon
    return <Icon className="w-4 h-4" />
  }

  const getAgenceNom = (warehouse) =>
    warehouse.agence_nom
    || agencesIndex[warehouse.agence]?.nom
    || '—'

  const canCreateWarehouse = () =>
    userRole === 'pdg' || userRole === 'drh' || userRole === 'chef_agence'

  // ---------- Filtrage ----------
  const filteredWarehouses = useMemo(() => {
    return warehouses.filter(warehouse => {
      const search = searchTerm.toLowerCase()
      const matchesSearch = search === ''
        || warehouse.name?.toLowerCase().includes(search)
        || warehouse.code?.toLowerCase().includes(search)
        || warehouse.city?.toLowerCase().includes(search)
        || warehouse.address?.toLowerCase().includes(search)

      const matchesType = selectedType === '' || warehouse.warehouse_type === selectedType

      let matchesAgence = true
      if (selectedAgence !== '') matchesAgence = String(warehouse.agence) === String(selectedAgence)

      let matchesStatus = true
      if (selectedStatus === 'active') matchesStatus = warehouse.is_active === true
      if (selectedStatus === 'inactive') matchesStatus = warehouse.is_active === false

      let matchesDefault = true
      if (selectedDefault === 'default') matchesDefault = warehouse.is_default === true
      if (selectedDefault === 'non-default') matchesDefault = warehouse.is_default === false

      return matchesSearch && matchesType && matchesAgence && matchesStatus && matchesDefault
    })
  }, [warehouses, searchTerm, selectedType, selectedAgence, selectedStatus, selectedDefault])

  const stats = useMemo(() => {
    const total = filteredWarehouses.length
    const active = filteredWarehouses.filter(w => w.is_active).length
    const inactive = filteredWarehouses.filter(w => !w.is_active).length
    const defaults = filteredWarehouses.filter(w => w.is_default).length
    return { total, active, inactive, defaults }
  }, [filteredWarehouses])

  const resetFilters = () => {
    setSearchTerm('')
    setSelectedType('')
    setSelectedAgence('')
    setSelectedStatus('')
    setSelectedDefault('')
  }

  const hasActiveFilters = () =>
    searchTerm || selectedType || selectedAgence || selectedStatus || selectedDefault

  // ---------- Rendu : premier chargement ----------
  if (initialLoad && loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      {/* Spinner overlay */}
      {loading && !initialLoad && (
        <div className="fixed top-20 right-6 z-40 animate-slideDown">
          <div className="bg-base-100 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border border-base-300">
            <span className="loading loading-spinner loading-xs text-primary"></span>
            <span className="text-xs text-base-content/60">Chargement...</span>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base-content flex items-center gap-2">
            <WarehouseIcon className="w-7 h-7 text-primary" />
            Entrepôts
          </h1>
          <p className="text-base-content/60 text-sm mt-1">
            Gestion des entrepôts et magasins
          </p>
          {userAgence?.nom && !isMultiAgence && (
            <div className="mt-2 text-xs text-base-content/50 flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              Agence : <span className="font-semibold text-primary">{userAgence.nom}</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-base-content/40">
                {userRole === 'chef_agence' && 'Chef d\'agence'}
                {userRole === 'pdg' && 'PDG - Accès total'}
                {userRole === 'drh' && 'DRH'}
              </span>
            </div>
          )}
          {isMultiAgence && (
            <div className="mt-2 text-xs text-base-content/50 flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              <span className="font-semibold text-primary">
                {agences.length} agence{agences.length > 1 ? 's' : ''} accessible{agences.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <div className="join">
            <button
              className={`join-item btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('grid')}
              title="Vue grille"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              className={`join-item btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('table')}
              title="Vue tableau"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          {canCreateWarehouse() && (
            <Link to="/entrepots/nouveau" className="btn btn-primary btn-sm gap-2">
              <Plus className="w-4 h-4" />
              Nouvel entrepôt
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="stat bg-base-100 rounded-xl shadow-sm border border-base-300 py-3">
          <div className="stat-title text-xs font-semibold">Total</div>
          <div className="stat-value text-2xl font-black text-primary">{stats.total}</div>
          <div className="stat-desc text-xs">Entrepôt(s)</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-sm border border-base-300 py-3">
          <div className="stat-title text-xs font-semibold">Actifs</div>
          <div className="stat-value text-2xl font-black text-success">{stats.active}</div>
          <div className="stat-desc text-xs">En service</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-sm border border-base-300 py-3">
          <div className="stat-title text-xs font-semibold">Inactifs</div>
          <div className="stat-value text-2xl font-black text-error">{stats.inactive}</div>
          <div className="stat-desc text-xs">Désactivés</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-sm border border-base-300 py-3">
          <div className="stat-title text-xs font-semibold">Par défaut</div>
          <div className="stat-value text-2xl font-black text-warning">{stats.defaults}</div>
          <div className="stat-desc text-xs">1 par agence max</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="card bg-base-100 shadow-md mb-6">
        <div className="card-body p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-base-content/60" />
              <span className="font-medium">Filtres</span>
              {hasActiveFilters() && (
                <span className="badge badge-primary badge-sm">
                  {filteredWarehouses.length} résultat{filteredWarehouses.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {hasActiveFilters() && (
                <button onClick={resetFilters} className="btn btn-sm btn-ghost gap-1 text-error">
                  <X className="w-4 h-4" />
                  Réinitialiser
                </button>
              )}
              <button
                onClick={refreshData}
                className="btn btn-sm btn-outline gap-1"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text text-xs font-medium">Recherche</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                <input
                  type="text"
                  placeholder="Nom, code, ville..."
                  className="input input-bordered input-sm w-full pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text text-xs font-medium flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Agence
                </span>
              </label>
              <select
                className="select select-bordered select-sm w-full"
                value={selectedAgence}
                onChange={(e) => setSelectedAgence(e.target.value)}
                disabled={!isMultiAgence && agences.length <= 1}
              >
                <option value="">Toutes les agences</option>
                {agences.map(agence => (
                  <option key={agence.id} value={agence.id}>
                    {agence.nom} {agence.type_agence ? `(${agence.type_agence})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text text-xs font-medium">Type</span>
              </label>
              <select
                className="select select-bordered select-sm w-full"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="">Tous les types</option>
                {warehouseTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text text-xs font-medium">Statut</span>
              </label>
              <select
                className="select select-bordered select-sm w-full"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="">Tous les statuts</option>
                <option value="active">✅ Actifs</option>
                <option value="inactive">❌ Inactifs</option>
              </select>
            </div>

            <div className="form-control w-full">
              <label className="label py-1">
                <span className="label-text text-xs font-medium flex items-center gap-1">
                  <Star className="w-3 h-3" /> Entrepôt par défaut
                </span>
              </label>
              <select
                className="select select-bordered select-sm w-full"
                value={selectedDefault}
                onChange={(e) => setSelectedDefault(e.target.value)}
              >
                <option value="">Tous</option>
                <option value="default">⭐ Par défaut uniquement</option>
                <option value="non-default">Non-défaut uniquement</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error shadow-lg mb-4">
          <AlertCircle className="w-6 h-6" />
          <span>{error}</span>
        </div>
      )}

      {/* Liste */}
      {!error && (
        <>
          {filteredWarehouses.length === 0 ? (
            <div className="card bg-base-100 shadow-md">
              <div className="card-body text-center py-12">
                <WarehouseIcon className="w-16 h-16 mx-auto text-base-content/20 mb-4" />
                <h3 className="text-lg font-medium">Aucun entrepôt trouvé</h3>
                <p className="text-base-content/60">
                  {hasActiveFilters()
                    ? 'Aucun entrepôt ne correspond à vos critères'
                    : "Aucun entrepôt n'est configuré"}
                </p>
                {hasActiveFilters() && (
                  <button onClick={resetFilters} className="btn btn-outline btn-sm w-fit mx-auto mt-2">
                    Effacer les filtres
                  </button>
                )}
                {canCreateWarehouse() && !hasActiveFilters() && (
                  <Link to="/entrepots/nouveau" className="btn btn-primary btn-sm w-fit mx-auto mt-2">
                    Créer un entrepôt
                  </Link>
                )}
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWarehouses.map((warehouse) => (
                <div
                  key={warehouse.id}
                  className={`card bg-base-100 shadow-md hover:shadow-lg transition-shadow border ${
                    warehouse.is_default ? 'border-warning/50' : 'border-base-300'
                  }`}
                >
                  <div className="card-body">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {getTypeIcon(warehouse.warehouse_type)}
                        </div>
                        <div>
                          <h2 className="card-title text-lg">{warehouse.name}</h2>
                          <p className="text-xs font-mono text-base-content/50">{warehouse.code}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="badge badge-primary badge-sm">
                          {getTypeLabel(warehouse.warehouse_type)}
                        </div>
                        {warehouse.is_default && (
                          <div className="badge badge-warning badge-sm gap-1">
                            <Star className="w-3 h-3" /> Défaut
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-2">
                      <div className="badge badge-outline badge-sm gap-1">
                        <Building2 className="w-3 h-3" />
                        {getAgenceNom(warehouse)}
                      </div>
                    </div>

                    <div className="space-y-2 mt-2 text-sm">
                      <div className="flex items-start gap-2 text-base-content/70">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                          {warehouse.address}<br />
                          {warehouse.postal_code} {warehouse.city}<br />
                          {warehouse.country}
                        </span>
                      </div>
                      {warehouse.phone && (
                        <div className="flex items-center gap-2 text-base-content/70">
                          <Phone className="w-4 h-4" />
                          <span>{warehouse.phone}</span>
                        </div>
                      )}
                      {warehouse.email && (
                        <div className="flex items-center gap-2 text-base-content/70">
                          <Mail className="w-4 h-4" />
                          <span className="text-sm truncate">{warehouse.email}</span>
                        </div>
                      )}
                      {warehouse.manager && (
                        <div className="flex items-center gap-2 text-base-content/70">
                          <User className="w-4 h-4" />
                          <span className="text-sm truncate">
                            Responsable : {warehouse.manager_email || warehouse.manager}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="divider my-2"></div>
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-1 text-base-content/60">
                        <Package className="w-4 h-4" />
                        <span>{warehouse.locations_count || 0} emplacements</span>
                      </div>
                      <div className={`badge badge-sm ${warehouse.is_active ? 'badge-success' : 'badge-error'}`}>
                        {warehouse.is_active ? 'Actif' : 'Inactif'}
                      </div>
                    </div>

                    <div className="card-actions justify-end mt-4">
                      <Link
                        to={`/entrepots/${warehouse.id}`}
                        className="btn btn-sm btn-outline gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        Détails
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card bg-base-100 shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Nom</th>
                      <th>Agence</th>
                      <th>Type</th>
                      <th>Ville</th>
                      <th>Responsable</th>
                      <th>Statut</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWarehouses.map((warehouse) => (
                      <tr key={warehouse.id} className="hover">
                        <td className="font-mono text-xs font-semibold">
                          {warehouse.code}
                          {warehouse.is_default && (
                            <Star className="w-3 h-3 text-warning inline ml-1" />
                          )}
                        </td>
                        <td className="font-medium">{warehouse.name}</td>
                        <td>
                          <div className="badge badge-outline badge-sm gap-1">
                            <Building2 className="w-3 h-3" />
                            {getAgenceNom(warehouse)}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1 text-sm">
                            {getTypeIcon(warehouse.warehouse_type)}
                            {getTypeLabel(warehouse.warehouse_type)}
                          </div>
                        </td>
                        <td className="text-sm">{warehouse.city}</td>
                        <td className="text-sm text-base-content/70">
                          {warehouse.manager_email || warehouse.manager || '—'}
                        </td>
                        <td>
                          <span className={`badge badge-sm ${warehouse.is_active ? 'badge-success' : 'badge-error'}`}>
                            {warehouse.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td>
                          <div className="flex justify-end">
                            <Link
                              to={`/entrepots/${warehouse.id}`}
                              className="btn btn-ghost btn-xs gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              Détails
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!error && filteredWarehouses.length > 0 && (
        <div className="mt-6 p-3 bg-base-200 rounded-lg text-xs text-base-content/60">
          <div className="flex flex-wrap gap-4">
            <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> Entrepôt principal</span>
            <span className="flex items-center gap-1"><WarehouseIcon className="w-3 h-3" /> Entrepôt secondaire</span>
            <span className="flex items-center gap-1"><Package className="w-3 h-3" /> Magasin</span>
            <span className="flex items-center gap-1"><Box className="w-3 h-3" /> Zone de transit</span>
            <span className="flex items-center gap-1 text-success">● Actif</span>
            <span className="flex items-center gap-1 text-warning">⭐ Par défaut</span>
          </div>
        </div>
      )}

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

export default Entrepots