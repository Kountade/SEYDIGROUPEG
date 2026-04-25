// src/components/achats/CommandeFournisseurDetail.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ArrowLeft, Edit, Printer, Download, Send, CheckCircle, XCircle,
  ShoppingCart, Truck, Clock, DollarSign, Package, Calendar,
  Building2, Users, FileText, AlertCircle, CheckSquare, X
} from 'lucide-react'

const CommandeFournisseurDetail = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  
  const [commande, setCommande] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openStatusDialog, setOpenStatusDialog] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [updating, setUpdating] = useState(false)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })

  const statusConfig = {
    draft: { label: 'Brouillon', color: 'neutral', icon: FileText, bgColor: 'bg-neutral/10', textColor: 'text-neutral', actions: ['sent', 'cancelled'] },
    sent: { label: 'Envoyée', color: 'info', icon: Send, bgColor: 'bg-info/10', textColor: 'text-info', actions: ['confirmed', 'cancelled'] },
    confirmed: { label: 'Confirmée', color: 'primary', icon: CheckCircle, bgColor: 'bg-primary/10', textColor: 'text-primary', actions: ['in_transit', 'cancelled'] },
    in_transit: { label: 'En transit', color: 'warning', icon: Truck, bgColor: 'bg-warning/10', textColor: 'text-warning', actions: ['partially_received', 'received'] },
    partially_received: { label: 'Partiellement reçue', color: 'info', icon: Package, bgColor: 'bg-info/10', textColor: 'text-info', actions: ['received'] },
    received: { label: 'Reçue', color: 'success', icon: CheckSquare, bgColor: 'bg-success/10', textColor: 'text-success', actions: [] },
    cancelled: { label: 'Annulée', color: 'error', icon: XCircle, bgColor: 'bg-error/10', textColor: 'text-error', actions: [] },
    rejected: { label: 'Rejetée', color: 'error', icon: XCircle, bgColor: 'bg-error/10', textColor: 'text-error', actions: [] }
  }

  const urgencyConfig = {
    normal: { label: 'Normal', color: 'success', bgColor: 'bg-success/10', textColor: 'text-success', icon: Clock },
    urgent: { label: 'Urgent', color: 'warning', bgColor: 'bg-warning/10', textColor: 'text-warning', icon: AlertCircle },
    very_urgent: { label: 'Très urgent', color: 'error', bgColor: 'bg-error/10', textColor: 'text-error', icon: AlertCircle }
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000)
  }

  const formatCurrency = (amount) => {
    if (!amount) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    } catch { return 'N/A' }
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch { return 'N/A' }
  }

  const fetchCommande = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('Token')
      if (!token) {
        setError('Veuillez vous connecter')
        setLoading(false)
        return
      }
      
      let response
      try {
        response = await AxiosInstance.get(`/purchase-orders/${id}/`)
      } catch (err) {
        if (err.response?.status === 404) {
          response = await AxiosInstance.get(`/commandes-fournisseurs/${id}/`)
        } else {
          throw err
        }
      }
      setCommande(response.data)
    } catch (error) {
      console.error('Erreur:', error)
      if (error.response?.status === 404) setError('Commande non trouvée')
      else if (error.response?.status === 401) setError('Session expirée')
      else setError('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchCommande()
  }, [id])

  const handleChangeStatus = async () => {
    if (!newStatus) return
    setUpdating(true)
    try {
      await AxiosInstance.patch(`/purchase-orders/${id}/`, { status: newStatus })
      showNotification(`Statut mis à jour avec succès`, 'success')
      fetchCommande()
      setOpenStatusDialog(false)
      setNewStatus('')
    } catch (error) {
      console.error('Erreur:', error)
      let errorMsg = 'Erreur lors de la mise à jour'
      if (error.response?.data?.status) errorMsg = error.response.data.status[0]
      else if (error.response?.data?.error) errorMsg = error.response.data.error
      else if (error.response?.data?.message) errorMsg = error.response.data.message
      showNotification(errorMsg, 'error')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-base-content/60">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error || !commande) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold text-base-content mb-2">{error || 'Commande non trouvée'}</h2>
          <p className="text-base-content/60 mb-4">La commande n'existe pas ou a été supprimée.</p>
          <button onClick={() => navigate('/commandes-fournisseurs')} className="btn btn-primary gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
        </div>
      </div>
    )
  }

  const statusInfo = statusConfig[commande.status] || statusConfig.draft
  const StatusIcon = statusInfo.icon
  const urgencyInfo = urgencyConfig[commande.urgency] || urgencyConfig.normal
  const UrgencyIcon = urgencyInfo.icon
  const possibleActions = statusInfo.actions || []
  const subtotal = commande.items?.reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0) || 0
  const taxTotal = commande.items?.reduce((sum, item) => sum + (parseFloat(item.tax_amount) || 0), 0) || 0
  const grandTotal = commande.total || (subtotal + taxTotal)

  return (
    <div className="min-h-screen bg-base-200 py-4 sm:py-6 px-3 sm:px-4">
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

      <div className="w-full max-w-7xl mx-auto">
        {/* Bouton retour */}
        <div className="mb-4">
          <Link to="/commandes-fournisseurs" className="btn btn-ghost btn-sm gap-2 text-base-content/70 hover:text-primary">
            <ArrowLeft className="w-4 h-4" /> Retour à la liste
          </Link>
        </div>

        {/* En-tête */}
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl shadow-lg mb-6 overflow-hidden">
          <div className="p-5 md:p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                  <ShoppingCart className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-white">{commande.order_number}</h1>
                  <p className="text-white/80 text-sm">Commande du {formatDate(commande.order_date)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {possibleActions.map(action => {
                  const actionConfig = statusConfig[action]
                  const ActionIcon = actionConfig?.icon
                  return (
                    <button key={action} onClick={() => { setNewStatus(action); setOpenStatusDialog(true) }}
                      className="btn btn-sm bg-white/20 hover:bg-white/30 text-white border-none gap-1">
                      {ActionIcon && <ActionIcon className="w-4 h-4" />}
                      {actionConfig?.label}
                    </button>
                  )
                })}
                {commande.status === 'draft' && (
                  <Link to={`/commandes-fournisseurs/${id}/edit`} className="btn btn-sm bg-white/20 hover:bg-white/30 text-white border-none gap-1">
                    <Edit className="w-4 h-4" /> Modifier
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Grille d'informations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
            <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2"><Building2 className="w-4 h-4" /> Fournisseur</h3>
            <p className="font-medium">{commande.supplier?.company_name}</p>
            <p className="text-sm text-base-content/60">{commande.supplier?.code}</p>
          </div>
          <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
            <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> Agence destinataire</h3>
            <p className="font-medium">{commande.agence?.nom}</p>
            <p className="text-sm text-base-content/60">{commande.agence?.ville}</p>
            {commande.shipping_address && <p className="text-sm mt-2">{commande.shipping_address}</p>}
          </div>
          <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
            <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Statut</h3>
            <div className="flex items-center gap-2 mb-2">
              <div className={`badge ${statusInfo.bgColor} ${statusInfo.textColor} gap-1`}><StatusIcon className="w-3 h-3" /> {statusInfo.label}</div>
              <div className={`badge ${urgencyInfo.bgColor} ${urgencyInfo.textColor} gap-1`}><UrgencyIcon className="w-3 h-3" /> {urgencyInfo.label}</div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-base-content/50">Date commande:</span><span>{formatDate(commande.order_date)}</span></div>
              <div className="flex justify-between"><span className="text-base-content/50">Livraison prévue:</span><span className={new Date(commande.expected_date) < new Date() ? 'text-warning' : ''}>{formatDate(commande.expected_date)}</span></div>
            </div>
          </div>
        </div>

        {/* Produits commandés */}
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 mb-6 overflow-hidden">
          <div className="p-4 border-b border-base-200">
            <h3 className="text-md font-semibold text-primary flex items-center gap-2"><Package className="w-5 h-5" /> Produits commandés</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead className="bg-base-200">
                <tr>
                  <th>Produit</th>
                  <th>Référence</th>
                  <th className="text-center">Qté</th>
                  <th className="text-right">Reçue</th>
                  <th className="text-right">Prix</th>
                  <th className="text-center">Remise</th>
                  <th className="text-center">TVA</th>
                  <th className="text-right">Total HT</th>
                  <th className="text-right">Total TTC</th>
                </tr>
              </thead>
              <tbody>
                {commande.items?.map((item, idx) => (
                  <tr key={idx} className="hover">
                    <td className="font-medium">
                      {item.product_name}
                      {item.supplier_reference && <div className="text-xs text-base-content/50">Réf fourn: {item.supplier_reference}</div>}
                    </td>
                    <td className="text-xs font-mono">{item.product_reference}</td>
                    <td className="text-center"><span className="badge badge-neutral">{item.quantity_ordered}</span></td>
                    <td className="text-right">{item.quantity_received || 0}</td>
                    <td className="text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="text-center">{item.discount_rate || 0}%</td>
                    <td className="text-center">{item.tax_rate || 20}%</td>
                    <td className="text-right">{formatCurrency(item.subtotal)}</td>
                    <td className="text-right font-semibold text-primary">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-base-100 border-t-2">
                <tr>
                  <td colSpan="7" className="text-right font-bold">Sous-total HT</td>
                  <td colSpan="2" className="text-right font-bold">{formatCurrency(subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan="7" className="text-right font-bold">Total TVA</td>
                  <td colSpan="2" className="text-right font-bold text-info">{formatCurrency(taxTotal)}</td>
                </tr>
                <tr className="border-t-2 border-primary/30 bg-primary/5">
                  <td colSpan="7" className="text-right font-bold text-lg">Total TTC</td>
                  <td colSpan="2" className="text-right font-bold text-primary text-xl">{formatCurrency(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notes */}
        {(commande.notes || commande.internal_notes) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            {commande.notes && (
              <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
                <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Notes</h3>
                <p className="text-sm whitespace-pre-wrap">{commande.notes}</p>
              </div>
            )}
            {commande.internal_notes && (
              <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
                <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Notes internes</h3>
                <p className="text-sm text-info/70 whitespace-pre-wrap">{commande.internal_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Métadonnées */}
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2"><Calendar className="w-4 h-4" /> Métadonnées</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><label className="text-base-content/50">Créée le</label><p>{formatDateTime(commande.created_at)}</p></div>
            <div><label className="text-base-content/50">Modifiée le</label><p>{formatDateTime(commande.updated_at)}</p></div>
            <div><label className="text-base-content/50">Créée par</label><p>{commande.created_by?.email || 'Système'}</p></div>
            {commande.validated_by && <div><label className="text-base-content/50">Validée par</label><p>{commande.validated_by?.email}</p></div>}
          </div>
        </div>
      </div>

      {/* Modal changement de statut */}
      {openStatusDialog && newStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-base-100 rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className={`p-4 text-center ${statusConfig[newStatus]?.bgColor || 'bg-primary'}`}>
              {React.createElement(statusConfig[newStatus]?.icon || CheckCircle, { className: "h-12 w-12 mx-auto mb-2 text-white" })}
              <h3 className="text-xl font-bold text-white">Changer le statut</h3>
            </div>
            <div className="p-6 text-center">
              <p className="text-base-content/70 mb-4">Voulez-vous changer le statut de la commande ?</p>
              <p className="text-lg font-semibold flex items-center justify-center gap-2 flex-wrap">
                <span className={`badge ${statusInfo.bgColor} ${statusInfo.textColor} gap-1 py-2`}>
                  <StatusIcon className="w-3 h-3" /> {statusInfo.label}
                </span>
                <span>→</span>
                <span className={`badge ${statusConfig[newStatus]?.bgColor} ${statusConfig[newStatus]?.textColor} gap-1 py-2`}>
                  {React.createElement(statusConfig[newStatus]?.icon || CheckCircle, { className: "w-3 h-3" })} {statusConfig[newStatus]?.label}
                </span>
              </p>
            </div>
            <div className="flex gap-3 p-4 bg-base-200">
              <button onClick={() => setOpenStatusDialog(false)} className="btn btn-ghost flex-1">Annuler</button>
              <button onClick={handleChangeStatus} disabled={updating} className="btn btn-primary flex-1">
                {updating ? <span className="loading loading-spinner loading-sm"></span> : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CommandeFournisseurDetail