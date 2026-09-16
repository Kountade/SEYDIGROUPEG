// src/components/inventaire/AddStockToWarehouse.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Package, Warehouse, Building2, Save, X, ArrowLeft,
  AlertCircle, CheckCircle, Loader2, Search, Layers,
  Hash, DollarSign, RefreshCw, Info, AlertTriangle,
  ShieldCheck, Folder, Plus
} from 'lucide-react'

const AddStockToWarehouse = () => {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })

  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedWarehouse, setSelectedWarehouse] = useState(null)
  const [existingStock, setExistingStock] = useState(null)
  const [checkingStock, setCheckingStock] = useState(false)

  const [formData, setFormData] = useState({
    product_id: '',
    warehouse_id: '',
    quantity: '',
    notes: '',
    // Champs Lot
    create_lot: true,
    lot_number: '',
    serial_number: '',
    manufacturing_date: '',
    expiry_date: '',
    best_before_date: '',
    supplier: '',
    purchase_order: '',
    quality_status: 'good',
  })

  const [errors, setErrors] = useState({})
  const [step, setStep] = useState(1)

  // ===== NOTIFICATIONS =====
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4500)
  }

  // ===== CHARGEMENT =====
  const fetchData = async () => {
    setLoading(true)
    try {
      const [productsRes, warehousesRes] = await Promise.all([
        AxiosInstance.get('/products/'),
        AxiosInstance.get('/warehouses/'),
      ])
      setProducts(productsRes.data || [])
      setFilteredProducts(productsRes.data || [])
      setWarehouses(warehousesRes.data || [])
    } catch (error) {
      console.error(error)
      showNotification('Erreur de chargement des données', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // ===== FILTRE PRODUITS =====
  useEffect(() => {
    if (searchTerm) {
      const filtered = products.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setFilteredProducts(filtered)
    } else {
      setFilteredProducts(products)
    }
  }, [searchTerm, products])

  // ===== VÉRIF STOCK EXISTANT =====
  useEffect(() => {
    const checkExistingStock = async () => {
      if (formData.product_id && formData.warehouse_id) {
        setCheckingStock(true)
        try {
          const stockRes = await AxiosInstance.get(
            `/warehouse-stocks/by_product/?product_id=${formData.product_id}`
          )
          const stock = stockRes.data.find(
            s => s.warehouse === parseInt(formData.warehouse_id)
          )
          setExistingStock(stock || null)
        } catch (error) {
          console.error('Erreur vérification stock:', error)
          setExistingStock(null)
        } finally {
          setCheckingStock(false)
        }
      } else {
        setExistingStock(null)
      }
    }
    checkExistingStock()
  }, [formData.product_id, formData.warehouse_id])

  // ===== GÉNÉRATION NUMÉRO DE LOT =====
  const generateLotNumber = () => {
    const now = new Date()
    const ts = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0')
    return `LOT-${ts}`
  }

  // ===== HANDLE CHANGE =====
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const newValue = type === 'checkbox' ? checked : value

    setFormData(prev => ({ ...prev, [name]: newValue }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))

    if (name === 'create_lot' && checked && !formData.lot_number) {
      setFormData(prev => ({ ...prev, lot_number: generateLotNumber() }))
    }

    if (name === 'product_id') {
      const product = products.find(p => p.id === parseInt(value))
      setSelectedProduct(product || null)
      if (product) setStep(2)
    }
    if (name === 'warehouse_id') {
      const warehouse = warehouses.find(w => w.id === parseInt(value))
      setSelectedWarehouse(warehouse || null)
      if (warehouse) setStep(3)
    }
  }

  // ===== VALIDATION =====
  const validateForm = () => {
    const newErrors = {}

    if (!formData.product_id) newErrors.product_id = 'Sélectionnez un produit'
    if (!formData.warehouse_id) newErrors.warehouse_id = 'Sélectionnez un entrepôt'

    const qty = parseInt(formData.quantity)
    if (!formData.quantity || isNaN(qty) || qty <= 0) {
      newErrors.quantity = 'Quantité invalide (doit être > 0)'
    }

    if (formData.create_lot) {
      if (!formData.lot_number) {
        newErrors.lot_number = 'Le numéro de lot est requis'
      }
      if (!formData.expiry_date) {
        newErrors.expiry_date = "La date d'expiration est requise"
      } else {
        const expiry = new Date(formData.expiry_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (expiry < today) {
          newErrors.expiry_date = "La date d'expiration doit être future"
        }
      }
      if (formData.manufacturing_date && formData.expiry_date) {
        if (new Date(formData.manufacturing_date) >= new Date(formData.expiry_date)) {
          newErrors.expiry_date = "L'expiration doit être après la fabrication"
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ============================================================
  // ✅ SUBMIT CORRIGÉ : utilise TOUJOURS /add_stock/
  // ============================================================
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) {
      showNotification('Veuillez corriger les erreurs', 'error')
      return
    }

    setSubmitting(true)
    try {
      const quantity = parseInt(formData.quantity)

      // 1️⃣ Ajout du stock (additif — jamais refusé)
      const stockResponse = await AxiosInstance.post('/warehouse-stocks/add_stock/', {
        product_id: parseInt(formData.product_id),
        warehouse_id: parseInt(formData.warehouse_id),
        quantity: quantity,
        notes: formData.notes || `Ajout manuel de ${quantity} unités`,
        unit_price: getProductPrice(formData.product_id) || 0,
      })

      const stockData = stockResponse.data
      const stockMessage = stockData.was_created
        ? `Stock initialisé : ${quantity} unités`
        : `Stock mis à jour : ${stockData.old_quantity} → ${stockData.new_quantity} unités`

      // 2️⃣ Création du Lot si demandé
      if (formData.create_lot) {
        const lotPayload = {
          product: parseInt(formData.product_id),
          warehouse: parseInt(formData.warehouse_id),
          lot_number: formData.lot_number,
          serial_number: formData.serial_number || null,
          quantity: quantity,
          quality_status: formData.quality_status,
          manufacturing_date: formData.manufacturing_date || null,
          expiry_date: formData.expiry_date,
          best_before_date: formData.best_before_date || null,
          supplier: formData.supplier || null,
          purchase_order: formData.purchase_order || null,
          notes: formData.notes || null,
        }

        try {
          await AxiosInstance.post('/lots/', lotPayload)
          showNotification(
            `✅ ${stockMessage} + Lot "${formData.lot_number}" créé`,
            'success'
          )
        } catch (lotError) {
          console.error('Erreur création lot:', lotError)
          const lotErrMsg =
            lotError.response?.data?.lot_number?.[0] ||
            lotError.response?.data?.expiry_date?.[0] ||
            lotError.response?.data?.error ||
            'Erreur inconnue lors de la création du lot'
          showNotification(
            `⚠️ ${stockMessage} MAIS lot non créé : ${lotErrMsg}`,
            'warning'
          )
        }
      } else {
        showNotification(`✅ ${stockMessage}`, 'success')
      }

      setTimeout(() => navigate('/stocks'), 1800)
    } catch (error) {
      console.error(error)
      const msg =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        "Erreur lors de l'ajout"
      showNotification(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ===== HELPERS =====
  const getProductName = (id) => products.find(p => p.id === parseInt(id))?.name || ''
  const getProductRef = (id) => products.find(p => p.id === parseInt(id))?.reference || ''
  const getProductPrice = (id) => products.find(p => p.id === parseInt(id))?.price || 0
  const getWarehouseName = (id) => warehouses.find(w => w.id === parseInt(id))?.name || ''
  const getAgenceName = (id) => warehouses.find(w => w.id === parseInt(id))?.agence_nom || ''

  const formatCurrency = (amount) => new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount || 0)

  const formatNumber = (num) => new Intl.NumberFormat('fr-FR').format(num || 0)

  const resetForm = () => {
    setFormData({
      product_id: '', warehouse_id: '', quantity: '', notes: '',
      create_lot: true, lot_number: '', serial_number: '',
      manufacturing_date: '', expiry_date: '', best_before_date: '',
      supplier: '', purchase_order: '', quality_status: 'good',
    })
    setSelectedProduct(null)
    setSelectedWarehouse(null)
    setExistingStock(null)
    setSearchTerm('')
    setErrors({})
    setStep(1)
  }

  // ===== LOADING =====
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-6">
          <div className="loading loading-spinner loading-lg text-primary w-16 h-16"></div>
          <p className="text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement des données...
          </p>
        </div>
      </div>
    )
  }

  const projectedTotal = existingStock && formData.quantity
    ? existingStock.quantity + parseInt(formData.quantity || 0)
    : parseInt(formData.quantity || 0)

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-20 right-6 z-50 animate-slideDown">
          <div className={`alert ${
            notification.type === 'success' ? 'alert-success' :
            notification.type === 'warning' ? 'alert-warning' : 'alert-error'
          } shadow-lg`}>
            {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
             notification.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> :
             <AlertCircle className="w-5 h-5" />}
            <span className="font-semibold">{notification.message}</span>
            <button
              className="btn btn-ghost btn-xs btn-circle"
              onClick={() => setNotification({ ...notification, show: false })}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/stocks')} className="btn btn-ghost btn-circle btn-lg">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Ajouter du stock
            </h1>
            <p className="text-base text-base-content/60">
              Ajoutez des produits dans un entrepôt et créez un lot
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={resetForm} className="btn btn-outline gap-2">
            <RefreshCw className="w-4 h-4" /> Réinitialiser
          </button>
          <button onClick={() => navigate('/stocks')} className="btn btn-ghost gap-2">
            <Package className="w-4 h-4" /> Voir les stocks
          </button>
        </div>
      </div>

      {/* Étapes */}
      <div className="bg-base-100 rounded-xl shadow-md border border-base-300 p-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {[
            { n: 1, label: 'Produit' },
            { n: 2, label: 'Entrepôt' },
            { n: 3, label: 'Quantité' },
          ].map((s, idx) => (
            <React.Fragment key={s.n}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= s.n ? 'bg-primary text-primary-content' : 'bg-base-200 text-base-content/40'
                }`}>{s.n}</div>
                <span className={`text-sm font-medium ${step >= s.n ? 'text-base-content' : 'text-base-content/40'}`}>
                  {s.label}
                </span>
              </div>
              {idx < 2 && (
                <div className="flex-1 h-0.5 mx-2 bg-base-300">
                  <div className={`h-full bg-primary transition-all duration-500 ${step >= s.n + 1 ? 'w-full' : 'w-0'}`} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ===== ÉTAPE 1 : PRODUIT ===== */}
        <div className="bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden">
          <div className="p-5 border-b border-base-300 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Produit</h2>
                <p className="text-sm text-base-content/60">Sélectionnez le produit à approvisionner</p>
              </div>
              {selectedProduct && (
                <span className="badge badge-success gap-1 ml-auto">
                  <CheckCircle className="w-3 h-3" /> Sélectionné
                </span>
              )}
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="form-control">
              <label className="label font-medium">Rechercher un produit <span className="text-error">*</span></label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40" />
                <input
                  type="text"
                  className="input input-bordered w-full pl-12"
                  placeholder="Nom, référence ou catégorie..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <label className="label">
                <span className="label-text-alt text-base-content/50">
                  {filteredProducts.length} produit(s) trouvé(s)
                </span>
              </label>
            </div>

            <div className="form-control">
              <label className="label font-medium">Sélectionner le produit</label>
              <select
                name="product_id"
                value={formData.product_id}
                onChange={handleChange}
                className={`select select-bordered w-full ${errors.product_id ? 'select-error' : ''}`}
              >
                <option value="">Choisir un produit</option>
                {filteredProducts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.reference} - {p.name} {p.category ? `(${p.category})` : ''}
                  </option>
                ))}
              </select>
              {errors.product_id && (
                <span className="text-error text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.product_id}
                </span>
              )}
            </div>

            {selectedProduct && (
              <div className="bg-base-200 rounded-xl p-4 border border-base-300">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{selectedProduct.name}</h3>
                    <div className="flex flex-wrap gap-3 mt-1 text-sm">
                      <span className="flex items-center gap-1 text-base-content/60">
                        <Hash className="w-3 h-3" /> Réf: {selectedProduct.reference}
                      </span>
                      {selectedProduct.category && (
                        <span className="flex items-center gap-1 text-base-content/60">
                          <Folder className="w-3 h-3" /> {selectedProduct.category}
                        </span>
                      )}
                      {selectedProduct.price && (
                        <span className="flex items-center gap-1 text-success font-medium">
                          <DollarSign className="w-3 h-3" /> {formatCurrency(selectedProduct.price)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== ÉTAPE 2 : ENTREPÔT ===== */}
        <div className={`bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden transition-opacity duration-300 ${
          step < 2 ? 'opacity-50 pointer-events-none' : ''
        }`}>
          <div className="p-5 border-b border-base-300 bg-gradient-to-r from-secondary/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Warehouse className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Entrepôt</h2>
                <p className="text-sm text-base-content/60">Choisissez l'entrepôt de destination</p>
              </div>
              {selectedWarehouse && (
                <span className="badge badge-success gap-1 ml-auto">
                  <CheckCircle className="w-3 h-3" /> Sélectionné
                </span>
              )}
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="form-control">
              <label className="label font-medium">
                Entrepôt de destination <span className="text-error">*</span>
              </label>
              <select
                name="warehouse_id"
                value={formData.warehouse_id}
                onChange={handleChange}
                className={`select select-bordered w-full ${errors.warehouse_id ? 'select-error' : ''}`}
                disabled={!formData.product_id}
              >
                <option value="">Choisir un entrepôt</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.agence_nom ? `(${w.agence_nom})` : ''}
                  </option>
                ))}
              </select>
              {errors.warehouse_id && (
                <span className="text-error text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.warehouse_id}
                </span>
              )}
              {!formData.product_id && (
                <span className="text-warning text-xs mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Veuillez d'abord sélectionner un produit
                </span>
              )}
            </div>

            {selectedWarehouse && (
              <div className="bg-base-200 rounded-xl p-4 border border-base-300">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{selectedWarehouse.name}</h3>
                    {selectedWarehouse.agence_nom && (
                      <span className="flex items-center gap-1 text-sm text-base-content/60 mt-1">
                        <Building2 className="w-3 h-3" /> {selectedWarehouse.agence_nom}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {checkingStock && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="ml-2 text-sm text-base-content/60">Vérification du stock...</span>
              </div>
            )}

            {/* ✅ AFFICHAGE INFO STOCK (plus de blocage) */}
            {!checkingStock && formData.product_id && formData.warehouse_id && (
              <div className={`rounded-xl p-4 border ${
                existingStock
                  ? 'bg-info/10 border-info/20'
                  : 'bg-success/10 border-success/20'
              }`}>
                <div className="flex items-start gap-3">
                  <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    existingStock ? 'text-info' : 'text-success'
                  }`} />
                  <div className="flex-1">
                    {existingStock ? (
                      <>
                        <p className="text-sm font-medium">Stock existant</p>
                        <p className="text-sm text-base-content/70">
                          Ce produit est déjà présent avec{' '}
                          <span className="font-bold text-info">{formatNumber(existingStock.quantity)}</span> unités.
                        </p>
                        {formData.quantity && parseInt(formData.quantity) > 0 && (
                          <p className="text-sm text-base-content/70 mt-1">
                            Après ajout de{' '}
                            <span className="font-bold">{formatNumber(formData.quantity)}</span> :{' '}
                            <span className="font-bold text-primary text-base">
                              {formatNumber(projectedTotal)}
                            </span> unités.
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium">Nouveau stock</p>
                        <p className="text-sm text-base-content/70">
                          Aucun stock existant. Le stock sera créé avec{' '}
                          <span className="font-bold text-success">
                            {formatNumber(formData.quantity || 0)}
                          </span> unités.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== ÉTAPE 3 : QUANTITÉ ===== */}
        <div className={`bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden transition-opacity duration-300 ${
          step < 3 ? 'opacity-50 pointer-events-none' : ''
        }`}>
          <div className="p-5 border-b border-base-300 bg-gradient-to-r from-success/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <Layers className="w-5 h-5 text-success" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Quantité et détails</h2>
                <p className="text-sm text-base-content/60">Indiquez la quantité à AJOUTER</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="form-control">
              <label className="label font-medium">
                Quantité à ajouter <span className="text-error">*</span>
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="Ex: 100"
                className={`input input-bordered w-full text-lg ${errors.quantity ? 'input-error' : ''}`}
                disabled={!formData.warehouse_id}
                min="1"
                step="1"
              />
              {errors.quantity && (
                <span className="text-error text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.quantity}
                </span>
              )}
              {existingStock && formData.quantity && (
                <label className="label">
                  <span className="label-text-alt text-success flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    {formatNumber(existingStock.quantity)} + {formatNumber(formData.quantity)} ={' '}
                    <b>{formatNumber(projectedTotal)}</b> unités au total
                  </span>
                </label>
              )}
            </div>

            <div className="form-control">
              <label className="label font-medium">Notes (optionnel)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Raison de l'ajout, bon de livraison, fournisseur, etc."
                className="textarea textarea-bordered h-24 resize-none"
              />
            </div>
          </div>
        </div>

        {/* ===== SECTION LOT ===== */}
        <div className="bg-base-100 rounded-xl shadow-xl border-2 border-warning/30 overflow-hidden">
          <div className="p-5 border-b border-base-300 bg-gradient-to-r from-warning/10 to-transparent">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Lot & Traçabilité</h2>
                  <p className="text-sm text-base-content/60">
                    Numéro de lot, dates et informations fournisseur
                  </p>
                </div>
              </div>
              <label className="label cursor-pointer gap-3 bg-base-200 px-4 py-2 rounded-lg">
                <span className="label-text font-medium">Créer un lot</span>
                <input
                  type="checkbox"
                  name="create_lot"
                  checked={formData.create_lot}
                  onChange={handleChange}
                  className="toggle toggle-warning"
                />
              </label>
            </div>
          </div>

          {formData.create_lot && (
            <div className="p-6 space-y-5">
              {/* Numéro de lot + Série */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label font-medium">
                    Numéro de lot <span className="text-error">*</span>
                  </label>
                  <div className="join w-full">
                    <input
                      type="text"
                      name="lot_number"
                      value={formData.lot_number}
                      onChange={handleChange}
                      placeholder="Ex: LOT-20250115-001"
                      className={`input input-bordered join-item w-full font-mono ${errors.lot_number ? 'input-error' : ''}`}
                    />
                    <button
                      type="button"
                      className="btn btn-outline join-item"
                      onClick={() => setFormData(prev => ({ ...prev, lot_number: generateLotNumber() }))}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                  {errors.lot_number && (
                    <span className="text-error text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.lot_number}
                    </span>
                  )}
                </div>

                <div className="form-control">
                  <label className="label font-medium">Numéro de série (optionnel)</label>
                  <input
                    type="text"
                    name="serial_number"
                    value={formData.serial_number}
                    onChange={handleChange}
                    placeholder="Ex: SN-12345"
                    className="input input-bordered w-full font-mono"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-control">
                  <label className="label font-medium">Date de fabrication</label>
                  <input
                    type="date"
                    name="manufacturing_date"
                    value={formData.manufacturing_date}
                    onChange={handleChange}
                    className="input input-bordered w-full"
                  />
                </div>

                <div className="form-control">
                  <label className="label font-medium">
                    Date d'expiration <span className="text-error">*</span>
                  </label>
                  <input
                    type="date"
                    name="expiry_date"
                    value={formData.expiry_date}
                    onChange={handleChange}
                    className={`input input-bordered w-full ${errors.expiry_date ? 'input-error' : ''}`}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {errors.expiry_date && (
                    <span className="text-error text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.expiry_date}
                    </span>
                  )}
                </div>

                <div className="form-control">
                  <label className="label font-medium">Péremption optimale</label>
                  <input
                    type="date"
                    name="best_before_date"
                    value={formData.best_before_date}
                    onChange={handleChange}
                    className="input input-bordered w-full"
                  />
                </div>
              </div>

              {/* Statut qualité */}
              <div className="form-control">
                <label className="label font-medium">Statut qualité</label>
                <select
                  name="quality_status"
                  value={formData.quality_status}
                  onChange={handleChange}
                  className="select select-bordered w-full"
                >
                  <option value="good">✅ Bon</option>
                  <option value="quarantine">⚠️ En quarantaine</option>
                  <option value="damaged">❌ Endommagé</option>
                </select>
              </div>

              {/* Fournisseur */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label font-medium">Fournisseur</label>
                  <input
                    type="text"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleChange}
                    placeholder="Nom du fournisseur"
                    className="input input-bordered w-full"
                  />
                </div>

                <div className="form-control">
                  <label className="label font-medium">Bon de commande</label>
                  <input
                    type="text"
                    name="purchase_order"
                    value={formData.purchase_order}
                    onChange={handleChange}
                    placeholder="N° bon de commande"
                    className="input input-bordered w-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== RÉSUMÉ ===== */}
        {formData.product_id && formData.warehouse_id && formData.quantity && (
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-6 border border-primary/20">
            <h3 className="font-bold text-lg mb-4">Résumé de l'opération</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between border-b border-base-300 pb-2">
                  <span className="text-base-content/60">Produit :</span>
                  <span className="font-medium">{getProductName(formData.product_id)}</span>
                </div>
                <div className="flex justify-between border-b border-base-300 pb-2">
                  <span className="text-base-content/60">Référence :</span>
                  <span className="font-mono">{getProductRef(formData.product_id)}</span>
                </div>
                <div className="flex justify-between border-b border-base-300 pb-2">
                  <span className="text-base-content/60">Prix unitaire :</span>
                  <span className="font-medium">{formatCurrency(getProductPrice(formData.product_id))}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between border-b border-base-300 pb-2">
                  <span className="text-base-content/60">Entrepôt :</span>
                  <span className="font-medium">{getWarehouseName(formData.warehouse_id)}</span>
                </div>
                <div className="flex justify-between border-b border-base-300 pb-2">
                  <span className="text-base-content/60">Agence :</span>
                  <span className="font-medium">{getAgenceName(formData.warehouse_id)}</span>
                </div>
                <div className="flex justify-between border-b border-base-300 pb-2">
                  <span className="text-base-content/60">Quantité ajoutée :</span>
                  <span className="font-bold text-primary text-lg">
                    +{formatNumber(formData.quantity)} unités
                  </span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-base-content/60">Nouveau total :</span>
                  <span className="font-bold text-success text-lg">
                    {formatNumber(projectedTotal)} unités
                  </span>
                </div>
              </div>
            </div>

            {formData.create_lot && formData.lot_number && (
              <div className="mt-4 pt-4 border-t border-base-300">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-warning" />
                  <span className="font-bold text-sm">Informations du Lot</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-base-content/60">N° Lot :</span>
                    <span className="font-mono">{formData.lot_number}</span>
                  </div>
                  {formData.expiry_date && (
                    <div className="flex justify-between">
                      <span className="text-base-content/60">Expiration :</span>
                      <span className="font-medium">
                        {new Date(formData.expiry_date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== BOUTONS ===== */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/stocks')}
            className="btn btn-outline flex-1 gap-2"
          >
            <X className="w-4 h-4" /> Annuler
          </button>
          <button
            type="submit"
            disabled={submitting || !formData.product_id || !formData.warehouse_id || !formData.quantity}
            className="btn btn-primary flex-1 gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Ajout en cours...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {existingStock
                  ? `Ajouter ${formData.quantity || 0} unités`
                  : 'Ajouter au stock'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddStockToWarehouse