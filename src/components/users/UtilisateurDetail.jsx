// src/components/users/UtilisateurDetail.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Building2, 
  Shield, 
  Edit, 
  ArrowLeft,
  CheckCircle,
  XCircle,
  Briefcase,
  CreditCard,
  IdCard,
  Home,
  Globe,
  Clock,
  Users,
  Store,
  Crown,
  Award,
  Sparkles,
  FileText,
  AlertCircle,
  UserCheck,
  UserX,
  Truck,
  Package,
  ShoppingCart
} from 'lucide-react'

const UtilisateurDetail = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  
  const [utilisateur, setUtilisateur] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openRoleDialog, setOpenRoleDialog] = useState(false)
  const [roleToToggle, setRoleToToggle] = useState(null)
  const [statusLoading, setStatusLoading] = useState(false)

  // Configuration des rôles
  const roleConfig = {
    pdg: { label: 'PDG', icon: Crown, color: 'error', bgColor: 'bg-error/10', textColor: 'text-error', description: 'Accès total à toutes les agences' },
    drh: { label: 'DRH', icon: Shield, color: 'secondary', bgColor: 'bg-secondary/10', textColor: 'text-secondary', description: 'Gestion RH toutes agences' },
    chef_agence: { label: "Chef d'agence", icon: Store, color: 'primary', bgColor: 'bg-primary/10', textColor: 'text-primary', description: 'Gestion complète de l\'agence' },
    gestionnaire_stock: { label: 'Gestionnaire stock', icon: Package, color: 'info', bgColor: 'bg-info/10', textColor: 'text-info', description: 'Gestion des stocks et logistique' },
    commercial: { label: 'Commercial', icon: ShoppingCart, color: 'warning', bgColor: 'bg-warning/10', textColor: 'text-warning', description: 'Force de vente' },
    autre: { label: 'Utilisateur', icon: User, color: 'neutral', bgColor: 'bg-base-200', textColor: 'text-base-content/70', description: 'Compte standard' }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Non renseigné'
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    } catch {
      return 'Non renseigné'
    }
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Non renseigné'
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Non renseigné'
    }
  }

  const fetchUserData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await AxiosInstance.get(`/users/${id}/`)
      setUtilisateur(response.data)
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error)
      if (error.response?.status === 404) {
        setError('Utilisateur non trouvé')
      } else {
        setError('Erreur lors du chargement des données')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchUserData()
    }
  }, [id])

  const handleToggleRole = async () => {
    if (!roleToToggle) return
    setStatusLoading(true)
    try {
      await AxiosInstance.patch(`/users/${roleToToggle.id}/`, {
        is_active: !roleToToggle.is_active
      })
      fetchUserData()
      setOpenRoleDialog(false)
      setRoleToToggle(null)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setStatusLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-base-content/60">Chargement des informations...</p>
        </div>
      </div>
    )
  }

  if (error || !utilisateur) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold text-base-content mb-2">{error || 'Utilisateur non trouvé'}</h2>
          <p className="text-base-content/60 mb-4">L'utilisateur que vous recherchez n'existe pas ou a été supprimé.</p>
          <button onClick={() => navigate('/utilisateurs')} className="btn btn-primary gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour à la liste
          </button>
        </div>
      </div>
    )
  }

  const roleInfo = roleConfig[utilisateur.role_global] || roleConfig.autre
  const RoleIcon = roleInfo.icon
  const nomComplet = `${utilisateur.first_name || ''} ${utilisateur.last_name || ''}`.trim() || utilisateur.email?.split('@')[0] || 'Utilisateur'

  return (
    <div className="min-h-screen bg-base-200 py-6 px-4">
      <div className="w-full max-w-6xl mx-auto">
        
        {/* Bouton retour */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/utilisateurs')}
            className="btn btn-ghost btn-sm gap-2 text-base-content/70 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la liste
          </button>
        </div>

        {/* En-tête */}
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl shadow-lg mb-6 overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-white/10 flex items-center justify-center shadow-lg border-2 border-white/20">
                  <span className="text-4xl font-bold text-white">
                    {nomComplet.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full ${utilisateur.is_active ? 'bg-success' : 'bg-error'} border-2 border-white`}></div>
              </div>
              
              {/* Infos principales */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-white">{nomComplet}</h1>
                  <div className={`badge ${roleInfo.bgColor} ${roleInfo.textColor} gap-1`}>
                    <RoleIcon className="w-3 h-3" />
                    {roleInfo.label}
                  </div>
                  <div className={`badge ${utilisateur.is_active ? 'badge-success' : 'badge-error'} gap-1`}>
                    {utilisateur.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {utilisateur.is_active ? 'Actif' : 'Inactif'}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-white/80 text-sm">
                  <div className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {utilisateur.email}
                  </div>
                  {utilisateur.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {utilisateur.phone}
                    </div>
                  )}
                  {utilisateur.employee_id && (
                    <div className="flex items-center gap-1">
                      <IdCard className="w-4 h-4" />
                      Matricule: {utilisateur.employee_id}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <button 
                  onClick={() => navigate(`/utilisateurs/${id}/edit`)}
                  className="btn btn-accent gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Modifier
                </button>
                <button 
                  onClick={() => { setRoleToToggle(utilisateur); setOpenRoleDialog(true) }}
                  className={`btn gap-2 ${utilisateur.is_active ? 'btn-warning' : 'btn-success'} text-white`}
                >
                  {utilisateur.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  {utilisateur.is_active ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Grille des informations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Colonne gauche - Informations personnelles */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Carte informations personnelles */}
            <div className="card bg-base-100 shadow-xl border border-base-200">
              <div className="card-body">
                <h2 className="card-title text-base-content flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Informations personnelles
                </h2>
                <div className="divider my-2"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">Prénom</label>
                    <p className="text-base-content font-medium">{utilisateur.first_name || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">Nom</label>
                    <p className="text-base-content font-medium">{utilisateur.last_name || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">Date de naissance</label>
                    <p className="text-base-content">{utilisateur.birthday ? formatDate(utilisateur.birthday) : 'Non renseignée'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">Téléphone</label>
                    <p className="text-base-content">{utilisateur.phone || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">Email</label>
                    <p className="text-base-content">{utilisateur.email}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">Matricule</label>
                    <p className="text-base-content">{utilisateur.employee_id || 'Non renseigné'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Carte adresse */}
            <div className="card bg-base-100 shadow-xl border border-base-200">
              <div className="card-body">
                <h2 className="card-title text-base-content flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Adresse
                </h2>
                <div className="divider my-2"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">Adresse</label>
                    <p className="text-base-content">{utilisateur.address || 'Non renseignée'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">Ville</label>
                    <p className="text-base-content">{utilisateur.city || 'Non renseignée'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">Code postal</label>
                    <p className="text-base-content">{utilisateur.postal_code || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">Pays</label>
                    <p className="text-base-content">{utilisateur.country || 'Non renseigné'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Carte informations professionnelles */}
            <div className="card bg-base-100 shadow-xl border border-base-200">
              <div className="card-body">
                <h2 className="card-title text-base-content flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Informations professionnelles
                </h2>
                <div className="divider my-2"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">Date d'embauche</label>
                    <p className="text-base-content">{formatDate(utilisateur.hire_date)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">Type de contrat</label>
                    <p className="text-base-content">{utilisateur.contract_type || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">Département</label>
                    <p className="text-base-content">{utilisateur.department || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">Salaire</label>
                    <p className="text-base-content">
                      {utilisateur.salary ? `${new Intl.NumberFormat('fr-FR').format(utilisateur.salary)} €` : 'Non renseigné'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne droite - Rôles et métadonnées */}
          <div className="space-y-6">
            
            {/* Carte rôle global */}
            <div className="card bg-base-100 shadow-xl border border-base-200">
              <div className="card-body">
                <h2 className="card-title text-base-content flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Rôle global
                </h2>
                <div className="divider my-2"></div>
                <div className={`p-4 rounded-xl ${roleInfo.bgColor} border border-${roleInfo.color}/20`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-${roleInfo.color}/20`}>
                      <RoleIcon className={`h-6 w-6 ${roleInfo.textColor}`} />
                    </div>
                    <div>
                      <p className={`font-semibold ${roleInfo.textColor}`}>{roleInfo.label}</p>
                      <p className="text-xs text-base-content/50">{roleInfo.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Carte rôles par agence */}
            {utilisateur.roles_agence && utilisateur.roles_agence.length > 0 && (
              <div className="card bg-base-100 shadow-xl border border-base-200">
                <div className="card-body">
                  <h2 className="card-title text-base-content flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Rôles par agence
                  </h2>
                  <div className="divider my-2"></div>
                  <div className="space-y-3">
                    {utilisateur.roles_agence.map((role, idx) => {
                      const roleInfoAgence = roleConfig[role.role] || roleConfig.autre
                      const RoleAgenceIcon = roleInfoAgence.icon
                      return (
                        <div key={idx} className={`p-3 rounded-lg ${roleInfoAgence.bgColor} border border-${roleInfoAgence.color}/20`}>
                          <div className="flex items-start gap-3">
                            <div className={`p-1.5 rounded-lg bg-${roleInfoAgence.color}/20`}>
                              <RoleAgenceIcon className={`h-4 w-4 ${roleInfoAgence.textColor}`} />
                            </div>
                            <div className="flex-1">
                              <p className={`font-medium text-sm ${roleInfoAgence.textColor}`}>{role.role_display}</p>
                              <p className="text-xs text-base-content/60">{role.agence_nom}</p>
                              <p className="text-xs text-base-content/40 mt-1">Attribué le {formatDate(role.date_attribution)}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Carte métadonnées */}
            <div className="card bg-base-100 shadow-xl border border-base-200">
              <div className="card-body">
                <h2 className="card-title text-base-content flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Métadonnées
                </h2>
                <div className="divider my-2"></div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">Date de création</label>
                    <p className="text-sm text-base-content">{formatDateTime(utilisateur.created_at)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">Dernière modification</label>
                    <p className="text-sm text-base-content">{formatDateTime(utilisateur.updated_at)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">Dernière connexion</label>
                    <p className="text-sm text-base-content">{formatDateTime(utilisateur.last_login)}</p>
                  </div>
                  {utilisateur.created_by_email && (
                    <div>
                      <label className="text-xs font-semibold text-base-content/50 uppercase tracking-wide">Créé par</label>
                      <p className="text-sm text-base-content">{utilisateur.created_by_email}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Carte agence principale */}
            {utilisateur.agence_principale && (
              <div className="card bg-base-100 shadow-xl border border-base-200">
                <div className="card-body">
                  <h2 className="card-title text-base-content flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" />
                    Agence principale
                  </h2>
                  <div className="divider my-2"></div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Store className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-base-content">{utilisateur.agence_principale.nom}</p>
                      <p className="text-xs text-base-content/50">
                        {utilisateur.agence_principale.type_display}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal confirmation changement de statut */}
      {openRoleDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-base-100 rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className={`p-4 text-center ${roleToToggle?.is_active ? 'bg-warning' : 'bg-success'}`}>
              {roleToToggle?.is_active ? (
                <UserX className="h-12 w-12 text-white mx-auto mb-2" />
              ) : (
                <UserCheck className="h-12 w-12 text-white mx-auto mb-2" />
              )}
              <h3 className="text-xl font-bold text-white">
                {roleToToggle?.is_active ? 'Désactiver' : 'Activer'} l'utilisateur
              </h3>
            </div>
            <div className="p-6 text-center">
              <p className="text-base-content/70">
                Êtes-vous sûr de vouloir {roleToToggle?.is_active ? 'désactiver' : 'activer'} l'utilisateur 
                <strong className={roleToToggle?.is_active ? 'text-warning' : 'text-success'}>
                  " {nomComplet} "
                </strong>
                ?
              </p>
              <p className="text-sm text-base-content/50 mt-2">
                {roleToToggle?.is_active 
                  ? 'L\'utilisateur ne pourra plus se connecter.' 
                  : 'L\'utilisateur pourra à nouveau se connecter.'}
              </p>
            </div>
            <div className="flex gap-3 p-4 bg-base-200">
              <button onClick={() => setOpenRoleDialog(false)} className="btn btn-ghost flex-1">
                Annuler
              </button>
              <button 
                onClick={handleToggleRole} 
                disabled={statusLoading}
                className={`btn flex-1 text-white ${roleToToggle?.is_active ? 'btn-warning' : 'btn-success'}`}
              >
                {statusLoading ? <span className="loading loading-spinner loading-sm"></span> : (roleToToggle?.is_active ? 'Désactiver' : 'Activer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UtilisateurDetail