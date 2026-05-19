// src/components/logistique/ProductPricingManager.jsx

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ArrowLeft,
  Save,
  X,
  DollarSign,
  Warehouse,
  Building2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  Percent,
  Clock,
  User,
  Tag,
  Hash,
  Shield,
  AlertTriangle,
  Info,
  ChevronRight,
  Loader2,
  Search,
  Filter,
  Download,
  Upload,
  Printer
} from 'lucide-react'

const ProductPricingManager = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  // États
  const [product, setProduct] = useState(null)
  const [prices, setPrices] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedWarehouse, setSelectedWarehouse] = useState('all')
  
  // État des notifications
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'success',
    title: ''
  })

  // État du formulaire
  const [formData, setFormData] = useState({
    warehouse_id: '',
    purchase_price: '',
    sale_price: '',
    wholesale_price: '',
    tax_rate: 20,
    currency: 'XOF'
  })

  // État des erreurs du formulaire
  const [formErrors, setFormErrors] = useState({
    warehouse_id: '',
    purchase_price: '',
    sale_price: '',
    wholesale_price: '',
    tax_rate: ''
  })

  // Afficher une notification
  const showMessage = (message, type = 'success', title = '') => {
    const titles = {
      success: 'Succès',
      error: 'Erreur',
      warning: 'Attention',
      info: 'Information'
    }
    setNotification({
      show: true,
      message,
      type,
      title: title || titles[type] || 'Information'
    })
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }))
    }, 5000)
  }

  // Fermer la notification
  const closeNotification = () => {
    setNotification(prev => ({ ...prev, show: false }))
  }

  // Charger les données
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [productRes, pricesRes, warehousesRes] = await Promise.all([
        AxiosInstance.get(`/products/${id}/`),
        AxiosInstance.get(`/products/${id}/prices/`).catch(() => ({ data: [] })),
        AxiosInstance.get('/warehouses/').catch(() => ({ data: [] }))
      ])
      setProduct(productRes.data)
      setPrices(pricesRes.data || [])
      setWarehouses(warehousesRes.data || [])
    } catch (err) {
      console.error('Erreur de chargement:', err)
      if (err.response?.status === 404) {
        showMessage('Produit non trouvé', 'error', 'Erreur 404')
      } else if (err.response?.status === 403) {
        showMessage('Vous n\'avez pas les droits nécessaires', 'error', 'Accès refusé')
      } else if (err.code === 'ERR_NETWORK') {
        showMessage('Impossible de contacter le serveur', 'error', 'Erreur réseau')
      } else {
        showMessage(err.response?.data?.error || 'Erreur lors du chargement des données', 'error')
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  // Rafraîchir les données
  const refreshData = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
    showMessage('Données actualisées avec succès', 'success')
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Validation du formulaire
  const validateForm = () => {
    const errors = {}
    
    if (!formData.warehouse_id) {
      errors.warehouse_id = 'Veuillez sélectionner un entrepôt'
    }
    
    if (!formData.purchase_price || formData.purchase_price === '') {
      errors.purchase_price = 'Le prix d\'achat est requis'
    } else if (parseFloat(formData.purchase_price) < 0) {
      errors.purchase_price = 'Le prix d\'achat ne peut pas être négatif'
    } else if (isNaN(parseFloat(formData.purchase_price))) {
      errors.purchase_price = 'Veuillez saisir un nombre valide'
    }
    
    if (!formData.sale_price || formData.sale_price === '') {
      errors.sale_price = 'Le prix de vente est requis'
    } else if (parseFloat(formData.sale_price) < 0) {
      errors.sale_price = 'Le prix de vente ne peut pas être négatif'
    } else if (isNaN(parseFloat(formData.sale_price))) {
      errors.sale_price = 'Veuillez saisir un nombre valide'
    } else if (formData.purchase_price && parseFloat(formData.sale_price) < parseFloat(formData.purchase_price)) {
      errors.sale_price = 'Le prix de vente ne peut pas être inférieur au prix d\'achat'
    }
    
    if (formData.wholesale_price && formData.wholesale_price !== '') {
      if (parseFloat(formData.wholesale_price) < 0) {
        errors.wholesale_price = 'Le prix de gros ne peut pas être négatif'
      } else if (isNaN(parseFloat(formData.wholesale_price))) {
        errors.wholesale_price = 'Veuillez saisir un nombre valide'
      } else if (formData.purchase_price && parseFloat(formData.wholesale_price) < parseFloat(formData.purchase_price)) {
        errors.wholesale_price = 'Le prix de gros ne peut pas être inférieur au prix d\'achat'
      }
    }
    
    if (formData.tax_rate) {
      const tax = parseInt(formData.tax_rate)
      if (isNaN(tax) || tax < 0 || tax > 100) {
        errors.tax_rate = 'La TVA doit être comprise entre 0 et 100%'
      }
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Réinitialiser le formulaire
  const resetForm = () => {
    setFormData({
      warehouse_id: '',
      purchase_price: '',
      sale_price: '',
      wholesale_price: '',
      tax_rate: 20,
      currency: 'XOF'
    })
    setFormErrors({})
    setEditingId(null)
  }

  // Enregistrer un prix
  const handleSave = async () => {
    if (!validateForm()) {
      showMessage('Veuillez corriger les erreurs dans le formulaire', 'error')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        product_id: id,
        warehouse_id: parseInt(formData.warehouse_id),
        purchase_price: parseFloat(formData.purchase_price),
        sale_price: parseFloat(formData.sale_price),
        wholesale_price: formData.wholesale_price ? parseFloat(formData.wholesale_price) : null,
        tax_rate: parseInt(formData.tax_rate) || 20,
        currency: formData.currency
      }

      await AxiosInstance.post('/product-prices/set_price/', payload)
      
      showMessage(
        editingId ? 'Prix modifié avec succès' : 'Prix enregistré avec succès',
        'success'
      )
      setShowForm(false)
      resetForm()
      fetchData()
    } catch (err) {
      console.error('Erreur:', err)
      if (err.response?.data?.error) {
        showMessage(err.response.data.error, 'error')
      } else if (err.response?.data?.purchase_price) {
        showMessage(`Prix d'achat: ${err.response.data.purchase_price[0]}`, 'error')
      } else if (err.response?.data?.sale_price) {
        showMessage(`Prix de vente: ${err.response.data.sale_price[0]}`, 'error')
      } else {
        showMessage('Erreur lors de l\'enregistrement du prix', 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Modifier un prix
  const handleEdit = (price) => {
    setEditingId(price.id)
    setFormData({
      warehouse_id: price.warehouse,
      purchase_price: price.purchase_price,
      sale_price: price.sale_price,
      wholesale_price: price.wholesale_price || '',
      tax_rate: price.tax_rate || 20,
      currency: price.currency || 'XOF'
    })
    setShowForm(true)
    setFormErrors({})
  }

  // Supprimer un prix
  const handleDelete = async (price) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le prix pour "${price.warehouse_name}" ?`)) {
      return
    }
    
    setSubmitting(true)
    try {
      await AxiosInstance.post('/product-prices/set_price/', {
        product_id: id,
        warehouse_id: price.warehouse,
        purchase_price: 0,
        sale_price: 0,
        tax_rate: 20,
        currency: 'XOF'
      })
      showMessage('Prix supprimé avec succès', 'success')
      fetchData()
    } catch (err) {
      console.error('Erreur:', err)
      showMessage('Erreur lors de la suppression du prix', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Formater les nombres
  const formatNumber = (num) => {
    if (!num && num !== 0) return '0'
    return new Intl.NumberFormat('fr-FR').format(num)
  }

  // Formater les prix
  const formatPrice = (price) => {
    if (!price && price !== 0) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(price) + ' FCFA'
  }

  // Calculer la marge
  const calculateMargin = (purchasePrice, salePrice) => {
    const margin = salePrice - purchasePrice
    const marginPercent = purchasePrice > 0 ? (margin / purchasePrice * 100) : 0
    return { margin, marginPercent }
  }

  // Filtrer les prix
  const filteredPrices = prices.filter(price => {
    const matchesSearch = searchTerm === '' || 
      price.warehouse_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      price.warehouse_code?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesWarehouse = selectedWarehouse === 'all' || 
      price.warehouse === parseInt(selectedWarehouse)
    
    return matchesSearch && matchesWarehouse
  })

  // Obtenir le nom de l'entrepôt
  const getWarehouseName = (warehouseId) => {
    const warehouse = warehouses.find(w => w.id === warehouseId)
    return warehouse ? `${warehouse.name} (${warehouse.agence_nom})` : 'Chargement...'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-gray-600 font-medium">Chargement des données...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-6">
            <Package className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Produit non trouvé</h2>
          <p className="text-gray-600 mb-6">Le produit que vous recherchez n'existe pas ou a été supprimé.</p>
          <button onClick={() => navigate('/produits')} className="btn btn-primary gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour à la liste
          </button>
        </div>
      </div>
    )
  }

  // Statistiques des prix
  const stats = {
    total: prices.length,
    avgPurchase: prices.reduce((sum, p) => sum + p.purchase_price, 0) / (prices.length || 1),
    avgSale: prices.reduce((sum, p) => sum + p.sale_price, 0) / (prices.length || 1),
    avgMargin: prices.reduce((sum, p) => sum + (p.sale_price - p.purchase_price), 0) / (prices.length || 1),
    avgMarginPercent: prices.reduce((sum, p) => {
      return sum + (p.purchase_price > 0 ? ((p.sale_price - p.purchase_price) / p.purchase_price * 100) : 0)
    }, 0) / (prices.length || 1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Notification Toast */}
      {notification.show && (
        <div className={`fixed top-20 right-6 z-50 animate-slideDown max-w-md w-full shadow-2xl rounded-xl overflow-hidden ${
          notification.type === 'error' ? 'bg-red-50 border-l-4 border-red-500' :
          notification.type === 'warning' ? 'bg-yellow-50 border-l-4 border-yellow-500' :
          notification.type === 'info' ? 'bg-blue-50 border-l-4 border-blue-500' :
          'bg-green-50 border-l-4 border-green-500'
        }`}>
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                {notification.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                {notification.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
                {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{notification.title}</p>
                <p className="text-sm text-gray-600 mt-0.5">{notification.message}</p>
              </div>
              <button onClick={closeNotification} className="flex-shrink-0 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(`/produits/${id}`)} 
                className="btn btn-ghost btn-sm btn-circle hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                  Gestion des prix
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Tag className="w-4 h-4" />
                    <span className="font-medium">{product.name}</span>
                  </div>
                  <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Hash className="w-4 h-4" />
                    <span className="font-mono">{product.reference}</span>
                  </div>
                  <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="w-4 h-4" />
                    <span>{product.category?.name || 'Sans catégorie'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={refreshData} 
                disabled={refreshing} 
                className="btn btn-outline btn-sm gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
              <button
                onClick={() => {
                  resetForm()
                  setShowForm(!showForm)
                }}
                className="btn btn-primary btn-sm gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showForm ? 'Annuler' : 'Nouveau prix'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Formulaire d'ajout/modification */}
        {showForm && (
          <div className="card bg-white shadow-xl rounded-xl mb-8 overflow-hidden animate-fadeIn">
            <div className="bg-gradient-to-r from-primary to-primary-dark px-6 py-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                {editingId ? 'Modifier le prix' : 'Définir un prix'}
              </h3>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Entrepôt */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Entrepôt *</span>
                  </label>
                  <select
                    className={`select select-bordered w-full ${formErrors.warehouse_id ? 'select-error' : ''}`}
                    value={formData.warehouse_id}
                    onChange={(e) => {
                      setFormData({ ...formData, warehouse_id: e.target.value })
                      setFormErrors({ ...formErrors, warehouse_id: '' })
                    }}
                    disabled={!!editingId}
                  >
                    <option value="">Sélectionner un entrepôt</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} - {w.agence_nom}
                      </option>
                    ))}
                  </select>
                  {formErrors.warehouse_id && (
                    <label className="label">
                      <span className="label-text-alt text-error">{formErrors.warehouse_id}</span>
                    </label>
                  )}
                </div>

                {/* Devise */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Devise</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  >
                    <option value="XOF">FCFA (XOF)</option>
                    <option value="EUR">Euro (EUR)</option>
                    <option value="USD">Dollar (USD)</option>
                  </select>
                </div>

                {/* Prix d'achat */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Prix d'achat (FCFA) *</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={`input input-bordered w-full ${formErrors.purchase_price ? 'input-error' : ''}`}
                    value={formData.purchase_price}
                    onChange={(e) => {
                      setFormData({ ...formData, purchase_price: e.target.value })
                      setFormErrors({ ...formErrors, purchase_price: '' })
                    }}
                    placeholder="0"
                  />
                  {formErrors.purchase_price && (
                    <label className="label">
                      <span className="label-text-alt text-error">{formErrors.purchase_price}</span>
                    </label>
                  )}
                </div>

                {/* Prix de vente */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Prix de vente (FCFA) *</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={`input input-bordered w-full ${formErrors.sale_price ? 'input-error' : ''}`}
                    value={formData.sale_price}
                    onChange={(e) => {
                      setFormData({ ...formData, sale_price: e.target.value })
                      setFormErrors({ ...formErrors, sale_price: '' })
                    }}
                    placeholder="0"
                  />
                  {formErrors.sale_price && (
                    <label className="label">
                      <span className="label-text-alt text-error">{formErrors.sale_price}</span>
                    </label>
                  )}
                </div>

                {/* Prix de gros */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Prix de gros (FCFA)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={`input input-bordered w-full ${formErrors.wholesale_price ? 'input-error' : ''}`}
                    value={formData.wholesale_price}
                    onChange={(e) => {
                      setFormData({ ...formData, wholesale_price: e.target.value })
                      setFormErrors({ ...formErrors, wholesale_price: '' })
                    }}
                    placeholder="Optionnel"
                  />
                  {formErrors.wholesale_price && (
                    <label className="label">
                      <span className="label-text-alt text-error">{formErrors.wholesale_price}</span>
                    </label>
                  )}
                </div>

                {/* TVA */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">TVA (%)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className={`input input-bordered w-full ${formErrors.tax_rate ? 'input-error' : ''}`}
                    value={formData.tax_rate}
                    onChange={(e) => {
                      setFormData({ ...formData, tax_rate: e.target.value })
                      setFormErrors({ ...formErrors, tax_rate: '' })
                    }}
                  />
                  {formErrors.tax_rate && (
                    <label className="label">
                      <span className="label-text-alt text-error">{formErrors.tax_rate}</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Aperçu des marges */}
              {formData.purchase_price && formData.sale_price && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Aperçu des marges</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span className="text-gray-600">Marge brute:</span>
                      <span className="font-bold text-green-600">
                        {formatNumber(parseFloat(formData.sale_price) - parseFloat(formData.purchase_price))} FCFA
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span className="text-gray-600">Taux de marge:</span>
                      <span className="font-bold text-blue-600">
                        {((parseFloat(formData.sale_price) - parseFloat(formData.purchase_price)) / parseFloat(formData.purchase_price) * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button 
                  className="btn btn-ghost px-6" 
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                >
                  Annuler
                </button>
                <button 
                  className="btn btn-primary px-6 gap-2 shadow-lg" 
                  onClick={handleSave}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editingId ? 'Modifier' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Statistiques */}
        {prices.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="stats shadow bg-white rounded-xl">
              <div className="stat">
                <div className="stat-figure text-primary">
                  <Warehouse className="w-6 h-6" />
                </div>
                <div className="stat-title">Entrepôts</div>
                <div className="stat-value text-primary">{stats.total}</div>
                <div className="stat-desc">sur {warehouses.length} disponibles</div>
              </div>
            </div>

            <div className="stats shadow bg-white rounded-xl">
              <div className="stat">
                <div className="stat-figure text-secondary">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div className="stat-title">Prix moyen (vente)</div>
                <div className="stat-value text-secondary">{formatNumber(Math.round(stats.avgSale))}</div>
                <div className="stat-desc">FCFA</div>
              </div>
            </div>

            <div className="stats shadow bg-white rounded-xl">
              <div className="stat">
                <div className="stat-figure text-green-600">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="stat-title">Marge moyenne</div>
                <div className="stat-value text-green-600">{formatNumber(Math.round(stats.avgMargin))}</div>
                <div className="stat-desc">FCFA</div>
              </div>
            </div>

            <div className="stats shadow bg-white rounded-xl">
              <div className="stat">
                <div className="stat-figure text-blue-600">
                  <Percent className="w-6 h-6" />
                </div>
                <div className="stat-title">Taux de marge</div>
                <div className="stat-value text-blue-600">{stats.avgMarginPercent.toFixed(1)}%</div>
                <div className="stat-desc">moyen</div>
              </div>
            </div>
          </div>
        )}

        {/* Filtres */}
        {prices.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un entrepôt..."
                  className="input input-bordered w-full pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="sm:w-64">
              <select
                className="select select-bordered w-full"
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
              >
                <option value="all">Tous les entrepôts</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Liste des prix */}
        {prices.length === 0 ? (
          <div className="card bg-white shadow-xl rounded-xl">
            <div className="card-body text-center py-16">
              <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <DollarSign className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Aucun prix défini</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Ce produit n'a pas encore de prix configuré pour les entrepôts. 
                Cliquez sur "Nouveau prix" pour commencer.
              </p>
              <button 
                className="btn btn-primary mx-auto gap-2 shadow-lg"
                onClick={() => setShowForm(true)}
              >
                <Plus className="w-4 h-4" />
                Définir un prix
              </button>
            </div>
          </div>
        ) : filteredPrices.length === 0 ? (
          <div className="card bg-white shadow-xl rounded-xl">
            <div className="card-body text-center py-12">
              <p className="text-gray-500">Aucun résultat ne correspond à votre recherche</p>
              <button 
                className="btn btn-ghost btn-sm mt-4"
                onClick={() => {
                  setSearchTerm('')
                  setSelectedWarehouse('all')
                }}
              >
                Réinitialiser les filtres
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredPrices.map((price) => {
              const { margin, marginPercent } = calculateMargin(price.purchase_price, price.sale_price)
              
              return (
                <div key={price.id} className="card bg-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden">
                  <div className="p-6">
                    <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Warehouse className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg text-gray-800">{price.warehouse_name}</h3>
                            <p className="text-sm text-gray-500">{price.warehouse_code}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          className="btn btn-ghost btn-sm btn-square hover:bg-primary/10"
                          onClick={() => handleEdit(price)}
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm btn-square text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(price)}
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">Prix d'achat</p>
                        <p className="font-bold text-gray-800">
                          {formatPrice(price.purchase_price)}
                        </p>
                      </div>
                      
                      <div className="bg-primary/5 rounded-lg p-3 text-center border border-primary/20">
                        <p className="text-xs text-gray-500 mb-1">Prix de vente</p>
                        <p className="font-bold text-primary text-lg">
                          {formatPrice(price.sale_price)}
                        </p>
                      </div>
                      
                      {price.wholesale_price && (
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500 mb-1">Prix de gros</p>
                          <p className="font-bold text-gray-800">
                            {formatPrice(price.wholesale_price)}
                          </p>
                        </div>
                      )}
                      
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">TVA</p>
                        <p className="font-bold text-gray-800">
                          {price.tax_rate}%
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t flex flex-wrap justify-between items-center gap-3">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {margin >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          )}
                          <span className="text-sm text-gray-600">Marge:</span>
                          <span className={`font-semibold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPrice(margin)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Percent className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-gray-600">Taux:</span>
                          <span className="font-semibold text-blue-600">
                            {marginPercent.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>Mis à jour le {new Date(price.updated_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pied de page avec informations */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p className="flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            Les prix sont définis par entrepôt. Chaque agence peut avoir ses propres prix.
          </p>
        </div>
      </div>

      {/* Styles CSS pour les animations */}
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default ProductPricingManager