// src/pages/stocks/Stocks.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Search, Filter, RefreshCw, AlertCircle, 
  TrendingUp, TrendingDown, Eye, Box, Building2,
  DollarSign, ChevronLeft, ChevronRight, Download,
  Printer, X, CheckCircle, Clock, Truck
} from 'lucide-react';
import AxiosInstance from '../AxiosInstance';

const Stocks = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total_products: 0,
    total_value: 0,
    low_stock_count: 0,
    out_of_stock_count: 0
  });
  
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    stock_status: '',
    min_stock: '',
    max_stock: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [categories, setCategories] = useState([]);
  const itemsPerPage = 20;

  // Récupérer les produits
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage);
      params.append('page_size', itemsPerPage);
      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.stock_status) {
        if (filters.stock_status === 'low') params.append('is_low_stock', 'true');
        if (filters.stock_status === 'out') params.append('stock_quantity', '0');
      }
      if (filters.min_stock) params.append('min_stock', filters.min_stock);
      if (filters.max_stock) params.append('max_stock', filters.max_stock);
      
      const response = await AxiosInstance.get(`/produits/?${params.toString()}`);
      
      let data = [];
      if (response.data.results) {
        data = response.data.results;
        setTotalPages(Math.ceil(response.data.count / itemsPerPage));
        setTotalItems(response.data.count);
      } else if (Array.isArray(response.data)) {
        data = response.data;
        setTotalPages(1);
        setTotalItems(data.length);
      }
      
      setProducts(data);
      calculateStats(data);
      
    } catch (error) {
      console.error('Erreur:', error);
      setError('Impossible de charger les produits');
    } finally {
      setLoading(false);
    }
  };

  // Récupérer les catégories
  const fetchCategories = async () => {
    try {
      const response = await AxiosInstance.get('/categories/');
      setCategories(response.data);
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
    }
  };

  // Calculer les statistiques
  const calculateStats = (data) => {
    const newStats = {
      total_products: data.length,
      total_value: 0,
      low_stock_count: 0,
      out_of_stock_count: 0
    };
    
    data.forEach(product => {
      newStats.total_value += (product.stock_quantity || 0) * (product.purchase_price || 0);
      if (product.is_low_stock) newStats.low_stock_count++;
      if (product.stock_quantity === 0) newStats.out_of_stock_count++;
    });
    
    setStats(newStats);
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [currentPage, filters.search, filters.category, filters.stock_status]);

  const resetFilters = () => {
    setFilters({
      search: '',
      category: '',
      stock_status: '',
      min_stock: '',
      max_stock: ''
    });
    setCurrentPage(1);
  };

  const formatCurrency = (amount) => {
    if (!amount) return '0 FCFA';
    return Math.round(amount).toLocaleString() + ' FCFA';
  };

  const getStockStatus = (product) => {
    if (product.stock_quantity === 0) {
      return { label: 'Rupture', color: 'error', icon: AlertCircle };
    }
    if (product.is_low_stock) {
      return { label: 'Stock faible', color: 'warning', icon: Clock };
    }
    return { label: 'En stock', color: 'success', icon: CheckCircle };
  };

  const getStockBarColor = (stock, minStock) => {
    if (stock === 0) return 'bg-error';
    if (stock <= minStock) return 'bg-warning';
    return 'bg-success';
  };

  const getStockPercentage = (stock, minStock) => {
    if (stock === 0) return 0;
    const maxStock = minStock * 10;
    const percentage = (stock / maxStock) * 100;
    return Math.min(percentage, 100);
  };

  return (
    <div className="p-4 md:p-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-7 h-7 text-primary" />
            Gestion des stocks
          </h1>
          <p className="text-base-content/60 text-sm mt-1">
            Suivi des niveaux de stock et valeur d'inventaire
          </p>
        </div>
        
        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm gap-1">
            <Download className="w-4 h-4" />
            Exporter
          </button>
          <button className="btn btn-outline btn-sm gap-1">
            <Printer className="w-4 h-4" />
            Imprimer
          </button>
        </div>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card bg-primary/10 shadow-sm">
          <div className="card-body p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-primary text-sm font-medium">Total produits</p>
                <p className="text-2xl font-bold">{stats.total_products}</p>
              </div>
              <Package className="w-8 h-8 text-primary opacity-60" />
            </div>
          </div>
        </div>
        
        <div className="card bg-success/10 shadow-sm">
          <div className="card-body p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-success text-sm font-medium">Valeur du stock</p>
                <p className="text-xl font-bold">{formatCurrency(stats.total_value)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-success opacity-60" />
            </div>
          </div>
        </div>
        
        <div className="card bg-warning/10 shadow-sm">
          <div className="card-body p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-warning text-sm font-medium">Stock faible</p>
                <p className="text-2xl font-bold">{stats.low_stock_count}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-warning opacity-60" />
            </div>
          </div>
        </div>
        
        <div className="card bg-error/10 shadow-sm">
          <div className="card-body p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-error text-sm font-medium">En rupture</p>
                <p className="text-2xl font-bold">{stats.out_of_stock_count}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-error opacity-60" />
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
              <button onClick={() => setShowFilters(!showFilters)} className="btn btn-sm btn-ghost">
                {showFilters ? 'Masquer' : 'Afficher'}
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={fetchProducts} className="btn btn-sm btn-outline gap-1">
                <RefreshCw className="w-4 h-4" />
                Actualiser
              </button>
              {(filters.search || filters.category || filters.stock_status) && (
                <button onClick={resetFilters} className="btn btn-sm btn-ghost">
                  Réinitialiser
                </button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Recherche</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                  <input
                    type="text"
                    placeholder="Nom, référence..."
                    className="input input-bordered w-full pl-9"
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value, currentPage: 1})}
                  />
                </div>
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Catégorie</span>
                </label>
                <select
                  className="select select-bordered"
                  value={filters.category}
                  onChange={(e) => setFilters({...filters, category: e.target.value, currentPage: 1})}
                >
                  <option value="">Toutes</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Statut stock</span>
                </label>
                <select
                  className="select select-bordered"
                  value={filters.stock_status}
                  onChange={(e) => setFilters({...filters, stock_status: e.target.value, currentPage: 1})}
                >
                  <option value="">Tous</option>
                  <option value="ok">En stock</option>
                  <option value="low">Stock faible</option>
                  <option value="out">Rupture</option>
                </select>
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Valeur stock</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="input input-bordered w-1/2"
                    value={filters.min_stock}
                    onChange={(e) => setFilters({...filters, min_stock: e.target.value})}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    className="input input-bordered w-1/2"
                    value={filters.max_stock}
                    onChange={(e) => setFilters({...filters, max_stock: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tableau des produits */}
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
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-base-content/20 mb-4" />
            <p className="text-base-content/60">Aucun produit trouvé</p>
          </div>
        ) : (
          <>
            <table className="table table-zebra">
              <thead>
                <tr className="bg-base-200">
                  <th>Référence</th>
                  <th>Produit</th>
                  <th>Catégorie</th>
                  <th>Stock</th>
                  <th>Statut</th>
                  <th>PA</th>
                  <th>PV</th>
                  <th>Valeur stock</th>
                  <th className="text-center">Actions</th>
                 </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const stockStatus = getStockStatus(product);
                  const StockIcon = stockStatus.icon;
                  const stockValue = (product.stock_quantity || 0) * (product.purchase_price || 0);
                  const stockPercentage = getStockPercentage(product.stock_quantity, product.minimum_stock);
                  
                  return (
                    <tr key={product.id} className="hover">
                      <td className="font-mono text-sm">{product.reference}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          {product.main_image ? (
                            <img 
                              src={product.main_image} 
                              alt={product.name} 
                              className="w-8 h-8 rounded object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-base-200 flex items-center justify-center">
                              <Package className="w-4 h-4 text-base-content/40" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.barcode && (
                              <p className="text-xs text-base-content/50 font-mono">{product.barcode}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-ghost badge-sm">
                          {product.category_name || '-'}
                        </span>
                      </td>
                      <td>
                        <div className="w-32">
                          <div className="flex justify-between text-xs mb-1">
                            <span>{product.stock_quantity || 0}</span>
                            <span className="text-base-content/50">min: {product.minimum_stock || 0}</span>
                          </div>
                          <div className="w-full h-2 bg-base-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getStockBarColor(product.stock_quantity, product.minimum_stock)} transition-all`}
                              style={{ width: `${stockPercentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${stockStatus.color} gap-1`}>
                          <StockIcon className="w-3 h-3" />
                          {stockStatus.label}
                        </span>
                      </td>
                      <td className="text-sm">{formatCurrency(product.purchase_price)}</td>
                      <td className="text-sm font-semibold">{formatCurrency(product.sale_price)}</td>
                      <td className="font-medium">{formatCurrency(stockValue)}</td>
                      <td className="text-center">
                        <div className="flex justify-center gap-1">
                          <Link 
                            to={`/stocks/${product.id}`} 
                            className="btn btn-xs btn-ghost"
                            title="Détails"
                          >
                            <Eye className="w-3 h-3" />
                          </Link>
                          <Link 
                            to={`/mouvements-stock/by-product/${product.id}`} 
                            className="btn btn-xs btn-ghost"
                            title="Historique"
                          >
                            <TrendingUp className="w-3 h-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center p-4 border-t">
                <div className="text-sm text-base-content/60">
                  Total: {totalItems} produits
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
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-success"></div> Stock normal</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-warning"></div> Stock faible</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-error"></div> Rupture</span>
          <span className="flex items-center gap-1">PA: Prix d'achat</span>
          <span className="flex items-center gap-1">PV: Prix de vente</span>
        </div>
      </div>
    </div>
  );
};

export default Stocks;