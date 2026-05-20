// src/components/sales/VentesList.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AxiosInstance from '../AxiosInstance';
import {
  ShoppingCart, Eye, CheckCircle, XCircle, Clock, Search,
  RefreshCw, Filter, Calendar, TrendingUp, AlertCircle,
  ChevronLeft, ChevronRight, Users, FileText, CreditCard,
  X, Download, Printer, Plus, DollarSign
} from 'lucide-react';

const VentesList = () => {
  const navigate = useNavigate();
  const [ventes, setVentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [venteToDelete, setVenteToDelete] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [stats, setStats] = useState(null);

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000);
  };

  const statusConfig = {
    draft: { label: 'Brouillon', icon: Clock, color: 'text-gray-500', bgColor: 'bg-gray-100' },
    pending_approval: { label: 'En attente', icon: Clock, color: 'text-orange-500', bgColor: 'bg-orange-100' },
    approved: { label: 'Approuvée', icon: CheckCircle, color: 'text-blue-500', bgColor: 'bg-blue-100' },
    rejected: { label: 'Rejetée', icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-100' },
    completed: { label: 'Complétée', icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-100' },
    cancelled: { label: 'Annulée', icon: XCircle, color: 'text-gray-500', bgColor: 'bg-gray-100' }
  };

  const fetchVentes = async () => {
    setLoading(true);
    try {
      const response = await AxiosInstance.get('/ventes/');
      setVentes(response.data);
      
      const total = response.data.reduce((sum, v) => sum + (v.total || 0), 0);
      const pending = response.data.filter(v => v.status === 'pending_approval').length;
      const completed = response.data.filter(v => v.status === 'completed').length;
      const rejected = response.data.filter(v => v.status === 'rejected').length;
      setStats({ total, pending, completed, rejected, count: response.data.length });
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur de chargement des ventes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVentes();
  }, []);

  const handleDelete = async () => {
    if (!venteToDelete) return;
    try {
      await AxiosInstance.delete(`/ventes/${venteToDelete.id}/`);
      showNotification('Vente supprimée avec succès', 'success');
      fetchVentes();
      setShowDeleteModal(false);
      setVenteToDelete(null);
    } catch (error) {
      showNotification('Erreur lors de la suppression', 'error');
    }
  };

  const filteredVentes = ventes.filter(vente => {
    const matchesSearch = !searchTerm || 
      (vente.reference?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (vente.client_nom?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || vente.status === statusFilter;
    const matchesType = typeFilter === 'all' || vente.type_vente === typeFilter;
    
    const matchesDateStart = !dateRange.start || new Date(vente.date_vente) >= new Date(dateRange.start);
    const matchesDateEnd = !dateRange.end || new Date(vente.date_vente) <= new Date(dateRange.end);
    
    return matchesSearch && matchesStatus && matchesType && matchesDateStart && matchesDateEnd;
  });

  const totalPages = Math.ceil(filteredVentes.length / itemsPerPage);
  const paginatedVentes = filteredVentes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <div className="loading loading-spinner loading-lg text-primary w-12 h-12 sm:w-16 sm:h-16"></div>
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement des ventes...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 min-h-screen">
      {/* Notification Toast */}
      {notification.show && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 animate-slideDown">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-xl text-sm sm:text-base rounded-xl`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span className="font-medium">{notification.message}</span>
            </div>
            <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setNotification({ show: false, message: '', type: 'success' })}>
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Suppression */}
      {showDeleteModal && venteToDelete && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md p-0 overflow-hidden">
            <div className="bg-error/10 p-4 text-center">
              <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-8 h-8 text-error" />
              </div>
              <h3 className="text-xl font-bold text-error">Confirmer la suppression</h3>
            </div>
            <div className="p-6 text-center">
              <p className="text-base-content/70">Voulez-vous vraiment supprimer cette vente ?</p>
              <p className="font-semibold text-error mt-2">{venteToDelete.reference}</p>
            </div>
            <div className="flex gap-3 p-4 bg-gray-50">
              <button className="btn btn-ghost flex-1" onClick={() => setShowDeleteModal(false)}>Annuler</button>
              <button className="btn btn-error flex-1 gap-2" onClick={handleDelete}>
                <Trash2 className="w-4 h-4" /> Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* En-tête avec gradient */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full filter blur-3xl"></div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-xl">
                <ShoppingCart className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-primary">Ventes</h1>
            </div>
            <p className="text-sm text-base-content/60 ml-1">
              Gérez toutes vos ventes – {stats?.count || 0} vente(s)
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={fetchVentes} className="btn btn-sm sm:btn-md btn-outline gap-2 hover:bg-primary/10 transition-all">
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
            <button onClick={() => navigate('/point-de-vente')} className="btn btn-sm sm:btn-md bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white border-none shadow-lg hover:shadow-xl transition-all gap-2">
              <Plus className="w-4 h-4" />
              Nouvelle vente
            </button>
          </div>
        </div>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card bg-white shadow-md hover:shadow-lg transition-all rounded-xl border border-gray-200">
          <div className="card-body p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-gray-500 font-medium uppercase">CA total</p><p className="text-xl sm:text-2xl font-bold text-primary">{formatPrice(stats?.total)}</p></div>
              <DollarSign className="w-8 h-8 text-primary/20" />
            </div>
          </div>
        </div>
        <div className="card bg-white shadow-md hover:shadow-lg transition-all rounded-xl border border-gray-200">
          <div className="card-body p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-gray-500 font-medium uppercase">En attente</p><p className="text-xl sm:text-2xl font-bold text-orange-500">{stats?.pending || 0}</p></div>
              <Clock className="w-8 h-8 text-orange-500/20" />
            </div>
          </div>
        </div>
        <div className="card bg-white shadow-md hover:shadow-lg transition-all rounded-xl border border-gray-200">
          <div className="card-body p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-gray-500 font-medium uppercase">Complétées</p><p className="text-xl sm:text-2xl font-bold text-green-500">{stats?.completed || 0}</p></div>
              <CheckCircle className="w-8 h-8 text-green-500/20" />
            </div>
          </div>
        </div>
        <div className="card bg-white shadow-md hover:shadow-lg transition-all rounded-xl border border-gray-200">
          <div className="card-body p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-gray-500 font-medium uppercase">Rejetées</p><p className="text-xl sm:text-2xl font-bold text-red-500">{stats?.rejected || 0}</p></div>
              <XCircle className="w-8 h-8 text-red-500/20" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtres avancés */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Rechercher par référence ou client..." 
              className="input input-bordered w-full pl-9 py-3 focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
              value={searchTerm} 
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="btn btn-outline btn-sm sm:hidden gap-2">
            <Filter className="w-4 h-4" /> {showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
          </button>
          <div className={`${showFilters ? 'grid' : 'hidden'} sm:grid grid-cols-1 sm:grid-cols-4 gap-3`}>
            <select className="select select-bordered w-full focus:border-primary" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
              <option value="all">Tous les statuts</option>
              <option value="draft">Brouillon</option>
              <option value="pending_approval">En attente</option>
              <option value="approved">Approuvée</option>
              <option value="completed">Complétée</option>
              <option value="rejected">Rejetée</option>
              <option value="cancelled">Annulée</option>
            </select>
            <select className="select select-bordered w-full focus:border-primary" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}>
              <option value="all">Tous les types</option>
              <option value="comptoir">Comptoir</option>
              <option value="livraison">Livraison</option>
              <option value="en_ligne">En ligne</option>
            </select>
            <input type="date" className="input input-bordered w-full focus:border-primary" placeholder="Date début" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} />
            <input type="date" className="input input-bordered w-full focus:border-primary" placeholder="Date fin" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Tableau professionnel */}
      <div className="bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-white text-sm">
                <th className="py-4 font-semibold">Référence</th>
                <th className="py-4 font-semibold">Client</th>
                <th className="py-4 font-semibold">Date</th>
                <th className="py-4 font-semibold text-right">Montant</th>
                <th className="py-4 font-semibold text-center">Statut</th>
                <th className="py-4 font-semibold text-center">Paiement</th>
                <th className="py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVentes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                        <ShoppingCart className="w-10 h-10 text-gray-300" />
                      </div>
                      <p className="text-gray-500 font-medium">Aucune vente trouvée</p>
                      <button onClick={() => navigate('/point-de-vente')} className="btn btn-primary btn-sm gap-2 mt-2">
                        <Plus className="w-4 h-4" /> Créer une vente
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedVentes.map((vente) => {
                  const status = statusConfig[vente.status] || statusConfig.draft;
                  const StatusIcon = status.icon;
                  return (
                    <tr key={vente.id} className="hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => navigate(`/ventes/${vente.id}`)}>
                      <td className="font-mono text-sm">{vente.reference}</td>
                      <td>{vente.client_nom || 'Anonyme'}</td>
                      <td className="text-sm">{formatDate(vente.date_vente)}</td>
                      <td className="text-right font-semibold text-primary">{formatPrice(vente.total)}</td>
                      <td className="text-center">
                        <span className={`badge ${status.bgColor} ${status.color} gap-1 px-3 py-2`}>
                          <StatusIcon className="w-3 h-3" /> {status.label}
                        </span>
                      </td>
                      <td className="text-center">
                        {vente.est_paye ? (
                          <span className="badge badge-success gap-1 px-3 py-2">
                            <CheckCircle className="w-3 h-3" /> Payé
                          </span>
                        ) : (
                          <span className="badge badge-error gap-1 px-3 py-2">
                            <AlertCircle className="w-3 h-3" /> {formatPrice(vente.montant_du)}
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        <div className="flex justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button 
                            className="btn btn-ghost btn-sm btn-circle"
                            onClick={(e) => { e.stopPropagation(); navigate(`/ventes/${vente.id}`); }}
                            title="Détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination élégante */}
        {filteredVentes.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-500">
                Affichage de <span className="font-semibold text-primary">{((currentPage-1)*itemsPerPage)+1}</span> à{' '}
                <span className="font-semibold text-primary">{Math.min(currentPage*itemsPerPage, filteredVentes.length)}</span>{' '}
                sur <span className="font-semibold">{filteredVentes.length}</span> ventes
              </div>
              <div className="flex items-center gap-3">
                <select className="select select-bordered select-sm" value={itemsPerPage} onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}>
                  <option value="5">5 lignes</option>
                  <option value="10">10 lignes</option>
                  <option value="15">15 lignes</option>
                  <option value="20">20 lignes</option>
                </select>
                <div className="join">
                  <button className="join-item btn btn-sm" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage===1}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) pageNum = i+1;
                    else if (currentPage <= 3) pageNum = i+1;
                    else if (currentPage >= totalPages-2) pageNum = totalPages-4+i;
                    else pageNum = currentPage-2+i;
                    return (
                      <button 
                        key={pageNum} 
                        onClick={() => setCurrentPage(pageNum)} 
                        className={`join-item btn btn-sm ${currentPage === pageNum ? 'btn-primary text-white' : ''}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button className="join-item btn btn-sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage===totalPages}>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VentesList;