// src/components/logistique/ProductDetails.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Edit,
  ArrowLeft,
  Package,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Barcode,
  MapPin,
  Weight,
  Box,
  Building2,
  Layers,
  AlertCircle,
  X,
  Hash,
  Warehouse,
  Plus,
  RefreshCw
} from 'lucide-react'

const ProductDetails = () => {
  const navigate = useNavigate()
  const { id } = useParams()

  const [product, setProduct] = useState(null)
  const [images, setImages] = useState([])
  const [variants, setVariants] = useState([])
  const [pricesByWarehouse, setPricesByWarehouse] = useState([])
  const [stocksByWarehouse, setStocksByWarehouse] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })
  const [selectedImage, setSelectedImage] = useState(null)
  const [showWarehousePrices, setShowWarehousePrices] = useState(true)

  const productTypes = { 
    simple: 'Simple', 
    variable: 'Variable', 
    service: 'Service', 
    digital: 'Numérique' 
  }

  const formatNumber = (number) => {
    if (typeof number !== 'number') number = parseFloat(number) || 0
    return new Intl.NumberFormat('fr-FR').format(number)
  }

  const formatPrice = (price) => {
    if (!price) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(price) + ' FCFA'
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [prodRes, imgRes, varRes, pricesRes, stocksRes] = await Promise.all([
        AxiosInstance.get(`/products/${id}/`),
        AxiosInstance.get(`/products/${id}/images/`).catch(() => ({ data: [] })),
        AxiosInstance.get(`/products/${id}/variants/`).catch(() => ({ data: [] })),
        AxiosInstance.get(`/products/${id}/prices/`).catch(() => ({ data: [] })),
        AxiosInstance.get(`/warehouse-stocks/by_product/?product_id=${id}`).catch(() => ({ data: [] }))
      ])
      setProduct(prodRes.data)
      setImages(imgRes.data || [])
      setVariants(varRes.data || [])
      setPricesByWarehouse(pricesRes.data || [])
      setStocksByWarehouse(stocksRes.data || [])
    } catch (error) {
      console.error(error)
      showNotification('Erreur de chargement du produit', 'error')
    } finally { 
      setLoading(false) 
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
    showNotification('Données actualisées', 'success')
  }

  useEffect(() => { 
    fetchData() 
  }, [id])

  const mainImage = product?.main_image || (images.length > 0 ? images.find(img => img.is_main)?.image : null)
  const totalStock = stocksByWarehouse.reduce((sum, s) => sum + (s.quantity || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-100">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-base-content/60">Chargement du produit...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-100">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-error/10 flex items-center justify-center mb-4">
            <Package className="w-10 h-10 text-error" />
          </div>
          <h2 className="text-xl font-bold">Produit non trouvé</h2>
          <button onClick={() => navigate('/produits')} className="btn btn-primary btn-sm mt-6">
            Retour à la liste
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-100">
      <div className="p-4 lg:p-8">
        {/* Notification */}
        {notification.show && (
          <div className="fixed top-20 right-6 z-50 animate-slideDown">
            <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg`}>
              {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{notification.message}</span>
              <button className="btn btn-ghost btn-xs" onClick={() => setNotification({ ...notification, show: false })}>
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* En-tête */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/produits')} className="btn btn-ghost btn-sm btn-circle">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-primary">{product.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="badge badge-outline gap-1">
                  <Hash className="w-3 h-3" /> {product.reference}
                </span>
                <span className="badge badge-primary badge-sm">
                  {productTypes[product.product_type] || 'Simple'}
                </span>
                {!product.is_active && (
                  <span className="badge badge-error badge-sm gap-1">
                    <XCircle className="w-3 h-3" /> Inactif
                  </span>
                )}
                {product.is_featured && (
                  <span className="badge badge-warning badge-sm gap-1">★ En vedette</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button onClick={refreshData} disabled={refreshing} className="btn btn-outline btn-sm gap-2">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
            <button 
              onClick={() => navigate(`/produits/${id}/prix`)}
              className="btn btn-outline btn-primary btn-sm gap-2"
            >
              <DollarSign className="w-4 h-4" />
              Prix par entrepôt
            </button>
            <button 
              onClick={() => navigate(`/produits/${id}/modifier`)}
              className="btn btn-primary btn-sm gap-2"
            >
              <Edit className="w-4 h-4" />
              Modifier
            </button>
          </div>
        </div>

        {/* Contenu principal - Version simplifiée pour éviter les erreurs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne gauche */}
          <div className="lg:col-span-1">
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                {mainImage ? (
                  <img 
                    src={mainImage} 
                    alt={product.name}
                    className="w-full h-64 object-contain rounded-lg cursor-pointer"
                    onClick={() => setSelectedImage(mainImage)}
                  />
                ) : (
                  <div className="w-full h-64 bg-base-300 rounded-lg flex flex-col items-center justify-center">
                    <Package className="w-16 h-16 text-base-content/30 mb-2" />
                    <p className="text-base-content/50 text-sm">Aucune image</p>
                  </div>
                )}
              </div>
            </div>

            <div className="card bg-base-200 shadow-xl mt-6">
              <div className="card-body">
                <h2 className="text-lg font-semibold mb-2">Description</h2>
                <p className="text-base-content/80">
                  {product.description || 'Aucune description disponible'}
                </p>
              </div>
            </div>
          </div>

          {/* Colonne droite */}
          <div className="lg:col-span-2">
            {/* Informations générales */}
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h2 className="text-lg font-semibold mb-4">Informations générales</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-base-content/60">Catégorie</p><p className="font-medium">{product.category_name || '-'}</p></div>
                  <div><p className="text-xs text-base-content/60">Marque</p><p className="font-medium">{product.brand_name || '-'}</p></div>
                  <div><p className="text-xs text-base-content/60">Unité</p><p className="font-medium">{product.unit_abbrev || '-'}</p></div>
                  <div><p className="text-xs text-base-content/60">Code-barres</p><p className="font-mono">{product.barcode || '-'}</p></div>
                  <div><p className="text-xs text-base-content/60">Emplacement</p><p>{product.location || '-'}</p></div>
                  <div><p className="text-xs text-base-content/60">Poids/Volume</p><p>{product.weight ? `${product.weight} kg` : '-'} / {product.volume ? `${product.volume} m³` : '-'}</p></div>
                </div>
              </div>
            </div>

            {/* Stock total */}
            <div className="card bg-primary/10 shadow-xl mt-6">
              <div className="card-body text-center">
                <Package className="w-8 h-8 mx-auto text-primary mb-2" />
                <p className="text-sm text-base-content/60">Stock total tous entrepôts</p>
                <p className="text-4xl font-bold text-primary">{formatNumber(totalStock)}</p>
                <p className="text-xs text-base-content/50">unités</p>
              </div>
            </div>

            {/* Bouton pour voir les prix */}
            <div className="card bg-base-200 shadow-xl mt-6">
              <div className="card-body">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-success" />
                    <h2 className="text-lg font-semibold">Prix par entrepôt</h2>
                  </div>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/produits/${id}/prix`)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Gérer les prix
                  </button>
                </div>
                
                {pricesByWarehouse.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {pricesByWarehouse.slice(0, 3).map((price) => (
                      <div key={price.id} className="bg-base-100 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Warehouse className="w-4 h-4 text-primary" />
                          <span className="font-semibold">{price.warehouse_name}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                          <div>Achat: {formatPrice(price.purchase_price)}</div>
                          <div>Vente: {formatPrice(price.sale_price)}</div>
                        </div>
                      </div>
                    ))}
                    {pricesByWarehouse.length > 3 && (
                      <p className="text-center text-sm text-base-content/50 mt-2">
                        +{pricesByWarehouse.length - 3} autres entrepôts
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Stock par entrepôt */}
            <div className="card bg-base-200 shadow-xl mt-6">
              <div className="card-body">
                <div className="flex items-center gap-2 mb-4">
                  <Warehouse className="w-5 h-5 text-secondary" />
                  <h2 className="text-lg font-semibold">Stock par entrepôt</h2>
                </div>
                {stocksByWarehouse.length === 0 ? (
                  <div className="text-center py-6">
                    <Package className="w-12 h-12 mx-auto mb-2 text-base-content/30" />
                    <p className="text-base-content/50">Aucun stock</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {stocksByWarehouse.map((stock, idx) => (
                      <div key={idx} className="bg-base-100 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">{stock.warehouse_name}</span>
                          <span className={`badge ${stock.quantity === 0 ? 'badge-error' : stock.quantity <= 5 ? 'badge-warning' : 'badge-success'}`}>
                            {stock.quantity === 0 ? 'Rupture' : stock.quantity <= 5 ? 'Faible' : 'Normal'}
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-center my-2">{formatNumber(stock.quantity)}</p>
                        <p className="text-xs text-center text-base-content/60">unités</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Variantes */}
            {product.has_variants && variants.length > 0 && (
              <div className="card bg-base-200 shadow-xl mt-6">
                <div className="card-body">
                  <h2 className="text-lg font-semibold mb-4">Variantes ({variants.length})</h2>
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr className="bg-base-300">
                          <th>SKU</th>
                          <th>Attributs</th>
                          <th>Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variants.map((v) => (
                          <tr key={v.id}>
                            <td className="font-mono text-sm">{v.sku}</td>
                            <td>
                              {Object.entries(v.attributes).map(([key, val]) => (
                                <span key={key} className="badge badge-sm mr-1">{key}: {val}</span>
                              ))}
                            </td>
                            <td>{v.stock_quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal image */}
      {selectedImage && (
        <div className="modal modal-open" onClick={() => setSelectedImage(null)}>
          <div className="modal-box max-w-4xl p-2" onClick={(e) => e.stopPropagation()}>
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => setSelectedImage(null)}>
              <X className="w-4 h-4" />
            </button>
            <img src={selectedImage} alt="Aperçu" className="w-full h-auto max-h-[80vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductDetails