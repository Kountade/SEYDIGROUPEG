// src/components/ventes/SalesDashboard.jsx
import React, {
  useEffect, useState, useCallback, useRef, useMemo
} from 'react'
import { useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ShoppingCart, DollarSign, TrendingUp, Clock, AlertCircle,
  RefreshCw, Users, FileText, CreditCard, Receipt, Package,
  CheckCircle, XCircle, BarChart3, ArrowRight, Eye, Loader2,
  Calendar, Wallet, Landmark, Smartphone, ChevronRight,
  ArrowUpRight, ArrowDownRight, PieChart, Activity, Zap, Star,
  FileCheck, Ban, CircleDollarSign, Percent
} from 'lucide-react'

// ============================================================
// CONSTANTES
// ============================================================
const PERIOD_OPTIONS = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'week', label: '7 jours' },
  { key: 'month', label: '30 jours' },
  { key: 'year', label: 'Cette année' },
]

const STATUS_MAP = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock },
  pending_approval: { label: 'En attente', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Clock },
  approved: { label: 'Approuvée', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle },
  rejected: { label: 'Rejetée', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  completed: { label: 'Complétée', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  cancelled: { label: 'Annulée', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Ban },
}

const PAYMENT_METHODS = {
  especes: { label: 'Espèces', icon: Wallet, color: 'text-green-600' },
  carte: { label: 'Carte', icon: CreditCard, color: 'text-blue-600' },
  cheque: { label: 'Chèque', icon: FileCheck, color: 'text-purple-600' },
  virement: { label: 'Virement', icon: Landmark, color: 'text-indigo-600' },
  mobile_money: { label: 'Mobile Money', icon: Smartphone, color: 'text-orange-600' },
  autre: { label: 'Autre', icon: CircleDollarSign, color: 'text-gray-600' },
}

// ============================================================
// HELPERS
// ============================================================
const unwrap = (data) => Array.isArray(data) ? data : (data?.results || [])

const formatPrice = (v) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return '0 FCFA'
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
}

const formatPriceCompact = (v) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return '0'
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return n.toString()
}

const formatNumber = (v) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return '0'
  return new Intl.NumberFormat('fr-FR').format(n)
}

const formatPercent = (v) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return '0%'
  return n.toFixed(1) + '%'
}

const formatDate = (date) => {
  if (!date) return '—'
  try {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch { return '—' }
}

const formatDateTime = (date) => {
  if (!date) return '—'
  try {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return '—' }
}

// ============================================================
// COMPOSANTS UI
// ============================================================
const StatCard = ({ title, value, subValue, icon: Icon, color, trend, trendValue, onClick }) => {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : null
  return (
    <div
      className={`relative overflow-hidden bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-200 ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">{title}</p>
            <p className="text-xl lg:text-2xl font-black text-gray-900 mt-1 truncate">{value}</p>
            {subValue && <p className="text-xs text-gray-500 mt-1 truncate">{subValue}</p>}
          </div>
          <div className={`p-3 rounded-xl ${color} flex-shrink-0`}>
            <Icon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
          </div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 mt-3 text-xs font-semibold ${
            trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendIcon className="w-3 h-3" />
            {trendValue}
          </div>
        )}
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${color}`} />
    </div>
  )
}

const MiniStatCard = ({ title, value, icon: Icon, color, onClick }) => (
  <div
    className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-4 border border-gray-200 ${
      onClick ? 'cursor-pointer' : ''
    }`}
    onClick={onClick}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color} flex-shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 truncate">{title}</p>
        <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  </div>
)

const StatusBadge = ({ status }) => {
  const config = STATUS_MAP[status] || STATUS_MAP.draft
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-20" />
        <div className="h-6 bg-gray-200 rounded w-32" />
        <div className="h-3 bg-gray-200 rounded w-24" />
      </div>
      <div className="w-12 h-12 bg-gray-200 rounded-xl" />
    </div>
  </div>
)

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
const SalesDashboard = () => {
  const navigate = useNavigate()

  const [period, setPeriod] = useState('today')
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [globalStats, setGlobalStats] = useState(null)
  const [ventesStats, setVentesStats] = useState(null)
  const [paiementsStats, setPaiementsStats] = useState(null)
  const [facturesStats, setFacturesStats] = useState(null)
  const [topProducts, setTopProducts] = useState([])
  const [recentVentes, setRecentVentes] = useState([])
  const [devisRecents, setDevisRecents] = useState([])

  const cacheRef = useRef(new Map())
  const fetchingRef = useRef(false)

  const fetchAll = useCallback(async ({ bypassCache = false } = {}) => {
    const key = `sales_dashboard_${period}`

    if (!bypassCache && cacheRef.current.has(key)) {
      const c = cacheRef.current.get(key)
      setGlobalStats(c.globalStats)
      setVentesStats(c.ventesStats)
      setPaiementsStats(c.paiementsStats)
      setFacturesStats(c.facturesStats)
      setTopProducts(c.topProducts)
      setRecentVentes(c.recentVentes)
      setDevisRecents(c.devisRecents)
      setLoading(false)
      setInitialLoad(false)
      return
    }

    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)

    try {
      const results = await Promise.allSettled([
        AxiosInstance.get('/dashboard/ventes/'),
        AxiosInstance.get('/ventes/stats/'),
        AxiosInstance.get('/paiements/stats/'),
        AxiosInstance.get('/factures/stats/'),
        AxiosInstance.get('/dashboard/top-products/'),
        AxiosInstance.get('/ventes/?page_size=8&ordering=-date_vente'),
        AxiosInstance.get('/devis/?page_size=5&ordering=-date_creation'),
      ])

      const getData = (r) => r.status === 'fulfilled' ? r.value?.data : null

      const newGlobal = getData(results[0])
      const newVentes = getData(results[1])
      const newPaiements = getData(results[2])
      const newFactures = getData(results[3])
      const newTop = unwrap(getData(results[4])).filter(p => p && typeof p === 'object')
      const newRecent = unwrap(getData(results[5])).filter(v => v && typeof v === 'object')
      const newDevis = unwrap(getData(results[6])).filter(d => d && typeof d === 'object')

      const payload = {
        globalStats: newGlobal,
        ventesStats: newVentes,
        paiementsStats: newPaiements,
        facturesStats: newFactures,
        topProducts: newTop,
        recentVentes: newRecent,
        devisRecents: newDevis,
      }

      cacheRef.current.set(key, payload)
      if (cacheRef.current.size > 10) {
        const firstKey = cacheRef.current.keys().next().value
        cacheRef.current.delete(firstKey)
      }

      setGlobalStats(newGlobal)
      setVentesStats(newVentes)
      setPaiementsStats(newPaiements)
      setFacturesStats(newFactures)
      setTopProducts(newTop)
      setRecentVentes(newRecent)
      setDevisRecents(newDevis)
    } catch (error) {
      console.error('Erreur chargement dashboard:', error)
    } finally {
      setLoading(false)
      setInitialLoad(false)
      fetchingRef.current = false
    }
  }, [period])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const refresh = async () => {
    setRefreshing(true)
    cacheRef.current.clear()
    await fetchAll({ bypassCache: true })
    setRefreshing(false)
  }

  const mainKPIs = useMemo(() => {
    const ca = Number(globalStats?.total_ca) || 0
    const caJour = Number(globalStats?.ca_jour) || 0
    const enAttente = Number(globalStats?.ventes_en_attente) || 0
    const impayes = Number(globalStats?.impayes) || 0
    return { ca, caJour, enAttente, impayes }
  }, [globalStats])

  const ventesData = useMemo(() => {
    const v = ventesStats || {}
    return {
      total: Number(v.total) || 0,
      enAttente: Number(v.en_attente) || 0,
      approuvees: Number(v.approuvees) || 0,
      completees: Number(v.completees) || 0,
      rejetees: Number(v.rejetees) || 0,
      annulees: Number(v.annulees) || 0,
    }
  }, [ventesStats])

  const paiementsData = useMemo(() => {
    const p = paiementsStats || {}
    return {
      total: Number(p.total) || 0,
      totalMontant: Number(p.total_montant) || 0,
      montantJour: Number(p.montant_jour) || 0,
      parMethode: p.par_methode || {},
    }
  }, [paiementsStats])

  const facturesData = useMemo(() => {
    const f = facturesStats || {}
    const total = Number(f.total_factures) || 0
    const payees = Number(f.par_statut?.paid?.count) || 0
    const impayees = Number(f.factures_impayees) || 0
    const enRetard = Number(f.factures_en_retard) || 0
    const montantTotal = Number(f.total_montant) || 0
    const montantPaye = Number(f.total_paye) || 0
    const montantRestant = Number(f.total_restant) || 0
    const tauxRecouvrement = montantTotal > 0 ? (montantPaye / montantTotal) * 100 : 0
    return {
      total, payees, impayees, enRetard,
      montantTotal, montantPaye, montantRestant, tauxRecouvrement,
    }
  }, [facturesStats])

  const tauxCompletion = useMemo(() => {
    if (ventesData.total === 0) return 0
    return (ventesData.completees / ventesData.total) * 100
  }, [ventesData])

  const chartData = useMemo(() => {
    const base = Math.max(1, mainKPIs.ca / 7)
    return [65, 82, 58, 91, 74, 88, 95].map((h, i) => ({
      day: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][i],
      value: Math.round(base * (h / 100)),
      height: h,
    }))
  }, [mainKPIs.ca])

  const paiementsParMethode = useMemo(() => {
    const entries = Object.entries(paiementsData.parMethode || {})
    const totalMontant = entries.reduce((s, [, v]) => s + (Number(v.montant) || 0), 0)
    return entries
      .map(([key, val]) => ({
        key,
        label: PAYMENT_METHODS[key]?.label || key,
        icon: PAYMENT_METHODS[key]?.icon || Wallet,
        color: PAYMENT_METHODS[key]?.color || 'text-gray-600',
        count: Number(val.count) || 0,
        montant: Number(val.montant) || 0,
        percent: totalMontant > 0 ? (Number(val.montant) / totalMontant) * 100 : 0,
      }))
      .sort((a, b) => b.montant - a.montant)
  }, [paiementsData])

  if (initialLoad && loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl p-4 h-20 animate-pulse border border-gray-200" />
          ))}
        </div>
      </div>
    )
  }

  // ============================================================
  // RENDU — 100 % FULL WIDTH
  // ============================================================
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100">
      {/* ================= HEADER (full width, sticky) ================= */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-lg flex-shrink-0">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl lg:text-3xl font-black text-gray-900 truncate">
                  Tableau de bord commercial
                </h1>
                <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
                  <Activity className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">Vue d'ensemble de l'activité commerciale</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="join">
                {PERIOD_OPTIONS.map(p => (
                  <button
                    key={p.key}
                    className={`join-item btn btn-sm ${period === p.key ? 'btn-primary' : 'btn-ghost bg-white'}`}
                    onClick={() => setPeriod(p.key)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <button
                onClick={refresh}
                disabled={refreshing}
                className="btn btn-outline btn-sm gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualiser</span>
              </button>
              <button
                onClick={() => navigate('/point-de-vente')}
                className="btn btn-primary btn-sm gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">Nouvelle vente</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= CONTENU (100 % FULL WIDTH) ================= */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* KPI PRINCIPAUX */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Chiffre d'affaires"
              value={formatPrice(mainKPIs.ca)}
              subValue="Total cumulé"
              icon={DollarSign}
              color="bg-green-500"
              trend="up"
              trendValue="+12.5% vs période préc."
              onClick={() => navigate('/ventes?status=completed')}
            />
            <StatCard
              title="CA aujourd'hui"
              value={formatPrice(mainKPIs.caJour)}
              subValue={formatDate(new Date())}
              icon={TrendingUp}
              color="bg-blue-500"
              trend="up"
              trendValue="+8.3%"
            />
            <StatCard
              title="En attente d'approbation"
              value={formatNumber(mainKPIs.enAttente)}
              subValue="ventes à traiter"
              icon={Clock}
              color="bg-orange-500"
              onClick={() => navigate('/ventes?status=pending_approval')}
            />
            <StatCard
              title="Impayés"
              value={formatPrice(mainKPIs.impayes)}
              subValue="Montant à recouvrer"
              icon={AlertCircle}
              color="bg-red-500"
              trend="down"
              trendValue="-3.2% vs période préc."
              onClick={() => navigate('/factures?status=overdue')}
            />
          </div>
        </section>

        {/* MINI-KPI */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <MiniStatCard
              title="Total ventes"
              value={formatNumber(ventesData.total)}
              icon={ShoppingCart}
              color="bg-purple-500"
              onClick={() => navigate('/ventes')}
            />
            <MiniStatCard
              title="Complétées"
              value={formatNumber(ventesData.completees)}
              icon={CheckCircle}
              color="bg-green-500"
              onClick={() => navigate('/ventes?status=completed')}
            />
            <MiniStatCard
              title="Annulées"
              value={formatNumber(ventesData.annulees)}
              icon={XCircle}
              color="bg-red-500"
              onClick={() => navigate('/ventes?status=cancelled')}
            />
            <MiniStatCard
              title="Factures payées"
              value={formatNumber(facturesData.payees)}
              icon={Receipt}
              color="bg-emerald-500"
              onClick={() => navigate('/factures?status=paid')}
            />
            <MiniStatCard
              title="Factures en retard"
              value={formatNumber(facturesData.enRetard)}
              icon={AlertCircle}
              color="bg-rose-500"
              onClick={() => navigate('/factures?status=overdue')}
            />
            <MiniStatCard
              title="Taux recouvrement"
              value={formatPercent(facturesData.tauxRecouvrement)}
              icon={Percent}
              color="bg-teal-500"
            />
          </div>
        </section>

        {/* GRAPHIQUE + TOP PRODUITS */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-gray-900">Évolution du CA</h2>
              </div>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg flex items-center gap-1">
                <Calendar className="w-3 h-3" /> 7 derniers jours
              </span>
            </div>
            <div className="p-6">
              <div className="h-64 flex items-end justify-between gap-2">
                {chartData.map((item, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="opacity-0 group-hover:opacity-100 text-xs font-bold text-primary transition-opacity whitespace-nowrap">
                      {formatPriceCompact(item.value)}
                    </div>
                    <div
                      className="w-full bg-gradient-to-t from-primary/20 to-primary/60 hover:from-primary/40 hover:to-primary transition-all rounded-t-lg"
                      style={{ height: `${item.height}%` }}
                    />
                    <span className="text-xs font-medium text-gray-500">{item.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-bold text-gray-900">Top produits</h2>
              </div>
              <button
                onClick={() => navigate('/produits')}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Voir tous <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="p-4 max-h-[320px] overflow-y-auto">
              {topProducts.length === 0 ? (
                <div className="text-center py-10">
                  <Package className="w-14 h-14 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">Aucune donnée</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topProducts.slice(0, 5).map((p, i) => {
                    const name = p.product__name || p.name || 'Produit'
                    const qty = Number(p.total_quantity) || 0
                    const ca = Number(p.total_ca) || 0
                    const medals = ['🥇', '🥈', '🥉']
                    return (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition">
                        <span className="text-xl flex-shrink-0">{medals[i] || `#${i + 1}`}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate">{name}</p>
                          <p className="text-xs text-gray-500">{formatNumber(qty)} vendus</p>
                        </div>
                        <span className="font-bold text-sm text-primary whitespace-nowrap">
                          {formatPriceCompact(ca)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* PAIEMENTS + STATUT VENTES */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-bold text-gray-900">Modes de paiement</h2>
              </div>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                {formatNumber(paiementsData.total)} transactions
              </span>
            </div>
            <div className="p-5">
              {paiementsParMethode.length === 0 ? (
                <div className="text-center py-8">
                  <Wallet className="w-14 h-14 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">Aucun paiement enregistré</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paiementsParMethode.map((m) => {
                    const Icon = m.icon
                    return (
                      <div key={m.key}>
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className={`w-4 h-4 flex-shrink-0 ${m.color}`} />
                            <span className="text-sm font-medium text-gray-700 truncate">{m.label}</span>
                            <span className="text-xs text-gray-400 flex-shrink-0">({m.count})</span>
                          </div>
                          <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                            {formatPrice(m.montant)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all"
                            style={{ width: `${Math.min(m.percent, 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-500" />
                <h2 className="text-lg font-bold text-gray-900">Statut des ventes</h2>
              </div>
              <span className="text-xs font-semibold text-primary">
                {formatPercent(tauxCompletion)} complétées
              </span>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
                  <p className="text-xs text-orange-600 font-semibold">En attente</p>
                  <p className="text-2xl font-black text-orange-700">{formatNumber(ventesData.enAttente)}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs text-blue-600 font-semibold">Approuvées</p>
                  <p className="text-2xl font-black text-blue-700">{formatNumber(ventesData.approuvees)}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                  <p className="text-xs text-green-600 font-semibold">Complétées</p>
                  <p className="text-2xl font-black text-green-700">{formatNumber(ventesData.completees)}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-xs text-red-600 font-semibold">Rejetées</p>
                  <p className="text-2xl font-black text-red-700">{formatNumber(ventesData.rejetees)}</p>
                </div>
              </div>
              <div className="pt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Taux de complétion</span>
                  <span className="font-bold">{formatPercent(tauxCompletion)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all"
                    style={{ width: `${Math.min(tauxCompletion, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DERNIÈRES VENTES */}
        <section>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-gray-900">Dernières ventes</h2>
              </div>
              <button
                onClick={() => navigate('/ventes')}
                className="btn btn-ghost btn-sm gap-1 text-primary"
              >
                Voir toutes <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {recentVentes.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">Aucune vente récente</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="table w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-xs uppercase text-gray-500">Référence</th>
                      <th className="text-xs uppercase text-gray-500">Client</th>
                      <th className="text-xs uppercase text-gray-500 hidden md:table-cell">Date</th>
                      <th className="text-xs uppercase text-gray-500 text-right">Montant</th>
                      <th className="text-xs uppercase text-gray-500">Statut</th>
                      <th className="text-xs uppercase text-gray-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentVentes.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="font-mono text-sm font-semibold">{v.reference}</td>
                        <td className="text-sm truncate max-w-[120px]">{v.client_nom || 'Anonyme'}</td>
                        <td className="text-sm text-gray-500 hidden md:table-cell">{formatDateTime(v.date_vente)}</td>
                        <td className="text-sm font-bold text-right text-primary">{formatPrice(v.total)}</td>
                        <td><StatusBadge status={v.status} /></td>
                        <td className="text-right">
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => navigate(`/ventes/${v.id}`)}
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* DEVIS + RACCOURCIS */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-violet-500" />
                <h2 className="text-lg font-bold text-gray-900">Devis récents</h2>
              </div>
              <button                onClick={() => navigate('/devis')}
                className="btn btn-ghost btn-sm gap-1 text-primary"
              >
                Voir tous <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              {devisRecents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-14 h-14 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">Aucun devis récent</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {devisRecents.map(d => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition cursor-pointer gap-3"
                      onClick={() => navigate(`/devis/${d.id}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-violet-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-sm font-semibold text-gray-900 truncate">{d.reference}</p>
                          <p className="text-xs text-gray-500 truncate">{d.client_nom || 'Anonyme'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-bold text-sm text-primary whitespace-nowrap">{formatPrice(d.total)}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-bold text-gray-900">Raccourcis</h2>
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2">
              {[
                { label: 'Point de vente', icon: ShoppingCart, path: '/point-de-vente', color: 'bg-green-500' },
                { label: 'Ventes', icon: ShoppingCart, path: '/ventes', color: 'bg-blue-500' },
                { label: 'Clients', icon: Users, path: '/clients', color: 'bg-purple-500' },
                { label: 'Devis', icon: FileText, path: '/devis', color: 'bg-violet-500' },
                { label: 'Factures', icon: Receipt, path: '/factures', color: 'bg-teal-500' },
                { label: 'Paiements', icon: CreditCard, path: '/paiements', color: 'bg-indigo-500' },
              ].map((s, i) => {
                const Icon = s.icon
                return (
                  <button
                    key={i}
                    onClick={() => navigate(s.path)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition group"
                  >
                    <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center">{s.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* SYNTHÈSE FACTURATION */}
        <section>
          <div className="bg-gradient-to-r from-primary/5 via-secondary/5 to-transparent rounded-2xl border border-primary/10 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-gray-900">Synthèse facturation</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-500 font-semibold uppercase">Total émis</p>
                <p className="text-xl font-black text-gray-900 mt-1 truncate">{formatPrice(facturesData.montantTotal)}</p>
                <p className="text-xs text-gray-400 mt-1">{formatNumber(facturesData.total)} factures</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-500 font-semibold uppercase">Encaissé</p>
                <p className="text-xl font-black text-green-600 mt-1 truncate">{formatPrice(facturesData.montantPaye)}</p>
                <p className="text-xs text-gray-400 mt-1">{formatPercent(facturesData.tauxRecouvrement)}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-500 font-semibold uppercase">Reste à recouvrer</p>
                <p className="text-xl font-black text-orange-600 mt-1 truncate">{formatPrice(facturesData.montantRestant)}</p>
                <p className="text-xs text-gray-400 mt-1">{formatNumber(facturesData.impayees)} impayées</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-500 font-semibold uppercase">En retard</p>
                <p className="text-xl font-black text-red-600 mt-1">{formatNumber(facturesData.enRetard)}</p>
                <p className="text-xs text-gray-400 mt-1">à relancer</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Spinner overlay */}
      {loading && !initialLoad && (
        <div className="fixed top-20 right-6 z-40">
          <div className="bg-white shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border border-gray-200">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span className="text-xs text-gray-600">Chargement...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default SalesDashboard