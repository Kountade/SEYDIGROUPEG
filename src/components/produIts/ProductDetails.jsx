// src/components/ProductDetails.jsx
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
  Tag,
  Building2,
  Layers,
  AlertCircle,
  X,
  RefreshCw,
  Image as ImageIcon,
  Hash
} from 'lucide-react'

const ProductDetails = () => {
  const navigate = useNavigate()
  const { id } = useParams()

  const [product, setProduct] = useState(null)
  const [images, setImages] = useState([])
  const [variants, setVariants] = useState([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })
  const [selectedImage, setSelectedImage] = useState(null)

  const productTypes = { 
    simple: 'Simple', 
    variable: 'Variable', 
    service: 'Service', 
    digital: 'Numérique' 
  }

  const formatNumber = (number) => {
    if (typeof number !== 'number') number = parseFloat(number) || 0
    return new Intl.NumberFormat('fr-FR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(number)
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [prodRes, imgRes, varRes] = await Promise.all([
        AxiosInstance.get(`/products/${id}/`),
        AxiosInstance.get(`/products/${id}/images/`).catch(() => ({ data: [] })),
        AxiosInstance.get(`/products/${id}/variants/`).catch(() => ({ data: [] }))
      ])
      setProduct(prodRes.data)
      setImages(imgRes.data || [])
      setVariants(varRes.data || [])
    } catch (error) {
      console.error(error)
      showNotification('Erreur de chargement du produit', 'error')
    } finally { 
      setLoading(false) 
    }
  }

  useEffect(() => { 
    fetchData() 
  }, [id])

  const calculateMargin = () => {
    if (!product) return { amount: 0, percentage: 0 }
    const purchase = parseFloat(product.purchase_price) || 0
    const sale = parseFloat(product.sale_price) || 0
    const margin = sale - purchase
    const percentage = purchase > 0 ? (margin / purchase) * 100 : 0
    return { amount: margin, percentage }
  }

  const margin = calculateMargin()
  const mainImage = product?.main_image || (images.length > 0 ? images.find(img => img.is_main)?.image : null)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-base font-medium text-base-content/70 animate-pulse">
            Chargement du produit...
          </p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-base-content/30" />
          <p className="text-lg font-medium text-base-content/50">Produit non trouvé</p>
          <button 
            onClick={() => navigate('/produits')}
            className="btn btn-primary btn-sm mt-4"
          >
            Retour à la liste
          </button>
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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/produits')}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl lg:text-2xl font-bold text-base-content truncate">
              {product.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="badge badge-outline gap-1">
                <Hash className="w-3 h-3" />
                {product.reference}
              </span>
              <span className={`badge ${product.product_type === 'simple' ? 'badge-primary' : 'badge-secondary'} badge-sm`}>
                {productTypes[product.product_type] || 'Simple'}
              </span>
              {!product.is_active && (
                <span className="badge badge-error badge-sm gap-1">
                  <XCircle className="w-3 h-3" />
                  Inactif
                </span>
              )}
              {product.is_featured && (
                <span className="badge badge-warning badge-sm gap-1">
                  ★ En avant
                </span>
              )}
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => navigate(`/produits/${id}/modifier`)}
          className="btn btn-primary btn-sm lg:btn-md gap-2"
        >
          <Edit className="w-3 h-3 lg:w-4 lg:h-4" />
          Modifier le produit
        </button>
      </div>

      {/* Contenu principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Colonne gauche - Image et description */}
        <div className="lg:col-span-1 space-y-4 lg:space-y-6">
          {/* Image principale */}
          <div className="bg-base-100 rounded-xl lg:rounded-2xl shadow-sm border border-base-300 overflow-hidden">
            <div className="p-4 lg:p-6">
              {mainImage ? (
                <div className="relative">
                  <img 
                    src={mainImage} 
                    alt={product.name}
                    className="w-full h-64 lg:h-80 object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setSelectedImage(mainImage)}
                  />
                  {images.length > 1 && (
                    <span className="absolute bottom-2 right-2 badge badge-neutral">
                      +{images.length - 1} images
                    </span>
                  )}
                </div>
              ) : (
                <div className="w-full h-64 lg:h-80 bg-base-200 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Package className="w-16 h-16 mx-auto mb-2 text-base-content/30" />
                    <p className="text-base-content/50">Aucune image</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="bg-base-100 rounded-xl lg:rounded-2xl shadow-sm border border-base-300 overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-base-300 bg-base-200/50">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 lg:w-5 lg:h-5 text-info" />
                <h2 className="text-base lg:text-lg font-bold text-base-content">Description</h2>
              </div>
            </div>
            <div className="p-4 lg:p-6">
              {product.description ? (
                <p className="text-sm lg:text-base text-base-content/80 whitespace-pre-wrap">
                  {product.description}
                </p>
              ) : (
                <p className="text-sm text-base-content/50 italic">
                  Aucune description disponible
                </p>
              )}
            </div>
          </div>

          {/* Galerie d'images */}
          {images.length > 0 && (
            <div className="bg-base-100 rounded-xl lg:rounded-2xl shadow-sm border border-base-300 overflow-hidden">
              <div className="p-4 lg:p-6 border-b border-base-300 bg-base-200/50">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 lg:w-5 lg:h-5 text-secondary" />
                  <h2 className="text-base lg:text-lg font-bold text-base-content">
                    Galerie ({images.length})
                  </h2>
                </div>
              </div>
              <div className="p-4 lg:p-6">
                <div className="grid grid-cols-3 gap-2">
                  {images.slice(0, 6).map((img) => (
                    <img
                      key={img.id}
                      src={img.image}
                      alt={img.alt_text || product.name}
                      className="w-full h-20 lg:h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedImage(img.image)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Colonne droite - Détails */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
          {/* Informations générales */}
          <div className="bg-base-100 rounded-xl lg:rounded-2xl shadow-sm border border-base-300 overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-base-300 bg-base-200/50">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
                <h2 className="text-base lg:text-lg font-bold text-base-content">
                  Informations générales
                </h2>
              </div>
            </div>
            <div className="p-4 lg:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-base-content/60 flex items-center gap-1 mb-1">
                    <Folder className="w-3 h-3" />
                    Catégorie
                  </label>
                  <p className="font-medium text-sm lg:text-base">
                    {product.category_name || product.category_details?.name || '-'}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs text-base-content/60 flex items-center gap-1 mb-1">
                    <Building2 className="w-3 h-3" />
                    Marque
                  </label>
                  <p className="font-medium text-sm lg:text-base">
                    {product.brand_name || product.brand_details?.name || '-'}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs text-base-content/60 flex items-center gap-1 mb-1">
                    <Box className="w-3 h-3" />
                    Unité
                  </label>
                  <p className="font-medium text-sm lg:text-base">
                    {product.unit_name} ({product.unit_abbrev || product.unit_details?.abbreviation})
                  </p>
                </div>
                
                <div>
                  <label className="text-xs text-base-content/60 flex items-center gap-1 mb-1">
                    <Barcode className="w-3 h-3" />
                    Code-barres
                  </label>
                  <p className="font-medium text-sm lg:text-base font-mono">
                    {product.barcode || '-'}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs text-base-content/60 flex items-center gap-1 mb-1">
                    <MapPin className="w-3 h-3" />
                    Emplacement
                  </label>
                  <p className="font-medium text-sm lg:text-base">
                    {product.location || '-'}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs text-base-content/60 flex items-center gap-1 mb-1">
                    <Weight className="w-3 h-3" />
                    Poids / Volume
                  </label>
                  <p className="font-medium text-sm lg:text-base">
                    {product.weight ? `${product.weight} kg` : '-'} / {product.volume ? `${product.volume} m³` : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Prix et Stock */}
          <div className="bg-base-100 rounded-xl lg:rounded-2xl shadow-sm border border-base-300 overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-base-300 bg-base-200/50">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 lg:w-5 lg:h-5 text-success" />
                <h2 className="text-base lg:text-lg font-bold text-base-content">
                  Prix et Stock
                </h2>
              </div>
            </div>
            <div className="p-4 lg:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                {/* Prix */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-base-content/60">Prix d'achat (HT)</label>
                    <p className="text-lg font-medium">{formatNumber(product.purchase_price)} €</p>
                  </div>
                  
                  <div>
                    <label className="text-xs text-base-content/60">Prix de vente (HT)</label>
                    <p className="text-2xl lg:text-3xl font-bold text-primary">
                      {formatNumber(product.sale_price)} €
                    </p>
                  </div>
                  
                  {product.wholesale_price && (
                    <div>
                      <label className="text-xs text-base-content/60">Prix de gros</label>
                      <p className="text-base">{formatNumber(product.wholesale_price)} €</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-xs text-base-content/60">TVA</label>
                    <p className="text-base">{product.tax_rate}%</p>
                  </div>
                </div>

                {/* Marge et Stock */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-base-content/60">Marge</label>
                    <p className="text-lg font-semibold text-success">
                      {formatNumber(margin.amount)} €
                    </p>
                    <span className="badge badge-success badge-sm">
                      {margin.percentage.toFixed(2)}%
                    </span>
                  </div>
                  
                  <div className="divider my-2"></div>
                  
                  <div>
                    <label className="text-xs text-base-content/60">Stock actuel</label>
                    <div className="flex items-center gap-2">
                      <p className={`text-2xl lg:text-3xl font-bold ${product.is_low_stock ? 'text-warning' : 'text-base-content'}`}>
                        {product.stock_quantity || 0}
                      </p>
                      <span className="text-sm text-base-content/60">
                        {product.unit_abbrev || ''}
                      </span>
                    </div>
                  </div>
                  
                  {product.is_low_stock && (
                    <div className="alert alert-warning py-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm">Stock faible (min: {product.minimum_stock})</span>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-xs text-base-content/60">Stock min / max</label>
                    <p className="text-sm">
                      {product.minimum_stock || 0} / {product.maximum_stock || '∞'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Variantes */}
          {product.has_variants && (
            <div className="bg-base-100 rounded-xl lg:rounded-2xl shadow-sm border border-base-300 overflow-hidden">
              <div className="p-4 lg:p-6 border-b border-base-300 bg-base-200/50">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 lg:w-5 lg:h-5 text-accent" />
                  <h2 className="text-base lg:text-lg font-bold text-base-content">
                    Variantes ({variants.length})
                  </h2>
                </div>
              </div>
              <div className="p-4 lg:p-6">
                {variants.length === 0 ? (
                  <p className="text-sm text-base-content/50 text-center py-4">
                    Aucune variante définie
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-zebra table-sm lg:table-md">
                      <thead>
                        <tr className="bg-base-200">
                          <th>SKU</th>
                          <th>Attributs</th>
                          <th className="text-right">Prix achat</th>
                          <th className="text-right">Prix vente</th>
                          <th className="text-center">Stock</th>
                          <th className="text-center">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variants.map((v) => (
                          <tr key={v.id}>
                            <td className="font-mono text-sm">{v.sku}</td>
                            <td>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(v.attributes).map(([key, val]) => (
                                  <span key={key} className="badge badge-sm">
                                    {key}: {val}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="text-right text-sm">{formatNumber(v.purchase_price)} €</td>
                            <td className="text-right text-sm font-semibold text-primary">
                              {formatNumber(v.sale_price)} €
                            </td>
                            <td className="text-center text-sm">{v.stock_quantity}</td>
                            <td className="text-center">
                              {v.is_active ? (
                                <CheckCircle className="w-4 h-4 text-success inline" />
                              ) : (
                                <XCircle className="w-4 h-4 text-error inline" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal pour afficher l'image en grand */}
      {selectedImage && (
        <div className="modal modal-open" onClick={() => setSelectedImage(null)}>
          <div className="modal-box max-w-4xl p-2" onClick={(e) => e.stopPropagation()}>
            <button 
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 z-10"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-4 h-4" />
            </button>
            <img 
              src={selectedImage} 
              alt="Aperçu" 
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Barre d'actions flottante pour mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 p-3 shadow-lg z-40">
        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/produits')}
            className="btn btn-outline btn-sm flex-1"
          >
            <ArrowLeft className="w-3 h-3" />
            Retour
          </button>
          <button 
            onClick={() => navigate(`/produits/${id}/modifier`)}
            className="btn btn-primary btn-sm flex-1"
          >
            <Edit className="w-3 h-3" />
            Modifier
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductDetails