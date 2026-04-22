// src/components/ProductForm.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Save,
  X,
  Upload,
  Package,
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
  Trash2,
  ArrowLeft,
  Info,
  Loader2,
  DollarSign,
  Boxes,
  Tag,
  Barcode,
  Hash,
  Layers,
  Ruler,
  Weight,
  Plus,
  Edit,
  ChevronDown,
  Folder,
  Building2,
  ToggleLeft,
  ToggleRight
} from 'lucide-react'

const ProductForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = !!id

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('general') // 'general', 'pricing', 'variants'
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })
  const [dragActive, setDragActive] = useState(false)

  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [units, setUnits] = useState([])

  const [formData, setFormData] = useState({
    reference: '', barcode: '', name: '', description: '', product_type: 'simple',
    category: '', brand: '', unit: '', purchase_price: '', sale_price: '', wholesale_price: '',
    tax_rate: 20, stock_quantity: 0, minimum_stock: 5, maximum_stock: '', location: '',
    is_active: true, is_featured: false, has_variants: false, weight: '', volume: ''
  })

  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [errors, setErrors] = useState({})

  const [variants, setVariants] = useState([])
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [editingVariant, setEditingVariant] = useState(null)
  const [variantForm, setVariantForm] = useState({ 
    sku: '', attributes: {}, purchase_price: '', sale_price: '', 
    stock_quantity: 0, image: null, is_active: true 
  })
  const [attributeKey, setAttributeKey] = useState('')
  const [attributeValue, setAttributeValue] = useState('')
  const [variantImagePreview, setVariantImagePreview] = useState(null)

  const productTypes = { 
    simple: 'Simple', 
    variable: 'Variable', 
    service: 'Service', 
    digital: 'Numérique' 
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000)
  }

  const formatNumber = (number) => {
    if (!number && number !== 0) return '0,00'
    return new Intl.NumberFormat('fr-FR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(number)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [catRes, brandRes, unitRes] = await Promise.all([
        AxiosInstance.get('/categories/'),
        AxiosInstance.get('/brands/'),
        AxiosInstance.get('/units/')
      ])
      setCategories(catRes.data)
      setBrands(brandRes.data)
      setUnits(unitRes.data)

      if (isEditMode) {
        const prodRes = await AxiosInstance.get(`/products/${id}/`)
        const p = prodRes.data
        setFormData({
          reference: p.reference || '', barcode: p.barcode || '', name: p.name || '', 
          description: p.description || '', product_type: p.product_type || 'simple',
          category: p.category || '', brand: p.brand || '', unit: p.unit || '',
          purchase_price: p.purchase_price || '', sale_price: p.sale_price || '', 
          wholesale_price: p.wholesale_price || '', tax_rate: p.tax_rate || 20,
          stock_quantity: p.stock_quantity || 0, minimum_stock: p.minimum_stock || 5,
          maximum_stock: p.maximum_stock || '', location: p.location || '',
          is_active: p.is_active !== undefined ? p.is_active : true, 
          is_featured: p.is_featured || false, has_variants: p.has_variants || false,
          weight: p.weight || '', volume: p.volume || ''
        })
        if (p.main_image) {
          setImagePreview(p.main_image)
        }
        const varRes = await AxiosInstance.get(`/products/${id}/variants/`).catch(() => ({ data: [] }))
        setVariants(varRes.data || [])
      }
    } catch (error) {
      console.error(error)
      showNotification('Erreur de chargement', 'error')
    } finally { 
      setLoading(false) 
    }
  }

  useEffect(() => { 
    fetchData() 
  }, [id])

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.reference || formData.reference.trim() === '') {
      newErrors.reference = 'La référence est obligatoire'
    }
    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'Le nom du produit est obligatoire'
    }
    if (!formData.category) {
      newErrors.category = 'La catégorie est obligatoire'
    }
    if (!formData.unit) {
      newErrors.unit = 'L\'unité est obligatoire'
    }
    if (formData.has_variants && variants.length === 0) {
      newErrors.variants = 'Au moins une variante est requise'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleMainImageFile(file)
    }
  }

  const handleMainImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleMainImageFile(file)
    }
  }

  const handleMainImageFile = (file) => {
    if (!file.type.match('image.*')) {
      showNotification('Veuillez sélectionner une image (JPG, PNG, GIF, WebP)', 'error')
      return
    }
    
    if (file.size > 5 * 1024 * 1024) {
      showNotification('L\'image ne doit pas dépasser 5MB', 'error')
      return
    }
    
    setSelectedImage(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
  }

  const handleVariantImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.match('image.*')) {
        showNotification('Image invalide', 'error')
        return
      }
      setVariantForm({ ...variantForm, image: file })
      const reader = new FileReader()
      reader.onloadend = () => setVariantImagePreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleAddVariant = () => {
    if (!variantForm.sku || !variantForm.purchase_price || !variantForm.sale_price) {
      showNotification('SKU, prix achat et prix vente requis', 'error')
      return
    }
    
    if (editingVariant) {
      setVariants(prev => prev.map(v => 
        v.id === editingVariant.id ? { ...variantForm, id: editingVariant.id } : v
      ))
    } else {
      setVariants(prev => [...prev, { ...variantForm, id: Date.now() }])
    }
    
    setShowVariantModal(false)
    setEditingVariant(null)
    setVariantForm({ 
      sku: '', attributes: {}, purchase_price: '', sale_price: '', 
      stock_quantity: 0, image: null, is_active: true 
    })
    setVariantImagePreview(null)
    setAttributeKey('')
    setAttributeValue('')
  }

  const handleDeleteVariant = (variantId) => {
    setVariants(prev => prev.filter(v => v.id !== variantId))
  }

  const addAttribute = () => {
    if (attributeKey && attributeValue) {
      setVariantForm(prev => ({
        ...prev,
        attributes: { ...prev.attributes, [attributeKey]: attributeValue }
      }))
      setAttributeKey('')
      setAttributeValue('')
    }
  }

  const removeAttribute = (key) => {
    setVariantForm(prev => {
      const newAttr = { ...prev.attributes }
      delete newAttr[key]
      return { ...prev, attributes: newAttr }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      showNotification('Veuillez corriger les erreurs du formulaire', 'error')
      return
    }
    
    setSubmitting(true)
    try {
      const productPayload = new FormData()
      
      Object.keys(formData).forEach(key => {
        const value = formData[key]
        if (value !== null && value !== undefined && value !== '') {
          productPayload.append(key, value)
        }
      })
      
      if (selectedImage) {
        productPayload.append('main_image', selectedImage)
      }
      
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }

      let productResponse
      if (isEditMode) {
        productResponse = await AxiosInstance.put(`/products/${id}/`, productPayload, config)
      } else {
        productResponse = await AxiosInstance.post('/products/', productPayload, config)
      }
      const productId = productResponse.data.id

      if (formData.has_variants) {
        if (isEditMode) {
          const currentVariantIds = variants.map(v => v.id).filter(id => !String(id).includes('temp'))
          const existing = (await AxiosInstance.get(`/products/${productId}/variants/`)).data
          for (const v of existing) {
            if (!currentVariantIds.includes(v.id)) {
              await AxiosInstance.delete(`/variants/${v.id}/`)
            }
          }
        }
        
        for (const v of variants) {
          const variantPayload = {
            product: productId,
            sku: v.sku,
            attributes: v.attributes,
            purchase_price: v.purchase_price,
            sale_price: v.sale_price,
            stock_quantity: v.stock_quantity,
            is_active: v.is_active
          }
          
          const variantConfig = {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
          
          if (v.image instanceof File) {
            const varFormData = new FormData()
            Object.keys(variantPayload).forEach(k => {
              const val = variantPayload[k]
              if (val !== null && val !== undefined) {
                if (typeof val === 'object') {
                  varFormData.append(k, JSON.stringify(val))
                } else {
                  varFormData.append(k, val)
                }
              }
            })
            varFormData.append('image', v.image)
            
            if (v.id && !String(v.id).includes('temp')) {
              await AxiosInstance.put(`/variants/${v.id}/`, varFormData, variantConfig)
            } else {
              await AxiosInstance.post('/variants/', varFormData, variantConfig)
            }
          } else {
            if (v.id && !String(v.id).includes('temp')) {
              await AxiosInstance.put(`/variants/${v.id}/`, variantPayload)
            } else {
              await AxiosInstance.post('/variants/', variantPayload)
            }
          }
        }
      }

      showNotification(isEditMode ? 'Produit modifié avec succès' : 'Produit créé avec succès', 'success')
      setTimeout(() => navigate('/produits'), 1500)
      
    } catch (error) {
      console.error('Erreur:', error)
      let errorMsg = "Erreur lors de l'enregistrement"
      if (error.response?.data) {
        if (typeof error.response.data === 'object') {
          errorMsg = Object.entries(error.response.data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ')
        } else {
          errorMsg = error.response.data
        }
      }
      showNotification(errorMsg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-base font-medium text-base-content/70 animate-pulse">
            Chargement...
          </p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'general', label: 'Informations générales', icon: Package },
    { id: 'pricing', label: 'Prix & Stock', icon: DollarSign },
    ...(formData.has_variants ? [{ id: 'variants', label: 'Variantes', icon: Layers }] : [])
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6 p-3 lg:p-6">
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
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/produits')}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5" />
          </button>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-base-content">
              {isEditMode ? 'Modifier le produit' : 'Nouveau produit'}
            </h1>
            <p className="text-xs lg:text-sm text-base-content/60">
              {isEditMode ? 'Modifiez les informations du produit' : 'Ajoutez un nouveau produit au catalogue'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/produits')}
            className="btn btn-outline btn-sm lg:btn-md gap-1 lg:gap-2"
          >
            <X className="w-3 h-3 lg:w-4 lg:h-4" />
            <span className="hidden sm:inline">Annuler</span>
          </button>
          <button 
            onClick={handleSubmit}
            disabled={submitting}
            className="btn btn-primary btn-sm lg:btn-md gap-1 lg:gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3 h-3 lg:w-4 lg:h-4 animate-spin" />
                <span className="hidden sm:inline">Enregistrement...</span>
                <span className="sm:hidden">En cours...</span>
              </>
            ) : (
              <>
                <Save className="w-3 h-3 lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">{isEditMode ? 'Mettre à jour' : 'Créer'}</span>
                <span className="sm:hidden">Enregistrer</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-100 p-1 rounded-xl shadow-sm border border-base-300">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              className={`tab gap-2 text-sm lg:text-base ${activeTab === tab.id ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Tab: Informations générales */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="lg:col-span-2 space-y-4 lg:space-y-6">
              <div className="bg-base-100 rounded-xl lg:rounded-2xl shadow-sm border border-base-300 overflow-hidden">
                <div className="p-4 lg:p-6 border-b border-base-300 bg-base-200/50">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="p-1.5 lg:p-2 bg-primary/10 rounded-lg">
                      <Hash className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
                    </div>
                    <h2 className="text-base lg:text-lg font-bold text-base-content">
                      Identification
                    </h2>
                  </div>
                </div>
                
                <div className="p-4 lg:p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label pb-1">
                        <span className="label-text font-medium text-sm">
                          Référence <span className="text-error">*</span>
                        </span>
                      </label>
                      <input
                        type="text"
                        name="reference"
                        value={formData.reference}
                        onChange={handleInputChange}
                        placeholder="Ex: PROD-001"
                        className={`input input-bordered input-sm lg:input-md w-full ${errors.reference ? 'input-error' : ''}`}
                      />
                      {errors.reference && (
                        <label className="label pt-1">
                          <span className="label-text-alt text-error flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.reference}
                          </span>
                        </label>
                      )}
                    </div>

                    <div className="form-control w-full">
                      <label className="label pb-1">
                        <span className="label-text font-medium text-sm flex items-center gap-1">
                          <Barcode className="w-3 h-3" />
                          Code-barres
                        </span>
                      </label>
                      <input
                        type="text"
                        name="barcode"
                        value={formData.barcode}
                        onChange={handleInputChange}
                        placeholder="Ex: 1234567890123"
                        className="input input-bordered input-sm lg:input-md w-full"
                      />
                    </div>
                  </div>

                  <div className="form-control w-full">
                    <label className="label pb-1">
                      <span className="label-text font-medium text-sm">
                        Nom du produit <span className="text-error">*</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Nom complet du produit"
                      className={`input input-bordered input-sm lg:input-md w-full ${errors.name ? 'input-error' : ''}`}
                    />
                    {errors.name && (
                      <label className="label pt-1">
                        <span className="label-text-alt text-error flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.name}
                        </span>
                      </label>
                    )}
                  </div>

                  <div className="form-control w-full">
                    <label className="label pb-1">
                      <span className="label-text font-medium text-sm">Description</span>
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Description détaillée du produit..."
                      className="textarea textarea-bordered text-sm lg:text-base w-full h-24 lg:h-28"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label pb-1">
                        <span className="label-text font-medium text-sm">Type de produit</span>
                      </label>
                      <div className="relative">
                        <select
                          name="product_type"
                          value={formData.product_type}
                          onChange={handleInputChange}
                          className="select select-bordered select-sm lg:select-md w-full appearance-none"
                        >
                          {Object.entries(productTypes).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40 pointer-events-none" />
                      </div>
                    </div>

                    <div className="form-control w-full">
                      <label className="label pb-1">
                        <span className="label-text font-medium text-sm">
                          Catégorie <span className="text-error">*</span>
                        </span>
                      </label>
                      <div className="relative">
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          className={`select select-bordered select-sm lg:select-md w-full appearance-none ${errors.category ? 'select-error' : ''}`}
                        >
                          <option value="">Sélectionner une catégorie</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40 pointer-events-none" />
                      </div>
                      {errors.category && (
                        <label className="label pt-1">
                          <span className="label-text-alt text-error flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.category}
                          </span>
                        </label>
                      )}
                    </div>

                    <div className="form-control w-full">
                      <label className="label pb-1">
                        <span className="label-text font-medium text-sm flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          Marque
                        </span>
                      </label>
                      <div className="relative">
                        <select
                          name="brand"
                          value={formData.brand}
                          onChange={handleInputChange}
                          className="select select-bordered select-sm lg:select-md w-full appearance-none"
                        >
                          <option value="">Aucune</option>
                          {brands.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40 pointer-events-none" />
                      </div>
                    </div>

                    <div className="form-control w-full">
                      <label className="label pb-1">
                        <span className="label-text font-medium text-sm">
                          Unité <span className="text-error">*</span>
                        </span>
                      </label>
                      <div className="relative">
                        <select
                          name="unit"
                          value={formData.unit}
                          onChange={handleInputChange}
                          className={`select select-bordered select-sm lg:select-md w-full appearance-none ${errors.unit ? 'select-error' : ''}`}
                        >
                          <option value="">Sélectionner une unité</option>
                          {units.map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40 pointer-events-none" />
                      </div>
                      {errors.unit && (
                        <label className="label pt-1">
                          <span className="label-text-alt text-error flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.unit}
                          </span>
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-3">
                      <input
                        type="checkbox"
                        name="has_variants"
                        checked={formData.has_variants}
                        onChange={handleInputChange}
                        className="toggle toggle-primary toggle-sm lg:toggle-md"
                      />
                      <span className="label-text font-medium text-sm">Ce produit a des variantes</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1 space-y-4 lg:space-y-6">
              <div className="bg-base-100 rounded-xl lg:rounded-2xl shadow-sm border border-base-300 overflow-hidden">
                <div className="p-4 lg:p-6 border-b border-base-300 bg-base-200/50">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="p-1.5 lg:p-2 bg-secondary/10 rounded-lg">
                      <ImageIcon className="w-4 h-4 lg:w-5 lg:h-5 text-secondary" />
                    </div>
                    <h2 className="text-base lg:text-lg font-bold text-base-content">
                      Image principale
                    </h2>
                  </div>
                </div>
                
                <div className="p-4 lg:p-6">
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`
                      relative border-2 border-dashed rounded-xl p-4 lg:p-6 text-center transition-all duration-200
                      ${dragActive 
                        ? 'border-primary bg-primary/5' 
                        : 'border-base-300 hover:border-primary/50 bg-base-200/30'
                      }
                    `}
                  >
                    {imagePreview ? (
                      <div className="space-y-3">
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Aperçu"
                            className="w-full h-36 lg:h-40 object-contain rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute -top-2 -right-2 btn btn-error btn-circle btn-xs"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xs text-base-content/60">
                          Cliquez ou déposez pour changer
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="mx-auto w-14 h-14 lg:w-16 lg:h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                          <Package className="w-7 h-7 lg:w-8 lg:h-8 text-primary" />
                        </div>
                        <p className="text-sm lg:text-base font-medium mb-1">
                          Ajouter une image
                        </p>
                        <p className="text-xs text-base-content/60 mb-3">
                          Glissez-déposez ou cliquez
                        </p>
                        <button
                          type="button"
                          onClick={() => document.getElementById('main-image-input').click()}
                          className="btn btn-outline btn-xs lg:btn-sm gap-1"
                        >
                          <Upload className="w-3 h-3" />
                          Parcourir
                        </button>
                      </>
                    )}
                    
                    <input
                      id="main-image-input"
                      type="file"
                      accept="image/*"
                      onChange={handleMainImageSelect}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-base-100 rounded-xl lg:rounded-2xl shadow-sm border border-base-300 overflow-hidden">
                <div className="p-4 lg:p-6">
                  <h3 className="font-semibold text-sm lg:text-base mb-3">Options</h3>
                  <div className="space-y-3">
                    <label className="label cursor-pointer justify-start gap-3 p-0">
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleInputChange}
                        className="toggle toggle-success toggle-sm"
                      />
                      <span className="label-text text-sm">Produit actif</span>
                    </label>
                    <label className="label cursor-pointer justify-start gap-3 p-0">
                      <input
                        type="checkbox"
                        name="is_featured"
                        checked={formData.is_featured}
                        onChange={handleInputChange}
                        className="toggle toggle-warning toggle-sm"
                      />
                      <span className="label-text text-sm">Mettre en avant</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Prix & Stock */}
        {activeTab === 'pricing' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <div className="bg-base-100 rounded-xl lg:rounded-2xl shadow-sm border border-base-300 overflow-hidden">
              <div className="p-4 lg:p-6 border-b border-base-300 bg-base-200/50">
                <div className="flex items-center gap-2 lg:gap-3">
                  <div className="p-1.5 lg:p-2 bg-success/10 rounded-lg">
                    <DollarSign className="w-4 h-4 lg:w-5 lg:h-5 text-success" />
                  </div>
                  <h2 className="text-base lg:text-lg font-bold text-base-content">
                    Prix et taxes
                  </h2>
                </div>
              </div>
              
              <div className="p-4 lg:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-control w-full">
                    <label className="label pb-1">
                      <span className="label-text font-medium text-sm">Prix d'achat (HT)</span>
                    </label>
                    <label className="input input-bordered input-sm lg:input-md flex items-center gap-2">
                      <span className="text-base-content/60">€</span>
                      <input
                        type="number"
                        name="purchase_price"
                        value={formData.purchase_price}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        step="0.01"
                        className="grow"
                      />
                    </label>
                  </div>

                  <div className="form-control w-full">
                    <label className="label pb-1">
                      <span className="label-text font-medium text-sm">Prix de vente (HT)</span>
                    </label>
                    <label className="input input-bordered input-sm lg:input-md flex items-center gap-2">
                      <span className="text-base-content/60">€</span>
                      <input
                        type="number"
                        name="sale_price"
                        value={formData.sale_price}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        step="0.01"
                        className="grow"
                      />
                    </label>
                  </div>

                  <div className="form-control w-full">
                    <label className="label pb-1">
                      <span className="label-text font-medium text-sm">Prix de gros (HT)</span>
                    </label>
                    <label className="input input-bordered input-sm lg:input-md flex items-center gap-2">
                      <span className="text-base-content/60">€</span>
                      <input
                        type="number"
                        name="wholesale_price"
                        value={formData.wholesale_price}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        step="0.01"
                        className="grow"
                      />
                    </label>
                  </div>

                  <div className="form-control w-full">
                    <label className="label pb-1">
                      <span className="label-text font-medium text-sm">TVA (%)</span>
                    </label>
                    <label className="input input-bordered input-sm lg:input-md flex items-center gap-2">
                      <input
                        type="number"
                        name="tax_rate"
                        value={formData.tax_rate}
                        onChange={handleInputChange}
                        placeholder="20"
                        step="0.1"
                        className="grow"
                      />
                      <span className="text-base-content/60">%</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 lg:space-y-6">
              <div className="bg-base-100 rounded-xl lg:rounded-2xl shadow-sm border border-base-300 overflow-hidden">
                <div className="p-4 lg:p-6 border-b border-base-300 bg-base-200/50">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="p-1.5 lg:p-2 bg-warning/10 rounded-lg">
                      <Boxes className="w-4 h-4 lg:w-5 lg:h-5 text-warning" />
                    </div>
                    <h2 className="text-base lg:text-lg font-bold text-base-content">
                      Stock
                    </h2>
                  </div>
                </div>
                
                <div className="p-4 lg:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label pb-1">
                        <span className="label-text font-medium text-sm">Quantité en stock</span>
                      </label>
                      <input
                        type="number"
                        name="stock_quantity"
                        value={formData.stock_quantity}
                        onChange={handleInputChange}
                        className="input input-bordered input-sm lg:input-md w-full"
                      />
                    </div>

                    <div className="form-control w-full">
                      <label className="label pb-1">
                        <span className="label-text font-medium text-sm">Stock minimum</span>
                      </label>
                      <input
                        type="number"
                        name="minimum_stock"
                        value={formData.minimum_stock}
                        onChange={handleInputChange}
                        className="input input-bordered input-sm lg:input-md w-full"
                      />
                    </div>

                    <div className="form-control w-full">
                      <label className="label pb-1">
                        <span className="label-text font-medium text-sm">Stock maximum</span>
                      </label>
                      <input
                        type="number"
                        name="maximum_stock"
                        value={formData.maximum_stock}
                        onChange={handleInputChange}
                        className="input input-bordered input-sm lg:input-md w-full"
                      />
                    </div>

                    <div className="form-control w-full">
                      <label className="label pb-1">
                        <span className="label-text font-medium text-sm">Emplacement</span>
                      </label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        placeholder="ex: A12"
                        className="input input-bordered input-sm lg:input-md w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-base-100 rounded-xl lg:rounded-2xl shadow-sm border border-base-300 overflow-hidden">
                <div className="p-4 lg:p-6 border-b border-base-300 bg-base-200/50">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="p-1.5 lg:p-2 bg-info/10 rounded-lg">
                      <Ruler className="w-4 h-4 lg:w-5 lg:h-5 text-info" />
                    </div>
                    <h2 className="text-base lg:text-lg font-bold text-base-content">
                      Dimensions
                    </h2>
                  </div>
                </div>
                
                <div className="p-4 lg:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label pb-1">
                        <span className="label-text font-medium text-sm flex items-center gap-1">
                          <Weight className="w-3 h-3" />
                          Poids (kg)
                        </span>
                      </label>
                      <input
                        type="number"
                        name="weight"
                        value={formData.weight}
                        onChange={handleInputChange}
                        step="0.001"
                        className="input input-bordered input-sm lg:input-md w-full"
                      />
                    </div>

                    <div className="form-control w-full">
                      <label className="label pb-1">
                        <span className="label-text font-medium text-sm">Volume (m³)</span>
                      </label>
                      <input
                        type="number"
                        name="volume"
                        value={formData.volume}
                        onChange={handleInputChange}
                        step="0.001"
                        className="input input-bordered input-sm lg:input-md w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Variantes */}
        {activeTab === 'variants' && formData.has_variants && (
          <div className="bg-base-100 rounded-xl lg:rounded-2xl shadow-sm border border-base-300 overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-base-300 bg-base-200/50 flex items-center justify-between">
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="p-1.5 lg:p-2 bg-accent/10 rounded-lg">
                  <Layers className="w-4 h-4 lg:w-5 lg:h-5 text-accent" />
                </div>
                <h2 className="text-base lg:text-lg font-bold text-base-content">
                  Variantes du produit
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowVariantModal(true)}
                className="btn btn-primary btn-sm gap-1"
              >
                <Plus className="w-3 h-3" />
                Ajouter
              </button>
            </div>
            
            <div className="p-4 lg:p-6">
              {errors.variants && (
                <div className="alert alert-error mb-4">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.variants}</span>
                </div>
              )}
              
              {variants.length === 0 ? (
                <div className="text-center py-8">
                  <Layers className="w-12 h-12 mx-auto mb-3 text-base-content/30" />
                  <p className="text-base-content/50">Aucune variante définie</p>
                  <button
                    type="button"
                    onClick={() => setShowVariantModal(true)}
                    className="btn btn-outline btn-sm mt-3"
                  >
                    <Plus className="w-3 h-3" />
                    Ajouter une variante
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-zebra">
                    <thead>
                      <tr className="bg-base-200">
                        <th>SKU</th>
                        <th>Attributs</th>
                        <th className="text-right">Prix achat</th>
                        <th className="text-right">Prix vente</th>
                        <th className="text-center">Stock</th>
                        <th className="text-center">Statut</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v) => (
                        <tr key={v.id}>
                          <td className="font-medium text-sm">{v.sku}</td>
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
                              <span className="badge badge-success badge-sm">Actif</span>
                            ) : (
                              <span className="badge badge-ghost badge-sm">Inactif</span>
                            )}
                          </td>
                          <td>
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                onClick={() => {
                                  setEditingVariant(v)
                                  setVariantForm(v)
                                  setShowVariantModal(true)
                                }}
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs text-error"
                                onClick={() => handleDeleteVariant(v.id)}
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
              )}
            </div>
          </div>
        )}
      </form>

      {/* Modal Variante */}
      {showVariantModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">
                {editingVariant ? 'Modifier la variante' : 'Nouvelle variante'}
              </h3>
              <button 
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => {
                  setShowVariantModal(false)
                  setEditingVariant(null)
                  setVariantForm({ 
                    sku: '', attributes: {}, purchase_price: '', sale_price: '', 
                    stock_quantity: 0, image: null, is_active: true 
                  })
                  setVariantImagePreview(null)
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text text-sm">SKU *</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered input-sm w-full"
                    value={variantForm.sku}
                    onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                  />
                </div>
                
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text text-sm">Image</span>
                  </label>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => document.getElementById('variant-image-input').click()}
                  >
                    <Upload className="w-3 h-3" />
                    {variantForm.image ? 'Image sélectionnée' : 'Choisir'}
                  </button>
                  <input
                    id="variant-image-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleVariantImageSelect}
                  />
                </div>
              </div>
              
              <div>
                <label className="label py-1">
                  <span className="label-text text-sm font-medium">Attributs</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Clé (ex: Couleur)"
                    className="input input-bordered input-sm flex-1"
                    value={attributeKey}
                    onChange={(e) => setAttributeKey(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Valeur (ex: Rouge)"
                    className="input input-bordered input-sm flex-1"
                    value={attributeValue}
                    onChange={(e) => setAttributeValue(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={addAttribute}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(variantForm.attributes).map(([key, val]) => (
                    <span key={key} className="badge badge-lg gap-1">
                      {key}: {val}
                      <button
                        type="button"
                        onClick={() => removeAttribute(key)}
                        className="ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text text-sm">Prix d'achat *</span>
                  </label>
                  <label className="input input-bordered input-sm flex items-center gap-1">
                    <span className="text-base-content/60">€</span>
                    <input
                      type="number"
                      step="0.01"
                      className="grow"
                      value={variantForm.purchase_price}
                      onChange={(e) => setVariantForm({ ...variantForm, purchase_price: e.target.value })}
                    />
                  </label>
                </div>
                
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text text-sm">Prix de vente *</span>
                  </label>
                  <label className="input input-bordered input-sm flex items-center gap-1">
                    <span className="text-base-content/60">€</span>
                    <input
                      type="number"
                      step="0.01"
                      className="grow"
                      value={variantForm.sale_price}
                      onChange={(e) => setVariantForm({ ...variantForm, sale_price: e.target.value })}
                    />
                  </label>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text text-sm">Stock</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered input-sm w-full"
                    value={variantForm.stock_quantity}
                    onChange={(e) => setVariantForm({ ...variantForm, stock_quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                
                <div className="form-control">
                  <label className="label py-1 cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox"
                      className="toggle toggle-success toggle-sm"
                      checked={variantForm.is_active}
                      onChange={(e) => setVariantForm({ ...variantForm, is_active: e.target.checked })}
                    />
                    <span className="label-text text-sm">Actif</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="modal-action">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setShowVariantModal(false)
                  setEditingVariant(null)
                }}
              >
                Annuler
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleAddVariant}
              >
                {editingVariant ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
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
            Annuler
          </button>
          <button 
            onClick={handleSubmit}
            disabled={submitting}
            className="btn btn-primary btn-sm flex-1"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                En cours...
              </>
            ) : (
              <>
                <Save className="w-3 h-3" />
                {isEditMode ? 'Mettre à jour' : 'Créer'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductForm