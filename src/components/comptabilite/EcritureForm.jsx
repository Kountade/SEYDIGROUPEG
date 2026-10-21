// src/components/comptabilite/EcritureForm.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ArrowLeft, Save, X, AlertCircle, CheckCircle, XCircle, Loader2,
  Plus, Trash2, BookOpen, Calendar, FileText, Building2, DollarSign,
  Notebook, Info,
} from 'lucide-react'

// ============================================================
// HELPERS
// ============================================================
const todayISO = () => {
  const d = new Date()
  const off = d.getTimezoneOffset()
  const local = new Date(d.getTime() - off * 60 * 1000)
  return local.toISOString().split('T')[0]
}

const unwrapList = (payload) =>
  Array.isArray(payload) ? payload : (payload?.results || [])

const EMPTY_FORM = {
  journal: '',
  agence: '',
  date_ecriture: todayISO(),
  date_comptable: todayISO(),
  libelle: '',
  piece_justificative: '',
  notes: '',
  lignes: [{ compte: '', debit: '', credit: '', libelle: '' }],
}

// ============================================================
// COMPOSANT
// ============================================================
const EcritureForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  // ---------- États ----------
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [errorDetails, setErrorDetails] = useState(null)
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const [journaux, setJournaux] = useState([])
  const [comptes, setComptes] = useState([])
  const [agences, setAgences] = useState([])
  const [userAgenceId, setUserAgenceId] = useState(null)

  const [formData, setFormData] = useState(EMPTY_FORM)

  // ---------- Refs ----------
  const abortRef = useRef(null)
  const redirectTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort()
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current)
    }
  }, [])

  // ============================================================
  // CALCUL DES TOTAUX (mémoïsé)
  // ============================================================
  const { totalDebit, totalCredit, estEquilibree } = useMemo(() => {
    let debit = 0
    let credit = 0
    formData.lignes.forEach(l => {
      debit += parseFloat(l.debit) || 0
      credit += parseFloat(l.credit) || 0
    })
    return {
      totalDebit: debit,
      totalCredit: credit,
      estEquilibree: debit === credit && debit > 0,
    }
  }, [formData.lignes])

  // ============================================================
  // CHARGEMENT INITIAL
  // ============================================================
  useEffect(() => {
    const controller = new AbortController()
    abortRef.current = controller

    const loadAll = async () => {
      setLoading(true)
      setError(null)

      try {
        // ✅ 4 appels parallèles
        const [journauxRes, comptesRes, agencesRes, ecritureRes] = await Promise.allSettled([
          AxiosInstance.get('/journaux/', { params: { page_size: 200 }, signal: controller.signal }),
          AxiosInstance.get('/plan-comptable/', { params: { is_active: true, page_size: 500 }, signal: controller.signal }),
          AxiosInstance.get('/agences/', { params: { page_size: 200 }, signal: controller.signal }),
          isEditing
            ? AxiosInstance.get(`/ecritures/${id}/`, { signal: controller.signal })
            : Promise.resolve({ data: null }),
        ])

        if (controller.signal.aborted) return

        // --- Journaux ---
        if (journauxRes.status === 'fulfilled') {
          setJournaux(unwrapList(journauxRes.value.data))
        } else {
          console.warn('⚠️ Journaux indisponibles')
        }

        // --- Comptes ---
        if (comptesRes.status === 'fulfilled') {
          setComptes(unwrapList(comptesRes.value.data))
        } else {
          console.warn('⚠️ Comptes indisponibles')
        }

        // --- Agences + détermination de l'agence utilisateur ---
        let agencesData = []
        if (agencesRes.status === 'fulfilled') {
          agencesData = unwrapList(agencesRes.value.data)
          setAgences(agencesData)
        }

        // Déterminer l'agence de l'utilisateur
        const detectedAgenceId = detectUserAgenceId(agencesData)
        if (detectedAgenceId) {
          setUserAgenceId(detectedAgenceId)
        }

        // --- Écriture en édition ---
        if (isEditing && ecritureRes.status === 'fulfilled' && ecritureRes.value.data) {
          const d = ecritureRes.value.data
          setFormData({
            journal: d.journal || '',
            agence: d.agence || detectedAgenceId || '',
            date_ecriture: d.date_ecriture || todayISO(),
            date_comptable: d.date_comptable || todayISO(),
            libelle: d.libelle || '',
            piece_justificative: d.piece_justificative || '',
            notes: d.notes || '',
            lignes: d.lignes && d.lignes.length > 0
              ? d.lignes.map(l => ({
                  compte: l.compte || '',
                  debit: l.debit != null ? String(l.debit) : '',
                  credit: l.credit != null ? String(l.credit) : '',
                  libelle: l.libelle || '',
                }))
              : [{ compte: '', debit: '', credit: '', libelle: '' }],
          })
        } else {
          // Création : on pré-remplit l'agence
          setFormData(prev => ({
            ...prev,
            agence: detectedAgenceId || '',
          }))
        }
      } catch (err) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
        console.error('❌ Erreur chargement:', err)
        setError('Erreur de chargement des données du formulaire')
      } finally {
        if (abortRef.current === controller) setLoading(false)
      }
    }

    loadAll()

    return () => controller.abort()
  }, [id, isEditing])

  // ============================================================
  // DÉTECTION DE L'AGENCE UTILISATEUR
  // ============================================================
  const detectUserAgenceId = (agencesList) => {
    try {
      // 1. localStorage (User)
      const raw = localStorage.getItem('User')
      if (raw) {
        const u = JSON.parse(raw)
        const candidates = [
          u.agence_principale?.id,
          u.agence_principale,
          u.agence?.id,
          u.agence,
          u.agence_id,
          u.agences?.[0]?.id,
          u.agences?.[0],
        ]
        for (const c of candidates) {
          const n = parseInt(c, 10)
          if (!isNaN(n) && n > 0) return n
        }
      }

      // 2. Fallback : 1 seule agence → on la prend
      if (agencesList && agencesList.length === 1) {
        return agencesList[0].id
      }

      return null
    } catch (e) {
      console.warn('⚠️ Impossible de détecter l\'agence:', e)
      return null
    }
  }

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[name]; return n })
    }
  }

  const handleAgenceChange = (e) => {
    const raw = e.target.value
    const value = raw ? parseInt(raw, 10) : ''
    setFormData(prev => ({ ...prev, agence: value }))
    if (!isNaN(value) && value > 0) setUserAgenceId(value)
    if (fieldErrors.agence) {
      setFieldErrors(prev => { const n = { ...prev }; delete n.agence; return n })
    }
  }

  const handleLigneChange = (index, field, value) => {
    setFormData(prev => {
      const newLignes = [...prev.lignes]
      newLignes[index] = { ...newLignes[index], [field]: value }
      return { ...prev, lignes: newLignes }
    })
  }

  const addLigne = () => {
    setFormData(prev => ({
      ...prev,
      lignes: [...prev.lignes, { compte: '', debit: '', credit: '', libelle: '' }],
    }))
  }

  const removeLigne = (index) => {
    if (formData.lignes.length <= 1) return
    setFormData(prev => ({
      ...prev,
      lignes: prev.lignes.filter((_, i) => i !== index),
    }))
  }

  // ============================================================
  // VALIDATION CLIENT
  // ============================================================
  const validate = () => {
    const errors = {}
    if (!formData.journal) errors.journal = 'Le journal est requis'
    if (!formData.libelle?.trim()) errors.libelle = 'Le libellé est requis'
    if (!formData.agence) errors.agence = 'L\'agence est requise'
    if (!formData.date_ecriture) errors.date_ecriture = 'La date d\'écriture est requise'

    // Au moins une ligne valide
    const hasValidLine = formData.lignes.some(l => l.compte && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
    if (!hasValidLine) {
      errors.lignes = 'Au moins une ligne avec compte et montant est requise'
    }

    // Chaque ligne avec montant doit avoir un compte
    for (let i = 0; i < formData.lignes.length; i++) {
      const l = formData.lignes[i]
      const hasAmount = (parseFloat(l.debit) > 0) || (parseFloat(l.credit) > 0)
      if (hasAmount && !l.compte) {
        errors.lignes = `Ligne ${i + 1} : compte manquant`
        break
      }
    }

    if (!estEquilibree) {
      errors.equilibre = 'L\'écriture n\'est pas équilibrée'
    }

    return errors
  }

  // ============================================================
  // SUBMIT
  // ============================================================
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setErrorDetails(null)
    setFieldErrors({})
    setSuccess(false)

    const clientErrors = validate()
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors)
      setError('Veuillez corriger les erreurs du formulaire')
      return
    }

    setSaving(true)
    try {
      const agenceId = typeof formData.agence === 'object'
        ? formData.agence.id
        : parseInt(formData.agence, 10)

      const payload = {
        journal: parseInt(formData.journal, 10),
        agence: agenceId,
        date_ecriture: formData.date_ecriture,
        date_comptable: formData.date_comptable || formData.date_ecriture,
        libelle: formData.libelle.trim(),
        piece_justificative: formData.piece_justificative || '',
        notes: formData.notes || '',
        lignes: formData.lignes
          .filter(l => l.compte && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
          .map(l => ({
            compte: parseInt(l.compte, 10),
            debit: parseFloat(l.debit) || 0,
            credit: parseFloat(l.credit) || 0,
            libelle: l.libelle || '',
          })),
      }

      if (isEditing) {
        await AxiosInstance.put(`/ecritures/${id}/`, payload)
      } else {
        await AxiosInstance.post('/ecritures/', payload)
      }

      setSuccess(true)
      redirectTimerRef.current = setTimeout(() => navigate('/ecritures'), 1200)
    } catch (err) {
      console.error('❌ Erreur sauvegarde:', err)
      const data = err.response?.data
      if (data && typeof data === 'object') {
        // Erreurs DRF par champ
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
          setErrorDetails(fe)
        }
      } else {
        setError('Erreur lors de la sauvegarde')
      }
    } finally {
      setSaving(false)
    }
  }

  // ============================================================
  // RENDU
  // ============================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-base-200">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement du formulaire...
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
          <button onClick={() => navigate('/ecritures')} className="btn btn-ghost btn-sm gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black">
              {isEditing ? 'Modifier l\'écriture' : 'Nouvelle écriture'}
            </h1>
            <p className="text-xs sm:text-sm text-base-content/60 mt-1">
              {isEditing ? 'Modifiez les informations de l\'écriture' : 'Créez une nouvelle écriture comptable'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/ecritures')}
            className="btn btn-ghost gap-2 btn-sm sm:btn-md"
            disabled={saving}
          >
            <X className="w-4 h-4" /> Annuler
          </button>
          <button
            type="submit"
            form="ecriture-form"
            className="btn btn-success gap-2 btn-sm sm:btn-md shadow-lg shadow-success/20"
            disabled={saving || !estEquilibree}
          >
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
              {isEditing ? 'Écriture modifiée' : 'Écriture créée'} avec succès !
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
            {errorDetails && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-base-content/60">Détails techniques</summary>
                <pre className="mt-1 p-2 bg-base-200 rounded overflow-auto max-h-40">
                  {JSON.stringify(errorDetails, null, 2)}
                </pre>
              </details>
            )}
          </div>
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={() => { setError(null); setErrorDetails(null) }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Formulaire */}
      <form
        id="ecriture-form"
        onSubmit={handleSubmit}
        className="bg-base-100 rounded-xl shadow-lg border border-base-200 overflow-hidden"
      >
        <div className="p-4 sm:p-6 space-y-6">
          {/* Journal, Agence, Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Journal */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Journal <span className="text-error">*</span>
                </span>
              </label>
              <select
                name="journal"
                value={formData.journal}
                onChange={handleChange}
                className={`select select-bordered w-full ${fieldErrors.journal ? 'select-error' : ''}`}
                required
                disabled={isEditing}
              >
                <option value="">Sélectionner un journal</option>
                {journaux.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.code} - {j.nom}{j.agence_nom ? ` (${j.agence_nom})` : ''}
                  </option>
                ))}
              </select>
              <FieldError name="journal" />
            </div>

            {/* Agence */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Agence <span className="text-error">*</span>
                </span>
              </label>
              {userAgenceId && agences.length === 1 ? (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-base-200 rounded-lg border border-base-300">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span className="font-medium">
                    {agences.find(a => a.id === userAgenceId)?.nom || `Agence ${userAgenceId}`}
                  </span>
                  <span className="text-xs text-base-content/50 ml-auto">ID: {userAgenceId}</span>
                </div>
              ) : (
                <select
                  name="agence"
                  value={formData.agence || ''}
                  onChange={handleAgenceChange}
                  className={`select select-bordered w-full ${fieldErrors.agence ? 'select-error' : ''}`}
                  required
                >
                  <option value="">Sélectionner une agence</option>
                  {agences.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nom}{a.code ? ` (${a.code})` : ''}
                    </option>
                  ))}
                </select>
              )}
              <FieldError name="agence" />
            </div>

            {/* Date d'écriture */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Date d'écriture <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="date"
                name="date_ecriture"
                value={formData.date_ecriture}
                onChange={handleChange}
                className={`input input-bordered w-full ${fieldErrors.date_ecriture ? 'input-error' : ''}`}
                required
              />
              <FieldError name="date_ecriture" />
            </div>

            {/* Date comptable */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Date comptable
                </span>
              </label>
              <input
                type="date"
                name="date_comptable"
                value={formData.date_comptable}
                onChange={handleChange}
                className="input input-bordered w-full"
              />
            </div>
          </div>

          {/* Libellé + Pièce */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <Notebook className="w-4 h-4 text-primary" />
                  Libellé <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                name="libelle"
                placeholder="Libellé de l'écriture..."
                value={formData.libelle}
                onChange={handleChange}
                className={`input input-bordered w-full ${fieldErrors.libelle ? 'input-error' : ''}`}
                required
              />
              <FieldError name="libelle" />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Pièce justificative
                </span>
              </label>
              <input
                type="text"
                name="piece_justificative"
                placeholder="N° de pièce..."
                value={formData.piece_justificative}
                onChange={handleChange}
                className="input input-bordered w-full"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" /> Notes
              </span>
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Notes supplémentaires..."
              className="textarea textarea-bordered w-full h-20 resize-none"
            />
          </div>

          {/* Lignes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Lignes d'écriture
                <span className="badge badge-ghost badge-xs">
                  {formData.lignes.length} ligne(s)
                </span>
              </h3>
              <button type="button" onClick={addLigne} className="btn btn-primary btn-sm gap-1">
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>

            {fieldErrors.lignes && (
              <div className="alert alert-error mb-3">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{fieldErrors.lignes}</span>
              </div>
            )}

            {/* En-tête */}
            <div className="grid grid-cols-12 gap-2 mb-2 px-2">
              <div className="col-span-5 text-xs font-semibold text-base-content/60">Compte</div>
              <div className="col-span-2 text-xs font-semibold text-base-content/60 text-right">Débit</div>
              <div className="col-span-2 text-xs font-semibold text-base-content/60 text-right">Crédit</div>
              <div className="col-span-2 text-xs font-semibold text-base-content/60">Libellé</div>
              <div className="col-span-1"></div>
            </div>

            {/* Lignes */}
            {formData.lignes.map((ligne, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-5">
                  <select
                    value={ligne.compte}
                    onChange={(e) => {
                      const raw = e.target.value
                      const value = raw ? parseInt(raw, 10) : ''
                      handleLigneChange(index, 'compte', value)
                    }}
                    className="select select-bordered w-full select-sm"
                  >
                    <option value="">Sélectionner un compte</option>
                    {comptes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={ligne.debit}
                    onChange={(e) => handleLigneChange(index, 'debit', e.target.value)}
                    className="input input-bordered w-full input-sm text-right"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={ligne.credit}
                    onChange={(e) => handleLigneChange(index, 'credit', e.target.value)}
                    className="input input-bordered w-full input-sm text-right"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    placeholder="Libellé"
                    value={ligne.libelle}
                    onChange={(e) => handleLigneChange(index, 'libelle', e.target.value)}
                    className="input input-bordered w-full input-sm"
                  />
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => removeLigne(index)}
                    className="btn btn-ghost btn-xs text-error"
                    disabled={formData.lignes.length <= 1}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}

            {/* Totaux */}
            <div className="mt-4 p-3 bg-base-200/50 rounded-lg">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-base-content/60">Total débit</p>
                  <p className="text-lg font-bold text-success">
                    {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2 }).format(totalDebit)} FCFA
                  </p>
                </div>
                <div>
                  <p className="text-xs text-base-content/60">Total crédit</p>
                  <p className="text-lg font-bold text-error">
                    {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2 }).format(totalCredit)} FCFA
                  </p>
                </div>
                <div>
                  <p className="text-xs text-base-content/60">Statut</p>
                  <div className="flex items-center gap-2">
                    {estEquilibree ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span className="text-sm font-medium text-success">Équilibrée</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-error" />
                        <span className="text-sm font-medium text-error">
                          {totalDebit === 0 && totalCredit === 0 ? 'Aucun montant' : 'Non équilibrée'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

export default EcritureForm