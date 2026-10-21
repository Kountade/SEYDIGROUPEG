// src/components/tresorerie/FraisTresorerieForm.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ArrowLeft, Save, X, AlertCircle, CheckCircle, Loader2,
  FileText, Truck, Utensils, Briefcase, Phone, Home, Wrench,
  Coffee, Plane, GraduationCap, Landmark, ShoppingBag, Shield,
} from 'lucide-react'

const todayLocal = () => {
  const d = new Date()
  const off = d.getTimezoneOffset()
  const local = new Date(d.getTime() - off * 60 * 1000)
  return local.toISOString().split('T')[0]
}

const EMPTY_FORM = {
  titre: '',
  agence: '',
  categorie: 'autre',
  montant: '',
  date_frais: todayLocal(),
  date_paiement: '',
  beneficiaire: '',
  piece_justificative: '',
  mode_paiement: 'especes',
  status: 'brouillon',
  notes: '',
}

const unwrapList = (payload) => Array.isArray(payload) ? payload : (payload?.results || [])

const FraisTresorerieForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [formData, setFormData] = useState(EMPTY_FORM)
  const [agences, setAgences] = useState([])
  const [caisses, setCaisses] = useState([])
  const [comptesBancaires, setComptesBancaires] = useState([])

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
        const [agencesRes, caissesRes, comptesRes] = await Promise.all([
          AxiosInstance.get('/agences/', { params: { page_size: 200 }, signal: controller.signal }),
          AxiosInstance.get('/caisses/', { params: { page_size: 200 }, signal: controller.signal }),
          AxiosInstance.get('/comptes-bancaires/', { params: { page_size: 200 }, signal: controller.signal }),
        ])
        setAgences(unwrapList(agencesRes.data))
        setCaisses(unwrapList(caissesRes.data))
        setComptesBancaires(unwrapList(comptesRes.data))

        if (isEdit) {
          const fraisRes = await AxiosInstance.get(`/frais/${id}/`, { signal: controller.signal })
          const d = fraisRes.data || {}
          setFormData({
            titre: d.titre || '',
            agence: d.agence || '',
            categorie: d.categorie || 'autre',
            montant: d.montant ?? '',
            date_frais: d.date_frais || todayLocal(),
            date_paiement: d.date_paiement || '',
            beneficiaire: d.beneficiaire || '',
            piece_justificative: d.piece_justificative || '',
            mode_paiement: d.mode_paiement || 'especes',
            status: d.status || 'brouillon',
            notes: d.notes || '',
          })
          setOriginalStatus(d.status || 'brouillon')
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

  const caissesFiltrees = useMemo(() => {
    if (!formData.agence) return caisses
    return caisses.filter(c => String(c.agence) === String(formData.agence))
  }, [caisses, formData.agence])

  const comptesFiltres = useMemo(() => {
    if (!formData.agence) return comptesBancaires
    return comptesBancaires.filter(c => String(c.agence) === String(formData.agence))
  }, [comptesBancaires, formData.agence])

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
    const m = parseFloat(formData.montant)
    if (!formData.montant || !Number.isFinite(m) || m <= 0) errors.montant = 'Le montant doit être supérieur à 0'
    if (!formData.beneficiaire.trim()) errors.beneficiaire = 'Le bénéficiaire est requis'
    if (!formData.date_frais) errors.date_frais = 'La date est requise'
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

    // ✅ Avertissement métier : passer à 'paye' crée un mouvement auto
    if (formData.status === 'paye' && originalStatus !== 'paye') {
      const ok = window.confirm(
        "⚠️ En passant ce frais à 'Payé', un mouvement de décaissement sera automatiquement créé et les soldes de la caisse/compte seront impactés. Continuer ?"
      )
      if (!ok) return
    }

    setSaving(true)
    try {
      const payload = {
        titre: formData.titre,
        agence: Number(formData.agence),
        categorie: formData.categorie,
        montant: parseFloat(formData.montant),
        date_frais: formData.date_frais,
        date_paiement: formData.date_paiement || null,
        beneficiaire: formData.beneficiaire,
        piece_justificative: formData.piece_justificative || '',
        mode_paiement: formData.mode_paiement,
        status: formData.status,
        notes: formData.notes || '',
      }

      if (isEdit) {
        await AxiosInstance.put(`/frais/${id}/`, payload)
        showNotification('Frais modifié avec succès', 'success')
      } else {
        await AxiosInstance.post('/frais/', payload)
        showNotification('Frais créé avec succès', 'success')
      }

      redirectTimerRef.current = setTimeout(() => navigate('/frais'), 900)
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
            {isEdit ? 'Chargement du frais...' : 'Préparation du formulaire...'}
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
        <button onClick={() => navigate('/frais')} className="btn btn-ghost btn-sm gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-base-content">
            {isEdit ? '✏️ Modifier le frais' : '📄 Nouveau frais'}
          </h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            {isEdit ? 'Modifiez les informations du frais' : 'Créez un nouveau frais'}
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
              placeholder="Ex: Achat fournitures bureau"
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
            <label className="label"><span className="label-text font-medium">Catégorie <span className="text-error">*</span></span></label>
            <select name="categorie" value={formData.categorie} onChange={handleChange} className="select select-bordered w-full">
              <option value="transport">Transport</option>
              <option value="restauration">Restauration</option>
              <option value="fournitures">Fournitures de bureau</option>
              <option value="communication">Communication</option>
              <option value="entretien">Entretien</option>
              <option value="formation">Formation</option>
              <option value="mission">Mission</option>
              <option value="representations">Représentation</option>
              <option value="assurances">Assurances</option>
              <option value="impots">Impôts et taxes</option>
              <option value="loyer">Loyer</option>
              <option value="services">Services</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Montant <span className="text-error">*</span></span></label>
            <input type="number" name="montant" value={formData.montant} onChange={handleChange}
              placeholder="0" step="0.01" min="0"
              className={`input input-bordered w-full ${fieldErrors.montant ? 'input-error' : ''}`} />
            <FieldError name="montant" />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Bénéficiaire <span className="text-error">*</span></span></label>
            <input type="text" name="beneficiaire" value={formData.beneficiaire} onChange={handleChange}
              placeholder="Nom du bénéficiaire"
              className={`input input-bordered w-full ${fieldErrors.beneficiaire ? 'input-error' : ''}`} />
            <FieldError name="beneficiaire" />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Date du frais <span className="text-error">*</span></span></label>
            <input type="date" name="date_frais" value={formData.date_frais} onChange={handleChange}
              className={`input input-bordered w-full ${fieldErrors.date_frais ? 'input-error' : ''}`} />
            <FieldError name="date_frais" />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Date de paiement</span></label>
            <input type="date" name="date_paiement" value={formData.date_paiement} onChange={handleChange}
              className="input input-bordered w-full" />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Mode de paiement</span></label>
            <select name="mode_paiement" value={formData.mode_paiement} onChange={handleChange} className="select select-bordered w-full">
              <option value="especes">Espèces</option>
              <option value="carte">Carte bancaire</option>
              <option value="cheque">Chèque</option>
              <option value="virement">Virement</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Statut</span></label>
            <select name="status" value={formData.status} onChange={handleChange} className="select select-bordered w-full">
              <option value="brouillon">Brouillon</option>
              <option value="en_attente">En attente de validation</option>
              <option value="valide">Validé</option>
              <option value="paye">Payé (crée le mouvement)</option>
            </select>
            {isEdit && originalStatus === 'paye' && formData.status !== 'paye' && (
              <span className="text-xs text-warning mt-1">
                ⚠️ Repasser à un autre statut ne supprime pas le mouvement déjà créé
              </span>
            )}
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Pièce justificative</span></label>
            <input type="text" name="piece_justificative" value={formData.piece_justificative} onChange={handleChange}
              placeholder="Ex: FACT-001" className="input input-bordered w-full" />
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
          <button type="button" onClick={() => navigate('/frais')} className="btn btn-ghost gap-2">
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

export default FraisTresorerieForm