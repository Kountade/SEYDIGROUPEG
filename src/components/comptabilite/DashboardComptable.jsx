// src/components/comptabilite/DashboardComptable.jsx
import React, {
  useEffect, useState, useCallback, useRef,
} from 'react'
import { useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  TrendingUp, Wallet, AlertCircle, CheckCircle, Building2,
  RefreshCw, X, DollarSign, FileText, LayoutDashboard,
  ArrowUp, ArrowDown, Bell, BarChart3, Activity, Loader2,
} from 'lucide-react'

// ============================================================
// CONSTANTES
// ============================================================
const CACHE_TTL_MS = 2 * 60 * 1000 // 2 min (aligné avec le cache serveur qui est 5 min)
const CACHE_MAX = 10

// ============================================================
// HELPERS
// ============================================================
const safeParseUser = () => {
  try {
    return JSON.parse(localStorage.getItem('User') || '{}')
  } catch {
    return {}
  }
}

// ============================================================
// COMPOSANT
// ============================================================
const DashboardComptable = () => {
  const navigate = useNavigate()

  // ---------- État principal ----------
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [stats, setStats] = useState(null)

  // ---------- Filtres ----------
  const [period, setPeriod] = useState('month')  // ✅ envoyé au backend
  const [agenceId, setAgenceId] = useState(null)

  // ---------- UI ----------
  const [notification, setNotification] = useState({
    show: false, message: '', type: 'success',
  })

  // ---------- Refs ----------
  const cacheRef = useRef(new Map())
  const abortRef = useRef(null)
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
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  // ---------- Récupération agence depuis localStorage ----------
  useEffect(() => {
    const userData = safeParseUser()
    const agId =
      userData.agence_principale?.id ||
      userData.agence?.id ||
      userData.agence_id ||
      null
    setAgenceId(agId)
    if (!agId) {
      setError('Aucune agence associée à votre compte')
      setLoading(false)
      setInitialLoad(false)
    }
  }, [])

  // ---------- Cache key ----------
  const buildCacheKey = useCallback(() => JSON.stringify({
    agence: agenceId,
    period,
  }), [agenceId, period])

  // ============================================================
  // ✅ FETCH DASHBOARD — avec cache + abort + period envoyé
  // ============================================================
  const fetchDashboard = useCallback(async ({ bypassCache = false } = {}) => {
    if (!agenceId) return

    const key = buildCacheKey()

    // ✅ Cache hit
    if (!bypassCache && cacheRef.current.has(key)) {
      const c = cacheRef.current.get(key)
      setData(c.data)
      setStats(c.stats)
      setLoading(false)
      setInitialLoad(false)
      setError(null)
      return
    }

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    try {
      // ✅ period envoyé au backend
      const response = await AxiosInstance.get('/comptabilite/dashboard/', {
        params: { agence_id: agenceId, period },
        signal: controller.signal,
      })

      if (controller.signal.aborted) return

      const dashData = response.data
      const dashStats = computeStats(dashData)

      // ✅ Cache
      cacheRef.current.set(key, { data: dashData, stats: dashStats })
      if (cacheRef.current.size > CACHE_MAX) {
        cacheRef.current.delete(cacheRef.current.keys().next().value)
      }

      setData(dashData)
      setStats(dashStats)
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
      console.error('Erreur chargement dashboard:', err)
      if (err.response?.status === 401) {
        setError('Session expirée, veuillez vous reconnecter')
      } else if (err.response?.status === 403) {
        setError("Vous n'avez pas les droits sur cette agence")
      } else {
        setError('Erreur de chargement du tableau de bord')
      }
      showNotification('Erreur de chargement', 'error')
    } finally {
      if (abortRef.current === controller) {
        setLoading(false)
        setInitialLoad(false)
      }
    }
  }, [agenceId, period, buildCacheKey, showNotification])

  // ✅ 1 seul useEffect : re-fetch si agenceId ou period change
  useEffect(() => {
    if (agenceId) fetchDashboard()
  }, [agenceId, period, fetchDashboard])

  const refreshData = async () => {
    cacheRef.current.clear()
    await fetchDashboard({ bypassCache: true })
  }

  // ---------- Transform data → stats ----------
  const computeStats = (d) => {
    if (!d) return null
    return {
      caTotal: d.ca_total || 0,
      caEvolution: d.ca_evolution || 0,
      caEvolutionPourcentage: d.ca_evolution_pourcentage || 0,
      margeBrute: d.marge_brute || 0,
      margePourcentage: d.marge_pourcentage || 0,
      tresorerie: d.tresorerie || 0,
      ventesMois: d.ventes_mois || 0,
      achatsMois: d.achats_mois || 0,
      alertes: Array.isArray(d.alertes) ? d.alertes : [],
    }
  }

  // ---------- Helpers ----------
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'XOF',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatCurrencyShort = (amount) => {
    if (!amount && amount !== 0) return '0 FCFA'
    const abs = Math.abs(amount)
    const sign = amount < 0 ? '-' : ''
    if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)} Mrd FCFA`
    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)} M FCFA`
    if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)} K FCFA`
    return formatCurrency(amount)
  }

  const getAlertIcon = (type) => {
    switch (type) {
      case 'error': return <AlertCircle className="w-5 h-5 text-error" />
      case 'warning': return <Bell className="w-5 h-5 text-warning" />
      case 'info': return <CheckCircle className="w-5 h-5 text-info" />
      default: return <AlertCircle className="w-5 h-5 text-base-content/50" />
    }
  }

  const getAlertColor = (type) => {
    switch (type) {
      case 'error': return 'alert-error'
      case 'warning': return 'alert-warning'
      case 'info': return 'alert-info'
      default: return 'alert-ghost'
    }
  }

  // ---------- Loading plein écran ----------
  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-base-200">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement du tableau de bord...
          </p>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-base-200">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Erreur de chargement</h2>
          <p className="text-base-content/60 mb-4">{error}</p>
          <button onClick={refreshData} className="btn btn-primary gap-2">
            <RefreshCw className="w-4 h-4" /> Réessayer
          </button>
        </div>
      </div>
    )
  }

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 bg-base-200 min-h-screen">
      {/* Overlay léger */}
      {loading && !initialLoad && (
        <div className="fixed top-20 right-6 z-40">
          <div className="bg-base-100 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border border-base-300">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span className="text-xs text-base-content/60">Actualisation...</span>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification.show && (
        <div className="fixed top-16 right-3 sm:right-6 z-50 animate-slideDown">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg`}>
            {notification.type === 'success'
              ? <CheckCircle className="w-4 h-4" />
              : <AlertCircle className="w-4 h-4" />}
            <span className="font-semibold">{notification.message}</span>
            <button
              className="btn btn-ghost btn-xs btn-circle"
              onClick={() => setNotification({ ...notification, show: false })}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Tableau de bord financier
          </h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            Vue d'ensemble de la santé financière de votre entreprise
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <div className="join">
            <button
              className={`join-item btn btn-sm ${period === 'month' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPeriod('month')}
              disabled={loading}
            >Mois</button>
            <button
              className={`join-item btn btn-sm ${period === 'quarter' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPeriod('quarter')}
              disabled={loading}
            >Trimestre</button>
            <button
              className={`join-item btn btn-sm ${period === 'year' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPeriod('year')}
              disabled={loading}
            >Année</button>
          </div>
          <button
            onClick={refreshData}
            className="btn btn-sm sm:btn-md btn-outline gap-1"
            disabled={loading}
          >
            <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Actualiser</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
          {/* CA */}
          <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
            <div className="stat-figure text-success">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
            </div>
            <div className="stat-title text-xs sm:text-sm font-semibold">
              Chiffre d'affaires
            </div>
            <div className="stat-value text-base sm:text-lg lg:text-2xl font-black truncate">
              {formatCurrencyShort(stats.caTotal)}
            </div>
            <div className="stat-desc flex items-center gap-1 text-xs">
              {stats.caEvolution >= 0 ? (
                <>
                  <ArrowUp className="w-3 h-3 text-success" />
                  <span className="text-success">
                    {stats.caEvolutionPourcentage.toFixed(1)}%
                  </span>
                </>
              ) : (
                <>
                  <ArrowDown className="w-3 h-3 text-error" />
                  <span className="text-error">
                    {Math.abs(stats.caEvolutionPourcentage).toFixed(1)}%
                  </span>
                </>
              )}
              <span className="text-base-content/60">vs période préc.</span>
            </div>
          </div>

          {/* Trésorerie */}
          <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
            <div className="stat-figure text-info">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
            </div>
            <div className="stat-title text-xs sm:text-sm font-semibold">Trésorerie</div>
            <div className={`stat-value text-base sm:text-lg lg:text-2xl font-black truncate ${stats.tresorerie < 0 ? 'text-error' : 'text-success'}`}>
              {formatCurrencyShort(stats.tresorerie)}
            </div>
            <div className="stat-desc text-xs text-base-content/60">Solde disponible</div>
          </div>

          {/* Marge */}
          <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
            <div className="stat-figure text-primary">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
            </div>
            <div className="stat-title text-xs sm:text-sm font-semibold">Marge brute</div>
            <div className="stat-value text-base sm:text-lg lg:text-2xl font-black truncate">
              {formatCurrencyShort(stats.margeBrute)}
            </div>
            <div className="stat-desc flex items-center gap-1 text-xs">
              <span className={
                stats.margePourcentage >= 30 ? 'text-success'
                : stats.margePourcentage >= 15 ? 'text-warning'
                : 'text-error'
              }>
                {stats.margePourcentage.toFixed(1)}%
              </span>
              <span className="text-base-content/60">de marge</span>
            </div>
          </div>

          {/* Alertes */}
          <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
            <div className="stat-figure text-warning">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
            </div>
            <div className="stat-title text-xs sm:text-sm font-semibold">Alertes</div>
            <div className="stat-value text-base sm:text-lg lg:text-2xl font-black">
              {stats.alertes.length}
            </div>
            <div className="stat-desc text-xs text-base-content/60">
              {stats.alertes.length > 0 ? 'Actions requises' : 'Tout est en ordre'}
            </div>
          </div>
        </div>
      )}

      {/* Détails */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Ventes vs Achats */}
          <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-3 sm:p-4 lg:p-6">
            <h3 className="font-semibold text-base sm:text-lg mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Ventes vs Achats
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-base-content/60">Ventes</span>
                  <span className="font-bold text-success">
                    {formatCurrencyShort(stats.ventesMois)}
                  </span>
                </div>
                <div className="w-full bg-base-200 rounded-full h-2.5">
                  <div
                    className="bg-success h-2.5 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        ((stats.ventesMois || 0) / ((stats.ventesMois || 0) + (stats.achatsMois || 0) || 1)) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-base-content/60">Achats</span>
                  <span className="font-bold text-error">
                    {formatCurrencyShort(stats.achatsMois)}
                  </span>
                </div>
                <div className="w-full bg-base-200 rounded-full h-2.5">
                  <div
                    className="bg-error h-2.5 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        ((stats.achatsMois || 0) / ((stats.ventesMois || 0) + (stats.achatsMois || 0) || 1)) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Alertes */}
          <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-3 sm:p-4 lg:p-6">
            <h3 className="font-semibold text-base sm:text-lg mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
              Alertes financières
            </h3>
            {stats.alertes.length > 0 ? (
              <div className="space-y-2">
                {stats.alertes.map((alerte, i) => (
                  <div key={i} className={`alert ${getAlertColor(alerte.type)} py-2 px-3`}>
                    {getAlertIcon(alerte.type)}
                    <span className="text-sm">{alerte.message}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle className="w-12 h-12 text-success mx-auto mb-2" />
                <p className="text-base-content/60">Aucune alerte, tout est en ordre !</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <button
          onClick={() => navigate('/comptabilite/plan-comptable')}
          className="btn btn-outline gap-2"
        >
          <FileText className="w-4 h-4" /> Plan comptable
        </button>
        <button
          onClick={() => navigate('/comptabilite/ecritures')}
          className="btn btn-outline gap-2"
        >
          <LayoutDashboard className="w-4 h-4" /> Écritures
        </button>
        <button
          onClick={() => navigate('/comptabilite/compte-resultat')}
          className="btn btn-outline gap-2"
        >
          <TrendingUp className="w-4 h-4" /> Compte de résultat
        </button>
        <button
          onClick={() => navigate('/comptabilite/bilan')}
          className="btn btn-outline gap-2"
        >
          <Building2 className="w-4 h-4" /> Bilan
        </button>
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
      `}</style>
    </div>
  )
}

export default DashboardComptable