// src/components/sales/DevisForm.jsx
import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Save, X, ArrowLeft, Plus, Minus, Trash2, User, FileText,
  CheckCircle, AlertCircle, Loader2, Building2, Package, Calendar
} from 'lucide-react'

const DevisForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id

  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [products, setProducts] = useState([])
  const [clients, setClients] = useState([])
  const [agence, setAgence] = useState(null)
  const [selectedClient, setSelectedClient] = useState(null)
  const [showClientModal, setShowClientModal] = useState(false)
  const [expirationDate, setExpirationDate] = useState('')
  const [notes, setNotes] = useState('')
  const [conditions, setConditions] = useState('')
  const [piedDePage, setPiedDePage] = useState('')
  const [items, setItems] = useState([])
  const [totals, setTotals] = useState({ sous_total: 0, tva: 0, total: 0 })
  const [notification, setNotification] = useState({
    show: false, message: '', type: 'success', details: null
  })

  const cacheRef = useRef(new Map())
  const fetchingRef = useRef(false)

  const unwrap = (data) => Array.isArray(data) ? data : (data?.results || [])

  const showNotification = (message, type = 'success', details = null) => {
    setNotification({ show: true, message, type, details })
    setTimeout(() => setNotification({
      show: false, message: '', type: 'success', details: null
    }), 8000)
  }

  // ---------- Chargement initial ----------
  useEffect(() => {
    if (fetchingRef.current) return
    fetchingRef.current = true

    const loadAll = async () => {
      setLoading(true)
      try {
        // 1) User + agence
        let userData
        if (cacheRef.current.has('user_me')) {
          userData = cacheRef.current.get('user_me')
        } else {
          const res = await AxiosInstance.get('/users/me/')
          userData = res.data || {}
          cacheRef.current.set('user_me', userData)
        }

        const agencesUser = unwrap(userData.agences || [])
        let agenceUtilisateur = agencesUser[0]

        if (!agenceUtilisateur) {
          let agencesList
          if (cacheRef.current.has('agences_list')) {
            agencesList = cacheRef.current.get('agences_list')
          } else {
            const res = await AxiosInstance.get('/agences/?page_size=200')
            agencesList = unwrap(res.data)
            cacheRef.current.set('agences_list', agencesList)
          }
          if (agencesList.length > 0) agenceUtilisateur = agencesList[0]
        }

        setAgence(agenceUtilisateur)

        // 2) Clients + produits en parallèle (cache)
        const [clientsData, productsData] = await Promise.all([
          cacheRef.current.has('clients_active')
            ? Promise.resolve(cacheRef.current.get('clients_active'))
            : AxiosInstance.get('/clients/?is_active=true&page_size=500').then(r => {
                const d = unwrap(r.data)
                cacheRef.current.set('clients_active', d)
                return d
              }),
          cacheRef.current.has('products_active')
            ? Promise.resolve(cacheRef.current.get('products_active'))
            : AxiosInstance.get('/products/?is_active=true&page_size=500').then(r => {
                const d = unwrap(r.data)
                cacheRef.current.set('products_active', d)
                return d
              }),
        ])

        setClients(clientsData)
        setProducts(productsData)

        // 3) Édition
        if (isEditing) {
          const devisRes = await AxiosInstance.get(`/devis/${id}/`)
          const devis = devisRes.data

          if (devis.agence && agenceUtilisateur && devis.agence.id !== agenceUtilisateur.id) {
            showNotification(
              `Ce devis appartient à l'agence "${devis.agence.nom}". Consultation uniquement.`,
              'warning'
            )
          }

          setSelectedClient(devis.client || null)
          setExpirationDate(devis.date_expiration?.split('T')[0] || '')
          setNotes(devis.notes || '')
          setConditions(devis.conditions || '')
          setPiedDePage(devis.pied_de_page || '')

          const cartItems = (devis.items || []).map(item => ({
            id: item.id || Date.now() + Math.random(),
            product_id: item.product?.id || item.product,
            product_name: item.product_name,
            product_reference: item.product_reference,
            quantity: item.quantity,
            unit_price: Number(item.prix_unitaire) || 0,
            total: Number(item.total) || 0,
          }))
          setItems(cartItems)
          recalculTotaux(cartItems)
        }
      } catch (err) {
        console.error(err)
        showNotification('Erreur de chargement des données', 'error')
      } finally {
        setLoading(false)
        setInitialLoad(false)
        fetchingRef.current = false
      }
    }

    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditing])

  // ---------- Helpers ----------
  const isProductAlreadyAdded = (productId) =>
    items.some(item => item.product_id === productId)

  const handleAddItem = () => {
    const available = products.filter(p => !isProductAlreadyAdded(p.id))
    if (available.length === 0) {
      showNotification('Tous les produits sont déjà dans la liste', 'warning')
      return
    }
    const first = available[0]
    const updatedItems = [...items, {
      id: Date.now(),
      product_id: first.id,
      product_name: first.name,
      product_reference: first.reference || '',
      quantity: 1,
      unit_price: Number(first.sale_price) || 0,
      total: Number(first.sale_price) || 0,
    }]
    setItems(updatedItems)
    recalculTotaux(updatedItems)
  }

  const handleRemoveItem = (itemId) => {
    const updated = items.filter(item => item.id !== itemId)
    setItems(updated)
    recalculTotaux(updated)
  }

  const handleItemChange = (itemId, field, value) => {
    const updated = items.map(item => {
      if (item.id !== itemId) return item
      const next = { ...item, [field]: value }

      if (field === 'product_id') {
        const product = products.find(p => p.id === parseInt(value))
        if (!product) return item
        if (items.some(o => o.id !== itemId && o.product_id === parseInt(value))) {
          showNotification(`"${product.name}" est déjà dans la liste`, 'warning')
          return item
        }
        next.product_name = product.name
        next.product_reference = product.reference || ''
        next.unit_price = Number(product.sale_price) || 0
      }

      if (['quantity', 'unit_price', 'product_id'].includes(field)) {
        const qty = Number(next.quantity) || 0
        const price = Number(next.unit_price) || 0
        next.total = qty * price
      }
      return next
    })
    setItems(updated)
    recalculTotaux(updated)
  }

  const recalculTotaux = (itemsList) => {
    const sous_total = itemsList.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
    const tva = sous_total * 0.18
    const total = sous_total + tva
    setTotals({ sous_total, tva, total })
  }

  // ---------- Submit ----------
  const handleSubmit = async () => {
    if (!agence) {
      showNotification('Agence non trouvée', 'error')
      return
    }
    if (items.length === 0) {
      showNotification('Ajoutez au moins un produit', 'error')
      return
    }
    if (!expirationDate) {
      showNotification("Date d'expiration requise", 'error')
      return
    }

    const productIds = items.map(item => item.product_id)
    if (new Set(productIds).size !== productIds.length) {
      showNotification('Produits dupliqués. Corrigez la liste.', 'error')
      return
    }

    setSubmitting(true)
    const payload = {
      agence: agence.id,
      client_id: selectedClient?.id || null,
      date_expiration: expirationDate,
      notes,
      conditions,
      pied_de_page: piedDePage,
      items: items.map(item => ({
        product: parseInt(item.product_id),
        quantity: item.quantity,
        prix_unitaire: item.unit_price,
        tva: item.unit_price * 0.18,
        remise: 0,
      })),
    }

    try {
      if (isEditing) {
        await AxiosInstance.put(`/devis/${id}/`, payload)
        showNotification('Devis modifié avec succès', 'success')
      } else {
        await AxiosInstance.post('/devis/', payload)
        showNotification('Devis créé avec succès', 'success')
      }
      cacheRef.current.clear()
      setTimeout(() => navigate('/devis'), 1500)
    } catch (error) {
      console.error(error)
      const d = error.response?.data
      let msg = "Erreur lors de l'enregistrement"
      if (typeof d === 'string') msg = d
      else if (d?.error) msg = d.error
      else if (d?.detail) msg = d.detail
      else if (d?.items) msg = 'Erreur articles : ' + JSON.stringify(d.items)
      showNotification(msg, 'error', d)
    } finally {
      setSubmitting(false)
    }
  }

  const formatPrice = (price) => {
    const n = Number(price)
    if (!Number.isFinite(n)) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
  }

  const getAvailableProducts = () => {
    const selectedIds = items.map(item => item.product_id)
    return products.filter(p => !selectedIds.includes(p.id))
  }

  // ---------- Premier chargement ----------
  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="text-base font-medium text-base-content/70 animate-pulse">
            Chargement du formulaire...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-0 lg:px-0 py-4 lg:py-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-16 lg:top-20 right-3 lg:right-6 z-50 animate-slideDown w-[calc(100%-1.5rem)] lg:w-auto max-w-md">
          <div className={`alert ${
            notification.type === 'success' ? 'alert-success'
            : notification.type === 'warning' ? 'alert-warning'
            : 'alert-error'
          } shadow-lg`}>
            {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm lg:text-base font-medium whitespace-pre-line">
              {notification.message}
            </span>
            {notification.details && (
              <details className="text-xs">
                <summary className="cursor-pointer">Détails</summary>
                <pre className="mt-1 p-1 bg-black/5 rounded overflow-auto max-h-40">
                  {JSON.stringify(notification.details, null, 2)}
                </pre>
              </details>
            )}
            <button
              className="btn btn-ghost btn-xs btn-circle"
              onClick={() => setNotification({ show: false, message: '', type: 'success', details: null })}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent py-5 px-4 lg:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-xl">
                <FileText className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-primary">
                {isEditing ? 'Modifier le devis' : 'Nouveau devis'}
              </h1>
            </div>
            <p className="text-sm text-base-content/60 ml-1">
              {agence ? `Agence : ${agence.nom}` : 'Agence non définie'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => navigate('/devis')} className="btn btn-outline btn-sm lg:btn-md gap-2">
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn btn-primary btn-sm lg:btn-md gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEditing ? 'Mettre à jour' : 'Créer le devis'}
            </button>
          </div>
        </div>
      </div>

      {/* Carte principale */}
      <div className="max-w-full mx-0 px-4 lg:px-6">
        <div className="bg-white rounded-xl shadow-xl border border-base-200 overflow-hidden">
          <div className="p-4 lg:p-6">
            {/* Infos générales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" /> Agence
                  </span>
                </label>
                <div className="bg-gray-100 rounded-lg p-2 px-3 border border-gray-200 h-12 flex items-center">
                  <p className="font-medium">{agence?.nom || 'Chargement...'}</p>
                </div>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Client
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input input-bordered flex-1"
                    value={selectedClient
                      ? `${selectedClient.nom} ${selectedClient.prenom || ''}`.trim()
                      : 'Client anonyme'}
                    readOnly
                  />
                  <button
                    type="button"
                    className="btn btn-outline gap-1"
                    onClick={() => setShowClientModal(true)}
                  >
                    <User className="w-4 h-4" /> {selectedClient ? 'Changer' : 'Ajouter'}
                  </button>
                </div>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Expiration <span className="text-error">*</span>
                  </span>
                </label>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={expirationDate}
                  onChange={e => setExpirationDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Articles */}
            <div className="border-t border-base-300 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Articles
                  <span className="badge badge-primary badge-sm">{items.length}</span>
                </h3>
                <div className="flex gap-2">
                  <span className="text-xs text-gray-500 self-center">
                    {getAvailableProducts().length} produits disponibles
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm gap-2"
                    onClick={handleAddItem}
                    disabled={submitting || getAvailableProducts().length === 0}
                  >
                    <Plus className="w-4 h-4" /> Ajouter une ligne
                  </button>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-500">Aucun article ajouté</p>
                  <p className="text-sm text-gray-400">Cliquez sur "Ajouter une ligne" pour commencer</p>
                </div>
              ) : (
                <>
                  {items.map((item, index) => (
                    <div key={item.id} className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-sm">Ligne #{index + 1}</span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <div className="form-control w-full md:col-span-2">
                          <label className="label">
                            <span className="label-text text-sm font-semibold">Produit</span>
                          </label>
                          <select
                            className="select select-bordered w-full"
                            value={item.product_id || ''}
                            onChange={(e) => handleItemChange(item.id, 'product_id', parseInt(e.target.value))}
                            disabled={submitting}
                          >
                            <option value="">Sélectionner un produit</option>
                            {products.map(p => {
                              const isSel = items.some(o => o.id !== item.id && o.product_id === p.id)
                              return (
                                <option key={p.id} value={p.id} disabled={isSel}>
                                  {p.name} - {p.reference}
                                  {isSel && ' ⚠️ déjà ajouté'}
                                </option>
                              )
                            })}
                          </select>
                        </div>

                        <div className="form-control w-full">
                          <label className="label">
                            <span className="label-text text-sm font-semibold">Qté</span>
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              className="btn btn-ghost btn-xs btn-square"
                              onClick={() => handleItemChange(item.id, 'quantity', Math.max(1, item.quantity - 1))}
                              disabled={item.quantity <= 1 || submitting}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              className="input input-bordered w-full text-center"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                              min="1"
                              disabled={submitting}
                            />
                            <button
                              className="btn btn-ghost btn-xs btn-square"
                              onClick={() => handleItemChange(item.id, 'quantity', item.quantity + 1)}
                              disabled={submitting}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="form-control w-full">
                          <label className="label">
                            <span className="label-text text-sm font-semibold">Prix unit.</span>
                          </label>
                          <input
                            type="number"
                            className="input input-bordered w-full"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            disabled={submitting}
                          />
                        </div>

                        <div className="form-control w-full">
                          <label className="label">
                            <span className="label-text text-sm font-semibold text-primary">Total</span>
                          </label>
                          <div className="h-10 flex items-center justify-end px-3 bg-primary/5 rounded-lg border border-primary/20">
                            <span className="font-bold text-primary">{formatPrice(item.total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="text-right pt-4 border-t border-gray-200">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Sous-total HT</span>
                        <span className="font-semibold">{formatPrice(totals.sous_total)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-success">
                        <span className="text-gray-600">TVA (18%)</span>
                        <span>{formatPrice(totals.tva)}</span>
                      </div>
                      <div className="flex justify-between text-xl font-bold">
                        <span>Total TTC</span>
                        <span className="text-primary">{formatPrice(totals.total)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Conditions / notes / pied de page */}
            <div className="space-y-4 mt-6 border-t border-base-300 pt-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Conditions générales</span>
                </label>
                <textarea
                  className="textarea textarea-bordered"
                  rows="3"
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  placeholder="Conditions générales du devis..."
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Notes internes</span>
                </label>
                <textarea
                  className="textarea textarea-bordered"
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes internes..."
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Pied de page</span>
                </label>
                <textarea
                  className="textarea textarea-bordered"
                  rows="2"
                  value={piedDePage}
                  onChange={(e) => setPiedDePage(e.target.value)}
                  placeholder="Pied de page du devis..."
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 p-4 lg:p-6 bg-base-200/50 border-t border-base-200">
            <button className="btn btn-ghost gap-2" onClick={() => navigate('/devis')}>
              Annuler
            </button>
            <button
              className="btn btn-primary gap-2"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEditing ? 'Mettre à jour' : 'Créer le devis'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal client */}
      {showClientModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Sélectionner un client</h3>
              <button
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => setShowClientModal(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <button
                className="w-full text-left p-3 bg-gray-100 rounded-lg hover:bg-primary/10 transition"
                onClick={() => { setSelectedClient(null); setShowClientModal(false) }}
              >
                <div className="font-semibold">Client anonyme</div>
                <div className="text-xs text-gray-500">Devis sans client enregistré</div>
              </button>
              {clients.map(client => (
                <button
                  key={client.id}
                  className="w-full text-left p-3 bg-gray-100 rounded-lg hover:bg-primary/10 transition"
                  onClick={() => { setSelectedClient(client); setShowClientModal(false) }}
                >
                  <div className="font-semibold">
                    {client.nom} {client.prenom || ''}
                  </div>
                  <div className="text-xs text-gray-500">{client.telephone}</div>
                </button>
              ))}
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowClientModal(false)}>
                Fermer
              </button>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/clients/nouveau')}
              >
                <Plus className="w-4 h-4" /> Nouveau client
              </button>
            </div>
          </div>
        </div>
      )}

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

export default DevisForm