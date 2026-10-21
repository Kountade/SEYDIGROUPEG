// src/components/tresorerie/PrevisionsTresorerieForm.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ArrowLeft, Save, X, AlertCircle, CheckCircle, Loader2,
} from 'lucide-react'

const todayLocal = () => {
  const d = new Date()
  const off = d.getTimezoneOffset()
  const local = new Date(d.getTime() - off * 60 * 1000)
  return local.toISOString().split('T')[0]
}

const oneMonthLater = () => {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  const off = d.getTimezoneOffset()
  const local = new Date(d.getTime() - off * 60 * 1000)
  return local.toISOString().split('T')[0]
}

const EMPTY_FORM = {
  titre: '',
  agence: '',
  type_prevision: 'entree',
  periode: 'mensuel',
  montant_prevu: '',
  montant_reel: 0,
  date_debut: todayLocal(),
  date_fin: oneMonthLater(),
  source_type: '',
  source_id: '',
  categorie: '',
  sous_categorie: '',
  statut: 'brouillon',
  probabilite: 50,
  notes: '',
}

const unwrapList = (payload) => Array.isArray(payload) ? payload : (payload?.results || [])

const SOURCE_TYPE_CHOICES = [
  { value: '', label: '— Aucune —' },
  { value: 'vente', label: 'Vente' },
  { value: 'achat', label: 'Achat' },
  { value: 'facture_client', label: 'Facture client' },
  { value: 'facture_fournisseur', label: 'Facture fournisseur' },
  { value: 'reglement', label: 'Règlement' },
  { value: 'ecriture', label: 'Écriture comptable' },
  { value: 'salaire', label: 'Salaire' },
  { value: 'frais', label: 'Frais' },
  { value: 'autre', label: 'Autre' },
]

const PrevisionsTresorerieForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [formData, setFormData] = useState(EMPTY_FORM)
  const [agences, setAgences] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [globalError, setGlobalError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })
  const [originalStatus, setOriginalStatus] = useState(null)

  const abortRef = useRef(null)
  const redirectTimerRef = useRef(null)
  const notifTimerRef = useRef(null)

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type })
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current)
    notifTimerRef.current = setTimeout(
      () => setNotification({ show: false, message: '', type: 'success' }),
      4000
    )
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    abortRef.current = controller

    const loadData = async () => {
      setLoading(true); setGlobalError(null)
      try {
        const agencesRes = await AxiosInstance.get('/agences/', {
          params: { page_size: 200 }, signal: controller.signal,
        })
        setAgences(unwrapList(agencesRes.data))

        if (isEdit) {
          const res = await AxiosInstance.get(`/previsions/${id}/`, { signal: controller.signal })
          const d = res.data || {}
          setFormData({
            titre: d.titre || '',
            agence: d.agence || '',
            type_prevision: d.type_prevision || 'entree',
            periode: d.periode || 'mensuel',
            montant_prevu: d.montant_prevu ?? '',
            montant_reel: d.montant_reel ?? 0,
            date_debut: d.date_debut || todayLocal(),
            date_fin: d.date_fin || oneMonthLater(),
            source_type: d.source_type || '',
            source_id: d.source_id || '',
            categorie: d.categorie || '',
            sous_categorie: d.sous_categorie || '',
            statut: d.statut || 'brouillon',
            probabilite: d.probabilite ?? 50,
            notes: d.notes || '',
          })
          setOriginalStatus(d.statut || 'brouillon')
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
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current)
    }
  }, [id, isEdit, showNotification])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[name]; return n })
    }
  }

  const validate = () => {
    const errors = {}
    if (!formData.titre.trim()) errors.titre = 'Le titre est requis'
    if (!formData.agence) errors.agence = "L'agence est requise"
    const mp = parseFloat(formData.montant_prevu)
    if (!formData.montant_prevu || !Number.isFinite(mp) || mp <= 0) errors.montant_prevu = 'Le montant prévu doit être supérieur à 0'
    if (!formData.date_debut) errors.date_debut = 'La date de début est requise'
    if (!formData.date_fin) errors.date_fin = 'La date de fin est requise'
    if (formData.date_debut && formData.date_fin && formData.date_debut > formData.date_fin) {
      errors.date_fin = 'La date de fin doit être après la date de début'
    }
    const proba = parseInt(formData.probabilite, 10)
    if (!Number.isFinite(proba) || proba < 0 || proba > 100) errors.probabilite = 'La probabilité doit être entre 0 et 100'
    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGlobalError(null); setFieldErrors({})

    const clientErrors = validate()
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors)
      setGlobalError('Veuillez corriger les champs en rouge')
      return
    }

    if (isEdit && originalStatus === 'realise' && formData.statut !== 'realise') {
      const ok = window.confirm(
        "⚠️ Cette prévision est 'Réalisée'. La repasser à un autre statut peut fausser les écarts calculés. Continuer ?"
      )
      if (!ok) return
    }

    setSaving(true)
    try {
      const payload = {
        titre: formData.titre,
        agence: Number(formData.agence),
        type_prevision: formData.type_prevision,
        periode: formData.periode,
        montant_prevu: parseFloat(formData.montant_prevu),
        montant_reel: parseFloat(formData.montant_reel) || 0,
        date_debut: formData.date_debut,
        date_fin: formData.date_fin,
        source_type: formData.source_type || '',
        source_id: formData.source_id ? Number(formData.source_id) : null,
        categorie: formData.categorie || '',
        sous_categorie: formData.sous_categorie || '',
        statut: formData.statut,
        probabilite: parseInt(formData.probabilite, 10) || 50,
        notes: formData.notes || '',
      }

      if (isEdit) {
        await AxiosInstance.put(`/previsions/${id}/`, payload)
        showNotification('Prévision modifiée avec succès', 'success')
      } else {
        await AxiosInstance.post('/previsions/', payload)
        showNotification('Prévision créée avec succès', 'success')
      }

      redirectTimerRef.current = setTimeout(() => navigate('/previsions'), 900)
    } catch (err) {
      console.error('Erreur sauvegarde:', err)
      const data = err.response?.data
      if (data && typeof data === 'object' && !Array.isArray(data) && !data.detail && !data.error && !data.message) {
        const fe = {}
        Object.keys(data).forEach(k => {
          const v = data[k]
          fe[k] = Array.isArray(v) ? v[0] : String(v)
        })
        setFieldErrors(fe)
        setGlobalError('Certains champs sont invalides')
      } else {
        setGlobalError(data?.detail || data?.error || data?.message || 'Erreur lors de la sauvegarde')
      }
      showNotification('Erreur lors de la sauvegarde', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            {isEdit ? 'Chargement de la prévision...' : 'Préparation du formulaire...'}
          </p>
        </div>
      </div>
    )
  }

  const FieldError = ({ name }) => fieldErrors[name] ? (
    <span className="text-xs text-error mt-1">{fieldErrors[name]}</span>
  ) : null

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
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

      <div className="flex items-center gap-3 sm:gap-4">
        <button onClick={() => navigate('/previsions')} className="btn btn-ghost btn-sm gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-base-content">
            {isEdit ? '✏️ Modifier la prévision' : '📊 Nouvelle prévision'}
          </h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            {isEdit ? 'Modifiez les informations de la prévision' : 'Créez une nouvelle prévision de trésorerie'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4 sm:p-6">
        {globalError && (
          <div className="alert alert-error mb-4">
            <AlertCircle className="w-4 h-4" /><span>{globalError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control md:col-span-2">
            <label className="label"><span className="label-text font-medium">Titre <span className="text-error">*</span></span></label>
            <input type="text" name="titre" value={formData.titre} onChange={handleChange}
              placeholder="Ex: Encaissement prévu janvier"
              className={`input input-bordered w-full ${fieldErrors.titre ? 'input-error' : ''}`} />
            <FieldError name="titre" />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Agence <span className="text-error">*</span></span></label>
            <select name="agence" value={formData.agence} onChange={handleChange}
              className={`select select-bordered w-full ${fieldErrors.agence ? 'select-error' : ''}`}>
              <option value="">Sélectionner une agence</option>
              {agences.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
            </select>
            <FieldError name="agence" />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Type de prévision <span className="text-error">*</span></span></label>
            <select name="type_prevision" value={formData.type_prevision} onChange={handleChange} className="select select-bordered w-full">
              <option value="entree">Entrée prévue</option>
              <option value="sortie">Sortie prévue</option>
            </select>
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Période</span></label>
            <select name="periode" value={formData.periode} onChange={handleChange} className="select select-bordered w-full">
              <option value="journalier">Journalier</option>
              <option value="hebdomadaire">Hebdomadaire</option>
              <option value="mensuel">Mensuel</option>
              <option value="trimestriel">Trimestriel</option>
              <option value="annuel">Annuel</option>
            </select>
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Montant prévu <span className="text-error">*</span></span></label>
            <input type="number" name="montant_prevu" value={formData.montant_prevu} onChange={handleChange}
              placeholder="0" step="0.01" min="0"
              className={`input input-bordered w-full ${fieldErrors.montant_prevu ? 'input-error' : ''}`} />
            <FieldError name="montant_prevu" />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Montant réel</span></label>
            <input type="number" name="montant_reel" value={formData.montant_reel} onChange={handleChange}
              placeholder="0" step="0.01" min="0" className="input input-bordered w-full" />
            <span className="text-xs text-base-content/40 mt-1">
              À renseigner une fois la prévision réalisée.
            </span>
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Date début <span className="text-error">*</span></span></label>
            <input type="date" name="date_debut" value={formData.date_debut} onChange={handleChange}
              className={`input input-bordered w-full ${fieldErrors.date_debut ? 'input-error' : ''}`} />
            <FieldError name="date_debut" />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Date fin <span className="text-error">*</span></span></label>
            <input type="date" name="date_fin" value={formData.date_fin} onChange={handleChange}
              className={`input input-bordered w-full ${fieldErrors.date_fin ? 'input-error' : ''}`} />
            <FieldError name="date_fin" />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Catégorie</span></label>
            <input type="text" name="categorie" value={formData.categorie} onChange={handleChange}
              placeholder="Ex: Ventes, Achats, Frais..." className="input input-bordered w-full" />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Sous-catégorie</span></label>
            <input type="text" name="sous_categorie" value={formData.sous_categorie} onChange={handleChange}
              placeholder="Ex: Produit A, Fournisseur B..." className="input input-bordered w-full" />
          </div>

          {/* ✅ Source type = select enum */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Type de source</span></label>
            <select name="source_type" value={formData.source_type} onChange={handleChange} className="select select-bordered w-full">
              {SOURCE_TYPE_CHOICES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">ID source</span></label>
            <input type="number" name="source_id" value={formData.source_id} onChange={handleChange}
              placeholder="ID de la source" className="input input-bordered w-full" />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Statut</span></label>
            <select name="statut" value={formData.statut} onChange={handleChange} className="select select-bordered w-full">
              <option value="brouillon">Brouillon</option>
              <option value="en_cours">En cours</option>
              <option value="valide">Validée</option>
              <option value="realise">Réalisée</option>
            </select>
            {isEdit && originalStatus === 'realise' && formData.statut !== 'realise' && (
              <span className="text-xs text-warning mt-1">
                ⚠️ Repasser une prévision réalisée à un autre statut fausse les écarts
              </span>
            )}
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Probabilité (%)</span></label>
            <div className="flex items-center gap-3">
              <input type="range" name="probabilite" value={formData.probabilite} onChange={handleChange}
                className="range range-primary range-xs flex-1" min="0" max="100" />
              <span className="text-sm font-bold w-12 text-center">{formData.probabilite}%</span>
            </div>
            <FieldError name="probabilite" />
          </div>

          <div className="form-control md:col-span-2">
            <label className="label"><span className="label-text font-medium">Notes</span></label>
            <textarea name="notes" value={formData.notes} onChange={handleChange}
              placeholder="Notes supplémentaires..." className="textarea textarea-bordered w-full" rows="3" />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-base-200">
          <button type="submit" className="btn btn-primary gap-2" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Enregistrement...' : (isEdit ? 'Modifier' : 'Créer')}
          </button>
          <button type="button" onClick={() => navigate('/previsions')} className="btn btn-ghost gap-2">
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

export default PrevisionsTresorerieForm