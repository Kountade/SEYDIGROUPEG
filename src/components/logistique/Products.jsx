// src/components/Products.jsx
import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Plus, Edit, Trash2, Search, RefreshCw, Filter, X, AlertCircle,
  CheckCircle, Package, Eye, MoreVertical, ChevronLeft, ChevronRight,
  LayoutGrid, List, ArrowUpDown, ChevronUp, ChevronDown, AlertTriangle,
  Tag, Building2, Hash, Boxes, TrendingDown, TrendingUp, Star,
  Warehouse, DollarSign, Folder, Image as ImageIcon
} from 'lucide-react'

const Products = () => {
  const navigate = useNavigate()

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [filterType, setFilterType] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(24)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [productToDelete, setProductToDelete] = useState(null)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })
  const [viewMode, setViewMode] = useState('grid')
  const [sortField, setSortField] = useState('-created_at')
  const [sortDirection, setSortDirection] = useState('desc')
  const [showFilters, setShowFilters] = useState(false)

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000)
  }

  const unwrap = (data) => Array.isArray(data) ? data : (data?.results || [])

  // ✅ Chargement des selects (une seule fois)
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [catRes, brandRes] = await Promise.all([
          AxiosInstance.get('/categories/?page_size=200&is_active=true'),
          AxiosInstance.get('/brands/?page_size=200&is_active=true')
        ])
        setCategories(unwrap(catRes.data))
        setBrands(unwrap(brandRes.data))
      } catch (e) {
        console.error('Filtres:', e)
      }
    }
    loadFilters()
  }, [])

  // ✅ Fetch paginé côté serveur
  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', page)
      params.append('page_size', itemsPerPage)
      params.append('ordering', `${sortDirection === 'desc' ? '' : '-'}${sortField.replace(/^-/, '')}`)
      if (searchTerm) params.append('search', searchTerm)
      if (filterCategory) params.append('category', filterCategory)
      if (filterBrand) params.append('brand', filterBrand)
      if (filterActive !== '') params.append('is_active', filterActive)
      if (filterType) params.append('product_type', filterType)

      const res = await AxiosInstance.get(`/products/?${params.toString()}`)
      const data = res.data

      if (Array.isArray(data)) {
        setProducts(data)
        setTotalCount(data.length)
        setTotalPages(Math.ceil(data.length / itemsPerPage))
      } else if (data.results) {
        setProducts(data.results)
        setTotalCount(data.count || 0)
        setTotalPages(Math.ceil((data.count || 0) / itemsPerPage))
      }
    } catch (e) {
      console.error(e)
      showNotification('Erreur de chargement des produits', 'error')
    } finally {
      setLoading(false)
    }
  }, [itemsPerPage, searchTerm, filterCategory, filterBrand, filterActive, filterType, sortField, sortDirection])

  useEffect(() => {
    setCurrentPage(1)
    fetchProducts(1)
  }, [itemsPerPage, filterCategory, filterBrand, filterActive, filterType, sortField, sortDirection])

  useEffect(() => {
    const t = setTimeout(() => {
      setCurrentPage(1)
      fetchProducts(1)
    }, 350)
    return () => clearTimeout(t)
  }, [searchTerm])

  const handleDeleteProduct = async () => {
    if (!productToDelete) return
    try {
      await AxiosInstance.delete(`/products/${productToDelete.id}/`)
      showNotification(`Produit "${productToDelete.name}" supprimé`, 'success')
      fetchProducts(currentPage)
      setShowDeleteModal(false)
      setProductToDelete(null)
    } catch (err) {
      showNotification('Erreur lors de la suppression', 'error')
    }
  }

  const handleToggleActive = async (product) => {
    try {
      const res = await AxiosInstance.post(`/products/${product.id}/toggle-active/`)
      showNotification(`Produit ${res.data.is_active ? 'activé' : 'désactivé'}`, 'success')
      // Mise à jour locale optimiste
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: res.data.is_active } : p))
    } catch {
      showNotification('Erreur lors du changement de statut', 'error')
    }
  }

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('asc') }
  }

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return
    setCurrentPage(newPage)
    fetchProducts(newPage)
  }

  const resetFilters = () => {
    setSearchTerm('')
    setFilterCategory('')
    setFilterBrand('')
    setFilterActive('')
    setFilterType('')
  }

  const formatPrice = (v) => {
    if (v === null || v === undefined) return '—'
    return new Intl.NumberFormat('fr-FR').format(v) + ' FCFA'
  }

  const getStatusBadge = (isActive) => (
    isActive ? (
      <div className="badge badge-success badge-sm gap-1">
        <CheckCircle className="w-3 h-3" /> Actif
      </div>
    ) : (
      <div className="badge badge-ghost badge-sm gap-1">
        <AlertCircle className="w-3 h-3" /> Inactif
      </div>
    )
  )

  const getStockBadge = (p) => {
    const q = p.stock_quantity || 0
    const min = p.minimum_stock || 0
    if (q === 0) return <span className="badge badge-error badge-sm gap-1"><AlertTriangle className="w-3 h-3" /> Rupture</span>
    if (q <= min) return <span className="badge badge-warning badge-sm gap-1"><TrendingDown className="w-3 h-3" /> Faible</span>
    return <span className="badge badge-success badge-sm gap-1"><CheckCircle className="w-3 h-3" /> OK</span>
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />
    return sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
  }

  // ✅ Stats calculées sur la page courante + total
  const stats = React.useMemo(() => {
    const active = products.filter(p => p.is_active).length
    const lowStock = products.filter(p => (p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) <= (p.minimum_stock || 0)).length
    const outOfStock = products.filter(p => (p.stock_quantity || 0) === 0).length
    const featured = products.filter(p => p.is_featured).length
    return { total: totalCount, active, lowStock, outOfStock, featured }
  }, [products, totalCount])

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-6">
          <div className="loading loading-spinner loading-lg text-primary w-16 h-16"></div>
          <p className="text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement des produits...
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
            {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-semibold">{notification.message}</span>
            <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setNotification({ ...notification, show: false })}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-base-content mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Produits
          </h1>
          <p className="text-base text-base-content/60">
            {totalCount} produit{totalCount > 1 ? 's' : ''} au catalogue
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => fetchProducts(currentPage)} className="btn btn-outline gap-2">
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
          <button onClick={() => navigate('/produits/nouveau')} className="btn btn-primary gap-2">
            <Plus className="w-4 h-4" /> Nouveau produit
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-primary"><Package className="w-8 h-8" /></div>
          <div className="stat-title text-sm font-semibold">Total</div>
          <div className="stat-value text-3xl font-black">{stats.total}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-success"><CheckCircle className="w-8 h-8" /></div>
          <div className="stat-title text-sm font-semibold">Actifs (page)</div>
          <div className="stat-value text-3xl font-black">{stats.active}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-warning"><TrendingDown className="w-8 h-8" /></div>
          <div className="stat-title text-sm font-semibold">Stock faible</div>
          <div className="stat-value text-3xl font-black">{stats.lowStock}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-error"><AlertTriangle className="w-8 h-8" /></div>
          <div className="stat-title text-sm font-semibold">Rupture</div>
          <div className="stat-value text-3xl font-black">{stats.outOfStock}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-accent"><Star className="w-8 h-8" /></div>
          <div className="stat-title text-sm font-semibold">En vedette</div>
          <div className="stat-value text-3xl font-black">{stats.featured}</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-base-100 rounded-xl shadow-md border border-base-300 p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40" />
            <input
              type="text"
              placeholder="Rechercher par nom, référence, code-barres..."
              className="input input-bordered w-full pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'} gap-2`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" /> Filtres
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

        {/* Filtres avancés */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-base-300 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select className="select select-bordered" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">Toutes catégories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="select select-bordered" value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)}>
              <option value="">Toutes marques</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select className="select select-bordered" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">Tous types</option>
              <option value="simple">Simple</option>
              <option value="variable">Variable</option>
              <option value="service">Service</option>
              <option value="digital">Numérique</option>
            </select>
            <select className="select select-bordered" value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
              <option value="">Tous statuts</option>
              <option value="true">Actif</option>
              <option value="false">Inactif</option>
            </select>
            <button className="btn btn-outline col-span-1 sm:col-span-2 lg:col-span-4" onClick={resetFilters}>
              <Filter className="w-4 h-4" /> Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden">
        {loading && (
          <div className="flex justify-center py-2">
            <span className="loading loading-spinner loading-sm text-primary"></span>
          </div>
        )}

        {products.length === 0 && !loading ? (
          <div className="p-12 text-center">
            <Package className="w-20 h-20 mx-auto mb-4 text-base-content/30" />
            <p className="text-xl font-semibold text-base-content/50">Aucun produit trouvé</p>
            <p className="text-base text-base-content/40 mt-2">Essayez de modifier vos critères ou créez un nouveau produit</p>
            <button className="btn btn-primary mt-6 gap-2" onClick={() => navigate('/produits/nouveau')}>
              <Plus className="w-4 h-4" /> Créer un produit
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map(p => (
              <div key={p.id} className="bg-base-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-base-300 group">
                {/* Image */}
                <div className="relative h-40 bg-base-300 flex items-center justify-center overflow-hidden">
                  {p.main_image ? (
                    <img src={p.main_image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <ImageIcon className="w-16 h-16 text-base-content/20" />
                  )}
                  <div className="absolute top-2 right-2 flex flex-col gap-1">
                    {p.is_featured && <span className="badge badge-warning badge-sm gap-1"><Star className="w-3 h-3" /> Vedette</span>}
                    {getStockBadge(p)}
                  </div>
                  <div className="absolute top-2 left-2">{getStatusBadge(p.is_active)}</div>
                </div>

                {/* Contenu */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base-content truncate">{p.name}</h3>
                      <p className="text-xs text-base-content/50 font-mono flex items-center gap-1 mt-0.5">
                        <Hash className="w-3 h-3" /> {p.reference}
                      </p>
                    </div>
                    <div className="dropdown dropdown-end">
                      <button className="btn btn-ghost btn-xs btn-circle"><MoreVertical className="w-4 h-4" /></button>
                      <ul className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                        <li><button onClick={() => navigate(`/produits/${p.id}`)}><Eye className="w-4 h-4" /> Voir détails</button></li>
                        <li><button onClick={() => navigate(`/produits/${p.id}/modifier`)}><Edit className="w-4 h-4" /> Modifier</button></li>
                        <li><button onClick={() => handleToggleActive(p)}>
                          {p.is_active ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          {p.is_active ? 'Désactiver' : 'Activer'}
                        </button></li>
                        <li><button className="text-error" onClick={() => { setProductToDelete(p); setShowDeleteModal(true) }}>
                          <Trash2 className="w-4 h-4" /> Supprimer
                        </button></li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {p.category_name && <span className="badge badge-info badge-xs gap-1"><Folder className="w-2.5 h-2.5" /> {p.category_name}</span>}
                    {p.brand_name && <span className="badge badge-secondary badge-xs gap-1"><Building2 className="w-2.5 h-2.5" /> {p.brand_name}</span>}
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-base-content/60 flex items-center gap-1"><Boxes className="w-3 h-3" /> Stock</span>
                      <span className={`font-bold ${(p.stock_quantity || 0) === 0 ? 'text-error' : (p.stock_quantity || 0) <= (p.minimum_stock || 0) ? 'text-warning' : 'text-success'}`}>
                        {p.stock_quantity || 0} {p.unit_abbrev || ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-base-300">
                      <span className="text-base-content/60 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Vente</span>
                      <span className="font-bold text-primary">{formatPrice(p.sale_price)}</span>
                    </div>
                    {p.purchase_price !== null && p.purchase_price !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-base-content/60 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Achat</span>
                        <span className="font-semibold text-base-content/70">{formatPrice(p.purchase_price)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr className="bg-base-200">
                  <th className="w-12">Image</th>
                  <th>
                    <button className="flex items-center gap-1 hover:text-primary font-semibold" onClick={() => handleSort('name')}>
                      Produit <SortIcon field="name" />
                    </button>
                  </th>
                  <th>Référence</th>
                  <th>Catégorie</th>
                  <th>Marque</th>
                  <th>
                    <button className="flex items-center gap-1 hover:text-primary font-semibold" onClick={() => handleSort('stock_quantity')}>
                      Stock <SortIcon field="stock_quantity" />
                    </button>
                  </th>
                  <th>Prix vente</th>
                  <th>Statut</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="hover">
                    <td>
                      {p.main_image ? (
                        <div className="avatar">
                          <div className="w-10 h-10 rounded-lg">
                            <img src={p.main_image} alt={p.name} />
                          </div>
                        </div>
                      ) : (
                        <div className="avatar placeholder">
                          <div className="bg-primary/10 text-primary rounded-lg w-10 h-10">
                            <Package className="w-5 h-5" />
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="font-semibold">
                      <div>{p.name}</div>
                      {p.is_featured && <span className="badge badge-warning badge-xs mt-1 gap-1"><Star className="w-2.5 h-2.5" /> Vedette</span>}
                    </td>
                    <td className="font-mono text-xs">{p.reference}</td>
                    <td className="text-sm">{p.category_name || '-'}</td>
                    <td className="text-sm">{p.brand_name || '-'}</td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span className="font-bold">{p.stock_quantity || 0} {p.unit_abbrev || ''}</span>
                        {getStockBadge(p)}
                      </div>
                    </td>
                    <td className="font-semibold text-primary">{formatPrice(p.sale_price)}</td>
                    <td>{getStatusBadge(p.is_active)}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button className="btn btn-ghost btn-xs" onClick={() => navigate(`/produits/${p.id}`)}><Eye className="w-3 h-3" /></button>
                        <button className="btn btn-ghost btn-xs" onClick={() => navigate(`/produits/${p.id}/modifier`)}><Edit className="w-3 h-3" /></button>
                        <button className="btn btn-ghost btn-xs text-error" onClick={() => { setProductToDelete(p); setShowDeleteModal(true) }}><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ✅ Pagination serveur */}
        {totalCount > 0 && (
          <div className="p-4 border-t border-base-300">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-base-content/60">
                Affichage de {((currentPage - 1) * itemsPerPage) + 1} à{' '}
                {Math.min(currentPage * itemsPerPage, totalCount)} sur {totalCount} produits
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="select select-bordered select-sm"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                >
                  <option value="12">12 par page</option>
                  <option value="24">24 par page</option>
                  <option value="48">48 par page</option>
                  <option value="96">96 par page</option>
                  <option value="200">200 par page</option>
                </select>
                <div className="join">
                  <button
                    className="join-item btn btn-sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                  >
                    <ChevronLeft className="w-4 h-4" />
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
                        className={`join-item btn btn-sm ${currentPage === pageNum ? 'btn-primary' : ''}`}
                        onClick={() => handlePageChange(pageNum)}
                        disabled={loading}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    className="join-item btn btn-sm"
                    onClick={() => handlePageChange(currentPage + 1)}
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

      {/* Modal suppression */}
      {showDeleteModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <div className="text-center mb-6">
              <div className="avatar placeholder mb-4">
                <div className="bg-error/10 text-error rounded-full w-20 h-20">
                  <AlertTriangle className="w-10 h-10" />
                </div>
              </div>
              <h3 className="font-bold text-2xl mb-2">Confirmer la suppression</h3>
              <p className="text-base-content/70">Voulez-vous vraiment supprimer le produit</p>
              <p className="text-xl font-bold text-error mt-2">"{productToDelete?.name}" ?</p>
              <p className="text-sm text-base-content/50 mt-4">
                Cette action est irréversible. Toutes les données associées (images, variantes, prix) seront supprimées.
              </p>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowDeleteModal(false)}>Annuler</button>
              <button className="btn btn-error" onClick={handleDeleteProduct}>
                <Trash2 className="w-4 h-4" /> Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown { animation: slideDown 0.4s ease-out; }
      `}</style>
    </div>
  )
}

export default Products