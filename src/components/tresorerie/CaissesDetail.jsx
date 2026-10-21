// src/components/tresorerie/CaissesDetail.jsx
import React, {
  useState, useEffect, useCallback, useRef, useMemo
} from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ArrowLeft, Edit, RefreshCw, AlertCircle, CheckCircle,
  Loader2, Wallet, Clock, TrendingUp, TrendingDown,
  ArrowLeftRight, X
} from 'lucide-react'

const CaissesDetail = () => {
  const navigate = useNavigate()
  const { id } = useParams()

  const [caisse, setCaisse] = useState(null)
  const [mouvements, setMouvements] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState(null)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })

  const cacheRef = useRef(new Map())
  const fetchingRef = useRef(false)

  const unwrap = (data) => Array.isArray(data) ? data : (data?.results || [])

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000)
  }

  // ---------- Fetch avec cache ----------
  const fetchData = useCallback(async ({ bypassCache = false } = {}) => {
    const key = `caisse_detail_${id}`

    if (!bypassCache && cacheRef.current.has(key)) {
      const c = cacheRef.current.get(key)
      setCaisse(c.caisse)
      setMouvements(c.mouvements)
      setLoading(false)
      setInitialLoad(false)
      setError(null)
      return
    }

    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)
    setError(null)

    try {
      // 2 requêtes en parallèle
      const [caisseRes, mouvementsRes] = await Promise.all([
        AxiosInstance.get(`/caisses/${id}/`),
        AxiosInstance.get(`/caisses/${id}/mouvements/?page_size=50`).catch(() => ({ data: [] })),
      ])

      const caisseData = caisseRes.data
      const mouvementsData = unwrap(mouvementsRes.data).filter(m => m && typeof m === 'object')

      cacheRef.current.set(key, { caisse: caisseData, mouvements: mouvementsData })
      if (cacheRef.current.size > 10) {
        const firstKey = cacheRef.current.keys().next().value
        cacheRef.current.delete(firstKey)
      }

      setCaisse(caisseData)
      setMouvements(mouvementsData)
    } catch (err) {
      console.error('❌ Erreur chargement:', err)
      setError('Erreur de chargement des données')
      showNotification('Erreur de chargement des données', 'error')
    } finally {
      setLoading(false)
      setInitialLoad(false)
      fetchingRef.current = false
    }
  }, [id])

  useEffect(() => {
    if (id) fetchData()
  }, [id, fetchData])

  const refresh = async () => {
    cacheRef.current.clear()
    await fetchData({ bypassCache: true })
  }

  // ---------- Helpers ----------
  const formatMontant = (montant) => {
    const n = Number(montant)
    if (!Number.isFinite(n)) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n) + ' FCFA'
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch { return '-' }
  }

  const getTypeBadge = (type) => {
    const types = {
      principale: 'badge-primary',
      secondaire: 'badge-info',
      mobile: 'badge-warning',
      virtuelle: 'badge-secondary',
    }
    return <span className={`badge ${types[type] || 'badge-ghost'}`}>{type || 'Non défini'}</span>
  }

  const getStatusBadge = (isActive) => {
    if (isActive === undefined) return <span className="badge badge-ghost">Inconnu</span>
    return isActive ? (
      <span className="badge badge-success gap-1"><CheckCircle className="w-3 h-3" /> Active</span>
    ) : (
      <span className="badge badge-ghost gap-1"><Clock className="w-3 h-3" /> Inactive</span>
    )
  }

  const getMouvementBadge = (type) => {
    if (type === 'encaissement') {
      return <span className="badge badge-success gap-1"><TrendingUp className="w-3 h-3" /> Encaissement</span>
    }
    if (type === 'decaissement') {
      return <span className="badge badge-error gap-1"><TrendingDown className="w-3 h-3" /> Décaissement</span>
    }
    if (type === 'transfert') {
      return <span className="badge badge-info gap-1"><ArrowLeftRight className="w-3 h-3" /> Transfert</span>
    }
    return <span className="badge badge-ghost">{type || 'Inconnu'}</span>
  }

  // ---------- Premier chargement ----------
  if (initialLoad && loading) {
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

  if (error || !caisse) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold text-base-content mb-2">Erreur</h2>
          <p className="text-base-content/60 mb-4">{error || 'Caisse non trouvée'}</p>
          <button onClick={() => navigate('/caisses')} className="btn btn-primary gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour à la liste
          </button>
        </div>
      </div>
    )
  }

  const soldeActuel = Number(caisse.solde_actuel) || 0

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      {/* Spinner overlay */}
      {loading && !initialLoad && (
        <div className="fixed top-20 right-6 z-40">
          <div className="bg-base-100 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border border-base-300">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span className="text-xs text-base-content/60">Chargement...</span>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification.show && (
        <div className="fixed top-16 right-3 sm:right-6 z-50 animate-slideDown">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg text-sm sm:text-base`}>
            {notification.type === 'success'
              ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              : <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
            <span className="font-semibold">{notification.message}</span>
            <button
              className="btn btn-ghost btn-xs btn-circle"
              onClick={() => setNotification({ ...notification, show: false })}
            >
              <X className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => navigate('/caisses')}
            className="btn btn-ghost btn-sm gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-base-content">
              {caisse.nom || 'Caisse'}
            </h1>
            <p className="text-xs sm:text-sm text-base-content/60 mt-1 flex flex-wrap items-center gap-2">
              {caisse.code && <span className="font-mono">{caisse.code}</span>}
              {caisse.code && <span className="w-px h-3 bg-base-300"></span>}
              {getTypeBadge(caisse.type_caisse)}
              {getStatusBadge(caisse.is_active)}
              {caisse.is_default && <span className="badge badge-primary">Par défaut</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={refresh} className="btn btn-sm btn-outline gap-1" disabled={loading}>
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <Link to={`/caisses/${id}/edit`} className="btn btn-sm btn-primary gap-1">
            <Edit className="w-3 h-3" /> Modifier
          </Link>
        </div>
      </div>

      {/* Informations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <p className="text-xs text-base-content/60">Solde actuel</p>
          <p className={`text-2xl font-bold ${soldeActuel >= 0 ? 'text-success' : 'text-error'}`}>
            {formatMontant(soldeActuel)}
          </p>
        </div>
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <p className="text-xs text-base-content/60">Solde initial</p>
          <p className="text-2xl font-bold">{formatMontant(caisse.solde_initial)}</p>
        </div>
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <p className="text-xs text-base-content/60">Seuils</p>
          <p className="text-sm font-medium">
            Min: {formatMontant(caisse.seuil_min)} | Max: {formatMontant(caisse.seuil_max)}
          </p>
        </div>
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <p className="text-xs text-base-content/60">Informations</p>
          <p className="text-sm">
            {caisse.responsable_nom ? `👤 ${caisse.responsable_nom}` : 'Aucun responsable'}
          </p>
          <p className="text-xs text-base-content/40">Créé le {formatDate(caisse.created_at)}</p>
        </div>
      </div>

      {/* Description */}
      {caisse.description && (
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <p className="text-sm text-base-content/70">{caisse.description}</p>
        </div>
      )}

      {/* Mouvements */}
      <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">📋 Mouvements récents</h2>
          <Link to="/mouvements-tresorerie" className="text-sm text-primary hover:underline">
            Voir tout →
          </Link>
        </div>

        {mouvements.length === 0 ? (
          <div className="text-center py-8 text-base-content/40">
            <Wallet className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Aucun mouvement pour cette caisse</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
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
                {mouvements.slice(0, 10).map((m) => (
                  <tr key={m.id} className="hover">
                    <td className="text-xs">{formatDate(m.date_mouvement)}</td>
                    <td>{getMouvementBadge(m.type_mouvement)}</td>
                    <td className="text-sm truncate max-w-[200px]">{m.libelle || '-'}</td>
                    <td className={`text-right font-mono text-sm ${m.type_mouvement === 'encaissement' ? 'text-success' : 'text-error'}`}>
                      {m.type_mouvement === 'encaissement' ? '+' : '-'}{formatMontant(m.montant)}
                    </td>
                    <td>
                      <span className={`badge badge-sm ${
                        m.status === 'effectue' ? 'badge-success'
                        : m.status === 'planifie' ? 'badge-warning'
                        : 'badge-ghost'
                      }`}>
                        {m.status || 'Inconnu'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

export default CaissesDetail