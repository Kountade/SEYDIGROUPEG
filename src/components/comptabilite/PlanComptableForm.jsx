// src/components/comptabilite/PlanComptableForm.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ArrowLeft, Save, X, AlertCircle, CheckCircle, Loader2,
  Hash, Tag, FolderOpen, Shield, TrendingUp, TrendingDown,
  PiggyBank, Info, Building2,
} from 'lucide-react'

const EMPTY_FORM = {
  code: '',
  nom: '',
  type_compte: 'actif',
  parent: '',
  niveau: 1,
  classe: '',
  sous_classe: '',
  solde_normal: 'debiteur',
  is_active: true,
  is_analytique: false,
  description: '',
}

const typeOptions = [
  { value: 'actif', label: 'Actif', icon: FolderOpen, color: 'text-blue-500' },
  { value: 'passif', label: 'Passif', icon: Shield, color: 'text-orange-500' },
  { value: 'capitaux', label: 'Capitaux propres', icon: PiggyBank, color: 'text-purple-500' },
  { value: 'charges', label: 'Charges', icon: TrendingDown, color: 'text-red-500' },
  { value: 'produits', label: 'Produits', icon: TrendingUp, color: 'text-green-500' },
]

const soldeOptions = [
  { value: 'debiteur', label: 'Débiteur' },
  { value: 'crediteur', label: 'Créditeur' },
]

const niveauOptions = [
  { value: 1, label: 'Classe' },
  { value: 2, label: 'Compte' },
  { value: 3, label: 'Sous-compte' },
  { value: 4, label: 'Sous-sous-compte' },
]

const typeLabels = {
  actif: 'Actif',
  passif: 'Passif',
  capitaux: 'Capitaux propres',
  charges: 'Charges',
  produits: 'Produits',
}

const unwrapList = (payload) =>
  Array.isArray(payload) ? payload : (payload?.results || [])

const PlanComptableForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  const [formData, setFormData] = useState(EMPTY_FORM)
  const [comptesParents, setComptesParents] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [success, setSuccess] = useState(false)

  const abortRef = useRef(null)
  const redirectTimerRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    abortRef.current = controller

    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [parentsRes, compteRes] = await Promise.allSettled([
          AxiosInstance.get('/plan-comptable/', {
            params: { is_active: true, page_size: 500 },
            signal: controller.signal,
          }),
          isEditing
            ? AxiosInstance.get(`/plan-comptable/${id}/`, { signal: controller.signal })
            : Promise.resolve({ data: null }),
        ])

        if (controller.signal.aborted) return

        if (parentsRes.status === 'fulfilled') {
          const data = unwrapList(parentsRes.value.data)
          const parents = data.filter(c => c.niveau < 4 && c.id !== parseInt(id))
          setComptesParents(parents)
        }

        if (isEditing && compteRes.status === 'fulfilled' && compteRes.value.data) {
          const d = compteRes.value.data
          setFormData({
            code: d.code || '',
            nom: d.nom || '',
            type_compte: d.type_compte || 'actif',
            parent: d.parent || '',
            niveau: d.niveau || 1,
            classe: d.classe || '',
            sous_classe: d.sous_classe || '',
            solde_normal: d.solde_normal || 'debiteur',
            is_active: d.is_active !== undefined ? d.is_active : true,
            is_analytique: d.is_analytique || false,
            description: d.description || '',
          })
        }
      } catch (err) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
        console.error('Erreur chargement:', err)
        setError('Erreur de chargement des données')
      } finally {
        if (abortRef.current === controller) setLoading(false)
      }
    }

    loadData()
    return () => {
      controller.abort()
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current)
    }
  }, [id, isEditing])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (fieldErrors[name]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[name]; return n })
    }
  }

  const validate = () => {
    const errors = {}
    if (!formData.code?.trim()) errors.code = 'Le code est requis'
    if (!formData.nom?.trim()) errors.nom = 'Le nom est requis'
    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setSuccess(false)

    const clientErrors = validate()
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors)
      setError('Veuillez corriger les champs en rouge')
      return
    }

    setSaving(true)
    try {
      const payload = { ...formData }
      if (payload.parent === '' || payload.parent === 'null') payload.parent = null
      if (payload.parent) payload.parent = Number(payload.parent)
      payload.niveau = Number(payload.niveau)

      if (isEditing) {
        await AxiosInstance.put(`/plan-comptable/${id}/`, payload)
      } else {
        await AxiosInstance.post('/plan-comptable/', payload)
      }

      setSuccess(true)
      redirectTimerRef.current = setTimeout(() => navigate('/plan-comptable'), 900)
    } catch (err) {
      console.error('Erreur sauvegarde:', err)
      const data = err.response?.data
      if (data && typeof data === 'object') {
        if (data.detail || data.error || data.message) {
          setError(data.detail || data.error || data.message)
        } else {
          const fe = {}
          Object.keys(data).forEach(k => {
            const v = data[k]
            fe[k] = Array.isArray(v) ? v[0] : String(v)
          })
          setFieldErrors(fe)
          setError('Certains champs sont invalides')
        }
      } else {
        setError('Erreur lors de la sauvegarde')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-base-200">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement du compte...
          </p>
        </div>
      </div>
    )
  }

  const FieldError = ({ name }) => fieldErrors[name] ? (
    <span className="text-xs text-error mt-1">{fieldErrors[name]}</span>
  ) : null

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 bg-base-200 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <button onClick={() => navigate('/plan-comptable')} className="btn btn-ghost btn-sm gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black">
              {isEditing ? 'Modifier le compte' : 'Nouveau compte'}
            </h1>
            <p className="text-xs sm:text-sm text-base-content/60 mt-1">
              {isEditing ? 'Modifiez les informations du compte' : 'Créez un nouveau compte comptable'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate('/plan-comptable')} className="btn btn-ghost gap-2 btn-sm sm:btn-md" disabled={saving}>
            <X className="w-4 h-4" /> Annuler
          </button>
          <button type="submit" form="compte-form" className="btn btn-primary gap-2 btn-sm sm:btn-md" disabled={saving}>
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>
            ) : (
              <><Save className="w-4 h-4" /> {isEditing ? 'Mettre à jour' : 'Créer'}</>
            )}
          </button>
        </div>
      </div>

      {success && (
        <div className="alert alert-success shadow-lg">
          <CheckCircle className="w-5 h-5" />
          <div>
            <span className="font-bold">
              {isEditing ? 'Compte modifié' : 'Compte créé'} avec succès !
            </span>
            <p className="text-sm opacity-80">Redirection...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-error shadow-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Erreur</span>
            <p className="text-sm mt-1">{error}</p>
          </div>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form id="compte-form" onSubmit={handleSubmit} className="bg-base-100 rounded-xl shadow-lg border border-base-200 overflow-hidden">
        <div className="p-4 sm:p-6 space-y-6">
          {/* Code + Nom */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <Hash className="w-4 h-4 text-primary" />
                  Code du compte <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                name="code"
                placeholder="Ex: 411, 701, 601..."
                value={formData.code}
                onChange={handleChange}
                className={`input input-bordered w-full font-mono ${fieldErrors.code ? 'input-error' : ''}`}
                required
                disabled={isEditing}
              />
              <FieldError name="code" />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  Nom du compte <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                name="nom"
                placeholder="Ex: Clients, Ventes, Achats..."
                value={formData.nom}
                onChange={handleChange}
                className={`input input-bordered w-full ${fieldErrors.nom ? 'input-error' : ''}`}
                required
              />
              <FieldError name="nom" />
            </div>
          </div>

          {/* Type + Niveau */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-primary" />
                  Type de compte <span className="text-error">*</span>
                </span>
              </label>
              <select name="type_compte" value={formData.type_compte} onChange={handleChange} className="select select-bordered w-full" required>
                {typeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  Niveau
                </span>
              </label>
              <select name="niveau" value={formData.niveau} onChange={handleChange} className="select select-bordered w-full">
                {niveauOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Parent + Solde */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Compte parent
                </span>
              </label>
              <select name="parent" value={formData.parent || ''} onChange={handleChange} className="select select-bordered w-full">
                <option value="">Aucun (compte racine)</option>
                {comptesParents.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.nom} ({typeLabels[c.type_compte] || c.type_compte})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  Solde normal
                </span>
              </label>
              <select name="solde_normal" value={formData.solde_normal} onChange={handleChange} className="select select-bordered w-full">
                {soldeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} className="checkbox checkbox-primary" />
                <span className="label-text font-medium">Compte actif</span>
              </label>
            </div>
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input type="checkbox" name="is_analytique" checked={formData.is_analytique} onChange={handleChange} className="checkbox checkbox-primary" />
                <span className="label-text font-medium">Compte analytique</span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Description
              </span>
            </label>
            <textarea
              name="description"
              placeholder="Description détaillée du compte..."
              value={formData.description || ''}
              onChange={handleChange}
              className="textarea textarea-bordered w-full h-24 resize-none"
            />
          </div>
        </div>
      </form>
    </div>
  )
}

export default PlanComptableForm