// src/pages/transferts/TransfertDetail.jsx
import React, {
  useState, useEffect, useCallback, useRef, useMemo
} from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Send, CheckCircle, XCircle, Ban, Package,
  Building2, Calendar, FileText, AlertTriangle, Truck, Clock,
  RefreshCw, Rocket, PackageCheck, Loader2
} from 'lucide-react'
import AxiosInstance from '../AxiosInstance'

const STATUS_CONFIG = {
  draft: { label: 'Brouillon', color: 'secondary', icon: Clock },
  pending_approval: { label: 'En attente d\'approbation', color: 'warning', icon: Send },
  approved: { label: 'Approuvé', color: 'info', icon: CheckCircle },
  in_transit: { label: 'En transit', color: 'info', icon: Truck },
  partial: { label: 'Partiellement reçu', color: 'warning', icon: Clock },
  completed: { label: 'Terminé', color: 'success', icon: CheckCircle },
  rejected: { label: 'Rejeté', color: 'error', icon: XCircle },
  cancelled: { label: 'Annulé', color: 'neutral', icon: Ban }
}

const TransfertDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [transfer, setTransfer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [agenceCourante, setAgenceCourante] = useState(null)
  const [userRole, setUserRole] = useState('autre')
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [receiveItems, setReceiveItems] = useState([])

  // ✅ Refs cache
  const cacheRef = useRef(new Map())
  const fetchingRef = useRef(false)

  // ✅ Charger user depuis localStorage une seule fois
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('User')
      const storedAgence = localStorage.getItem('AgenceCourante')
      if (storedUser) {
        const parsed = JSON.parse(storedUser)
        setUser(parsed)
        // Calcul du rôle courant
        let role = 'autre'
        if (parsed?.role_global === 'pdg') role = 'pdg'
        else if (parsed?.role_global === 'drh') role = 'drh'
        setUserRole(role)
      }
      if (storedAgence) {
        const parsedAgence = JSON.parse(storedAgence)
        setAgenceCourante(parsedAgence)
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  // ✅ Fetch avec cache
  const fetchTransfer = useCallback(async ({ bypassCache = false } = {}) => {
    const key = `transfer_detail_${id}`

    if (!bypassCache && cacheRef.current.has(key)) {
      const t = cacheRef.current.get(key)
      setTransfer(t)
      setLoading(false)
      setInitialLoad(false)
      return
    }

    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)

    try {
      const res = await AxiosInstance.get(`/transfers/${id}/`)
      cacheRef.current.set(key, res.data)
      if (cacheRef.current.size > 10) {
        const firstKey = cacheRef.current.keys().next().value
        cacheRef.current.delete(firstKey)
      }

      setTransfer(res.data)

      // Initialiser les quantités à recevoir
      if (res.data.items) {
        setReceiveItems(res.data.items.map(item => ({
          item_id: item.id,
          product_name: item.product?.name || item.product_name,
          quantity_requested: item.quantity,
          quantity_received: item.quantity_received || 0,
          quantity_to_receive: 0,
          remaining: item.quantity - (item.quantity_received || 0)
        })))
      }
    } catch (error) {
      console.error('Erreur chargement:', error)
      alert('Erreur chargement du transfert')
      navigate('/transferts')
    } finally {
      setLoading(false)
      setInitialLoad(false)
      fetchingRef.current = false
    }
  }, [id, navigate])

  useEffect(() => {
    if (id) fetchTransfer()
  }, [id, fetchTransfer])

  const refresh = async () => {
    cacheRef.current.clear()
    await fetchTransfer({ bypassCache: true })
  }

  const getStatusBadge = () => {
    if (!transfer) return null
    const config = STATUS_CONFIG[transfer.status] || STATUS_CONFIG.draft
    const Icon = config.icon
    return (
      <span className={`badge badge-lg badge-${config.color} gap-2`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    )
  }

  // ---------- Permissions ----------
  const isChefOfSource = () => {
    if (!transfer || !user) return false
    if (user.role_global === 'pdg') return true
    return user.roles_agence?.some(
      r => r.agence_id === transfer.from_agence?.id
        && r.role === 'chef_agence' && r.est_actif
    )
  }

  const isChefOfDestination = () => {
    if (!transfer || !user) return false
    if (user.role_global === 'pdg') return true
    return user.roles_agence?.some(
      r => r.agence_id === transfer.to_agence?.id
        && r.role === 'chef_agence' && r.est_actif
    )
  }

  const canSubmit = () => transfer?.status === 'draft' && isChefOfDestination()
  const canApprove = () => transfer?.status === 'pending_approval' && isChefOfSource()
  const canReject = () => transfer?.status === 'pending_approval' && isChefOfSource()
  const canStartTransit = () => transfer?.status === 'approved' && isChefOfSource()
  const canReceive = () =>
    (transfer?.status === 'in_transit' || transfer?.status === 'partial')
    && isChefOfDestination()
  const canCancel = () =>
    ['draft', 'pending_approval', 'approved'].includes(transfer?.status)
    && (isChefOfSource() || isChefOfDestination() || user?.role_global === 'pdg')

  // ---------- Actions ----------
  const runAction = async (actionFn, successMsg) => {
    setActionLoading(true)
    try {
      const res = await actionFn()
      if (res.status === 200 || res.status === 201) {
        cacheRef.current.clear()
        await fetchTransfer({ bypassCache: true })
        alert(successMsg)
      }
    } catch (error) {
      console.error(error)
      alert(error.response?.data?.error || 'Une erreur est survenue')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSubmit = () =>
    runAction(
      () => AxiosInstance.post(`/transfers/${id}/submit/`),
      'Demande soumise avec succès !'
    )

  const handleApprove = () =>
    runAction(
      () => AxiosInstance.post(`/transfers/${id}/approve/`),
      'Transfert approuvé ! Le stock a été débloqué.'
    )

  const handleStartTransit = () =>
    runAction(
      () => AxiosInstance.post(`/transfers/${id}/start-transit/`),
      'Transfert marqué comme en transit.'
    )

  const handleReject = async () => {
    const reason = prompt('Motif du rejet :')
    if (!reason && reason !== '') return
    await runAction(
      () => AxiosInstance.post(`/transfers/${id}/reject/`, { reason }),
      'Transfert rejeté.'
    )
  }

  const handleCancel = async () => {
    if (!window.confirm('Annuler ce transfert ?')) return
    await runAction(
      () => AxiosInstance.post(`/transfers/${id}/cancel/`),
      'Transfert annulé.'
    )
  }

  const handleReceive = async () => {
    const itemsToReceive = receiveItems.filter(item => item.quantity_to_receive > 0)
    if (itemsToReceive.length === 0) {
      alert('Veuillez saisir les quantités reçues')
      return
    }
    const waybill = prompt('Numéro de bon de livraison (optionnel) :', '')
    await runAction(
      () => AxiosInstance.post(`/transfers/${id}/receive/`, {
        items: itemsToReceive.map(item => ({
          item_id: item.item_id,
          quantity: item.quantity_to_receive
        })),
        waybill: waybill || '',
        notes: `Réception le ${new Date().toLocaleDateString('fr-FR')}`
      }),
      'Réception enregistrée ! Le stock a été crédité.'
    )
    setShowReceiveModal(false)
  }

  const updateReceiveQuantity = (index, value) => {
    const newItems = [...receiveItems]
    const qty = parseInt(value) || 0
    const maxQty = newItems[index].remaining
    newItems[index].quantity_to_receive = Math.min(qty, maxQty)
    setReceiveItems(newItems)
  }

  // ✅ Totaux mémoïsés
  const totals = useMemo(() => {
    if (!transfer?.items) return { quantity: 0, received: 0, value: 0 }
    return transfer.items.reduce((acc, item) => ({
      quantity: acc.quantity + (item.quantity || 0),
      received: acc.received + (item.quantity_received || 0),
      value: acc.value + ((item.quantity || 0) * (item.unit_price || 0))
    }), { quantity: 0, received: 0, value: 0 })
  }, [transfer])

  // ---------- Premier chargement ----------
  if (initialLoad && loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center space-y-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-base font-medium text-base-content/70 animate-pulse">
            Chargement du transfert...
          </p>
        </div>
      </div>
    )
  }

  if (!transfer) {
    return (
      <div className="alert alert-error m-4">
        <AlertTriangle className="w-5 h-5" />
        Transfert introuvable
      </div>
    )
  }

  return (
    <div className="w-full px-0">
      {/* Spinner overlay pendant actions */}
      {loading && !initialLoad && (
        <div className="fixed top-20 right-6 z-40 animate-slideDown">
          <div className="bg-base-100 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border border-base-300">
            <span className="loading loading-spinner loading-xs text-primary"></span>
            <span className="text-xs text-base-content/60">Chargement...</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-200 px-4 sm:px-6 py-4 shadow-sm">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/transferts')} className="btn btn-ghost btn-sm">
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold font-mono">{transfer.reference}</h1>
                {getStatusBadge()}
              </div>
              <p className="text-xs sm:text-sm text-base-content/60">
                Créé le {new Date(transfer.created_at).toLocaleString('fr-FR')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={refresh} className="btn btn-ghost btn-sm" title="Actualiser">
              <RefreshCw className="w-4 h-4" />
            </button>

            {canSubmit() && (
              <button
                onClick={handleSubmit}
                disabled={actionLoading}
                className="btn btn-warning gap-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Soumettre
              </button>
            )}

            {canApprove() && (
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="btn btn-success gap-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Approuver & Débloquer stock
              </button>
            )}

            {canStartTransit() && (
              <button
                onClick={handleStartTransit}
                disabled={actionLoading}
                className="btn btn-info gap-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                Démarrer transit
              </button>
            )}

            {canReceive() && (
              <button
                onClick={() => setShowReceiveModal(true)}
                disabled={actionLoading}
                className="btn btn-primary gap-2"
              >
                <PackageCheck className="w-4 h-4" /> Réceptionner
              </button>
            )}

            {canReject() && (
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="btn btn-error gap-2"
              >
                <XCircle className="w-4 h-4" /> Rejeter
              </button>
            )}

            {canCancel() && (
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="btn btn-outline gap-2"
              >
                <Ban className="w-4 h-4" /> Annuler
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="px-4 sm:px-6 py-6">
        {/* Cartes info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="card bg-base-100 shadow-md border-l-4 border-primary">
            <div className="card-body p-4">
              <h3 className="font-semibold text-primary">🏢 Agence source</h3>
              <p className="text-lg font-bold break-words">{transfer.from_agence?.nom}</p>
              <p className="text-sm text-base-content/60">
                Type: {transfer.from_agence?.type_agence === 'principale' ? '🏛️ Principale' : '🏪 Secondaire'}
                {isChefOfSource() && (
                  <span className="badge badge-primary badge-xs ml-2">Vous êtes le chef</span>
                )}
              </p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-md border-l-4 border-accent">
            <div className="card-body p-4">
              <h3 className="font-semibold text-accent">📍 Agence destination</h3>
              <p className="text-lg font-bold break-words">{transfer.to_agence?.nom}</p>
              <p className="text-sm text-base-content/60">
                Type: {transfer.to_agence?.type_agence === 'principale' ? '🏛️ Principale' : '🏪 Secondaire'}
                {isChefOfDestination() && (
                  <span className="badge badge-accent badge-xs ml-2">Vous êtes le chef</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Messages d'état */}
        {transfer.status === 'rejected' && transfer.rejected_reason && (
          <div className="alert alert-error mb-6 shadow-md">
            <XCircle className="w-5 h-5" />
            <div>
              <strong>Demande rejetée</strong><br />
              Motif : {transfer.rejected_reason}
            </div>
          </div>
        )}

        {transfer.status === 'approved' && (
          <div className="alert alert-success mb-6 shadow-md">
            <CheckCircle className="w-5 h-5" />
            <div>
              <strong>Transfert approuvé</strong><br />
              Le stock a été débloqué. Vous pouvez maintenant démarrer le transit.
            </div>
          </div>
        )}

        {/* Tableau articles */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="font-bold">📋 Articles du transfert</h3>
              <div className="flex gap-2 flex-wrap">
                <span className="badge badge-primary badge-sm gap-1">
                  <Package className="w-3 h-3" /> {totals.quantity} demandés
                </span>
                <span className="badge badge-success badge-sm gap-1">
                  <CheckCircle className="w-3 h-3" /> {totals.received} reçus
                </span>
                <span className="badge badge-neutral badge-sm gap-1">
                  <Calendar className="w-3 h-3" />
                  {totals.value.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Référence</th>
                    <th className="text-center">Qté demandée</th>
                    <th className="text-center">Qté reçue</th>
                    <th className="text-center">Reste</th>
                    <th className="text-right">Prix unitaire</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {transfer.items?.map((item, idx) => {
                    const received = item.quantity_received || 0
                    const remaining = item.quantity - received
                    return (
                      <tr key={idx}>
                        <td className="font-medium">
                          {item.product?.name || item.product_name}
                        </td>
                        <td className="font-mono text-sm">
                          {item.product?.reference || '-'}
                        </td>
                        <td className="text-center">
                          <span className="badge badge-primary badge-sm">{item.quantity}</span>
                        </td>
                        <td className="text-center">
                          <span className="badge badge-success badge-sm">{received}</span>
                        </td>
                        <td className="text-center">
                          {remaining > 0 ? (
                            <span className="badge badge-warning badge-sm">{remaining}</span>
                          ) : (
                            <span className="badge badge-neutral badge-sm">✓ Complet</span>
                          )}
                        </td>
                        <td className="text-right">
                          {(item.unit_price || 0).toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="text-right font-semibold">
                          {((item.quantity || 0) * (item.unit_price || 0)).toLocaleString('fr-FR')} FCFA
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Notes */}
        {transfer.notes && (
          <div className="card bg-base-100 shadow-md mt-4">
            <div className="card-body p-4">
              <h3 className="font-semibold">📝 Notes</h3>
              <p className="text-sm whitespace-pre-wrap">{transfer.notes}</p>
            </div>
          </div>
        )}

        {/* Workflow */}
        <div className="mt-6 p-4 bg-base-200 rounded-lg">
          <h4 className="font-semibold mb-3">📊 Workflow du transfert</h4>
          <ul className="steps steps-vertical lg:steps-horizontal w-full">
            <li className={`step ${['draft', 'pending_approval', 'approved', 'in_transit', 'partial', 'completed'].includes(transfer.status) ? 'step-primary' : ''}`}>
              📝 Brouillon
            </li>
            <li className={`step ${['pending_approval', 'approved', 'in_transit', 'partial', 'completed'].includes(transfer.status) ? 'step-primary' : ''}`}>
              ⏳ En attente
            </li>
            <li className={`step ${['approved', 'in_transit', 'partial', 'completed'].includes(transfer.status) ? 'step-primary' : ''}`}>
              ✅ Approuvé
            </li>
            <li className={`step ${['in_transit', 'partial', 'completed'].includes(transfer.status) ? 'step-primary' : ''}`}>
              🚚 En transit
            </li>
            <li className={`step ${['partial', 'completed'].includes(transfer.status) ? 'step-primary' : ''}`}>
              📦 Réception partielle
            </li>
            <li className={`step ${transfer.status === 'completed' ? 'step-primary' : ''}`}>
              🎉 Terminé
            </li>
          </ul>
        </div>
      </div>

      {/* Modal réception */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-primary to-primary-focus p-4 text-primary-content">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Réceptionner le transfert</h2>
                <button
                  onClick={() => setShowReceiveModal(false)}
                  className="btn btn-ghost btn-sm text-white"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm opacity-90">
                Saisissez les quantités reçues pour chaque article
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {receiveItems.map((item, idx) => (
                  <div key={idx} className="card bg-base-200">
                    <div className="card-body p-3">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{item.product_name}</p>
                          <p className="text-xs text-base-content/60">
                            Demandé: {item.quantity_requested} |
                            Déjà reçu: {item.quantity_received} |
                            Reste: <strong>{item.remaining}</strong>
                          </p>
                        </div>
                        <div className="form-control w-32">
                          <label className="label p-0 pb-1">
                            <span className="label-text text-xs">À recevoir</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={item.remaining}
                            value={item.quantity_to_receive}
                            onChange={(e) => updateReceiveQuantity(idx, e.target.value)}
                            className="input input-bordered input-sm text-center"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-base-200 p-4 flex gap-3">
              <button
                onClick={handleReceive}
                className="btn btn-primary flex-1 gap-2"
                disabled={actionLoading}
              >
                {actionLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <PackageCheck className="w-4 h-4" />}
                Valider la réception
              </button>
              <button
                onClick={() => setShowReceiveModal(false)}
                className="btn btn-outline"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown { animation: slideDown 0.35s ease-out; }
      `}</style>
    </div>
  )
}

export default TransfertDetail