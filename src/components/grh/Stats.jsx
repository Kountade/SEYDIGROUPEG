// src/pages/Stats.jsx
import React, { useEffect, useState } from 'react';
import AxiosInstance from '../AxiosInstance';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const Stats = () => {
  const [stats, setStats] = useState(null);
  const [departmentSalaryData, setDepartmentSalaryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorDetail, setErrorDetail] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    setErrorDetail('');

    try {
      // ✅ CORRECTION : URL correcte
      const statsRes = await AxiosInstance.get('/stats/dashboard/');
      setStats(statsRes.data);

      // Récupérer les employés pour les salaires par département
      const empRes = await AxiosInstance.get('/employees/');
      const employees = empRes.data || [];

      // Grouper par département
      const deptMap = {};
      employees.forEach(emp => {
        const deptName = emp.department_name || 'Sans département';
        if (!deptMap[deptName]) {
          deptMap[deptName] = { total: 0, count: 0 };
        }
        deptMap[deptName].total += parseFloat(emp.base_salary) || 0;
        deptMap[deptName].count += 1;
      });

      const deptData = Object.entries(deptMap).map(([name, data]) => ({
        name,
        totalSalary: data.total,
        averageSalary: data.count > 0 ? data.total / data.count : 0,
        employeeCount: data.count,
      }));
      setDepartmentSalaryData(deptData);
    } catch (err) {
      console.error('❌ Erreur lors du chargement des stats :', err);
      if (err.response) {
        const status = err.response.status;
        if (status === 401) {
          setError('Vous devez être connecté pour accéder à cette page.');
        } else if (status === 403) {
          setError('Vous n\'avez pas les droits nécessaires pour voir ces statistiques.');
        } else if (status === 404) {
          setError('La ressource demandée est introuvable. Vérifiez l\'URL.');
        } else {
          setError(`Erreur ${status} : ${err.response.data?.detail || err.response.statusText || 'Erreur inconnue'}`);
        }
        setErrorDetail(JSON.stringify(err.response.data, null, 2));
      } else if (err.request) {
        setError('Impossible de contacter le serveur. Vérifiez votre connexion.');
      } else {
        setError('Une erreur inattendue est survenue.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatCurrency = (num) => {
    if (!num && num !== 0) return '0 GNF';
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(num)) + ' GNF';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement des statistiques...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] gap-4">
        <div className="alert alert-error shadow-lg max-w-md w-full">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Erreur</span>
            <p className="text-sm">{error}</p>
            {errorDetail && (
              <details className="mt-2 text-xs bg-base-100 p-2 rounded overflow-auto max-h-40">
                <summary>Détails techniques</summary>
                <pre>{errorDetail}</pre>
              </details>
            )}
          </div>
          <button onClick={fetchStats} className="btn btn-sm btn-ghost">
            <RefreshCw className="w-4 h-4" /> Réessayer
          </button>
        </div>
        <button className="btn btn-outline" onClick={() => window.location.href = '/ventes'}>
          Retour à l'accueil
        </button>
      </div>
    );
  }

  if (!stats) return null;

  // Données pour les graphiques
  const genderData = Object.entries(stats.gender_distribution || {}).map(([key, value]) => ({
    name: key === 'M' ? 'Masculin' : key === 'F' ? 'Féminin' : 'Autre',
    value,
  }));

  const departmentCountData = stats.department_distribution || [];
  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'];
  const sortedDeptSalary = [...departmentSalaryData].sort((a, b) => b.averageSalary - a.averageSalary);

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-primary">
            Tableau de bord RH
          </h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            Vue d’ensemble des indicateurs RH
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="btn btn-sm sm:btn-md btn-outline gap-1 sm:gap-2"
        >
          <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="hidden xs:inline">Actualiser</span>
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-primary"><Users className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Employés</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black">{stats.total_employees}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-success"><UserCheck className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Actifs</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-success">{stats.active_employees}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-warning"><Clock className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">En congé</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-warning">{stats.on_leave}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-error"><AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Congés en attente</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-error">{stats.pending_leaves}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-info"><Calendar className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Présents aujourd’hui</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-info">{stats.present_today}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-error"><UserX className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Absents aujourd’hui</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-error">{stats.absent_today}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-primary"><DollarSign className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Paie mensuelle</div>
          <div className="stat-value text-base sm:text-lg lg:text-2xl font-black truncate">{formatCurrency(stats.monthly_payroll)}</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-success"><TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Nouvelles embauches</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-success">{stats.new_hires_this_month}</div>
          <div className="stat-desc text-xs">ce mois</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-warning"><TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Turn‑over</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-warning">{stats.turnover_rate}%</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-secondary"><DollarSign className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Salaire moyen</div>
          <div className="stat-value text-base sm:text-lg lg:text-2xl font-black truncate">{formatCurrency(stats.average_salary)}</div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Répartition par genre */}
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Répartition par genre</h2>
          {genderData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} employé(s)`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-base-content/50">Aucune donnée de genre disponible</p>
          )}
        </div>

        {/* Effectifs par département */}
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Effectif par département</h2>
          {departmentCountData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={departmentCountData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `${value} employé(s)`} />
                <Bar dataKey="employee_count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-base-content/50">Aucune donnée de département disponible</p>
          )}
        </div>

        {/* Salaire moyen par département */}
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4 sm:p-6 lg:col-span-2">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Salaire moyen par département</h2>
          {sortedDeptSalary.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={sortedDeptSalary} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="averageSalary" fill="#10b981" radius={[4, 4, 0, 0]} name="Salaire moyen" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-base-content/50">Aucune donnée de salaire disponible</p>
          )}
        </div>

        {/* Masse salariale par département (camembert) */}
        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4 sm:p-6 lg:col-span-2">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Masse salariale par département</h2>
          {sortedDeptSalary.some(d => d.totalSalary > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={sortedDeptSalary}
                  dataKey="totalSalary"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                >
                  {sortedDeptSalary.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-base-content/50">Aucune donnée de masse salariale disponible</p>
          )}
        </div>
      </div>

      {/* Alertes solde congés */}
      {stats.leave_balance_alert && stats.leave_balance_alert.length > 0 && (
        <div className="bg-warning/10 rounded-xl border border-warning/30 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-warning flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Alertes solde de congés
          </h2>
          <div className="mt-3 divide-y divide-base-200">
            {stats.leave_balance_alert.map((alert, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 text-sm">
                <span>{alert.employee_name}</span>
                <span className="font-medium text-warning">{alert.remaining_days} jours restants</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Stats;