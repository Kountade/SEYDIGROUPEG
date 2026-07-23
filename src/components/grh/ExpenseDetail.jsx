// src/components/expenses/ExpenseDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AxiosInstance from '../AxiosInstance';
import {
  ArrowLeft,
  User,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Wallet,
  Download,
  Printer,
  AlertCircle,
  Trash2,
  Edit
} from 'lucide-react';

const ExpenseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('User') || '{}');
    setUser(userData);
    fetchExpense();
  }, [id]);

  const fetchExpense = async () => {
    try {
      setLoading(true);
      const response = await AxiosInstance.get(`/expenses/${id}/`);
      setExpense(response.data);
    } catch (error) {
      console.error('Erreur:', error);
      setError(error.response?.data?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const formatGNF = (amount) => {
    if (!amount) return '0 GNF';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0 GNF';
    return `${Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} GNF`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { class: 'badge-warning', icon: Clock, label: 'En attente' },
      approved: { class: 'badge-success', icon: CheckCircle, label: 'Approuvé' },
      rejected: { class: 'badge-error', icon: XCircle, label: 'Rejeté' },
      paid: { class: 'badge-info', icon: Wallet, label: 'Remboursé' },
      cancelled: { class: 'badge-ghost', icon: XCircle, label: 'Annulé' }
    };
    return badges[status] || badges.pending;
  };

  const getTypeLabel = (type) => {
    const labels = {
      transport: '🚗 Transport',
      meal: '🍽️ Repas',
      accommodation: '🏨 Hébergement',
      supplies: '📎 Fournitures',
      client: '🤝 Client',
      other: '📋 Autre'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-base-content/70">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="p-6 text-center">
        <div className="max-w-md mx-auto">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-error">Erreur</h2>
          <p className="text-base-content/70 mt-2">{error || 'Note non trouvée'}</p>
          <button
            onClick={() => navigate('/expenses')}
            className="btn btn-primary mt-6"
          >
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusBadge(expense.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/expenses')}
            className="btn btn-ghost btn-sm gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <h1 className="text-2xl font-bold text-primary">Détail de la note</h1>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm gap-2">
            <Printer className="w-4 h-4" />
            Imprimer
          </button>
          {expense.receipt && (
            <a
              href={expense.receipt}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm gap-2"
            >
              <Download className="w-4 h-4" />
              Reçu
            </a>
          )}
        </div>
      </div>

      {/* Carte principale */}
      <div className="bg-base-100 rounded-xl shadow-lg border border-base-200 overflow-hidden">
        {/* Entête avec statut */}
        <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-content">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm opacity-80">Note de frais #{expense.id}</p>
              <p className="text-lg font-bold">{expense.description || 'Sans description'}</p>
            </div>
            <span className={`badge ${statusInfo.class} badge-lg gap-2 border-0 text-white`}>
              <StatusIcon className="w-4 h-4" />
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* Informations */}
        <div className="p-6 space-y-6">
          {/* Grille info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-base-200/50 rounded-lg">
              <div className="bg-primary/10 rounded-full p-2">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-base-content/50">Employé</p>
                <p className="font-medium">{expense.employee_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-base-200/50 rounded-lg">
              <div className="bg-primary/10 rounded-full p-2">
                <Tag className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-base-content/50">Type</p>
                <p className="font-medium">{getTypeLabel(expense.expense_type)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-base-200/50 rounded-lg">
              <div className="bg-primary/10 rounded-full p-2">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-base-content/50">Date</p>
                <p className="font-medium">{expense.date}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-base-200/50 rounded-lg">
              <div className="bg-primary/10 rounded-full p-2">
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-base-content/50">Montant</p>
                <p className="font-bold text-lg">{formatGNF(expense.amount)}</p>
              </div>
            </div>

            {expense.approved_by_name && (
              <div className="flex items-center gap-3 p-3 bg-base-200/50 rounded-lg">
                <div className="bg-success/10 rounded-full p-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-xs text-base-content/50">Approuvé par</p>
                  <p className="font-medium">{expense.approved_by_name}</p>
                </div>
              </div>
            )}

            {expense.payment_date && (
              <div className="flex items-center gap-3 p-3 bg-base-200/50 rounded-lg">
                <div className="bg-info/10 rounded-full p-2">
                  <Wallet className="w-4 h-4 text-info" />
                </div>
                <div>
                  <p className="text-xs text-base-content/50">Remboursé le</p>
                  <p className="font-medium">{new Date(expense.payment_date).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {expense.description && (
            <div className="p-4 bg-base-200/30 rounded-lg">
              <p className="text-xs text-base-content/50 mb-1">Description</p>
              <p className="text-base">{expense.description}</p>
            </div>
          )}

          {/* Rejet */}
          {expense.status === 'rejected' && expense.rejection_reason && (
            <div className="alert alert-error shadow-lg">
              <XCircle className="w-5 h-5" />
              <div>
                <p className="font-bold">Motif du rejet</p>
                <p className="text-sm">{expense.rejection_reason}</p>
              </div>
            </div>
          )}

          {/* Reçu */}
          {expense.receipt && (
            <div className="border border-base-200 rounded-lg p-4">
              <p className="text-xs text-base-content/50 mb-2">Reçu joint</p>
              <a
                href={expense.receipt}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <FileText className="w-4 h-4" />
                Télécharger le reçu
              </a>
            </div>
          )}

          {/* Métadonnées */}
          <div className="text-xs text-base-content/40 border-t border-base-200 pt-4">
            <p>Créé le {new Date(expense.created_at).toLocaleString('fr-FR')}</p>
            {expense.updated_at !== expense.created_at && (
              <p>Modifié le {new Date(expense.updated_at).toLocaleString('fr-FR')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetail;