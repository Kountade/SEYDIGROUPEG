// src/components/ventes/VentesList.jsx
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import Livraison from './Livraison'
import TicketPOS from './TicketPOS'
import {
  ShoppingCart, Eye, CheckCircle, XCircle, Clock, Search, RefreshCw,
  Filter, Calendar, TrendingUp, AlertCircle, ChevronLeft, ChevronRight,
  Users, FileText, CreditCard, X, Download, Printer, Plus, DollarSign,
  AlertTriangle, ArrowUpDown, ChevronUp, ChevronDown, Trash2,
  Truck, Loader2, Package, User, Check, MoreVertical, LayoutGrid,
  List, Receipt, FileCheck, Info, Wallet, Banknote, Landmark, Smartphone
} from 'lucide-react'

const VentesList = () => {
  const navigate = useNavigate()

  // ---------- États ----------
  const [ventes, setVentes] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [generatingBl, setGeneratingBl] = useState(null)
  const [generatingTicket, setGeneratingTicket] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [viewMode, setViewMode] = useState('table')
  const [sortField, setSortField] = useState('date_vente')
  const [sortDirection, setSortDirection] = useState('desc')
  const [currentUser, setCurrentUser] = useState(null)
  const [userRoles, setUserRoles] = useState({ est_pdg: false, est_chef_agence: false })

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [venteToDelete, setVenteToDelete] = useState(null)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [venteToApprove, setVenteToApprove] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  // Paiement
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [venteToPay, setVenteToPay] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('especes')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [processingPayment, setProcessingPayment] = useState(false)
  const [destinations, setDestinations] = useState({ caisses: [], comptes_bancaires: [] })
  const [selectedCaisse, setSelectedCaisse] = useState('')
  const [selectedCompte, setSelectedCompte] = useState('')
  const [loadingDestinations, setLoadingDestinations] = useState(false)

  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })

  // Refs
  const cacheRef = useRef(new Map())
  const fetchingRef = useRef(false)

  // Stats
  const [stats, setStats] = useState({
    total: 0, pending: 0, approved: 0, completed: 0, rejected: 0,
    cancelled: 0, totalCA: 0, totalPaid: 0, totalUnpaid: 0,
    countPaid: 0, countUnpaid: 0
  })

  // ---------- Config ----------
  const statusConfig = {
    draft: { label: 'Brouillon', icon: Clock, color: 'text-gray-500', bgColor: 'bg-gray-100', borderColor: 'border-gray-200' },
    pending_approval: { label: 'En attente', icon: Clock, color: 'text-orange-600', bgColor: 'bg-orange-100', borderColor: 'border-orange-200' },
    approved: { label: 'Approuvée', icon: CheckCircle, color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-200' },
    rejected: { label: 'Rejetée', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-200' },
    completed: { label: 'Complétée', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100', borderColor: 'border-green-200' },
    cancelled: { label: 'Annulée', icon: XCircle, color: 'text-gray-500', bgColor: 'bg-gray-100', borderColor: 'border-gray-200' }
  }

  const paymentMethods = [
    { value: 'especes', label: 'Espèces', icon: Banknote, color: 'text-green-600' },
    { value: 'carte', label: 'Carte bancaire', icon: CreditCard, color: 'text-blue-600' },
    { value: 'cheque', label: 'Chèque', icon: FileCheck, color: 'text-purple-600' },
    { value: 'virement', label: 'Virement', icon: Landmark, color: 'text-indigo-600' },
    { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone, color: 'text-orange-600' },
    { value: 'autre', label: 'Autre', icon: Wallet, color: 'text-gray-600' }
  ]

  // ---------- Helpers ----------
  const unwrap = (data) => Array.isArray(data) ? data : (data?.results || [])

  const formatPrice = (price) => {
    const n = parseFloat(price)
    if (!Number.isFinite(n)) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000)
  }

  // ---------- Fetch user ----------
  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await AxiosInstance.get('/users/me/')
      const userData = response.data
      setCurrentUser(userData)
      const isPDG = userData.role_global === 'pdg' || userData.is_superuser === true
      const isChefAgence = userData.roles_agence?.some(r => r.role === 'chef_agence') || false
      setUserRoles({ est_pdg: isPDG, est_chef_agence: isChefAgence })
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error)
    }
  }, [])

  // ---------- Fetch ventes ----------
  const fetchVentes = useCallback(async ({ bypassCache = false } = {}) => {
    const key = 'ventes_list'

    if (!bypassCache && cacheRef.current.has(key)) {
      const c = cacheRef.current.get(key)
      setVentes(c.ventes)
      setStats(c.stats)
      setLoading(false)
      setInitialLoad(false)
      return
    }

    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)

    try {
      // ✅ page_size=200 pour compatibilité + unwrap paginé
      const response = await AxiosInstance.get('/ventes/?page_size=200')
      const data = unwrap(response.data)

      // ✅ Sécurité : vérifier que chaque vente est un objet
      const cleanData = data.filter(v => v && typeof v === 'object')

      setVentes(cleanData)

      // Stats
      const total = cleanData.length
      const pending = cleanData.filter(v => v.status === 'pending_approval').length
      const approved = cleanData.filter(v => v.status === 'approved').length
      const completed = cleanData.filter(v => v.status === 'completed').length
      const rejected = cleanData.filter(v => v.status === 'rejected').length
      const cancelled = cleanData.filter(v => v.status === 'cancelled').length
      const totalCA = cleanData.reduce((sum, v) => sum + (parseFloat(v.total) || 0), 0)
      const totalPaid = cleanData.reduce((sum, v) => sum + (parseFloat(v.montant_paye) || 0), 0)

      const unpaidVentes = cleanData.filter(v =>
        (v.status === 'approved' || v.status === 'completed') && !v.est_paye
      )
      const totalUnpaid = unpaidVentes.reduce((sum, v) =>
        sum + ((parseFloat(v.total) || 0) - (parseFloat(v.montant_paye) || 0)), 0
      )

      const newStats = {
        total, pending, approved, completed, rejected, cancelled,
        totalCA, totalPaid, totalUnpaid,
        countPaid: cleanData.filter(v => v.est_paye).length,
        countUnpaid: unpaidVentes.length,
      }

      cacheRef.current.set(key, { ventes: cleanData, stats: newStats })
      if (cacheRef.current.size > 10) {
        const firstKey = cacheRef.current.keys().next().value
        cacheRef.current.delete(firstKey)
      }

      setStats(newStats)
    } catch (error) {
      console.error('Erreur chargement ventes:', error)
      showNotification('Erreur de chargement des ventes', 'error')
      setVentes([])
    } finally {
      setLoading(false)
      setInitialLoad(false)
      fetchingRef.current = false
    }
  }, [])

  const refreshData = async () => {
    cacheRef.current.clear()
    await fetchVentes({ bypassCache: true })
  }

  // ---------- Fetch destinations paiement ----------
  const fetchDestinations = async (venteId) => {
    setLoadingDestinations(true)
    try {
      const response = await AxiosInstance.get(`/ventes/${venteId}/destinations_paiement/`)
      setDestinations({
        caisses: response.data.caisses || [],
        comptes_bancaires: response.data.comptes_bancaires || []
      })
      const defaultCaisse = (response.data.caisses || []).find(c => c.is_default)
      if (defaultCaisse) setSelectedCaisse(defaultCaisse.id)
      else if ((response.data.caisses || []).length > 0) setSelectedCaisse(response.data.caisses[0].id)
    } catch (error) {
      console.error('Erreur chargement destinations:', error)
      setDestinations({ caisses: [], comptes_bancaires: [] })
    } finally {
      setLoadingDestinations(false)
    }
  }

  // ---------- Init ----------
  useEffect(() => {
    fetchCurrentUser()
    fetchVentes()
  }, [fetchCurrentUser, fetchVentes])

  // ---------- Actions paiement ----------
  const openPaymentModal = async (vente) => {
    setVenteToPay(vente)
    setPaymentMethod('especes')
    setPaymentNotes('')
    setPaymentReference('')
    setSelectedCaisse('')
    setSelectedCompte('')
    setShowPaymentModal(true)
    await fetchDestinations(vente.id)
  }

  const handleMarquerPaye = async () => {
    if (!venteToPay) return
    setProcessingPayment(true)
    try {
      const payload = {
        methode: paymentMethod,
        notes: paymentNotes || `Paiement automatique - Vente ${venteToPay.reference}`,
        reference_externe: paymentReference
      }
      if (paymentMethod === 'especes' || paymentMethod === 'mobile_money') {
        if (selectedCaisse) payload.caisse_destination = selectedCaisse
      } else {
        if (selectedCompte) payload.compte_destination = selectedCompte
      }

      const response = await AxiosInstance.post(`/ventes/${venteToPay.id}/marquer_paye/`, payload)
      const { paiement, facture } = response.data

      showNotification(
        `✅ Vente ${venteToPay.reference} payée!\n` +
        `Paiement: ${paiement.reference}\n` +
        `Facture: ${facture.reference} (${facture.status_display})`,
        'success'
      )

      setShowPaymentModal(false)
      setVenteToPay(null)
      cacheRef.current.clear()
      fetchVentes({ bypassCache: true })
    } catch (error) {
      console.error('Erreur paiement:', error)
      showNotification(error.response?.data?.error || 'Erreur lors du paiement', 'error')
    } finally {
      setProcessingPayment(false)
    }
  }

  // ---------- Génération PDF ----------
  const handleGenerateTicket = async (vente) => {
    if (!vente || (vente.status !== 'approved' && vente.status !== 'completed')) {
      showNotification('Seules les ventes approuvées ou complétées peuvent générer un ticket', 'error')
      return
    }
    setGeneratingTicket(vente.id)
    try {
      const response = await AxiosInstance.get(`/ventes/${vente.id}/`)
      const venteData = response.data
      const ticketData = {
        ...venteData,
        items_data: venteData.items || [],
        client: venteData.client || {},
        payment_method: 'Especes',
        paid_amount: parseFloat(venteData.montant_paye) || 0,
        remaining_amount: parseFloat(venteData.reste_a_payer) || 0
      }
      await TicketPOS(ticketData)
      showNotification(`Ticket POS généré pour ${vente.reference}`, 'success')
    } catch (error) {
      console.error('Erreur génération ticket:', error)
      showNotification('Erreur lors de la génération du ticket', 'error')
    } finally {
      setGeneratingTicket(null)
    }
  }

  const handleGenerateBonLivraison = async (vente) => {
    if (!vente || (vente.status !== 'approved' && vente.status !== 'completed')) {
      showNotification('Seules les ventes approuvées ou complétées peuvent générer un bon de livraison', 'error')
      return
    }
    setGeneratingBl(vente.id)
    try {
      const response = await AxiosInstance.get(`/ventes/${vente.id}/`)
      const venteData = response.data
      const options = {
        date_livraison: new Date().toISOString().split('T')[0],
        adresse_livraison: venteData.client?.adresse || '',
        contact_livraison: venteData.client?.telephone || '',
        instructions: ''
      }
      await Livraison(venteData, options)
      showNotification(`Bon de livraison généré pour ${vente.reference}`, 'success')
    } catch (error) {
      console.error('Erreur génération BL:', error)
      showNotification('Erreur lors de la génération du bon de livraison', 'error')
    } finally {
      setGeneratingBl(null)
    }
  }

  // ---------- Actions workflow ----------
  const handleApprove = async () => {
    if (!venteToApprove) return
    try {
      await AxiosInstance.post(`/ventes/${venteToApprove.id}/approve/`)
      showNotification(`Vente "${venteToApprove.reference}" approuvée avec succès`, 'success')
      cacheRef.current.clear()
      fetchVentes({ bypassCache: true })
      setShowApproveModal(false)
      setVenteToApprove(null)
    } catch (error) {
      showNotification(error.response?.data?.error || "Erreur lors de l'approbation", 'error')
    }
  }

  const handleReject = async () => {
    if (!venteToApprove) return
    if (!rejectReason.trim()) {
      showNotification('Veuillez saisir un motif de rejet', 'error')
      return
    }
    try {
      await AxiosInstance.post(`/ventes/${venteToApprove.id}/reject/`, { motif: rejectReason })
      showNotification(`Vente "${venteToApprove.reference}" rejetée`, 'success')
      cacheRef.current.clear()
      fetchVentes({ bypassCache: true })
      setShowRejectModal(false)
      setVenteToApprove(null)
      setRejectReason('')
    } catch (error) {
      showNotification(error.response?.data?.error || 'Erreur lors du rejet', 'error')
    }
  }

  const handleDeleteVente = async () => {
    if (!venteToDelete) return
    try {
      await AxiosInstance.delete(`/ventes/${venteToDelete.id}/`)
      showNotification(`Vente "${venteToDelete.reference}" supprimée`, 'success')
      cacheRef.current.clear()
      fetchVentes({ bypassCache: true })
      setShowDeleteModal(false)
      setVenteToDelete(null)
    } catch {
      showNotification('Erreur lors de la suppression', 'error')
    }
  }

  // ---------- Permissions ----------
  const canApprove = () => userRoles.est_pdg || userRoles.est_chef_agence
  const canGenerateBL = (v) => v.status === 'approved' || v.status === 'completed'
  const canGenerateTicket = (v) => v.status === 'approved' || v.status === 'completed'
  const canDelete = (v) => v.status === 'draft' || v.status === 'cancelled'
  const canMarkAsPaid = (v) =>
    (v.status === 'approved' || v.status === 'completed') && !v.est_paye

  // ---------- Tri ----------
  const handleSort = (field) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('asc') }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />
    return sortDirection === 'asc'
      ? <ChevronUp className="w-3 h-3" />
      : <ChevronDown className="w-3 h-3" />
  }

  // ---------- Filtrage + tri (mémoïsé) ----------
  const filteredAndSortedVentes = useMemo(() => {
    const filtered = ventes.filter(vente => {
      if (!vente) return false
      const search = searchTerm.toLowerCase()
      const reference = (vente.reference || '').toLowerCase()
      const clientNom = (vente.client_nom || '').toLowerCase()
      const matchesSearch = reference.includes(search) || clientNom.includes(search)
      const matchesStatus = !filterStatus || vente.status === filterStatus
      const matchesType = !filterType || vente.type_vente === filterType

      let matchesPayment = true
      if (filterPayment === 'paid') matchesPayment = vente.est_paye === true
      else if (filterPayment === 'unpaid') {
        matchesPayment = vente.est_paye === false
          && (vente.status === 'approved' || vente.status === 'completed')
      } else if (filterPayment === 'partial') {
        matchesPayment = parseFloat(vente.montant_paye || 0) > 0 && !vente.est_paye
      }

      const matchesDateStart = !dateRange.start
        || new Date(vente.date_vente) >= new Date(dateRange.start)
      const matchesDateEnd = !dateRange.end
        || new Date(vente.date_vente) <= new Date(dateRange.end)

      return matchesSearch && matchesStatus && matchesType
        && matchesPayment && matchesDateStart && matchesDateEnd
    })

    filtered.sort((a, b) => {
      let aVal = a[sortField] ?? ''
      let bVal = b[sortField] ?? ''
      if (sortField === 'total' || sortField === 'montant_paye') {
        aVal = parseFloat(aVal) || 0
        bVal = parseFloat(bVal) || 0
      }
      if (sortField === 'date_vente') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      }
      if (sortField === 'client_nom' || sortField === 'reference') {
        aVal = (aVal || '').toString().toLowerCase()
        bVal = (bVal || '').toString().toLowerCase()
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [ventes, searchTerm, filterStatus, filterType, filterPayment, dateRange, sortField, sortDirection])

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedVentes.length / itemsPerPage))
  const paginatedVentes = useMemo(() => filteredAndSortedVentes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ), [filteredAndSortedVentes, currentPage, itemsPerPage])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1)
  }, [totalPages, currentPage])

  // ---------- Badges ----------
  const getStatusBadge = (status) => {
    const config = statusConfig[status] || statusConfig.draft
    const Icon = config.icon
    return (
      <span className={`badge ${config.bgColor} ${config.color} gap-1 px-3 py-2 text-xs border ${config.borderColor}`}>
        <Icon className="w-3 h-3" /> {config.label}
      </span>
    )
  }

  const getPaymentStatusBadge = (vente) => {
    if (vente.est_paye) {
      return <span className="badge badge-success gap-1 px-3 py-2 text-xs">
        <CheckCircle className="w-3 h-3" /> Payé
      </span>
    }
    if (parseFloat(vente.montant_paye || 0) > 0) {
      return <span className="badge badge-warning gap-1 px-3 py-2 text-xs">
        <Clock className="w-3 h-3" /> Partiel
      </span>
    }
    return <span className="badge badge-error gap-1 px-3 py-2 text-xs">
      <AlertCircle className="w-3 h-3" /> Impayé
    </span>
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'livraison': return <Truck className="w-4 h-4" />
      case 'comptoir': return <ShoppingCart className="w-4 h-4" />
      case 'en_ligne': return <Users className="w-4 h-4" />
      default: return <Package className="w-4 h-4" />
    }
  }

  // ---------- Premier chargement ----------
  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-6">
          <div className="loading loading-spinner loading-lg text-primary w-16 h-16"></div>
          <p className="text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement des ventes...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Spinner overlay */}
      {loading && !initialLoad && (
        <div className="fixed top-20 right-6 z-40 animate-slideDown">
          <div className="bg-base-100 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border border-base-300">
            <span className="loading loading-spinner loading-xs text-primary"></span>
            <span className="text-xs text-base-content/60">Chargement...</span>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification.show && (
        <div className="fixed top-20 right-6 z-50 animate-slideDown max-w-md">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg`}>
            {notification.type === 'success'
              ? <CheckCircle className="w-5 h-5 flex-shrink-0" />
              : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span className="font-semibold whitespace-pre-line text-sm">{notification.message}</span>
            <button
              className="btn btn-ghost btn-xs btn-circle"
              onClick={() => setNotification({ ...notification, show: false })}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Paiement */}
      {showPaymentModal && venteToPay && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <div className="text-center mb-6">
              <div className="avatar placeholder mb-4">
                <div className="bg-success/10 text-success rounded-full w-20 h-20 flex items-center justify-center">
                  <CreditCard className="w-10 h-10" />
                </div>
              </div>
              <h3 className="font-bold text-2xl mb-2">Marquer comme payé</h3>
              <p className="text-base-content/70">
                Vente: <span className="font-semibold font-mono">{venteToPay.reference}</span>
              </p>
              {venteToPay.client_nom && (
                <p className="text-sm text-base-content/60 mt-1">
                  Client: {venteToPay.client_nom}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-success/10 to-primary/10 rounded-xl p-4 space-y-2 border border-success/20">
                <div className="flex justify-between">
                  <span className="text-base-content/60">Montant total:</span>
                  <span className="font-bold text-primary">{formatPrice(venteToPay.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">Déjà payé:</span>
                  <span className="font-semibold">{formatPrice(venteToPay.montant_paye)}</span>
                </div>
                <div className="flex justify-between border-t border-base-300 pt-2">
                  <span className="font-semibold">Reste à payer:</span>
                  <span className="font-bold text-success text-lg">
                    {formatPrice((parseFloat(venteToPay.total) || 0) - (parseFloat(venteToPay.montant_paye) || 0))}
                  </span>
                </div>
              </div>

              <div className="form-control">
                <label className="label font-medium">Méthode de paiement</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon
                    const isSelected = paymentMethod === method.value
                    return (
                      <button
                        key={method.value}
                        type="button"
                        className={`btn btn-sm gap-2 ${isSelected ? 'btn-primary' : 'btn-ghost border border-base-300'}`}
                        onClick={() => setPaymentMethod(method.value)}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs">{method.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {loadingDestinations ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="ml-2 text-sm">Chargement des destinations...</span>
                </div>
              ) : (
                <>
                  {(paymentMethod === 'especes' || paymentMethod === 'mobile_money')
                    && destinations.caisses.length > 0 && (
                    <div className="form-control">
                      <label className="label font-medium">
                        <span className="flex items-center gap-2">
                          <Wallet className="w-4 h-4" /> Caisse de destination
                        </span>
                      </label>
                      <select
                        className="select select-bordered w-full"
                        value={selectedCaisse}
                        onChange={(e) => setSelectedCaisse(e.target.value)}
                      >
                        <option value="">Caisse par défaut</option>
                        {destinations.caisses.map((caisse) => (
                          <option key={caisse.id} value={caisse.id}>
                            {caisse.nom} {caisse.code ? `(${caisse.code})` : ''}
                            {caisse.is_default ? ' ⭐' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {(paymentMethod === 'virement' || paymentMethod === 'cheque' || paymentMethod === 'carte')
                    && destinations.comptes_bancaires.length > 0 && (
                    <div className="form-control">
                      <label className="label font-medium">
                        <span className="flex items-center gap-2">
                          <Landmark className="w-4 h-4" /> Compte bancaire
                        </span>
                      </label>
                      <select
                        className="select select-bordered w-full"
                        value={selectedCompte}
                        onChange={(e) => setSelectedCompte(e.target.value)}
                      >
                        <option value="">Sélectionner un compte</option>
                        {destinations.comptes_bancaires.map((compte) => (
                          <option key={compte.id} value={compte.id}>
                            {compte.nom} - {compte.banque} ({compte.numero_compte})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              {(paymentMethod === 'cheque' || paymentMethod === 'virement' || paymentMethod === 'mobile_money') && (
                <div className="form-control">
                  <label className="label font-medium">
                    <span className="text-sm">Référence externe</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="N° de référence"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                  />
                </div>
              )}

              <div className="form-control">
                <label className="label font-medium">
                  <span className="text-sm">Notes (optionnel)</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full h-20 resize-none"
                  placeholder="Notes sur le paiement..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>

              <div className="alert alert-info">
                <Info className="w-5 h-5 flex-shrink-0" />
                <span className="text-xs">
                  Une facture sera automatiquement créée et un mouvement de trésorerie enregistré.
                </span>
              </div>
            </div>

            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowPaymentModal(false)
                  setVenteToPay(null)
                }}
                disabled={processingPayment}
              >
                Annuler
              </button>
              <button
                className="btn btn-success gap-2"
                onClick={handleMarquerPaye}
                disabled={processingPayment}
              >
                {processingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Traitement...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" /> Confirmer le paiement
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Approbation */}
      {showApproveModal && venteToApprove && (
        <div className="modal modal-open">
          <div className="modal-box">
            <div className="text-center mb-6">
              <div className="avatar placeholder mb-4">
                <div className="bg-success/10 text-success rounded-full w-20 h-20 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10" />
                </div>
              </div>
              <h3 className="font-bold text-2xl mb-2">Approuver la vente</h3>
              <p className="font-bold text-primary mt-4 text-lg">{venteToApprove.reference}</p>
              <p className="text-sm text-base-content/60">Montant: {formatPrice(venteToApprove.total)}</p>
              <div className="mt-4 p-3 bg-warning/10 rounded-xl text-warning text-sm">
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                Le stock sera automatiquement déduit.
              </div>
            </div>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => { setShowApproveModal(false); setVenteToApprove(null) }}
              >
                Annuler
              </button>
              <button className="btn btn-success gap-2" onClick={handleApprove}>
                <CheckCircle className="w-4 h-4" /> Approuver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rejet */}
      {showRejectModal && venteToApprove && (
        <div className="modal modal-open">
          <div className="modal-box">
            <div className="text-center mb-6">
              <div className="avatar placeholder mb-4">
                <div className="bg-error/10 text-error rounded-full w-20 h-20 flex items-center justify-center">
                  <XCircle className="w-10 h-10" />
                </div>
              </div>
              <h3 className="font-bold text-2xl mb-2">Rejeter la vente</h3>
              <p className="text-base-content/70">
                Vente: <span className="font-semibold">{venteToApprove.reference}</span>
              </p>
            </div>
            <div className="form-control">
              <label className="label font-medium">
                Motif du rejet <span className="text-error">*</span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full h-24 resize-none"
                placeholder="Expliquez la raison du rejet..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => { setShowRejectModal(false); setVenteToApprove(null); setRejectReason('') }}
              >
                Annuler
              </button>
              <button className="btn btn-error gap-2" onClick={handleReject}>
                <XCircle className="w-4 h-4" /> Rejeter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Suppression */}
      {showDeleteModal && venteToDelete && (
        <div className="modal modal-open">
          <div className="modal-box">
            <div className="text-center mb-6">
              <div className="avatar placeholder mb-4">
                <div className="bg-error/10 text-error rounded-full w-20 h-20 flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10" />
                </div>
              </div>
              <h3 className="font-bold text-2xl mb-2">Confirmer la suppression</h3>
              <p className="font-bold text-error mt-4 text-lg">"{venteToDelete.reference}"</p>
              <p className="text-sm text-base-content/50 mt-2">Cette action est irréversible.</p>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setShowDeleteModal(false)}>
                Annuler
              </button>
              <button className="btn btn-error gap-2" onClick={handleDeleteVente}>
                <Trash2 className="w-4 h-4" /> Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-base-content mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Ventes
          </h1>
          <p className="text-base text-base-content/60">
            Gérez toutes vos ventes
            {currentUser && (
              <span className="ml-2 badge badge-primary">
                {userRoles.est_pdg ? 'PDG' : userRoles.est_chef_agence ? "Chef d'agence" : 'Utilisateur'}
              </span>
            )}
            {canApprove() && (
              <span className="ml-2 badge badge-success gap-1">
                <Check className="w-3 h-3" /> Peut approuver
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={refreshData} className="btn btn-outline gap-2" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <button onClick={() => navigate('/ventes/nouveau')} className="btn btn-primary gap-2">
            <Plus className="w-4 h-4" /> Nouvelle vente
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-primary"><ShoppingCart className="w-8 h-8" /></div>
          <div className="stat-title text-sm font-semibold">Total</div>
          <div className="stat-value text-3xl font-black">{stats.total}</div>
          <div className="stat-desc">Ventes</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-warning"><Clock className="w-8 h-8" /></div>
          <div className="stat-title text-sm font-semibold">En attente</div>
          <div className="stat-value text-3xl font-black text-warning">{stats.pending}</div>
          <div className="stat-desc">À approuver</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-info"><CheckCircle className="w-8 h-8" /></div>
          <div className="stat-title text-sm font-semibold">Approuvées</div>
          <div className="stat-value text-3xl font-black text-info">{stats.approved}</div>
          <div className="stat-desc">Validées</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-success"><CheckCircle className="w-8 h-8" /></div>
          <div className="stat-title text-sm font-semibold">Complétées</div>
          <div className="stat-value text-3xl font-black text-success">{stats.completed}</div>
          <div className="stat-desc">Finalisées</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-error"><XCircle className="w-8 h-8" /></div>
          <div className="stat-title text-sm font-semibold">Rejetées</div>
          <div className="stat-value text-3xl font-black text-error">{stats.rejected}</div>
          <div className="stat-desc">Refusées</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-secondary"><DollarSign className="w-8 h-8" /></div>
          <div className="stat-title text-sm font-semibold">CA total</div>
          <div className="stat-value text-2xl font-black">{formatPrice(stats.totalCA)}</div>
          <div className="stat-desc">Chiffre d'affaires</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-300">
          <div className="stat-figure text-success"><CreditCard className="w-8 h-8" /></div>
          <div className="stat-title text-sm font-semibold">Payé</div>
          <div className="stat-value text-2xl font-black text-success">{formatPrice(stats.totalPaid)}</div>
          <div className="stat-desc">{stats.countPaid} ventes payées</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-error/30">
          <div className="stat-figure text-error"><AlertCircle className="w-8 h-8" /></div>
          <div className="stat-title text-sm font-semibold">Impayés</div>
          <div className="stat-value text-2xl font-black text-error">{formatPrice(stats.totalUnpaid)}</div>
          <div className="stat-desc">{stats.countUnpaid} ventes impayées</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-base-100 rounded-xl shadow-md border border-base-300 p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40" />
              <input
                type="text"
                placeholder="Rechercher par référence ou client..."
                className="input input-bordered w-full pl-12"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              className="select select-bordered min-w-[150px]"
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1) }}
            >
              <option value="">Tous statuts</option>
              <option value="draft">Brouillon</option>
              <option value="pending_approval">En attente</option>
              <option value="approved">Approuvée</option>
              <option value="completed">Complétée</option>
              <option value="rejected">Rejetée</option>
              <option value="cancelled">Annulée</option>
            </select>
            <select
              className="select select-bordered min-w-[150px]"
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1) }}
            >
              <option value="">Tous types</option>
              <option value="comptoir">Comptoir</option>
              <option value="livraison">Livraison</option>
              <option value="en_ligne">En ligne</option>
            </select>
            <select
              className="select select-bordered min-w-[150px]"
              value={filterPayment}
              onChange={(e) => { setFilterPayment(e.target.value); setCurrentPage(1) }}
            >
              <option value="">Tous paiements</option>
              <option value="paid">✅ Payé</option>
              <option value="partial">⏳ Partiel</option>
              <option value="unpaid">❌ Impayé</option>
            </select>
            <div className="flex gap-2">
              <input
                type="date"
                className="input input-bordered"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
              <input
                type="date"
                className="input input-bordered"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
            <button
              className="btn btn-outline gap-2"
              onClick={() => {
                setFilterStatus(''); setFilterType(''); setFilterPayment('')
                setSearchTerm(''); setDateRange({ start: '', end: '' }); setCurrentPage(1)
              }}
            >
              <Filter className="w-4 h-4" /> Réinitialiser
            </button>
            <div className="join">
              <button
                className={`join-item btn ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('table')}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                className={`join-item btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden">
        {filteredAndSortedVentes.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="w-20 h-20 mx-auto mb-4 text-base-content/30" />
            <p className="text-xl font-semibold text-base-content/50">Aucune vente trouvée</p>
            <p className="text-base text-base-content/40 mt-2">
              {searchTerm || filterStatus || filterType || filterPayment || dateRange.start || dateRange.end
                ? 'Essayez de modifier vos critères'
                : 'Commencez par créer votre première vente'}
            </p>
            <button
              className="btn btn-primary mt-6 gap-2"
              onClick={() => navigate('/ventes/nouveau')}
            >
              <Plus className="w-4 h-4" /> Créer une vente
            </button>
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>
                    <button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('reference')}>
                      Référence <SortIcon field="reference" />
                    </button>
                  </th>
                  <th>
                    <button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('client_nom')}>
                      Client <SortIcon field="client_nom" />
                    </button>
                  </th>
                  <th>
                    <button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('date_vente')}>
                      Date <SortIcon field="date_vente" />
                    </button>
                  </th>
                  <th>
                    <button className="flex items-center gap-1 hover:text-primary" onClick={() => handleSort('total')}>
                      Montant <SortIcon field="total" />
                    </button>
                  </th>
                  <th>Statut</th>
                  <th>Paiement</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVentes.map((vente) => (
                  <tr key={vente.id} className="hover">
                    <td className="font-mono font-semibold">{vente.reference}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="avatar placeholder">
                          <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center">
                            <User className="w-4 h-4" />
                          </div>
                        </div>
                        <span>{vente.client_nom || 'Anonyme'}</span>
                      </div>
                    </td>
                    <td className="text-sm">{formatDate(vente.date_vente)}</td>
                    <td className="font-bold text-primary">{formatPrice(vente.total)}</td>
                    <td>{getStatusBadge(vente.status)}</td>
                    <td>{getPaymentStatusBadge(vente)}</td>
                    <td>
                      <div className="flex justify-end gap-1 flex-wrap">
                        {canMarkAsPaid(vente) && (
                          <button
                            className="btn btn-ghost btn-xs text-success hover:bg-success/10"
                            onClick={() => openPaymentModal(vente)}
                            title="Marquer comme payé"
                          >
                            <CreditCard className="w-3 h-3" />
                          </button>
                        )}
                        {canGenerateTicket(vente) && (
                          <button
                            className="btn btn-ghost btn-xs text-secondary"
                            onClick={() => handleGenerateTicket(vente)}
                            disabled={generatingTicket === vente.id}
                            title="Ticket POS"
                          >
                            {generatingTicket === vente.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Receipt className="w-3 h-3" />}
                          </button>
                        )}
                        {canGenerateBL(vente) && (
                          <button
                            className="btn btn-ghost btn-xs text-info"
                            onClick={() => handleGenerateBonLivraison(vente)}
                            disabled={generatingBl === vente.id}
                            title="Bon de livraison"
                          >
                            {generatingBl === vente.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Truck className="w-3 h-3" />}
                          </button>
                        )}
                        {vente.status === 'pending_approval' && canApprove() && (
                          <>
                            <button
                              className="btn btn-ghost btn-xs text-success"
                              onClick={() => { setVenteToApprove(vente); setShowApproveModal(true) }}
                              title="Approuver"
                            >
                              <CheckCircle className="w-3 h-3" />
                            </button>
                            <button
                              className="btn btn-ghost btn-xs text-error"
                              onClick={() => {
                                setVenteToApprove(vente)
                                setRejectReason('')
                                setShowRejectModal(true)
                              }}
                              title="Rejeter"
                            >
                              <XCircle className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => navigate(`/ventes/${vente.id}`)}
                          title="Détails"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        {canDelete(vente) && (
                          <button
                            className="btn btn-ghost btn-xs text-error"
                            onClick={() => { setVenteToDelete(vente); setShowDeleteModal(true) }}
                            title="Supprimer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedVentes.map((vente) => (
                <div
                  key={vente.id}
                  className={`bg-base-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border ${
                    !vente.est_paye && (vente.status === 'approved' || vente.status === 'completed')
                      ? 'border-error/30'
                      : 'border-base-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="avatar placeholder">
                        <div className="bg-primary/10 text-primary rounded-xl w-12 h-12 flex items-center justify-center">
                          <ShoppingCart className="w-6 h-6" />
                        </div>
                      </div>
                      <div>
                        <p className="font-mono font-bold text-sm">{vente.reference}</p>
                        <p className="text-sm text-base-content/60">{vente.client_nom || 'Anonyme'}</p>
                      </div>
                    </div>
                    {getStatusBadge(vente.status)}
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-base-content/60">Montant</span>
                      <span className="font-bold text-primary">{formatPrice(vente.total)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-base-content/60">Date</span>
                      <span className="text-sm">{formatDate(vente.date_vente)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-base-content/60">Type</span>
                      <span className="text-sm capitalize flex items-center gap-1">
                        {getTypeIcon(vente.type_vente)}
                        {vente.type_vente}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-base-content/60">Paiement</span>
                      {getPaymentStatusBadge(vente)}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-base-300 flex items-center justify-end gap-1">
                    {canMarkAsPaid(vente) && (
                      <button
                        className="btn btn-ghost btn-xs text-success"
                        onClick={() => openPaymentModal(vente)}
                        title="Marquer comme payé"
                      >
                        <CreditCard className="w-3 h-3" />
                      </button>
                    )}
                    {canGenerateTicket(vente) && (
                      <button
                        className="btn btn-ghost btn-xs text-secondary"
                        onClick={() => handleGenerateTicket(vente)}
                        disabled={generatingTicket === vente.id}
                        title="Ticket POS"
                      >
                        {generatingTicket === vente.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Receipt className="w-3 h-3" />}
                      </button>
                    )}
                    {canGenerateBL(vente) && (
                      <button
                        className="btn btn-ghost btn-xs text-info"
                        onClick={() => handleGenerateBonLivraison(vente)}
                        disabled={generatingBl === vente.id}
                        title="Bon de livraison"
                      >
                        {generatingBl === vente.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Truck className="w-3 h-3" />}
                      </button>
                    )}
                    {vente.status === 'pending_approval' && canApprove() && (
                      <>
                        <button
                          className="btn btn-ghost btn-xs text-success"
                          onClick={() => { setVenteToApprove(vente); setShowApproveModal(true) }}
                        >
                          <CheckCircle className="w-3 h-3" />
                        </button>
                        <button
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => {
                            setVenteToApprove(vente)
                            setRejectReason('')
                            setShowRejectModal(true)
                          }}
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      </>
                    )}
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => navigate(`/ventes/${vente.id}`)}
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                    {canDelete(vente) && (
                      <button
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => { setVenteToDelete(vente); setShowDeleteModal(true) }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {filteredAndSortedVentes.length > 0 && (
          <div className="p-4 border-t border-base-300">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-base-content/60">
                Affichage de {((currentPage - 1) * itemsPerPage) + 1} à{' '}
                {Math.min(currentPage * itemsPerPage, filteredAndSortedVentes.length)} sur{' '}
                {filteredAndSortedVentes.length} ventes
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="select select-bordered select-sm"
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1) }}
                >
                  <option value="12">12 par page</option>
                  <option value="24">24 par page</option>
                  <option value="48">48 par page</option>
                  <option value="96">96 par page</option>
                </select>
                <div className="join">
                  <button
                    className="join-item btn btn-sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum
                    if (totalPages <= 5) pageNum = i + 1
                    else if (currentPage <= 3) pageNum = i + 1
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                    else pageNum = currentPage - 2 + i
                    return (
                      <button
                        key={i}
                        className={`join-item btn btn-sm ${currentPage === pageNum ? 'btn-primary' : ''}`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    className="join-item btn btn-sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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

export default VentesList