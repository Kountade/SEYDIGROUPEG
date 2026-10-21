// src/components/dashboard/Statistiques.jsx
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import AxiosInstance from '../AxiosInstance'
import {
  BarChart3, Calendar, Filter, Download, RefreshCw,
  TrendingUp, TrendingDown, DollarSign, Package, Users,
  PieChart, X, CheckCircle, AlertCircle, Loader2,
  Printer, FileText
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LineChart, Line,
  PieChart as RePieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'

const CACHE_TTL_MS = 2 * 60 * 1000
const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#6366f1']

const unwrapList = (payload) => Array.isArray(payload) ? payload : (payload?.results || [])

const Statistiques = () => {
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState(null)

  const [currentUser, setCurrentUser] = useState(null)
  const [agences, setAgences] = useState([])
  const [globalData, setGlobalData] = useState(null)
  const [monthlySales, setMonthlySales] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [ventes, setVentes] = useState([])

  const [period, setPeriod] = useState('12m')
  const [filterAgence, setFilterAgence] = useState('')
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })

  const cacheRef = useRef(new Map())
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

  // ✅ Traduire "12m" → nb_mois
  const nbMois = useMemo(() => {
    if (period === '3m') return 3
    if (period === '6m') return 6
    if (period === '12m') return 12
    return 24  // 'all'
  }, [period])

  const fetchAll = useCallback(async ({ bypassCache = false } = {}) => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    const cacheKey = `statistiques:${period}:${filterAgence}`
    const cached = cacheRef.current.get(cacheKey)
    const now = Date.now()

    if (!bypassCache && cached && (now - cached.timestamp) < CACHE_TTL_MS) {
      setCurrentUser(cached.user)
      setGlobalData(cached.global)
      setMonthlySales(cached.monthlySales)
      setTopProducts(cached.topProducts)
      setVentes(cached.ventes)
      setLoading(false)
      setInitialLoad(false)
      return
    }

    try {
      const baseParams = filterAgence ? { agence_id: filterAgence } : {}

      // ✅ 4 appels parallèles avec les VRAIS endpoints
      const [userRes, globalRes, recettesRes, topRes, ventesRes] = await Promise.all([
        AxiosInstance.get('/users/me/', { signal: controller.signal }).catch(() => ({ data: null })),

        // Stats globales (contient stats_globales, alertes, etc.)
        AxiosInstance.get('/dashboard/global/', {
          params: { ...baseParams, periode: 'mois', limit: 5 },
          signal: controller.signal,
        }),

        // Recettes mensuelles → /dashboard/charts/?type=recettes
        AxiosInstance.get('/dashboard/charts/', {
          params: { ...baseParams, type: 'recettes', nb_mois: nbMois },
          signal: controller.signal,
        }).catch(err => {
          console.error('❌ recettes:', err.response?.status, err.response?.data)
          return { data: [] }
        }),

        // Top produits → /analyses/top-produits/
        AxiosInstance.get('/analyses/top-produits/', {
          params: { ...baseParams, limit: 10 },
          signal: controller.signal,
        }).catch(err => {
          console.error('❌ top-produits:', err.response?.status, err.response?.data)
          return { data: [] }
        }),

        // Ventes (liste pour le tableau détaillé)
        AxiosInstance.get('/ventes/', {
          params: { ...baseParams, page_size: 200 },
          signal: controller.signal,
        }).catch(err => {
          console.error('❌ ventes:', err.response?.status)
          return { data: [] }
        }),
      ])

      if (controller.signal.aborted) return

      setCurrentUser(userRes.data)
      setGlobalData(globalRes.data)
      setMonthlySales(unwrapList(recettesRes.data))
      setTopProducts(unwrapList(topRes.data))
      setVentes(unwrapList(ventesRes.data))

      cacheRef.current.set(cacheKey, {
        user: userRes.data,
        global: globalRes.data,
        monthlySales: unwrapList(recettesRes.data),
        topProducts: unwrapList(topRes.data),
        ventes: unwrapList(ventesRes.data),
        timestamp: now,
      })

    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
      console.error('❌ Erreur statistiques:', err)
      setError(err.response?.data?.error || 'Erreur de chargement')
      showNotification('Erreur de chargement des statistiques', 'error')
    } finally {
      if (abortRef.current === controller) {
        setLoading(false)
        setInitialLoad(false)
      }
    }
  }, [period, filterAgence, nbMois, showNotification])

  // ✅ Chargement des agences (une seule fois)
  useEffect(() => {
    const controller = new AbortController()
    AxiosInstance.get('/agences/', { params: { page_size: 200 }, signal: controller.signal })
      .then(res => setAgences(unwrapList(res.data)))
      .catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const refreshData = async () => {
    cacheRef.current.clear()
    await fetchAll({ bypassCache: true })
  }

  const formatPrice = (price) => {
    const n = Number(price)
    if (!Number.isFinite(n) || n === 0) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
  }

  // ✅ Statistiques calculées
  const stats = useMemo(() => {
    const total = ventes.length
    const completed = ventes.filter(v => v.status === 'completed')
    const pending = ventes.filter(v => v.status === 'pending_approval')
    const approved = ventes.filter(v => v.status === 'approved')
    const rejected = ventes.filter(v => v.status === 'rejected')
    const totalCA = completed.reduce((sum, v) => sum + (Number(v.total) || 0), 0)
    const avgOrder = totalCA / (completed.length || 1)

    const statusDistribution = [
      { name: 'Complétées', value: completed.length, color: COLORS[0] },
      { name: 'Approuvées', value: approved.length, color: COLORS[1] },
      { name: 'En attente', value: pending.length, color: COLORS[2] },
      { name: 'Rejetées', value: rejected.length, color: COLORS[3] },
    ].filter(s => s.value > 0)

    const agenceDistribution = agences.map(ag => {
      const count = ventes.filter(v => v.agence_nom === ag.nom).length
      const ca = ventes
        .filter(v => v.agence_nom === ag.nom && v.status === 'completed')
        .reduce((sum, v) => sum + (Number(v.total) || 0), 0)
      return { nom: ag.nom, count, ca }
    }).filter(a => a.count > 0)

    return {
      total, completed: completed.length, pending: pending.length,
      approved: approved.length, rejected: rejected.length,
      totalCA, avgOrder, statusDistribution, agenceDistribution,
    }
  }, [ventes, agences])

  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-base font-medium text-base-content/70 animate-pulse">
            Chargement des statistiques...
          </p>
        </div>
      </div>
    )
  }

  if (error && !globalData) {
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

      {notification.show && (
        <div className="fixed top-16 lg:top-20 right-3 lg:right-6 z-50 w-[calc(100%-1.5rem)] lg:w-auto max-w-md">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg`}>
            {notification.type === 'success'
              ? <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5" />
              : <AlertCircle className="w-4 h-4 lg:w-5 lg:h-5" />}
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
          <h1 className="text-2xl lg:text-3xl font-bold">Statistiques</h1>
          <p className="text-xs lg:text-sm text-base-content/60">Analyse détaillée de vos performances</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="select select-bordered select-sm"
            value={period}
            onChange={(e) => { setPeriod(e.target.value); setInitialLoad(true); setLoading(true) }}
            disabled={loading}
          >
            <option value="3m">3 derniers mois</option>
            <option value="6m">6 derniers mois</option>
            <option value="12m">12 derniers mois</option>
            <option value="all">Tout</option>
          </select>
          <select
            className="select select-bordered select-sm"
            value={filterAgence}
            onChange={(e) => { setFilterAgence(e.target.value); setInitialLoad(true); setLoading(true) }}
            disabled={loading}
          >
            <option value="">Toutes agences</option>
            {agences.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
          </select>
          <button onClick={refreshData} className="btn btn-outline btn-sm gap-1" disabled={loading}>
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Actualiser
          </button>
        </div>
      </div>

      {/* Cartes résumées */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-3">
        <StatCard title="Total ventes" value={stats.total} />
        <StatCard title="CA total" value={formatPrice(stats.totalCA)} color="text-primary" />
        <StatCard title="Panier moyen" value={formatPrice(stats.avgOrder)} color="text-secondary" />
        <StatCard
          title="Taux de conversion"
          value={stats.total > 0 ? `${Math.round((stats.completed / stats.total) * 100)}%` : '0%'}
          color="text-success"
        />
        <StatCard title="En attente" value={stats.pending} color="text-warning" />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Évolution CA */}
        <ChartContainer title="Évolution du CA" subtitle={`${nbMois} derniers mois`}>
          {monthlySales.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatPrice(v)} />
                <Area type="monotone" dataKey="montant" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartContainer>

        {/* Répartition par statut */}
        <ChartContainer title="Répartition par statut" subtitle="Nombre de ventes">
          {stats.statusDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={stats.statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} ventes`} />
                <Legend />
              </RePieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartContainer>
      </div>

      {/* Top produits + Agence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <ChartContainer title="Top 10 produits" subtitle="Quantité vendue">
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topProducts.slice(0, 10)}
                layout="vertical"
                margin={{ top: 5, right: 10, left: 60, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="product__name"
                  tick={{ fontSize: 10 }}
                  width={60}
                />
                <Tooltip formatter={(value) => `${value} unités`} />
                <Bar dataKey="quantite" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartContainer>

        <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base lg:text-lg font-semibold">Performance par agence</h2>
            <span className="text-xs text-base-content/50">CA</span>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Agence</th>
                  <th className="text-right">Ventes</th>
                  <th className="text-right">CA</th>
                  <th className="text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {stats.agenceDistribution.length > 0 ? (
                  stats.agenceDistribution.map((ag, i) => {
                    const percentage = stats.totalCA > 0 ? ((ag.ca / stats.totalCA) * 100).toFixed(1) : 0
                    return (
                      <tr key={i}>
                        <td className="font-medium">{ag.nom}</td>
                        <td className="text-right">{ag.count}</td>
                        <td className="text-right font-semibold text-primary">{formatPrice(ag.ca)}</td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs">{percentage}%</span>
                            <div className="w-16 h-1.5 bg-base-300 rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr><td colSpan="4" className="text-center text-sm text-base-content/50 py-4">Aucune donnée</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Détail des ventes */}
      <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base lg:text-lg font-semibold">Détail des ventes</h2>
          <span className="text-xs text-base-content/50">{ventes.length} enregistrements</span>
        </div>
        <div className="overflow-x-auto">
          <table className="table table-zebra table-sm">
            <thead>
              <tr>
                <th>Réf.</th>
                <th>Client</th>
                <th>Agence</th>
                <th>Date</th>
                <th className="text-right">Montant</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {ventes.length > 0 ? ventes.slice(0, 15).map((vente) => (
                <tr key={vente.id}>
                  <td className="font-mono text-xs">{vente.reference}</td>
                  <td>{vente.client_nom || 'Anonyme'}</td>
                  <td>{vente.agence_nom}</td>
                  <td className="text-xs">{new Date(vente.date_vente).toLocaleDateString('fr-FR')}</td>
                  <td className="text-right font-semibold">{formatPrice(vente.total)}</td>
                  <td>
                    <span className={`badge badge-sm ${
                      vente.status === 'completed' ? 'badge-success' :
                      vente.status === 'approved' ? 'badge-info' :
                      vente.status === 'pending_approval' ? 'badge-warning' :
                      vente.status === 'rejected' ? 'badge-error' : 'badge-ghost'
                    }`}>
                      {vente.status_display || vente.status}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="text-center py-4 text-base-content/50">Aucune vente</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ✅ Composants réutilisables
const StatCard = ({ title, value, color = '' }) => (
  <div className="stat bg-base-100 rounded-lg lg:rounded-xl shadow-sm border border-base-300 p-2 lg:p-4">
    <div className="stat-title text-xs lg:text-sm">{title}</div>
    <div className={`stat-value text-lg lg:text-2xl ${color}`}>{value}</div>
  </div>
)

const ChartContainer = ({ title, subtitle, children }) => (
  <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base lg:text-lg font-semibold">{title}</h2>
      <span className="text-xs text-base-content/50">{subtitle}</span>
    </div>
    <div className="h-64 lg:h-72" style={{ minHeight: 256, minWidth: 0 }}>
      {children}
    </div>
  </div>
)

const EmptyChart = () => (
  <div className="h-full flex items-center justify-center text-base-content/40">
    <p className="text-sm">Aucune donnée</p>
  </div>
)

export default Statistiques