// src/components/Utilisateurs.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit, 
  Trash2, 
  Mail, 
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  MoreVertical,
  AlertTriangle,
  Filter
} from 'lucide-react';
import AxiosInstance from './AxiosInstance';

const Utilisateurs = () => {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [filteredUtilisateurs, setFilteredUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('tous');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showMenu, setShowMenu] = useState(null);

  // Récupérer l'utilisateur connecté
  useEffect(() => {
    const userData = localStorage.getItem('User');
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData));
      } catch (error) {
        console.error('Erreur parsing utilisateur:', error);
      }
    }
    fetchUtilisateurs();
  }, []);

  // Fermer le menu au clic extérieur
  useEffect(() => {
    const handleClickOutside = () => setShowMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchUtilisateurs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await AxiosInstance.get('/users/');
      setUtilisateurs(response.data);
      setFilteredUtilisateurs(response.data);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      if (error.response?.status === 403) {
        setError('Vous n\'avez pas les droits pour voir cette liste');
      } else {
        setError('Impossible de charger la liste des utilisateurs');
      }
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les utilisateurs
  useEffect(() => {
    let filtered = [...utilisateurs];
    
    if (searchTerm.trim()) {
      filtered = filtered.filter(user => 
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (roleFilter !== 'tous') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }
    
    setFilteredUtilisateurs(filtered);
  }, [searchTerm, roleFilter, utilisateurs]);

  const handleDelete = async () => {
    if (!userToDelete) return;
    
    try {
      await AxiosInstance.delete(`/users/${userToDelete.id}/`);
      setUtilisateurs(prev => prev.filter(u => u.id !== userToDelete.id));
      setShowDeleteModal(false);
      setUserToDelete(null);
      setShowMenu(null);
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Impossible de supprimer cet utilisateur');
    }
  };

  const openDeleteModal = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
    setShowMenu(null);
  };

  const isGerant = () => currentUser?.role === 'gerant';

  const roleConfig = {
    gerant: { 
      label: 'Gérant', 
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: Shield 
    },
    pharmacien: { 
      label: 'Pharmacien', 
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: CheckCircle 
    },
    preparateur: { 
      label: 'Préparateur', 
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: Users 
    }
  };

  // Statistiques
  const stats = {
    total: utilisateurs.length,
    gerants: utilisateurs.filter(u => u.role === 'gerant').length,
    pharmaciens: utilisateurs.filter(u => u.role === 'pharmacien').length,
    preparateurs: utilisateurs.filter(u => u.role === 'preparateur').length
  };

  // Formater la date au format YYYY-MM-DD
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return date.toISOString().split('T')[0];
    } catch {
      return '-';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="loading loading-spinner loading-lg text-emerald-600"></div>
          <p className="text-gray-500">Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-2 py-4 w-full">
        <div className="alert alert-error shadow-lg">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-4 w-full">
      {/* En-tête */}
      <div className="mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="h-6 w-6 md:h-7 md:w-7 text-emerald-600" />
              Liste des utilisateurs
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Gérez les comptes et les accès de votre pharmacie
            </p>
          </div>
          {isGerant() && (
            <Link
              to="/utilisateurs/nouveau"
              className="btn bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-0 hover:from-emerald-700 hover:to-teal-800 shadow-md btn-sm md:btn-md"
            >
              <UserPlus className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden sm:inline">Nouvel utilisateur</span>
              <span className="sm:hidden">Nouveau</span>
            </Link>
          )}
        </div>
      </div>

      {/* Statistiques - 4 colonnes */}
      <div className="grid grid-cols-4 gap-2 md:gap-3 mb-5">
        <div className="bg-white rounded-lg md:rounded-xl p-3 md:p-4 shadow-sm border border-gray-100">
          <p className="text-xs md:text-sm text-gray-500">Total</p>
          <p className="text-lg md:text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-purple-50 rounded-lg md:rounded-xl p-3 md:p-4 shadow-sm border border-purple-100">
          <p className="text-xs md:text-sm text-purple-600">Gérants</p>
          <p className="text-lg md:text-2xl font-bold text-purple-800">{stats.gerants}</p>
        </div>
        <div className="bg-emerald-50 rounded-lg md:rounded-xl p-3 md:p-4 shadow-sm border border-emerald-100">
          <p className="text-xs md:text-sm text-emerald-600">Pharmaciens</p>
          <p className="text-lg md:text-2xl font-bold text-emerald-800">{stats.pharmaciens}</p>
        </div>
        <div className="bg-blue-50 rounded-lg md:rounded-xl p-3 md:p-4 shadow-sm border border-blue-100">
          <p className="text-xs md:text-sm text-blue-600">Préparateurs</p>
          <p className="text-lg md:text-2xl font-bold text-blue-800">{stats.preparateurs}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg md:rounded-xl p-3 md:p-4 shadow-sm border border-gray-100 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par email ou nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input input-bordered w-full pl-10 bg-gray-50 focus:bg-white input-sm md:input-md"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400 hidden sm:block" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="select select-bordered bg-gray-50 focus:bg-white select-sm md:select-md w-full sm:w-auto"
            >
              <option value="tous">Tous les rôles</option>
              <option value="gerant">Gérants</option>
              <option value="pharmacien">Pharmaciens</option>
              <option value="preparateur">Préparateurs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des utilisateurs - Grille responsive */}
      {filteredUtilisateurs.length === 0 ? (
        <div className="bg-white rounded-xl p-8 md:p-12 text-center shadow-sm border border-gray-100">
          <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">Aucun utilisateur trouvé</p>
          {isGerant() && (
            <Link
              to="/utilisateurs/nouveau"
              className="btn btn-outline border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <UserPlus className="h-4 w-4" />
              Créer un utilisateur
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {filteredUtilisateurs.map((user) => {
            const RoleIcon = roleConfig[user.role]?.icon || Users;
            const roleStyle = roleConfig[user.role] || roleConfig.preparateur;
            const isCurrentUser = user.id === currentUser?.id;
            
            return (
              <div key={user.id} className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="p-3 md:p-4">
                  {/* En-tête carte */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-emerald-700 font-bold text-base md:text-lg flex-shrink-0">
                        {user.username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800 text-sm md:text-base truncate">
                          {user.username || user.email?.split('@')[0]}
                          {isCurrentUser && (
                            <span className="ml-1.5 text-xs text-gray-400 font-normal">(Vous)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </p>
                      </div>
                    </div>
                    
                    {/* Menu actions */}
                    {isGerant() && !isCurrentUser ? (
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(showMenu === user.id ? null : user.id);
                          }}
                          className="btn btn-ghost btn-xs md:btn-sm btn-circle"
                        >
                          <MoreVertical className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </button>
                        
                        {showMenu === user.id && (
                          <div className="absolute right-0 top-6 md:top-8 z-10 bg-white rounded-lg shadow-lg border border-gray-100 py-1 min-w-28 md:min-w-32">
                            <Link
                              to={`/utilisateurs/modifier/${user.id}`}
                              className="w-full px-3 md:px-4 py-1.5 md:py-2 text-left text-xs md:text-sm hover:bg-gray-50 flex items-center gap-1.5 md:gap-2"
                            >
                              <Edit className="h-3 w-3 md:h-3.5 md:w-3.5" />
                              Modifier
                            </Link>
                            <button
                              onClick={() => openDeleteModal(user)}
                              className="w-full px-3 md:px-4 py-1.5 md:py-2 text-left text-xs md:text-sm text-red-600 hover:bg-red-50 flex items-center gap-1.5 md:gap-2"
                            >
                              <Trash2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
                              Supprimer
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div></div>
                    )}
                  </div>

                  {/* Détails */}
                  <div className="space-y-1.5 md:space-y-2">
                    {/* Rôle */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Rôle</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 md:py-1 rounded-full text-xs font-medium border ${roleStyle.color}`}>
                        <RoleIcon className="h-2.5 w-2.5 md:h-3 md:w-3" />
                        {roleStyle.label}
                      </span>
                    </div>

                    {/* Date de naissance - Format YYYY-MM-DD */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Né(e) le</span>
                      <span className="text-xs md:text-sm text-gray-700 flex items-center gap-1">
                        <Calendar className="h-3 w-3 md:h-3.5 md:w-3.5 text-gray-400" />
                        {formatDate(user.birthday)}
                      </span>
                    </div>

                    {/* Statut */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Statut</span>
                      {user.is_active !== false ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                          <CheckCircle className="h-3 w-3 md:h-3.5 md:w-3.5" />
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <XCircle className="h-3 w-3 md:h-3.5 md:w-3.5" />
                          Inactif
                        </span>
                      )}
                    </div>

                    {/* Date de création - Format YYYY-MM-DD */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Créé le</span>
                      <span className="text-xs md:text-sm text-gray-700">
                        {formatDate(user.date_joined)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmation suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 md:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Confirmer la suppression</h3>
            </div>
            
            <p className="text-gray-600 mb-6 text-sm md:text-base">
              Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{userToDelete?.email}</strong> ?
              <br />
              <span className="text-xs md:text-sm text-red-500">Cette action est irréversible.</span>
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                className="btn btn-outline btn-sm md:btn-md"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="btn bg-red-600 text-white hover:bg-red-700 border-0 btn-sm md:btn-md"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Utilisateurs;