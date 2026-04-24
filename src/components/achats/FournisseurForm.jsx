// src/components/fournisseurs/FournisseurForm.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Building2, Mail, Phone, MapPin, Globe, User, Briefcase,
  ArrowLeft, Save, AlertCircle, CheckCircle, X, Eye, EyeOff,
  CreditCard, DollarSign, Truck, Clock, Star, Award,
  FileText, Hash, Calendar, Users, PhoneCall, AtSign, Home,
  Info, Shield, TrendingUp, Package
} from 'lucide-react'

const FournisseurForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = !!id

  const [formData, setFormData] = useState({
    company_name: '',
    code: '',
    supplier_type: 'distributor',
    registration_number: '',
    tax_id: '',
    contact_name: '',
    contact_title: '',
    email: '',
    phone: '',
    mobile: '',
    fax: '',
    website: '',
    address: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Sénégal',
    bank_name: '',
    bank_account: '',
    bank_swift: '',
    bank_iban: '',
    payment_terms: '30_days',
    delivery_terms: 'exw',
    currency: 'XOF',
    lead_time_days: 7,
    minimum_order_amount: 0,
    discount_rate: 0,
    rating: null,
    is_preferred: false,
    is_active: true,
    notes: '',
    internal_notes: ''
  })

  const [showMessage, setShowMessage] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [messageType, setMessageType] = useState('error')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [activeTab, setActiveTab] = useState('general')

  // Types de fournisseurs
  const supplierTypes = [
    { value: 'manufacturer', label: 'Fabricant' },
    { value: 'distributor', label: 'Distributeur' },
    { value: 'wholesaler', label: 'Grossiste' },
    { value: 'importer', label: 'Importateur' },
    { value: 'service', label: 'Prestataire de services' }
  ]

  // Conditions de paiement
  const paymentTerms = [
    { value: 'immediate', label: 'Paiement immédiat' },
    { value: '15_days', label: '15 jours' },
    { value: '30_days', label: '30 jours' },
    { value: '45_days', label: '45 jours' },
    { value: '60_days', label: '60 jours' },
    { value: 'end_of_month', label: 'Fin de mois' }
  ]

  // Conditions de livraison
  const deliveryTerms = [
    { value: 'exw', label: 'EXW - Départ usine' },
    { value: 'fca', label: 'FCA - Franco transporteur' },
    { value: 'fob', label: 'FOB - Franco à bord' },
    { value: 'cif', label: 'CIF - Coût, assurance et fret' },
    { value: 'dap', label: 'DAP - Rendu au lieu de destination' }
  ]

  const fetchData = async () => {
    if (!isEditMode) return
    setIsLoading(true)
    try {
      const response = await AxiosInstance.get(`/suppliers/${id}/`)
      const supplier = response.data
      setFormData({
        company_name: supplier.company_name || '',
        code: supplier.code || '',
        supplier_type: supplier.supplier_type || 'distributor',
        registration_number: supplier.registration_number || '',
        tax_id: supplier.tax_id || '',
        contact_name: supplier.contact_name || '',
        contact_title: supplier.contact_title || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        mobile: supplier.mobile || '',
        fax: supplier.fax || '',
        website: supplier.website || '',
        address: supplier.address || '',
        address_line2: supplier.address_line2 || '',
        city: supplier.city || '',
        state: supplier.state || '',
        postal_code: supplier.postal_code || '',
        country: supplier.country || 'Sénégal',
        bank_name: supplier.bank_name || '',
        bank_account: supplier.bank_account || '',
        bank_swift: supplier.bank_swift || '',
        bank_iban: supplier.bank_iban || '',
        payment_terms: supplier.payment_terms || '30_days',
        delivery_terms: supplier.delivery_terms || 'exw',
        currency: supplier.currency || 'XOF',
        lead_time_days: supplier.lead_time_days || 7,
        minimum_order_amount: supplier.minimum_order_amount || 0,
        discount_rate: supplier.discount_rate || 0,
        rating: supplier.rating || null,
        is_preferred: supplier.is_preferred || false,
        is_active: supplier.is_active !== false,
        notes: supplier.notes || '',
        internal_notes: supplier.internal_notes || ''
      })
    } catch (error) {
      console.error('Erreur chargement:', error)
      setMessageText('Erreur lors du chargement des données')
      setMessageType('error')
      setShowMessage(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isEditMode) {
      fetchData()
    }
  }, [id])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.company_name) {
      newErrors.company_name = 'La raison sociale est requise'
    }
    
    if (!formData.email) {
      newErrors.email = 'L\'email est requis'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email invalide'
    }
    
    if (!formData.phone) {
      newErrors.phone = 'Le téléphone est requis'
    }
    
    if (!formData.address) {
      newErrors.address = 'L\'adresse est requise'
    }
    
    if (!formData.city) {
      newErrors.city = 'La ville est requise'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    
    setIsLoading(true)
    setShowMessage(false)

    const submitData = { ...formData }
    
    // Nettoyer les champs vides
    Object.keys(submitData).forEach(key => {
      if (submitData[key] === '' || submitData[key] === null || submitData[key] === undefined) {
        delete submitData[key]
      }
    })

    try {
      if (isEditMode) {
        await AxiosInstance.patch(`/suppliers/${id}/`, submitData)
        setMessageText('✅ Fournisseur modifié avec succès !')
      } else {
        await AxiosInstance.post('/suppliers/', submitData)
        setMessageText('✅ Fournisseur créé avec succès !')
      }
      
      setMessageType('success')
      setShowMessage(true)
      
      setTimeout(() => {
        navigate('/fournisseurs')
      }, 2000)
    } catch (error) {
      console.error('Erreur:', error)
      let errorMessage = isEditMode ? 'Échec de la modification' : 'Échec de la création'
      
      if (error.response?.data?.company_name) {
        errorMessage = `Raison sociale: ${error.response.data.company_name[0]}`
      } else if (error.response?.data?.email) {
        errorMessage = `Email: ${error.response.data.email[0]}`
      } else if (error.response?.data?.code) {
        errorMessage = `Code: ${error.response.data.code[0]}`
      } else if (error.response?.data?.non_field_errors) {
        errorMessage = error.response.data.non_field_errors[0]
      }
      
      setMessageText(errorMessage)
      setMessageType('error')
      setShowMessage(true)
    } finally {
      setIsLoading(false)
    }
  }

  const tabs = [
    { id: 'general', label: 'Général', icon: Building2 },
    { id: 'contact', label: 'Contact', icon: User },
    { id: 'address', label: 'Adresse', icon: MapPin },
    { id: 'banking', label: 'Bancaire', icon: CreditCard },
    { id: 'commercial', label: 'Commercial', icon: DollarSign },
    { id: 'notes', label: 'Notes', icon: FileText }
  ]

  return (
    <div className="min-h-screen bg-base-200 py-4 sm:py-6 px-3 sm:px-4">
      <div className="w-full max-w-5xl mx-auto">
        
        {/* Bouton retour */}
        <div className="mb-4">
          <Link
            to="/fournisseurs"
            className="btn btn-ghost btn-sm gap-2 text-base-content/70 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la liste
          </Link>
        </div>

        {/* Message de notification */}
        {showMessage && (
          <div className="fixed top-16 right-3 sm:right-6 z-50 animate-slide-in">
            <div className={`alert shadow-xl ${messageType === 'success' ? 'alert-success' : 'alert-error'}`}>
              <div className="flex items-center gap-2">
                {messageType === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{messageText}</span>
              </div>
              <button onClick={() => setShowMessage(false)} className="btn btn-sm btn-ghost">✕</button>
            </div>
          </div>
        )}

        <div className="card bg-base-100 shadow-xl border border-primary/20">
          <div className="card-body p-4 sm:p-6">
            
            {/* En-tête */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 mb-3">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-base-content">
                {isEditMode ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
              </h2>
              <p className="text-base-content/60 text-sm mt-1">
                {isEditMode ? 'Modifiez les informations du fournisseur' : 'Remplissez les informations du fournisseur'}
              </p>
            </div>

            {/* Tabs */}
            <div className="tabs tabs-boxed bg-base-200 p-1 mb-6 overflow-x-auto">
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    className={`tab gap-2 ${activeTab === tab.id ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                )
              })}
            </div>

            <form onSubmit={handleSubmit}>
              {/* Tab Général */}
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          Raison sociale <span className="text-error">*</span>
                        </span>
                      </label>
                      <input
                        type="text"
                        name="company_name"
                        value={formData.company_name}
                        onChange={handleChange}
                        className={`input input-bordered w-full ${errors.company_name ? 'input-error' : ''}`}
                        placeholder="Nom de l'entreprise"
                        disabled={isLoading}
                      />
                      {errors.company_name && <span className="text-error text-xs mt-1">{errors.company_name}</span>}
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium flex items-center gap-2">
                          <Hash className="h-4 w-4 text-primary" />
                          Code fournisseur
                        </span>
                      </label>
                      <input
                        type="text"
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        className="input input-bordered w-full"
                        placeholder="Auto-généré si vide"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium">Type de fournisseur</span>
                      </label>
                      <select
                        name="supplier_type"
                        value={formData.supplier_type}
                        onChange={handleChange}
                        className="select select-bordered w-full"
                        disabled={isLoading}
                      >
                        {supplierTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium flex items-center gap-2">
                          <Star className="h-4 w-4 text-primary" />
                          Note (1-5)
                        </span>
                      </label>
                      <select
                        name="rating"
                        value={formData.rating || ''}
                        onChange={handleChange}
                        className="select select-bordered w-full"
                        disabled={isLoading}
                      >
                        <option value="">Non évalué</option>
                        <option value="1">⭐ 1 - Très mauvais</option>
                        <option value="2">⭐⭐ 2 - Médiocre</option>
                        <option value="3">⭐⭐⭐ 3 - Correct</option>
                        <option value="4">⭐⭐⭐⭐ 4 - Bien</option>
                        <option value="5">⭐⭐⭐⭐⭐ 5 - Excellent</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="is_preferred"
                        checked={formData.is_preferred}
                        onChange={handleChange}
                        className="checkbox checkbox-primary"
                        disabled={isLoading}
                      />
                      <span className="text-sm">Fournisseur préféré</span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleChange}
                        className="checkbox checkbox-success"
                        disabled={isLoading}
                      />
                      <span className="text-sm">Actif</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium">N° RC / RCCM</span>
                      </label>
                      <input
                        type="text"
                        name="registration_number"
                        value={formData.registration_number}
                        onChange={handleChange}
                        className="input input-bordered w-full"
                        placeholder="Numéro d'enregistrement"
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium">N° TVA / IFU</span>
                      </label>
                      <input
                        type="text"
                        name="tax_id"
                        value={formData.tax_id}
                        onChange={handleChange}
                        className="input input-bordered w-full"
                        placeholder="Numéro de TVA"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Contact */}
              {activeTab === 'contact' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          Personne de contact
                        </span>
                      </label>
                      <input
                        type="text"
                        name="contact_name"
                        value={formData.contact_name}
                        onChange={handleChange}
                        className="input input-bordered w-full"
                        placeholder="Nom du contact principal"
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium">Fonction</span>
                      </label>
                      <input
                        type="text"
                        name="contact_title"
                        value={formData.contact_title}
                        onChange={handleChange}
                        className="input input-bordered w-full"
                        placeholder="Directeur commercial"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium flex items-center gap-2">
                          <Mail className="h-4 w-4 text-primary" />
                          Email <span className="text-error">*</span>
                        </span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`input input-bordered w-full ${errors.email ? 'input-error' : ''}`}
                        placeholder="contact@entreprise.com"
                        disabled={isLoading}
                      />
                      {errors.email && <span className="text-error text-xs mt-1">{errors.email}</span>}
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium flex items-center gap-2">
                          <Phone className="h-4 w-4 text-primary" />
                          Téléphone <span className="text-error">*</span>
                        </span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className={`input input-bordered w-full ${errors.phone ? 'input-error' : ''}`}
                        placeholder="+221 33 123 45 67"
                        disabled={isLoading}
                      />
                      {errors.phone && <span className="text-error text-xs mt-1">{errors.phone}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium flex items-center gap-2">
                          <PhoneCall className="h-4 w-4 text-primary" />
                          Mobile
                        </span>
                      </label>
                      <input
                        type="tel"
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleChange}
                        className="input input-bordered w-full"
                        placeholder="+221 77 123 45 67"
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium flex items-center gap-2">
                          <Globe className="h-4 w-4 text-primary" />
                          Site web
                        </span>
                      </label>
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleChange}
                        className="input input-bordered w-full"
                        placeholder="https://www.entreprise.com"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium">Fax</span>
                    </label>
                    <input
                      type="tel"
                      name="fax"
                      value={formData.fax}
                      onChange={handleChange}
                      className="input input-bordered w-full"
                      placeholder="+221 33 123 45 67"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}

              {/* Tab Adresse */}
              {activeTab === 'address' && (
                <div className="space-y-4">
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        Adresse <span className="text-error">*</span>
                      </span>
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      rows="2"
                      className={`textarea textarea-bordered w-full ${errors.address ? 'textarea-error' : ''}`}
                      placeholder="Numéro et nom de rue"
                      disabled={isLoading}
                    />
                    {errors.address && <span className="text-error text-xs mt-1">{errors.address}</span>}
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium">Complément d'adresse</span>
                    </label>
                    <input
                      type="text"
                      name="address_line2"
                      value={formData.address_line2}
                      onChange={handleChange}
                      className="input input-bordered w-full"
                      placeholder="Bâtiment, étage, appartment"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium">Ville <span className="text-error">*</span></span>
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className={`input input-bordered w-full ${errors.city ? 'input-error' : ''}`}
                        placeholder="Dakar"
                        disabled={isLoading}
                      />
                      {errors.city && <span className="text-error text-xs mt-1">{errors.city}</span>}
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium">État / Région</span>
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        className="input input-bordered w-full"
                        placeholder="Région de Dakar"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium">Code postal</span>
                      </label>
                      <input
                        type="text"
                        name="postal_code"
                        value={formData.postal_code}
                        onChange={handleChange}
                        className="input input-bordered w-full"
                        placeholder="10000"
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium">Pays</span>
                      </label>
                      <input
                        type="text"
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        className="input input-bordered w-full"
                        placeholder="Sénégal"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Bancaire */}
              {activeTab === 'banking' && (
                <div className="space-y-4">
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        Banque
                      </span>
                    </label>
                    <input
                      type="text"
                      name="bank_name"
                      value={formData.bank_name}
                      onChange={handleChange}
                      className="input input-bordered w-full"
                      placeholder="Nom de la banque"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium">N° de compte</span>
                      </label>
                      <input
                        type="text"
                        name="bank_account"
                        value={formData.bank_account}
                        onChange={handleChange}
                        className="input input-bordered w-full"
                        placeholder="Numéro de compte"
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium">Code SWIFT/BIC</span>
                      </label>
                      <input
                        type="text"
                        name="bank_swift"
                        value={formData.bank_swift}
                        onChange={handleChange}
                        className="input input-bordered w-full"
                        placeholder="SWIFT/BIC"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium">IBAN</span>
                    </label>
                    <input
                      type="text"
                      name="bank_iban"
                      value={formData.bank_iban}
                      onChange={handleChange}
                      className="input input-bordered w-full"
                      placeholder="IBAN"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}

              {/* Tab Commercial */}
              {activeTab === 'commercial' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          Délai de livraison (jours)
                        </span>
                      </label>
                      <input
                        type="number"
                        name="lead_time_days"
                        value={formData.lead_time_days}
                        onChange={handleChange}
                        className="input input-bordered w-full"
                        min="0"
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-primary" />
                          Devise
                        </span>
                      </label>
                      <select
                        name="currency"
                        value={formData.currency}
                        onChange={handleChange}
                        className="select select-bordered w-full"
                        disabled={isLoading}
                      >
                        <option value="XOF">FCFA (XOF)</option>
                        <option value="EUR">Euro (EUR)</option>
                        <option value="USD">Dollar US (USD)</option>
                        <option value="GBP">Livre Sterling (GBP)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-primary" />
                          Conditions de paiement
                        </span>
                      </label>
                      <select
                        name="payment_terms"
                        value={formData.payment_terms}
                        onChange={handleChange}
                        className="select select-bordered w-full"
                        disabled={isLoading}
                      >
                        {paymentTerms.map(term => (
                          <option key={term.value} value={term.value}>{term.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium flex items-center gap-2">
                          <Truck className="h-4 w-4 text-primary" />
                          Conditions de livraison
                        </span>
                      </label>
                      <select
                        name="delivery_terms"
                        value={formData.delivery_terms}
                        onChange={handleChange}
                        className="select select-bordered w-full"
                        disabled={isLoading}
                      >
                        {deliveryTerms.map(term => (
                          <option key={term.value} value={term.value}>{term.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          Montant minimum de commande
                        </span>
                      </label>
                      <input
                        type="number"
                        name="minimum_order_amount"
                        value={formData.minimum_order_amount}
                        onChange={handleChange}
                        className="input input-bordered w-full"
                        min="0"
                        step="1000"
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          Remise (%)
                        </span>
                      </label>
                      <input
                        type="number"
                        name="discount_rate"
                        value={formData.discount_rate}
                        onChange={handleChange}
                        className="input input-bordered w-full"
                        min="0"
                        max="100"
                        step="0.5"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Notes */}
              {activeTab === 'notes' && (
                <div className="space-y-4">
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium flex items-center gap-2">
                        <Info className="h-4 w-4 text-primary" />
                        Notes publiques
                      </span>
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows="4"
                      className="textarea textarea-bordered w-full"
                      placeholder="Informations générales sur le fournisseur..."
                      disabled={isLoading}
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        Notes internes
                      </span>
                    </label>
                    <textarea
                      name="internal_notes"
                      value={formData.internal_notes}
                      onChange={handleChange}
                      rows="4"
                      className="textarea textarea-bordered w-full"
                      placeholder="Notes confidentielles (visible uniquement par les administrateurs)..."
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}

              {/* Boutons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-4 border-t border-base-200">
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary flex-1"
                >
                  {isLoading ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      {isEditMode ? 'Modification en cours...' : 'Création en cours...'}
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      {isEditMode ? 'Modifier le fournisseur' : 'Créer le fournisseur'}
                    </>
                  )}
                </button>
                <Link 
                  to="/fournisseurs" 
                  className="btn btn-outline"
                >
                  Annuler
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default FournisseurForm