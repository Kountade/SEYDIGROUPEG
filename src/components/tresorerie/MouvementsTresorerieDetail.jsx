// src/components/tresorerie/MouvementsTresorerieDetail.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ArrowLeft, Edit, RefreshCw, AlertCircle, CheckCircle,
  Loader2, ArrowLeftRight, Coins, PiggyBank, Clock,
  TrendingUp, TrendingDown, FileText,
  X, Banknote, CreditCard, Smartphone, XCircle
} from 'lucide-react'

const MouvementsTresorerieDetail = () => {
  const navigate = useNavigate()
  const { id } = useParams()

  const [mouvement, setMouvement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [error, setError] = useState(null)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })

  const abortRef = useRef(null)
  const notifTimerRef = useRef(null)

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type })
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current)
    notifTimerRef.current = setTimeout(
      () => setNotification({ show: false, message: '', type: 'success' }),
      4000
    )
  }, [])

  useEffect(() => {
    return () => {
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  const fetchData = useCallback(async () => {
    if (!id) return
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    try {
      const res = await AxiosInstance.get(`/mouvements/${id}/`, { signal: controller.signal })
      setMouvement(res.data)
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
      console.error('Erreur chargement mouvement:', err)
      if (err.response?.status === 404) setError('Mouvement introuvable')
      else if (err.response?.status === 401) setError('Session expirée, veuillez vous reconnecter')
      else if (err.response?.status === 403) setError("Vous n'avez pas les droits pour voir ce mouvement")
      else setError('Erreur de chargement des données')
      showNotification('Erreur de chargement des données', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, showNotification])

  useEffect(() => { fetchData() }, [fetchData])

  // ✅ Optimistic update
  const handleAction = async (action) => {
    if (actionLoading) return
    setActionLoading(action)

    const prevStatus = mouvement.status
    const optimisticStatus = action === 'valider' ? 'effectue' : 'annule'
    setMouvement(prev => ({ ...prev, status: optimisticStatus }))

    try {
      await AxiosInstance.post(`/mouvements/${id}/${action}/`)
      showNotification(
        action === 'valider' ? 'Mouvement validé avec succès' : 'Mouvement annulé avec succès',
        'success'
      )
      // Re-fetch pour récupérer les champs serveur (date_validation, valide_par, etc.)
      await fetchData()
    } catch (err) {
      setMouvement(prev => ({ ...prev, status: prevStatus }))
      showNotification(
        err.response?.data?.error || err.response?.data?.detail ||
        (action === 'valider' ? 'Erreur lors de la validation' : "Erreur lors de l'annulation"),
        'error'
      )
    } finally {
      setActionLoading(null)
    }
  }

  const formatMontant = (montant) => {
    const n = Number(montant)
    if (!Number.isFinite(n)) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n) + ' FCFA'
  }

  const formatDate = (dateString, withTime = true) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
      })
    } catch { return '-' }
  }

  const getTypeBadge = (type) => {
    if (type === 'encaissement') return <span className="badge badge-success badge-lg gap-2"><TrendingUp className="w-4 h-4" /> Encaissement</span>
    if (type === 'decaissement') return <span className="badge badge-error badge-lg gap-2"><TrendingDown className="w-4 h-4" /> Décaissement</span>
    if (type === 'transfert') return <span className="badge badge-info badge-lg gap-2"><ArrowLeftRight className="w-4 h-4" /> Transfert</span>
    return <span className="badge badge-ghost badge-lg">{type || 'Inconnu'}</span>
  }

  const getStatusBadge = (status) => {
    const map = {
      effectue: <span className="badge badge-success badge-lg gap-2"><CheckCircle className="w-4 h-4" /> Effectué</span>,
      planifie: <span className="badge badge-warning badge-lg gap-2"><Clock className="w-4 h-4" /> Planifié</span>,
      en_attente: <span className="badge badge-info badge-lg gap-2"><Clock className="w-4 h-4" /> En attente</span>,
      annule: <span className="badge badge-ghost badge-lg gap-2"><X className="w-4 h-4" /> Annulé</span>,
      rejete: <span className="badge badge-error badge-lg gap-2"><XCircle className="w-4 h-4" /> Rejeté</span>,
    }
    return map[status] || <span className="badge badge-ghost badge-lg">{status || 'Inconnu'}</span>
  }

  const getModePaiementIcon = (mode) => {
    const icons = {
      especes: <Banknote className="w-5 h-5" />,
      carte: <CreditCard className="w-5 h-5" />,
      cheque: <FileText className="w-5 h-5" />,
      virement: <ArrowLeftRight className="w-5 h-5" />,
      mobile_money: <Smartphone className="w-5 h-5" />,
      mobile: <Smartphone className="w-5 h-5" />,
      prelevement: <Banknote className="w-5 h-5" />,
      autre: <Banknote className="w-5 h-5" />,
    }
    return icons[mode] || <Banknote className="w-5 h-5" />
  }

  if (loading && !mouvement) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement des détails...
          </p>
        </div>
      </div>
    )
  }

  if (error || !mouvement) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold text-base-content mb-2">Erreur</h2>
          <p className="text-base-content/60 mb-4">{error || 'Mouvement non trouvé'}</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => navigate('/mouvements')} className="btn btn-ghost gap-2">
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
            <button onClick={fetchData} className="btn btn-primary gap-2">
              <RefreshCw className="w-4 h-4" /> Réessayer
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-16 right-3 sm:right-6 z-50 animate-slideDown">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg text-sm sm:text-base`}>
            {notification.type === 'success'
              ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              : <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
            <span className="font-semibold">{notification.message}</span>
            <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setNotification({ ...notification, show: false })}>
              <X className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <button onClick={() => navigate('/mouvements')} className="btn btn-ghost btn-sm gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-base-content">
              {mouvement.reference || 'Mouvement'}
            </h1>
            <div className="text-xs sm:text-sm text-base-content/60 mt-1 flex flex-wrap items-center gap-2">
              {getTypeBadge(mouvement.type_mouvement)}
              {getStatusBadge(mouvement.status)}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={fetchData} className="btn btn-sm btn-outline gap-1" disabled={loading}>
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Actualiser
          </button>
          {mouvement.status === 'en_attente' && (
            <button onClick={() => handleAction('valider')} className="btn btn-sm btn-success gap-1" disabled={!!actionLoading}>
              {actionLoading === 'valider' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
              Valider
            </button>
          )}
          {(mouvement.status === 'en_attente' || mouvement.status === 'planifie') && (
            <button onClick={() => handleAction('annuler')} className="btn btn-sm btn-warning gap-1" disabled={!!actionLoading}>
              {actionLoading === 'annuler' ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
              Annuler
            </button>
          )}
          <Link to={`/mouvements/${id}/edit`} className="btn btn-sm btn-primary gap-1">
            <Edit className="w-3 h-3" /> Modifier
          </Link>
        </div>
      </div>

      {/* Cartes principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <p className="text-xs text-base-content/60">Montant</p>
          <p className={`text-2xl font-bold ${mouvement.type_mouvement === 'encaissement' ? 'text-success' : mouvement.type_mouvement === 'decaissement' ? 'text-error' : ''}`}>
            {mouvement.type_mouvement === 'encaissement' ? '+' : mouvement.type_mouvement === 'decaissement' ? '-' : ''}
            {formatMontant(mouvement.montant)}
          </p>
        </div>
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <p className="text-xs text-base-content/60">Mode de paiement</p>
          <div className="flex items-center gap-2 mt-1">
            {getModePaiementIcon(mouvement.mode_paiement)}
            <span className="text-lg font-medium">{mouvement.mode_paiement_display || mouvement.mode_paiement || 'Non défini'}</span>
          </div>
        </div>
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <p className="text-xs text-base-content/60">Date du mouvement</p>
          <p className="text-lg font-medium">{formatDate(mouvement.date_mouvement)}</p>
          {mouvement.date_valeur && (
            <p className="text-xs text-base-content/40">Valeur: {formatDate(mouvement.date_valeur, false)}</p>
          )}
        </div>
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <p className="text-xs text-base-content/60">Source</p>
          <p className="text-sm font-medium">{mouvement.source_type_display || mouvement.source_type || 'Non spécifié'}</p>
          {mouvement.source_reference && (
            <p className="text-xs text-base-content/40 font-mono">{mouvement.source_reference}</p>
          )}
        </div>
      </div>

      {/* Détails */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <h3 className="text-sm font-semibold text-base-content/60 mb-3">📋 Informations générales</h3>
          <div className="space-y-2">
            <div className="flex justify-between py-1 border-b border-base-200">
              <span className="text-sm text-base-content/60">Référence</span>
              <span className="text-sm font-mono font-medium">{mouvement.reference || '-'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-base-200">
              <span className="text-sm text-base-content/60">Libellé</span>
              <span className="text-sm font-medium">{mouvement.libelle || '-'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-base-200">
              <span className="text-sm text-base-content/60">Agence</span>
              <span className="text-sm">{mouvement.agence_nom || 'Non spécifié'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-base-200">
              <span className="text-sm text-base-content/60">Statut</span>
              <span>{getStatusBadge(mouvement.status)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-base-content/60">Date de création</span>
              <span className="text-sm">{formatDate(mouvement.created_at)}</span>
            </div>
            {mouvement.valide_par && (
              <div className="flex justify-between py-1">
                <span className="text-sm text-base-content/60">Validé le</span>
                <span className="text-sm">{formatDate(mouvement.date_validation)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <h3 className="text-sm font-semibold text-base-content/60 mb-3">🏦 Informations bancaires</h3>
          <div className="space-y-2">
            <div className="flex justify-between py-1 border-b border-base-200">
              <span className="text-sm text-base-content/60">Caisse</span>
              <span className="text-sm font-medium">
                {mouvement.caisse_nom ? (
                  <span className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-info" />
                    {mouvement.caisse_nom}
                  </span>
                ) : '-'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-base-200">
              <span className="text-sm text-base-content/60">Compte bancaire</span>
              <span className="text-sm font-medium">
                {mouvement.compte_bancaire_nom ? (
                  <span className="flex items-center gap-1">
                    <PiggyBank className="w-4 h-4 text-primary" />
                    {mouvement.compte_bancaire_nom}
                  </span>
                ) : '-'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-base-200">
              <span className="text-sm text-base-content/60">Référence externe</span>
              <span className="text-sm font-mono">{mouvement.reference_externe || '-'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-base-200">
              <span className="text-sm text-base-content/60">Pièce justificative</span>
              <span className="text-sm font-mono">{mouvement.piece_justificative || '-'}</span>
            </div>
            {mouvement.ecriture && (
              <div className="flex justify-between py-1">
                <span className="text-sm text-base-content/60">Écriture comptable</span>
                <span className="text-sm font-mono text-primary">
                  <Link to={`/ecritures/${mouvement.ecriture}`} className="hover:underline">
                    #{mouvement.ecriture}
                  </Link>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {mouvement.notes && (
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <h3 className="text-sm font-semibold text-base-content/60 mb-2">📝 Notes</h3>
          <p className="text-sm text-base-content/70 whitespace-pre-wrap">{mouvement.notes}</p>
        </div>
      )}

      {/* Actions rapides */}
      <div className="flex flex-wrap gap-2">
        {mouvement.status === 'en_attente' && (
          <button onClick={() => handleAction('valider')} className="btn btn-success gap-2" disabled={!!actionLoading}>
            {actionLoading === 'valider' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Valider le mouvement
          </button>
        )}
        {(mouvement.status === 'en_attente' || mouvement.status === 'planifie') && (
          <button onClick={() => handleAction('annuler')} className="btn btn-warning gap-2" disabled={!!actionLoading}>
            {actionLoading === 'annuler' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            Annuler le mouvement
          </button>
        )}
        <Link to={`/mouvements/${id}/edit`} className="btn btn-primary gap-2">
          <Edit className="w-4 h-4" /> Modifier
        </Link>
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

export default MouvementsTresorerieDetail