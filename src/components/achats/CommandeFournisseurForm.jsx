// src/components/commandes-fournisseurs/CommandeFournisseurForm.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ArrowLeft, Save, Plus, Trash2, AlertCircle, CheckCircle,
  ShoppingCart, Truck, Clock, DollarSign, Package, Send,
  Calendar, Building2, Users, FileText, X, Edit
} from 'lucide-react'

const CommandeFournisseurForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = !!id

  const [formData, setFormData] = useState({
    supplier: '',
    agence: '',
    expected_date: '',
    urgency: 'normal',
    notes: '',
    internal_notes: '',
    items: []
  })

  const [suppliers, setSuppliers] = useState([])
  const [agences, setAgences] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [newItem, setNewItem] = useState({
    product: '',
    quantity_ordered: 1,
    unit_price: 0,
    discount_rate: 0,
    tax_rate: 20
  })

  const urgencyOptions = [
    { value: 'normal', label: 'Normal', color: 'success' },
    { value: 'urgent', label: 'Urgent', color: 'warning' },
    { value: 'very_urgent', label: 'Très urgent', color: 'error' }
  ]

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
    try {
      const response = await AxiosInstance.get('/products/')
      setProducts(response.data || [])
    } catch (error) {
      console.error('Erreur chargement produits:', error)
    }
  }

  const fetchCommande = async () => {
    if (!isEditMode) return
    setLoading(true)
    try {
      const response = await AxiosInstance.get(`/purchase-orders/${id}/`)
      const commande = response.data
      setFormData({
        supplier: commande.supplier?.id || commande.supplier,
        agence: commande.agence?.id || commande.agence,
        expected_date: commande.expected_date || '',
        urgency: commande.urgency || 'normal',
        notes: commande.notes || '',
        internal_notes: commande.internal_notes || '',
        items: commande.items || []
      })
    } catch (error) {
      console.error('Erreur chargement commande:', error)
      showNotification('Erreur lors du chargement de la commande', 'error')
    } finally {
      setLoading(false)
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

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000)
  }

  const calculateItemTotal = (item) => {
    const qty = item.quantity_ordered || 0
    const price = item.unit_price || 0
    const discount = (item.discount_rate || 0) / 100
    const tax = (item.tax_rate || 0) / 100
    
    const subtotal = qty * price * (1 - discount)
    const taxAmount = subtotal * tax
    return subtotal + taxAmount
  }

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + calculateItemTotal(item), 0)
  }

  const addItem = () => {
    if (!newItem.product) {
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

    const product = products.find(p => p.id === parseInt(newItem.product))
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        ...newItem,
        product_name: product?.name,
        product_reference: product?.reference,
        id: Date.now()
      }]
    }))
    
    setNewItem({
      product: '',
      quantity_ordered: 1,
      unit_price: 0,
      discount_rate: 0,
      tax_rate: 20
    })
    setSelectedProduct(null)
  }

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: parseFloat(value) || value } : item
      )
    }))
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.supplier) newErrors.supplier = 'Le fournisseur est requis'
    if (!formData.agence) newErrors.agence = 'L\'agence est requise'
    if (!formData.expected_date) newErrors.expected_date = 'La date de livraison est requise'
    if (formData.items.length === 0) newErrors.items = 'Au moins un produit est requis'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    
    setSubmitting(true)
    
    const submitData = {
      supplier: formData.supplier,
      agence: formData.agence,
      expected_date: formData.expected_date,
      urgency: formData.urgency,
      notes: formData.notes,
      internal_notes: formData.internal_notes,
      items: formData.items.map(item => ({
        product: item.product,
        quantity_ordered: item.quantity_ordered,
        unit_price: item.unit_price,
        discount_rate: item.discount_rate,
        tax_rate: item.tax_rate
      }))
    }

    try {
      if (isEditMode) {
        await AxiosInstance.put(`/purchase-orders/${id}/`, submitData)
        showNotification('Commande modifiée avec succès !', 'success')
      } else {
        await AxiosInstance.post('/purchase-orders/', submitData)
        showNotification('Commande créée avec succès !', 'success')
      }
      
      setTimeout(() => {
        navigate('/commandes-fournisseurs')
      }, 2000)
    } catch (error) {
      console.error('Erreur:', error)
      showNotification(error.response?.data?.message || 'Erreur lors de l\'enregistrement', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-base-content/60">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-200 py-4 sm:py-6 px-3 sm:px-4">
      <div className="w-full max-w-6xl mx-auto">
        
        {/* Notification */}
        {notification.show && (
          <div className="fixed top-16 right-3 sm:right-6 z-50 animate-slide-in">
            <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg`}>
              {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
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
              {/* Informations générales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      Fournisseur <span className="text-error">*</span>
                    </span>
                  </label>
                  <select
                    name="supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                    className={`select select-bordered w-full ${errors.supplier ? 'select-error' : ''}`}
                    disabled={isEditMode}
                  >
                    <option value="">Sélectionner un fournisseur</option>
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
                    <span className="label-text font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Agence <span className="text-error">*</span>
                    </span>
                  </label>
                  <select
                    name="agence"
                    value={formData.agence}
                    onChange={(e) => setFormData(prev => ({ ...prev, agence: e.target.value }))}
                    className={`select select-bordered w-full ${errors.agence ? 'select-error' : ''}`}
                  >
                    <option value="">Sélectionner une agence</option>
                    {agences.map(agence => (
                      <option key={agence.id} value={agence.id}>
                        {agence.nom} - {agence.ville}
                      </option>
                    ))}
                  </select>
                  {errors.agence && <span className="text-error text-xs mt-1">{errors.agence}</span>}
                </div>

                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Date de livraison prévue <span className="text-error">*</span>
                    </span>
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
                    <span className="label-text font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Niveau d'urgence
                    </span>
                  </label>
                  <div className="flex gap-2">
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
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lignes de commande */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Produits commandés
                  </h3>
                  {errors.items && <span className="text-error text-sm">{errors.items}</span>}
                </div>
                
                {/* Formulaire d'ajout de produit */}
                <div className="bg-base-200 rounded-xl p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div className="md:col-span-2">
                      <select
                        value={newItem.product}
                        onChange={(e) => {
                          setNewItem(prev => ({ ...prev, product: e.target.value }))
                          const product = products.find(p => p.id === parseInt(e.target.value))
                          setSelectedProduct(product)
                        }}
                        className="select select-bordered w-full"
                      >
                        <option value="">Sélectionner un produit</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} - {product.reference}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Quantité"
                        value={newItem.quantity_ordered}
                        onChange={(e) => setNewItem(prev => ({ ...prev, quantity_ordered: parseInt(e.target.value) || 0 }))}
                        className="input input-bordered w-full"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Prix unitaire"
                        value={newItem.unit_price}
                        onChange={(e) => setNewItem(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                        className="input input-bordered w-full"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Remise %"
                        value={newItem.discount_rate}
                        onChange={(e) => setNewItem(prev => ({ ...prev, discount_rate: parseFloat(e.target.value) || 0 }))}
                        className="input input-bordered w-full"
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={addItem}
                        className="btn btn-primary w-full gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Ajouter
                      </button>
                    </div>
                  </div>
                  {selectedProduct && (
                    <div className="mt-2 text-sm text-base-content/60">
                      Réf: {selectedProduct.reference} - Stock: {selectedProduct.stock_quantity || 0}
                    </div>
                  )}
                </div>

                {/* Liste des produits */}
                {formData.items.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Produit</th>
                          <th>Référence</th>
                          <th>Qté</th>
                          <th>Prix unit.</th>
                          <th>Remise</th>
                          <th>TVA</th>
                          <th>Total</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.items.map((item, index) => (
                          <tr key={item.id || index}>
                            <td>{item.product_name}</td>
                            <td className="text-xs">{item.product_reference}</td>
                            <td>
                              <input
                                type="number"
                                value={item.quantity_ordered}
                                onChange={(e) => updateItem(index, 'quantity_ordered', e.target.value)}
                                className="input input-xs input-bordered w-20"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={item.unit_price}
                                onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                                className="input input-xs input-bordered w-24"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={item.discount_rate}
                                onChange={(e) => updateItem(index, 'discount_rate', e.target.value)}
                                className="input input-xs input-bordered w-16"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={item.tax_rate}
                                onChange={(e) => updateItem(index, 'tax_rate', e.target.value)}
                                className="input input-xs input-bordered w-16"
                              />
                            </td>
                            <td className="font-semibold">
                              {calculateItemTotal(item).toLocaleString()} FCFA
                            </td>
                            <td>
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
                      <tfoot>
                        <tr className="border-t-2">
                          <td colSpan="6" className="text-right font-bold">Total</td>
                          <td className="font-bold text-lg">{calculateTotal().toLocaleString()} FCFA</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Notes
                    </span>
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows="3"
                    className="textarea textarea-bordered w-full"
                    placeholder="Instructions particulières..."
                  />
                </div>

                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Notes internes
                    </span>
                  </label>
                  <textarea
                    value={formData.internal_notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, internal_notes: e.target.value }))}
                    rows="3"
                    className="textarea textarea-bordered w-full"
                    placeholder="Notes confidentielles..."
                  />
                </div>
              </div>

              {/* Boutons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-base-200">
                <button 
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary flex-1"
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
                <Link 
                  to="/commandes-fournisseurs" 
                  className="btn btn-outline"
                >
                  Annuler
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CommandeFournisseurForm