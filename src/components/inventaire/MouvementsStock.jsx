// src/pages/mouvements-stock/MouvementsStock.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, ArrowLeftRight, Package, Box,
  Eye, Filter, Search, RefreshCw, AlertCircle, Calendar,
  Download, Printer, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import AxiosInstance from '../AxiosInstance';

const MouvementsStock = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total_in: 0,
    total_out: 0,
    total_transfer: 0,
    total_value: 0
  });

  // Filtres
  const [filters, setFilters] = useState({
    movement_type: '',
    product: '',
    warehouse: '',
    date_debut: '',
    date_fin: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;

  // Données filtres
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [userAgence, setUserAgence] = useState(null);

  const movementTypes = [
    { value: 'in', label: 'Entrée', icon: TrendingDown, color: 'success' },
    { value: 'out', label: 'Sortie', icon: TrendingUp, color: 'error' },
    { value: 'transfer', label: 'Transfert', icon: ArrowLeftRight, color: 'info' },
    { value: 'adjustment', label: 'Ajustement', icon: Package, color: 'warning' },
    { value: 'return', label: 'Retour fournisseur', icon: Package, color: 'secondary' },
    { value: 'return_customer', label: 'Retour client', icon: Package, color: 'secondary' },
    { value: 'scrap', label: 'Mise au rebut', icon: Box, color: 'neutral' },
    { value: 'quarantine', label: 'Quarantaine', icon: AlertCircle, color: 'warning' },
  ];

  // ============================================================
  // CHARGEMENT DES FILTRES
  // ============================================================
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        // ✅ URLs correctes : /products/ (anglais) et /warehouses/
        const [prodRes, whRes] = await Promise.all([
          AxiosInstance.get('/products/'),
          AxiosInstance.get('/warehouses/'),
        ]);
        setProducts(Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data.results || []));
        setWarehouses(Array.isArray(whRes.data) ? whRes.data : (whRes.data.results || []));
      } catch (err) {
        console.warn('Erreur chargement filtres:', err);
      }
    };

    try {
      const agenceCourante = JSON.parse(localStorage.getItem('AgenceCourante') || '{}');
      setUserAgence(agenceCourante);
    } catch {}

    fetchFilterData();
  }, []);

  // ============================================================
  // CHARGEMENT DES MOUVEMENTS
  // ============================================================
  const fetchMovements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage);
      params.append('page_size', itemsPerPage);

      if (filters.movement_type) params.append('movement_type', filters.movement_type);
      if (filters.product) params.append('product', filters.product);
      if (filters.warehouse) params.append('warehouse', filters.warehouse);
      if (filters.date_debut) params.append('date_debut', filters.date_debut);
      if (filters.date_fin) params.append('date_fin', filters.date_fin);
      if (filters.search) params.append('search', filters.search);

      console.log('🔍 Appel API:', `/stock-movements/?${params.toString()}`);

      const response = await AxiosInstance.get(`/stock-movements/?${params.toString()}`);

      // ✅ Gérer les deux formats : paginé et non paginé
      let data, count;
      if (response.data && typeof response.data === 'object' && 'results' in response.data) {
        data = response.data.results || [];
        count = response.data.count ?? data.length;
      } else if (Array.isArray(response.data)) {
        data = response.data;
        count = data.length;
      } else {
        data = [];
        count = 0;
      }

      console.log('✅ Mouvements reçus:', data.length, 'sur', count);

      setMovements(data);
      setTotalItems(count);
      setTotalPages(Math.max(1, Math.ceil(count / itemsPerPage)));

      // Stats (uniquement pour la page courante)
      const newStats = { total_in: 0, total_out: 0, total_transfer: 0, total_value: 0 };
      data.forEach(m => {
        newStats.total_value += parseFloat(m.total_price || 0);
        if (m.movement_type === 'in') newStats.total_in += m.quantity || 0;
        if (m.movement_type === 'out') newStats.total_out += m.quantity || 0;
        if (m.movement_type === 'transfer') newStats.total_transfer += m.quantity || 0;
      });
      setStats(newStats);
    } catch (err) {
      console.error('❌ Erreur chargement mouvements:', err);
      console.error('Détails:', err.response?.data);
      setError(
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Impossible de charger les mouvements de stock'
      );
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  // ============================================================
  // HELPERS
  // ============================================================
  const resetFilters = () => {
    setFilters({
      movement_type: '', product: '', warehouse: '',
      date_debut: '', date_fin: '', search: ''
    });
    setCurrentPage(1);
  };

  const applyFilters = () => {
    setCurrentPage(1);
    fetchMovements();
  };

  const exportData = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.movement_type) params.append('movement_type', filters.movement_type);
      if (filters.date_debut) params.append('date_debut', filters.date_debut);
      if (filters.date_fin) params.append('date_fin', filters.date_fin);

      const response = await AxiosInstance.get(
        `/stock-movements/export/?${params.toString()}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mouvements_stock_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Erreur export:', err);
      alert("Erreur lors de l'export des données");
    }
  };

  const getMovementTypeInfo = (type) => {
    return movementTypes.find(t => t.value === type)
      || { label: type, icon: Package, color: 'neutral' };
  };

  const formatDate = (date) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return date;
    }
  };

  const formatNumber = (n) => {
    const num = parseFloat(n) || 0;
    return num.toLocaleString('fr-FR');
  };

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div className="p-4 md:p-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base-content flex items-center gap-2">
            <ArrowLeftRight className="w-7 h-7 text-primary" />
            Mouvements de stock
          </h1>
          <p className="text-base-content/60 text-sm mt-1">
            Suivi des entrées, sorties et transferts
          </p>
          {userAgence?.nom && (
            <div className="mt-2 text-xs text-base-content/50">
              Agence : <span className="font-semibold text-primary">{userAgence.nom}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={exportData} className="btn btn-outline btn-sm gap-1">
            <Download className="w-4 h-4" /> Exporter
          </button>
          <button onClick={() => window.print()} className="btn btn-outline btn-sm gap-1">
            <Printer className="w-4 h-4" /> Imprimer
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card bg-success/10 shadow-sm">
          <div className="card-body p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-success text-sm font-medium">Entrées</p>
                <p className="text-2xl font-bold">{formatNumber(stats.total_in)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-success" />
            </div>
          </div>
        </div>
        <div className="card bg-error/10 shadow-sm">
          <div className="card-body p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-error text-sm font-medium">Sorties</p>
                <p className="text-2xl font-bold">{formatNumber(stats.total_out)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-error" />
            </div>
          </div>
        </div>
        <div className="card bg-info/10 shadow-sm">
          <div className="card-body p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-info text-sm font-medium">Transferts</p>
                <p className="text-2xl font-bold">{formatNumber(stats.total_transfer)}</p>
              </div>
              <ArrowLeftRight className="w-8 h-8 text-info" />
            </div>
          </div>
        </div>
        <div className="card bg-primary/10 shadow-sm">
          <div className="card-body p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-primary text-sm font-medium">Valeur totale</p>
                <p className="text-2xl font-bold">{formatNumber(stats.total_value)} FCFA</p>
              </div>
              <Package className="w-8 h-8 text-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="card bg-base-100 shadow-md mb-6">
        <div className="card-body p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-base-content/60" />
              <span className="font-medium">Filtres</span>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn btn-sm btn-ghost"
              >
                {showFilters ? 'Masquer' : 'Afficher'}
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={fetchMovements} className="btn btn-sm btn-outline gap-1">
                <RefreshCw className="w-4 h-4" /> Actualiser
              </button>
              {(filters.movement_type || filters.product || filters.warehouse ||
                filters.date_debut || filters.date_fin || filters.search) && (
                <button onClick={resetFilters} className="btn btn-sm btn-ghost">
                  Réinitialiser
                </button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
              <div className="form-control w-full">
                <label className="label"><span className="label-text">Type</span></label>
                <select
                  className="select select-bordered"
                  value={filters.movement_type}
                  onChange={(e) => setFilters({ ...filters, movement_type: e.target.value })}
                >
                  <option value="">Tous</option>
                  {movementTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-control w-full">
                <label className="label"><span className="label-text">Produit</span></label>
                <select
                  className="select select-bordered"
                  value={filters.product}
                  onChange={(e) => setFilters({ ...filters, product: e.target.value })}
                >
                  <option value="">Tous</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-control w-full">
                <label className="label"><span className="label-text">Entrepôt</span></label>
                <select
                  className="select select-bordered"
                  value={filters.warehouse}
                  onChange={(e) => setFilters({ ...filters, warehouse: e.target.value })}
                >
                  <option value="">Tous</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-control w-full">
                <label className="label"><span className="label-text">Recherche</span></label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                  <input
                    type="text"
                    placeholder="Référence, produit..."
                    className="input input-bordered w-full pl-9"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-control w-full">
                <label className="label"><span className="label-text">Date début</span></label>
                <input
                  type="date"
                  className="input input-bordered"
                  value={filters.date_debut}
                  onChange={(e) => setFilters({ ...filters, date_debut: e.target.value })}
                />
              </div>

              <div className="form-control w-full">
                <label className="label"><span className="label-text">Date fin</span></label>
                <input
                  type="date"
                  className="input input-bordered"
                  value={filters.date_fin}
                  onChange={(e) => setFilters({ ...filters, date_fin: e.target.value })}
                />
              </div>

              <div className="flex items-end">
                <button onClick={applyFilters} className="btn btn-primary w-full gap-1">
                  <Search className="w-4 h-4" /> Appliquer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto bg-base-100 rounded-xl shadow-md">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="loading loading-spinner loading-lg text-primary"></div>
          </div>
        ) : error ? (
          <div className="alert alert-error shadow-lg m-4">
            <AlertCircle className="w-6 h-6" />
            <span>{error}</span>
          </div>
        ) : movements.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-base-content/20 mb-4" />
            <p className="text-base-content/60">Aucun mouvement de stock trouvé</p>
            <p className="text-sm text-base-content/40 mt-1">
              Essayez de modifier vos filtres ou vérifiez que des mouvements existent
            </p>
          </div>
        ) : (
          <>
            <table className="table table-zebra">
              <thead>
                <tr className="bg-base-200">
                  <th>Référence</th>
                  <th>Type</th>
                  <th>Produit</th>
                  <th>Quantité</th>
                  <th>Entrepôt source</th>
                  <th>Entrepôt dest.</th>
                  <th>Prix unitaire</th>
                  <th>Total</th>
                  <th>Date</th>
                  <th>Créé par</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => {
                  const typeInfo = getMovementTypeInfo(movement.movement_type);
                  const Icon = typeInfo.icon;
                  return (
                    <tr key={movement.id} className="hover">
                      <td className="font-mono text-sm font-medium">{movement.reference}</td>
                      <td>
                        <span className={`badge badge-${typeInfo.color} gap-1`}>
                          <Icon className="w-3 h-3" />
                          {typeInfo.label}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {movement.product_name || movement.product?.name || '-'}
                          </span>
                          {movement.product_reference && (
                            <span className="text-xs text-base-content/50">
                              {movement.product_reference}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="font-semibold">
                        {movement.movement_type === 'out' ? (
                          <span className="text-error">-{movement.quantity}</span>
                        ) : movement.movement_type === 'in' ? (
                          <span className="text-success">+{movement.quantity}</span>
                        ) : (
                          <span className="text-info">{movement.quantity}</span>
                        )}
                      </td>
                      <td>{movement.from_warehouse_name || '-'}</td>
                      <td>{movement.to_warehouse_name || '-'}</td>
                      <td>{formatNumber(movement.unit_price)} FCFA</td>
                      <td className="font-medium">{formatNumber(movement.total_price)} FCFA</td>
                      <td className="text-sm">{formatDate(movement.movement_date)}</td>
                      <td className="text-sm">{movement.created_by_email || '-'}</td>
                      <td className="text-center">
                        <Link
                          to={`/mouvements-stock/${movement.id}`}
                          className="btn btn-xs btn-ghost"
                          title="Voir détails"
                        >
                          <Eye className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex justify-between items-center p-4 border-t">
                <div className="text-sm text-base-content/60">
                  Total : {totalItems} mouvements
                </div>
                <div className="join">
                  <button
                    className="join-item btn btn-sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="join-item btn btn-sm">
                    Page {currentPage} / {totalPages}
                  </span>
                  <button
                    className="join-item btn btn-sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Légende */}
      <div className="mt-4 p-3 bg-base-200 rounded-lg text-xs text-base-content/60">
        <div className="flex flex-wrap gap-4">
          {movementTypes.map(type => (
            <span key={type.value} className={`flex items-center gap-1 text-${type.color}`}>
              <type.icon className="w-3 h-3" />
              {type.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MouvementsStock;