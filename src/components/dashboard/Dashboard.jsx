// src/components/dashboard/Dashboard.jsx
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import AxiosInstance from '../AxiosInstance'
import {
  Users, Package, Truck, DollarSign, ShoppingCart,
  AlertCircle, CheckCircle, Clock, RefreshCw, Calendar,
  UserCheck, Loader2, X, Wallet, TrendingUp, TrendingDown,
  PiggyBank, Calculator, Warehouse, UserCog, ChevronRight,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area,
} from 'recharts'

// ============================================================
// CONSTANTES
// ============================================================
const CACHE_TTL_MS = 2 * 60 * 1000  // 2 minutes
const COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#06b6d4', '#6366f1',
  '#84cc16', '#f97316', '#14b8a6', '#a855f7',
]

// ============================================================
// HELPERS
// ============================================================
const unwrapList = (payload) => Array.isArray(payload) ? payload : (payload?.results || [])

/**
 * ✅ Extrait les items d'un chart au format `{data: [{label, value, color}]}`
 * OU d'un array direct `[{label, value, color}]`
 * OU d'un dict `{label: value}`
 */
const extractChartItems = (raw) => {
  if (!raw) return []
  let arr = null
  if (Array.isArray(raw)) arr = raw
  else if (Array.isArray(raw.data)) arr = raw.data
  else if (typeof raw === 'object') {
    arr = Object.entries(raw).map(([k, v]) => ({ label: k, value: Number(v) || 0 }))
  }
  if (!arr) return []
  return arr
    .map((item, i) => ({
      name: item.label ?? item.name ?? 'Inconnu',
      value: Number(item.value ?? item.montant ?? 0) || 0,
      color: item.color || COLORS[i % COLORS.length],
    }))
    .filter(i => i.value > 0)
}

const Dashboard = () => {
  // ---------- États ----------
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState(null)

  const [currentUser, setCurrentUser] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)
  const [period, setPeriod] = useState('mois')
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })

  // ---------- Refs ----------
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

  // ---------- Chargement ----------
  const fetchAll = useCallback(async ({ bypassCache = false } = {}) => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    const cacheKey = `dashboard:${period}`
    const cached = cacheRef.current.get(cacheKey)
    const now = Date.now()

    if (!bypassCache && cached && (now - cached.timestamp) < CACHE_TTL_MS) {
      setCurrentUser(cached.user)
      setDashboardData(cached.global)
      setLoading(false)
      setInitialLoad(false)
      return
    }

    try {
      // ✅ 2 appels parallèles : user + global (qui contient déjà les charts)
      const [userRes, globalRes] = await Promise.all([
        AxiosInstance.get('/users/me/', { signal: controller.signal }).catch(() => ({ data: null })),
        AxiosInstance.get('/dashboard/global/', {
          params: { periode: period, limit: 5 },
          signal: controller.signal,
        }),
      ])

      if (controller.signal.aborted) return

      setCurrentUser(userRes.data)
      setDashboardData(globalRes.data)

      cacheRef.current.set(cacheKey, {
        user: userRes.data,
        global: globalRes.data,
        timestamp: now,
      })
      if (cacheRef.current.size > 5) {
        cacheRef.current.delete(cacheRef.current.keys().next().value)
      }

    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return

      console.error('Erreur dashboard:', err)
      console.error('Status:', err.response?.status, 'Data:', err.response?.data)

      if (err.response?.status === 401) {
        setError('Session expirée, veuillez vous reconnecter')
      } else if (err.response?.status === 403) {
        setError("Vous n'avez pas les droits pour voir ce tableau de bord")
      } else {
        setError(err.response?.data?.error || 'Erreur de chargement du tableau de bord')
      }
      showNotification('Erreur de chargement', 'error')
    } finally {
      if (abortRef.current === controller) {
        setLoading(false)
        setInitialLoad(false)
      }
    }
  }, [period, showNotification])

  useEffect(() => { fetchAll() }, [fetchAll])

  const refreshData = async () => {
    cacheRef.current.clear()
    await fetchAll({ bypassCache: true })
  }

  // ---------- Formatage ----------
  const formatPrice = (price) => {
    const n = Number(price)
    if (!Number.isFinite(n) || n === 0) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n) + ' FCFA'
  }

  const formatNumber = (n) => {
    const num = Number(n)
    if (!Number.isFinite(num)) return '0'
    return new Intl.NumberFormat('fr-FR').format(num)
  }

  const formatDate = (date) => {
    if (!date) return '-'
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch { return '-' }
  }

  // ---------- Données dérivées (adaptées au format de TON backend) ----------
  const data = dashboardData || {}
  const statsGlobales = data.stats_globales || {}
  const ventes = statsGlobales.ventes || {}
  const achats = statsGlobales.achats || {}
  const tresorerie = statsGlobales.tresorerie || {}
  const produits = statsGlobales.produits || {}
  const inventaire = statsGlobales.inventaire || {}
  const rh = statsGlobales.rh || {}
  const utilisateurs = statsGlobales.utilisateurs || {}
  const comptabilite = statsGlobales.comptabilite || {}

  const alerts = useMemo(() => unwrapList(data.alertes), [data.alertes])

  // ✅ Recettes / dépenses (format {label, montant})
  const monthlyChartData = useMemo(() => {
    const recettes = unwrapList(data.recettes_par_mois)
    const depenses = unwrapList(data.depenses_par_mois)

    const map = new Map()
    recettes.forEach(r => {
      const key = r.label || ''
      if (key) map.set(key, { mois: key, recettes: Number(r.montant) || 0, depenses: 0 })
    })
    depenses.forEach(d => {
      const key = d.label || ''
      if (!key) return
      const existing = map.get(key) || { mois: key, recettes: 0, depenses: 0 }
      existing.depenses = Number(d.montant) || 0
      map.set(key, existing)
    })
    return Array.from(map.values())
  }, [data.recettes_par_mois, data.depenses_par_mois])

  // ✅ Top produits (format {product__name, quantite, total})
  const topProducts = useMemo(() => unwrapList(data.top_produits), [data.top_produits])

  // ✅ Charts circulaires (format {title, type, data: [{label, value, color}], total})
  const chartsData = data.charts || {}

  // ✅ Activités récentes
  const recentActivities = useMemo(() => unwrapList(data.dernieres_activites), [data.dernieres_activites])

  // ---------- KPI Cards ----------
  const kpiCards = useMemo(() => [
    {
      title: "Chiffre d'affaires",
      value: formatPrice(ventes.ca_total),
      icon: DollarSign,
      color: 'text-primary',
      sub: `${formatNumber(ventes.ventes_total)} ventes`,
    },
    {
      title: 'Trésorerie',
      value: formatPrice(tresorerie.solde_global),
      icon: Wallet,
      color: (Number(tresorerie.solde_global) || 0) >= 0 ? 'text-success' : 'text-error',
      sub: `${tresorerie.nb_caisses || 0} caisses • ${tresorerie.nb_comptes || 0} comptes`,
    },
    {
      title: 'Valeur du stock',
      value: formatPrice(produits.valeur_stock),
      icon: Package,
      color: 'text-info',
      sub: `${produits.total || 0} produits`,
    },
    {
      title: 'Impayés',
      value: formatPrice(ventes.impayes),
      icon: AlertCircle,
      color: 'text-error',
      sub: `${ventes.ventes_en_attente || 0} ventes en attente`,
    },
    {
      title: 'Employés actifs',
      value: formatNumber(rh.employes_actifs),
      icon: Users,
      color: 'text-secondary',
      sub: `${rh.conges_en_attente || 0} congés en attente`,
    },
    {
      title: 'Alertes',
      value: formatNumber(alerts.length),
      icon: AlertCircle,
      color: alerts.length > 0 ? 'text-error' : 'text-success',
      sub: alerts.length > 0 ? 'À traiter' : 'Tout est OK',
    },
  ], [ventes, tresorerie, produits, rh, alerts])

  // ---------- Loading initial ----------
  if (initialLoad && loading) {
    return <DashboardSkeleton />
  }

  if (error && !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold text-base-content mb-2">Erreur de chargement</h2>
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
      {/* Spinner rechargement */}
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
          <h1 className="text-2xl lg:text-3xl font-bold text-base-content">
            Tableau de bord
          </h1>
          <p className="text-xs lg:text-sm text-base-content/60">
            Vue d'ensemble de votre activité
            {currentUser && <span className="ml-2 text-primary">• {currentUser.email}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="select select-bordered select-sm"
            value={period}
            onChange={(e) => { setPeriod(e.target.value); setInitialLoad(true); setLoading(true) }}
            disabled={loading}
          >
            <option value="jour">Aujourd'hui</option>
            <option value="semaine">Cette semaine</option>
            <option value="mois">Ce mois</option>
            <option value="trimestre">Ce trimestre</option>
            <option value="annee">Cette année</option>
          </select>
          <button
            onClick={refreshData}
            className="btn btn-outline btn-sm lg:btn-md gap-1 lg:gap-2"
            disabled={loading}
          >
            <RefreshCw className={`w-3 h-3 lg:w-4 lg:h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 lg:gap-3">
        {kpiCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div key={index} className="stat bg-base-100 rounded-lg lg:rounded-xl shadow-sm border border-base-300 p-2 lg:p-4">
              <div className="flex items-center gap-2">
                <div className={`stat-figure ${card.color}`}>
                  <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
                </div>
                <div className="stat-title text-xs lg:text-sm truncate">{card.title}</div>
              </div>
              <div className={`stat-value text-sm lg:text-lg xl:text-xl font-bold truncate ${card.color}`}>
                {card.value}
              </div>
              {card.sub && (
                <div className="stat-desc text-xs text-base-content/50 truncate">{card.sub}</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Charts principaux : recettes vs dépenses + top produits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base lg:text-lg font-semibold">Recettes vs Dépenses</h2>
            <span className="text-xs text-base-content/50">12 derniers mois</span>
          </div>
          <div className="h-64 lg:h-72">
            {monthlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatPrice(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="recettes" name="Recettes" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="depenses" name="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="Aucune donnée sur cette période" />
            )}
          </div>
        </div>

        <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base lg:text-lg font-semibold">Top produits</h2>
            <span className="text-xs text-base-content/50">Quantité vendue</span>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {topProducts.length > 0 ? (
              topProducts.map((product, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {product.product__name || product.produit || 'Produit'}
                    </p>
                    <p className="text-xs text-base-content/50">
                      {formatNumber(product.quantite)} unités
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">
                      {formatPrice(product.total)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-base-content/50 py-8">Aucune donnée</p>
            )}
          </div>
        </div>
      </div>

      {/* ✅ SECTION CHARTS CIRCULAIRES — c'est CE QUI MANQUAIT */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base lg:text-lg font-semibold">Analyses graphiques</h2>
          <span className="text-xs text-base-content/50">
            {Object.keys(chartsData).length} graphiques disponibles
          </span>
        </div>

        {Object.keys(chartsData).length === 0 ? (
          <div className="alert alert-warning">
            <AlertCircle className="w-4 h-4" />
            <span>
              Aucun graphique disponible. Vérifie que <code>/dashboard/global/</code> renvoie bien <code>charts</code>.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ChartCard title="Ventes par statut" data={chartsData.ventes_par_statut} />
            <ChartCard title="Produits par catégorie" data={chartsData.produits_par_categorie} />
            <ChartCard title="Trésorerie" data={chartsData.tresorerie} />
            <ChartCard title="Clients par type" data={chartsData.clients_par_type} />
            <ChartCard title="Mouvements de stock" data={chartsData.mouvements_par_type} />
            <ChartCard title="Employés par statut" data={chartsData.rh_par_statut} />
          </div>
        )}
      </div>

      {/* Alertes + Activités */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base lg:text-lg font-semibold">Alertes</h2>
            <span className={`badge ${alerts.length > 0 ? 'badge-error' : 'badge-success'} badge-sm`}>
              {alerts.length}
            </span>
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {alerts.length > 0 ? (
              alerts.slice(0, 5).map((alert, index) => (
                <div key={index} className={`flex items-start gap-3 p-2 rounded-lg border ${
                  alert.niveau === 'error' ? 'bg-error/5 border-error/20' :
                  alert.niveau === 'warning' ? 'bg-warning/5 border-warning/20' :
                  'bg-info/5 border-info/20'
                }`}>
                  <AlertCircle className={`w-4 h-4 mt-0.5 ${
                    alert.niveau === 'error' ? 'text-error' :
                    alert.niveau === 'warning' ? 'text-warning' : 'text-info'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{alert.message}</p>
                    {alert.details && <p className="text-xs text-base-content/60">{alert.details}</p>}
                    {alert.module && <p className="text-xs text-base-content/50">Module: {alert.module}</p>}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-base-content/50 py-8">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />
                Aucune alerte active
              </p>
            )}
          </div>
        </div>

        <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base lg:text-lg font-semibold">Activités récentes</h2>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {recentActivities.length > 0 ? (
              recentActivities.slice(0, 6).map((a, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-base-200 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    {a.type === 'achat' ? (
                      <Truck className="w-3 h-3 text-info flex-shrink-0" />
                    ) : a.type === 'transfert' ? (
                      <RefreshCw className="w-3 h-3 text-warning flex-shrink-0" />
                    ) : (
                      <ShoppingCart className="w-3 h-3 text-primary flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate">
                      {a.reference || 'N/A'}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-sm font-semibold">{formatPrice(a.montant)}</p>
                    <p className="text-xs text-base-content/50">{a.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-base-content/50 py-8">Aucune activité récente</p>
            )}
          </div>
        </div>
      </div>

      {/* RH */}
      {(currentUser?.role_global === 'pdg' || currentUser?.is_superuser) && (
        <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base lg:text-lg font-semibold">Statistiques RH</h2>
            <span className="badge badge-primary badge-sm">PDG/DRH</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStat icon={Users} label="Total employés" value={formatNumber(rh.employes_total)} color="text-secondary" />
            <MiniStat icon={UserCheck} label="Actifs" value={formatNumber(rh.employes_actifs)} color="text-success" />
            <MiniStat icon={Clock} label="Congés en attente" value={formatNumber(rh.conges_en_attente)} color="text-warning" />
            <MiniStat icon={DollarSign} label="Paie du mois" value={formatPrice(rh.paie_mois)} color="text-error" />
          </div>
        </div>
      )}

      <div className="text-center text-xs text-base-content/40 py-4 border-t border-base-300">
        Données mises à jour en temps réel • {new Date().toLocaleString('fr-FR')}
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

// ============================================================
// SOUS-COMPOSANTS
// ============================================================
const MiniStat = ({ icon: Icon, label, value, color }) => (
  <div className="stat p-3 bg-base-200 rounded-lg">
    <div className={`stat-figure ${color}`}><Icon className="w-4 h-4" /></div>
    <div className="stat-title text-xs">{label}</div>
    <div className="stat-value text-base lg:text-lg">{value}</div>
  </div>
)

const EmptyChart = ({ message = 'Aucune donnée' }) => (
  <div className="h-full flex items-center justify-center text-base-content/40">
    <p className="text-sm">{message}</p>
  </div>
)

/**
 * ✅ ChartCard qui gère TOUS les formats de données
 */
const ChartCard = ({ title, data }) => {
  const items = useMemo(() => extractChartItems(data), [data])

  // Log pour debug
  if (typeof window !== 'undefined' && window.console) {
    console.log(`[ChartCard] ${title}`, { hasData: !!data, itemsCount: items.length, items })
  }

  if (items.length === 0) {
    return (
      <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
        <h3 className="text-sm font-semibold mb-3">{title}</h3>
        <div className="h-48 flex items-center justify-center text-base-content/40">
          <p className="text-xs">Aucune donnée disponible</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={60}
              innerRadius={25}
              paddingAngle={2}
            >
              {items.map((item, i) => (
                <Cell key={i} fill={item.color || COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, n) => [new Intl.NumberFormat('fr-FR').format(v), n]}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

const DashboardSkeleton = () => (
  <div className="space-y-4 lg:space-y-6 p-3 lg:p-6 animate-pulse">
    <div className="h-10 bg-base-300 rounded w-64" />
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 lg:gap-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-base-200 rounded-xl h-24 p-4">
          <div className="h-3 bg-base-300 rounded w-16 mb-2" />
          <div className="h-6 bg-base-300 rounded w-24 mb-2" />
          <div className="h-2 bg-base-300 rounded w-20" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-base-200 rounded-xl h-80" />
      <div className="bg-base-200 rounded-xl h-80" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-base-200 rounded-xl h-64" />
      ))}
    </div>
  </div>
)

export default Dashboard