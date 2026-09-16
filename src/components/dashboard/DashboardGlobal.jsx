// src/components/dashboard/DashboardGlobal.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  RadialLinearScale, Filler
} from 'chart.js';
import { Pie, Bar, Doughnut, Line } from 'react-chartjs-2';
import AxiosInstance from '../AxiosInstance';
import {
  Users, Package, Warehouse, ShoppingCart, Truck, Wallet,
  Calculator, UserCog, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Loader2, RefreshCw,
  Activity, AlertCircle, Building2, Clock,
  Boxes, Receipt, PieChart as PieIcon,
  BarChart3, LineChart as LineIcon, Layers
} from 'lucide-react';

ChartJS.register(
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, RadialLinearScale, Filler
);

// ============================================================
// CONFIG MODULES
// ============================================================
const MODULES_CONFIG = [
  { key: 'produits', label: 'Produits', icon: Package, color: 'primary', route: '/produits',
    stats: ['total', 'actifs', 'stock_faible', 'rupture'],
    labels: ['Total', 'Actifs', 'Stock faible', 'Rupture'] },
  { key: 'inventaire', label: 'Inventaire', icon: Warehouse, color: 'info', route: '/inventaire',
    stats: ['entrepots', 'transferts_en_attente', 'alertes_actives', 'lots_expirant_bientot'],
    labels: ['Entrepôts', 'Transferts', 'Alertes', 'Lots expirants'] },
  { key: 'ventes', label: 'Ventes', icon: ShoppingCart, color: 'success', route: '/ventes',
    stats: ['ventes_total', 'ca_total', 'ventes_en_attente', 'impayes'],
    labels: ['Total', 'CA', 'En attente', 'Impayés'] },
  { key: 'achats', label: 'Achats', icon: Truck, color: 'warning', route: '/achats',
    stats: ['commandes_total', 'montant_total_achats', 'commandes_en_attente', 'commandes_en_retard'],
    labels: ['Commandes', 'Montant', 'En attente', 'En retard'] },
  { key: 'tresorerie', label: 'Trésorerie', icon: Wallet, color: 'accent', route: '/tresorerie',
    stats: ['solde_global', 'nb_caisses', 'nb_comptes', 'caisses_sous_seuil'],
    labels: ['Solde', 'Caisses', 'Comptes', 'Alertes'] },
  { key: 'comptabilite', label: 'Comptabilité', icon: Calculator, color: 'secondary', route: '/comptabilite',
    stats: ['ecritures_total', 'factures_clients', 'factures_fournisseurs', 'montant_clients_impayes'],
    labels: ['Écritures', 'Fact. clients', 'Fact. fourn.', 'Impayés'] },
  { key: 'rh', label: 'RH', icon: Users, color: 'error', route: '/rh',
    stats: ['employes_total', 'employes_actifs', 'conges_en_attente', 'paie_mois'],
    labels: ['Employés', 'Actifs', 'Congés', 'Paie mois'] },
  { key: 'utilisateurs', label: 'Utilisateurs', icon: UserCog, color: 'primary', route: '/utilisateurs',
    stats: ['utilisateurs_total', 'utilisateurs_actifs', 'agences_total'],
    labels: ['Total', 'Actifs', 'Agences'] },
];

// ============================================================
// COMPOSANTS UTILITAIRES
// ============================================================

const StatCard = ({ icon: Icon, color, label, value, sub, onClick }) => {
  const colorMap = {
    primary: 'text-primary bg-primary/10',
    info: 'text-info bg-info/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    error: 'text-error bg-error/10',
    secondary: 'text-secondary bg-secondary/10',
    accent: 'text-accent bg-accent/10',
  };
  const cls = colorMap[color] || colorMap.primary;
  return (
    <div
      onClick={onClick}
      className={`card bg-base-100 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="card-body p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cls}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-xs text-base-content/60 uppercase">{label}</span>
        </div>
        <p className="text-2xl font-bold text-base-content">{value}</p>
        {sub && <p className="text-xs text-base-content/40 mt-1">{sub}</p>}
      </div>
    </div>
  );
};

/**
 * Carte contenant un graphique circulaire (Pie ou Doughnut)
 */
const ChartCard = ({ title, icon: Icon, chart, type = 'doughnut', height = 260 }) => {
  if (!chart || !chart.data || chart.data.length === 0) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            {Icon && <Icon className="w-4 h-4 text-primary" />}
            {title}
          </h3>
          <p className="text-center text-base-content/40 py-8 text-sm">
            Aucune donnée
          </p>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: chart.data.map(d => d.label),
    datasets: [{
      data: chart.data.map(d => d.value),
      backgroundColor: chart.data.map(d => d.color),
      borderColor: '#ffffff',
      borderWidth: 2,
      hoverOffset: 6,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: type === 'doughnut' ? '65%' : 0,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#6b7280',
          font: { size: 11 },
          padding: 8,
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 10,
        titleFont: { size: 12 },
        bodyFont: { size: 11 },
        callbacks: {
          label: (ctx) => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
            const val = new Intl.NumberFormat('fr-FR').format(Math.round(ctx.raw));
            return `${ctx.label}: ${val} (${pct}%)`;
          },
        },
      },
    },
  };

  const ChartComponent = type === 'pie' ? Pie : Doughnut;

  return (
    <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
      <div className="card-body p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-primary" />}
            {title}
          </h3>
          {chart.total > 0 && (
            <span className="badge badge-sm badge-ghost">
              {new Intl.NumberFormat('fr-FR').format(Math.round(chart.total))}
            </span>
          )}
        </div>
        <div style={{ height: `${height}px` }}>
          <ChartComponent data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
};

/**
 * Carte contenant un graphique à barres
 */
const BarChartCard = ({ title, icon: Icon, chart, height = 260 }) => {
  if (!chart || !chart.labels || chart.labels.length === 0) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            {Icon && <Icon className="w-4 h-4 text-primary" />}
            {title}
          </h3>
          <p className="text-center text-base-content/40 py-8 text-sm">
            Aucune donnée
          </p>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: chart.labels,
    datasets: chart.datasets.map(ds => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: ds.color + 'cc',
      borderColor: ds.color,
      borderWidth: 1,
      borderRadius: 6,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#6b7280', font: { size: 11 }, usePointStyle: true },
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 10,
        callbacks: {
          label: (ctx) => {
            const val = new Intl.NumberFormat('fr-FR').format(Math.round(ctx.raw));
            return `${ctx.dataset.label}: ${val}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#6b7280',
          callback: (v) => new Intl.NumberFormat('fr-FR').format(v),
        },
        grid: { color: '#f3f4f6' },
      },
      x: {
        ticks: { color: '#6b7280', font: { size: 10 } },
        grid: { display: false },
      },
    },
  };

  return (
    <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
      <div className="card-body p-4">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
          {Icon && <Icon className="w-4 h-4 text-primary" />}
          {title}
        </h3>
        <div style={{ height: `${height}px` }}>
          <Bar data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
};

/**
 * Carte contenant un graphique en ligne
 */
const LineChartCard = ({ title, icon: Icon, chart, height = 280 }) => {
  if (!chart || !chart.labels || chart.labels.length === 0) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            {Icon && <Icon className="w-4 h-4 text-primary" />}
            {title}
          </h3>
          <p className="text-center text-base-content/40 py-8 text-sm">
            Aucune donnée
          </p>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: chart.labels,
    datasets: chart.datasets.map(ds => ({
      label: ds.label,
      data: ds.data,
      borderColor: ds.color,
      backgroundColor: ds.color + '20',
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 6,
      borderWidth: 2,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#6b7280', font: { size: 11 }, usePointStyle: true },
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 10,
        callbacks: {
          label: (ctx) => {
            const val = new Intl.NumberFormat('fr-FR').format(Math.round(ctx.raw));
            return `${ctx.dataset.label}: ${val} FCFA`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#6b7280',
          callback: (v) => new Intl.NumberFormat('fr-FR').format(v),
        },
        grid: { color: '#f3f4f6' },
      },
      x: { ticks: { color: '#6b7280' }, grid: { display: false } },
    },
  };

  return (
    <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
      <div className="card-body p-4">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
          {Icon && <Icon className="w-4 h-4 text-primary" />}
          {title}
        </h3>
        <div style={{ height: `${height}px` }}>
          <Line data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
const DashboardGlobal = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [periode, setPeriode] = useState('mois');
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const token = localStorage.getItem('Token');
      if (!token) {
        navigate('/login');
        return;
      }
      const headers = { Authorization: `Token ${token}` };
      const response = await AxiosInstance.get(
        `/dashboard/global/?periode=${periode}`,
        { headers }
      );
      setData(response.data);
    } catch (err) {
      console.error('❌ Erreur dashboard:', err);
      const status = err.response?.status;
      if (status === 401) navigate('/login');
      else if (status === 403) setError("Accès refusé.");
      else if (status === 404) setError("URL non trouvée. Vérifiez backend/urls.py");
      else if (err.code === 'ERR_NETWORK') setError("Serveur injoignable.");
      else setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [periode]);

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));
  const fmtCFA = (n) => `${fmt(n)} FCFA`;
  const fmtDate = (d) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch { return '-'; }
  };

  // ============ LOADING ============
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-200">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="mt-4 text-base-content/60">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  // ============ ERREUR ============
  if (error) {
    return (
      <div className="p-4 md:p-6 bg-base-200 min-h-screen">
        <div className="max-w-2xl mx-auto mt-20">
          <div className="alert alert-error shadow-lg">
            <AlertTriangle className="w-6 h-6" />
            <div className="flex-1">
              <p className="font-bold">Erreur</p>
              <p className="text-sm">{error}</p>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" /> Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // ============ EXTRACTION ============
  const statsGlobales = data.stats_globales || {};
  const charts = data.charts || {};
  const topProduits = data.top_produits || [];
  const topClients = data.top_clients || [];
  const topFournisseurs = data.top_fournisseurs || [];
  const dernieresActivites = data.dernieres_activites || [];
  const alertes = data.alertes || [];
  const recettesMois = data.recettes_par_mois || [];
  const depensesMois = data.depenses_par_mois || [];

  // ============ GRAPHIQUE LIGNE PRINCIPAL ============
  const allMonths = [...new Set([
    ...recettesMois.map(m => m.label),
    ...depensesMois.map(m => m.label)
  ])].sort();

  const mainLineData = {
    labels: allMonths,
    datasets: [
      {
        label: 'Recettes',
        data: allMonths.map(m => recettesMois.find(r => r.label === m)?.montant || 0),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Dépenses',
        data: allMonths.map(m => depensesMois.find(d => d.label === m)?.montant || 0),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const mainLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#6b7280', usePointStyle: true } },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtCFA(ctx.raw)}` },
      },
    },
    scales: {
      y: { beginAtZero: true, ticks: { callback: (v) => fmt(v), color: '#6b7280' } },
      x: { ticks: { color: '#6b7280' }, grid: { display: false } },
    },
  };

  // ============ RENDER ============
  return (
    <div className="p-4 md:p-6 bg-base-200 min-h-screen">

      {/* EN-TÊTE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Tableau de bord
          </h1>
          <p className="text-base-content/60 text-sm mt-1">
            Vue d'ensemble • {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            className="select select-bordered select-sm"
          >
            <option value="jour">Aujourd'hui</option>
            <option value="semaine">Cette semaine</option>
            <option value="mois">Ce mois</option>
            <option value="trimestre">Ce trimestre</option>
            <option value="annee">Cette année</option>
          </select>
          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="btn btn-primary btn-sm gap-2"
          >
            {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Actualiser
          </button>
        </div>
      </div>

      {/* ALERTES */}
      {alertes.length > 0 && (
        <div className="card bg-base-100 shadow-md mb-6 border-l-4 border-error">
          <div className="card-body p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-error" />
              <h3 className="font-semibold">Alertes ({alertes.length})</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {alertes.slice(0, 6).map((a, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 p-2 rounded-lg text-sm ${
                    a.niveau === 'error' ? 'bg-error/10 text-error' :
                    a.niveau === 'warning' ? 'bg-warning/10 text-warning' :
                    'bg-info/10 text-info'
                  }`}
                >
                  {a.niveau === 'error' ? <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> :
                   a.niveau === 'warning' ? <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> :
                   <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{a.message}</p>
                    <p className="text-xs opacity-70 truncate">{a.details}</p>
                    <span className="badge badge-xs badge-ghost mt-1">{a.module}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============ ONGLETS ============ */}
      <div className="tabs tabs-boxed mb-6 bg-base-100 shadow-sm p-1 inline-flex flex-wrap">
        <button
          className={`tab gap-2 ${activeTab === 'overview' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Activity className="w-4 h-4" /> Vue d'ensemble
        </button>
        <button
          className={`tab gap-2 ${activeTab === 'charts' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('charts')}
        >
          <PieIcon className="w-4 h-4" /> Graphiques
        </button>
        <button
          className={`tab gap-2 ${activeTab === 'modules' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('modules')}
        >
          <Layers className="w-4 h-4" /> Modules
        </button>
        <button
          className={`tab gap-2 ${activeTab === 'tops' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('tops')}
        >
          <BarChart3 className="w-4 h-4" /> Classements
        </button>
      </div>

      {/* ============================================================ */}
      {/* ONGLET : VUE D'ENSEMBLE */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
        <>
          {/* STATS RAPIDES */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard
              icon={TrendingUp} color="success" label="Chiffre d'affaires"
              value={fmtCFA(statsGlobales.ventes?.ca_total || 0)}
              sub={`${fmt(statsGlobales.ventes?.ventes_total || 0)} ventes`}
              onClick={() => navigate('/ventes')}
            />
            <StatCard
              icon={TrendingDown} color="error" label="Achats"
              value={fmtCFA(statsGlobales.achats?.montant_total_achats || 0)}
              sub={`${fmt(statsGlobales.achats?.commandes_total || 0)} commandes`}
              onClick={() => navigate('/achats')}
            />
            <StatCard
              icon={Wallet} color="primary" label="Trésorerie"
              value={fmtCFA(statsGlobales.tresorerie?.solde_global || 0)}
              sub={`${fmt(statsGlobales.tresorerie?.nb_caisses || 0)} caisses`}
              onClick={() => navigate('/tresorerie')}
            />
            <StatCard
              icon={Receipt} color="warning" label="Impayés clients"
              value={fmtCFA(statsGlobales.ventes?.impayes || 0)}
              sub={`${fmt(statsGlobales.ventes?.factures_impayees || 0)} factures`}
            />
          </div>

          {/* GRAPHIQUE PRINCIPAL */}
          <div className="card bg-base-100 shadow-md mb-6">
            <div className="card-body p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Recettes vs Dépenses (12 derniers mois)
                </h3>
                <div className="flex gap-2">
                  <span className="badge badge-success badge-sm">Recettes</span>
                  <span className="badge badge-error badge-sm">Dépenses</span>
                </div>
              </div>
              {allMonths.length > 0 ? (
                <div className="h-80">
                  <Line data={mainLineData} options={mainLineOptions} />
                </div>
              ) : (
                <p className="text-center text-base-content/40 py-10">Aucune donnée</p>
              )}
            </div>
          </div>

          {/* 3 GRAPHIQUES CIRCULAIRES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <ChartCard
              title="Ventes par statut"
              icon={ShoppingCart}
              chart={charts.ventes_par_statut}
              type="doughnut"
            />
            <ChartCard
              title="Trésorerie"
              icon={Wallet}
              chart={charts.tresorerie}
              type="doughnut"
            />
            <ChartCard
              title="Alertes par module"
              icon={AlertTriangle}
              chart={charts.alertes}
              type="doughnut"
            />
          </div>

          {/* DERNIÈRES ACTIVITÉS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card bg-base-100 shadow-md">
              <div className="card-body p-5">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-primary" /> Dernières activités
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {dernieresActivites.slice(0, 8).map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-base-200 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          a.type === 'vente' ? 'bg-success/10' :
                          a.type === 'achat' ? 'bg-warning/10' : 'bg-info/10'
                        }`}>
                          {a.type === 'vente' ? <ShoppingCart className="w-4 h-4 text-success" /> :
                           a.type === 'achat' ? <Truck className="w-4 h-4 text-warning" /> :
                           <Warehouse className="w-4 h-4 text-info" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{a.description}</p>
                          <p className="text-xs text-base-content/50">{a.reference} • {fmtDate(a.date)}</p>
                        </div>
                      </div>
                      {a.montant > 0 && (
                        <span className="text-sm font-bold text-primary whitespace-nowrap ml-2">
                          {fmtCFA(a.montant)}
                        </span>
                      )}
                    </div>
                  ))}
                  {dernieresActivites.length === 0 && (
                    <p className="text-center text-base-content/40 py-6">Aucune activité</p>
                  )}
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-md">
              <div className="card-body p-5">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                  <Building2 className="w-5 h-5 text-primary" /> Répartition des utilisateurs
                </h3>
                <div className="h-80">
                  <ChartCard
                    title=""
                    chart={charts.utilisateurs_par_role}
                    type="doughnut"
                    height={280}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* ONGLET : GRAPHIQUES */}
      {/* ============================================================ */}
      {activeTab === 'charts' && (
        <>
          {/* SECTION 1 : GRAPHIQUES CIRCULAIRES */}
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-primary" /> Graphiques circulaires
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <ChartCard title="Ventes par statut" icon={ShoppingCart} chart={charts.ventes_par_statut} type="doughnut" />
              <ChartCard title="Produits par catégorie" icon={Package} chart={charts.produits_par_categorie} type="pie" />
              <ChartCard title="Stock par entrepôt" icon={Warehouse} chart={charts.stock_par_entrepot} type="doughnut" />
              <ChartCard title="Clients par type" icon={Users} chart={charts.clients_par_type} type="pie" />
              <ChartCard title="Mouvements de stock" icon={Boxes} chart={charts.mouvements_par_type} type="doughnut" />
              <ChartCard title="Transferts par statut" icon={Truck} chart={charts.transferts_par_statut} type="doughnut" />
              <ChartCard title="Factures par statut" icon={Receipt} chart={charts.factures_par_statut} type="doughnut" />
              <ChartCard title="Achats par statut" icon={ShoppingCart} chart={charts.achats_par_statut} type="doughnut" />
              <ChartCard title="Employés par département" icon={Users} chart={charts.employes_par_departement} type="pie" />
              <ChartCard title="Utilisateurs par rôle" icon={UserCog} chart={charts.utilisateurs_par_role} type="doughnut" />
              <ChartCard title="CA par agence" icon={Building2} chart={charts.ca_par_agence} type="doughnut" />
              <ChartCard title="Dépenses par catégorie" icon={TrendingDown} chart={charts.depenses_par_categorie} type="pie" />
              <ChartCard title="Trésorerie (Caisses vs Banques)" icon={Wallet} chart={charts.tresorerie} type="doughnut" />
              <ChartCard title="Alertes par module" icon={AlertTriangle} chart={charts.alertes} type="doughnut" />
              <ChartCard title="RH par statut" icon={Users} chart={charts.rh_par_statut} type="doughnut" />
            </div>
          </div>

          {/* SECTION 2 : GRAPHIQUES À BARRES */}
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> Graphiques à barres
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BarChartCard
                title="Top produits vendus"
                icon={Boxes}
                chart={charts.top_produits_bar}
                height={300}
              />
              <BarChartCard
                title="Ventes vs Achats (12 mois)"
                icon={Activity}
                chart={charts.ventes_vs_achats}
                height={300}
              />
            </div>
          </div>

          {/* SECTION 3 : GRAPHIQUES EN LIGNE */}
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <LineIcon className="w-5 h-5 text-primary" /> Évolution
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <LineChartCard
                title="Évolution de la trésorerie"
                icon={Wallet}
                chart={charts.evolution_tresorerie}
                height={320}
              />
            </div>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* ONGLET : MODULES */}
      {/* ============================================================ */}
      {activeTab === 'modules' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MODULES_CONFIG.map((mod) => {
            const moduleData = statsGlobales[mod.key] || {};
            const Icon = mod.icon;
            return (
              <div
                key={mod.key}
                onClick={() => navigate(mod.route)}
                className="card bg-base-100 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                <div className="card-body p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${mod.color}/10`}>
                      <Icon className={`w-6 h-6 text-${mod.color}`} />
                    </div>
                    <span className="text-xs text-base-content/40 uppercase font-semibold">{mod.label}</span>
                  </div>
                  <div className="space-y-2">
                    {mod.stats.map((statKey, idx) => {
                      const value = moduleData[statKey] ?? 0;
                      const isMoney = statKey.includes('ca') || statKey.includes('montant') ||
                                      statKey.includes('solde') || statKey.includes('impayes') ||
                                      statKey === 'paie_mois' || statKey.includes('total_achats');
                      return (
                        <div key={statKey} className="flex items-center justify-between text-xs">
                          <span className="text-base-content/60">{mod.labels[idx]}</span>
                          <span className="font-bold">
                            {isMoney ? fmtCFA(value) : fmt(value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* ONGLET : CLASSEMENTS */}
      {/* ============================================================ */}
      {activeTab === 'tops' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Produits */}
          <div className="card bg-base-100 shadow-md">
            <div className="card-body p-5">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <Boxes className="w-5 h-5 text-primary" /> Top 5 produits vendus
              </h3>
              {topProduits.length > 0 ? (
                <div className="space-y-2">
                  {topProduits.slice(0, 5).map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-base-200 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`badge ${
                          i === 0 ? 'badge-warning' : i === 1 ? 'badge-info' : i === 2 ? 'badge-error' : 'badge-ghost'
                        } badge-sm`}>#{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.product__name}</p>
                          <p className="text-xs text-base-content/50 font-mono">{p.product__reference}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{fmt(p.quantite)} unités</p>
                        <p className="text-xs text-base-content/50">{fmtCFA(p.total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-base-content/40 py-10">Aucune vente</p>
              )}
            </div>
          </div>

          {/* Top Clients */}
          <div className="card bg-base-100 shadow-md">
            <div className="card-body p-5">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-success" /> Top 5 clients
              </h3>
              {topClients.length > 0 ? (
                <div className="space-y-2">
                  {topClients.slice(0, 5).map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-base-200 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`badge ${
                          i === 0 ? 'badge-warning' : i === 1 ? 'badge-info' : i === 2 ? 'badge-error' : 'badge-ghost'
                        } badge-sm`}>#{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {c.client__raison_sociale || `${c.client__nom || ''} ${c.client__prenom || ''}`.trim() || 'Anonyme'}
                          </p>
                          <p className="text-xs text-base-content/50">{c.nb_ventes} vente(s)</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-success whitespace-nowrap ml-2">
                        {fmtCFA(c.total)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-base-content/40 py-10">Aucun client</p>
              )}
            </div>
          </div>

          {/* Top Fournisseurs */}
          <div className="card bg-base-100 shadow-md">
            <div className="card-body p-5">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <Truck className="w-5 h-5 text-warning" /> Top 5 fournisseurs
              </h3>
              {topFournisseurs.length > 0 ? (
                <div className="space-y-2">
                  {topFournisseurs.slice(0, 5).map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-base-200 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`badge ${
                          i === 0 ? 'badge-warning' : i === 1 ? 'badge-info' : i === 2 ? 'badge-error' : 'badge-ghost'
                        } badge-sm`}>#{i + 1}</span>
                        <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-warning" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{f.supplier__company_name}</p>
                          <p className="text-xs text-base-content/50">{f.nb_commandes} commande(s)</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-warning whitespace-nowrap ml-2">
                        {fmtCFA(f.total)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-base-content/40 py-10">Aucun fournisseur</p>
              )}
            </div>
          </div>

          {/* Graphiques de classement */}
          <div className="card bg-base-100 shadow-md">
            <div className="card-body p-5">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-primary" /> Top produits (graphique)
              </h3>
              <div className="h-80">
                <BarChartCard
                  title=""
                  chart={charts.top_produits_bar}
                  height={300}
                />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardGlobal;