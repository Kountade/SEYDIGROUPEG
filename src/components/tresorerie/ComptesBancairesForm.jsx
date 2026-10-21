// src/components/tresorerie/ComptesBancairesForm.jsx
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ArrowLeft, Save, X, AlertCircle, CheckCircle, Loader2
} from 'lucide-react'

const todayISO = () => {
  const d = new Date()
  const off = d.getTimezoneOffset()
  const local = new Date(d.getTime() - off * 60 * 1000)
  return local.toISOString().split('T')[0]
}

const EMPTY_FORM = {
  banque: '',
  code: '',
  nom: '',
  type_compte: 'courant',
  agence: '',
  numero_compte: '',
  iban: '',
  bic: '',
  devise: 'XOF',
  solde_initial: 0,
  is_active: true,
  is_default: false,
  date_ouverture: todayISO(),
  description: '',
}

const ComptesBancairesForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [formData, setFormData] = useState(EMPTY_FORM)
  const [agences, setAgences] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [globalError, setGlobalError] = useState(null)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })

  const abortRef = useRef(null)
  const redirectTimerRef = useRef(null)

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000)
  }

  // ---------- Chargement initial ----------
  useEffect(() => {
    const controller = new AbortController()
    abortRef.current = controller

    const loadData = async () => {
      setLoading(true)
      setGlobalError(null)
      try {
        // ✅ Agences : gérer paginé OU non
        const agencesRes = await AxiosInstance.get('/agences/', {
          params: { page_size: 200 },
          signal: controller.signal,
        })
        const agencesPayload = agencesRes.data
        const agencesList = Array.isArray(agencesPayload)
          ? agencesPayload
          : (agencesPayload?.results || [])
        setAgences(agencesList)

        if (isEdit) {
          const compteRes = await AxiosInstance.get(`/comptes-bancaires/${id}/`, {
            signal: controller.signal,
          })
          const d = compteRes.data || {}
          setFormData({
            banque: d.banque || '',
            code: d.code || '',
            nom: d.nom || '',
            type_compte: d.type_compte || 'courant',
            agence: d.agence || '',
            numero_compte: d.numero_compte || '',
            iban: d.iban || '',
            bic: d.bic || '',
            devise: d.devise || 'XOF',
            solde_initial: d.solde_initial ?? 0,
            is_active: d.is_active !== undefined ? d.is_active : true,
            is_default: d.is_default || false,
            date_ouverture: d.date_ouverture || todayISO(),
            description: d.description || '',
          })
        }
      } catch (err) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
        console.error('Erreur chargement:', err)
        setGlobalError('Erreur de chargement des données')
        showNotification('Erreur de chargement des données', 'error')
      } finally {
        setLoading(false)
      }
    }
    loadData()

    return () => {
      controller.abort()
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current)
    }
  }, [id, isEdit])

  // ---------- Handlers ----------
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    // Nettoie l'erreur du champ modifié
    if (fieldErrors[name]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[name]; return n })
    }
  }

  // ---------- Validation client ----------
  const validate = () => {
    const errors = {}
    if (!formData.banque.trim()) errors.banque = 'La banque est requise'
    if (!formData.code.trim()) errors.code = 'Le code est requis'
    if (!formData.nom.trim()) errors.nom = 'Le nom est requis'
    if (!formData.agence) errors.agence = "L'agence est requise"
    if (!formData.numero_compte.trim()) errors.numero_compte = 'Le numéro de compte est requis'
    return errors
  }

  // ---------- Submit ----------
  const handleSubmit = async (e) => {
    e.preventDefault()
    setGlobalError(null)
    setFieldErrors({})

    const clientErrors = validate()
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors)
      setGlobalError('Veuillez corriger les champs en rouge')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...formData,
        agence: formData.agence ? Number(formData.agence) : null,
        solde_initial: parseFloat(formData.solde_initial) || 0,
      }

      if (isEdit) {
        await AxiosInstance.put(`/comptes-bancaires/${id}/`, payload)
        showNotification('Compte bancaire modifié avec succès', 'success')
      } else {
        await AxiosInstance.post('/comptes-bancaires/', payload)
        showNotification('Compte bancaire créé avec succès', 'success')
      }

      redirectTimerRef.current = setTimeout(() => navigate('/comptes-bancaires'), 900)
    } catch (err) {
      console.error('Erreur sauvegarde:', err)
      const data = err.response?.data

      // ✅ Gestion erreurs DRF par champ
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const fe = {}
        Object.keys(data).forEach(k => {
          const v = data[k]
          fe[k] = Array.isArray(v) ? v[0] : String(v)
        })
        setFieldErrors(fe)
        setGlobalError('Certains champs sont invalides')
      } else {
        setGlobalError(data?.detail || data?.message || 'Erreur lors de la sauvegarde')
      }
      showNotification('Erreur lors de la sauvegarde', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ---------- Loading ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            {isEdit ? 'Chargement du compte...' : 'Préparation du formulaire...'}
          </p>
        </div>
      </div>
    )
  }

  // ---------- Champ réutilisable ----------
  const FieldError = ({ name }) => fieldErrors[name] ? (
    <span className="text-xs text-error mt-1">{fieldErrors[name]}</span>
  ) : null

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-16 right-3 sm:right-6 z-50 animate-slideDown">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg text-sm sm:text-base`}>
            {notification.type === 'success'
              ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              : <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
            <span className="font-semibold">{notification.message}</span>
            <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setNotification({ ...notification, show: false })}>
              <X className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button onClick={() => navigate('/comptes-bancaires')} className="btn btn-ghost btn-sm gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-base-content">
            {isEdit ? '✏️ Modifier le compte bancaire' : '🏦 Nouveau compte bancaire'}
          </h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            {isEdit ? 'Modifiez les informations du compte bancaire' : 'Créez un nouveau compte bancaire'}
          </p>
        </div>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4 sm:p-6">
        {globalError && (
          <div className="alert alert-error mb-4">
            <AlertCircle className="w-4 h-4" />
            <span>{globalError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Banque */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Banque <span className="text-error">*</span></span></label>
            <input
              type="text" name="banque" value={formData.banque} onChange={handleChange}
              placeholder="Ex: ECOBANK"
              className={`input input-bordered w-full ${fieldErrors.banque ? 'input-error' : ''}`}
            />
            <FieldError name="banque" />
          </div>

          {/* Code */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Code <span className="text-error">*</span></span></label>
            <input
              type="text" name="code" value={formData.code} onChange={handleChange}
              placeholder="Ex: CMP-001"
              className={`input input-bordered w-full ${fieldErrors.code ? 'input-error' : ''}`}
            />
            <FieldError name="code" />
          </div>

          {/* Nom */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Nom du compte <span className="text-error">*</span></span></label>
            <input
              type="text" name="nom" value={formData.nom} onChange={handleChange}
              placeholder="Ex: Compte Courant Principal"
              className={`input input-bordered w-full ${fieldErrors.nom ? 'input-error' : ''}`}
            />
            <FieldError name="nom" />
          </div>

          {/* Type */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Type de compte</span></label>
            <select name="type_compte" value={formData.type_compte} onChange={handleChange} className="select select-bordered w-full">
              <option value="courant">Compte courant</option>
              <option value="epargne">Compte épargne</option>
              <option value="bloque">Compte bloqué</option>
            </select>
          </div>

          {/* Agence */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Agence <span className="text-error">*</span></span></label>
            <select
              name="agence" value={formData.agence} onChange={handleChange}
              className={`select select-bordered w-full ${fieldErrors.agence ? 'select-error' : ''}`}
            >
              <option value="">Sélectionner une agence</option>
              {agences.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
            </select>
            <FieldError name="agence" />
          </div>

          {/* Numéro */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Numéro de compte <span className="text-error">*</span></span></label>
            <input
              type="text" name="numero_compte" value={formData.numero_compte} onChange={handleChange}
              placeholder="Ex: 123456789012"
              className={`input input-bordered w-full ${fieldErrors.numero_compte ? 'input-error' : ''}`}
            />
            <FieldError name="numero_compte" />
          </div>

          {/* IBAN */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">IBAN</span></label>
            <input type="text" name="iban" value={formData.iban} onChange={handleChange}
              placeholder="Ex: SN12345678901234567890" className="input input-bordered w-full" />
          </div>

          {/* BIC */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">BIC/SWIFT</span></label>
            <input type="text" name="bic" value={formData.bic} onChange={handleChange}
              placeholder="Ex: ECOCSN" className="input input-bordered w-full" />
          </div>

          {/* Devise */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Devise</span></label>
            <select name="devise" value={formData.devise} onChange={handleChange} className="select select-bordered w-full">
              <option value="XOF">FCFA (XOF)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="USD">Dollar (USD)</option>
            </select>
          </div>

          {/* Solde initial */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Solde initial</span></label>
            <input
              type="number" name="solde_initial" value={formData.solde_initial} onChange={handleChange}
              placeholder="0" step="0.01"
              className={`input input-bordered w-full ${fieldErrors.solde_initial ? 'input-error' : ''}`}
            />
            <FieldError name="solde_initial" />
          </div>

          {/* Date ouverture */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Date d'ouverture</span></label>
            <input type="date" name="date_ouverture" value={formData.date_ouverture} onChange={handleChange}
              className="input input-bordered w-full" />
          </div>

          {/* Options */}
          <div className="form-control col-span-1 md:col-span-2">
            <div className="flex flex-wrap gap-4 mt-2">
              <label className="label cursor-pointer gap-2">
                <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange}
                  className="checkbox checkbox-primary" />
                <span className="label-text">Compte actif</span>
              </label>
              <label className="label cursor-pointer gap-2">
                <input type="checkbox" name="is_default" checked={formData.is_default} onChange={handleChange}
                  className="checkbox checkbox-primary" />
                <span className="label-text">Compte par défaut</span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div className="form-control col-span-1 md:col-span-2">
            <label className="label"><span className="label-text font-medium">Description</span></label>
            <textarea
              name="description" value={formData.description} onChange={handleChange}
              placeholder="Description du compte bancaire..."
              className="textarea textarea-bordered w-full" rows="3"
            />
          </div>
        </div>

        {/* Boutons */}
        <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-base-200">
          <button type="submit" className="btn btn-primary gap-2" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Enregistrement...' : (isEdit ? 'Modifier' : 'Créer')}
          </button>
          <button type="button" onClick={() => navigate('/comptes-bancaires')} className="btn btn-ghost gap-2">
            <X className="w-4 h-4" /> Annuler
          </button>
        </div>
      </form>

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
      `}</style>
    </div>
  )
}

export default ComptesBancairesForm