// src/components/tresorerie/RapprochementsForm.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ArrowLeft, Save, X, AlertCircle, CheckCircle, Loader2,
} from 'lucide-react'

// ✅ formatMontant AVANT toute utilisation (évite TDZ)
const formatMontant = (montant) => {
  const n = Number(montant)
  if (!Number.isFinite(n)) return '0 FCFA'
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n) + ' FCFA'
}

const todayLocal = () => {
  const d = new Date()
  const off = d.getTimezoneOffset()
  const local = new Date(d.getTime() - off * 60 * 1000)
  return local.toISOString().split('T')[0]
}

const thirtyDaysAgoLocal = () => {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  const off = d.getTimezoneOffset()
  const local = new Date(d.getTime() - off * 60 * 1000)
  return local.toISOString().split('T')[0]
}

const EMPTY_FORM = {
  agence: '',
  compte_bancaire: '',
  date_debut: thirtyDaysAgoLocal(),
  date_fin: todayLocal(),
  solde_comptable: '',
  solde_bancaire: '',
  status: 'brouillon',
  encours_emission: 0,
  encours_encaissement: 0,
  commissions: 0,
  autres_ecarts: 0,
  notes: '',
}

const unwrapList = (payload) => Array.isArray(payload) ? payload : (payload?.results || [])

const RapprochementsForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [formData, setFormData] = useState(EMPTY_FORM)
  const [agences, setAgences] = useState([])
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
      () => setNotification({ show: false, message: '', type: 'success' }), 4000
    )
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    abortRef.current = controller

    const loadData = async () => {
      setLoading(true); setGlobalError(null)
      try {
        const [agencesRes, comptesRes] = await Promise.all([
          AxiosInstance.get('/agences/', { params: { page_size: 200 }, signal: controller.signal }),
          AxiosInstance.get('/comptes-bancaires/', { params: { page_size: 200 }, signal: controller.signal }),
        ])
        setAgences(unwrapList(agencesRes.data))
        setComptesBancaires(unwrapList(comptesRes.data))

        if (isEdit) {
          const res = await AxiosInstance.get(`/rapprochements/${id}/`, { signal: controller.signal })
          const d = res.data || {}
          setFormData({
            agence: d.agence || '',
            compte_bancaire: d.compte_bancaire || '',
            date_debut: d.date_debut || thirtyDaysAgoLocal(),
            date_fin: d.date_fin || todayLocal(),
            solde_comptable: d.solde_comptable ?? '',
            solde_bancaire: d.solde_bancaire ?? '',
            status: d.status || 'brouillon',
            encours_emission: d.encours_emission ?? 0,
            encours_encaissement: d.encours_encaissement ?? 0,
            commissions: d.commissions ?? 0,
            autres_ecarts: d.autres_ecarts ?? 0,
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

  // ✅ Filtrer les comptes par agence sélectionnée
  const comptesFiltres = useMemo(() => {
    if (!formData.agence) return comptesBancaires
    return comptesBancaires.filter(c => String(c.agence) === String(formData.agence))
  }, [comptesBancaires, formData.agence])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const next = { ...prev, [name]: value }
      if (name === 'agence' && prev.compte_bancaire) {
        const c = comptesBancaires.find(x => String(x.id) === String(prev.compte_bancaire))
        if (!c || String(c.agence) !== String(value)) next.compte_bancaire = ''
      }
      return next
    })
    if (fieldErrors[name]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[name]; return n })
    }
  }

  const validate = () => {
    const errors = {}
    if (!formData.agence) errors.agence = "L'agence est requise"
    if (!formData.compte_bancaire) errors.compte_bancaire = 'Le compte bancaire est requis'
    if (!formData.date_debut) errors.date_debut = 'La date de début est requise'
    if (!formData.date_fin) errors.date_fin = 'La date de fin est requise'
    if (formData.date_debut && formData.date_fin && formData.date_debut > formData.date_fin) {
      errors.date_fin = 'La date de fin doit être après la date de début'
    }
    // ✅ Soldes : autoriser les négatifs (découvert)
    if (formData.solde_comptable === '' || !Number.isFinite(parseFloat(formData.solde_comptable))) {
      errors.solde_comptable = 'Le solde comptable est requis'
    }
    if (formData.solde_bancaire === '' || !Number.isFinite(parseFloat(formData.solde_bancaire))) {
      errors.solde_bancaire = 'Le solde bancaire est requis'
    }
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

    if (formData.status === 'complete' && originalStatus !== 'complete') {
      const ok = window.confirm(
        "⚠️ En passant ce rapprochement à 'Complet', il sera considéré comme validé définitivement. Continuer ?"
      )
      if (!ok) return
    }

    setSaving(true)
    try {
      const payload = {
        agence: Number(formData.agence),
        compte_bancaire: Number(formData.compte_bancaire),
        date_debut: formData.date_debut,
        date_fin: formData.date_fin,
        solde_comptable: parseFloat(formData.solde_comptable),
        solde_bancaire: parseFloat(formData.solde_bancaire),
        status: formData.status,
        encours_emission: parseFloat(formData.encours_emission) || 0,
        encours_encaissement: parseFloat(formData.encours_encaissement) || 0,
        commissions: parseFloat(formData.commissions) || 0,
        autres_ecarts: parseFloat(formData.autres_ecarts) || 0,
        notes: formData.notes || '',
      }

      if (isEdit) {
        await AxiosInstance.put(`/rapprochements/${id}/`, payload)
        showNotification('Rapprochement modifié avec succès', 'success')
      } else {
        await AxiosInstance.post('/rapprochements/', payload)
        showNotification('Rapprochement créé avec succès', 'success')
      }

      redirectTimerRef.current = setTimeout(() => navigate('/rapprochements'), 900)
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

  // Aperçu live
  const preview = useMemo(() => {
    const sc = parseFloat(formData.solde_comptable) || 0
    const sb = parseFloat(formData.solde_bancaire) || 0
    const ee = parseFloat(formData.encours_emission) || 0
    const en = parseFloat(formData.encours_encaissement) || 0
    const co = parseFloat(formData.commissions) || 0
    const ae = parseFloat(formData.autres_ecarts) || 0
    const ecart = sc - sb
    const soldeRapproche = sc - ee + en - co - ae
    return { ecart, soldeRapproche, isOk: Math.abs(ecart) < 1 }
  }, [formData.solde_comptable, formData.solde_bancaire, formData.encours_emission,
      formData.encours_encaissement, formData.commissions, formData.autres_ecarts])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            {isEdit ? 'Chargement du rapprochement...' : 'Préparation du formulaire...'}
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
        <button onClick={() => navigate('/rapprochements')} className="btn btn-ghost btn-sm gap-2">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-base-content">
            {isEdit ? '✏️ Modifier le rapprochement' : '✅ Nouveau rapprochement'}
          </h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            {isEdit ? 'Modifiez les informations du rapprochement' : 'Créez un nouveau rapprochement bancaire'}
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
            <label className="label"><span className="label-text font-medium">Compte bancaire <span className="text-error">*</span></span></label>
            <select name="compte_bancaire" value={formData.compte_bancaire} onChange={handleChange}
              className={`select select-bordered w-full ${fieldErrors.compte_bancaire ? 'select-error' : ''}`}>
              <option value="">Sélectionner un compte</option>
              {comptesFiltres.map(c => (
                <option key={c.id} value={c.id}>{c.nom} ({c.banque})</option>
              ))}
            </select>
            {formData.agence && comptesFiltres.length === 0 && (
              <span className="text-xs text-warning mt-1">
                Aucun compte bancaire actif pour cette agence
              </span>
            )}
            <FieldError name="compte_bancaire" />
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
            <label className="label"><span className="label-text font-medium">Solde comptable <span className="text-error">*</span></span></label>
            <input type="number" name="solde_comptable" value={formData.solde_comptable} onChange={handleChange}
              placeholder="0" step="0.01"
              className={`input input-bordered w-full ${fieldErrors.solde_comptable ? 'input-error' : ''}`} />
            <FieldError name="solde_comptable" />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Solde bancaire <span className="text-error">*</span></span></label>
            <input type="number" name="solde_bancaire" value={formData.solde_bancaire} onChange={handleChange}
              placeholder="0" step="0.01"
              className={`input input-bordered w-full ${fieldErrors.solde_bancaire ? 'input-error' : ''}`} />
            <FieldError name="solde_bancaire" />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Statut</span></label>
            <select name="status" value={formData.status} onChange={handleChange} className="select select-bordered w-full">
              <option value="brouillon">Brouillon</option>
              <option value="en_cours">En cours</option>
              <option value="partiel">Partiel</option>
              <option value="complete">Complet (valide définitivement)</option>
            </select>
            {isEdit && originalStatus === 'complete' && formData.status !== 'complete' && (
              <span className="text-xs text-warning mt-1">
                ⚠️ Repasser à un autre statut annulera la validation
              </span>
            )}
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">En-cours d'émission</span></label>
            <input type="number" name="encours_emission" value={formData.encours_emission} onChange={handleChange}
              placeholder="0" step="0.01" className="input input-bordered w-full" />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">En-cours d'encaissement</span></label>
            <input type="number" name="encours_encaissement" value={formData.encours_encaissement} onChange={handleChange}
              placeholder="0" step="0.01" className="input input-bordered w-full" />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Commissions bancaires</span></label>
            <input type="number" name="commissions" value={formData.commissions} onChange={handleChange}
              placeholder="0" step="0.01" className="input input-bordered w-full" />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Autres écarts</span></label>
            <input type="number" name="autres_ecarts" value={formData.autres_ecarts} onChange={handleChange}
              placeholder="0" step="0.01" className="input input-bordered w-full" />
          </div>

          <div className="form-control md:col-span-2">
            <div className="bg-base-200 rounded-xl p-4 mt-2">
              <h4 className="text-sm font-semibold mb-3">📊 Récapitulatif</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-base-content/60">Solde comptable</p>
                  <p className="text-lg font-bold text-primary">{formatMontant(formData.solde_comptable)}</p>
                </div>
                <div>
                  <p className="text-xs text-base-content/60">Solde bancaire</p>
                  <p className="text-lg font-bold text-secondary">{formatMontant(formData.solde_bancaire)}</p>
                </div>
                <div>
                  <p className="text-xs text-base-content/60">Écart</p>
                  <p className={`text-lg font-bold ${preview.ecart >= 0 ? 'text-success' : 'text-error'}`}>
                    {preview.ecart >= 0 ? '+' : ''}{formatMontant(preview.ecart)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-base-content/60">Solde rapproché</p>
                  <p className={`text-lg font-bold ${preview.isOk ? 'text-success' : 'text-warning'}`}>
                    {formatMontant(preview.soldeRapproche)}
                  </p>
                </div>
              </div>
            </div>
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
          <button type="button" onClick={() => navigate('/rapprochements')} className="btn btn-ghost gap-2">
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

export default RapprochementsForm