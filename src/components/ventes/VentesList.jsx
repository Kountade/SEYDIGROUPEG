// src/components/sales/VentesList.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AxiosInstance from '../AxiosInstance';
import BonLivraisonPdf from './BonLivraisonPdf';
import {
  ShoppingCart, Eye, CheckCircle, XCircle, Clock, Search,
  RefreshCw, Filter, Calendar, TrendingUp, AlertCircle,
  ChevronLeft, ChevronRight, Users, FileText, CreditCard,
  X, Download, Printer, Plus, DollarSign, AlertTriangle,
  ArrowUpDown, ChevronUp, ChevronDown, MoreHorizontal, Trash2,
  UserCheck, UserX, Truck, Loader2
} from 'lucide-react';

const VentesList = () => {
  const navigate = useNavigate();
  const [ventes, setVentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingBl, setGeneratingBl] = useState(null); // Pour suivre quelle vente est en cours de génération
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [venteToDelete, setVenteToDelete] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [venteToApprove, setVenteToApprove] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [sortField, setSortField] = useState('date_vente');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedVente, setSelectedVente] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRoles, setUserRoles] = useState({ est_pdg: false, est_chef_agence: false });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    completed: 0,
    rejected: 0,
    totalCA: 0
  });

  const statusConfig = {
    draft: { label: 'Brouillon', icon: Clock, color: 'text-gray-500', bgColor: 'bg-gray-100' },
    pending_approval: { label: 'En attente', icon: Clock, color: 'text-orange-500', bgColor: 'bg-orange-100' },
    approved: { label: 'Approuvée', icon: CheckCircle, color: 'text-blue-500', bgColor: 'bg-blue-100' },
    rejected: { label: 'Rejetée', icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-100' },
    completed: { label: 'Complétée', icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-100' },
    cancelled: { label: 'Annulée', icon: XCircle, color: 'text-gray-500', bgColor: 'bg-gray-100' }
  };

  // Récupérer l'utilisateur connecté
  const fetchCurrentUser = async () => {
    try {
      const response = await AxiosInstance.get('/users/me/');
      const userData = response.data;
      setCurrentUser(userData);
      
      const isPDG = userData.role_global === 'pdg' || userData.is_superuser === true;
      const isChefAgence = userData.roles_agence?.some(r => r.role === 'chef_agence') || false;
      
      setUserRoles({
        est_pdg: isPDG,
        est_chef_agence: isChefAgence
      });
      
      console.log('👤 Utilisateur connecté:', userData.email);
      console.log('📋 Rôle global:', userData.role_global);
      console.log('🎯 Est PDG:', isPDG);
      console.log('🎯 Est Chef agence:', isChefAgence);
      console.log('📋 Rôles agence:', userData.roles_agence);
      
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
    }
  };

  const fetchVentes = async () => {
    setLoading(true);
    try {
      const response = await AxiosInstance.get('/ventes/');
      const data = response.data;
      setVentes(data);
      
      const totalCA = data.reduce((sum, v) => sum + (v.total || 0), 0);
      const pending = data.filter(v => v.status === 'pending_approval').length;
      const approved = data.filter(v => v.status === 'approved').length;
      const completed = data.filter(v => v.status === 'completed').length;
      const rejected = data.filter(v => v.status === 'rejected').length;
      
      setStats({
        total: data.length,
        pending,
        approved,
        completed,
        rejected,
        totalCA
      });
    } catch (error) {
      console.error(error);
      showNotification('Erreur de chargement des ventes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchVentes();
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000);
  };

  // Générer le bon de livraison PDF
  const handleGenerateBonLivraison = async (vente) => {
    if (!vente || (vente.status !== 'approved' && vente.status !== 'completed')) {
      showNotification('Seules les ventes approuvées ou complétées peuvent générer un bon de livraison', 'error');
      return;
    }
    
    setGeneratingBl(vente.id);
    try {
      // Récupérer les détails complets de la vente
      const response = await AxiosInstance.get(`/ventes/${vente.id}/`);
      const venteData = response.data;
      
      // Options pour le bon de livraison
      const options = {
        date_livraison: new Date().toISOString().split('T')[0],
        adresse_livraison: venteData.client?.adresse || '',
        contact_livraison: venteData.client?.telephone || '',
        instructions: ''
      };
      
      await BonLivraisonPdf(venteData, options);
      showNotification(`Bon de livraison généré pour ${vente.reference}`, 'success');
    } catch (error) {
      console.error('Erreur génération bon de livraison:', error);
      showNotification('Erreur lors de la génération du bon de livraison', 'error');
    } finally {
      setGeneratingBl(null);
    }
  };

  // Approuver une vente
  const handleApprove = async () => {
    if (!venteToApprove) return;
    try {
      await AxiosInstance.post(`/ventes/${venteToApprove.id}/approve/`);
      showNotification(`Vente "${venteToApprove.reference}" approuvée avec succès`, 'success');
      fetchVentes();
      setShowApproveModal(false);
      setVenteToApprove(null);
    } catch (error) {
      showNotification(error.response?.data?.error || 'Erreur lors de l\'approbation', 'error');
    }
  };

  // Rejeter une vente
  const handleReject = async () => {
    if (!venteToApprove) return;
    if (!rejectReason.trim()) {
      showNotification('Veuillez saisir un motif de rejet', 'error');
      return;
    }
    try {
      await AxiosInstance.post(`/ventes/${venteToApprove.id}/reject/`, { motif: rejectReason });
      showNotification(`Vente "${venteToApprove.reference}" rejetée`, 'success');
      fetchVentes();
      setShowRejectModal(false);
      setVenteToApprove(null);
      setRejectReason('');
    } catch (error) {
      showNotification(error.response?.data?.error || 'Erreur lors du rejet', 'error');
    }
  };

  const handleDeleteVente = async () => {
    if (!venteToDelete) return;
    try {
      await AxiosInstance.delete(`/ventes/${venteToDelete.id}/`);
      showNotification(`Vente "${venteToDelete.reference}" supprimée avec succès`, 'success');
      fetchVentes();
      setShowDeleteModal(false);
      setVenteToDelete(null);
    } catch (error) {
      showNotification('Erreur lors de la suppression', 'error');
    }
  };

  // Vérifier si l'utilisateur peut approuver (chef d'agence ou PDG)
  const canApprove = () => {
    return userRoles.est_pdg || userRoles.est_chef_agence;
  };

  // Vérifier si une vente peut générer un bon de livraison
  const canGenerateBonLivraison = (vente) => {
    return vente.status === 'approved' || vente.status === 'completed';
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-3 h-3" /> : 
      <ChevronDown className="w-3 h-3" />;
  };

  const filteredAndSortedVentes = useMemo(() => {
    let filtered = ventes.filter(vente => {
      const search = searchTerm.toLowerCase();
      const reference = (vente.reference || '').toLowerCase();
      const clientNom = (vente.client_nom || '').toLowerCase();
      const matchesSearch = reference.includes(search) || clientNom.includes(search);
      const matchesStatus = !filterStatus || vente.status === filterStatus;
      const matchesType = !filterType || vente.type_vente === filterType;
      const matchesDateStart = !dateRange.start || new Date(vente.date_vente) >= new Date(dateRange.start);
      const matchesDateEnd = !dateRange.end || new Date(vente.date_vente) <= new Date(dateRange.end);
      return matchesSearch && matchesStatus && matchesType && matchesDateStart && matchesDateEnd;
    });

    filtered.sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      
      if (sortField === 'total' || sortField === 'montant_du') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }
      
      if (sortField === 'date_vente') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [ventes, searchTerm, filterStatus, filterType, dateRange, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedVentes.length / itemsPerPage);
  const paginatedVentes = filteredAndSortedVentes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatPrice = (price) => {
    if (!price) return '0 FCFA';
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;
    return (
      <span className={`badge ${config.bgColor} ${config.color} gap-1 px-3 py-2`}>
        <Icon className="w-3 h-3" /> {config.label}
      </span>
    );
  };

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-base font-medium text-base-content/70 animate-pulse">
            Chargement des ventes...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6 p-3 lg:p-6">
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-16 lg:top-20 right-3 lg:right-6 z-50 animate-slideDown w-[calc(100%-1.5rem)] lg:w-auto max-w-md">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg`}>
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5" />
            ) : (
              <AlertCircle className="w-4 h-4 lg:w-5 lg:h-5" />
            )}
            <span className="text-sm lg:text-base font-medium">{notification.message}</span>
            <button 
              className="btn btn-ghost btn-xs btn-circle"
              onClick={() => setNotification({ ...notification, show: false })}
            >
              <X className="w-3 h-3 lg:w-4 lg:h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Approbation */}
      {showApproveModal && venteToApprove && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-md">
            <div className="text-center">
              <div className="avatar placeholder mb-4">
                <div className="bg-success/10 text-success rounded-full w-16 h-16">
                  <UserCheck className="w-8 h-8" />
                </div>
              </div>
              <h3 className="font-bold text-xl mb-2">Approuver la vente</h3>
              <p className="text-base-content/70 text-sm">
                Voulez-vous vraiment approuver cette vente ?
              </p>
              <p className="text-lg font-bold text-primary mt-2">
                {venteToApprove.reference}
              </p>
              <p className="text-sm text-base-content/60 mt-1">
                Montant: {formatPrice(venteToApprove.total)}
              </p>
              <p className="text-xs text-base-content/50 mt-3">
                Le stock sera automatiquement déduit.
              </p>
            </div>
            <div className="modal-action">
              <button 
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setShowApproveModal(false);
                  setVenteToApprove(null);
                }}
              >
                Annuler
              </button>
              <button 
                className="btn btn-success btn-sm gap-2"
                onClick={handleApprove}
              >
                <CheckCircle className="w-4 h-4" />
                Approuver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rejet */}
      {showRejectModal && venteToApprove && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-md">
            <div className="text-center">
              <div className="avatar placeholder mb-4">
                <div className="bg-error/10 text-error rounded-full w-16 h-16">
                  <UserX className="w-8 h-8" />
                </div>
              </div>
              <h3 className="font-bold text-xl mb-2">Rejeter la vente</h3>
              <p className="text-base-content/70 text-sm">
                Vente: <span className="font-semibold">{venteToApprove.reference}</span>
              </p>
              <div className="mt-4 text-left">
                <label className="label">
                  <span className="label-text font-medium">Motif du rejet *</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows="3"
                  placeholder="Expliquez la raison du rejet..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-action">
              <button 
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setShowRejectModal(false);
                  setVenteToApprove(null);
                  setRejectReason('');
                }}
              >
                Annuler
              </button>
              <button 
                className="btn btn-error btn-sm gap-2"
                onClick={handleReject}
              >
                <XCircle className="w-4 h-4" />
                Rejeter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Suppression */}
      {showDeleteModal && venteToDelete && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-md">
            <div className="text-center">
              <div className="avatar placeholder mb-4">
                <div className="bg-error/10 text-error rounded-full w-16 h-16">
                  <AlertTriangle className="w-8 h-8" />
                </div>
              </div>
              <h3 className="font-bold text-xl mb-2">Confirmer la suppression</h3>
              <p className="text-base-content/70 text-sm">
                Voulez-vous vraiment supprimer cette vente ?
              </p>
              <p className="text-lg font-bold text-error mt-2">
                "{venteToDelete.reference}"
              </p>
              <p className="text-xs text-base-content/50 mt-3">
                Cette action est irréversible.
              </p>
            </div>
            <div className="modal-action">
              <button 
                className="btn btn-ghost btn-sm"
                onClick={() => setShowDeleteModal(false)}
              >
                Annuler
              </button>
              <button 
                className="btn btn-error btn-sm"
                onClick={handleDeleteVente}
              >
                <Trash2 className="w-3 h-3" />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-base-content">Ventes</h1>
          <p className="text-xs lg:text-sm text-base-content/60">Gérez toutes vos ventes</p>
          {currentUser && (
            <p className="text-xs text-primary mt-1">
              Rôle: {userRoles.est_pdg ? 'PDG' : userRoles.est_chef_agence ? 'Chef d\'agence' : 'Utilisateur standard'}
              {canApprove() && <span className="ml-2 text-success">✓ Peut approuver</span>}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={fetchVentes} className="btn btn-outline btn-sm lg:btn-md gap-1 lg:gap-2">
            <RefreshCw className="w-3 h-3 lg:w-4 lg:h-4" />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
          <button onClick={() => navigate('/ventes/nouveau')} className="btn btn-primary btn-sm lg:btn-md gap-1 lg:gap-2">
            <Plus className="w-3 h-3 lg:w-4 lg:h-4" />
            <span className="hidden sm:inline">Nouvelle vente</span>
            <span className="sm:hidden">Vente</span>
          </button>
        </div>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 lg:gap-3">
        <div className="stat bg-base-100 rounded-lg lg:rounded-xl shadow-sm border border-base-300 p-2 lg:p-4">
          <div className="stat-figure text-primary"><ShoppingCart className="w-5 h-5 lg:w-6 lg:h-6" /></div>
          <div className="stat-title text-xs lg:text-sm">Total ventes</div>
          <div className="stat-value text-lg lg:text-2xl">{stats.total}</div>
        </div>
        <div className="stat bg-base-100 rounded-lg lg:rounded-xl shadow-sm border border-base-300 p-2 lg:p-4">
          <div className="stat-figure text-warning"><Clock className="w-5 h-5 lg:w-6 lg:h-6" /></div>
          <div className="stat-title text-xs lg:text-sm">En attente</div>
          <div className="stat-value text-lg lg:text-2xl">{stats.pending}</div>
        </div>
        <div className="stat bg-base-100 rounded-lg lg:rounded-xl shadow-sm border border-base-300 p-2 lg:p-4">
          <div className="stat-figure text-info"><CheckCircle className="w-5 h-5 lg:w-6 lg:h-6" /></div>
          <div className="stat-title text-xs lg:text-sm">Approuvées</div>
          <div className="stat-value text-lg lg:text-2xl">{stats.approved}</div>
        </div>
        <div className="stat bg-base-100 rounded-lg lg:rounded-xl shadow-sm border border-base-300 p-2 lg:p-4">
          <div className="stat-figure text-success"><CheckCircle className="w-5 h-5 lg:w-6 lg:h-6" /></div>
          <div className="stat-title text-xs lg:text-sm">Complétées</div>
          <div className="stat-value text-lg lg:text-2xl">{stats.completed}</div>
        </div>
        <div className="stat bg-base-100 rounded-lg lg:rounded-xl shadow-sm border border-base-300 p-2 lg:p-4">
          <div className="stat-figure text-error"><XCircle className="w-5 h-5 lg:w-6 lg:h-6" /></div>
          <div className="stat-title text-xs lg:text-sm">Rejetées</div>
          <div className="stat-value text-lg lg:text-2xl">{stats.rejected}</div>
        </div>
        <div className="stat bg-base-100 rounded-lg lg:rounded-xl shadow-sm border border-base-300 p-2 lg:p-4">
          <div className="stat-figure text-secondary"><DollarSign className="w-5 h-5 lg:w-6 lg:h-6" /></div>
          <div className="stat-title text-xs lg:text-sm">CA total</div>
          <div className="stat-value text-lg lg:text-2xl">{formatPrice(stats.totalCA)}</div>
        </div>
      </div>

      {/* Filtres - Desktop */}
      <div className="hidden lg:flex bg-base-100 rounded-xl shadow-sm border border-base-300 p-4">
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
            <input type="text" placeholder="Rechercher par référence ou client..." className="input input-bordered input-sm w-full pl-9" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
          </div>
          <select className="select select-bordered select-sm w-36" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}>
            <option value="">Tous statuts</option>
            <option value="draft">Brouillon</option>
            <option value="pending_approval">En attente</option>
            <option value="approved">Approuvée</option>
            <option value="completed">Complétée</option>
            <option value="rejected">Rejetée</option>
            <option value="cancelled">Annulée</option>
          </select>
          <select className="select select-bordered select-sm w-36" value={filterType} onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}>
            <option value="">Tous types</option>
            <option value="comptoir">Comptoir</option>
            <option value="livraison">Livraison</option>
            <option value="en_ligne">En ligne</option>
          </select>
          <input type="date" className="input input-bordered input-sm w-36" placeholder="Date début" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} />
          <input type="date" className="input input-bordered input-sm w-36" placeholder="Date fin" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} />
          <button className="btn btn-outline btn-sm" onClick={() => { setFilterStatus(''); setFilterType(''); setSearchTerm(''); setDateRange({ start: '', end: '' }); setCurrentPage(1); }}>
            <RefreshCw className="w-3 h-3" /> Réinitialiser
          </button>
        </div>
      </div>

      {/* Filtres - Mobile */}
      <div className="lg:hidden">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-base-content/40" />
            <input type="text" placeholder="Rechercher..." className="input input-bordered input-sm w-full pl-8 text-sm" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => setShowMobileFilters(!showMobileFilters)}>
            <Filter className="w-3 h-3" /> Filtres
          </button>
        </div>
        {showMobileFilters && (
          <div className="mt-2 p-3 bg-base-100 rounded-lg border border-base-300 space-y-2">
            <select className="select select-bordered select-sm w-full" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Tous statuts</option>
              <option value="draft">Brouillon</option>
              <option value="pending_approval">En attente</option>
              <option value="approved">Approuvée</option>
              <option value="completed">Complétée</option>
              <option value="rejected">Rejetée</option>
            </select>
            <select className="select select-bordered select-sm w-full" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">Tous types</option>
              <option value="comptoir">Comptoir</option>
              <option value="livraison">Livraison</option>
              <option value="en_ligne">En ligne</option>
            </select>
            <input type="date" className="input input-bordered input-sm w-full" placeholder="Date début" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} />
            <input type="date" className="input input-bordered input-sm w-full" placeholder="Date fin" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} />
            <button className="btn btn-outline btn-sm w-full" onClick={() => { setFilterStatus(''); setFilterType(''); setSearchTerm(''); setDateRange({ start: '', end: '' }); setCurrentPage(1); setShowMobileFilters(false); }}>
              Réinitialiser
            </button>
          </div>
        )}
      </div>

      {/* Tableau - Desktop */}
      <div className="hidden lg:block bg-base-100 rounded-xl shadow-sm border border-base-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr className="bg-base-200">
                <th><button className="flex items-center gap-1 hover:text-primary font-semibold" onClick={() => handleSort('reference')}>Référence<SortIcon field="reference" /></button></th>
                <th><button className="flex items-center gap-1 hover:text-primary font-semibold" onClick={() => handleSort('client_nom')}>Client<SortIcon field="client_nom" /></button></th>
                <th><button className="flex items-center gap-1 hover:text-primary font-semibold" onClick={() => handleSort('date_vente')}>Date<SortIcon field="date_vente" /></button></th>
                <th><button className="flex items-center gap-1 hover:text-primary font-semibold" onClick={() => handleSort('total')}>Montant<SortIcon field="total" /></button></th>
                <th>Statut</th>
                <th>Paiement</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVentes.map((vente) => (
                <tr key={vente.id} className="hover">
                  <td className="font-mono text-sm">{vente.reference}</td>
                  <td>{vente.client_nom || 'Anonyme'}</td>
                  <td className="text-sm">{formatDate(vente.date_vente)}</td>
                  <td className="font-semibold text-primary">{formatPrice(vente.total)}</td>
                  <td>{getStatusBadge(vente.status)}</td>
                  <td>
                    {vente.est_paye ? (
                      <span className="badge badge-success gap-1 px-3 py-2"><CheckCircle className="w-3 h-3" /> Payé</span>
                    ) : (
                      <span className="badge badge-error gap-1 px-3 py-2"><AlertCircle className="w-3 h-3" /> {formatPrice(vente.montant_du)}</span>
                    )}
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      {/* Bouton Bon de Livraison */}
                      {canGenerateBonLivraison(vente) && (
                        <button 
                          className="btn btn-ghost btn-xs text-info"
                          onClick={() => handleGenerateBonLivraison(vente)}
                          disabled={generatingBl === vente.id}
                          title="Bon de livraison"
                        >
                          {generatingBl === vente.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Truck className="w-3 h-3" />
                          )}
                        </button>
                      )}
                      {/* Boutons Approuver/Rejeter - visible uniquement pour les ventes en attente et pour les chefs d'agence/PDG */}
                      {vente.status === 'pending_approval' && canApprove() && (
                        <>
                          <button 
                            className="btn btn-ghost btn-xs text-success"
                            onClick={() => {
                              setVenteToApprove(vente);
                              setShowApproveModal(true);
                            }}
                            title="Approuver"
                          >
                            <CheckCircle className="w-3 h-3" />
                          </button>
                          <button 
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => {
                              setVenteToApprove(vente);
                              setRejectReason('');
                              setShowRejectModal(true);
                            }}
                            title="Rejeter"
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      <button className="btn btn-ghost btn-xs" onClick={() => { setSelectedVente(vente); setShowDetailsModal(true); }} title="Détails">
                        <Eye className="w-3 h-3" />
                      </button>
                      <button className="btn btn-ghost btn-xs text-error" onClick={() => { setVenteToDelete(vente); setShowDeleteModal(true); }} title="Supprimer">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredAndSortedVentes.length === 0 && (
          <div className="p-12 text-center">
            <ShoppingCart className="w-16 h-16 mx-auto mb-3 text-base-content/30" />
            <p className="text-base font-medium text-base-content/50">Aucune vente trouvée</p>
            <button className="btn btn-primary btn-sm mt-4" onClick={() => navigate('/ventes/nouveau')}><Plus className="w-3 h-3" /> Créer une vente</button>
          </div>
        )}
      </div>

      {/* Liste - Mobile */}
      <div className="lg:hidden space-y-2">
        {paginatedVentes.length === 0 ? (
          <div className="bg-base-100 rounded-xl p-8 text-center border border-base-300">
            <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-base-content/30" />
            <p className="text-sm font-medium text-base-content/50">Aucune vente trouvée</p>
            <button className="btn btn-primary btn-sm mt-3" onClick={() => navigate('/ventes/nouveau')}><Plus className="w-3 h-3" /> Nouvelle vente</button>
          </div>
        ) : (
          paginatedVentes.map((vente) => {
            const status = statusConfig[vente.status] || statusConfig.draft;
            const StatusIcon = status.icon;
            return (
              <div key={vente.id} className="bg-base-100 rounded-xl p-3 border border-base-300 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-mono font-semibold text-sm">{vente.reference}</h3>
                      <span className={`badge ${status.bgColor} ${status.color} gap-1 text-xs`}><StatusIcon className="w-3 h-3" /> {status.label}</span>
                    </div>
                    <p className="text-sm font-medium text-primary mt-1">{formatPrice(vente.total)}</p>
                    <p className="text-xs text-base-content/60 mt-1">{vente.client_nom || 'Anonyme'} • {formatDate(vente.date_vente)}</p>
                    <div className="mt-2">
                      {vente.est_paye ? (
                        <span className="badge badge-success gap-1 text-xs"><CheckCircle className="w-3 h-3" /> Payé</span>
                      ) : (
                        <span className="badge badge-error gap-1 text-xs"><AlertCircle className="w-3 h-3" /> {formatPrice(vente.montant_du)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {/* Bouton Bon de Livraison - Mobile */}
                    {canGenerateBonLivraison(vente) && (
                      <button 
                        className="btn btn-ghost btn-xs btn-square text-info"
                        onClick={() => handleGenerateBonLivraison(vente)}
                        disabled={generatingBl === vente.id}
                        title="Bon de livraison"
                      >
                        {generatingBl === vente.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Truck className="w-3 h-3" />
                        )}
                      </button>
                    )}
                    {/* Boutons Approuver/Rejeter - Mobile */}
                    {vente.status === 'pending_approval' && canApprove() && (
                      <>
                        <button className="btn btn-ghost btn-xs btn-square text-success" onClick={() => { setVenteToApprove(vente); setShowApproveModal(true); }} title="Approuver">
                          <CheckCircle className="w-3 h-3" />
                        </button>
                        <button className="btn btn-ghost btn-xs btn-square text-error" onClick={() => { setVenteToApprove(vente); setRejectReason(''); setShowRejectModal(true); }} title="Rejeter">
                          <XCircle className="w-3 h-3" />
                        </button>
                      </>
                    )}
                    <button className="btn btn-ghost btn-xs btn-square" onClick={() => { setSelectedVente(vente); setShowDetailsModal(true); }} title="Détails">
                      <Eye className="w-3 h-3" />
                    </button>
                    <button className="btn btn-ghost btn-xs btn-square text-error" onClick={() => { setVenteToDelete(vente); setShowDeleteModal(true); }} title="Supprimer">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {filteredAndSortedVentes.length > 0 && totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button className="btn btn-outline btn-sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="w-4 h-4" /> Précédent</button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = totalPages <= 5 ? i + 1 : (currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i);
              return <button key={pageNum} onClick={() => goToPage(pageNum)} className={`btn btn-sm ${currentPage === pageNum ? 'btn-primary text-white' : 'btn-outline'}`}>{pageNum}</button>;
            })}
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>Suivant <ChevronRight className="w-4 h-4" /></button>
        </div>
      )}

      {/* Modal de détails avec bouton bon de livraison */}
      {showDetailsModal && selectedVente && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Détails de la vente</h3>
              <button className="btn btn-sm btn-circle btn-ghost" onClick={() => setShowDetailsModal(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-base-content/60">Référence</p><p className="font-mono font-semibold">{selectedVente.reference}</p></div>
                {getStatusBadge(selectedVente.status)}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-base-content/60">Client</p><p className="font-medium">{selectedVente.client_nom || 'Anonyme'}</p></div>
                <div><p className="text-xs text-base-content/60">Vendeur</p><p>{selectedVente.vendeur_nom}</p></div>
                <div><p className="text-xs text-base-content/60">Date</p><p>{formatDate(selectedVente.date_vente)}</p></div>
                <div><p className="text-xs text-base-content/60">Agence</p><p>{selectedVente.agence_nom}</p></div>
                <div><p className="text-xs text-base-content/60">Type</p><p>{selectedVente.type_vente}</p></div>
              </div>
              <div className="divider my-2"></div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-base-content/60">Sous-total</p><p>{formatPrice(selectedVente.sous_total)}</p></div>
                <div><p className="text-xs text-base-content/60">TVA (18%)</p><p>{formatPrice(selectedVente.tva)}</p></div>
                <div><p className="text-xs text-base-content/60 font-bold">Total</p><p className="text-lg font-bold text-primary">{formatPrice(selectedVente.total)}</p></div>
                <div><p className="text-xs text-base-content/60">Montant payé</p><p className="text-success font-semibold">{formatPrice(selectedVente.montant_paye)}</p></div>
                <div><p className="text-xs text-base-content/60">Reste à payer</p><p className="text-error font-semibold">{formatPrice(selectedVente.montant_du)}</p></div>
              </div>
            </div>
            <div className="modal-action flex-wrap gap-2">
              {canGenerateBonLivraison(selectedVente) && (
                <button 
                  className="btn btn-info btn-sm gap-2"
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleGenerateBonLivraison(selectedVente);
                  }}
                  disabled={generatingBl === selectedVente.id}
                >
                  {generatingBl === selectedVente.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Truck className="w-3 h-3" />
                  )}
                  Bon de livraison
                </button>
              )}
              <button className="btn btn-primary btn-sm" onClick={() => { setShowDetailsModal(false); navigate(`/ventes/${selectedVente.id}`); }}>
                <Eye className="w-3 h-3" /> Voir détails complets
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDetailsModal(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VentesList;