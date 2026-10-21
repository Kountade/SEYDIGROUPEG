// src/components/tresorerie/MouvementsTresorerieForm.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ArrowLeft, Save, X, AlertCircle, CheckCircle, Loader2,
  ArrowLeftRight, Coins, PiggyBank, TrendingUp, TrendingDown,
  Banknote
} from 'lucide-react'

// ✅ Date locale (évite le décalage UTC)
const nowLocalDateTime = () => {
  const d = new Date()
  const off = d.getTimezoneOffset()
  const local = new Date(d.getTime() - off * 60 * 1000)
  return local.toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm
}

const nowLocalDate = () => {
  const d = new Date()
  const off = d.getTimezoneOffset()
  const local = new Date(d.getTime() - off * 60 * 1000)
  return local.toISOString().split('T')[0]
}

const EMPTY_FORM = {
  type_mouvement: 'encaissement',
  agence: '',
  source_type: 'autre',
  source_id: '',
  source_reference: '',
  montant: '',
  mode_paiement: 'especes',
  caisse: '',
  compte_bancaire: '',
  date_mouvement: nowLocalDateTime(),
  date_valeur: nowLocalDate(),
  date_prevue: '',
  status: 'planifie',
  reference_externe: '',
  piece_justificative: '',
  libelle: '',
  notes: '',
}

const unwrapList = (payload) => {
  if (Array.isArray(payload)) return payload
  return payload?.results || []
}

const MouvementsTresorerieForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [formData, setFormData] = useState(EMPTY_FORM)
  const [caisses, setCaisses] = useState([])
  const [comptesBancaires, setComptesBancaires] = useState([])
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

  // ---------- Chargement initial ----------
  useEffect(() => {
    const controller = new AbortController()
    abortRef.current = controller

    const loadData = async () => {
      setLoading(true)
      setGlobalError(null)
      try {
        const [agencesRes, caissesRes, comptesRes] = await Promise.all([
          AxiosInstance.get('/agences/', { params: { page_size: 200 }, signal: controller.signal }),
          AxiosInstance.get('/caisses/', { params: { page_size: 200 }, signal: controller.signal }),
          AxiosInstance.get('/comptes-bancaires/', { params: { page_size: 200 }, signal: controller.signal }),
        ])
        // ✅ Gestion paginée OU non
        setAgences(unwrapList(agencesRes.data))
        setCaisses(unwrapList(caissesRes.data))
        setComptesBancaires(unwrapList(comptesRes.data))

        if (isEdit) {
          const mouvementRes = await AxiosInstance.get(`/mouvements/${id}/`, {
            signal: controller.signal,
          })
          const d = mouvementRes.data || {}
          setFormData({
            type_mouvement: d.type_mouvement || 'encaissement',
            agence: d.agence || '',
            source_type: d.source_type || 'autre',
            source_id: d.source_id || '',
            source_reference: d.source_reference || '',
            montant: d.montant ?? '',
            mode_paiement: d.mode_paiement || 'especes',
            caisse: d.caisse || '',
            compte_bancaire: d.compte_bancaire || '',
            date_mouvement: d.date_mouvement
              ? new Date(d.date_mouvement).toISOString().slice(0, 16)
              : nowLocalDateTime(),
            date_valeur: d.date_valeur || nowLocalDate(),
            date_prevue: d.date_prevue || '',
            status: d.status || 'planifie',
            reference_externe: d.reference_externe || '',
            piece_justificative: d.piece_justificative || '',
            libelle: d.libelle || '',
            notes: d.notes || '',
          })
          setOriginalStatus(d.status || 'planifie')
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

  // ---------- Filtrage dépendant de l'agence ----------
  const caissesFiltrees = useMemo(() => {
    if (!formData.agence) return caisses
    return caisses.filter(c => String(c.agence) === String(formData.agence))
  }, [caisses, formData.agence])

  const comptesFiltres = useMemo(() => {
    if (!formData.agence) return comptesBancaires
    return comptesBancaires.filter(c => String(c.agence) === String(formData.agence))
  }, [comptesBancaires, formData.agence])

  // ---------- Handlers ----------
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const val = type === 'checkbox' ? checked : value

    setFormData(prev => {
      const next = { ...prev, [name]: val }
      // ✅ Si on change d'agence, on reset caisse/compte si incompatibles
      if (name === 'agence') {
        if (prev.caisse) {
          const c = caisses.find(x => String(x.id) === String(prev.caisse))
          if (!c || String(c.agence) !== String(val)) next.caisse = ''
        }
        if (prev.compte_bancaire) {
          const c = comptesBancaires.find(x => String(x.id) === String(prev.compte_bancaire))
          if (!c || String(c.agence) !== String(val)) next.compte_bancaire = ''
        }
      }
      // ✅ Si on change de type_mouvement, on nettoie les champs devenus inutiles
      if (name === 'type_mouvement') {
        if (val === 'encaissement' || val === 'decaissement') {
          // Un seul des deux suffit
        }
        if (val === 'transfert') {
          // Les deux sont requis → on ne nettoie rien
        }
      }
      return next
    })

    if (fieldErrors[name]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[name]; return n })
    }
  }

  // ---------- Validation client ----------
  const validate = () => {
    const errors = {}
    if (!formData.type_mouvement) errors.type_mouvement = 'Type requis'
    if (!formData.agence) errors.agence = 'Agence requise'
    const montantNum = parseFloat(formData.montant)
    if (!formData.montant || !Number.isFinite(montantNum) || montantNum <= 0) {
      errors.montant = 'Le montant doit être supérieur à 0'
    }
    if (!formData.libelle.trim()) errors.libelle = 'Le libellé est requis'
    if (!formData.mode_paiement) errors.mode_paiement = 'Mode de paiement requis'
    if (!formData.date_valeur) errors.date_valeur = 'Date de valeur requise'

    if (!formData.caisse && !formData.compte_bancaire) {
      errors.caisse = 'Une caisse ou un compte bancaire est requis'
      errors.compte_bancaire = 'Une caisse ou un compte bancaire est requis'
    }
    if (formData.type_mouvement === 'transfert') {
      if (!formData.caisse) errors.caisse = 'Un transfert nécessite une caisse'
      if (!formData.compte_bancaire) errors.compte_bancaire = 'Un transfert nécessite un compte bancaire'
    }
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

    // ✅ Avertissement métier : passer de effectue → autre va inverser les soldes
    if (
      isEdit &&
      originalStatus === 'effectue' &&
      formData.status !== 'effectue'
    ) {
      const ok = window.confirm(
        "⚠️ Ce mouvement est actuellement 'Effectué'. Le repasser à un autre statut va INVERser les soldes de la caisse/compte. Continuer ?"
      )
      if (!ok) return
    }

    setSaving(true)
    try {
      const payload = {
        type_mouvement: formData.type_mouvement,
        agence: Number(formData.agence),
        source_type: formData.source_type || 'autre',
        source_id: formData.source_id ? Number(formData.source_id) : null,
        source_reference: formData.source_reference || '',
        montant: parseFloat(formData.montant),
        mode_paiement: formData.mode_paiement,
        caisse: formData.caisse ? Number(formData.caisse) : null,
        compte_bancaire: formData.compte_bancaire ? Number(formData.compte_bancaire) : null,
        date_mouvement: formData.date_mouvement || nowLocalDateTime(),
        date_valeur: formData.date_valeur || nowLocalDate(),
        date_prevue: formData.date_prevue || null,
        status: formData.status,
        reference_externe: formData.reference_externe || '',
        piece_justificative: formData.piece_justificative || '',
        libelle: formData.libelle,
        notes: formData.notes || '',
      }

      if (isEdit) {
        await AxiosInstance.put(`/mouvements/${id}/`, payload)
        showNotification('Mouvement modifié avec succès', 'success')
      } else {
        await AxiosInstance.post('/mouvements/', payload)
        showNotification('Mouvement créé avec succès', 'success')
      }

      redirectTimerRef.current = setTimeout(
        () => navigate('/mouvements-tresorerie'),
        900
      )
    } catch (err) {
      console.error('Erreur sauvegarde:', err)
      const data = err.response?.data

      // ✅ Erreurs DRF par champ
      if (data && typeof data === 'object' && !Array.isArray(data) && !data.detail && !data.error && !data.message) {
        const fe = {}
        Object.keys(data).forEach(k => {
          const v = data[k]
          fe[k] = Array.isArray(v) ? v[0] : String(v)
        })
        setFieldErrors(fe)
        setGlobalError('Certains champs sont invalides')
      } else {
        setGlobalError(
          data?.detail || data?.error || data?.message || 'Erreur lors de la sauvegarde'
        )
      }
      showNotification('Erreur lors de la sauvegarde', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleRetour = () => navigate('/mouvements-tresorerie')

  // ---------- Aperçu live ----------
  const preview = useMemo(() => {
    const m = parseFloat(formData.montant)
    if (!Number.isFinite(m) || m <= 0) return null
    const sign = formData.type_mouvement === 'encaissement' ? '+' :
                 formData.type_mouvement === 'decaissement' ? '-' : '↔'
    return { sign, montant: m }
  }, [formData.montant, formData.type_mouvement])

  // ---------- Loading ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            {isEdit ? 'Chargement du mouvement...' : 'Préparation du formulaire...'}
          </p>
        </div>
      </div>
    )
  }

  // ---------- Composant FieldError ----------
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <button onClick={handleRetour} className="btn btn-ghost btn-sm gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-base-content">
              {isEdit ? '✏️ Modifier le mouvement' : '🔄 Nouveau mouvement'}
            </h1>
            <p className="text-xs sm:text-sm text-base-content/60 mt-1">
              {isEdit ? 'Modifiez les informations du mouvement' : 'Créez un nouveau mouvement de trésorerie'}
            </p>
          </div>
        </div>
        {isEdit && (
          <span className="badge badge-primary badge-sm">ID: #{id}</span>
        )}
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="bg-base-100 rounded-xl shadow-xl border border-base-200 p-4 sm:p-6">
        {globalError && (
          <div className="alert alert-error mb-4">
            <AlertCircle className="w-4 h-4" />
            <span>{globalError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Type de mouvement */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Type de mouvement <span className="text-error">*</span></span></label>
            <div className="flex gap-2 items-center">
              <select
                name="type_mouvement" value={formData.type_mouvement} onChange={handleChange}
                className={`select select-bordered flex-1 ${fieldErrors.type_mouvement ? 'select-error' : ''}`}
              >
                <option value="encaissement">💰 Encaissement</option>
                <option value="decaissement">💸 Décaissement</option>
                <option value="transfert">🔄 Transfert</option>
              </select>
              {formData.type_mouvement === 'encaissement' && <TrendingUp className="w-6 h-6 text-success" />}
              {formData.type_mouvement === 'decaissement' && <TrendingDown className="w-6 h-6 text-error" />}
              {formData.type_mouvement === 'transfert' && <ArrowLeftRight className="w-6 h-6 text-info" />}
            </div>
            <FieldError name="type_mouvement" />
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

          {/* Montant */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Montant <span className="text-error">*</span></span></label>
            <input
              type="number" name="montant" value={formData.montant} onChange={handleChange}
              placeholder="0" step="0.01" min="0"
              className={`input input-bordered w-full ${fieldErrors.montant ? 'input-error' : ''}`}
            />
            <FieldError name="montant" />
          </div>

          {/* Mode de paiement */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Mode de paiement <span className="text-error">*</span></span></label>
            <select
              name="mode_paiement" value={formData.mode_paiement} onChange={handleChange}
              className={`select select-bordered w-full ${fieldErrors.mode_paiement ? 'select-error' : ''}`}
            >
              <option value="especes">💰 Espèces</option>
              <option value="carte">💳 Carte bancaire</option>
              <option value="cheque">📄 Chèque</option>
              <option value="virement">🏦 Virement</option>
              <option value="mobile_money">📱 Mobile Money</option>
              <option value="prelevement">🔄 Prélèvement</option>
              <option value="autre">📌 Autre</option>
            </select>
            <FieldError name="mode_paiement" />
          </div>

          {/* Caisse */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">
                Caisse {formData.type_mouvement === 'transfert' && <span className="text-error">*</span>}
              </span>
            </label>
            <select
              name="caisse" value={formData.caisse} onChange={handleChange}
              className={`select select-bordered w-full ${fieldErrors.caisse ? 'select-error' : ''}`}
            >
              <option value="">Sélectionner une caisse</option>
              {caissesFiltrees.map(c => (
                <option key={c.id} value={c.id}>{c.nom} ({c.code})</option>
              ))}
            </select>
            {formData.agence && caissesFiltrees.length === 0 && (
              <span className="text-xs text-warning mt-1">
                Aucune caisse active pour cette agence
              </span>
            )}
            <FieldError name="caisse" />
          </div>

          {/* Compte bancaire */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">
                Compte bancaire {formData.type_mouvement === 'transfert' && <span className="text-error">*</span>}
              </span>
            </label>
            <select
              name="compte_bancaire" value={formData.compte_bancaire} onChange={handleChange}
              className={`select select-bordered w-full ${fieldErrors.compte_bancaire ? 'select-error' : ''}`}
            >
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

          {/* Libellé */}
          <div className="form-control md:col-span-2">
            <label className="label"><span className="label-text font-medium">Libellé <span className="text-error">*</span></span></label>
            <input
              type="text" name="libelle" value={formData.libelle} onChange={handleChange}
              placeholder="Ex: Paiement fournisseur"
              className={`input input-bordered w-full ${fieldErrors.libelle ? 'input-error' : ''}`}
            />
            <FieldError name="libelle" />
          </div>

          {/* Statut */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Statut</span></label>
            <select name="status" value={formData.status} onChange={handleChange} className="select select-bordered w-full">
              <option value="planifie">📋 Planifié</option>
              <option value="en_attente">⏳ En attente</option>
              <option value="effectue">✅ Effectué</option>
            </select>
            {isEdit && originalStatus === 'effectue' && formData.status !== 'effectue' && (
              <span className="text-xs text-warning mt-1">
                ⚠️ Repasser à un autre statut inversera les soldes
              </span>
            )}
          </div>

          {/* Date mouvement */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Date du mouvement</span></label>
            <input
              type="datetime-local" name="date_mouvement" value={formData.date_mouvement} onChange={handleChange}
              className="input input-bordered w-full"
            />
          </div>

          {/* Date de valeur */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Date de valeur <span className="text-error">*</span></span></label>
            <input
              type="date" name="date_valeur" value={formData.date_valeur} onChange={handleChange}
              className={`input input-bordered w-full ${fieldErrors.date_valeur ? 'input-error' : ''}`}
            />
            <FieldError name="date_valeur" />
          </div>

          {/* Date prévue */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Date prévue</span></label>
            <input
              type="date" name="date_prevue" value={formData.date_prevue} onChange={handleChange}
              className="input input-bordered w-full"
            />
          </div>

          {/* Source type */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Type de source</span></label>
            <select name="source_type" value={formData.source_type} onChange={handleChange} className="select select-bordered w-full">
              <option value="autre">📌 Autre</option>
              <option value="vente">🛒 Vente</option>
              <option value="achat">📦 Achat</option>
              <option value="facture_client">🧾 Facture client</option>
              <option value="facture_fournisseur">🧾 Facture fournisseur</option>
              <option value="reglement">💵 Règlement</option>
              <option value="ecriture">📝 Écriture comptable</option>
              <option value="salaire">👤 Salaire</option>
              <option value="frais">📄 Frais</option>
            </select>
          </div>

          {/* Source référence */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Référence source</span></label>
            <input
              type="text" name="source_reference" value={formData.source_reference} onChange={handleChange}
              placeholder="Ex: VENTE-001" className="input input-bordered w-full"
            />
          </div>

          {/* Référence externe */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Référence externe</span></label>
            <input
              type="text" name="reference_externe" value={formData.reference_externe} onChange={handleChange}
              placeholder="Ex: N° chèque, N° virement..." className="input input-bordered w-full"
            />
          </div>

          {/* Pièce justificative */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Pièce justificative</span></label>
            <input
              type="text" name="piece_justificative" value={formData.piece_justificative} onChange={handleChange}
              placeholder="Ex: FACT-001" className="input input-bordered w-full"
            />
          </div>

          {/* Notes */}
          <div className="form-control md:col-span-2">
            <label className="label"><span className="label-text font-medium">Notes</span></label>
            <textarea
              name="notes" value={formData.notes} onChange={handleChange}
              placeholder="Notes supplémentaires..." className="textarea textarea-bordered w-full" rows="3"
            />
          </div>
        </div>

        {/* ✅ Aperçu live */}
        {preview && (
          <div className="mt-4 p-3 bg-base-200 rounded-lg border border-base-300">
            <div className="flex items-center justify-between text-sm">
              <span className="text-base-content/60">Aperçu du mouvement :</span>
              <span className={`font-mono font-bold ${
                formData.type_mouvement === 'encaissement' ? 'text-success' :
                formData.type_mouvement === 'decaissement' ? 'text-error' : 'text-info'
              }`}>
                {preview.sign} {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(preview.montant)} FCFA
              </span>
            </div>
          </div>
        )}

        {/* Boutons */}
        <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-base-200">
          <button type="submit" className="btn btn-primary gap-2" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Enregistrement...' : (isEdit ? 'Modifier' : 'Créer')}
          </button>
          <button type="button" onClick={handleRetour} className="btn btn-ghost gap-2">
            <X className="w-4 h-4" /> Annuler
          </button>
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

export default MouvementsTresorerieForm