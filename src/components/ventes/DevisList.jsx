// src/components/sales/DevisList.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AxiosInstance from '../AxiosInstance';
import DevisPDF from './DevisPDF';
import {
  FileText, Eye, CheckCircle, XCircle, Clock, Search,
  RefreshCw, Filter, Calendar, AlertCircle, DollarSign,
  ChevronLeft, ChevronRight, Plus, AlertTriangle,
  ArrowUpDown, ChevronUp, ChevronDown, Trash2, Receipt, Printer,
  Send, Check, Ban, ShoppingCart
} from 'lucide-react';

const DevisList = () => {
  const navigate = useNavigate();
  const [devisList, setDevisList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [devisToDelete, setDevisToDelete] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [sortField, setSortField] = useState('date_creation');
  const [sortDirection, setSortDirection] = useState('desc');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    sent: 0,
    accepted: 0,
    converted: 0,
    expired: 0,
    totalMontant: 0
  });

  const statutConfig = {
    draft: { label: 'Brouillon', icon: Clock, color: 'text-gray-500', bgColor: 'bg-gray-100' },
    sent: { label: 'Envoyé', icon: Send, color: 'text-blue-500', bgColor: 'bg-blue-100' },
    accepted: { label: 'Accepté', icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-100' },
    refused: { label: 'Refusé', icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-100' },
    converted: { label: 'Converti', icon: ShoppingCart, color: 'text-purple-500', bgColor: 'bg-purple-100' },
    expired: { label: 'Expiré', icon: AlertCircle, color: 'text-orange-500', bgColor: 'bg-orange-100' },
    cancelled: { label: 'Annulé', icon: Ban, color: 'text-gray-500', bgColor: 'bg-gray-100' }
  };

  const fetchDevis = async () => {
    setLoading(true);
    try {
      const response = await AxiosInstance.get('/devis/');
      const data = response.data;
      setDevisList(data);

      const totalMontant = data.reduce((sum, d) => sum + (d.total || 0), 0);
      setStats({
        total: data.length,
        draft: data.filter(d => d.status === 'draft').length,
        sent: data.filter(d => d.status === 'sent').length,
        accepted: data.filter(d => d.status === 'accepted').length,
        converted: data.filter(d => d.status === 'converted').length,
        expired: data.filter(d => d.status === 'expired').length,
        totalMontant
      });
    } catch (error) {
      console.error(error);
      showNotification('Erreur de chargement des devis', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevis();
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000);
  };

  const handleGeneratePDF = async (devis, e) => {
    e.stopPropagation();
    setGeneratingPDF(true);
    try {
      await DevisPDF(devis);
      showNotification('PDF généré avec succès', 'success');
    } catch (error) {
      console.error('Erreur:', error);
      showNotification('Erreur lors de la génération du PDF', 'error');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleAction = async (devisId, action, successMessage) => {
    setActionLoading(devisId);
    try {
      await AxiosInstance.post(`/devis/${devisId}/${action}/`);
      showNotification(successMessage, 'success');
      fetchDevis();
    } catch (error) {
      showNotification(error.response?.data?.error || `Erreur lors de l'action ${action}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConvertToVente = async (devisId) => {
    setActionLoading(devisId);
    try {
      const response = await AxiosInstance.post(`/devis/${devisId}/convertir_en_vente/`);
      showNotification('Devis converti en vente avec succès', 'success');
      // Option: rediriger vers la vente créée
      if (response.data.vente?.id) {
        navigate(`/ventes/${response.data.vente.id}`);
      } else {
        fetchDevis();
      }
    } catch (error) {
      showNotification(error.response?.data?.error || 'Erreur lors de la conversion', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDevis = async () => {
    if (!devisToDelete) return;
    try {
      await AxiosInstance.delete(`/devis/${devisToDelete.id}/`);
      showNotification(`Devis supprimé avec succès`, 'success');
      fetchDevis();
      setShowDeleteModal(false);
      setDevisToDelete(null);
    } catch (error) {
      showNotification('Erreur lors de la suppression', 'error');
    }
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
    return sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const isExpired = (devis) => {
    if (!devis.date_expiration) return false;
    return new Date(devis.date_expiration) < new Date() && devis.status !== 'converted' && devis.status !== 'cancelled';
  };

  const filteredAndSortedDevis = useMemo(() => {
    let filtered = devisList.filter(devis => {
      const search = searchTerm.toLowerCase();
      const reference = (devis.reference || '').toLowerCase();
      const clientNom = (devis.client_nom || '').toLowerCase();
      const matchesSearch = reference.includes(search) || clientNom.includes(search);
      const matchesStatut = !filterStatut || devis.status === filterStatut;
      const matchesDateStart = !dateRange.start || new Date(devis.date_creation) >= new Date(dateRange.start);
      const matchesDateEnd = !dateRange.end || new Date(devis.date_creation) <= new Date(dateRange.end);
      return matchesSearch && matchesStatut && matchesDateStart && matchesDateEnd;
    });

    filtered.sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      if (sortField === 'total') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else if (sortField === 'date_creation' || sortField === 'date_expiration') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [devisList, searchTerm, filterStatut, dateRange, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedDevis.length / itemsPerPage);
  const paginatedDevis = filteredAndSortedDevis.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatPrice = (price) => {
    if (!price) return '0 FCFA';
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatusBadge = (statut) => {
    const config = statutConfig[statut] || statutConfig.draft;
    const Icon = config.icon;
    return (
      <span className={`badge ${config.bgColor} ${config.color} gap-1 px-3 py-2`}>
        <Icon className="w-3 h-3" /> {config.label}
      </span>
    );
  };

  const getActionButtons = (devis) => {
    const isLoading = actionLoading === devis.id;
    const expired = isExpired(devis);
    const buttons = [];

    if (devis.status === 'draft') {
      buttons.push(
        <button key="send" onClick={(e) => { e.stopPropagation(); handleAction(devis.id, 'envoyer', 'Devis envoyé'); }} className="btn btn-ghost btn-xs text-blue-500" disabled={isLoading} title="Envoyer">
          {isLoading ? <span className="loading loading-spinner loading-xs"></span> : <Send className="w-4 h-4" />}
        </button>
      );
    }
    if (devis.status === 'sent' && !expired) {
      buttons.push(
        <button key="accept" onClick={(e) => { e.stopPropagation(); handleAction(devis.id, 'accepter', 'Devis accepté'); }} className="btn btn-ghost btn-xs text-green-500" disabled={isLoading} title="Accepter">
          <Check className="w-4 h-4" />
        </button>,
        <button key="refuse" onClick={(e) => { e.stopPropagation(); const motif = prompt('Motif du refus ?'); if (motif) handleAction(devis.id, 'refuser', 'Devis refusé'); }} className="btn btn-ghost btn-xs text-red-500" disabled={isLoading} title="Refuser">
          <Ban className="w-4 h-4" />
        </button>
      );
    }
    if (devis.status === 'accepted') {
      buttons.push(
        <button key="convert" onClick={(e) => { e.stopPropagation(); if (window.confirm('Convertir ce devis en vente ?')) handleConvertToVente(devis.id); }} className="btn btn-ghost btn-xs text-purple-500" disabled={isLoading} title="Convertir en vente">
          <ShoppingCart className="w-4 h-4" />
        </button>
      );
    }
    if (devis.status !== 'converted' && devis.status !== 'cancelled') {
      buttons.push(
        <button key="delete" onClick={(e) => { e.stopPropagation(); setDevisToDelete(devis); setShowDeleteModal(true); }} className="btn btn-ghost btn-xs text-error" disabled={isLoading} title="Supprimer">
          <Trash2 className="w-4 h-4" />
        </button>
      );
    }
    return buttons;
  };

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="text-base font-medium text-base-content/70 animate-pulse">Chargement des devis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6 p-3 lg:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 animate-slideDown max-w-md">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-xl rounded-xl`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{notification.message}</span>
            </div>
            <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setNotification({ show: false, message: '', type: 'success' })}>
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Suppression */}
      {showDeleteModal && devisToDelete && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md p-0 overflow-hidden">
            <div className="bg-error/10 p-4 text-center">
              <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-8 h-8 text-error" />
              </div>
              <h3 className="text-xl font-bold text-error">Confirmer la suppression</h3>
            </div>
            <div className="p-6 text-center">
              <p className="text-base-content/70">Voulez-vous vraiment supprimer ce devis ?</p>
              <p className="font-semibold text-error mt-2">{devisToDelete.reference}</p>
            </div>
            <div className="flex gap-3 p-4 bg-gray-50">
              <button className="btn btn-ghost flex-1" onClick={() => setShowDeleteModal(false)}>Annuler</button>
              <button className="btn btn-error flex-1 gap-2" onClick={handleDeleteDevis}><Trash2 className="w-4 h-4" /> Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-xl"><FileText className="w-7 h-7 text-primary" /></div>
              <h1 className="text-2xl sm:text-3xl font-black text-primary">Devis</h1>
            </div>
            <p className="text-sm text-gray-600 ml-1">Gérez vos devis – {stats.total} devis(s)</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={fetchDevis} className="btn btn-outline btn-sm gap-2"><RefreshCw className="w-4 h-4" /> Actualiser</button>
            <button onClick={() => navigate('/devis/nouveau')} className="btn btn-primary btn-sm gap-2"><Plus className="w-4 h-4" /> Nouveau devis</button>
          </div>
        </div>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="card bg-white shadow-md rounded-xl p-3 text-center"><p className="text-xs text-gray-500">Total devis</p><p className="text-xl font-bold text-primary">{stats.total}</p></div>
        <div className="card bg-white shadow-md rounded-xl p-3 text-center"><p className="text-xs text-gray-500">Brouillons</p><p className="text-xl font-bold text-gray-500">{stats.draft}</p></div>
        <div className="card bg-white shadow-md rounded-xl p-3 text-center"><p className="text-xs text-gray-500">Envoyés</p><p className="text-xl font-bold text-blue-500">{stats.sent}</p></div>
        <div className="card bg-white shadow-md rounded-xl p-3 text-center"><p className="text-xs text-gray-500">Acceptés</p><p className="text-xl font-bold text-green-500">{stats.accepted}</p></div>
        <div className="card bg-white shadow-md rounded-xl p-3 text-center"><p className="text-xs text-gray-500">Converties</p><p className="text-xl font-bold text-purple-500">{stats.converted}</p></div>
        <div className="card bg-white shadow-md rounded-xl p-3 text-center"><p className="text-xs text-gray-500">Montant total</p><p className="text-lg font-bold text-primary">{formatPrice(stats.totalMontant)}</p></div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Rechercher par référence ou client..." className="input input-bordered w-full pl-9" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
        </div>
        <button onClick={() => setShowMobileFilters(!showMobileFilters)} className="btn btn-outline btn-sm w-full sm:hidden gap-2">
          <Filter className="w-4 h-4" /> {showMobileFilters ? 'Masquer' : 'Afficher'} les filtres
        </button>
        <div className={`${showMobileFilters ? 'grid' : 'hidden'} sm:grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3`}>
          <select className="select select-bordered" value={filterStatut} onChange={(e) => { setFilterStatut(e.target.value); setCurrentPage(1); }}>
            <option value="">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="sent">Envoyé</option>
            <option value="accepted">Accepté</option>
            <option value="refused">Refusé</option>
            <option value="converted">Converti</option>
            <option value="expired">Expiré</option>
            <option value="cancelled">Annulé</option>
          </select>
          <input type="date" className="input input-bordered" placeholder="Date début" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} />
          <input type="date" className="input input-bordered" placeholder="Date fin" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} />
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr className="bg-gray-50">
                <th><button className="flex items-center gap-1" onClick={() => handleSort('reference')}>Référence<SortIcon field="reference" /></button></th>
                <th><button className="flex items-center gap-1" onClick={() => handleSort('client_nom')}>Client<SortIcon field="client_nom" /></button></th>
                <th><button className="flex items-center gap-1" onClick={() => handleSort('date_creation')}>Date création<SortIcon field="date_creation" /></button></th>
                <th><button className="flex items-center gap-1" onClick={() => handleSort('date_expiration')}>Expiration<SortIcon field="date_expiration" /></button></th>
                <th><button className="flex items-center gap-1" onClick={() => handleSort('total')}>Total<SortIcon field="total" /></button></th>
                <th>Statut</th>
                <th className="text-right">Actions</th>
               </tr>
            </thead>
            <tbody>
              {paginatedDevis.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-16"><FileText className="w-12 h-12 mx-auto text-gray-300 mb-2" /><p>Aucun devis trouvé</p><button onClick={() => navigate('/devis/nouveau')} className="btn btn-primary btn-sm mt-4"><Plus className="w-4 h-4" /> Créer un devis</button></td></tr>
              ) : (
                paginatedDevis.map((devis) => (
                  <tr key={devis.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/devis/${devis.id}`)}>
                    <td className="font-mono text-sm">{devis.reference}</td>
                    <td>{devis.client_nom || 'Anonyme'}</td>
                    <td className="text-sm">{formatDate(devis.date_creation)}</td>
                    <td className={`text-sm ${isExpired(devis) ? 'text-error font-semibold' : ''}`}>{formatDate(devis.date_expiration)}</td>
                    <td className="font-semibold text-primary">{formatPrice(devis.total)}</td>
                    <td>{getStatusBadge(devis.status)}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button className="btn btn-ghost btn-xs btn-square text-info" onClick={(e) => handleGeneratePDF(devis, e)} disabled={generatingPDF} title="Télécharger PDF">
                          <Printer className="w-4 h-4" />
                        </button>
                        <button className="btn btn-ghost btn-xs btn-square" onClick={(e) => { e.stopPropagation(); navigate(`/devis/${devis.id}`); }} title="Voir détails">
                          <Eye className="w-4 h-4" />
                        </button>
                        {getActionButtons(devis)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredAndSortedDevis.length > 0 && totalPages > 1 && (
          <div className="px-6 py-4 border-t flex justify-center items-center gap-2">
            <button className="btn btn-outline btn-sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="w-4 h-4" /> Précédent</button>
            <div className="flex gap-1">{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = totalPages <= 5 ? i + 1 : (currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i);
              return <button key={pageNum} onClick={() => goToPage(pageNum)} className={`btn btn-sm ${currentPage === pageNum ? 'btn-primary text-white' : 'btn-outline'}`}>{pageNum}</button>;
            })}</div>
            <button className="btn btn-outline btn-sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>Suivant <ChevronRight className="w-4 h-4" /></button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DevisList;