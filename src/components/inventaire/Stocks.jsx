// src/pages/stocks/Stocks.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Plus, Edit, Trash2, Search, RefreshCw, Filter, X,
  AlertCircle, CheckCircle, Package, Eye, ChevronLeft,
  ChevronRight, AlertTriangle, ArrowUpDown, ChevronUp,
  ChevronDown, Barcode, DollarSign, Box
} from 'lucide-react'

const Stocks = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [filterStockStatus, setFilterStockStatus] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [productToDelete, setProductToDelete] = useState(null)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0
  })

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0 FCFA'
    return Math.round(parseFloat(amount)).toLocaleString() + ' FCFA'
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [prodRes, catRes, brandRes] = await Promise.all([
        AxiosInstance.get('/products/'),
        AxiosInstance.get('/categories/'),
        AxiosInstance.get('/brands/')
      ])
      
      let productsData = []
      if (prodRes.data.results) {
        productsData = prodRes.data.results
      } else if (Array.isArray(prodRes.data)) {
        productsData = prodRes.data
      }
      
      let categoriesData = []
      if (catRes.data.results) {
        categoriesData = catRes.data.results
      } else if (Array.isArray(catRes.data)) {
        categoriesData = catRes.data
      }
      
      let brandsData = []
      if (brandRes.data.results) {
        brandsData = brandRes.data.results
      } else if (Array.isArray(brandRes.data)) {
        brandsData = brandRes.data
      }
      
      setProducts(productsData)
      setCategories(categoriesData)
      setBrands(brandsData)
      
      const total = productsData.length
      const active = productsData.filter(p => p.is_active).length
      const lowStock = productsData.filter(p => p.is_low_stock).length
      const outOfStock = productsData.filter(p => (p.stock_quantity || 0) === 0).length
      const totalValue = productsData.reduce((sum, p) => 
        sum + ((p.stock_quantity || 0) * (parseFloat(p.purchase_price) || 0)), 0
      )
      
      setStats({ total, active, lowStock, outOfStock, totalValue })
      
    } catch (error) {
      console.error(error)
      showNotification('Erreur de chargement des produits', 'error')
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

  const handleDeleteProduct = async () => {
    if (!productToDelete) return
    try {
      await AxiosInstance.delete(`/products/${productToDelete.id}/`)
      showNotification(`Produit supprimé avec succès`, 'success')
      fetchData()
      setShowDeleteModal(false)
      setProductToDelete(null)
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

  const filteredAndSortedProducts = React.useMemo(() => {
    let filtered = products.filter(p => {
      const search = searchTerm.toLowerCase()
      const name = (p.name || '').toLowerCase()
      const ref = (p.reference || '').toLowerCase()
      const matchesSearch = name.includes(search) || ref.includes(search)
      const matchesCategory = !filterCategory || p.category === parseInt(filterCategory)
      const matchesBrand = !filterBrand || p.brand === parseInt(filterBrand)
      
      let matchesStockStatus = true
      if (filterStockStatus === 'low') {
        matchesStockStatus = p.is_low_stock === true
      } else if (filterStockStatus === 'out') {
        matchesStockStatus = (p.stock_quantity || 0) === 0
      } else if (filterStockStatus === 'ok') {
        matchesStockStatus = (p.stock_quantity || 0) > 0 && !p.is_low_stock
      }
      
      return matchesSearch && matchesCategory && matchesBrand && matchesStockStatus
    })

    filtered.sort((a, b) => {
      let aVal = a[sortField] || ''
      let bVal = b[sortField] || ''
      if (['purchase_price', 'sale_price', 'stock_quantity'].includes(sortField)) {
        aVal = parseFloat(aVal) || 0
        bVal = parseFloat(bVal) || 0
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    return filtered
  }, [products, searchTerm, filterCategory, filterBrand, filterStockStatus, sortField, sortDirection])

  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage)
  const paginatedProducts = filteredAndSortedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const getStockStatusBadge = (product) => {
    const stockQty = product.stock_quantity || 0
    if (stockQty === 0) {
      return { label: 'Rupture', color: 'error', icon: AlertCircle }
    }
    if (product.is_low_stock) {
      return { label: 'Stock faible', color: 'warning', icon: AlertTriangle }
    }
    return { label: 'En stock', color: 'success', icon: CheckCircle }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />
    return sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-base font-medium text-base-content/70">Chargement des stocks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6 p-3 lg:p-6">
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-16 lg:top-20 right-3 lg:right-6 z-50 animate-slideDown w-[calc(100%-1.5rem)] lg:w-auto max-w-md">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg`}>
            {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm lg:text-base font-medium">{notification.message}</span>
            <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setNotification({ ...notification, show: false })}>
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-base-content">Gestion des stocks</h1>
          <p className="text-xs lg:text-sm text-base-content/60">Suivez les niveaux de stock et la valeur de votre inventaire</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn btn-ghost btn-sm lg:btn-md gap-1">
            <RefreshCw className="w-3 h-3 lg:w-4 lg:h-4" />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
          <button onClick={() => navigate('/produits/nouveau')} className="btn btn-primary btn-sm lg:btn-md gap-1">
            <Plus className="w-3 h-3 lg:w-4 lg:h-4" />
            <span className="hidden sm:inline">Nouveau produit</span>
          </button>
        </div>
      </div>

      {/* Cartes statistiques - sans bordures */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-3">
        <div className="stat bg-primary/5 rounded-lg p-2 lg:p-4">
          <div className="stat-figure text-primary"><Package className="w-5 h-5" /></div>
          <div className="stat-title text-xs">Total produits</div>
          <div className="stat-value text-lg lg:text-2xl">{stats.total}</div>
        </div>
        <div className="stat bg-success/5 rounded-lg p-2 lg:p-4">
          <div className="stat-figure text-success"><CheckCircle className="w-5 h-5" /></div>
          <div className="stat-title text-xs">Actifs</div>
          <div className="stat-value text-lg lg:text-2xl">{stats.active}</div>
        </div>
        <div className="stat bg-warning/5 rounded-lg p-2 lg:p-4">
          <div className="stat-figure text-warning"><AlertTriangle className="w-5 h-5" /></div>
          <div className="stat-title text-xs">Stock faible</div>
          <div className="stat-value text-lg lg:text-2xl">{stats.lowStock}</div>
        </div>
        <div className="stat bg-error/5 rounded-lg p-2 lg:p-4">
          <div className="stat-figure text-error"><AlertCircle className="w-5 h-5" /></div>
          <div className="stat-title text-xs">Rupture</div>
          <div className="stat-value text-lg lg:text-2xl">{stats.outOfStock}</div>
        </div>
        <div className="stat bg-info/5 rounded-lg p-2 lg:p-4 col-span-2 lg:col-span-1">
          <div className="stat-figure text-info"><DollarSign className="w-5 h-5" /></div>
          <div className="stat-title text-xs">Valeur stock</div>
          <div className="stat-value text-base lg:text-xl truncate">{formatCurrency(stats.totalValue)}</div>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
          <input
            type="text"
            placeholder="Rechercher par nom ou référence..."
            className="input input-bordered w-full pl-9"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
          />
        </div>
        
        <select 
          className="select select-bordered w-full sm:w-48"
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value)
            setCurrentPage(1)
          }}
        >
          <option value="">Toutes catégories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        
        <select 
          className="select select-bordered w-full sm:w-48"
          value={filterStockStatus}
          onChange={(e) => {
            setFilterStockStatus(e.target.value)
            setCurrentPage(1)
          }}
        >
          <option value="">Tous les stocks</option>
          <option value="ok">En stock</option>
          <option value="low">Stock faible</option>
          <option value="out">Rupture</option>
        </select>
        
        {(searchTerm || filterCategory || filterStockStatus) && (
          <button 
            className="btn btn-ghost"
            onClick={() => {
              setFilterCategory('')
              setFilterStockStatus('')
              setSearchTerm('')
              setCurrentPage(1)
            }}
          >
            <X className="w-4 h-4" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Tableau - sans bordures */}
      <div className="bg-base-100 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr className="bg-base-200">
                <th><button className="flex items-center gap-1" onClick={() => handleSort('reference')}>Référence <SortIcon field="reference" /></button></th>
                <th><button className="flex items-center gap-1" onClick={() => handleSort('name')}>Produit <SortIcon field="name" /></button></th>
                <th>Catégorie</th>
                <th><button className="flex items-center gap-1" onClick={() => handleSort('purchase_price')}>PA <SortIcon field="purchase_price" /></button></th>
                <th><button className="flex items-center gap-1" onClick={() => handleSort('sale_price')}>PV <SortIcon field="sale_price" /></button></th>
                <th><button className="flex items-center gap-1" onClick={() => handleSort('stock_quantity')}>Stock <SortIcon field="stock_quantity" /></button></th>
                <th>Statut</th>
                <th>Valeur</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product) => {
                const stockStatus = getStockStatusBadge(product)
                const StatusIcon = stockStatus.icon
                const stockValue = (product.stock_quantity || 0) * (parseFloat(product.purchase_price) || 0)
                return (
                  <tr key={product.id} className="hover">
                    <td className="font-mono text-xs">{product.reference}</td>
                    <td><div className="font-medium text-sm">{product.name}</div></td>
                    <td className="text-sm">{product.category_name || '-'}</td>
                    <td className="text-sm text-right">{formatCurrency(product.purchase_price)}</td>
                    <td className="text-sm text-right font-semibold text-primary">{formatCurrency(product.sale_price)}</td>
                    <td className="text-sm">{product.stock_quantity || 0}</td>
                    <td><span className={`badge badge-${stockStatus.color} badge-sm gap-1`}><StatusIcon className="w-3 h-3" />{stockStatus.label}</span></td>
                    <td className="text-sm font-medium">{formatCurrency(stockValue)}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button className="btn btn-ghost btn-xs" onClick={() => navigate(`/stocks/${product.id}`)}><Eye className="w-3 h-3" /></button>
                        <button className="btn btn-ghost btn-xs text-error" onClick={() => { setProductToDelete(product); setShowDeleteModal(true) }}><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredAndSortedProducts.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-base-content/60">
            {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredAndSortedProducts.length)} sur {filteredAndSortedProducts.length} produits
          </div>
          <div className="join">
            <button className="join-item btn btn-sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="w-3 h-3" />
            </button>
            <span className="join-item btn btn-sm no-animation">{currentPage} / {totalPages}</span>
            <button className="join-item btn btn-sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Modal suppression */}
      {showDeleteModal && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-md">
            <div className="text-center">
              <div className="avatar placeholder mb-4">
                <div className="bg-error/10 text-error rounded-full w-16 h-16 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8" />
                </div>
              </div>
              <h3 className="font-bold text-xl mb-2">Confirmer la suppression</h3>
              <p className="text-base-content/70 text-sm">Supprimer "{productToDelete?.name}" ?</p>
              <p className="text-xs text-base-content/50 mt-3">Cette action est irréversible.</p>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDeleteModal(false)}>Annuler</button>
              <button className="btn btn-error btn-sm" onClick={handleDeleteProduct}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Stocks