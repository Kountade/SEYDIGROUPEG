// src/components/inventaire/InventoryCountForm.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ArrowLeft, Save, X, ClipboardList, Loader2,
  AlertCircle, CheckCircle, Info
} from 'lucide-react'

const InventoryCountForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditMode = !!id

  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    warehouse: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'draft',
  })

  const [errors, setErrors] = useState({})
  const [notification, setNotification] = useState({
    show: false, message: '', type: 'success'
  })

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000)
  }

  useEffect(() => {
    const load = async () => {
      try {
        const whRes = await AxiosInstance.get('/warehouses/')
        setWarehouses(whRes.data?.results || whRes.data || [])

        if (isEditMode) {
          const invRes = await AxiosInstance.get(`/inventory-counts/${id}/`)
          const inv = invRes.data
          setFormData({
            warehouse: inv.warehouse?.id || inv.warehouse || '',
            scheduled_date: inv.scheduled_date || '',
            notes: inv.notes || '',
            status: inv.status || 'draft',
          })
        }
      } catch (err) {
        console.error('Erreur:', err)
        showNotification('Erreur de chargement', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, isEditMode])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
  }

  const validate = () => {
    const errs = {}
    if (!formData.warehouse) errs.warehouse = 'Sélectionnez un entrepôt'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) {
      showNotification('Corrigez les erreurs du formulaire', 'error')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        warehouse: parseInt(formData.warehouse),
        scheduled_date: formData.scheduled_date || null,
        notes: formData.notes || '',
        status: formData.status,
      }

      let response
      if (isEditMode) {
        response = await AxiosInstance.put(`/inventory-counts/${id}/`, payload)
      } else {
        response = await AxiosInstance.post('/inventory-counts/', payload)
      }

      showNotification(
        isEditMode ? 'Inventaire modifié' : 'Inventaire créé avec succès',
        'success'
      )

      setTimeout(() => {
        navigate(`/inventaire/inventory-counts/${response.data.id}`)
      }, 1200)
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.error
        || err.response?.data?.detail
        || 'Erreur lors de la sauvegarde'
      showNotification(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      {notification.show && (
        <div className="fixed top-20 right-6 z-50">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg`}>
            {notification.type === 'success'
              ? <CheckCircle className="w-5 h-5" />
              : <AlertCircle className="w-5 h-5" />}
            <span className="font-semibold">{notification.message}</span>
          </div>
        </div>
      )}

      <div className="mb-6">
        <Link
          to="/inventaire/inventory-counts"
          className="btn btn-ghost btn-sm gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux inventaires
        </Link>
        <h1 className="text-3xl font-black mt-3 flex items-center gap-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          <ClipboardList className="w-8 h-8 text-primary" />
          {isEditMode ? 'Modifier l\'inventaire' : 'Nouvel inventaire'}
        </h1>
        <p className="text-base-content/60 mt-1">
          Créez une session de comptage pour un entrepôt
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card bg-base-100 shadow-xl border border-base-300">
        <div className="card-body space-y-5">
          <div className="form-control">
            <label className="label font-medium">
              Entrepôt <span className="text-error">*</span>
            </label>
            <select
              name="warehouse"
              value={formData.warehouse}
              onChange={handleChange}
              className={`select select-bordered w-full ${errors.warehouse ? 'select-error' : ''}`}
              disabled={isEditMode}
            >
              <option value="">-- Sélectionner un entrepôt --</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.agence_nom ? `(${w.agence_nom})` : ''}
                </option>
              ))}
            </select>
            {errors.warehouse && (
              <span className="text-error text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.warehouse}
              </span>
            )}
            <span className="label-text-alt text-base-content/50 mt-1 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Tous les produits de cet entrepôt seront inclus dans le comptage
            </span>
          </div>

          <div className="form-control">
            <label className="label font-medium">Date planifiée</label>
            <input
              type="date"
              name="scheduled_date"
              value={formData.scheduled_date}
              onChange={handleChange}
              className="input input-bordered w-full"
            />
          </div>

          <div className="form-control">
            <label className="label font-medium">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
              placeholder="Motif, informations complémentaires..."
              className="textarea textarea-bordered resize-none"
            />
          </div>

          <div className="card-actions justify-end pt-4 border-t border-base-300">
            <Link to="/inventaire/inventory-counts" className="btn btn-ghost gap-2">
              <X className="w-4 h-4" /> Annuler
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary gap-2"
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>
                : <><Save className="w-4 h-4" /> {isEditMode ? 'Modifier' : 'Créer'}</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default InventoryCountForm