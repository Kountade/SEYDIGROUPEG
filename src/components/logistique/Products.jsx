// src/components/Products.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Plus,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  Filter,
  X,
  AlertCircle,
  CheckCircle,
  Package,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Barcode,
  Hash,
  Tag,
  Building2,
  Folder,
  DollarSign,
  Boxes,
  Layers
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
    totalValue: 0
  })

  const productTypes = {
    simple: 'Simple',
    variable: 'Variable',
    service: 'Service',
    digital: 'Numérique'
  }

  const formatNumber = (number) => {
    if (!number && number !== 0) return '0,00'
    return new Intl.NumberFormat('fr-FR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(number)
  }

  const formatPrice = (price) => {
    return `${formatNumber(price)} €`
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [prodRes, catRes, brandRes] = await Promise.all([
        AxiosInstance.get('/products/'),
        AxiosInstance.get('/categories/'),
        AxiosInstance.get('/brands/')
      ])
      
      const productsData = prodRes.data
      setProducts(productsData)
      setCategories(catRes.data)
      setBrands(brandRes.data)
      
      // Calculer les statistiques
      const total = productsData.length
      const active = productsData.filter(p => p.is_active).length
      const lowStock = productsData.filter(p => p.is_low_stock).length
      const totalValue = productsData.reduce((sum, p) => 
        sum + ((p.stock_quantity || 0) * (p.purchase_price || 0)), 0
      )
      
      setStats({ total, active, lowStock, totalValue })
      
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
      showNotification(`Produit "${productToDelete.name}" supprimé avec succès`, 'success')
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

  // Filtrage et tri des produits
  const filteredAndSortedProducts = React.useMemo(() => {
    let filtered = products.filter(p => {
      const search = searchTerm.toLowerCase()
      const name = (p.name || '').toLowerCase()
      const ref = (p.reference || '').toLowerCase()
      const barcode = (p.barcode || '').toLowerCase()
      const matchesSearch = name.includes(search) || ref.includes(search) || barcode.includes(search)
      const matchesCategory = !filterCategory || p.category === parseInt(filterCategory)
      const matchesBrand = !filterBrand || p.brand === parseInt(filterBrand)
      const matchesActive = filterActive === '' || p.is_active === (filterActive === 'true')
      return matchesSearch && matchesCategory && matchesBrand && matchesActive
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
  }, [products, searchTerm, filterCategory, filterBrand, filterActive, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage)
  const paginatedProducts = filteredAndSortedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <span className="badge badge-success badge-sm gap-1">
        <CheckCircle className="w-3 h-3" />
        Actif
      </span>
    ) : (
      <span className="badge badge-ghost badge-sm gap-1">
        <AlertCircle className="w-3 h-3" />
        Inactif
      </span>
    )
  }

  const getTypeBadge = (type) => {
    const colors = {
      simple: 'badge-primary',
      variable: 'badge-secondary',
      service: 'badge-info',
      digital: 'badge-accent'
    }
    return (
      <span className={`badge ${colors[type] || 'badge-ghost'} badge-xs`}>
        {productTypes[type] || 'Simple'}
      </span>
    )
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-3 h-3" /> : 
      <ChevronDown className="w-3 h-3" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-base font-medium text-base-content/70 animate-pulse">
            Chargement des produits...
          </p>
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
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5" />
            ) : (
              <AlertCircle className="w-4 h-4 lg:w-5 lg:h-5" />
            )}
            <span className="text-sm lg:text-base font-medium">{notification.message}</span>
            <button 
              className="btn btn-ghost btn-xs btn-circle"
              onClick={() => setNotification({ ...notification, show: false })}
            >
              <X className="w-3 h-3 lg:w-4 lg:h-4" />
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-base-content">
            Produits
          </h1>
          <p className="text-xs lg:text-sm text-base-content/60">
            Gérez votre catalogue produits
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={fetchData}
            className="btn btn-outline btn-sm lg:btn-md gap-1 lg:gap-2"
          >
            <RefreshCw className="w-3 h-3 lg:w-4 lg:h-4" />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
          <button 
            onClick={() => navigate('/produits/nouveau')}
            className="btn btn-primary btn-sm lg:btn-md gap-1 lg:gap-2"
          >
            <Plus className="w-3 h-3 lg:w-4 lg:h-4" />
            <span className="hidden sm:inline">Nouveau produit</span>
            <span className="sm:hidden">Nouveau</span>
          </button>
        </div>
      </div>

      {/* Cartes statistiques - Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
        <div className="stat bg-base-100 rounded-lg lg:rounded-xl shadow-sm border border-base-300 p-2 lg:p-4">
          <div className="stat-figure text-primary">
            <Package className="w-5 h-5 lg:w-6 lg:h-6" />
          </div>
          <div className="stat-title text-xs lg:text-sm">Total produits</div>
          <div className="stat-value text-lg lg:text-2xl">{stats.total}</div>
        </div>
        
        <div className="stat bg-base-100 rounded-lg lg:rounded-xl shadow-sm border border-base-300 p-2 lg:p-4">
          <div className="stat-figure text-success">
            <CheckCircle className="w-5 h-5 lg:w-6 lg:h-6" />
          </div>
          <div className="stat-title text-xs lg:text-sm">Actifs</div>
          <div className="stat-value text-lg lg:text-2xl">{stats.active}</div>
        </div>
        
        <div className="stat bg-base-100 rounded-lg lg:rounded-xl shadow-sm border border-base-300 p-2 lg:p-4">
          <div className="stat-figure text-warning">
            <AlertTriangle className="w-5 h-5 lg:w-6 lg:h-6" />
          </div>
          <div className="stat-title text-xs lg:text-sm">Stock faible</div>
          <div className="stat-value text-lg lg:text-2xl">{stats.lowStock}</div>
        </div>
        
        <div className="stat bg-base-100 rounded-lg lg:rounded-xl shadow-sm border border-base-300 p-2 lg:p-4">
          <div className="stat-figure text-info">
            <DollarSign className="w-5 h-5 lg:w-6 lg:h-6" />
          </div>
          <div className="stat-title text-xs lg:text-sm">Valeur stock</div>
          <div className="stat-value text-base lg:text-xl truncate">
            {formatPrice(stats.totalValue)}
          </div>
        </div>
      </div>

      {/* Filtres - Desktop */}
      <div className="hidden lg:block bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
            <input
              type="text"
              placeholder="Rechercher par nom, référence, code-barres..."
              className="input input-bordered input-sm w-full pl-9"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>
          
          <select 
            className="select select-bordered select-sm w-40"
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
            className="select select-bordered select-sm w-36"
            value={filterBrand}
            onChange={(e) => {
              setFilterBrand(e.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="">Toutes marques</option>
            {brands.map(brand => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>
          
          <select 
            className="select select-bordered select-sm w-32"
            value={filterActive}
            onChange={(e) => {
              setFilterActive(e.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="">Tous statuts</option>
            <option value="true">Actif</option>
            <option value="false">Inactif</option>
          </select>
          
          <button 
            className="btn btn-outline btn-sm"
            onClick={() => {
              setFilterCategory('')
              setFilterBrand('')
              setFilterActive('')
              setSearchTerm('')
              setCurrentPage(1)
            }}
          >
            <Filter className="w-3 h-3" />
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Filtres - Mobile */}
      <div className="lg:hidden">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-base-content/40" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="input input-bordered input-sm w-full pl-8 text-sm"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>
          
          <button 
            className="btn btn-outline btn-sm"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
          >
            <Filter className="w-3 h-3" />
            Filtres
          </button>
        </div>

        {/* Filtres avancés mobile */}
        {showMobileFilters && (
          <div className="mt-2 p-3 bg-base-100 rounded-lg border border-base-300 space-y-2">
            <select 
              className="select select-bordered select-sm w-full"
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">Toutes les catégories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            
            <select 
              className="select select-bordered select-sm w-full"
              value={filterBrand}
              onChange={(e) => {
                setFilterBrand(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">Toutes les marques</option>
              {brands.map(brand => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>
            
            <select 
              className="select select-bordered select-sm w-full"
              value={filterActive}
              onChange={(e) => {
                setFilterActive(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">Tous les statuts</option>
              <option value="true">Actif</option>
              <option value="false">Inactif</option>
            </select>
            
            <button 
              className="btn btn-outline btn-sm w-full"
              onClick={() => {
                setFilterCategory('')
                setFilterBrand('')
                setFilterActive('')
                setSearchTerm('')
                setCurrentPage(1)
                setShowMobileFilters(false)
              }}
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {/* Tableau - Desktop */}
      <div className="hidden lg:block bg-base-100 rounded-xl shadow-sm border border-base-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr className="bg-base-200">
                <th className="w-12"></th>
                <th>
                  <button 
                    className="flex items-center gap-1 hover:text-primary font-semibold"
                    onClick={() => handleSort('reference')}
                  >
                    Référence
                    <SortIcon field="reference" />
                  </button>
                </th>
                <th>
                  <button 
                    className="flex items-center gap-1 hover:text-primary font-semibold"
                    onClick={() => handleSort('name')}
                  >
                    Nom
                    <SortIcon field="name" />
                  </button>
                </th>
                <th>Catégorie</th>
                <th>Marque</th>
                <th>
                  <button 
                    className="flex items-center gap-1 hover:text-primary font-semibold"
                    onClick={() => handleSort('purchase_price')}
                  >
                    Prix achat
                    <SortIcon field="purchase_price" />
                  </button>
                </th>
                <th>
                  <button 
                    className="flex items-center gap-1 hover:text-primary font-semibold"
                    onClick={() => handleSort('sale_price')}
                  >
                    Prix vente
                    <SortIcon field="sale_price" />
                  </button>
                </th>
                <th>
                  <button 
                    className="flex items-center gap-1 hover:text-primary font-semibold"
                    onClick={() => handleSort('stock_quantity')}
                  >
                    Stock
                    <SortIcon field="stock_quantity" />
                  </button>
                </th>
                <th>Statut</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product) => (
                <tr key={product.id} className="hover">
                  <td>
                    {product.main_image ? (
                      <div className="avatar">
                        <div className="w-8 h-8 rounded-lg">
                          <img src={product.main_image} alt={product.name} className="object-cover" />
                        </div>
                      </div>
                    ) : (
                      <div className="avatar placeholder">
                        <div className="bg-primary/10 text-primary rounded-lg w-8 h-8">
                          <Package className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="font-medium text-sm">{product.reference}</div>
                    {product.barcode && (
                      <div className="text-xs text-base-content/60 flex items-center gap-1">
                        <Barcode className="w-3 h-3" />
                        {product.barcode}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="text-sm">{product.name}</div>
                    {getTypeBadge(product.product_type)}
                  </td>
                  <td className="text-sm">{product.category_name || '-'}</td>
                  <td className="text-sm">{product.brand_name || '-'}</td>
                  <td className="text-sm text-right">{formatPrice(product.purchase_price)}</td>
                  <td className="text-sm text-right font-semibold text-primary">
                    {formatPrice(product.sale_price)}
                  </td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className={`text-sm ${product.is_low_stock ? 'text-warning font-bold' : ''}`}>
                        {product.stock_quantity || 0}
                      </span>
                      {product.is_low_stock && (
                        <AlertTriangle className="w-3 h-3 text-warning" />
                      )}
                    </div>
                    <div className="text-xs text-base-content/50">{product.unit_abbrev || 'unité'}</div>
                  </td>
                  <td>{getStatusBadge(product.is_active)}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button 
                        className="btn btn-ghost btn-xs"
                        onClick={() => navigate(`/produits/${product.id}`)}
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                      <button 
                        className="btn btn-ghost btn-xs"
                        onClick={() => navigate(`/produits/${product.id}/modifier`)}
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button 
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => {
                          setProductToDelete(product)
                          setShowDeleteModal(true)
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAndSortedProducts.length === 0 && (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-3 text-base-content/30" />
            <p className="text-base font-medium text-base-content/50">
              Aucun produit trouvé
            </p>
            <p className="text-sm text-base-content/40 mt-1">
              Essayez de modifier vos critères de recherche
            </p>
            <button 
              className="btn btn-primary btn-sm mt-4"
              onClick={() => navigate('/produits/nouveau')}
            >
              <Plus className="w-3 h-3" />
              Créer un produit
            </button>
          </div>
        )}
      </div>

      {/* Liste - Mobile */}
      <div className="lg:hidden space-y-2">
        {paginatedProducts.length === 0 ? (
          <div className="bg-base-100 rounded-xl p-8 text-center border border-base-300">
            <Package className="w-12 h-12 mx-auto mb-2 text-base-content/30" />
            <p className="text-sm font-medium text-base-content/50">
              Aucun produit trouvé
            </p>
            <button 
              className="btn btn-primary btn-sm mt-3"
              onClick={() => navigate('/produits/nouveau')}
            >
              <Plus className="w-3 h-3" />
              Créer
            </button>
          </div>
        ) : (
          paginatedProducts.map((product) => (
            <div key={product.id} className="bg-base-100 rounded-xl p-3 border border-base-300 shadow-sm">
              <div className="flex items-start gap-3">
                {/* Image */}
                <div className="flex-shrink-0">
                  {product.main_image ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden">
                      <img src={product.main_image} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                      <Package className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-base-content/60">Réf: {product.reference}</span>
                        {getTypeBadge(product.product_type)}
                      </div>
                    </div>
                    {getStatusBadge(product.is_active)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div>
                      <span className="text-base-content/60">Catégorie:</span>
                      <span className="ml-1">{product.category_name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-base-content/60">Marque:</span>
                      <span className="ml-1">{product.brand_name || '-'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <span className="text-xs text-base-content/60">Prix:</span>
                      <span className="ml-1 font-semibold text-primary">
                        {formatPrice(product.sale_price)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-medium ${product.is_low_stock ? 'text-warning' : ''}`}>
                        Stock: {product.stock_quantity || 0}
                      </span>
                      {product.is_low_stock && (
                        <AlertTriangle className="w-3 h-3 text-warning" />
                      )}
                    </div>
                  </div>
                  
                  {product.barcode && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-base-content/50">
                      <Barcode className="w-3 h-3" />
                      {product.barcode}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-1 mt-3 pt-2 border-t border-base-200">
                <button 
                  className="btn btn-ghost btn-xs"
                  onClick={() => navigate(`/produits/${product.id}`)}
                >
                  <Eye className="w-3 h-3" />
                  <span className="text-xs">Voir</span>
                </button>
                <button 
                  className="btn btn-ghost btn-xs"
                  onClick={() => navigate(`/produits/${product.id}/modifier`)}
                >
                  <Edit className="w-3 h-3" />
                  <span className="text-xs">Modifier</span>
                </button>
                <button 
                  className="btn btn-ghost btn-xs text-error"
                  onClick={() => {
                    setProductToDelete(product)
                    setShowDeleteModal(true)
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="text-xs">Supprimer</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {filteredAndSortedProducts.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs lg:text-sm text-base-content/60">
            {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredAndSortedProducts.length)} sur {filteredAndSortedProducts.length} produits
          </div>
          
          <div className="flex items-center gap-2">
            <select 
              className="select select-bordered select-xs lg:select-sm w-20 lg:w-28"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(parseInt(e.target.value))
                setCurrentPage(1)
              }}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
            
            <div className="join">
              <button 
                className="join-item btn btn-xs lg:btn-sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-3 h-3 lg:w-4 lg:h-4" />
              </button>
              
              <span className="join-item btn btn-xs lg:btn-sm no-animation">
                {currentPage} / {totalPages}
              </span>
              
              <button 
                className="join-item btn btn-xs lg:btn-sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-3 h-3 lg:w-4 lg:h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-md">
            <div className="text-center">
              <div className="avatar placeholder mb-4">
                <div className="bg-error/10 text-error rounded-full w-16 h-16">
                  <AlertTriangle className="w-8 h-8" />
                </div>
              </div>
              <h3 className="font-bold text-xl mb-2">Confirmer la suppression</h3>
              <p className="text-base-content/70 text-sm">
                Voulez-vous vraiment supprimer le produit
              </p>
              <p className="text-lg font-bold text-error mt-2">
                "{productToDelete?.name}"
              </p>
              <p className="text-xs text-base-content/60 mt-1">
                Réf: {productToDelete?.reference}
              </p>
              <p className="text-xs text-base-content/50 mt-3">
                Cette action est irréversible.
              </p>
            </div>
            
            <div className="modal-action">
              <button 
                className="btn btn-ghost btn-sm"
                onClick={() => setShowDeleteModal(false)}
              >
                Annuler
              </button>
              <button 
                className="btn btn-error btn-sm"
                onClick={handleDeleteProduct}
              >
                <Trash2 className="w-3 h-3" />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Products