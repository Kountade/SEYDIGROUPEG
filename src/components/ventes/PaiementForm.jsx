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
  const [loading, setLoading] = useState(false)
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
    try {
      const res = await AxiosInstance.get('/factures/?status__in=partially_paid,overdue,sent')
      setFactures(res.data)
    } catch (err) {
      console.error('Erreur chargement factures', err)
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
    } catch (err) {
      setMessage({ text: 'Erreur de chargement du paiement', type: 'error' })
    } finally {
      setLoading(false)
    }
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
    if (!formData.methode) newErrors.methode = 'Méthode de paiement requise'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const payload = {
        ...formData,
        montant: parseFloat(formData.montant)
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
      const msg = err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || 'Erreur lors de l\'enregistrement'
      setMessage({ text: msg, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="bg-base-100 border-b sticky top-0 z-10 shadow-sm">
        <div className="px-6 py-4 flex items-center gap-4">
          <Link to="/paiements" className="btn btn-ghost btn-sm gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
          <div className="divider divider-horizontal h-6"></div>
          <CreditCard className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">{isEditMode ? 'Modifier le paiement' : 'Nouveau paiement'}</h1>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="max-w-3xl mx-auto">
          {message.text && (
            <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'} mb-4 shadow-lg`}>
              {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{message.text}</span>
            </div>
          )}

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  {/* Facture */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium flex items-center gap-1"><FileText className="w-4 h-4" /> Facture *</span>
                    </label>
                    <select
                      name="facture"
                      value={formData.facture}
                      onChange={handleChange}
                      className={`select select-bordered w-full ${errors.facture ? 'select-error' : ''}`}
                      disabled={isEditMode || loading}
                      required
                    >
                      <option value="">Sélectionner une facture</option>
                      {factures.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.reference} - {f.client_nom} - {f.total_ttc.toLocaleString()} FCFA (Reste: {f.montant_restant.toLocaleString()})
                        </option>
                      ))}
                    </select>
                    {errors.facture && <span className="text-error text-xs mt-1">{errors.facture}</span>}
                  </div>

                  {/* Montant */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium flex items-center gap-1"><DollarSign className="w-4 h-4" /> Montant *</span>
                    </label>
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
                  </div>

                  {/* Méthode */}
                  <div className="form-control">
                    <label className="label"><span className="label-text font-medium">Méthode de paiement *</span></label>
                    <select name="methode" value={formData.methode} onChange={handleChange} className="select select-bordered w-full" disabled={loading}>
                      {methodes.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>

                  {/* Référence externe */}
                  <div className="form-control">
                    <label className="label"><span className="label-text font-medium flex items-center gap-1"><Hash className="w-4 h-4" /> Référence externe</span></label>
                    <input
                      type="text"
                      name="reference_externe"
                      value={formData.reference_externe}
                      onChange={handleChange}
                      placeholder="N° chèque, virement, etc."
                      className="input input-bordered w-full"
                      disabled={loading}
                    />
                  </div>

                  {/* Notes */}
                  <div className="form-control">
                    <label className="label"><span className="label-text font-medium">Notes</span></label>
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

                <div className="flex gap-3 mt-6">
                  <button type="submit" disabled={loading} className="btn btn-primary flex-1 gap-2">
                    {loading ? <span className="loading loading-spinner loading-sm"></span> : <Save className="w-4 h-4" />}
                    {isEditMode ? 'Mettre à jour' : 'Enregistrer le paiement'}
                  </button>
                  <Link to="/paiements" className="btn btn-outline">Annuler</Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaiementForm