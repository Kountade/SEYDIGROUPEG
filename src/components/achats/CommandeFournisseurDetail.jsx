// src/components/commandes-fournisseurs/CommandeFournisseurDetail.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ArrowLeft, Edit, Printer, Download, Send, CheckCircle, XCircle,
  ShoppingCart, Truck, Clock, DollarSign, Package, Calendar,
  Building2, Users, FileText, AlertCircle, Eye
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

  const statusConfig = {
    draft: { label: 'Brouillon', color: 'neutral', icon: FileText, actions: ['sent', 'cancelled'] },
    sent: { label: 'Envoyée', color: 'info', icon: Send, actions: ['confirmed', 'cancelled'] },
    confirmed: { label: 'Confirmée', color: 'primary', icon: CheckCircle, actions: ['in_transit', 'cancelled'] },
    in_transit: { label: 'En transit', color: 'warning', icon: Truck, actions: ['partially_received', 'received'] },
    partially_received: { label: 'Partiellement reçue', color: 'info', icon: Package, actions: ['received'] },
    received: { label: 'Reçue', color: 'success', icon: CheckCircle, actions: [] },
    cancelled: { label: 'Annulée', color: 'error', icon: XCircle, actions: [] },
    rejected: { label: 'Rejetée', color: 'error', icon: XCircle, actions: [] }
  }

  const urgencyConfig = {
    normal: { label: 'Normal', color: 'success' },
    urgent: { label: 'Urgent', color: 'warning' },
    very_urgent: { label: 'Très urgent', color: 'error' }
  }

  const formatCurrency = (amount) => {
    if (!amount) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const fetchCommande = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await AxiosInstance.get(`/purchase-orders/${id}/`)
      setCommande(response.data)
    } catch (error) {
      console.error('Erreur chargement commande:', error)
      if (error.response?.status === 404) {
        setError('Commande non trouvée')
      } else {
        setError('Erreur lors du chargement des données')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchCommande()
    }
  }, [id])

  const handleChangeStatus = async () => {
    if (!newStatus) return
    setUpdating(true)
    try {
      await AxiosInstance.patch(`/purchase-orders/${id}/`, { status: newStatus })
      fetchCommande()
      setOpenStatusDialog(false)
      setNewStatus('')
    } catch (error) {
      console.error('Erreur:', error)
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
          <button onClick={() => navigate('/commandes-fournisseurs')} className="btn btn-primary gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour à la liste
          </button>
        </div>
      </div>
    )
  }

  const statusInfo = statusConfig[commande.status] || statusConfig.draft
  const StatusIcon = statusInfo.icon
  const urgencyInfo = urgencyConfig[commande.urgency] || urgencyConfig.normal
  const canEdit = commande.status === 'draft'
  const possibleActions = statusInfo.actions || []

  return (
    <div className="min-h-screen bg-base-200 py-6 px-4">
      <div className="w-full max-w-6xl mx-auto">
        
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

        {/* En-tête */}
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl shadow-lg mb-6 overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
                  <ShoppingCart className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    {commande.order_number}
                  </h1>
                  <p className="text-white/80 text-sm">
                    Commande du {formatDate(commande.order_date)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {possibleActions.map(action => (
                  <button
                    key={action}
                    onClick={() => {
                      setNewStatus(action)
                      setOpenStatusDialog(true)
                    }}
                    className="btn btn-sm bg-white/20 hover:bg-white/30 text-white border-none gap-2"
                  >
                    {statusConfig[action]?.icon && React.createElement(statusConfig[action].icon, { className: "w-4 h-4" })}
                    {statusConfig[action]?.label}
                  </button>
                ))}
                {canEdit && (
                  <Link 
                    to={`/commandes-fournisseurs/${id}/edit`}
                    className="btn btn-sm bg-white/20 hover:bg-white/30 text-white border-none gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Modifier
                  </Link>
                )}
                <button className="btn btn-sm bg-white/20 hover:bg-white/30 text-white border-none gap-2">
                  <Printer className="w-4 h-4" />
                  Imprimer
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Informations générales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-5">
            <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Fournisseur
            </h3>
            <p className="font-medium">{commande.supplier?.company_name}</p>
            <p className="text-sm text-base-content/60">{commande.supplier?.code}</p>
            {commande.supplier_reference && (
              <p className="text-sm text-base-content/60 mt-2">
                Réf. fournisseur: {commande.supplier_reference}
              </p>
            )}
          </div>

          <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-5">
            <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Agence destinataire
            </h3>
            <p className="font-medium">{commande.agence?.nom}</p>
            <p className="text-sm text-base-content/60">{commande.agence?.ville}</p>
          </div>

          <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-5">
            <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Statut
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <div className={`badge badge-${statusInfo.color} gap-1 text-sm`}>
                <StatusIcon className="w-3 h-3" />
                {statusInfo.label}
              </div>
              <div className={`badge badge-${urgencyInfo.color} badge-outline gap-1 text-sm`}>
                <Clock className="w-3 h-3" />
                {urgencyInfo.label}
              </div>
            </div>
            <p className="text-sm">
              Livraison prévue: <strong>{formatDate(commande.expected_date)}</strong>
            </p>
          </div>
        </div>

        {/* Produits commandés */}
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 mb-6 overflow-hidden">
          <div className="p-5 border-b border-base-200">
            <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
              <Package className="w-5 h-5" />
              Produits commandés
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Référence</th>
                  <th>Quantité</th>
                  <th>Prix unit.</th>
                  <th>Remise</th>
                  <th>TVA</th>
                  <th>Total HT</th>
                  <th>Total TTC</th>
                </tr>
              </thead>
              <tbody>
                {commande.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.product_name}</td>
                    <td className="text-xs">{item.product_reference}</td>
                    <td>{item.quantity_ordered}</td>
                    <td>{formatCurrency(item.unit_price)}</td>
                    <td>{item.discount_rate}%</td>
                    <td>{item.tax_rate}%</td>
                    <td>{formatCurrency(item.subtotal)}</td>
                    <td className="font-semibold">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2">
                <tr>
                  <td colSpan="6" className="text-right font-bold">Sous-total</td>
                  <td colSpan="2">{formatCurrency(commande.subtotal)}</td>
                </tr>
                {commande.shipping_cost > 0 && (
                  <tr>
                    <td colSpan="6" className="text-right">Frais de livraison</td>
                    <td colSpan="2">{formatCurrency(commande.shipping_cost)}</td>
                  </tr>
                )}
                {commande.discount > 0 && (
                  <tr>
                    <td colSpan="6" className="text-right">Remise</td>
                    <td colSpan="2">-{formatCurrency(commande.discount)}</td>
                  </tr>
                )}
                <tr className="border-t-2">
                  <td colSpan="6" className="text-right font-bold text-lg">Total TTC</td>
                  <td colSpan="2" className="font-bold text-lg text-primary">{formatCurrency(commande.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notes */}
        {(commande.notes || commande.internal_notes) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {commande.notes && (
              <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-5">
                <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notes
                </h3>
                <p className="text-sm whitespace-pre-wrap">{commande.notes}</p>
              </div>
            )}
            {commande.internal_notes && (
              <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-5">
                <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notes internes
                </h3>
                <p className="text-sm text-info/70 whitespace-pre-wrap">{commande.internal_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Métadonnées */}
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-5">
          <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Métadonnées
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <label className="text-base-content/50">Créée le</label>
              <p>{formatDateTime(commande.created_at)}</p>
            </div>
            <div>
              <label className="text-base-content/50">Dernière modification</label>
              <p>{formatDateTime(commande.updated_at)}</p>
            </div>
            <div>
              <label className="text-base-content/50">Créée par</label>
              <p>{commande.created_by?.email || 'Système'}</p>
            </div>
            {commande.validated_by && (
              <div>
                <label className="text-base-content/50">Validée par</label>
                <p>{commande.validated_by?.email}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal changement de statut */}
      {openStatusDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-base-100 rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="p-4 bg-primary text-white text-center">
              <h3 className="text-xl font-bold">Changer le statut</h3>
            </div>
            <div className="p-6 text-center">
              <p className="text-base-content/70 mb-4">
                Voulez-vous changer le statut de la commande ?
              </p>
              <p className="text-lg font-semibold">
                De <span className="badge badge-neutral">{statusInfo.label}</span>
                <span className="mx-2">→</span>
                <span className="badge badge-primary">{statusConfig[newStatus]?.label}</span>
              </p>
            </div>
            <div className="flex gap-3 p-4 bg-base-200">
              <button onClick={() => setOpenStatusDialog(false)} className="btn btn-ghost flex-1">
                Annuler
              </button>
              <button 
                onClick={handleChangeStatus} 
                disabled={updating}
                className="btn btn-primary flex-1"
              >
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