// src/components/paiements/PaiementForm.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import { CreditCard, Save, ArrowLeft, AlertCircle, CheckCircle, DollarSign, FileText, User, Hash } from 'lucide-react'

const PaiementForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = !!id

  const [formData, setFormData] = useState({
    facture: '',
    montant: '',
    methode: 'especes',
    reference_externe: '',
    notes: ''
  })
  const [factures, setFactures] = useState([])
  const [selectedFacture, setSelectedFacture] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingFactures, setLoadingFactures] = useState(true)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState({ text: '', type: '' })

  const methodes = [
    { value: 'especes', label: 'Espèces' },
    { value: 'carte', label: 'Carte bancaire' },
    { value: 'cheque', label: 'Chèque' },
    { value: 'virement', label: 'Virement' },
    { value: 'mobile_money', label: 'Mobile Money' },
    { value: 'autre', label: 'Autre' }
  ]

  useEffect(() => {
    fetchFactures()
    if (isEditMode) fetchPaiement()
  }, [id])

  const fetchFactures = async () => {
    setLoadingFactures(true)
    try {
      const res = await AxiosInstance.get('/factures/?status__in=partially_paid,overdue,sent')
      const facturesAvecReste = res.data.filter(f => (f.montant_restant || 0) > 0)
      setFactures(facturesAvecReste)
    } catch (err) {
      console.error('Erreur chargement factures', err)
      setMessage({ text: 'Impossible de charger les factures', type: 'error' })
    } finally {
      setLoadingFactures(false)
    }
  }

  const fetchPaiement = async () => {
    setLoading(true)
    try {
      const { data } = await AxiosInstance.get(`/paiements/${id}/`)
      setFormData({
        facture: data.facture?.id || '',
        montant: data.montant,
        methode: data.methode,
        reference_externe: data.reference_externe || '',
        notes: data.notes || ''
      })
      if (data.facture) setSelectedFacture(data.facture)
    } catch (err) {
      setMessage({ text: 'Erreur de chargement du paiement', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleFactureChange = (e) => {
    const factureId = parseInt(e.target.value)
    const facture = factures.find(f => f.id === factureId)
    setSelectedFacture(facture || null)
    setFormData(prev => ({ ...prev, facture: factureId, montant: '' }))
    if (errors.facture) setErrors(prev => ({ ...prev, facture: '' }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.facture) newErrors.facture = 'Veuillez sélectionner une facture'
    if (!formData.montant || parseFloat(formData.montant) <= 0) newErrors.montant = 'Montant invalide'
    if (!formData.methode) newErrors.methode = 'Choisissez une méthode'

    if (selectedFacture && formData.montant) {
      const montant = parseFloat(formData.montant)
      const restant = selectedFacture.montant_restant || 0
      if (montant > restant) {
        newErrors.montant = `Maximum : ${restant.toLocaleString()} FCFA`
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const payload = {
        facture: parseInt(formData.facture),
        montant: parseFloat(formData.montant),
        methode: formData.methode,
        reference_externe: formData.reference_externe,
        notes: formData.notes
      }
      if (isEditMode) {
        await AxiosInstance.put(`/paiements/${id}/`, payload)
        setMessage({ text: 'Paiement modifié avec succès', type: 'success' })
      } else {
        await AxiosInstance.post('/paiements/', payload)
        setMessage({ text: 'Paiement enregistré avec succès', type: 'success' })
      }
      setTimeout(() => navigate('/paiements'), 1500)
    } catch (err) {
      const errorData = err.response?.data
      let errorMessage = 'Erreur lors de l\'enregistrement'
      if (errorData?.facture) errorMessage = errorData.facture[0]
      else if (errorData?.montant) errorMessage = errorData.montant[0]
      else if (errorData?.non_field_errors) errorMessage = errorData.non_field_errors[0]
      setMessage({ text: errorMessage, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const getFactureLabel = (facture) => {
    const clientName = facture.client_nom || facture.client?.nom || 'Client inconnu'
    const restant = facture.montant_restant?.toLocaleString() || '0'
    return `${facture.reference} - ${clientName} (Reste: ${restant} FCFA)`
  }

  const formatPrice = (price) => {
    if (!price) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA'
  }

  const PaymentSummary = () => {
    if (!selectedFacture) return null
    const total = selectedFacture.total_ttc || 0
    const paye = selectedFacture.montant_paye || 0
    const restant = selectedFacture.montant_restant || 0
    const percent = total === 0 ? 0 : (paye / total) * 100
    const hasClient = !!selectedFacture.client
    return (
      <div className="bg-base-200 rounded-xl p-4 h-full">
        <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" /> Récapitulatif
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Référence</span><span className="font-mono font-semibold">{selectedFacture.reference}</span></div>
          <div className="flex justify-between"><span>Client</span><span className={!hasClient ? 'text-warning' : ''}>{hasClient ? (selectedFacture.client?.nom || 'Anonyme') : '⚠️ Aucun'}</span></div>
          <div className="flex justify-between"><span>Total TTC</span><span className="font-bold text-primary">{formatPrice(total)}</span></div>
          <div className="flex justify-between"><span>Déjà payé</span><span className="text-success">{formatPrice(paye)}</span></div>
          <div className="flex justify-between"><span>Reste à payer</span><span className="text-error font-bold">{formatPrice(restant)}</span></div>
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1"><span>Progression</span><span>{percent.toFixed(0)}%</span></div>
            <div className="w-full bg-base-300 rounded-full h-2"><div className="bg-primary h-2 rounded-full" style={{ width: `${percent}%` }} /></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header fixe */}
      <div className="bg-base-100 border-b sticky top-0 z-10 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/paiements" className="btn btn-ghost btn-sm gap-1">
              <ArrowLeft className="w-4 h-4" /> Retour
            </Link>
            <div className="divider divider-horizontal h-5"></div>
            <CreditCard className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold">{isEditMode ? 'Modifier le paiement' : 'Nouveau paiement'}</h1>
          </div>
          {message.text && (
            <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'} py-1 px-3 text-sm`}>
              {message.type === 'success' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              <span>{message.text}</span>
              <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setMessage({ text: '', type: '' })}>✕</button>
            </div>
          )}
        </div>
      </div>

      {/* Formulaire pleine largeur */}
      <div className="p-4">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Colonne gauche : champs */}
            <div className="space-y-4">
              <div className="card bg-base-100 shadow-md">
                <div className="card-body p-4">
                  <h2 className="card-title text-md mb-2">Informations paiement</h2>
                  <div className="form-control">
                    <label className="label py-1"><span className="label-text font-medium">Facture *</span></label>
                    <select
                      name="facture"
                      value={formData.facture}
                      onChange={handleFactureChange}
                      className={`select select-bordered w-full ${errors.facture ? 'select-error' : ''}`}
                      disabled={isEditMode || loading || loadingFactures}
                    >
                      <option value="">Sélectionner une facture</option>
                      {factures.map(f => (
                        <option key={f.id} value={f.id}>{getFactureLabel(f)}</option>
                      ))}
                    </select>
                    {loadingFactures && <span className="text-info text-xs mt-1">Chargement...</span>}
                    {errors.facture && <span className="text-error text-xs mt-1">{errors.facture}</span>}
                    {!loadingFactures && factures.length === 0 && (
                      <span className="text-warning text-xs mt-1">
                        Aucune facture avec un reste à payer &gt; 0
                      </span>
                    )}
                  </div>

                  <div className="form-control">
                    <label className="label py-1"><span className="label-text font-medium">Montant *</span></label>
                    <input
                      type="number"
                      name="montant"
                      step="1"
                      value={formData.montant}
                      onChange={handleChange}
                      placeholder="0"
                      className={`input input-bordered w-full ${errors.montant ? 'input-error' : ''}`}
                      disabled={loading}
                    />
                    {errors.montant && <span className="text-error text-xs mt-1">{errors.montant}</span>}
                    {selectedFacture && (
                      <span className="text-info text-xs mt-1">Maximum : {formatPrice(selectedFacture.montant_restant)}</span>
                    )}
                  </div>

                  <div className="form-control">
                    <label className="label py-1">Méthode *</label>
                    <select name="methode" value={formData.methode} onChange={handleChange} className="select select-bordered w-full" disabled={loading}>
                      {methodes.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>

                  <div className="form-control">
                    <label className="label py-1">Référence externe</label>
                    <input
                      type="text"
                      name="reference_externe"
                      value={formData.reference_externe}
                      onChange={handleChange}
                      placeholder="N° chèque, virement..."
                      className="input input-bordered w-full"
                      disabled={loading}
                    />
                  </div>

                  <div className="form-control">
                    <label className="label py-1">Notes</label>
                    <textarea
                      name="notes"
                      rows="2"
                      value={formData.notes}
                      onChange={handleChange}
                      className="textarea textarea-bordered"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={loading} className="btn btn-primary flex-1 gap-2">
                  {loading ? <span className="loading loading-spinner loading-sm"></span> : <Save className="w-4 h-4" />}
                  {isEditMode ? 'Mettre à jour' : 'Enregistrer'}
                </button>
                <Link to="/paiements" className="btn btn-outline flex-1">Annuler</Link>
              </div>
            </div>

            {/* Colonne droite : résumé */}
            <div className="lg:sticky lg:top-20 h-fit">
              <PaymentSummary />
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PaiementForm