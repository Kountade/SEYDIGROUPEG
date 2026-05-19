// src/components/sales/ClientForm.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Save, X, ArrowLeft, User, Building2, Phone, Mail, MapPin,
  Briefcase, CreditCard, Star, AlertCircle, CheckCircle, Loader2
} from 'lucide-react'

const ClientForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = !!id

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
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
  const [errors, setErrors] = useState({})

  const showMessage = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const fetchClient = async () => {
    setLoading(true)
    try {
      const response = await AxiosInstance.get(`/clients/${id}/`)
      const client = response.data
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
    } catch (error) {
      console.error('Erreur:', error)
      showMessage('Client non trouvé', 'error')
      setTimeout(() => navigate('/clients'), 1500)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isEditMode) {
      fetchClient()
    }
  }, [id])

  const validateForm = () => {
    const newErrors = {}
    if (!formData.nom.trim()) newErrors.nom = 'Le nom est requis'
    if (!formData.telephone.trim()) newErrors.telephone = 'Le téléphone est requis'
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) {
      showMessage('Veuillez corriger les erreurs', 'error')
      return
    }

    setSubmitting(true)
    try {
      if (isEditMode) {
        await AxiosInstance.put(`/clients/${id}/`, formData)
        showMessage('Client modifié avec succès')
      } else {
        await AxiosInstance.post('/clients/', formData)
        showMessage('Client ajouté avec succès')
      }
      setTimeout(() => navigate('/clients'), 1500)
    } catch (error) {
      console.error('Erreur:', error)
      showMessage(error.response?.data?.message || 'Erreur lors de l\'enregistrement', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-100">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-100 p-4 lg:p-8">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-20 right-6 z-50 animate-slideDown alert ${notification.type === 'error' ? 'alert-error' : 'alert-success'} shadow-lg max-w-md`}>
          {notification.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/clients')} className="btn btn-ghost btn-sm btn-circle">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-primary">
              {isEditMode ? 'Modifier le client' : 'Nouveau client'}
            </h1>
            <p className="text-sm text-base-content/60 mt-1">
              {isEditMode ? 'Modifiez les informations du client' : 'Ajoutez un nouveau client à la base'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button onClick={() => navigate('/clients')} className="btn btn-outline btn-sm gap-2">
            <X className="w-4 h-4" /> Annuler
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary btn-sm gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEditMode ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </div>

      {/* Formulaire */}
      <div className="card bg-base-200 shadow-xl max-w-4xl mx-auto">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40" />
                <input
                  type="text"
                  className={`input input-bordered w-full pl-10 ${errors.nom ? 'input-error' : ''}`}
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                />
              </div>
              {errors.nom && <span className="text-error text-xs mt-1">{errors.nom}</span>}
            </div>

            {/* Prénom */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Prénom</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
              />
            </div>

            {/* Téléphone */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Téléphone *</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40" />
                <input
                  type="tel"
                  className={`input input-bordered w-full pl-10 ${errors.telephone ? 'input-error' : ''}`}
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                />
              </div>
              {errors.telephone && <span className="text-error text-xs mt-1">{errors.telephone}</span>}
            </div>

            {/* Email */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40" />
                <input
                  type="email"
                  className={`input input-bordered w-full pl-10 ${errors.email ? 'input-error' : ''}`}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              {errors.email && <span className="text-error text-xs mt-1">{errors.email}</span>}
            </div>

            {/* Adresse */}
            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text font-medium">Adresse</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-base-content/40" />
                <textarea
                  className="textarea textarea-bordered w-full pl-10"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            {/* Champs entreprise */}
            {formData.client_type === 'entreprise' && (
              <>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Raison sociale</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40" />
                    <input
                      type="text"
                      className="input input-bordered w-full pl-10"
                      value={formData.raison_sociale}
                      onChange={(e) => setFormData({ ...formData, raison_sociale: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Numéro TVA</span>
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/40" />
                    <input
                      type="text"
                      className="input input-bordered w-full pl-10"
                      value={formData.numero_tva}
                      onChange={(e) => setFormData({ ...formData, numero_tva: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                className="checkbox checkbox-warning"
                checked={formData.est_revendeur}
                onChange={(e) => setFormData({ ...formData, est_revendeur: e.target.checked })}
              />
              <span className="label-text flex items-center gap-2">
                <Star className="w-4 h-4" /> Revendeur (bénéficie de prix spéciaux)
              </span>
            </label>

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

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/clients')}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary gap-2" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEditMode ? 'Mettre à jour' : 'Créer le client'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClientForm