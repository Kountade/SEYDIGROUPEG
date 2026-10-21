// src/components/tresorerie/ComptesBancairesDetail.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ArrowLeft, Edit, RefreshCw, AlertCircle, CheckCircle,
  Loader2, PiggyBank, DollarSign, Clock,
  TrendingUp, TrendingDown, ArrowLeftRight, X,
  ChevronLeft, ChevronRight, Calendar, FileText
} from 'lucide-react'

const ComptesBancairesDetail = () => {
  const navigate = useNavigate()
  const { id } = useParams()

  // ---------- État principal ----------
  const [compte, setCompte] = useState(null)
  const [mouvements, setMouvements] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMouvements, setLoadingMouvements] = useState(false)
  const [error, setError] = useState(null)
  const [mouvementsError, setMouvementsError] = useState(null)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })

  // ---------- Pagination mouvements (serveur) ----------
  const [mvtPage, setMvtPage] = useState(1)
  const [mvtPageSize] = useState(10)
  const [mvtTotalCount, setMvtTotalCount] = useState(0)
  const [mvtTotalPages, setMvtTotalPages] = useState(1)

  // ---------- Refs ----------
  const abortCompteRef = useRef(null)
  const abortMvtRef = useRef(null)
  const notifTimerRef = useRef(null)

  // ---------- Notification ----------
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
      if (abortCompteRef.current) abortCompteRef.current.abort()
      if (abortMvtRef.current) abortMvtRef.current.abort()
    }
  }, [])

  // ---------- Chargement du compte ----------
  const fetchCompte = useCallback(async () => {
    if (!id) return
    if (abortCompteRef.current) abortCompteRef.current.abort()
    const controller = new AbortController()
    abortCompteRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const res = await AxiosInstance.get(`/comptes-bancaires/${id}/`, {
        signal: controller.signal,
      })
      setCompte(res.data)
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
      console.error('Erreur chargement compte:', err)
      if (err.response?.status === 404) {
        setError('Compte bancaire introuvable')
      } else if (err.response?.status === 401) {
        setError('Session expirée, veuillez vous reconnecter')
      } else if (err.response?.status === 403) {
        setError("Vous n'avez pas les droits pour voir ce compte")
      } else {
        setError('Erreur de chargement des données')
      }
      showNotification('Erreur de chargement des données', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, showNotification])

  // ---------- Chargement des mouvements (paginé serveur) ----------
  const fetchMouvements = useCallback(async () => {
    if (!id) return
    if (abortMvtRef.current) abortMvtRef.current.abort()
    const controller = new AbortController()
    abortMvtRef.current = controller

    setLoadingMouvements(true)
    setMouvementsError(null)

    try {
      // ✅ On cible directement l'endpoint du compte, avec pagination
      const res = await AxiosInstance.get(
        `/comptes-bancaires/${id}/mouvements/`,
        {
          params: { page: mvtPage, page_size: mvtPageSize, ordering: '-date_mouvement' },
          signal: controller.signal,
        }
      )

      const payload = res.data
      // ✅ Gestion robuste : paginé OU non paginé
      const results = Array.isArray(payload) ? payload : (payload.results || [])
      const count = Array.isArray(payload) ? results.length : (payload.count ?? results.length)
      const nbPages = Math.max(1, Math.ceil(count / mvtPageSize))

      setMouvements(results)
      setMvtTotalCount(count)
      setMvtTotalPages(nbPages)
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
      console.error('Erreur chargement mouvements:', err)

      // Fallback : filtrer via /mouvements/?compte_bancaire=<id>
      try {
        const fallback = await AxiosInstance.get('/mouvements/', {
          params: {
            compte_bancaire: id,
            page: mvtPage,
            page_size: mvtPageSize,
            ordering: '-date_mouvement',
          },
          signal: controller.signal,
        })
        const p = fallback.data
        const results = Array.isArray(p) ? p : (p.results || [])
        const count = Array.isArray(p) ? results.length : (p.count ?? results.length)
        setMouvements(results)
        setMvtTotalCount(count)
        setMvtTotalPages(Math.max(1, Math.ceil(count / mvtPageSize)))
      } catch (err2) {
        if (err2.name === 'CanceledError' || err2.code === 'ERR_CANCELED') return
        setMouvementsError('Impossible de charger les mouvements')
        setMouvements([])
        setMvtTotalCount(0)
        setMvtTotalPages(1)
      }
    } finally {
      setLoadingMouvements(false)
    }
  }, [id, mvtPage, mvtPageSize])

  // ---------- Effets ----------
  useEffect(() => { fetchCompte() }, [fetchCompte])
  useEffect(() => { fetchMouvements() }, [fetchMouvements])

  // ---------- Reset page si changement d'id ----------
  useEffect(() => { setMvtPage(1) }, [id])

  // ---------- Stats calculées sur la page courante ----------
  const pageStats = useMemo(() => {
    let enc = 0
    let dec = 0
    for (const m of mouvements) {
      const n = Number(m.montant) || 0
      if (m.status !== 'effectue') continue
      if (m.type_mouvement === 'encaissement') enc += n
      else if (m.type_mouvement === 'decaissement') dec += n
    }
    return { enc, dec, net: enc - dec }
  }, [mouvements])

  // ---------- Helpers ----------
  const formatMontant = (montant) => {
    const n = Number(montant)
    if (!Number.isFinite(n)) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n) + ' FCFA'
  }

  const formatDate = (dateString, withTime = true) => {
    if (!dateString) return '-'
    try {
      const opts = {
        day: '2-digit', month: '2-digit', year: 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
      }
      return new Date(dateString).toLocaleDateString('fr-FR', opts)
    } catch {
      return '-'
    }
  }

  const getTypeBadge = (type) => {
    const map = { courant: 'badge-primary', epargne: 'badge-success', bloque: 'badge-warning' }
    return <span className={`badge ${map[type] || 'badge-ghost'} badge-sm`}>{type || 'Non défini'}</span>
  }

  const getStatusBadge = (isActive) => {
    if (isActive === undefined) return <span className="badge badge-ghost badge-sm">Inconnu</span>
    return isActive ? (
      <span className="badge badge-success badge-sm gap-1"><CheckCircle className="w-3 h-3" /> Actif</span>
    ) : (
      <span className="badge badge-ghost badge-sm gap-1"><Clock className="w-3 h-3" /> Inactif</span>
    )
  }

  const getMouvementBadge = (type) => {
    if (type === 'encaissement') return <span className="badge badge-success badge-sm gap-1"><TrendingUp className="w-3 h-3" /> Encaissement</span>
    if (type === 'decaissement') return <span className="badge badge-error badge-sm gap-1"><TrendingDown className="w-3 h-3" /> Décaissement</span>
    if (type === 'transfert') return <span className="badge badge-info badge-sm gap-1"><ArrowLeftRight className="w-3 h-3" /> Transfert</span>
    return <span className="badge badge-ghost badge-sm">{type || 'Inconnu'}</span>
  }

  const getStatutMouvementBadge = (status) => {
    const map = {
      effectue: { cls: 'badge-success', label: 'Effectué' },
      planifie: { cls: 'badge-warning', label: 'Planifié' },
      en_attente: { cls: 'badge-warning', label: 'En attente' },
      annule: { cls: 'badge-ghost', label: 'Annulé' },
      rejete: { cls: 'badge-error', label: 'Rejeté' },
    }
    const cfg = map[status] || { cls: 'badge-ghost', label: status || 'Inconnu' }
    return <span className={`badge ${cfg.cls} badge-sm`}>{cfg.label}</span>
  }

  // ---------- Loading initial ----------
  if (loading && !compte) {
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

  // ---------- Erreur fatale ----------
  if (error || !compte) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold text-base-content mb-2">Erreur</h2>
          <p className="text-base-content/60 mb-4">{error || 'Compte non trouvé'}</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => navigate('/comptes-bancaires')} className="btn btn-ghost gap-2">
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
            <button onClick={fetchCompte} className="btn btn-primary gap-2">
              <RefreshCw className="w-4 h-4" /> Réessayer
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ---------- Rendu ----------
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
          <button onClick={() => navigate('/comptes-bancaires')} className="btn btn-ghost btn-sm gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-base-content">
              {compte.nom || 'Compte bancaire'}
            </h1>
            <p className="text-xs sm:text-sm text-base-content/60 mt-1 flex flex-wrap items-center gap-2">
              <span className="font-mono">{compte.code}</span>
              <span className="w-px h-3 bg-base-300"></span>
              <span>{compte.banque}</span>
              <span className="w-px h-3 bg-base-300"></span>
              {getTypeBadge(compte.type_compte)}
              {getStatusBadge(compte.is_active)}
              {compte.is_default && <span className="badge badge-primary badge-sm">Par défaut</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { fetchCompte(); fetchMouvements() }}
            className="btn btn-sm btn-outline gap-1"
            disabled={loading || loadingMouvements}
          >
            <RefreshCw className={`w-3 h-3 ${(loading || loadingMouvements) ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <Link to={`/comptes-bancaires/${id}/edit`} className="btn btn-sm btn-primary gap-1">
            <Edit className="w-3 h-3" /> Modifier
          </Link>
        </div>
      </div>

      {/* Cartes d'information */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <p className="text-xs text-base-content/60">Solde actuel</p>
          <p className={`text-2xl font-bold ${(compte.solde_actuel || 0) >= 0 ? 'text-success' : 'text-error'}`}>
            {formatMontant(compte.solde_actuel)}
          </p>
        </div>
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <p className="text-xs text-base-content/60">Solde initial</p>
          <p className="text-2xl font-bold">{formatMontant(compte.solde_initial)}</p>
        </div>
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <p className="text-xs text-base-content/60">Numéro de compte</p>
          <p className="text-sm font-mono font-medium">{compte.numero_compte}</p>
          {compte.iban && <p className="text-xs text-base-content/40 font-mono">IBAN: {compte.iban}</p>}
        </div>
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <p className="text-xs text-base-content/60">Informations</p>
          <p className="text-sm font-medium">{compte.devise || 'XOF'}</p>
          <p className="text-xs text-base-content/40">
            Ouvert le {formatDate(compte.date_ouverture, false)}
          </p>
        </div>
      </div>

      {/* Description */}
      {compte.description && (
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <p className="text-sm text-base-content/70">{compte.description}</p>
        </div>
      )}

      {/* Stats mouvements (page courante) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <div className="flex items-center gap-2 text-xs text-base-content/60 mb-1">
            <TrendingUp className="w-4 h-4 text-success" /> Encaissements (page)
          </div>
          <p className="text-xl font-bold text-success">{formatMontant(pageStats.enc)}</p>
        </div>
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <div className="flex items-center gap-2 text-xs text-base-content/60 mb-1">
            <TrendingDown className="w-4 h-4 text-error" /> Décaissements (page)
          </div>
          <p className="text-xl font-bold text-error">{formatMontant(pageStats.dec)}</p>
        </div>
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <div className="flex items-center gap-2 text-xs text-base-content/60 mb-1">
            <DollarSign className="w-4 h-4 text-primary" /> Net (page)
          </div>
          <p className={`text-xl font-bold ${pageStats.net >= 0 ? 'text-success' : 'text-error'}`}>
            {formatMontant(pageStats.net)}
          </p>
        </div>
      </div>

      {/* Mouvements */}
      <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Mouvements ({mvtTotalCount})
          </h2>
          <Link to="/mouvements" className="text-sm text-primary hover:underline">
            Voir tout →
          </Link>
        </div>

        {loadingMouvements && mouvements.length === 0 ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
            <p className="text-sm text-base-content/50">Chargement des mouvements...</p>
          </div>
        ) : mouvementsError ? (
          <div className="text-center py-8">
            <AlertCircle className="w-10 h-10 text-error mx-auto mb-2" />
            <p className="text-sm text-base-content/60 mb-3">{mouvementsError}</p>
            <button onClick={fetchMouvements} className="btn btn-sm btn-outline gap-1">
              <RefreshCw className="w-3 h-3" /> Réessayer
            </button>
          </div>
        ) : mouvements.length === 0 ? (
          <div className="text-center py-8 text-base-content/40">
            <PiggyBank className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Aucun mouvement pour ce compte bancaire</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table table-sm w-full">
                <thead>
                  <tr className="text-xs text-base-content/60">
                    <th>Date</th>
                    <th>Type</th>
                    <th>Libellé</th>
                    <th className="text-right">Montant</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {mouvements.map((m) => (
                    <tr key={m.id} className="hover">
                      <td className="text-xs whitespace-nowrap">{formatDate(m.date_mouvement)}</td>
                      <td>{getMouvementBadge(m.type_mouvement)}</td>
                      <td className="text-sm truncate max-w-[200px]" title={m.libelle}>
                        {m.libelle || '-'}
                      </td>
                      <td className={`text-right font-mono text-sm whitespace-nowrap ${
                        m.type_mouvement === 'encaissement' ? 'text-success' :
                        m.type_mouvement === 'decaissement' ? 'text-error' : 'text-base-content'
                      }`}>
                        {m.type_mouvement === 'encaissement' ? '+' :
                         m.type_mouvement === 'decaissement' ? '-' : ''}
                        {formatMontant(m.montant)}
                      </td>
                      <td>{getStatutMouvementBadge(m.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination serveur */}
            {mvtTotalPages > 1 && (
              <div className="p-3 sm:p-4 border-t border-base-300 mt-2">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs sm:text-sm text-base-content/60 order-2 sm:order-1">
                    {((mvtPage - 1) * mvtPageSize) + 1} - {Math.min(mvtPage * mvtPageSize, mvtTotalCount)} sur {mvtTotalCount}
                  </div>
                  <div className="join order-1 sm:order-2">
                    <button
                      className="join-item btn btn-xs sm:btn-sm"
                      onClick={() => setMvtPage(p => Math.max(1, p - 1))}
                      disabled={mvtPage === 1 || loadingMouvements}
                    >
                      <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                    <span className="join-item btn btn-xs sm:btn-sm btn-disabled">
                      Page {mvtPage} / {mvtTotalPages}
                    </span>
                    <button
                      className="join-item btn btn-xs sm:btn-sm"
                      onClick={() => setMvtPage(p => Math.min(mvtTotalPages, p + 1))}
                      disabled={mvtPage === mvtTotalPages || loadingMouvements}
                    >
                      <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
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

export default ComptesBancairesDetail