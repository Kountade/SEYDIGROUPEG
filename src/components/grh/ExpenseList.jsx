// src/components/expenses/ExpenseList.jsx - Version corrigée

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AxiosInstance from '../AxiosInstance';
import {
  Plus,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Trash2,
  Download,
  Wallet,
  RefreshCw,
  AlertCircle,
  Calendar,
  DollarSign,
  Tag,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const ExpenseList = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Récupérer le rôle de l'utilisateur
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('User') || '{}');
    setUserRole(userData);
  }, []);

  // Charger les données
  useEffect(() => {
    fetchExpenses();
    fetchStats();
  }, [filter]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      let url = '/expenses/';
      
      if (filter !== 'all') {
        url += `?status=${filter}`;
      }
      
      const response = await AxiosInstance.get(url);
      setExpenses(response.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await AxiosInstance.get('/expenses/stats/');
      setStats(response.data);
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  };

  // Formatage GNF
  const formatGNF = (amount) => {
    if (!amount) return '0 GNF';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0 GNF';
    return `${Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} GNF`;
  };

  // Statut badges
  const getStatusBadge = (status) => {
    const badges = {
      pending: { class: 'badge-warning', icon: Clock, label: 'En attente RH' },
      approved: { class: 'badge-info', icon: CheckCircle, label: 'Validé - En attente paiement' },
      paid: { class: 'badge-success', icon: Wallet, label: 'Payé' },
      rejected: { class: 'badge-error', icon: XCircle, label: 'Rejeté' },
      cancelled: { class: 'badge-ghost', icon: XCircle, label: 'Annulé' }
    };
    return badges[status] || badges.pending;
  };

  // Types de frais
  const getTypeIcon = (type) => {
    const icons = {
      transport: '🚗',
      meal: '🍽️',
      accommodation: '🏨',
      supplies: '📎',
      client: '🤝',
      other: '📋'
    };
    return icons[type] || '📋';
  };

  const getTypeLabel = (type) => {
    const labels = {
      transport: 'Transport',
      meal: 'Repas',
      accommodation: 'Hébergement',
      supplies: 'Fournitures',
      client: 'Client',
      other: 'Autre'
    };
    return labels[type] || type;
  };

  // Filtrer les notes
  const filteredExpenses = expenses.filter(expense => {
    const matchSearch = 
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.expense_type_display?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  // Vérifier les permissions
  const canValidate = () => {
    return userRole?.role_global === 'pdg' || userRole?.role_global === 'drh';
  };

  const canPay = () => {
    return userRole?.role_global === 'pdg' || 
           userRole?.role_global === 'drh' || 
           userRole?.roles_agence?.some(r => r.role === 'comptable');
  };

  // ✅ ACTIONS CORRIGÉES - Utilisation des bons endpoints
  const handleValidate = async (id) => {
    try {
      console.log(`📤 Validation de la note ${id}...`);
      const response = await AxiosInstance.post(`/expenses/${id}/validate/`, {
        comments: 'Validé par RH'
      });
      console.log('✅ Validation réussie:', response.data);
      fetchExpenses();
      fetchStats();
    } catch (error) {
      console.error('❌ Erreur validation:', error);
      const errorMsg = error.response?.data?.error || 'Erreur lors de la validation';
      alert(errorMsg);
    }
  };

  const handlePay = async (id) => {
    const reference = prompt('Référence de paiement:');
    if (reference) {
      try {
        console.log(`📤 Paiement de la note ${id}...`);
        const response = await AxiosInstance.post(`/expenses/${id}/pay/`, { 
          payment_reference: reference 
        });
        console.log('✅ Paiement réussi:', response.data);
        fetchExpenses();
        fetchStats();
      } catch (error) {
        console.error('❌ Erreur paiement:', error);
        const errorMsg = error.response?.data?.error || 'Erreur lors du paiement';
        alert(errorMsg);
      }
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Motif du rejet:');
    if (reason) {
      try {
        console.log(`📤 Rejet de la note ${id}...`);
        const response = await AxiosInstance.post(`/expenses/${id}/reject/`, { 
          reason: reason 
        });
        console.log('✅ Rejet réussi:', response.data);
        fetchExpenses();
        fetchStats();
      } catch (error) {
        console.error('❌ Erreur rejet:', error);
        const errorMsg = error.response?.data?.error || 'Erreur lors du rejet';
        alert(errorMsg);
      }
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm('Confirmer l\'annulation de cette note ?')) {
      try {
        console.log(`📤 Annulation de la note ${id}...`);
        const response = await AxiosInstance.post(`/expenses/${id}/cancel/`);
        console.log('✅ Annulation réussie:', response.data);
        fetchExpenses();
        fetchStats();
      } catch (error) {
        console.error('❌ Erreur annulation:', error);
        const errorMsg = error.response?.data?.error || 'Erreur lors de l\'annulation';
        alert(errorMsg);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-base-content/70">Chargement des notes de frais...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Notes de frais</h1>
          <p className="text-sm text-base-content/60">Gérez vos demandes de remboursement</p>
        </div>
        <button
          onClick={() => navigate('/expenses/new')}
          className="btn btn-primary gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouvelle note
        </button>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-base-100 rounded-xl p-4 shadow-sm border border-base-200">
            <p className="text-xs text-base-content/60">Total</p>
            <p className="text-xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-base-100 rounded-xl p-4 shadow-sm border border-base-200">
            <p className="text-xs text-warning">En attente RH</p>
            <p className="text-xl font-bold text-warning">{stats.pending}</p>
          </div>
          <div className="bg-base-100 rounded-xl p-4 shadow-sm border border-base-200">
            <p className="text-xs text-info">Validées</p>
            <p className="text-xl font-bold text-info">{stats.approved}</p>
          </div>
          <div className="bg-base-100 rounded-xl p-4 shadow-sm border border-base-200">
            <p className="text-xs text-success">Payées</p>
            <p className="text-xl font-bold text-success">{stats.paid}</p>
          </div>
          <div className="bg-base-100 rounded-xl p-4 shadow-sm border border-base-200">
            <p className="text-xs text-error">Rejetées</p>
            <p className="text-xl font-bold text-error">{stats.rejected}</p>
          </div>
          <div className="bg-base-100 rounded-xl p-4 shadow-sm border border-base-200">
            <p className="text-xs text-base-content/60">Montant total</p>
            <p className="text-xl font-bold">{formatGNF(stats.total_amount)}</p>
          </div>
        </div>
      )}

      {/* Filtres et recherche */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
              <input
                type="text"
                placeholder="Rechercher par description..."
                className="input input-bordered w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <button
            className="btn btn-ghost gap-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
            Filtres
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-base-200 rounded-lg">
            {['all', 'pending', 'approved', 'paid', 'rejected', 'cancelled'].map((status) => (
              <button
                key={status}
                className={`btn btn-sm ${filter === status ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(status)}
              >
                {status === 'all' ? 'Tous' : 
                 status === 'pending' ? 'En attente RH' :
                 status === 'approved' ? 'Validés' :
                 status === 'paid' ? 'Payés' :
                 status === 'rejected' ? 'Rejetés' : 'Annulés'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Liste */}
      <div className="bg-base-100 rounded-xl shadow-lg border border-base-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Type</th>
                <th>Description</th>
                <th>Montant</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-base-content/60">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    Aucune note de frais trouvée
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => {
                  const statusInfo = getStatusBadge(expense.status);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <tr key={expense.id} className="hover:bg-base-200/50 transition-colors">
                      <td>
                        <span className="flex items-center gap-1">
                          <span className="text-lg">{getTypeIcon(expense.expense_type)}</span>
                          <span className="text-sm">{getTypeLabel(expense.expense_type)}</span>
                        </span>
                      </td>
                      <td className="max-w-[200px] truncate" title={expense.description}>
                        {expense.description || '-'}
                      </td>
                      <td className="font-bold">{formatGNF(expense.amount)}</td>
                      <td className="text-sm">{expense.date}</td>
                      <td>
                        <span className={`badge ${statusInfo.class} gap-1 border-0`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1 flex-wrap">
                          <button
                            className="btn btn-ghost btn-xs tooltip"
                            data-tip="Voir détails"
                            onClick={() => navigate(`/expenses/${expense.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {expense.receipt && (
                            <a
                              href={expense.receipt}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-ghost btn-xs tooltip"
                              data-tip="Télécharger reçu"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                          
                          {/* ✅ VALIDATION RH - Endpoint: /expenses/{id}/validate/ */}
                          {expense.status === 'pending' && canValidate() && (
                            <>
                              <button
                                className="btn btn-success btn-xs tooltip"
                                data-tip="Valider"
                                onClick={() => handleValidate(expense.id)}
                              >
                                <CheckCircle className="w-3 h-3" />
                              </button>
                              <button
                                className="btn btn-error btn-xs tooltip"
                                data-tip="Rejeter"
                                onClick={() => handleReject(expense.id)}
                              >
                                <XCircle className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          
                          {/* ✅ PAIEMENT COMPTABLE - Endpoint: /expenses/{id}/pay/ */}
                          {expense.status === 'approved' && canPay() && (
                            <button
                              className="btn btn-info btn-xs tooltip"
                              data-tip="Approuver paiement"
                              onClick={() => handlePay(expense.id)}
                            >
                              <Wallet className="w-3 h-3" />
                            </button>
                          )}
                          
                          {/* ✅ ANNULATION - Endpoint: /expenses/{id}/cancel/ */}
                          {expense.status === 'pending' && (
                            <button
                              className="btn btn-ghost btn-xs text-error tooltip"
                              data-tip="Annuler"
                              onClick={() => handleCancel(expense.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExpenseList;