// src/components/inventaire/InventoryCountsList.jsx
import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Plus, Search, Filter, RefreshCw, ClipboardList,
  LayoutGrid, List, ChevronLeft, ChevronRight,
  CheckCircle, AlertCircle, X, Calendar, Warehouse
} from 'lucide-react'
import InventoryCountCard from './InventoryCountCard'
import InventoryCountStatusBadge from './InventoryCountStatusBadge'

const InventoryCountsList = () => {
  const navigate = useNavigate()

  const [inventories, setInventories] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterWarehouse, setFilterWarehouse] = useState('all')
  const [viewMode, setViewMode] = useState('grid')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(12)

  const [notification, setNotification] = useState({
    show: false, message: '', type: 'success'
  })

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [invRes, whRes] = await Promise.all([
        AxiosInstance.get('/inventory-counts/'),
        AxiosInstance.get('/warehouses/').catch(() => ({ data: [] })),
      ])
      const data = invRes.data?.results || invRes.data || []
      setInventories(data)
      setWarehouses(whRes.data?.results || whRes.data || [])
    } catch (err) {
      console.error('Erreur:', err)
      showNotification('Erreur de chargement', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const refreshData = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
    showNotification('Données actualisées', 'success')
  }

  const stats = React.useMemo(() => ({
    total: inventories.length,
    in_progress: inventories.filter(i => i.status === 'in_progress').length,
    completed: inventories.filter(i => i.status === 'completed').length,
    validated: inventories.filter(i => i.status === 'validated').length,
    withDifferences: inventories.filter(i => i.total_differences > 0).length,
  }), [inventories])

  const filteredInventories = React.useMemo(() => {
    return inventories.filter(inv => {
      const matchesSearch = searchTerm === '' ||
        inv.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.warehouse_name?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = filterStatus === 'all' || inv.status === filterStatus
      const matchesWarehouse = filterWarehouse === 'all' ||
        inv.warehouse === parseInt(filterWarehouse)

      return matchesSearch && matchesStatus && matchesWarehouse
    })
  }, [inventories, searchTerm, filterStatus, filterWarehouse])

  const totalPages = Math.ceil(filteredInventories.length / itemsPerPage)
  const paginated = filteredInventories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-6">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-xl font-semibold text-base-content/70">
            Chargement des inventaires...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 lg:p-6 bg-gradient-to-br from-base-200 to-base-100 min-h-screen">
      {notification.show && (
        <div className="fixed top-20 right-6 z-50 animate-slideDown">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg`}>
            {notification.type === 'success'
              ? <CheckCircle className="w-5 h-5" />
              : <AlertCircle className="w-5 h-5" />}
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
          <h1 className="text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Inventaires
          </h1>
          <p className="text-base-content/60 mt-1">
            Gestion des comptages et ajustements de stock
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="btn btn-outline gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <Link
            to="/inventaire/inventory-counts/nouveau"
            className="btn btn-primary gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouvel inventaire
          </Link>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-primary"><ClipboardList className="w-8 h-8" /></div>
          <div className="stat-title text-sm font-semibold">Total</div>
          <div className="stat-value text-3xl font-black">{stats.total}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-warning"><Calendar className="w-8 h-8" /></div>
          <div className="stat-title text-sm font-semibold">En cours</div>
          <div className="stat-value text-3xl font-black">{stats.in_progress}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-info"><ClipboardList className="w-8 h-8" /></div>
          <div className="stat-title text-sm font-semibold">Terminés</div>
          <div className="stat-value text-3xl font-black">{stats.completed}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-success"><CheckCircle className="w-8 h-8" /></div>
          <div className="stat-title text-sm font-semibold">Validés</div>
          <div className="stat-value text-3xl font-black">{stats.validated}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-error"><AlertCircle className="w-8 h-8" /></div>
          <div className="stat-title text-sm font-semibold">Avec écarts</div>
          <div className="stat-value text-3xl font-black">{stats.withDifferences}</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-base-100 rounded-xl shadow-md border border-base-300 p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40" />
              <input
                type="text"
                placeholder="Rechercher par référence ou entrepôt..."
                className="input input-bordered w-full pl-12"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              className="select select-bordered min-w-[160px]"
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1) }}
            >
              <option value="all">Tous les statuts</option>
              <option value="draft">Brouillon</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminé</option>
              <option value="validated">Validé</option>
              <option value="cancelled">Annulé</option>
            </select>

            <select
              className="select select-bordered min-w-[180px]"
              value={filterWarehouse}
              onChange={(e) => { setFilterWarehouse(e.target.value); setCurrentPage(1) }}
            >
              <option value="all">Tous les entrepôts</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>

            <button
              className="btn btn-outline gap-2"
              onClick={() => {
                setSearchTerm('')
                setFilterStatus('all')
                setFilterWarehouse('all')
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
                className={`join-item btn ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      {filteredInventories.length === 0 ? (
        <div className="bg-base-100 rounded-xl shadow-xl border border-base-300 p-12 text-center">
          <ClipboardList className="w-20 h-20 mx-auto mb-4 text-base-content/30" />
          <p className="text-xl font-semibold text-base-content/50">
            Aucun inventaire trouvé
          </p>
          <p className="text-base text-base-content/40 mt-2">
            {inventories.length === 0
              ? 'Commencez par créer votre premier inventaire'
              : 'Aucun résultat ne correspond à vos filtres'}
          </p>
          <Link
            to="/inventaire/inventory-counts/nouveau"
            className="btn btn-primary mt-6 gap-2"
          >
            <Plus className="w-4 h-4" />
            Créer un inventaire
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginated.map(inv => (
            <InventoryCountCard key={inv.id} inventory={inv} />
          ))}
        </div>
      ) : (
        <div className="bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Entrepôt</th>
                  <th>Date</th>
                  <th>Compté par</th>
                  <th>Articles</th>
                  <th>Écarts</th>
                  <th>Statut</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(inv => (
                  <tr key={inv.id} className="hover">
                    <td className="font-mono font-semibold">{inv.reference}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Warehouse className="w-4 h-4 text-primary" />
                        {inv.warehouse_name}
                      </div>
                    </td>
                    <td>{new Date(inv.count_date).toLocaleDateString('fr-FR')}</td>
                    <td className="truncate max-w-[150px]">{inv.counted_by_name || '-'}</td>
                    <td>{inv.total_items}</td>
                    <td>
                      {inv.total_differences > 0
                        ? <span className="badge badge-warning badge-sm">{inv.total_differences}</span>
                        : <span className="text-base-content/40">-</span>}
                    </td>
                    <td><InventoryCountStatusBadge status={inv.status} size="sm" /></td>
                    <td>
                      <div className="flex justify-end">
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => navigate(`/inventaire/inventory-counts/${inv.id}`)}
                        >
                          Voir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {filteredInventories.length > 0 && totalPages > 1 && (
        <div className="flex justify-center">
          <div className="join">
            <button
              className="join-item btn"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="join-item btn btn-primary">
              Page {currentPage} / {totalPages}
            </button>
            <button
              className="join-item btn"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
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

export default InventoryCountsList