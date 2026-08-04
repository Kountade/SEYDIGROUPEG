// src/components/ProductForm.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Save, X, Upload, Package, AlertCircle, CheckCircle, Image as ImageIcon,
  Trash2, ArrowLeft, Loader2, Boxes, Tag, Barcode, Hash, Layers,
  Plus, Edit, ChevronDown, Folder, Building2, Weight, Ruler,
  AlertTriangle, Info
} from 'lucide-react'

const ProductForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = !!id

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })
  const [dragActive, setDragActive] = useState(false)
  const [touched, setTouched] = useState({})

  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [units, setUnits] = useState([])

  // État initial SANS PRIX
  const [formData, setFormData] = useState({
    reference: '', barcode: '', name: '', description: '', product_type: 'simple',
    category: '', brand: '', unit: '',
    stock_quantity: 0, minimum_stock: 5, maximum_stock: '', location: '',
    is_active: true, is_featured: false, has_variants: false, weight: '', volume: ''
  })

  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [errors, setErrors] = useState({})
  const [removeMainImage, setRemoveMainImage] = useState(false)

  const [variants, setVariants] = useState([])
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [editingVariant, setEditingVariant] = useState(null)
  const [variantForm, setVariantForm] = useState({ 
    sku: '', attributes: {}, stock_quantity: 0, image: null, is_active: true 
  })
  const [attributeKey, setAttributeKey] = useState('')
  const [attributeValue, setAttributeValue] = useState('')
  const [variantErrors, setVariantErrors] = useState({})

  const productTypes = { simple: 'Simple', variable: 'Variable', service: 'Service', digital: 'Numérique' }

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000)
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
          category: p.category?.id || p.category || '', brand: p.brand?.id || p.brand || '', 
          unit: p.unit?.id || p.unit || '',
          stock_quantity: p.stock_quantity || 0, minimum_stock: p.minimum_stock || 5,
          maximum_stock: p.maximum_stock || '', location: p.location || '',
          is_active: p.is_active !== undefined ? p.is_active : true, 
          is_featured: p.is_featured || false, has_variants: p.has_variants || false,
          weight: p.weight || '', volume: p.volume || ''
        })
        if (p.main_image) {
          setImagePreview(p.main_image)
        } else {
          setImagePreview(null)
        }
        setRemoveMainImage(false)
        
        const varRes = await AxiosInstance.get(`/products/${id}/variants/`).catch(() => ({ data: [] }))
        setVariants(varRes.data || [])
      }
    } catch (error) {
      console.error(error)
      showNotification('Erreur de chargement des données', 'error')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [id])

  // Validation en temps réel
  const validateField = (name, value) => {
    let error = ''
    switch (name) {
      case 'reference':
        if (!value?.trim()) error = 'La référence est obligatoire'
        else if (value.length < 3) error = 'La référence doit contenir au moins 3 caractères'
        break
      case 'name':
        if (!value?.trim()) error = 'Le nom du produit est obligatoire'
        else if (value.length < 2) error = 'Le nom doit contenir au moins 2 caractères'
        break
      case 'category':
        if (!value) error = 'Veuillez sélectionner une catégorie'
        break
      case 'unit':
        if (!value) error = 'Veuillez sélectionner une unité'
        break
      case 'stock_quantity':
        if (value < 0) error = 'La quantité ne peut pas être négative'
        break
      case 'minimum_stock':
        if (value < 0) error = 'Le stock minimum ne peut pas être négatif'
        break
      case 'maximum_stock':
        if (value && value < formData.minimum_stock) error = 'Le stock maximum doit être supérieur au stock minimum'
        break
      default:
        break
    }
    return error
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
    const error = validateField(name, value)
    setErrors(prev => ({ ...prev, [name]: error }))
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    const newValue = type === 'checkbox' ? checked : value
    setFormData(prev => ({ ...prev, [name]: newValue }))
    
    // Validation en temps réel
    if (touched[name]) {
      const error = validateField(name, newValue)
      setErrors(prev => ({ ...prev, [name]: error }))
    }
  }

  const handleMainImageFile = (file) => {
    if (!file) return
    
    if (!file.type.match('image.*')) {
      showNotification('Veuillez sélectionner une image valide (PNG, JPG, JPEG, GIF)', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotification('L\'image ne doit pas dépasser 5MB', 'error')
      return
    }
    setSelectedImage(file)
    setRemoveMainImage(false)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleMainImageSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleMainImageFile(e.target.files[0])
    }
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setRemoveMainImage(true)
  }

  const validateVariants = () => {
    const newErrors = {}
    variants.forEach((v, index) => {
      if (!v.sku?.trim()) {
        newErrors[`variant_${index}`] = 'SKU obligatoire'
      }
      if (Object.keys(v.attributes).length === 0) {
        newErrors[`variant_${index}_attrs`] = 'Au moins un attribut requis'
      }
    })
    setVariantErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddVariant = () => {
    if (!variantForm.sku?.trim()) {
      showNotification('Le SKU est obligatoire pour la variante', 'error')
      return
    }
    if (Object.keys(variantForm.attributes).length === 0) {
      showNotification('Ajoutez au moins un attribut (ex: Couleur, Taille)', 'error')
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
    setVariantForm({ sku: '', attributes: {}, stock_quantity: 0, image: null, is_active: true })
    setVariantImagePreview(null)
    setAttributeKey(''); setAttributeValue('')
    setVariantErrors({})
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

  const validateForm = () => {
    const newErrors = {}
    
    // Validation des champs obligatoires
    if (!formData.reference?.trim()) newErrors.reference = 'La référence est obligatoire'
    else if (formData.reference.length < 3) newErrors.reference = 'La référence doit contenir au moins 3 caractères'
    
    if (!formData.name?.trim()) newErrors.name = 'Le nom du produit est obligatoire'
    else if (formData.name.length < 2) newErrors.name = 'Le nom doit contenir au moins 2 caractères'
    
    if (!formData.category) newErrors.category = 'La catégorie est obligatoire'
    if (!formData.unit) newErrors.unit = 'L\'unité est obligatoire'
    
    if (formData.maximum_stock && formData.minimum_stock > formData.maximum_stock) {
      newErrors.maximum_stock = 'Le stock maximum doit être supérieur au stock minimum'
    }
    
    // Validation des variantes
    if (formData.has_variants) {
      if (variants.length === 0) {
        newErrors.variants = 'Ajoutez au moins une variante'
      } else {
        const variantErrors = validateVariants()
        if (!variantErrors) {
          newErrors.variants = 'Veuillez corriger les erreurs des variantes'
        }
      }
    }
    
    setErrors(newErrors)
    
    if (Object.keys(newErrors).length > 0) {
      // Trouver le premier champ en erreur et faire défiler
      const firstError = Object.keys(newErrors)[0]
      const element = document.querySelector(`[name="${firstError}"]`)
      if (element) {
        element.focus()
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
    
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) {
      showNotification('Veuillez corriger les erreurs avant de continuer', 'error')
      return
    }
    
    setSubmitting(true)
    try {
      const productPayload = new FormData()
      
      // Ajouter tous les champs du formulaire
      Object.keys(formData).forEach(key => {
        const value = formData[key]
        if (value !== null && value !== undefined && value !== '') {
          productPayload.append(key, value)
        }
      })
      
      // Gérer l'image principale
      if (selectedImage) {
        productPayload.append('main_image', selectedImage)
      }
      
      // Si on est en mode édition et qu'on a supprimé l'image
      if (isEditMode && removeMainImage) {
        productPayload.append('remove_main_image', 'true')
      }

      let productResponse
      if (isEditMode) {
        productResponse = await AxiosInstance.put(`/products/${id}/`, productPayload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        productResponse = await AxiosInstance.post('/products/', productPayload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }
      const productId = productResponse.data.id

      // Gérer les variantes
      if (formData.has_variants) {
        for (const v of variants) {
          const variantPayload = {
            product: productId, 
            sku: v.sku, 
            attributes: v.attributes,
            stock_quantity: v.stock_quantity || 0, 
            is_active: v.is_active !== undefined ? v.is_active : true
          }
          if (v.id && !String(v.id).includes('temp') && !String(v.id).includes('_')) {
            await AxiosInstance.put(`/variants/${v.id}/`, variantPayload)
          } else {
            await AxiosInstance.post('/variants/', variantPayload)
          }
        }
      }

      showNotification(
        isEditMode ? '✅ Produit modifié avec succès' : '✅ Produit créé avec succès',
        'success'
      )
      setTimeout(() => navigate('/produits'), 1500)
    } catch (error) {
      console.error('Erreur:', error)
      if (error.response?.data) {
        const errorData = error.response.data
        let errorMsg = ''
        if (typeof errorData === 'object') {
          const messages = Object.entries(errorData).map(([key, value]) => {
            if (Array.isArray(value)) return `${key}: ${value.join(', ')}`
            return `${key}: ${value}`
          })
          errorMsg = messages.join(' | ')
        } else {
          errorMsg = errorData.message || errorData.detail || 'Erreur lors de l\'enregistrement'
        }
        showNotification(`❌ ${errorMsg}`, 'error')
      } else {
        showNotification('❌ Erreur de connexion au serveur', 'error')
      }
    } finally { setSubmitting(false) }
  }

  // Helper pour afficher les erreurs
  const renderError = (fieldName) => {
    if (errors[fieldName] && touched[fieldName]) {
      return (
        <div className="flex items-center gap-1 text-error text-xs mt-1 animate-fadeIn">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>{errors[fieldName]}</span>
        </div>
      )
    }
    return null
  }

  const getInputClass = (fieldName) => {
    let baseClass = 'input input-bordered input-sm w-full'
    if (errors[fieldName] && touched[fieldName]) {
      return `${baseClass} input-error`
    }
    return baseClass
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-base font-medium text-base-content/70">Chargement du produit...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'general', label: 'Informations générales', icon: Package },
    ...(formData.has_variants ? [{ id: 'variants', label: 'Variantes', icon: Layers }] : [])
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6 p-3 lg:p-6 pb-24 lg:pb-6">
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-16 lg:top-20 right-3 lg:right-6 z-50 animate-slideDown w-[calc(100%-1.5rem)] lg:w-auto max-w-md">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg`}>
            {notification.type === 'success' ? 
              <CheckCircle className="w-4 h-4 flex-shrink-0" /> : 
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            }
            <span className="text-sm lg:text-base font-medium">{notification.message}</span>
            <button 
              className="btn btn-ghost btn-xs btn-circle" 
              onClick={() => setNotification({ ...notification, show: false })}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-base-100 p-4 rounded-xl shadow-sm border border-base-300">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/produits')} className="btn btn-ghost btn-sm btn-circle">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-base-content">
              {isEditMode ? '✏️ Modifier le produit' : '➕ Nouveau produit'}
            </h1>
            <p className="text-xs lg:text-sm text-base-content/60">
              {isEditMode ? 'Modifiez les informations du produit' : 'Ajoutez un nouveau produit au catalogue'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/produits')} className="btn btn-outline btn-sm lg:btn-md gap-1">
            <X className="w-3 h-3" /> Annuler
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary btn-sm lg:btn-md gap-1">
            {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            {isEditMode ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-100 p-1 rounded-xl shadow-sm border border-base-300 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const hasError = tab.id === 'general' && Object.keys(errors).length > 0
          return (
            <button 
              key={tab.id} 
              className={`tab gap-2 text-sm whitespace-nowrap ${activeTab === tab.id ? 'tab-active' : ''} ${hasError ? 'text-error' : ''}`} 
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="w-4 h-4" /> {tab.label}
              {hasError && <AlertCircle className="w-3 h-3 text-error" />}
            </button>
          )
        })}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Tab: Informations générales */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="lg:col-span-2 space-y-4 lg:space-y-6">
              {/* Section Identification */}
              <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 overflow-hidden">
                <div className="p-4 lg:p-6 border-b border-base-300 bg-base-200/50">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg"><Hash className="w-4 h-4 text-primary" /></div>
                    <h2 className="text-base font-bold">Identification</h2>
                    {errors.reference || errors.name ? (
                      <span className="badge badge-error badge-sm ml-2">Champs obligatoires</span>
                    ) : null}
                  </div>
                </div>
                <div className="p-4 lg:p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label pb-1 text-sm font-medium">
                        Référence <span className="text-error">*</span>
                      </label>
                      <input 
                        type="text" 
                        name="reference" 
                        value={formData.reference} 
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={getInputClass('reference')}
                        placeholder="ex: REF-001" 
                      />
                      {renderError('reference')}
                    </div>
                    <div className="form-control">
                      <label className="label pb-1 text-sm font-medium">
                        <Barcode className="w-3 h-3 inline mr-1" /> Code-barres
                      </label>
                      <input 
                        type="text" 
                        name="barcode" 
                        value={formData.barcode} 
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className="input input-bordered input-sm w-full" 
                        placeholder="ex: 1234567890123" 
                      />
                      <span className="text-xs text-base-content/40 mt-1">Optionnel - Format EAN-13</span>
                    </div>
                  </div>
                  
                  <div className="form-control">
                    <label className="label pb-1 text-sm font-medium">
                      Nom du produit <span className="text-error">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={getInputClass('name')}
                      placeholder="ex: Ordinateur Portable Dell XPS" 
                    />
                    {renderError('name')}
                  </div>
                  
                  <div className="form-control">
                    <label className="label pb-1 text-sm font-medium">Description</label>
                    <textarea 
                      name="description" 
                      value={formData.description} 
                      onChange={handleInputChange}
                      className="textarea textarea-bordered text-sm w-full h-24" 
                      placeholder="Description détaillée du produit..." 
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label pb-1 text-sm font-medium">Type de produit</label>
                      <select 
                        name="product_type" 
                        value={formData.product_type} 
                        onChange={handleInputChange}
                        className="select select-bordered select-sm w-full"
                      >
                        {Object.entries(productTypes).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-control">
                      <label className="label pb-1 text-sm font-medium">
                        Catégorie <span className="text-error">*</span>
                      </label>
                      <select 
                        name="category" 
                        value={formData.category} 
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={getInputClass('category')}
                      >
                        <option value="">Sélectionner une catégorie</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      {renderError('category')}
                    </div>
                    <div className="form-control">
                      <label className="label pb-1 text-sm font-medium">
                        <Building2 className="w-3 h-3 inline mr-1" /> Marque
                      </label>
                      <select 
                        name="brand" 
                        value={formData.brand} 
                        onChange={handleInputChange}
                        className="select select-bordered select-sm w-full"
                      >
                        <option value="">Sélectionner une marque</option>
                        {brands.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-control">
                      <label className="label pb-1 text-sm font-medium">
                        Unité <span className="text-error">*</span>
                      </label>
                      <select 
                        name="unit" 
                        value={formData.unit} 
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={getInputClass('unit')}
                      >
                        <option value="">Sélectionner une unité</option>
                        {units.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>
                        ))}
                      </select>
                      {renderError('unit')}
                    </div>
                  </div>
                  
                  <div className="form-control bg-base-200/50 rounded-lg p-3">
                    <label className="label cursor-pointer justify-start gap-3">
                      <input 
                        type="checkbox" 
                        name="has_variants" 
                        checked={formData.has_variants} 
                        onChange={handleInputChange}
                        className="toggle toggle-primary toggle-sm" 
                      />
                      <span className="label-text font-medium">Ce produit a des variantes (taille, couleur, etc.)</span>
                    </label>
                    <span className="text-xs text-base-content/40 ml-12">
                      Activez cette option pour gérer plusieurs versions du même produit
                    </span>
                  </div>
                </div>
              </div>

              {/* Section Stock */}
              <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 overflow-hidden">
                <div className="p-4 lg:p-6 border-b border-base-300 bg-base-200/50">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-warning/10 rounded-lg"><Boxes className="w-4 h-4 text-warning" /></div>
                    <h2 className="text-base font-bold">Gestion de stock</h2>
                  </div>
                </div>
                <div className="p-4 lg:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label pb-1 text-sm font-medium">Quantité en stock</label>
                      <input 
                        type="number" 
                        name="stock_quantity" 
                        value={formData.stock_quantity} 
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className="input input-bordered input-sm w-full" 
                        min="0" 
                      />
                    </div>
                    <div className="form-control">
                      <label className="label pb-1 text-sm font-medium">Stock minimum</label>
                      <input 
                        type="number" 
                        name="minimum_stock" 
                        value={formData.minimum_stock} 
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className="input input-bordered input-sm w-full" 
                        min="0" 
                      />
                      <span className="text-xs text-base-content/40 mt-1">Alerte si stock en dessous</span>
                    </div>
                    <div className="form-control">
                      <label className="label pb-1 text-sm font-medium">Stock maximum</label>
                      <input 
                        type="number" 
                        name="maximum_stock" 
                        value={formData.maximum_stock} 
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={getInputClass('maximum_stock')} 
                        min="0" 
                        placeholder="Illimité" 
                      />
                      {renderError('maximum_stock')}
                    </div>
                    <div className="form-control">
                      <label className="label pb-1 text-sm font-medium">Emplacement</label>
                      <input 
                        type="text" 
                        name="location" 
                        value={formData.location} 
                        onChange={handleInputChange}
                        className="input input-bordered input-sm w-full" 
                        placeholder="ex: A12 - Rayon 3" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dimensions */}
              <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 overflow-hidden">
                <div className="p-4 lg:p-6 border-b border-base-300 bg-base-200/50">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-info/10 rounded-lg"><Ruler className="w-4 h-4 text-info" /></div>
                    <h2 className="text-base font-bold">Dimensions et poids</h2>
                  </div>
                </div>
                <div className="p-4 lg:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label pb-1 text-sm font-medium">
                        <Weight className="w-3 h-3 inline mr-1" /> Poids (kg)
                      </label>
                      <input 
                        type="number" 
                        name="weight" 
                        value={formData.weight} 
                        onChange={handleInputChange}
                        className="input input-bordered input-sm w-full" 
                        step="0.001" 
                        placeholder="0.000" 
                      />
                    </div>
                    <div className="form-control">
                      <label className="label pb-1 text-sm font-medium">Volume (m³)</label>
                      <input 
                        type="number" 
                        name="volume" 
                        value={formData.volume} 
                        onChange={handleInputChange}
                        className="input input-bordered input-sm w-full" 
                        step="0.001" 
                        placeholder="0.000" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Colonne droite - Image et options */}
            <div className="lg:col-span-1 space-y-4 lg:space-y-6">
              <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 overflow-hidden sticky top-4">
                <div className="p-4 lg:p-6 border-b border-base-300 bg-base-200/50">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-secondary/10 rounded-lg"><ImageIcon className="w-4 h-4 text-secondary" /></div>
                    <h2 className="text-base font-bold">Image principale</h2>
                  </div>
                </div>
                <div className="p-4 lg:p-6">
                  <div 
                    className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-200/30'}`}
                    onDragEnter={() => setDragActive(true)} 
                    onDragLeave={() => setDragActive(false)} 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { 
                      e.preventDefault(); 
                      setDragActive(false); 
                      if (e.dataTransfer.files[0]) handleMainImageFile(e.dataTransfer.files[0]);
                    }}
                  >
                    {imagePreview ? (
                      <div className="space-y-3">
                        <div className="relative">
                          <img src={imagePreview} alt="Aperçu" className="w-full h-36 object-contain rounded-lg bg-white" />
                          <button 
                            type="button" 
                            onClick={handleRemoveImage}
                            className="absolute -top-2 -right-2 btn btn-error btn-circle btn-xs shadow-md"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xs text-base-content/50">Cliquez ou glissez pour changer l'image</p>
                      </div>
                    ) : (
                      <>
                        <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                          <Package className="w-7 h-7 text-primary" />
                        </div>
                        <p className="text-sm font-medium mb-1">Ajouter une image</p>
                        <p className="text-xs text-base-content/50 mb-3">PNG, JPG, JPEG, GIF jusqu'à 5MB</p>
                        <button 
                          type="button" 
                          onClick={() => document.getElementById('main-image-input').click()}
                          className="btn btn-outline btn-xs gap-1"
                        >
                          <Upload className="w-3 h-3" /> Parcourir
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
                  {removeMainImage && isEditMode && (
                    <div className="mt-2 text-xs text-warning flex items-center gap-1 bg-warning/10 p-2 rounded-lg">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" /> 
                      <span>L'image sera supprimée lors de la mise à jour</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 overflow-hidden">
                <div className="p-4 lg:p-6">
                  <h3 className="font-semibold text-sm mb-3">Options du produit</h3>
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

              {/* Informations supplémentaires */}
              <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 overflow-hidden">
                <div className="p-4 lg:p-6">
                  <h3 className="font-semibold text-sm mb-3">Statut du produit</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1 border-b border-base-200 last:border-0">
                      <span className="text-base-content/60">Mode</span>
                      <span className="font-medium">{isEditMode ? 'Modification' : 'Création'}</span>
                    </div>
                    {isEditMode && (
                      <div className="flex justify-between py-1 border-b border-base-200 last:border-0">
                        <span className="text-base-content/60">ID Produit</span>
                        <span className="font-mono text-xs bg-base-200 px-2 py-0.5 rounded">#{id}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 border-b border-base-200 last:border-0">
                      <span className="text-base-content/60">Variantes</span>
                      <span className="font-medium">
                        {formData.has_variants ? `${variants.length} activée(s)` : 'Aucune'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-base-200 last:border-0">
                      <span className="text-base-content/60">Image</span>
                      <span className="font-medium">
                        {imagePreview ? '✅ Présente' : '❌ Absente'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Variantes */}
        {activeTab === 'variants' && formData.has_variants && (
          <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-base-300 bg-base-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-accent/10 rounded-lg"><Layers className="w-4 h-4 text-accent" /></div>
                <h2 className="text-base font-bold">Variantes du produit</h2>
                <span className="badge badge-primary badge-sm">{variants.length}</span>
                {errors.variants && (
                  <span className="badge badge-error badge-sm gap-1">
                    <AlertCircle className="w-3 h-3" /> Erreur
                  </span>
                )}
              </div>
              <button 
                type="button" 
                onClick={() => setShowVariantModal(true)} 
                className="btn btn-primary btn-sm gap-1"
              >
                <Plus className="w-3 h-3" /> Ajouter une variante
              </button>
            </div>
            <div className="p-4 lg:p-6">
              {errors.variants && (
                <div className="alert alert-error shadow-sm mb-4 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errors.variants}</span>
                </div>
              )}
              
              {variants.length === 0 ? (
                <div className="text-center py-12">
                  <Layers className="w-12 h-12 mx-auto mb-3 text-base-content/30" />
                  <p className="text-base-content/50">Aucune variante définie</p>
                  <p className="text-xs text-base-content/40 mt-1">Ajoutez des variantes pour gérer les différentes versions du produit</p>
                  <button 
                    type="button" 
                    onClick={() => setShowVariantModal(true)} 
                    className="btn btn-primary btn-sm mt-4 gap-1"
                  >
                    <Plus className="w-3 h-3" /> Ajouter une variante
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-zebra table-sm">
                    <thead>
                      <tr className="bg-base-200">
                        <th className="text-xs uppercase">SKU</th>
                        <th className="text-xs uppercase">Attributs</th>
                        <th className="text-center text-xs uppercase">Stock</th>
                        <th className="text-center text-xs uppercase">Statut</th>
                        <th className="text-right text-xs uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v, index) => (
                        <tr key={v.id}>
                          <td className="font-mono text-sm">{v.sku}</td>
                          <td>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(v.attributes).map(([key, val]) => (
                                <span key={key} className="badge badge-ghost badge-sm">{key}: {val}</span>
                              ))}
                            </div>
                          </td>
                          <td className="text-center text-sm font-medium">{v.stock_quantity || 0}</td>
                          <td className="text-center">
                            {v.is_active !== undefined && v.is_active ? 
                              <span className="badge badge-success badge-sm">Actif</span> : 
                              <span className="badge badge-ghost badge-sm">Inactif</span>}
                          </td>
                          <td>
                            <div className="flex justify-end gap-1">
                              <button 
                                type="button" 
                                className="btn btn-ghost btn-xs" 
                                onClick={() => { 
                                  setEditingVariant(v); 
                                  setVariantForm({...v}); 
                                  setShowVariantModal(true); 
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
          <div className="modal-box max-w-md p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">
                {editingVariant ? '✏️ Modifier la variante' : '➕ Nouvelle variante'}
              </h3>
              <button 
                className="btn btn-sm btn-circle btn-ghost" 
                onClick={() => { 
                  setShowVariantModal(false); 
                  setEditingVariant(null); 
                  setVariantForm({ sku: '', attributes: {}, stock_quantity: 0, image: null, is_active: true });
                  setVariantErrors({});
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="form-control">
                <label className="label py-1 text-sm font-medium">
                  SKU <span className="text-error">*</span>
                </label>
                <input 
                  type="text" 
                  className={`input input-bordered input-sm w-full ${variantErrors.sku ? 'input-error' : ''}`} 
                  value={variantForm.sku}
                  onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                  placeholder="ex: SKU-001" 
                />
                {variantErrors.sku && (
                  <div className="flex items-center gap-1 text-error text-xs mt-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{variantErrors.sku}</span>
                  </div>
                )}
              </div>
              
              <div>
                <label className="label py-1 text-sm font-medium">
                  Attributs <span className="text-error">*</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <input 
                    type="text" 
                    placeholder="ex: Couleur" 
                    className="input input-bordered input-sm flex-1" 
                    value={attributeKey} 
                    onChange={(e) => setAttributeKey(e.target.value)} 
                  />
                  <input 
                    type="text" 
                    placeholder="ex: Rouge" 
                    className="input input-bordered input-sm flex-1" 
                    value={attributeValue} 
                    onChange={(e) => setAttributeValue(e.target.value)} 
                  />
                  <button 
                    type="button" 
                    className="btn btn-outline btn-sm" 
                    onClick={addAttribute}
                    disabled={!attributeKey || !attributeValue}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 min-h-[2rem] bg-base-200 rounded-lg p-2">
                  {Object.entries(variantForm.attributes).map(([key, val]) => (
                    <span key={key} className="badge badge-lg gap-1 bg-primary/10">
                      {key}: {val}
                      <button 
                        type="button" 
                        onClick={() => removeAttribute(key)} 
                        className="hover:text-error"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {Object.keys(variantForm.attributes).length === 0 && (
                    <span className="text-xs text-base-content/40">
                      Ajoutez au moins un attribut (ex: Couleur, Taille, Matière)
                    </span>
                  )}
                </div>
                {variantErrors.attributes && (
                  <div className="flex items-center gap-1 text-error text-xs mt-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{variantErrors.attributes}</span>
                  </div>
                )}
              </div>
              
              <div className="form-control">
                <label className="label py-1 text-sm font-medium">Quantité en stock</label>
                <input 
                  type="number" 
                  className="input input-bordered input-sm w-full" 
                  value={variantForm.stock_quantity}
                  onChange={(e) => setVariantForm({ ...variantForm, stock_quantity: parseInt(e.target.value) || 0 })} 
                  min="0" 
                />
              </div>
              
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input 
                    type="checkbox" 
                    className="toggle toggle-success toggle-sm" 
                    checked={variantForm.is_active}
                    onChange={(e) => setVariantForm({ ...variantForm, is_active: e.target.checked })} 
                  />
                  <span className="label-text">Variante active</span>
                </label>
              </div>
            </div>
            <div className="modal-action">
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => setShowVariantModal(false)}
              >
                Annuler
              </button>
              <button 
                className="btn btn-primary btn-sm gap-1" 
                onClick={handleAddVariant}
              >
                <Save className="w-3 h-3" />
                {editingVariant ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barre d'actions flottante mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-base-100 border-t p-3 shadow-lg z-40">
        <div className="flex gap-2">
          <button onClick={() => navigate('/produits')} className="btn btn-outline btn-sm flex-1">Annuler</button>
          <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary btn-sm flex-1 gap-1">
            {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            {isEditMode ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </div>

      {/* Styles CSS personnalisés */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown {
          animation: slideDown 0.4s ease-out;
        }
      `}</style>
    </div>
  )
}

export default ProductForm