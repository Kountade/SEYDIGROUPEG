// src/components/sales/ClientsList.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Plus, Edit, Trash2, Search, Users, Building2, User,
  Phone, Mail, MapPin, RefreshCw, X, CheckCircle, AlertCircle,
  Eye, Star, StarOff, Filter, Download, Printer
} from 'lucide-react'

const ClientsList = () => {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [notification, setNotification] = useState(null)
  const [formData, setFormData] = useState({
    client_type: 'particulier',
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    raison_sociale: '',
    numero_tva: '',
    est_revendeur: false,
    is_active: true
  })
  const [formErrors, setFormErrors] = useState({})

  const showMessage = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const fetchClients = async () => {
    setLoading(true)
    try {
      const response = await AxiosInstance.get('/clients/')
      setClients(response.data)
    } catch (error) {
      console.error('Erreur:', error)
      showMessage('Erreur de chargement des clients', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const validateForm = () => {
    const errors = {}
    if (!formData.nom.trim()) errors.nom = 'Le nom est requis'
    if (!formData.telephone.trim()) errors.telephone = 'Le téléphone est requis'
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email invalide'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      if (editingClient) {
        await AxiosInstance.put(`/clients/${editingClient.id}/`, formData)
        showMessage('Client modifié avec succès')
      } else {
        await AxiosInstance.post('/clients/', formData)
        showMessage('Client ajouté avec succès')
      }
      setShowModal(false)
      resetForm()
      fetchClients()
    } catch (error) {
      console.error('Erreur:', error)
      showMessage(error.response?.data?.message || 'Erreur lors de l\'enregistrement', 'error')
    }
  }

  const handleDelete = async (client) => {
    if (!window.confirm(`Supprimer ${client.nom} ${client.prenom || ''} ?`)) return
    try {
      await AxiosInstance.delete(`/clients/${client.id}/`)
      showMessage('Client supprimé avec succès')
      fetchClients()
    } catch (error) {
      showMessage('Erreur lors de la suppression', 'error')
    }
  }

  const handleEdit = (client) => {
    setEditingClient(client)
    setFormData({
      client_type: client.client_type,
      nom: client.nom,
      prenom: client.prenom || '',
      email: client.email || '',
      telephone: client.telephone,
      adresse: client.adresse || '',
      raison_sociale: client.raison_sociale || '',
      numero_tva: client.numero_tva || '',
      est_revendeur: client.est_revendeur,
      is_active: client.is_active
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setEditingClient(null)
    setFormData({
      client_type: 'particulier',
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      adresse: '',
      raison_sociale: '',
      numero_tva: '',
      est_revendeur: false,
      is_active: true
    })
    setFormErrors({})
  }

  const toggleActive = async (client) => {
    try {
      await AxiosInstance.patch(`/clients/${client.id}/`, { is_active: !client.is_active })
      showMessage(client.is_active ? 'Client désactivé' : 'Client activé')
      fetchClients()
    } catch (error) {
      showMessage('Erreur lors de la modification', 'error')
    }
  }

  const filteredClients = clients.filter(client => {
    const matchSearch = 
      client.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.telephone?.includes(searchTerm) ||
      client.raison_sociale?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchType = typeFilter === 'all' || client.client_type === typeFilter
    
    return matchSearch && matchType
  })

  const getClientTypeIcon = (type) => {
    switch(type) {
      case 'entreprise': return <Building2 className="w-4 h-4" />
      case 'revendeur': return <Star className="w-4 h-4" />
      default: return <User className="w-4 h-4" />
    }
  }

  const getClientTypeLabel = (type) => {
    switch(type) {
      case 'entreprise': return 'Entreprise'
      case 'revendeur': return 'Revendeur'
      default: return 'Particulier'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-100">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-base-content/60">Chargement des clients...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-100 p-4 lg:p-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-20 right-6 z-50 animate-slideDown alert ${notification.type === 'error' ? 'alert-error' : 'alert-success'} shadow-lg max-w-md`}>
          {notification.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          <span>{notification.msg}</span>
          <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setNotification(null)}>
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-primary">Clients</h1>
          <p className="text-sm text-base-content/60 mt-1">Gérez votre base de clients</p>
        </div>
        
        <div className="flex gap-2">
          <button onClick={fetchClients} className="btn btn-outline btn-sm gap-2">
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
          <button 
            onClick={() => { resetForm(); setShowModal(true) }} 
            className="btn btn-primary btn-sm gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouveau client
          </button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat bg-base-200 rounded-lg shadow-sm">
          <div className="stat-value text-primary">{clients.length}</div>
          <div className="stat-title">Total clients</div>
        </div>
        <div className="stat bg-base-200 rounded-lg shadow-sm">
          <div className="stat-value text-info">{clients.filter(c => c.client_type === 'particulier').length}</div>
          <div className="stat-title">Particuliers</div>
        </div>
        <div className="stat bg-base-200 rounded-lg shadow-sm">
          <div className="stat-value text-secondary">{clients.filter(c => c.client_type === 'entreprise').length}</div>
          <div className="stat-title">Entreprises</div>
        </div>
        <div className="stat bg-base-200 rounded-lg shadow-sm">
          <div className="stat-value text-warning">{clients.filter(c => c.est_revendeur).length}</div>
          <div className="stat-title">Revendeurs</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40" />
          <input
            type="text"
            placeholder="Rechercher un client..."
            className="input input-bordered w-full pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select
          className="select select-bordered w-full sm:w-48"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">Tous les types</option>
          <option value="particulier">Particuliers</option>
          <option value="entreprise">Entreprises</option>
          <option value="revendeur">Revendeurs</option>
        </select>
      </div>

      {/* Liste des clients */}
      {filteredClients.length === 0 ? (
        <div className="card bg-base-200 shadow-lg">
          <div className="card-body text-center py-12">
            <Users className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
            <p className="text-base-content/60">Aucun client trouvé</p>
            <button onClick={() => { resetForm(); setShowModal(true) }} className="btn btn-primary btn-sm mt-4">
              Ajouter un client
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredClients.map((client) => (
            <div key={client.id} className="card bg-base-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="card-body p-5">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-full ${
                      client.client_type === 'entreprise' ? 'bg-secondary/10' :
                      client.client_type === 'revendeur' ? 'bg-warning/10' : 'bg-primary/10'
                    }`}>
                      {getClientTypeIcon(client.client_type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {client.nom} {client.prenom || ''}
                      </h3>
                      {client.raison_sociale && (
                        <p className="text-xs text-base-content/60">{client.raison_sociale}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => navigate(`/clients/${client.id}`)} 
                      className="btn btn-ghost btn-xs btn-square"
                      title="Détails"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => handleEdit(client)} 
                      className="btn btn-ghost btn-xs btn-square"
                      title="Modifier"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => toggleActive(client)} 
                      className="btn btn-ghost btn-xs btn-square"
                      title={client.is_active ? 'Désactiver' : 'Activer'}
                    >
                      {client.is_active ? <Star className="w-3 h-3 text-success" /> : <StarOff className="w-3 h-3" />}
                    </button>
                    <button 
                      onClick={() => handleDelete(client)} 
                      className="btn btn-ghost btn-xs btn-square text-error"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-sm">
                  {client.telephone && (
                    <div className="flex items-center gap-2 text-base-content/70">
                      <Phone className="w-3 h-3" />
                      <span className="text-sm">{client.telephone}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-2 text-base-content/70">
                      <Mail className="w-3 h-3" />
                      <span className="text-sm truncate">{client.email}</span>
                    </div>
                  )}
                  {client.adresse && (
                    <div className="flex items-center gap-2 text-base-content/70">
                      <MapPin className="w-3 h-3" />
                      <span className="text-sm truncate">{client.adresse}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t flex justify-between items-center">
                  <span className="badge badge-sm">
                    {getClientTypeLabel(client.client_type)}
                  </span>
                  {client.est_revendeur && (
                    <span className="badge badge-warning badge-sm">Revendeur</span>
                  )}
                  {!client.is_active && (
                    <span className="badge badge-error badge-sm">Inactif</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Formulaire Client */}
      {showModal && (
        <ClientFormModal
          editingClient={editingClient}
          formData={formData}
          setFormData={setFormData}
          formErrors={formErrors}
          onSubmit={handleSubmit}
          onClose={() => { setShowModal(false); resetForm() }}
        />
      )}
    </div>
  )
}

// Composant Modal du formulaire
const ClientFormModal = ({ editingClient, formData, setFormData, formErrors, onSubmit, onClose }) => {
  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">
            {editingClient ? 'Modifier le client' : 'Nouveau client'}
          </h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Type de client */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Type de client *</span>
              </label>
              <select
                className="select select-bordered"
                value={formData.client_type}
                onChange={(e) => setFormData({ ...formData, client_type: e.target.value })}
              >
                <option value="particulier">Particulier</option>
                <option value="entreprise">Entreprise</option>
                <option value="revendeur">Revendeur</option>
              </select>
            </div>

            {/* Nom */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Nom *</span>
              </label>
              <input
                type="text"
                className={`input input-bordered ${formErrors.nom ? 'input-error' : ''}`}
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              />
              {formErrors.nom && <span className="text-error text-xs mt-1">{formErrors.nom}</span>}
            </div>

            {/* Prénom */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Prénom</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
              />
            </div>

            {/* Téléphone */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Téléphone *</span>
              </label>
              <input
                type="tel"
                className={`input input-bordered ${formErrors.telephone ? 'input-error' : ''}`}
                value={formData.telephone}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
              />
              {formErrors.telephone && <span className="text-error text-xs mt-1">{formErrors.telephone}</span>}
            </div>

            {/* Email */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <input
                type="email"
                className={`input input-bordered ${formErrors.email ? 'input-error' : ''}`}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              {formErrors.email && <span className="text-error text-xs mt-1">{formErrors.email}</span>}
            </div>

            {/* Adresse */}
            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text font-medium">Adresse</span>
              </label>
              <textarea
                className="textarea textarea-bordered"
                value={formData.adresse}
                onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                rows={2}
              />
            </div>

            {/* Champs spécifiques entreprise */}
            {formData.client_type === 'entreprise' && (
              <>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Raison sociale</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={formData.raison_sociale}
                    onChange={(e) => setFormData({ ...formData, raison_sociale: e.target.value })}
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Numéro TVA</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={formData.numero_tva}
                    onChange={(e) => setFormData({ ...formData, numero_tva: e.target.value })}
                  />
                </div>
              </>
            )}

            {/* Options */}
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={formData.est_revendeur}
                  onChange={(e) => setFormData({ ...formData, est_revendeur: e.target.checked })}
                />
                <span className="label-text">Revendeur (prix spéciaux)</span>
              </label>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-success"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <span className="label-text">Client actif</span>
              </label>
            </div>
          </div>

          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              {editingClient ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ClientsList