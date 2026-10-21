// src/components/comptabilite/JournalForm.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ArrowLeft, Save, X, AlertCircle, CheckCircle, Loader2,
  Hash, Tag, BookOpen, Building2, Info, FileText,
  Settings, Layers, Calendar, Shield, LayoutGrid,
} from 'lucide-react'

const EMPTY_FORM = {
  code: '',
  nom: '',
  type_journal: 'od',
  agence: '',
  is_active: true,
  is_default: false,
  description: '',
}

const typeOptions = [
  { value: 'achats', label: 'Achats', icon: FileText },
  { value: 'ventes', label: 'Ventes', icon: FileText },
  { value: 'banque', label: 'Banque', icon: Building2 },
  { value: 'caisse', label: 'Caisse', icon: Layers },
  { value: 'od', label: 'Opérations diverses', icon: Settings },
  { value: 'inventaire', label: 'Inventaire', icon: LayoutGrid },
  { value: 'paie', label: 'Paie', icon: Calendar },
  { value: 'immobilisations', label: 'Immobilisations', icon: Shield },
]

const unwrapList = (payload) =>
  Array.isArray(payload) ? payload : (payload?.results || [])

const JournalForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  const [formData, setFormData] = useState(EMPTY_FORM)
  const [agences, setAgences] = useState([])
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
        const [agencesRes, journalRes] = await Promise.allSettled([
          AxiosInstance.get('/agences/', { params: { page_size: 200 }, signal: controller.signal }),
          isEditing
            ? AxiosInstance.get(`/journaux/${id}/`, { signal: controller.signal })
            : Promise.resolve({ data: null }),
        ])

        if (controller.signal.aborted) return

        if (agencesRes.status === 'fulfilled') {
          setAgences(unwrapList(agencesRes.value.data))
        }

        if (isEditing && journalRes.status === 'fulfilled' && journalRes.value.data) {
          const d = journalRes.value.data
          setFormData({
            code: d.code || '',
            nom: d.nom || '',
            type_journal: d.type_journal || 'od',
            agence: d.agence || '',
            is_active: d.is_active !== undefined ? d.is_active : true,
            is_default: d.is_default || false,
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
    if (!formData.agence) errors.agence = "L'agence est requise"
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
      const payload = {
        ...formData,
        agence: Number(formData.agence),
      }

      if (isEditing) {
        await AxiosInstance.put(`/journaux/${id}/`, payload)
      } else {
        await AxiosInstance.post('/journaux/', payload)
      }

      setSuccess(true)
      redirectTimerRef.current = setTimeout(() => navigate('/journaux'), 900)
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
            Chargement du journal...
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
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <button onClick={() => navigate('/journaux')} className="btn btn-ghost btn-sm gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black">
              {isEditing ? 'Modifier le journal' : 'Nouveau journal'}
            </h1>
            <p className="text-xs sm:text-sm text-base-content/60 mt-1">
              {isEditing ? 'Modifiez les informations du journal' : 'Créez un nouveau journal comptable'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate('/journaux')} className="btn btn-ghost gap-2 btn-sm sm:btn-md" disabled={saving}>
            <X className="w-4 h-4" /> Annuler
          </button>
          <button type="submit" form="journal-form" className="btn btn-primary gap-2 btn-sm sm:btn-md" disabled={saving}>
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>
            ) : (
              <><Save className="w-4 h-4" /> {isEditing ? 'Mettre à jour' : 'Créer'}</>
            )}
          </button>
        </div>
      </div>

      {/* Succès */}
      {success && (
        <div className="alert alert-success shadow-lg">
          <CheckCircle className="w-5 h-5" />
          <div>
            <span className="font-bold">
              {isEditing ? 'Journal modifié' : 'Journal créé'} avec succès !
            </span>
            <p className="text-sm opacity-80">Redirection vers la liste...</p>
          </div>
        </div>
      )}

      {/* Erreur */}
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

      {/* Formulaire */}
      <form id="journal-form" onSubmit={handleSubmit} className="bg-base-100 rounded-xl shadow-lg border border-base-200 overflow-hidden">
        <div className="p-4 sm:p-6 space-y-6">
          {/* Code + Nom */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <Hash className="w-4 h-4 text-primary" />
                  Code du journal <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                name="code"
                placeholder="Ex: ACH, VEN, BAN, CAI, OD..."
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
                  Nom du journal <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                name="nom"
                placeholder="Ex: Journal des achats..."
                value={formData.nom}
                onChange={handleChange}
                className={`input input-bordered w-full ${fieldErrors.nom ? 'input-error' : ''}`}
                required
              />
              <FieldError name="nom" />
            </div>
          </div>

          {/* Type + Agence */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Type de journal <span className="text-error">*</span>
                </span>
              </label>
              <select
                name="type_journal"
                value={formData.type_journal}
                onChange={handleChange}
                className="select select-bordered w-full"
                required
              >
                {typeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Agence <span className="text-error">*</span>
                </span>
              </label>
              <select
                name="agence"
                value={formData.agence}
                onChange={handleChange}
                className={`select select-bordered w-full ${fieldErrors.agence ? 'select-error' : ''}`}
                required
              >
                <option value="">Sélectionner une agence</option>
                {agences.map(a => (
                  <option key={a.id} value={a.id}>{a.nom}{a.ville ? ` (${a.ville})` : ''}</option>
                ))}
              </select>
              <FieldError name="agence" />
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} className="checkbox checkbox-primary" />
                <span className="label-text font-medium">Journal actif</span>
              </label>
            </div>
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input type="checkbox" name="is_default" checked={formData.is_default} onChange={handleChange} className="checkbox checkbox-primary" />
                <span className="label-text font-medium">Journal par défaut</span>
              </label>
              <p className="text-xs text-base-content/40 mt-1">Un seul journal par défaut par agence</p>
            </div>
          </div>

          {/* Description */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" /> Description
              </span>
            </label>
            <textarea
              name="description"
              placeholder="Description détaillée du journal..."
              value={formData.description || ''}
              onChange={handleChange}
              className="textarea textarea-bordered w-full h-24 resize-none"
            />
          </div>
        </div>
      </form>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
      `}</style>
    </div>
  )
}

export default JournalForm