// src/components/inventaire/InventoryCountDetail.jsx
import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ArrowLeft, PlayCircle, CheckCircle2, ShieldCheck, XCircle,
  RefreshCw, AlertCircle, Loader2, Warehouse, Calendar, User,
  Package, TrendingUp, TrendingDown, Info, X
} from 'lucide-react'
import InventoryCountStatusBadge from './InventoryCountStatusBadge'
import InventoryCountItemsTable from './InventoryCountItemsTable'

const InventoryCountDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [inventory, setInventory] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [savingItem, setSavingItem] = useState(false)

  const [notification, setNotification] = useState({
    show: false, message: '', type: 'success'
  })

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000)
  }

  const fetchData = useCallback(async () => {
    try {
      const invRes = await AxiosInstance.get(`/inventory-counts/${id}/`)
      const inv = invRes.data
      setInventory(inv)
      setItems(inv.items || [])
    } catch (err) {
      console.error('Erreur:', err)
      showNotification('Erreur de chargement', 'error')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  const refreshData = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
    showNotification('Données actualisées', 'success')
  }

  // ✅ Enregistrer un item compté
  const handleSaveItem = async (itemId, countedQuantity) => {
    setSavingItem(true)
    try {
      await AxiosInstance.patch(
        `/inventory-counts/${id}/items/${itemId}/`,
        { counted_quantity: countedQuantity, is_counted: true }
      )
      await fetchData()
      showNotification('Article enregistré', 'success')
    } catch (err) {
      console.error(err)
      showNotification('Erreur lors de l\'enregistrement', 'error')
    } finally {
      setSavingItem(false)
    }
  }

  // ✅ Démarrer l'inventaire (draft → in_progress)
  const handleStart = async () => {
    if (!window.confirm('Démarrer l\'inventaire ?')) return
    setActionLoading(true)
    try {
      await AxiosInstance.patch(`/inventory-counts/${id}/`, { status: 'in_progress' })
      await fetchData()
      showNotification('Inventaire démarré', 'success')
    } catch (err) {
      console.error(err)
      showNotification('Erreur lors du démarrage', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // ✅ Terminer l'inventaire (in_progress → completed)
  const handleComplete = async () => {
    if (!window.confirm('Terminer l\'inventaire ? Les écarts seront calculés.')) return
    setActionLoading(true)
    try {
      await AxiosInstance.patch(`/inventory-counts/${id}/`, { status: 'completed' })
      await fetchData()
      showNotification('Inventaire terminé', 'success')
    } catch (err) {
      console.error(err)
      showNotification('Erreur lors de la clôture', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // ✅ Valider l'inventaire (completed → validated) + créer mouvements
  const handleValidate = async () => {
    if (!window.confirm(
      'Valider définitivement cet inventaire ? Des ajustements de stock seront créés.'
    )) return
    setActionLoading(true)
    try {
      await AxiosInstance.patch(`/inventory-counts/${id}/validate/`, {
        notes: 'Validation depuis l\'interface',
        create_movements: true
      })
      await fetchData()
      showNotification('Inventaire validé et ajustements créés', 'success')
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.error || 'Erreur lors de la validation'
      showNotification(msg, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // ✅ Annuler l'inventaire
  const handleCancel = async () => {
    if (!window.confirm('Annuler cet inventaire ?')) return
    setActionLoading(true)
    try {
      await AxiosInstance.patch(`/inventory-counts/${id}/`, { status: 'cancelled' })
      await fetchData()
      showNotification('Inventaire annulé', 'success')
    } catch (err) {
      console.error(err)
      showNotification('Erreur lors de l\'annulation', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }

  if (!inventory) {
    return (
      <div className="p-12 text-center">
        <Package className="w-16 h-16 mx-auto text-error mb-4" />
        <h2 className="text-2xl font-bold">Inventaire non trouvé</h2>
        <Link to="/inventaire/inventory-counts" className="btn btn-primary mt-4">
          Retour à la liste
        </Link>
      </div>
    )
  }

  const isReadOnly = ['completed', 'validated', 'cancelled'].includes(inventory.status)
  const canStart = inventory.status === 'draft'
  const canComplete = inventory.status === 'in_progress'
  const canValidate = inventory.status === 'completed'
  const canCancel = ['draft', 'in_progress'].includes(inventory.status)

  const formatPrice = (v) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'XOF', maximumFractionDigits: 0,
    }).format(v || 0)

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    }) : '-'

  return (
    <div className="space-y-6 p-4 lg:p-6 bg-gradient-to-br from-base-200 to-base-100 min-h-screen">
      {notification.show && (
        <div className="fixed top-20 right-6 z-50 animate-slideDown">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg`}>
            {notification.type === 'success'
              ? <CheckCircle2 className="w-5 h-5" />
              : <AlertCircle className="w-5 h-5" />}
            <span className="font-semibold">{notification.message}</span>
            <button
              className="btn btn-ghost btn-xs btn-circle"
              onClick={() => setNotification({ ...notification, show: false })}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/inventaire/inventory-counts')}
            className="btn btn-ghost btn-circle"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3">
              {inventory.reference}
              <InventoryCountStatusBadge status={inventory.status} />
            </h1>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-base-content/60">
              <span className="flex items-center gap-1">
                <Warehouse className="w-4 h-4" /> {inventory.warehouse_name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" /> {formatDate(inventory.count_date)}
              </span>
              {inventory.counted_by_name && (
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" /> {inventory.counted_by_name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="btn btn-outline gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </button>

          {canStart && (
            <button
              onClick={handleStart}
              disabled={actionLoading}
              className="btn btn-warning gap-2"
            >
              <PlayCircle className="w-4 h-4" /> Démarrer
            </button>
          )}

          {canComplete && (
            <button
              onClick={handleComplete}
              disabled={actionLoading}
              className="btn btn-info gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Terminer
            </button>
          )}

          {canValidate && (
            <button
              onClick={handleValidate}
              disabled={actionLoading}
              className="btn btn-success gap-2"
            >
              <ShieldCheck className="w-4 h-4" /> Valider
            </button>
          )}

          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="btn btn-error btn-outline gap-2"
            >
              <XCircle className="w-4 h-4" /> Annuler
            </button>
          )}
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-primary"><Package className="w-8 h-8" /></div>
          <div className="stat-title text-sm font-semibold">Articles</div>
          <div className="stat-value text-3xl font-black">{inventory.total_items}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-warning"><AlertCircle className="w-8 h-8" /></div>
          <div className="stat-title text-sm font-semibold">Écarts</div>
          <div className="stat-value text-3xl font-black">{inventory.total_differences}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-success"><TrendingUp className="w-8 h-8" /></div>
          <div className="stat-title text-sm font-semibold">Valeur écart</div>
          <div className="stat-value text-xl font-black">
            {formatPrice(inventory.total_difference_value)}
          </div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-info"><CheckCircle2 className="w-8 h-8" /></div>
          <div className="stat-title text-sm font-semibold">Progression</div>
          <div className="stat-value text-3xl font-black">
            {items.length > 0
              ? Math.round(items.filter(i => i.is_counted).length / items.length * 100)
              : 0}%
          </div>
        </div>
      </div>

      {/* Notes */}
      {inventory.notes && (
        <div className="alert bg-info/10 border border-info/20">
          <Info className="w-5 h-5 text-info" />
          <div>
            <p className="font-semibold text-sm">Notes</p>
            <p className="text-sm text-base-content/70">{inventory.notes}</p>
          </div>
        </div>
      )}

      {/* Tableau des articles */}
      <div className="bg-base-100 rounded-xl shadow-xl border border-base-300 p-4 lg:p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Articles à compter
        </h2>

        <InventoryCountItemsTable
          items={items}
          onSaveItem={handleSaveItem}
          saving={savingItem}
          readOnly={isReadOnly}
        />
      </div>

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
      `}</style>
    </div>
  )
}

export default InventoryCountDetail