// src/components/tresorerie/RapprochementsDetail.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ArrowLeft, Edit, RefreshCw, AlertCircle, CheckCircle,
  Loader2, PiggyBank, Clock, Calendar, X, Scale, AlertTriangle,
  TrendingUp, TrendingDown, Printer, Download,
} from 'lucide-react'

const RapprochementsDetail = () => {
  const navigate = useNavigate()
  const { id } = useParams()

  const [rapprochement, setRapprochement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })

  const abortRef = useRef(null)
  const notifTimerRef = useRef(null)

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type })
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current)
    notifTimerRef.current = setTimeout(
      () => setNotification({ show: false, message: '', type: 'success' }), 4000
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

    setLoading(true); setError(null)
    try {
      const res = await AxiosInstance.get(`/rapprochements/${id}/`, { signal: controller.signal })
      setRapprochement(res.data)
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
      console.error('Erreur chargement rapprochement:', err)
      if (err.response?.status === 404) setError('Rapprochement introuvable')
      else if (err.response?.status === 401) setError('Session expirée, veuillez vous reconnecter')
      else if (err.response?.status === 403) setError("Vous n'avez pas les droits pour voir ce rapprochement")
      else setError('Erreur de chargement des données')
      showNotification('Erreur de chargement des données', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, showNotification])

  useEffect(() => { fetchData() }, [fetchData])

  const handleValider = async () => {
    if (actionLoading) return
    setActionLoading(true)

    const prevStatus = rapprochement.status
    setRapprochement(prev => ({ ...prev, status: 'complete' }))

    try {
      await AxiosInstance.post(`/rapprochements/${id}/valider/`)
      showNotification('Rapprochement validé avec succès', 'success')
      await fetchData()
    } catch (err) {
      setRapprochement(prev => ({ ...prev, status: prevStatus }))
      showNotification(
        err.response?.data?.error || err.response?.data?.detail || 'Erreur lors de la validation',
        'error'
      )
    } finally {
      setActionLoading(false)
    }
  }

  // ✅ Boutons "Imprimer" / "Exporter" fonctionnels
  const handlePrint = () => window.print()
  const handleExport = () => {
    if (!rapprochement) return
    const dataStr = JSON.stringify(rapprochement, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `rapprochement_${rapprochement.reference || id}.json`
    link.click()
    URL.revokeObjectURL(url)
    showNotification('Rapprochement exporté en JSON', 'success')
  }

  const getStatusBadge = (status) => {
    const map = {
      brouillon: <span className="badge badge-ghost badge-lg">Brouillon</span>,
      en_cours: <span className="badge badge-warning badge-lg gap-2"><Clock className="w-4 h-4" /> En cours</span>,
      partiel: <span className="badge badge-info badge-lg gap-2"><AlertTriangle className="w-4 h-4" /> Partiel</span>,
      complete: <span className="badge badge-success badge-lg gap-2"><CheckCircle className="w-4 h-4" /> Complet</span>,
      ecart: <span className="badge badge-error badge-lg gap-2"><AlertTriangle className="w-4 h-4" /> Écart</span>,
    }
    return map[status] || <span className="badge badge-ghost badge-lg">{status || 'Inconnu'}</span>
  }

  const formatMontant = (montant) => {
    const n = Number(montant)
    if (!Number.isFinite(n)) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n) + ' FCFA'
  }

  const formatDate = (dateString, withTime = false) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
      })
    } catch { return '-' }
  }

  const getEcartColor = (ecart) => {
    const n = Number(ecart) || 0
    if (Math.abs(n) < 1) return 'text-success'
    if (n > 0) return 'text-error'
    return 'text-warning'
  }

  const getEcartIcon = (ecart) => {
    const n = Number(ecart) || 0
    if (Math.abs(n) < 1) return <CheckCircle className="w-5 h-5 text-success" />
    if (n > 0) return <TrendingUp className="w-5 h-5 text-error" />
    return <TrendingDown className="w-5 h-5 text-warning" />
  }

  if (loading && !rapprochement) {
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

  if (error || !rapprochement) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold text-base-content mb-2">Erreur</h2>
          <p className="text-base-content/60 mb-4">{error || 'Rapprochement non trouvé'}</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => navigate('/rapprochements')} className="btn btn-ghost gap-2">
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

  const ecartN = Number(rapprochement.ecart) || 0
  const isRapproche = Math.abs(ecartN) < 1
  const totalAjustements = (Number(rapprochement.solde_rapproche) || 0) - (Number(rapprochement.solde_comptable) || 0)

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <button onClick={() => navigate('/rapprochements')} className="btn btn-ghost btn-sm gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-base-content">
              {rapprochement.reference || 'Rapprochement'}
            </h1>
            <div className="text-xs sm:text-sm text-base-content/60 mt-1 flex flex-wrap items-center gap-2">
              <span>{rapprochement.compte_bancaire_nom || 'Compte bancaire'}</span>
              <span className="w-px h-3 bg-base-300"></span>
              {getStatusBadge(rapprochement.status)}
              {isRapproche ? (
                <span className="badge badge-success gap-1"><CheckCircle className="w-3 h-3" /> Rapproché</span>
              ) : (
                <span className="badge badge-error gap-1"><AlertTriangle className="w-3 h-3" /> Non rapproché</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={fetchData} className="btn btn-sm btn-outline gap-1" disabled={loading}>
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Actualiser
          </button>
          <button onClick={handlePrint} className="btn btn-sm btn-outline gap-1">
            <Printer className="w-3 h-3" /> Imprimer
          </button>
          <button onClick={handleExport} className="btn btn-sm btn-outline gap-1">
            <Download className="w-3 h-3" /> Exporter
          </button>
          {rapprochement.status !== 'complete' && (
            <button onClick={handleValider} className="btn btn-sm btn-success gap-1" disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
              Valider
            </button>
          )}
          <Link to={`/rapprochements/${id}/edit`} className="btn btn-sm btn-primary gap-1">
            <Edit className="w-3 h-3" /> Modifier
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <p className="text-xs text-base-content/60">Solde comptable</p>
          <p className="text-2xl font-bold text-primary">{formatMontant(rapprochement.solde_comptable)}</p>
        </div>
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <p className="text-xs text-base-content/60">Solde bancaire</p>
          <p className="text-2xl font-bold text-secondary">{formatMontant(rapprochement.solde_bancaire)}</p>
        </div>
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <p className="text-xs text-base-content/60">Écart</p>
          <div className={`flex items-center gap-2 text-2xl font-bold ${getEcartColor(ecartN)}`}>
            {getEcartIcon(ecartN)}
            {ecartN >= 0 ? '+' : ''}{formatMontant(ecartN)}
          </div>
        </div>
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <p className="text-xs text-base-content/60">Solde rapproché</p>
          <p className={`text-2xl font-bold ${isRapproche ? 'text-success' : 'text-warning'}`}>
            {formatMontant(rapprochement.solde_rapproche)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <h3 className="text-sm font-semibold text-base-content/60 mb-3">📋 Informations générales</h3>
          <div className="space-y-2">
            <div className="flex justify-between py-1 border-b border-base-200">
              <span className="text-sm text-base-content/60">Référence</span>
              <span className="text-sm font-mono font-medium">{rapprochement.reference || '-'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-base-200">
              <span className="text-sm text-base-content/60">Agence</span>
              <span className="text-sm">{rapprochement.agence_nom || 'Non spécifiée'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-base-200">
              <span className="text-sm text-base-content/60">Compte bancaire</span>
              <span className="text-sm font-medium">
                {rapprochement.compte_bancaire_nom || '-'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-base-200">
              <span className="text-sm text-base-content/60">Période</span>
              <span className="text-sm">
                {formatDate(rapprochement.date_debut)} → {formatDate(rapprochement.date_fin)}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-base-200">
              <span className="text-sm text-base-content/60">Statut</span>
              <span>{getStatusBadge(rapprochement.status)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-base-content/60">Date de création</span>
              <span className="text-sm">{formatDate(rapprochement.created_at, true)}</span>
            </div>
          </div>
        </div>

        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <h3 className="text-sm font-semibold text-base-content/60 mb-3">📊 Éléments de rapprochement</h3>
          <div className="space-y-2">
            <div className="flex justify-between py-1 border-b border-base-200">
              <span className="text-sm text-base-content/60">En-cours d'émission</span>
              <span className="text-sm font-mono text-warning">-{formatMontant(rapprochement.encours_emission)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-base-200">
              <span className="text-sm text-base-content/60">En-cours d'encaissement</span>
              <span className="text-sm font-mono text-success">+{formatMontant(rapprochement.encours_encaissement)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-base-200">
              <span className="text-sm text-base-content/60">Commissions bancaires</span>
              <span className="text-sm font-mono text-error">-{formatMontant(rapprochement.commissions)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-base-200">
              <span className="text-sm text-base-content/60">Autres écarts</span>
              <span className={`text-sm font-mono ${(Number(rapprochement.autres_ecarts) || 0) >= 0 ? 'text-warning' : 'text-info'}`}>
                {(Number(rapprochement.autres_ecarts) || 0) >= 0 ? '+' : ''}{formatMontant(rapprochement.autres_ecarts)}
              </span>
            </div>
            <div className="flex justify-between py-1 border-t-2 border-base-300 mt-2 pt-2">
              <span className="text-sm font-semibold">Total ajustements</span>
              <span className={`text-sm font-bold ${isRapproche ? 'text-success' : 'text-warning'}`}>
                {formatMontant(totalAjustements)}
              </span>
            </div>
            <div className="flex justify-between py-1 bg-base-200 rounded-lg px-2">
              <span className="text-sm font-bold text-primary">Solde rapproché</span>
              <span className={`text-sm font-bold ${isRapproche ? 'text-success' : 'text-warning'}`}>
                {formatMontant(rapprochement.solde_rapproche)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border p-4 ${isRapproche ? 'bg-success/10 border-success/30' : 'bg-error/10 border-error/30'}`}>
        <div className="flex items-center gap-3">
          {isRapproche
            ? <CheckCircle className="w-6 h-6 text-success" />
            : <AlertTriangle className="w-6 h-6 text-error" />}
          <div>
            <p className={`font-bold ${isRapproche ? 'text-success' : 'text-error'}`}>
              {isRapproche ? '✅ Rapprochement bancaire effectué avec succès' : '⚠️ Écart détecté dans le rapprochement'}
            </p>
            <p className="text-sm text-base-content/60">
              {isRapproche
                ? 'Les soldes comptable et bancaire correspondent parfaitement.'
                : `Un écart de ${formatMontant(ecartN)} a été détecté entre les soldes.`}
            </p>
          </div>
        </div>
      </div>

      {rapprochement.notes && (
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <h3 className="text-sm font-semibold text-base-content/60 mb-2">📝 Notes</h3>
          <p className="text-sm text-base-content/70 whitespace-pre-wrap">{rapprochement.notes}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {rapprochement.status !== 'complete' && (
          <button onClick={handleValider} className="btn btn-success gap-2" disabled={actionLoading}>
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Valider le rapprochement
          </button>
        )}
        <Link to={`/rapprochements/${id}/edit`} className="btn btn-primary gap-2">
          <Edit className="w-4 h-4" /> Modifier
        </Link>
        <button onClick={handlePrint} className="btn btn-outline gap-2">
          <Printer className="w-4 h-4" /> Imprimer
        </button>
        <button onClick={handleExport} className="btn btn-outline gap-2">
          <Download className="w-4 h-4" /> Exporter
        </button>
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

export default RapprochementsDetail