// src/components/ventes/DashboardCommercial.jsx
import React, {
  useEffect, useState, useCallback, useRef, useMemo
} from 'react'
import { useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ShoppingCart, DollarSign, TrendingUp, Clock, AlertCircle,
  RefreshCw, Users, FileText, CreditCard, Receipt,
  Package, CheckCircle, XCircle, BarChart3, ArrowRight,
  Eye, Download, Loader2
} from 'lucide-react'

const DashboardCommercial = () => {
  const navigate = useNavigate()

  const [stats, setStats] = useState(null)
  const [recentVentes, setRecentVentes] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState('today')

  const cacheRef = useRef(new Map())
  const fetchingRef = useRef(false)

  const unwrap = (data) => Array.isArray(data) ? data : (data?.results || [])

  // ---------- Fetch avec cache ----------
  const fetchStats = useCallback(async ({ bypassCache = false } = {}) => {
    const key = `dashboard_${period}`

    if (!bypassCache && cacheRef.current.has(key)) {
      const c = cacheRef.current.get(key)
      setStats(c.stats)
      setRecentVentes(c.recentVentes)
      setTopProducts(c.topProducts)
      setLoading(false)
      setInitialLoad(false)
      return
    }

    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)

    try {
      const [dashboardRes, ventesRes, topProductsRes] = await Promise.all([
        AxiosInstance.get('/dashboard/ventes/').catch(() => ({ data: null })),
        AxiosInstance.get('/ventes/?page_size=5&ordering=-date_vente')
          .catch(() => ({ data: [] })),
        AxiosInstance.get('/dashboard/top-products/')
          .catch(() => ({ data: [] })),
      ])

      const newStats = dashboardRes.data || null
      const newVentes = unwrap(ventesRes.data).filter(v => v && typeof v === 'object')
      const newTop = unwrap(topProductsRes.data).filter(p => p && typeof p === 'object')

      cacheRef.current.set(key, {
        stats: newStats,
        recentVentes: newVentes,
        topProducts: newTop,
      })
      if (cacheRef.current.size > 10) {
        const firstKey = cacheRef.current.keys().next().value
        cacheRef.current.delete(firstKey)
      }

      setStats(newStats)
      setRecentVentes(newVentes)
      setTopProducts(newTop)
    } catch (error) {
      console.error('Erreur chargement dashboard:', error)
    } finally {
      setLoading(false)
      setInitialLoad(false)
      fetchingRef.current = false
    }
  }, [period])

  const refreshData = async () => {
    setRefreshing(true)
    cacheRef.current.clear()
    await fetchStats({ bypassCache: true })
    setRefreshing(false)
  }

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // ---------- Helpers ----------
  const formatPrice = (price) => {
    const n = Number(price)
    if (!Number.isFinite(n)) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
  }

  const formatNumber = (num) => {
    const n = Number(num)
    if (!Number.isFinite(n)) return '0'
    return new Intl.NumberFormat('fr-FR').format(n)
  }

  const formatDate = (date) => {
    if (!date) return '-'
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short',
        hour: '2-digit', minute: '2-digit',
      })
    } catch { return '-' }
  }

  // ---------- Cartes ----------
  const mainCards = useMemo(() => [
    {
      title: "Chiffre d'affaires",
      value: formatPrice(stats?.total_ca),
      icon: DollarSign,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      border: 'border-green-200',
    },
    {
      title: 'CA du jour',
      value: formatPrice(stats?.ca_jour),
      icon: TrendingUp,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      border: 'border-blue-200',
    },
    {
      title: 'Ventes en attente',
      value: formatNumber(stats?.ventes_en_attente),
      icon: Clock,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      border: 'border-orange-200',
    },
    {
      title: 'Impayés',
      value: formatPrice(stats?.impayes),
      icon: AlertCircle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      border: 'border-red-200',
    },
  ], [stats])

  const secondaryCards = useMemo(() => [
    {
      title: 'Total ventes',
      value: formatNumber(stats?.total_ventes),
      icon: ShoppingCart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      link: '/ventes',
    },
    {
      title: 'Ventes complétées',
      value: formatNumber(stats?.ventes_completed),
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      link: '/ventes?status=completed',
    },
    {
      title: 'Ventes annulées',
      value: formatNumber(stats?.ventes_annulees),
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      link: '/ventes?status=cancelled',
    },
    {
      title: 'Clients actifs',
      value: formatNumber(stats?.total_clients),
      icon: Users,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      link: '/clients',
    },
  ], [stats])

  // ---------- Premier chargement ----------
  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-gray-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      {/* Spinner overlay */}
      {loading && !initialLoad && (
        <div className="fixed top-20 right-6 z-40">
          <div className="bg-white shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border border-gray-200">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span className="text-xs text-gray-600">Chargement...</span>
          </div>
        </div>
      )}

      {/* En-tête — FULL WIDTH */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40 w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                Tableau de bord commercial
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Vue d'ensemble de l'activité commerciale
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="btn btn-outline btn-sm gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
              <button className="btn btn-outline btn-sm gap-2">
                <Download className="w-4 h-4" />
                Exporter
              </button>
              <button
                className="btn btn-primary btn-sm gap-2"
                onClick={() => navigate('/point-de-vente')}
              >
                <ShoppingCart className="w-4 h-4" />
                Nouvelle vente
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu — FULL WIDTH */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtre période */}
        <div className="flex justify-end mb-6">
          <div className="join">
            {[
              { key: 'today', label: "Aujourd'hui" },
              { key: 'week', label: 'Cette semaine' },
              { key: 'month', label: 'Ce mois' },
              { key: 'year', label: 'Cette année' },
            ].map(p => (
              <button
                key={p.key}
                className={`join-item btn btn-sm ${period === p.key ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cartes principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {mainCards.map((card, index) => {
            const Icon = card.icon
            return (
              <div
                key={index}
                className={`card bg-white shadow-md hover:shadow-lg transition-all border-l-4 ${card.border}`}
              >
                <div className="card-body p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{card.title}</p>
                      <p className="text-xl font-bold text-gray-900">{card.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${card.bgColor}`}>
                      <Icon className={`w-5 h-5 ${card.textColor}`} />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Cartes secondaires */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {secondaryCards.map((card, index) => {
            const Icon = card.icon
            return (
              <div
                key={index}
                className="card bg-white shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => card.link && navigate(card.link)}
              >
                <div className="card-body p-4 text-center">
                  <div className={`p-2 rounded-full ${card.bgColor} w-10 h-10 mx-auto mb-2 flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                  <p className="text-xs text-gray-500">{card.title}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Graphique + Top produits */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Graphique */}
          <div className="lg:col-span-2 card bg-white shadow-md">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Évolution des ventes</h2>
                </div>
                <select className="select select-xs select-bordered w-32">
                  <option>7 derniers jours</option>
                  <option>30 derniers jours</option>
                  <option>12 derniers mois</option>
                </select>
              </div>

              <div className="h-64 flex items-end justify-between gap-2">
                {[65, 45, 78, 55, 89, 72, 58].map((height, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-primary/20 hover:bg-primary/40 transition-all rounded-t-lg"
                      style={{ height: `${height}%` }}
                    >
                      <div
                        className="w-full bg-primary rounded-t-lg transition-all"
                        style={{ height: `${height}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top produits */}
          <div className="card bg-white shadow-md">
            <div className="card-body">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Top produits</h2>
              </div>
              {topProducts.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">Aucune donnée</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((product, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-400">#{i + 1}</span>
                        <div>
                          <p className="font-medium text-sm">
                            {product.product__name || product.name || 'Produit'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatNumber(product.total_quantity)} vendus
                          </p>
                        </div>
                      </div>
                      <span className="font-semibold text-sm">
                        {formatPrice(product.total_ca)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dernières ventes */}
        <div className="card bg-white shadow-md">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Dernières ventes</h2>
              </div>
              <button
                className="btn btn-ghost btn-sm text-primary gap-1"
                onClick={() => navigate('/ventes')}
              >
                Voir toutes <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {recentVentes.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500">Aucune vente récente</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th>Référence</th>
                      <th>Client</th>
                      <th>Date</th>
                      <th>Montant</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentVentes.map((vente) => (
                      <tr key={vente.id} className="hover:bg-gray-50">
                        <td className="font-mono text-sm">{vente.reference}</td>
                        <td>{vente.client_nom || 'Anonyme'}</td>
                        <td className="text-sm">{formatDate(vente.date_vente)}</td>
                        <td className="font-semibold">{formatPrice(vente.total)}</td>
                        <td>
                          <span className={`badge ${
                            vente.status === 'completed' ? 'badge-success'
                            : vente.status === 'pending_approval' ? 'badge-warning'
                            : vente.status === 'approved' ? 'badge-info'
                            : vente.status === 'rejected' ? 'badge-error'
                            : 'badge-ghost'
                          }`}>
                            {vente.status === 'completed' ? 'Complétée'
                              : vente.status === 'pending_approval' ? 'En attente'
                              : vente.status === 'approved' ? 'Approuvée'
                              : vente.status === 'rejected' ? 'Rejetée'
                              : vente.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost btn-xs btn-square"
                            onClick={() => navigate(`/ventes/${vente.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Liens rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-8">
          <button
            onClick={() => navigate('/point-de-vente')}
            className="btn btn-outline btn-sm gap-2 justify-center"
          >
            <ShoppingCart className="w-4 h-4" /> Point de vente
          </button>
          <button
            onClick={() => navigate('/ventes')}
            className="btn btn-outline btn-sm gap-2 justify-center"
          >
            <ShoppingCart className="w-4 h-4" /> Ventes
          </button>
          <button
            onClick={() => navigate('/clients')}
            className="btn btn-outline btn-sm gap-2 justify-center"
          >
            <Users className="w-4 h-4" /> Clients
          </button>
          <button
            onClick={() => navigate('/devis')}
            className="btn btn-outline btn-sm gap-2 justify-center"
          >
            <FileText className="w-4 h-4" /> Devis
          </button>
          <button
            onClick={() => navigate('/factures')}
            className="btn btn-outline btn-sm gap-2 justify-center"
          >
            <Receipt className="w-4 h-4" /> Factures
          </button>
          <button
            onClick={() => navigate('/paiements')}
            className="btn btn-outline btn-sm gap-2 justify-center"
          >
            <CreditCard className="w-4 h-4" /> Paiements
          </button>
        </div>
      </div>
    </div>
  )
}

export default DashboardCommercial