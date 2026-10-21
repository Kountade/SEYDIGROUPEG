// src/components/dashboard/Analyses.jsx
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import AxiosInstance from '../AxiosInstance'
import {
  TrendingUp, TrendingDown, Calendar, Filter, Download, RefreshCw,
  AlertCircle, CheckCircle, X, Loader2, Target, Activity,
  Zap, DollarSign, Package, Users,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, AreaChart, Area,
  ComposedChart, Line, Cell,
} from 'recharts'

// ============================================================
// HELPERS
// ============================================================
const CACHE_TTL_MS = 2 * 60 * 1000
const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444']

const unwrapList = (payload) =>
  Array.isArray(payload) ? payload : (payload?.results || [])

const Analyses = () => {
  // ============================================================
  // ÉTATS
  // ============================================================
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState(null)

  const [ventes, setVentes] = useState([])
  const [monthlySales, setMonthlySales] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [statsData, setStatsData] = useState(null)

  const [period, setPeriod] = useState('12m')
  const [activeTab, setActiveTab] = useState('tendances')
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })

  // ============================================================
  // REFS
  // ============================================================
  const cacheRef = useRef(new Map())
  const abortRef = useRef(null)
  const notifTimerRef = useRef(null)

  // ============================================================
  // NOTIFICATION
  // ============================================================
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

  // ✅ Convertir "12m" en nb_mois
  const nbMois = useMemo(() => {
    if (period === '3m') return 3
    if (period === '6m') return 6
    if (period === '12m') return 12
    return 24
  }, [period])

  // ============================================================
  // CHARGEMENT DES DONNÉES
  // ============================================================
  const fetchAnalyses = useCallback(async ({ bypassCache = false } = {}) => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    const cacheKey = `analyses:${period}`
    const cached = cacheRef.current.get(cacheKey)
    const now = Date.now()

    if (!bypassCache && cached && (now - cached.timestamp) < CACHE_TTL_MS) {
      setMonthlySales(cached.monthlySales)
      setTopProducts(cached.topProducts)
      setStatsData(cached.statsData)
      setVentes(cached.ventes)
      setLoading(false)
      setInitialLoad(false)
      return
    }

    try {
      // ✅ 4 appels parallèles
      const [recettesRes, topRes, globalRes, ventesRes] = await Promise.allSettled([
        // 1. Tendance des ventes → /dashboard/charts/?type=recettes
        AxiosInstance.get('/dashboard/charts/', {
          params: { type: 'recettes', nb_mois: nbMois },
          signal: controller.signal,
        }),

        // 2. Top produits → /analyses/top-produits/
        AxiosInstance.get('/analyses/top-produits/', {
          params: { limit: 10 },
          signal: controller.signal,
        }),

        // 3. Indicateurs généraux → /dashboard/global/
        AxiosInstance.get('/dashboard/global/', {
          params: { periode: 'mois', limit: 5 },
          signal: controller.signal,
        }),

        // 4. Liste des ventes
        AxiosInstance.get('/ventes/', {
          params: { page_size: 200 },
          signal: controller.signal,
        }),
      ])

      if (controller.signal.aborted) return

      // ---------- 1. Tendance (critique) ----------
      let monthlySalesData = []
      if (recettesRes.status === 'fulfilled') {
        monthlySalesData = unwrapList(recettesRes.value.data).map(item => ({
          mois: item.label || '',
          total: Number(item.montant) || 0,
          nb_ventes: item.nb_ventes || 0,
        }))
      } else {
        console.warn('⚠️ Tendance indisponible :', recettesRes.reason?.response?.status)
      }

      // ---------- 2. Top produits (non critique) ----------
      let topProductsData = []
      if (topRes.status === 'fulfilled') {
        topProductsData = unwrapList(topRes.value.data)
      } else {
        console.warn('⚠️ Top produits indisponible (non critique) :',
          topRes.reason?.response?.status)
      }

      // ---------- 3. Indicateurs (critique) ----------
      let globalData = null
      if (globalRes.status === 'fulfilled') {
        globalData = globalRes.value.data
      } else {
        console.warn('⚠️ Global indisponible :', globalRes.reason?.response?.status)
      }

      // ---------- 4. Ventes (non critique) ----------
      let ventesData = []
      if (ventesRes.status === 'fulfilled') {
        ventesData = unwrapList(ventesRes.value.data)
      } else {
        console.warn('⚠️ Ventes indisponibles (non critique) :',
          ventesRes.reason?.response?.status)
      }

      setMonthlySales(monthlySalesData)
      setTopProducts(topProductsData)
      setStatsData(globalData || {})
      setVentes(ventesData)

      cacheRef.current.set(cacheKey, {
        monthlySales: monthlySalesData,
        topProducts: topProductsData,
        statsData: globalData,
        ventes: ventesData,
        timestamp: now,
      })

      // ============================================================
      // ✅ SEULES les erreurs critiques déclenchent une notification
      // ============================================================
      const criticalFailures = [
        recettesRes.status === 'rejected' && 'tendance',
        globalRes.status === 'rejected' && 'indicateurs',
      ].filter(Boolean)

      if (criticalFailures.length > 0) {
        showNotification(
          `Données critiques manquantes : ${criticalFailures.join(', ')}`,
          'warning'
        )
      }
      // ❌ PAS de notification si seulement top-produits ou ventes manquent

    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
      console.error('❌ Erreur analyses:', err)
      setError(err.response?.data?.error || 'Erreur de chargement')
      showNotification('Erreur de chargement des analyses', 'error')
    } finally {
      if (abortRef.current === controller) {
        setLoading(false)
        setInitialLoad(false)
      }
    }
  }, [period, nbMois, showNotification])

  useEffect(() => { fetchAnalyses() }, [fetchAnalyses])

  const refreshData = async () => {
    cacheRef.current.clear()
    await fetchAnalyses({ bypassCache: true })
  }

  // ============================================================
  // FORMATAGE
  // ============================================================
  const formatPrice = (price) => {
    const n = Number(price)
    if (!Number.isFinite(n) || n === 0) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n) + ' FCFA'
  }

  // ============================================================
  // ANALYSES MÉMOÏSÉES
  // ============================================================
  const analyses = useMemo(() => {
    const completed = ventes.filter(v => v.status === 'completed')
    const totalCA = completed.reduce((sum, v) => sum + (Number(v.total) || 0), 0)
    const avgOrder = completed.length > 0 ? totalCA / completed.length : 0

    const monthly = monthlySales.map(m => ({ ...m, total: Number(m.total) || 0 }))

    const currentMonth = monthly.length > 0 ? monthly[monthly.length - 1] : { total: 0 }
    const previousMonth = monthly.length > 1 ? monthly[monthly.length - 2] : { total: 0 }
    const growth = previousMonth.total > 0
      ? ((currentMonth.total - previousMonth.total) / previousMonth.total) * 100
      : 0

    // Prévision (moyenne mobile 3 mois)
    const forecast = []
    if (monthly.length >= 3) {
      const last3 = monthly.slice(-3)
      const avg = last3.reduce((s, m) => s + m.total, 0) / 3
      forecast.push({ mois: 'Prochain mois', total: avg })
    }

    // Saisonnalité
    const dayOfWeek = [0, 0, 0, 0, 0, 0, 0]
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    completed.forEach(v => {
      const date = new Date(v.date_vente)
      if (!isNaN(date)) dayOfWeek[date.getDay()] += Number(v.total) || 0
    })
    const seasonality = dayNames.map((name, i) => ({ jour: name, ca: dayOfWeek[i] }))

    // Top clients
    const clients = {}
    completed.forEach(v => {
      const key = v.client_nom || 'Anonyme'
      if (!clients[key]) clients[key] = { total: 0, count: 0 }
      clients[key].total += Number(v.total) || 0
      clients[key].count += 1
    })
    const topClients = Object.entries(clients)
      .map(([nom, data]) => ({ nom, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    // Heures de pointe
    const hourDistribution = []
    for (let h = 8; h <= 20; h++) hourDistribution.push({ heure: `${h}h`, ventes: 0 })
    completed.forEach(v => {
      const date = new Date(v.date_vente)
      if (isNaN(date)) return
      const hour = date.getHours()
      if (hour >= 8 && hour <= 20) hourDistribution[hour - 8].ventes += 1
    })

    return {
      totalCA, avgOrder, growth, monthly, forecast, seasonality,
      topClients, hourDistribution,
      totalVentes: completed.length,
      totalOrders: ventes.length,
    }
  }, [ventes, monthlySales])

  // ============================================================
  // LOADING INITIAL
  // ============================================================
  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-base font-medium text-base-content/70 animate-pulse">
            Chargement des analyses...
          </p>
        </div>
      </div>
    )
  }

  if (error && !statsData) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
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
  // ONGLETS
  // ============================================================
  const tabs = [
    { id: 'tendances', label: 'Tendances', icon: TrendingUp },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'saisonnalite', label: 'Saisonnalité', icon: Calendar },
    { id: 'previsions', label: 'Prévisions', icon: Target },
  ]

  // ============================================================
  // CONTENU DES ONGLETS
  // ============================================================
  const renderTabContent = () => {
    switch (activeTab) {
      case 'tendances':
        return (
          <>
            <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
              <h2 className="text-base lg:text-lg font-semibold mb-4">
                Évolution des ventes ({nbMois} derniers mois)
              </h2>
              <div className="h-64 lg:h-80" style={{ minHeight: 256, minWidth: 0 }}>
                {analyses.monthly.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={analyses.monthly} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value) => formatPrice(value)} />
                      <Legend />
                      <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="CA mensuel" />
                      <Line type="monotone" dataKey="total" stroke="#ef4444" strokeWidth={2} name="Tendance" dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="Aucune donnée sur cette période" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <InfoCard
                icon={TrendingUp}
                color="text-success"
                bg="bg-success/10"
                title="Meilleur mois"
                value={analyses.monthly.length > 0 ? analyses.monthly.reduce((a, b) => a.total > b.total ? a : b).mois : '-'}
                sub={analyses.monthly.length > 0 ? formatPrice(analyses.monthly.reduce((a, b) => a.total > b.total ? a : b).total) : '-'}
              />
              <InfoCard
                icon={TrendingDown}
                color="text-error"
                bg="bg-error/10"
                title="Plus faible mois"
                value={analyses.monthly.length > 0 ? analyses.monthly.reduce((a, b) => a.total < b.total ? a : b).mois : '-'}
                sub={analyses.monthly.length > 0 ? formatPrice(analyses.monthly.reduce((a, b) => a.total < b.total ? a : b).total) : '-'}
              />
              <InfoCard
                icon={Zap}
                color="text-primary"
                bg="bg-primary/10"
                title="Moyenne mensuelle"
                value={analyses.monthly.length > 0 ? formatPrice(analyses.monthly.reduce((s, m) => s + m.total, 0) / analyses.monthly.length) : '-'}
                sub={`sur ${analyses.monthly.length} mois`}
              />
            </div>
          </>
        )

      case 'clients':
        return (
          <>
            <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
              <h2 className="text-base lg:text-lg font-semibold mb-4">Top 10 clients</h2>
              <div className="overflow-x-auto">
                <table className="table table-zebra table-sm">
                  <thead>
                    <tr><th>#</th><th>Client</th><th className="text-right">Achats</th><th className="text-right">CA</th><th className="text-right">Panier moyen</th></tr>
                  </thead>
                  <tbody>
                    {analyses.topClients.length > 0 ? (
                      analyses.topClients.map((client, i) => (
                        <tr key={i}>
                          <td className="font-bold text-primary">#{i + 1}</td>
                          <td>{client.nom}</td>
                          <td className="text-right">{client.count}</td>
                          <td className="text-right font-semibold">{formatPrice(client.total)}</td>
                          <td className="text-right">{formatPrice(client.total / client.count)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="5" className="text-center text-sm text-base-content/50 py-4">Aucune donnée client</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
              <h2 className="text-base lg:text-lg font-semibold mb-4">Répartition des clients</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <MiniStat label="Clients uniques" value={analyses.topClients.length} />
                <MiniStat
                  label="CA moyen / client"
                  value={analyses.topClients.length > 0 ? formatPrice(analyses.totalCA / analyses.topClients.length) : '0 FCFA'}
                />
                <MiniStat
                  label="Meilleur client"
                  value={analyses.topClients.length > 0 ? analyses.topClients[0].nom : '-'}
                  color="text-primary"
                />
              </div>
            </div>
          </>
        )

      case 'saisonnalite':
        return (
          <>
            <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
              <h2 className="text-base lg:text-lg font-semibold mb-4">CA par jour de la semaine</h2>
              <div className="h-64 lg:h-72" style={{ minHeight: 256, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyses.seasonality} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="jour" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => formatPrice(value)} />
                    <Bar dataKey="ca" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                      {analyses.seasonality.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
              <h2 className="text-base lg:text-lg font-semibold mb-4">Heures de pointe</h2>
              <div className="h-56 lg:h-64" style={{ minHeight: 224, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyses.hourDistribution} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="heure" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="ventes" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )

      case 'previsions':
        return (
          <>
            <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
              <h2 className="text-base lg:text-lg font-semibold mb-4">Prévision des ventes</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                {analyses.forecast.length > 0 ? (
                  <div className="stat p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="stat-figure text-primary"><Target className="w-5 h-5" /></div>
                    <div className="stat-title text-xs">Prévision mois prochain</div>
                    <div className="stat-value text-lg text-primary">{formatPrice(analyses.forecast[0].total)}</div>
                    <div className="stat-desc text-xs">Moyenne mobile 3 mois</div>
                  </div>
                ) : (
                  <div className="stat p-4 bg-base-200 rounded-lg">
                    <div className="stat-title text-xs">Prévision</div>
                    <div className="stat-value text-lg text-base-content/50">Données insuffisantes</div>
                    <div className="stat-desc text-xs">Minimum 3 mois requis</div>
                  </div>
                )}
                <div className="stat p-4 bg-base-200 rounded-lg">
                  <div className="stat-title text-xs">Tendance</div>
                  <div className={`stat-value text-lg ${analyses.growth >= 0 ? 'text-success' : 'text-error'}`}>
                    {analyses.growth >= 0 ? '+' : ''}{analyses.growth.toFixed(1)}%
                  </div>
                  <div className="stat-desc text-xs">vs mois précédent</div>
                </div>
                <div className="stat p-4 bg-base-200 rounded-lg">
                  <div className="stat-title text-xs">Confiance</div>
                  <div className="stat-value text-lg text-accent">
                    {analyses.monthly.length >= 6 ? 'Élevée' : analyses.monthly.length >= 3 ? 'Moyenne' : 'Faible'}
                  </div>
                  <div className="stat-desc text-xs">{analyses.monthly.length} mois de données</div>
                </div>
              </div>
              <div className="h-56 lg:h-64" style={{ minHeight: 224, minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={[...analyses.monthly, ...analyses.forecast]}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => formatPrice(value)} />
                    <Legend />
                    <Bar dataKey="total" fill="#3b82f6" name="CA réel" />
                    <Line type="monotone" dataKey="total" stroke="#ef4444" strokeWidth={2} name="Tendance" strokeDasharray="5 5" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
              <h2 className="text-base lg:text-lg font-semibold mb-4">Recommandations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analyses.growth < 0 && (
                  <Recommendation
                    icon={AlertCircle} color="text-warning" bg="bg-warning/10"
                    title="Baisse d'activité" text="Augmentez vos actions marketing."
                  />
                )}
                {analyses.seasonality.length > 0 && (
                  <Recommendation
                    icon={Calendar} color="text-info" bg="bg-info/10"
                    title="Saisonnalité"
                    text={`${analyses.seasonality.reduce((a, b) => a.ca > b.ca ? a : b).jour} est votre meilleur jour.`}
                  />
                )}
                {analyses.topClients.length > 0 && (
                  <Recommendation
                    icon={Users} color="text-success" bg="bg-success/10"
                    title="Fidélisation"
                    text={`Client clé : ${analyses.topClients[0].nom}. Offres exclusives.`}
                  />
                )}
                {analyses.avgOrder > 0 && (
                  <Recommendation
                    icon={Zap} color="text-accent" bg="bg-accent/10"
                    title="Upselling"
                    text={`Panier moyen : ${formatPrice(analyses.avgOrder)}. Proposez des ventes croisées.`}
                  />
                )}
              </div>
            </div>
          </>
        )

      default:
        return null
    }
  }

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <div className="space-y-4 lg:space-y-6 p-3 lg:p-6">
      {/* Spinner overlay */}
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
        <div className="fixed top-16 lg:top-20 right-3 lg:right-6 z-50 w-[calc(100%-1.5rem)] lg:w-auto max-w-md">
          <div className={`alert shadow-lg ${
            notification.type === 'success' ? 'alert-success' :
            notification.type === 'warning' ? 'alert-warning' : 'alert-error'
          }`}>
            {notification.type === 'success' && <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5" />}
            {notification.type === 'warning' && <AlertCircle className="w-4 h-4 lg:w-5 lg:h-5" />}
            {notification.type === 'error' && <X className="w-4 h-4 lg:w-5 lg:h-5" />}
            <span className="text-sm lg:text-base font-medium">{notification.message}</span>
            <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setNotification({ ...notification, show: false })}>
              <X className="w-3 h-3 lg:w-4 lg:h-4" />
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Analyses & Intelligence</h1>
          <p className="text-xs lg:text-sm text-base-content/60">Analyses avancées et prévisions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="select select-bordered select-sm"
            value={period}
            onChange={(e) => { setPeriod(e.target.value); setInitialLoad(true); setLoading(true) }}
            disabled={loading}
          >
            <option value="3m">3 mois</option>
            <option value="6m">6 mois</option>
            <option value="12m">12 mois</option>
            <option value="all">Tout</option>
          </select>
          <button onClick={refreshData} className="btn btn-outline btn-sm gap-1" disabled={loading}>
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Actualiser
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
        <KpiCard icon={DollarSign} color="text-primary" title="CA total" value={formatPrice(analyses.totalCA)} />
        <KpiCard icon={Package} color="text-secondary" title="Panier moyen" value={formatPrice(analyses.avgOrder)} />
        <KpiCard
          icon={TrendingUp}
          color={analyses.growth >= 0 ? 'text-success' : 'text-error'}
          title="Croissance"
          value={`${analyses.growth >= 0 ? '+' : ''}${analyses.growth.toFixed(1)}%`}
        />
        <KpiCard icon={Activity} color="text-warning" title="Commandes" value={analyses.totalOrders} />
      </div>

      {/* Tabs */}
      <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-1">
        <div className="flex flex-wrap gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                className={`btn btn-sm gap-1 lg:gap-2 ${
                  activeTab === tab.id ? 'btn-primary text-white' : 'btn-ghost'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="w-3 h-3 lg:w-4 lg:h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Contenu */}
      <div className="space-y-4">
        {renderTabContent()}
      </div>
    </div>
  )
}

// ============================================================
// SOUS-COMPOSANTS
// ============================================================
const KpiCard = ({ icon: Icon, color, title, value }) => (
  <div className="stat bg-base-100 rounded-lg lg:rounded-xl shadow-sm border border-base-300 p-2 lg:p-4">
    <div className={`stat-figure ${color}`}><Icon className="w-4 h-4 lg:w-5 lg:h-5" /></div>
    <div className="stat-title text-xs lg:text-sm">{title}</div>
    <div className={`stat-value text-base lg:text-xl ${color}`}>{value}</div>
  </div>
)

const InfoCard = ({ icon: Icon, color, bg, title, value, sub }) => (
  <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
    <div className="flex items-center gap-3">
      <div className={`p-2 ${bg} rounded-lg ${color}`}><Icon className="w-5 h-5" /></div>
      <div>
        <p className="text-xs text-base-content/50">{title}</p>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
        <p className="text-sm">{sub}</p>
      </div>
    </div>
  </div>
)

const MiniStat = ({ label, value, color = '' }) => (
  <div className="stat p-3 bg-base-200 rounded-lg">
    <div className="stat-title text-xs">{label}</div>
    <div className={`stat-value text-lg ${color}`}>{value}</div>
  </div>
)

const Recommendation = ({ icon: Icon, color, bg, title, text }) => (
  <div className={`p-3 ${bg} rounded-lg border border-current/20 flex items-start gap-3`}>
    <Icon className={`w-5 h-5 ${color} mt-0.5`} />
    <div>
      <p className={`text-sm font-medium ${color}`}>{title}</p>
      <p className="text-xs text-base-content/60">{text}</p>
    </div>
  </div>
)

const EmptyChart = ({ message = 'Aucune donnée' }) => (
  <div className="h-full flex items-center justify-center text-base-content/40">
    <p className="text-sm">{message}</p>
  </div>
)

export default Analyses