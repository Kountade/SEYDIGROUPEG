// src/components/comptabilite/EcritureForm.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ArrowLeft,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  Trash2,
  BookOpen,
  Calendar,
  FileText,
  Hash,
  Building2,
  DollarSign,
  User,
  Notebook,
  Info,
  HelpCircle,
  Minus,
  PlusCircle,
  Search as SearchIcon
} from 'lucide-react'

const EcritureForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [journaux, setJournaux] = useState([])
  const [comptes, setComptes] = useState([])
  const [agenceId, setAgenceId] = useState(null)
  const [totalDebit, setTotalDebit] = useState(0)
  const [totalCredit, setTotalCredit] = useState(0)
  const [estEquilibree, setEstEquilibree] = useState(true)
  
  const [formData, setFormData] = useState({
    journal: '',
    agence: '',
    date_ecriture: new Date().toISOString().split('T')[0],
    date_comptable: new Date().toISOString().split('T')[0],
    libelle: '',
    piece_justificative: '',
    notes: '',
    lignes: [
      { compte: '', debit: 0, credit: 0, libelle: '' }
    ]
  })

  // Récupérer l'agence courante
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('User') || '{}')
    if (userData.agence_principale) {
      setAgenceId(userData.agence_principale.id)
      setFormData(prev => ({ ...prev, agence: userData.agence_principale.id }))
    }
  }, [])

  // Charger les données
  useEffect(() => {
    fetchJournaux()
    fetchComptes()
    if (isEditing) {
      fetchEcriture()
    }
  }, [id])

  const fetchJournaux = async () => {
    try {
      const response = await AxiosInstance.get('/journaux/')
      setJournaux(response.data || [])
    } catch (error) {
      console.error('Erreur chargement journaux:', error)
    }
  }

  const fetchComptes = async () => {
    try {
      const response = await AxiosInstance.get('/plan-comptable/?is_active=true')
      setComptes(response.data || [])
    } catch (error) {
      console.error('Erreur chargement comptes:', error)
    }
  }

  const fetchEcriture = async () => {
    setLoading(true)
    try {
      const response = await AxiosInstance.get(`/ecritures/${id}/`)
      const data = response.data
      setFormData({
        journal: data.journal || '',
        agence: data.agence || agenceId || '',
        date_ecriture: data.date_ecriture || new Date().toISOString().split('T')[0],
        date_comptable: data.date_comptable || new Date().toISOString().split('T')[0],
        libelle: data.libelle || '',
        piece_justificative: data.piece_justificative || '',
        notes: data.notes || '',
        lignes: data.lignes && data.lignes.length > 0 
          ? data.lignes.map(l => ({ 
              compte: l.compte || '', 
              debit: parseFloat(l.debit) || 0, 
              credit: parseFloat(l.credit) || 0, 
              libelle: l.libelle || '' 
            }))
          : [{ compte: '', debit: 0, credit: 0, libelle: '' }]
      })
      calculateTotals(data.lignes || [])
    } catch (error) {
      console.error('Erreur chargement écriture:', error)
      setError('Erreur de chargement de l\'écriture')
    } finally {
      setLoading(false)
    }
  }

  const calculateTotals = (lignes) => {
    let debit = 0
    let credit = 0
    lignes.forEach(l => {
      debit += parseFloat(l.debit) || 0
      credit += parseFloat(l.credit) || 0
    })
    setTotalDebit(debit)
    setTotalCredit(credit)
    setEstEquilibree(debit === credit)
  }

  const handleLigneChange = (index, field, value) => {
    const newLignes = [...formData.lignes]
    newLignes[index][field] = value
    setFormData(prev => ({ ...prev, lignes: newLignes }))
    calculateTotals(newLignes)
  }

  const addLigne = () => {
    setFormData(prev => ({
      ...prev,
      lignes: [...prev.lignes, { compte: '', debit: 0, credit: 0, libelle: '' }]
    }))
  }

  const removeLigne = (index) => {
    if (formData.lignes.length <= 1) return
    const newLignes = formData.lignes.filter((_, i) => i !== index)
    setFormData(prev => ({ ...prev, lignes: newLignes }))
    calculateTotals(newLignes)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    if (!formData.journal) {
      setError('Le journal est requis')
      setSaving(false)
      return
    }
    if (!formData.libelle) {
      setError('Le libellé est requis')
      setSaving(false)
      return
    }
    if (!estEquilibree) {
      setError('L\'écriture n\'est pas équilibrée. Total débit ≠ Total crédit')
      setSaving(false)
      return
    }

    try {
      const dataToSend = {
        ...formData,
        lignes: formData.lignes.map(l => ({
          compte: l.compte,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          libelle: l.libelle || ''
        }))
      }

      if (isEditing) {
        await AxiosInstance.put(`/ecritures/${id}/`, dataToSend)
      } else {
        await AxiosInstance.post('/ecritures/', dataToSend)
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/ecritures')
      }, 1500)
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      if (error.response?.data) {
        const errors = error.response.data
        if (typeof errors === 'object') {
          const messages = Object.entries(errors)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join('\n')
          setError(messages)
        } else {
          setError('Erreur lors de la sauvegarde')
        }
      } else {
        setError('Erreur de connexion au serveur')
      }
    } finally {
      setSaving(false)
    }
  }

  const getCompteLabel = (compteId) => {
    const compte = comptes.find(c => c.id === compteId)
    return compte ? `${compte.code} - ${compte.nom}` : ''
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-base-200">
        <div className="text-center space-y-4">
          <div className="loading loading-spinner loading-lg text-primary w-12 h-12 sm:w-16 sm:h-16"></div>
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement de l'écriture...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 bg-base-200 min-h-screen">
      
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => navigate('/ecritures')}
            className="btn btn-ghost btn-sm gap-2 hover:bg-base-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-base-content">
              {isEditing ? 'Modifier l\'écriture' : 'Nouvelle écriture'}
            </h1>
            <p className="text-xs sm:text-sm text-base-content/60 mt-1">
              {isEditing 
                ? 'Modifiez les informations de l\'écriture comptable'
                : 'Créez une nouvelle écriture comptable'
              }
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/ecritures')}
            className="btn btn-ghost gap-2 btn-sm sm:btn-md"
          >
            <X className="w-4 h-4" />
            Annuler
          </button>
          <button
            type="submit"
            form="ecriture-form"
            className="btn btn-success gap-2 btn-sm sm:btn-md shadow-lg shadow-success/20 hover:shadow-success/30 transition-all"
            disabled={saving || !estEquilibree}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditing ? 'Mettre à jour' : 'Créer'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Succès */}
      {success && (
        <div className="alert alert-success shadow-lg animate-slideDown">
          <CheckCircle className="w-5 h-5" />
          <div>
            <span className="font-bold">
              {isEditing ? 'Écriture modifiée' : 'Écriture créée'} avec succès !
            </span>
            <p className="text-sm opacity-80">Redirection vers la liste...</p>
          </div>
          <button 
            className="btn btn-ghost btn-sm btn-circle"
            onClick={() => setSuccess(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="alert alert-error shadow-lg animate-slideDown">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Erreur</span>
            <pre className="text-sm whitespace-pre-wrap mt-1">{error}</pre>
          </div>
          <button 
            className="btn btn-ghost btn-sm btn-circle"
            onClick={() => setError(null)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Formulaire */}
      <form id="ecriture-form" onSubmit={handleSubmit} className="bg-base-100 rounded-xl shadow-lg border border-base-200 overflow-hidden">
        <div className="p-4 sm:p-6 space-y-6">
          
          {/* Journal, Date, Libellé */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Journal
                  <span className="text-error">*</span>
                </span>
              </label>
              <select
                name="journal"
                value={formData.journal}
                onChange={(e) => setFormData(prev => ({ ...prev, journal: e.target.value }))}
                className="select select-bordered w-full focus:select-primary transition-all"
                required
                disabled={isEditing}
              >
                <option value="">Sélectionner un journal</option>
                {journaux.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.code} - {j.nom} ({j.agence_nom})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Date d'écriture
                  <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="date"
                name="date_ecriture"
                value={formData.date_ecriture}
                onChange={(e) => setFormData(prev => ({ ...prev, date_ecriture: e.target.value }))}
                className="input input-bordered w-full focus:input-primary transition-all"
                required
              />
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
                onChange={(e) => setFormData(prev => ({ ...prev, piece_justificative: e.target.value }))}
                className="input input-bordered w-full focus:input-primary transition-all"
              />
            </div>
          </div>

          {/* Libellé et Notes */}
          <div className="grid grid-cols-1 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <Notebook className="w-4 h-4 text-primary" />
                  Libellé
                  <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                name="libelle"
                placeholder="Libellé de l'écriture..."
                value={formData.libelle}
                onChange={(e) => setFormData(prev => ({ ...prev, libelle: e.target.value }))}
                className="input input-bordered w-full focus:input-primary transition-all"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  Notes
                </span>
              </label>
              <textarea
                name="notes"
                placeholder="Notes supplémentaires..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="textarea textarea-bordered w-full h-20 focus:textarea-primary transition-all resize-none"
              />
            </div>
          </div>

          {/* Lignes d'écriture */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Lignes d'écriture
                <span className="badge badge-ghost badge-xs">
                  {formData.lignes.length} ligne(s)
                </span>
              </h3>
              <button
                type="button"
                onClick={addLigne}
                className="btn btn-primary btn-sm gap-1"
              >
                <Plus className="w-4 h-4" />
                Ajouter
              </button>
            </div>

            {/* En-tête du tableau */}
            <div className="grid grid-cols-12 gap-2 mb-2 px-2">
              <div className="col-span-5 text-xs font-semibold text-base-content/60">Compte</div>
              <div className="col-span-3 text-xs font-semibold text-base-content/60">Débit</div>
              <div className="col-span-3 text-xs font-semibold text-base-content/60">Crédit</div>
              <div className="col-span-1"></div>
            </div>

            {/* Lignes */}
            {formData.lignes.map((ligne, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-5">
                  <select
                    value={ligne.compte}
                    onChange={(e) => handleLigneChange(index, 'compte', parseInt(e.target.value))}
                    className="select select-bordered w-full select-sm focus:select-primary transition-all"
                  >
                    <option value="">Sélectionner un compte</option>
                    {comptes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={ligne.debit || ''}
                    onChange={(e) => handleLigneChange(index, 'debit', parseFloat(e.target.value) || 0)}
                    className="input input-bordered w-full input-sm focus:input-primary transition-all"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={ligne.credit || ''}
                    onChange={(e) => handleLigneChange(index, 'credit', parseFloat(e.target.value) || 0)}
                    className="input input-bordered w-full input-sm focus:input-primary transition-all"
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

            {/* Total et équilibre */}
            <div className="mt-4 p-3 bg-base-200/50 rounded-lg">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-base-content/60">Total débit</p>
                  <p className="text-lg font-bold text-success">{totalDebit.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-base-content/60">Total crédit</p>
                  <p className="text-lg font-bold text-error">{totalCredit.toFixed(2)}</p>
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
                        <span className="text-sm font-medium text-error">Non équilibrée</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default EcritureForm