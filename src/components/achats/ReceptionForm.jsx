// src/components/receptions/ReceptionForm.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ArrowLeft, Save, Plus, Trash2, AlertCircle, CheckCircle,
  Package, Truck, DollarSign, Calendar, Building2, FileText, X,
  RefreshCw, ShoppingCart, Users, Clock
} from 'lucide-react'

const ReceptionForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = !!id

  const [formData, setFormData] = useState({
    purchase_order: '',
    notes: '',
    items: []
  })

  const [commandes, setCommandes] = useState([])
  const [commandeSelected, setCommandeSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingCommandes, setLoadingCommandes] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })
  const [totalValue, setTotalValue] = useState(0)

  // Charger les commandes éligibles (confirmées, en transit, partiellement reçues)
  const fetchCommandes = async () => {
    setLoadingCommandes(true)
    try {
      const response = await AxiosInstance.get('/purchase-orders/', {
        params: {
          status__in: 'confirmed,in_transit,partially_received'
        }
      })
      setCommandes(response.data || [])
    } catch (error) {
      console.error('Erreur chargement commandes:', error)
      showNotification('Erreur de chargement des commandes', 'error')
    } finally {
      setLoadingCommandes(false)
    }
  }

  // Charger les détails d'une commande avec ses articles
  const loadCommandeDetails = async (orderId) => {
    if (!orderId) {
      setCommandeSelected(null)
      setFormData(prev => ({ ...prev, items: [] }))
      setTotalValue(0)
      return
    }
    
    setLoading(true)
    try {
      const response = await AxiosInstance.get(`/purchase-orders/${orderId}/`)
      const order = response.data
      setCommandeSelected(order)
      
      // Créer les articles de réception basés sur les articles de la commande
      // avec la quantité restante comme quantité par défaut
      const items = (order.items || []).map(item => {
        const ordered = item.quantity_ordered || 0
        const received = item.quantity_received || 0
        const remaining = ordered - received
        
        return {
          id: item.id,
          product_id: item.product,
          product_name: item.product_name,
          product_reference: item.product_reference,
          quantity_ordered: ordered,
          quantity_received: received,
          remaining_quantity: remaining,
          quantity: remaining > 0 ? remaining : 0,
          unit_price: parseFloat(item.unit_price) || 0,
          total: remaining > 0 ? (parseFloat(item.unit_price) || 0) * remaining : 0,
          quality_ok: true,
          lot_number: '',
          notes: ''
        }
      }).filter(item => item.remaining_quantity > 0) // Garder uniquement les articles avec reste à recevoir
      
      setFormData(prev => ({ ...prev, items }))
      calculateTotalValue(items)
      
    } catch (error) {
      console.error('Erreur chargement détails commande:', error)
      showNotification('Erreur lors du chargement des détails de la commande', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Calculer la valeur totale des articles à recevoir
  const calculateTotalValue = (items) => {
    const total = items.reduce((sum, item) => sum + (item.total || 0), 0)
    setTotalValue(total)
    return total
  }

  // Mettre à jour la quantité d'un article
  const updateItemQuantity = (index, quantity) => {
    const item = formData.items[index]
    const maxQty = item.remaining_quantity
    let newQuantity = parseInt(quantity) || 0
    
    // Limiter à la quantité restante
    if (newQuantity > maxQty) newQuantity = maxQty
    if (newQuantity < 0) newQuantity = 0
    
    const newTotal = (item.unit_price || 0) * newQuantity
    
    const updatedItems = [...formData.items]
    updatedItems[index] = {
      ...item,
      quantity: newQuantity,
      total: newTotal
    }
    
    setFormData(prev => ({ ...prev, items: updatedItems }))
    calculateTotalValue(updatedItems)
  }

  // Mettre à jour la qualité d'un article
  const updateItemQuality = (index, qualityOk) => {
    const updatedItems = [...formData.items]
    updatedItems[index] = {
      ...updatedItems[index],
      quality_ok: qualityOk
    }
    setFormData(prev => ({ ...prev, items: updatedItems }))
  }

  // Mettre à jour le lot d'un article
  const updateItemLot = (index, lotNumber) => {
    const updatedItems = [...formData.items]
    updatedItems[index] = {
      ...updatedItems[index],
      lot_number: lotNumber
    }
    setFormData(prev => ({ ...prev, items: updatedItems }))
  }

  // Supprimer un article de la réception (si on ne veut pas le recevoir)
  const removeItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index)
    setFormData(prev => ({ ...prev, items: updatedItems }))
    calculateTotalValue(updatedItems)
  }

  // Sélectionner/tout recevoir
  const selectAllItems = () => {
    const updatedItems = formData.items.map(item => ({
      ...item,
      quantity: item.remaining_quantity,
      total: (item.unit_price || 0) * item.remaining_quantity
    }))
    setFormData(prev => ({ ...prev, items: updatedItems }))
    calculateTotalValue(updatedItems)
  }

  // Désélectionner tout
  const deselectAllItems = () => {
    const updatedItems = formData.items.map(item => ({
      ...item,
      quantity: 0,
      total: 0
    }))
    setFormData(prev => ({ ...prev, items: updatedItems }))
    calculateTotalValue(updatedItems)
  }

  const fetchReception = async () => {
    if (!isEditMode) return
    setLoading(true)
    try {
      const response = await AxiosInstance.get(`/purchase-receipts/${id}/`)
      const reception = response.data
      setFormData({
        purchase_order: reception.purchase_order?.id || reception.purchase_order,
        notes: reception.notes || '',
        items: reception.items || []
      })
      if (reception.purchase_order) {
        await loadCommandeDetails(reception.purchase_order.id)
      }
    } catch (error) {
      console.error('Erreur chargement réception:', error)
      showNotification('Erreur lors du chargement', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCommandes()
    if (isEditMode) {
      fetchReception()
    }
  }, [id])

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000)
  }

  const handleCommandeChange = (e) => {
    const orderId = e.target.value
    setFormData(prev => ({ ...prev, purchase_order: orderId, items: [] }))
    setTotalValue(0)
    if (orderId) {
      loadCommandeDetails(orderId)
    } else {
      setCommandeSelected(null)
    }
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.purchase_order) {
      newErrors.purchase_order = 'La commande est requise'
    }
    
    const itemsToReceive = formData.items.filter(item => item.quantity > 0)
    if (itemsToReceive.length === 0) {
      newErrors.items = 'Au moins un article doit être reçu'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    
    setSubmitting(true)
    
    const itemsToReceive = formData.items
      .filter(item => item.quantity > 0)
      .map(item => ({
        order_item: item.id,
        quantity: item.quantity,
        quality_checked: true,
        quality_ok: item.quality_ok !== false,
        quality_notes: '',
        lot_number: item.lot_number || '',
        expiry_date: null,
        notes: item.notes || ''
      }))
    
    if (itemsToReceive.length === 0) {
      showNotification('Aucun article à recevoir', 'error')
      setSubmitting(false)
      return
    }

    const submitData = {
      purchase_order: formData.purchase_order,
      notes: formData.notes,
      items: itemsToReceive
    }

    try {
      if (isEditMode) {
        await AxiosInstance.put(`/purchase-receipts/${id}/`, submitData)
        showNotification('Réception modifiée avec succès !', 'success')
      } else {
        await AxiosInstance.post('/purchase-receipts/', submitData)
        showNotification('Réception créée avec succès !', 'success')
      }
      
      setTimeout(() => {
        navigate('/receptions')
      }, 2000)
    } catch (error) {
      console.error('Erreur:', error)
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Erreur lors de l\'enregistrement'
      showNotification(errorMsg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && isEditMode) {
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
            to="/receptions"
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
                <Package className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-base-content">
                {isEditMode ? 'Modifier la réception' : 'Nouvelle réception'}
              </h2>
              <p className="text-base-content/60 text-sm mt-1">
                {isEditMode ? 'Modifiez la réception de marchandises' : 'Enregistrez une réception de marchandises'}
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Sélection de la commande */}
              <div className="form-control w-full mb-6">
                <label className="label">
                  <span className="label-text font-medium flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    Commande fournisseur <span className="text-error">*</span>
                  </span>
                </label>
                <select
                  value={formData.purchase_order}
                  onChange={handleCommandeChange}
                  className={`select select-bordered w-full ${errors.purchase_order ? 'select-error' : ''}`}
                  disabled={isEditMode || loadingCommandes}
                >
                  <option value="">-- Sélectionner une commande --</option>
                  {commandes.map(cmd => (
                    <option key={cmd.id} value={cmd.id}>
                      {cmd.order_number} - {cmd.supplier_name} - {new Date(cmd.order_date).toLocaleDateString()} - {cmd.total?.toLocaleString()} FCFA
                    </option>
                  ))}
                </select>
                {loadingCommandes && (
                  <span className="text-info text-xs mt-1 flex items-center gap-1">
                    <span className="loading loading-spinner loading-xs"></span>
                    Chargement des commandes...
                  </span>
                )}
                {errors.purchase_order && <span className="text-error text-xs mt-1">{errors.purchase_order}</span>}
              </div>

              {/* Informations commande */}
              {commandeSelected && (
                <div className="bg-base-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-primary flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4" />
                      Détails de la commande
                    </h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllItems}
                        className="btn btn-xs btn-primary gap-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Tout recevoir
                      </button>
                      <button
                        type="button"
                        onClick={deselectAllItems}
                        className="btn btn-xs btn-ghost gap-1"
                      >
                        <X className="w-3 h-3" />
                        Tout annuler
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-base-content/50">Fournisseur:</span>
                      <p className="font-medium">{commandeSelected.supplier?.company_name || commandeSelected.supplier_name}</p>
                    </div>
                    <div>
                      <span className="text-base-content/50">Agence:</span>
                      <p>{commandeSelected.agence?.nom || commandeSelected.agence_nom}</p>
                    </div>
                    <div>
                      <span className="text-base-content/50">Date commande:</span>
                      <p>{new Date(commandeSelected.order_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-base-content/50">Total commande:</span>
                      <p className="font-semibold">{commandeSelected.total?.toLocaleString()} FCFA</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Articles à recevoir */}
              {formData.items.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Articles à recevoir
                    <span className="badge badge-primary badge-sm">{formData.items.length} article(s)</span>
                  </h3>
                  {errors.items && <span className="text-error text-sm mb-2 block">{errors.items}</span>}
                  
                  <div className="overflow-x-auto">
                    <table className="table table-zebra table-sm">
                      <thead className="bg-base-200">
                        <tr className="text-sm">
                          <th>Produit</th>
                          <th>Référence</th>
                          <th className="text-center">Commandé</th>
                          <th className="text-center">Déjà reçu</th>
                          <th className="text-center">Restant</th>
                          <th className="text-center">À recevoir</th>
                          <th className="text-right">Prix unit.</th>
                          <th className="text-right">Total</th>
                          <th>Lot</th>
                          <th>Qualité</th>
                          <th></th>
                         </tr>
                      </thead>
                      <tbody>
                        {formData.items.map((item, index) => (
                          <tr key={item.id || index} className="hover">
                            <td className="font-medium">{item.product_name}</td>
                            <td className="text-xs text-base-content/60">{item.product_reference}</td>
                            <td className="text-center">
                              <span className="badge badge-neutral">{item.quantity_ordered}</span>
                             </td>
                            <td className="text-center">
                              <span className="badge badge-info">{item.quantity_received}</span>
                             </td>
                            <td className="text-center">
                              <span className="badge badge-warning">{item.remaining_quantity}</span>
                             </td>
                            <td className="text-center">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItemQuantity(index, e.target.value)}
                                min="0"
                                max={item.remaining_quantity}
                                className="input input-bordered input-xs w-20 text-center"
                                disabled={item.remaining_quantity === 0}
                              />
                             </td>
                            <td className="text-right">{item.unit_price?.toLocaleString()} FCFA</td>
                            <td className="text-right font-semibold">{(item.total || 0).toLocaleString()} FCFA</td>
                            <td>
                              <input
                                type="text"
                                value={item.lot_number || ''}
                                onChange={(e) => updateItemLot(index, e.target.value)}
                                placeholder="Lot"
                                className="input input-bordered input-xs w-24"
                                disabled={item.quantity === 0}
                              />
                             </td>
                            <td className="text-center">
                              <input
                                type="checkbox"
                                checked={item.quality_ok !== false}
                                onChange={(e) => updateItemQuality(index, e.target.checked)}
                                className="checkbox checkbox-success checkbox-xs"
                                disabled={item.quantity === 0}
                              />
                             </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="btn btn-ghost btn-xs text-error"
                                title="Ne pas recevoir cet article"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                             </td>
                           </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-base-100 border-t-2">
                        <tr>
                          <td colSpan="6" className="text-right font-bold">Valeur totale à recevoir</td>
                          <td colSpan="4" className="font-bold text-primary text-lg">{totalValue.toLocaleString()} FCFA</td>
                         </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Aucun article message */}
              {commandeSelected && formData.items.length === 0 && !loading && (
                <div className="alert alert-info mb-6">
                  <AlertCircle className="w-5 h-5" />
                  <span>Tous les articles de cette commande ont déjà été reçus.</span>
                </div>
              )}

              {/* Notes */}
              <div className="form-control w-full mb-6">
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
                  placeholder="Observations sur la réception (qualité, anomalies, etc.)..."
                />
              </div>

              {/* Boutons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-base-200">
                <button 
                  type="submit"
                  disabled={submitting || formData.items.filter(i => i.quantity > 0).length === 0}
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
                      {isEditMode ? 'Modifier la réception' : 'Créer la réception'}
                    </>
                  )}
                </button>
                <Link 
                  to="/receptions" 
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

export default ReceptionForm