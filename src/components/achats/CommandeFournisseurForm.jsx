// src/components/achats/CommandeFournisseurForm.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ArrowLeft, Save, Plus, Trash2, AlertCircle, CheckCircle,
  ShoppingCart, DollarSign, Calendar, Building2, FileText, X,
  Users, Clock, Package, Search, Tag, Percent, Hash, MapPin
} from 'lucide-react'

const CommandeFournisseurForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = !!id

  // États principaux
  const [formData, setFormData] = useState({
    supplier: '',
    agence: '',
    expected_date: '',
    urgency: 'normal',
    shipping_address: '',
    notes: '',
    internal_notes: '',
    items: []
  })

  const [suppliers, setSuppliers] = useState([])
  const [agences, setAgences] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingForm, setLoadingForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })
  
  // États pour l'ajout de produit
  const [showProductModal, setShowProductModal] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [productCategory, setProductCategory] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [newItem, setNewItem] = useState({
    product: '',
    quantity_ordered: 1,
    unit_price: 0,
    discount_rate: 0,
    tax_rate: 20,
    supplier_reference: ''
  })

  const [categories, setCategories] = useState([])

  // Calcul des totaux
  const [totals, setTotals] = useState({
    subtotal: 0,
    tax_total: 0,
    grand_total: 0
  })

  const urgencyOptions = [
    { value: 'normal', label: 'Normal', color: 'success' },
    { value: 'urgent', label: 'Urgent', color: 'warning' },
    { value: 'very_urgent', label: 'Très urgent', color: 'error' }
  ]

  // Charger les données
  const fetchSuppliers = async () => {
    try {
      const response = await AxiosInstance.get('/suppliers/')
      setSuppliers(response.data || [])
    } catch (error) {
      console.error('Erreur chargement fournisseurs:', error)
    }
  }

  const fetchAgences = async () => {
    try {
      const response = await AxiosInstance.get('/agences/')
      setAgences(response.data || [])
    } catch (error) {
      console.error('Erreur chargement agences:', error)
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const response = await AxiosInstance.get('/products/')
      setProducts(response.data || [])
      const uniqueCategories = [...new Set(response.data.map(p => p.category_name).filter(Boolean))]
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Erreur chargement produits:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCommande = async () => {
    if (!isEditMode) return
    setLoadingForm(true)
    try {
      const response = await AxiosInstance.get(`/purchase-orders/${id}/`)
      const commande = response.data
      
      setFormData({
        supplier: commande.supplier?.id || commande.supplier || '',
        agence: commande.agence?.id || commande.agence || '',
        expected_date: commande.expected_date || '',
        urgency: commande.urgency || 'normal',
        shipping_address: commande.shipping_address || '',
        notes: commande.notes || '',
        internal_notes: commande.internal_notes || '',
        items: (commande.items || []).map(item => ({
          id: item.id,
          product: item.product,
          product_name: item.product_name,
          product_reference: item.product_reference,
          quantity_ordered: item.quantity_ordered,
          unit_price: parseFloat(item.unit_price) || 0,
          discount_rate: parseFloat(item.discount_rate) || 0,
          tax_rate: parseFloat(item.tax_rate) || 20,
          supplier_reference: item.supplier_reference || '',
          subtotal: parseFloat(item.subtotal) || 0,
          tax_amount: parseFloat(item.tax_amount) || 0,
          total: parseFloat(item.total) || 0
        }))
      })
      
      calculateTotals(commande.items || [])
      
    } catch (error) {
      console.error('Erreur chargement commande:', error)
      showNotification('Erreur lors du chargement de la commande', 'error')
    } finally {
      setLoadingForm(false)
    }
  }

  useEffect(() => {
    fetchSuppliers()
    fetchAgences()
    fetchProducts()
    if (isEditMode) {
      fetchCommande()
    }
  }, [id])

  // Filtrer les produits
  const filteredProducts = products.filter(product => {
    const matchSearch = productSearch === '' || 
      product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (product.reference || '').toLowerCase().includes(productSearch.toLowerCase())
    
    const matchCategory = productCategory === '' || product.category_name === productCategory
    
    return matchSearch && matchCategory
  })

  // Calculer les totaux
  const calculateTotals = (items) => {
    let subtotal = 0
    let taxTotal = 0
    
    items.forEach(item => {
      const qty = item.quantity_ordered || 0
      const price = parseFloat(item.unit_price) || 0
      const discountRate = parseFloat(item.discount_rate) || 0
      const taxRate = parseFloat(item.tax_rate) || 0
      
      const discountAmount = qty * price * (discountRate / 100)
      const itemSubtotal = qty * price - discountAmount
      const itemTax = itemSubtotal * (taxRate / 100)
      
      subtotal += itemSubtotal
      taxTotal += itemTax
    })
    
    setTotals({
      subtotal,
      tax_total: taxTotal,
      grand_total: subtotal + taxTotal
    })
  }

  // Ajouter un produit
  const addProduct = () => {
    if (!selectedProduct) {
      showNotification('Veuillez sélectionner un produit', 'error')
      return
    }
    
    if (newItem.quantity_ordered <= 0) {
      showNotification('La quantité doit être supérieure à 0', 'error')
      return
    }
    
    if (newItem.unit_price <= 0) {
      showNotification('Le prix unitaire doit être supérieur à 0', 'error')
      return
    }
    
    const existingItem = formData.items.find(item => item.product === selectedProduct.id)
    if (existingItem) {
      showNotification('Ce produit est déjà dans la commande', 'error')
      return
    }
    
    const qty = newItem.quantity_ordered
    const price = newItem.unit_price
    const discountRate = newItem.discount_rate
    const taxRate = newItem.tax_rate
    
    const discountAmount = qty * price * (discountRate / 100)
    const subtotal = qty * price - discountAmount
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount
    
    const newProductItem = {
      id: Date.now(),
      product: selectedProduct.id,
      product_name: selectedProduct.name,
      product_reference: selectedProduct.reference,
      quantity_ordered: qty,
      unit_price: price,
      discount_rate: discountRate,
      tax_rate: taxRate,
      supplier_reference: newItem.supplier_reference,
      subtotal: subtotal,
      tax_amount: taxAmount,
      total: total
    }
    
    const updatedItems = [...formData.items, newProductItem]
    setFormData(prev => ({ ...prev, items: updatedItems }))
    calculateTotals(updatedItems)
    
    setSelectedProduct(null)
    setNewItem({
      product: '',
      quantity_ordered: 1,
      unit_price: 0,
      discount_rate: 0,
      tax_rate: 20,
      supplier_reference: ''
    })
    setProductSearch('')
    setProductCategory('')
    setShowProductModal(false)
  }

  // Modifier un produit
  const updateItem = (index, field, value) => {
    const updatedItems = [...formData.items]
    const item = { ...updatedItems[index], [field]: parseFloat(value) || value }
    
    const qty = item.quantity_ordered
    const price = item.unit_price
    const discountRate = item.discount_rate
    const taxRate = item.tax_rate
    
    const discountAmount = qty * price * (discountRate / 100)
    const subtotal = qty * price - discountAmount
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount
    
    item.subtotal = subtotal
    item.tax_amount = taxAmount
    item.total = total
    
    updatedItems[index] = item
    setFormData(prev => ({ ...prev, items: updatedItems }))
    calculateTotals(updatedItems)
  }

  // Supprimer un produit
  const removeItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index)
    setFormData(prev => ({ ...prev, items: updatedItems }))
    calculateTotals(updatedItems)
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000)
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.supplier) newErrors.supplier = 'Le fournisseur est requis'
    if (!formData.agence) newErrors.agence = 'L\'agence est requise'
    if (!formData.expected_date) newErrors.expected_date = 'La date de livraison est requise'
    if (!formData.shipping_address) newErrors.shipping_address = 'L\'adresse de livraison est requise'
    if (formData.items.length === 0) newErrors.items = 'Au moins un produit est requis'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    
    setSubmitting(true)
    
    const submitData = {
      supplier: parseInt(formData.supplier),
      agence: parseInt(formData.agence),
      expected_date: formData.expected_date,
      urgency: formData.urgency,
      shipping_address: formData.shipping_address,
      notes: formData.notes,
      internal_notes: formData.internal_notes,
      items: formData.items.map(item => ({
        product: parseInt(item.product),
        quantity_ordered: parseInt(item.quantity_ordered),
        unit_price: parseFloat(item.unit_price),
        discount_rate: parseFloat(item.discount_rate),
        tax_rate: parseFloat(item.tax_rate),
        supplier_reference: item.supplier_reference || ''
      }))
    }

    console.log('Données envoyées:', submitData)

    try {
      if (isEditMode) {
        await AxiosInstance.put(`/purchase-orders/${id}/`, submitData)
      } else {
        await AxiosInstance.post('/purchase-orders/', submitData)
      }
      
      showNotification(isEditMode ? 'Commande modifiée avec succès !' : 'Commande créée avec succès !', 'success')
      
      setTimeout(() => {
        navigate('/commandes-fournisseurs')
      }, 2000)
    } catch (error) {
      console.error('Erreur:', error)
      let errorMsg = 'Erreur lors de l\'enregistrement'
      
      if (error.response?.data) {
        const data = error.response.data
        if (typeof data === 'object') {
          const firstKey = Object.keys(data)[0]
          if (firstKey && data[firstKey] && data[firstKey][0]) {
            errorMsg = data[firstKey][0]
          } else if (data.message) {
            errorMsg = data.message
          } else if (data.error) {
            errorMsg = data.error
          }
        }
      }
      
      showNotification(errorMsg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleProductSelect = (product) => {
    setSelectedProduct(product)
    setNewItem(prev => ({
      ...prev,
      product: product.id,
      unit_price: product.last_purchase_price || product.standard_price || 0
    }))
  }

  const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString() + ' FCFA'
  }

  if (loadingForm) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-base-200">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-base-content/60">Chargement de la commande...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-200 py-4 px-4 sm:py-6 sm:px-6">
      <div className="w-full max-w-7xl mx-auto">
        
        {/* Notification Toast */}
        {notification.show && (
          <div className="fixed top-20 right-4 z-50 animate-slide-in">
            <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg`}>
              {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span>{notification.message}</span>
              <button onClick={() => setNotification({ ...notification, show: false })} className="btn btn-sm btn-ghost">✕</button>
            </div>
          </div>
        )}

        {/* Bouton retour */}
        <div className="mb-4">
          <Link
            to="/commandes-fournisseurs"
            className="btn btn-ghost btn-sm gap-2 text-base-content/70 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la liste
          </Link>
        </div>

        {/* Formulaire principal */}
        <div className="card bg-base-100 shadow-xl border border-primary/20">
          <div className="card-body p-4 sm:p-6">
            
            {/* En-tête */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 mb-3">
                <ShoppingCart className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-base-content">
                {isEditMode ? 'Modifier la commande' : 'Nouvelle commande fournisseur'}
              </h2>
              <p className="text-base-content/60 text-sm mt-1">
                {isEditMode ? 'Modifiez les informations de la commande' : 'Créez une nouvelle commande d\'achat'}
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Section 1: Informations générales */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <h3 className="text-md font-semibold text-primary border-b border-base-200 pb-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Destinataire
                  </h3>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium">Fournisseur <span className="text-error">*</span></span>
                    </label>
                    <select
                      value={formData.supplier}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                      className={`select select-bordered w-full ${errors.supplier ? 'select-error' : ''}`}
                      disabled={isEditMode}
                    >
                      <option value="">-- Sélectionner un fournisseur --</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.company_name} - {supplier.code}
                        </option>
                      ))}
                    </select>
                    {errors.supplier && <span className="text-error text-xs mt-1">{errors.supplier}</span>}
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium">Agence destinataire <span className="text-error">*</span></span>
                    </label>
                    <select
                      value={formData.agence}
                      onChange={(e) => setFormData(prev => ({ ...prev, agence: e.target.value }))}
                      className={`select select-bordered w-full ${errors.agence ? 'select-error' : ''}`}
                    >
                      <option value="">-- Sélectionner une agence --</option>
                      {agences.map(agence => (
                        <option key={agence.id} value={agence.id}>
                          {agence.nom} - {agence.ville}
                        </option>
                      ))}
                    </select>
                    {errors.agence && <span className="text-error text-xs mt-1">{errors.agence}</span>}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-md font-semibold text-primary border-b border-base-200 pb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Livraison
                  </h3>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium">Date de livraison prévue <span className="text-error">*</span></span>
                    </label>
                    <input
                      type="date"
                      value={formData.expected_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, expected_date: e.target.value }))}
                      className={`input input-bordered w-full ${errors.expected_date ? 'input-error' : ''}`}
                    />
                    {errors.expected_date && <span className="text-error text-xs mt-1">{errors.expected_date}</span>}
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium">Adresse de livraison <span className="text-error">*</span></span>
                    </label>
                    <textarea
                      value={formData.shipping_address}
                      onChange={(e) => setFormData(prev => ({ ...prev, shipping_address: e.target.value }))}
                      rows="2"
                      className={`textarea textarea-bordered w-full ${errors.shipping_address ? 'textarea-error' : ''}`}
                      placeholder="Adresse complète de livraison"
                    />
                    {errors.shipping_address && <span className="text-error text-xs mt-1">{errors.shipping_address}</span>}
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium">Niveau d'urgence</span>
                    </label>
                    <div className="flex gap-4">
                      {urgencyOptions.map(option => (
                        <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="urgency"
                            value={option.value}
                            checked={formData.urgency === option.value}
                            onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value }))}
                            className={`radio radio-${option.color} radio-sm`}
                          />
                          <span className={`text-sm text-${option.color}`}>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Produits commandés */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="text-md font-semibold text-primary flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Produits commandés
                    <span className="badge badge-primary badge-sm ml-2">{formData.items.length} article(s)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowProductModal(true)}
                    className="btn btn-sm btn-primary gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un produit
                  </button>
                </div>
                
                {errors.items && <div className="alert alert-error text-sm mb-4 py-2">{errors.items}</div>}
                
                {formData.items.length === 0 ? (
                  <div className="text-center py-12 bg-base-200 rounded-xl">
                    <Package className="w-16 h-16 mx-auto text-base-content/30 mb-3" />
                    <p className="text-base-content/50 font-medium">Aucun produit dans la commande</p>
                    <p className="text-sm text-base-content/40">Cliquez sur "Ajouter un produit" pour commencer</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                      <thead className="bg-base-200">
                        <tr className="text-sm">
                          <th>Produit</th>
                          <th>Référence</th>
                          <th className="text-center">Quantité</th>
                          <th className="text-right">Prix unitaire</th>
                          <th className="text-center">Remise</th>
                          <th className="text-center">TVA</th>
                          <th className="text-right">Total HT</th>
                          <th className="text-right">Total TTC</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.items.map((item, index) => (
                          <tr key={item.id || index} className="hover">
                            <td className="font-medium">
                              {item.product_name}
                              {item.supplier_reference && (
                                <div className="text-xs text-base-content/50">Réf fourn: {item.supplier_reference}</div>
                              )}
                            </td>
                            <td className="text-xs font-mono">{item.product_reference}</td>
                            <td className="text-center">
                              <input
                                type="number"
                                value={item.quantity_ordered}
                                onChange={(e) => updateItem(index, 'quantity_ordered', e.target.value)}
                                min="1"
                                className="input input-bordered input-xs w-20 text-center"
                              />
                            </td>
                            <td className="text-right">
                              <input
                                type="number"
                                value={item.unit_price}
                                onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                                min="0"
                                step="1"
                                className="input input-bordered input-xs w-28 text-right"
                              />
                            </td>
                            <td className="text-center">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={item.discount_rate}
                                  onChange={(e) => updateItem(index, 'discount_rate', e.target.value)}
                                  min="0"
                                  max="100"
                                  className="input input-bordered input-xs w-16 text-center"
                                />
                                <span className="text-xs">%</span>
                              </div>
                            </td>
                            <td className="text-center">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={item.tax_rate}
                                  onChange={(e) => updateItem(index, 'tax_rate', e.target.value)}
                                  min="0"
                                  max="100"
                                  className="input input-bordered input-xs w-16 text-center"
                                />
                                <span className="text-xs">%</span>
                              </div>
                            </td>
                            <td className="text-right font-mono text-sm">{formatCurrency(item.subtotal)}</td>
                            <td className="text-right font-mono text-sm font-semibold text-primary">{formatCurrency(item.total)}</td>
                            <td className="text-center">
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="btn btn-ghost btn-xs text-error"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-base-100 border-t-2">
                        <tr>
                          <td colSpan="6" className="text-right font-bold">Sous-total HT</td>
                          <td colSpan="2" className="text-right font-bold">{formatCurrency(totals.subtotal)}</td>
                          <td></td>
                        </tr>
                        <tr>
                          <td colSpan="6" className="text-right font-bold">Total TVA</td>
                          <td colSpan="2" className="text-right font-bold text-info">{formatCurrency(totals.tax_total)}</td>
                          <td></td>
                        </tr>
                        <tr className="border-t-2 border-primary/30 bg-primary/5">
                          <td colSpan="6" className="text-right font-bold text-lg">Total TTC</td>
                          <td colSpan="2" className="text-right font-bold text-primary text-xl">{formatCurrency(totals.grand_total)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Section 3: Notes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-medium">Notes (visibles par le fournisseur)</span>
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows="3"
                    className="textarea textarea-bordered w-full"
                    placeholder="Instructions particulières pour le fournisseur..."
                  />
                </div>

                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-medium">Notes internes</span>
                  </label>
                  <textarea
                    value={formData.internal_notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, internal_notes: e.target.value }))}
                    rows="3"
                    className="textarea textarea-bordered w-full"
                    placeholder="Notes confidentielles (visible uniquement en interne)..."
                  />
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-base-200">
                <button 
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary flex-1 gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      {isEditMode ? 'Modification...' : 'Création...'}
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      {isEditMode ? 'Modifier la commande' : 'Créer la commande'}
                    </>
                  )}
                </button>
                <Link to="/commandes-fournisseurs" className="btn btn-outline">Annuler</Link>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Modal d'ajout de produit */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-base-100 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 bg-gradient-to-r from-primary to-primary/80 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Package className="h-6 w-6 text-white" />
                <h2 className="text-xl font-bold text-white">Ajouter un produit</h2>
              </div>
              <button onClick={() => setShowProductModal(false)} className="text-white hover:text-white/80">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="flex flex-col lg:flex-row h-full">
              {/* Panneau gauche - Liste des produits */}
              <div className="flex-1 border-r border-base-200 p-4 overflow-y-auto max-h-[calc(90vh-70px)]">
                <div className="mb-4">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                    <input
                      type="text"
                      placeholder="Rechercher par nom ou référence..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="input input-bordered w-full pl-10"
                      autoFocus
                    />
                  </div>
                  
                  <select
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                    className="select select-bordered select-sm w-full"
                  >
                    <option value="">Toutes les catégories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                {loading ? (
                  <div className="flex justify-center py-8"><span className="loading loading-spinner loading-md"></span></div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 mx-auto text-base-content/30 mb-2" />
                    <p className="text-base-content/50">Aucun produit trouvé</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleProductSelect(product)}
                        className={`w-full text-left p-3 rounded-lg transition-all border ${
                          selectedProduct?.id === product.id 
                            ? 'border-primary bg-primary/10' 
                            : 'border-base-200 hover:border-primary/50 hover:bg-base-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-xs text-base-content/50 mt-0.5">
                              <span className="inline-flex items-center gap-1 mr-3">
                                <Hash className="w-3 h-3" />
                                {product.reference || 'N/A'}
                              </span>
                              {product.category_name && (
                                <span className="inline-flex items-center gap-1">
                                  <Tag className="w-3 h-3" />
                                  {product.category_name}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-primary">{formatCurrency(product.last_purchase_price || product.standard_price || 0)}</div>
                            <div className="text-xs text-base-content/50">Stock: {product.stock_quantity || 0}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Panneau droit - Quantité et prix */}
              <div className="w-full lg:w-96 p-4 bg-base-200/50 overflow-y-auto">
                {selectedProduct ? (
                  <div className="space-y-4">
                    <div className="bg-base-100 rounded-lg p-4">
                      <h4 className="font-bold text-lg mb-2">{selectedProduct.name}</h4>
                      <div className="space-y-1 text-sm">
                        <p className="flex justify-between"><span className="text-base-content/50">Référence:</span><span className="font-mono">{selectedProduct.reference || '-'}</span></p>
                        <p className="flex justify-between"><span className="text-base-content/50">Catégorie:</span><span>{selectedProduct.category_name || '-'}</span></p>
                        <p className="flex justify-between"><span className="text-base-content/50">Stock:</span><span className="font-semibold">{selectedProduct.stock_quantity || 0} unités</span></p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="form-control w-full">
                        <label className="label"><span className="label-text font-medium">Quantité <span className="text-error">*</span></span></label>
                        <input type="number" value={newItem.quantity_ordered} onChange={(e) => setNewItem(prev => ({ ...prev, quantity_ordered: parseInt(e.target.value) || 0 }))} min="1" className="input input-bordered w-full" />
                      </div>
                      
                      <div className="form-control w-full">
                        <label className="label"><span className="label-text font-medium">Prix unitaire <span className="text-error">*</span></span></label>
                        <input type="number" value={newItem.unit_price} onChange={(e) => setNewItem(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))} min="0" step="1" className="input input-bordered w-full" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="form-control"><label className="label"><span className="label-text font-medium">Remise (%)</span></label><input type="number" value={newItem.discount_rate} onChange={(e) => setNewItem(prev => ({ ...prev, discount_rate: parseFloat(e.target.value) || 0 }))} min="0" max="100" className="input input-bordered" /></div>
                        <div className="form-control"><label className="label"><span className="label-text font-medium">TVA (%)</span></label><input type="number" value={newItem.tax_rate} onChange={(e) => setNewItem(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }))} min="0" max="100" className="input input-bordered" /></div>
                      </div>
                      
                      <div className="form-control"><label className="label"><span className="label-text font-medium">Référence fournisseur</span></label><input type="text" value={newItem.supplier_reference} onChange={(e) => setNewItem(prev => ({ ...prev, supplier_reference: e.target.value }))} className="input input-bordered w-full" placeholder="Référence utilisée par le fournisseur" /></div>
                      
                      {/* Aperçu */}
                      <div className="bg-primary/5 rounded-lg p-3 mt-4">
                        <div className="flex justify-between text-sm"><span>Sous-total:</span><span>{formatCurrency(newItem.quantity_ordered * newItem.unit_price)}</span></div>
                        {newItem.discount_rate > 0 && <div className="flex justify-between text-sm text-warning"><span>Remise ({newItem.discount_rate}%):</span><span>-{formatCurrency((newItem.quantity_ordered * newItem.unit_price * newItem.discount_rate) / 100)}</span></div>}
                        {newItem.tax_rate > 0 && <div className="flex justify-between text-sm text-info"><span>TVA ({newItem.tax_rate}%):</span><span>+{formatCurrency((newItem.quantity_ordered * newItem.unit_price * (100 - newItem.discount_rate) / 100 * newItem.tax_rate) / 100)}</span></div>}
                        <div className="flex justify-between font-bold text-primary pt-2 mt-2 border-t border-primary/20"><span>Total TTC:</span><span>{formatCurrency(newItem.quantity_ordered * newItem.unit_price * (100 - newItem.discount_rate) / 100 * (100 + newItem.tax_rate) / 100)}</span></div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 mt-6 pt-4">
                      <button type="button" onClick={addProduct} className="btn btn-primary flex-1 gap-2"><Plus className="w-4 h-4" /> Ajouter à la commande</button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12"><Package className="w-16 h-16 mx-auto text-base-content/20 mb-3" /><p className="text-base-content/60">Sélectionnez un produit</p><p className="text-sm text-base-content/40">Cliquez sur un produit à gauche</p></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default CommandeFournisseurForm