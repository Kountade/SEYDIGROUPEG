// src/pages/transferts/Transferts.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, Eye, CheckCircle, XCircle, Send, Truck, Ban, AlertCircle,
  Package, ArrowLeftRight, Clock, Filter, Search, RefreshCw, FileText
} from 'lucide-react'
import AxiosInstance from '../AxiosInstance'
import TransfertPdf from './TransfertPdf'

const STATUS_CONFIG = {
  draft: { label: 'Brouillon', color: 'secondary', icon: Clock },
  pending_approval: { label: 'En attente', color: 'warning', icon: Send },
  approved: { label: 'Approuvé', color: 'info', icon: CheckCircle },
  rejected: { label: 'Rejeté', color: 'error', icon: XCircle },
  in_transit: { label: 'En transit', color: 'info', icon: Truck },
  partial: { label: 'Partiellement reçu', color: 'warning', icon: Clock },
  completed: { label: 'Terminé', color: 'success', icon: CheckCircle },
  cancelled: { label: 'Annulé', color: 'neutral', icon: Ban }
}

const Transferts = () => {
  const navigate = useNavigate()

  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [downloadingId, setDownloadingId] = useState(null)
  const [filters, setFilters] = useState({ status: '', search: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [agences, setAgences] = useState([])
  const [userRole, setUserRole] = useState(null)
  const [userAgencesIds, setUserAgencesIds] = useState([])
  const [userAgence, setUserAgence] = useState(null)

  // ✅ Refs cache
  const cacheRef = useRef(new Map())
  const fetchingRef = useRef(false)

  const unwrap = (data) => Array.isArray(data) ? data : (data?.results || [])

  const getUserInfo = () => {
    try {
      const userData = localStorage.getItem('User')
      const user = userData ? JSON.parse(userData) : null
      const agenceCourante = JSON.parse(localStorage.getItem('AgenceCourante') || '{}')
      let role = 'autre'
      let agencesAccessibles = []

      if (user?.role_global === 'pdg') role = 'pdg'
      else if (user?.role_global === 'drh') role = 'drh'
      else if (user?.roles_agence) {
        agencesAccessibles = user.roles_agence
          .filter(r => r.est_actif)
          .map(r => r.agence_id)
        const currentRole = user.roles_agence.find(
          r => r.agence_id === agenceCourante.id && r.est_actif
        )
        if (currentRole) role = currentRole.role
      }
      return { user, role, agencesAccessibles, agenceCourante }
    } catch {
      return { user: null, role: 'autre', agencesAccessibles: [], agenceCourante: {} }
    }
  }

  // ✅ Fetch avec cache
  const fetchData = useCallback(async ({ bypassCache = false } = {}) => {
    const key = `transfers_${filters.status || ''}_${filters.search || ''}`

    if (!bypassCache && cacheRef.current.has(key)) {
      const c = cacheRef.current.get(key)
      setTransfers(c.transfers)
      setLoading(false)
      setInitialLoad(false)
      return
    }

    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)

    try {
      // ✅ Transfers paginé
      const params = new URLSearchParams()
      params.append('page_size', '200')
      if (filters.status) params.append('status', filters.status)
      if (filters.search) params.append('search', filters.search)

      const [transfersRes, agencesRes] = await Promise.all([
        AxiosInstance.get(`/transfers/?${params.toString()}`).catch(() => ({ data: [] })),
        cacheRef.current.has('agences_list')
          ? Promise.resolve({ data: cacheRef.current.get('agences_list') })
          : AxiosInstance.get('/agences/?page_size=200').catch(() => ({ data: [] }))
      ])

      const transfersData = unwrap(transfersRes.data)
      const agencesData = unwrap(agencesRes.data)

      if (!cacheRef.current.has('agences_list')) {
        cacheRef.current.set('agences_list', agencesData)
      }
      cacheRef.current.set(key, { transfers: transfersData })
      if (cacheRef.current.size > 10) {
        const firstKey = cacheRef.current.keys().next().value
        cacheRef.current.delete(firstKey)
      }

      setTransfers(transfersData)
      setAgences(agencesData)
    } catch (error) {
      console.error('Erreur chargement transferts:', error)
    } finally {
      setLoading(false)
      setInitialLoad(false)
      fetchingRef.current = false
    }
  }, [filters])

  useEffect(() => {
    const { role, agencesAccessibles, agenceCourante } = getUserInfo()
    setUserRole(role)
    setUserAgencesIds(agencesAccessibles)
    setUserAgence(agenceCourante)
  }, [])

  // ✅ Fetch uniquement quand filtres changent (debounce search)
  useEffect(() => {
    const t = setTimeout(() => fetchData(), 300)
    return () => clearTimeout(t)
  }, [fetchData])

  const refreshData = async () => {
    cacheRef.current.clear()
    await fetchData({ bypassCache: true })
  }

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value })
  }

  const resetFilters = () => {
    setFilters({ status: '', search: '' })
  }

  const downloadPDF = async (transfer) => {
    setDownloadingId(transfer.id)
    try {
      const response = await AxiosInstance.get(`/transfers/${transfer.id}/`)
      await TransfertPdf(response.data)
    } catch (error) {
      console.error('Erreur PDF:', error)
      alert('Erreur lors de la génération du PDF')
    } finally {
      setDownloadingId(null)
    }
  }

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft
    const Icon = config.icon
    return (
      <span className={`badge badge-${config.color} gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  const canSubmit = (transfer) => {
    if (transfer.status !== 'draft') return false
    if (userRole === 'pdg' || userRole === 'drh') return false
    return transfer.to_agence?.id === userAgence?.id && userRole === 'chef_agence'
  }

  const canApprove = (transfer) => {
    if (transfer.status !== 'pending_approval') return false
    if (userRole === 'pdg') return true
    return transfer.from_agence?.id === userAgence?.id && userRole === 'chef_agence'
  }

  const canReject = (transfer) => canApprove(transfer)

  const canCancel = (transfer) => {
    if (!['draft', 'pending_approval'].includes(transfer.status)) return false
    if (userRole === 'pdg') return true
    const isSourceOrDest =
      (transfer.from_agence?.id === userAgence?.id
        || transfer.to_agence?.id === userAgence?.id)
    return isSourceOrDest && userRole === 'chef_agence'
  }

  const handleAction = async (id, action) => {
    try {
      let res
      switch (action) {
        case 'submit':
          res = await AxiosInstance.post(`/transfers/${id}/submit/`)
          break
        case 'approve':
          res = await AxiosInstance.post(`/transfers/${id}/approve/`)
          break
        case 'reject': {
          const reason = prompt('Motif du rejet :')
          if (!reason && reason !== '') return
          res = await AxiosInstance.post(`/transfers/${id}/reject/`, { reason })
          break
        }
        case 'cancel':
          if (!window.confirm('Annuler ce transfert ?')) return
          res = await AxiosInstance.post(`/transfers/${id}/cancel/`)
          break
        default:
          return
      }
      if (res.status === 200 || res.status === 201) {
        cacheRef.current.clear()
        fetchData({ bypassCache: true })
      }
    } catch (error) {
      console.error(`Erreur ${action}:`, error)
      alert(error.response?.data?.error || 'Une erreur est survenue')
    }
  }

  const getAgenceTypeLabel = (agence) => {
    if (!agence) return { text: 'N/A', icon: '❓' }
    if (agence.type_agence === 'principale') return { text: 'Principale', icon: '🏛️' }
    if (agence.type_agence === 'secondaire') return { text: 'Secondaire', icon: '🏪' }
    return { text: agence.type_agence || 'N/A', icon: '📌' }
  }

  if (initialLoad && loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-base font-medium text-base-content/70 animate-pulse">
            Chargement des transferts...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      {loading && !initialLoad && (
        <div className="fixed top-20 right-6 z-40 animate-slideDown">
          <div className="bg-base-100 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 border border-base-300">
            <span className="loading loading-spinner loading-xs text-primary"></span>
            <span className="text-xs text-base-content/60">Chargement...</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-base-content flex items-center gap-2">
            <ArrowLeftRight className="w-7 h-7 text-primary" />
            Transferts entre entrepôts
          </h1>
          <p className="text-base-content/60 text-sm mt-1">
            Gérez les demandes de transfert de stock
          </p>
          {userAgence?.nom && (
            <div className="mt-2 text-xs text-base-content/50">
              Agence courante : <span className="font-semibold text-primary">{userAgence.nom}</span>
              {userRole === 'chef_agence' && ' (Chef d\'agence)'}
              {userRole === 'pdg' && ' (PDG - Accès total)'}
              {userRole === 'drh' && ' (DRH)'}
            </div>
          )}
        </div>
        <Link to="/transferts/nouveau" className="btn btn-primary gap-2">
          <Plus className="w-4 h-4" />
          Nouveau transfert
        </Link>
      </div>

      <div className="card bg-base-100 shadow-md mb-6">
        <div className="card-body p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-base-content/60" />
              <span className="font-medium">Filtres</span>
              <button onClick={() => setShowFilters(!showFilters)} className="btn btn-sm btn-ghost">
                {showFilters ? 'Masquer' : 'Afficher'}
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={refreshData} className="btn btn-sm btn-outline gap-1">
                <RefreshCw className="w-4 h-4" />
                Actualiser
              </button>
              {(filters.status || filters.search) && (
                <button onClick={resetFilters} className="btn btn-sm btn-ghost">
                  Réinitialiser
                </button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Statut</span>
                </label>
                <select
                  name="status"
                  className="select select-bordered"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="">Tous</option>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Recherche</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
                  <input
                    type="text"
                    name="search"
                    placeholder="Référence, produit..."
                    className="input input-bordered w-full pl-9"
                    value={filters.search}
                    onChange={handleFilterChange}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto bg-base-100 rounded-xl shadow-md">
        <table className="table table-zebra">
          <thead>
            <tr className="bg-base-200">
              <th>Référence</th>
              <th>Statut</th>
              <th>AGENCE SOURCE</th>
              <th>AGENCE DESTINATION</th>
              <th>Nb articles</th>
              <th>Date création</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transfers.length === 0 && !loading && (
              <tr>
                <td colSpan="7" className="text-center py-8 text-base-content/50">
                  Aucun transfert trouvé
                </td>
              </tr>
            )}
            {transfers.map((transfer) => {
              const showSubmit = canSubmit(transfer)
              const showApprove = canApprove(transfer)
              const showReject = canReject(transfer)
              const showCancel = canCancel(transfer)
              const sourceType = getAgenceTypeLabel(transfer.from_agence)
              const destType = getAgenceTypeLabel(transfer.to_agence)

              return (
                <tr key={transfer.id} className="hover">
                  <td className="font-mono text-sm font-medium">{transfer.reference}</td>
                  <td>{getStatusBadge(transfer.status)}</td>
                  <td>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-primary">
                        {transfer.from_agence_nom}
                      </span>
                      <span className="text-xs text-base-content/50">
                        {sourceType.icon} {sourceType.text}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-accent">
                        {transfer.to_agence_nom}
                      </span>
                      <span className="text-xs text-base-content/50">
                        {destType.icon} {destType.text}
                      </span>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className="badge badge-neutral">{transfer.items_count || 0}</span>
                  </td>
                  <td className="text-sm">
                    {new Date(transfer.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1 justify-center">
                      <Link to={`/transferts/${transfer.id}`} className="btn btn-xs btn-ghost">
                        <Eye className="w-3 h-3" />
                      </Link>
                      <button
                        onClick={() => downloadPDF(transfer)}
                        className="btn btn-xs btn-ghost text-info"
                        disabled={downloadingId === transfer.id}
                      >
                        {downloadingId === transfer.id
                          ? <span className="loading loading-spinner loading-xs"></span>
                          : <FileText className="w-3 h-3" />}
                      </button>
                      {showSubmit && (
                        <button
                          onClick={() => handleAction(transfer.id, 'submit')}
                          className="btn btn-xs btn-warning gap-1"
                        >
                          <Send className="w-3 h-3" /> Soumettre
                        </button>
                      )}
                      {showApprove && (
                        <button
                          onClick={() => handleAction(transfer.id, 'approve')}
                          className="btn btn-xs btn-success gap-1"
                        >
                          <CheckCircle className="w-3 h-3" /> Approuver
                        </button>
                      )}
                      {showReject && (
                        <button
                          onClick={() => handleAction(transfer.id, 'reject')}
                          className="btn btn-xs btn-error gap-1"
                        >
                          <XCircle className="w-3 h-3" /> Rejeter
                        </button>
                      )}
                      {showCancel && (
                        <button
                          onClick={() => handleAction(transfer.id, 'cancel')}
                          className="btn btn-xs btn-outline gap-1"
                        >
                          <Ban className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-base-200 rounded-lg text-xs text-base-content/60">
        <div className="flex flex-wrap gap-4">
          <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-info" /> PDF : Télécharger le document</span>
          <span className="flex items-center gap-1"><Send className="w-3 h-3 text-warning" /> Soumettre : Chef agence destination</span>
          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-success" /> Approuver : Chef agence source ou PDG</span>
          <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-error" /> Rejeter : Chef agence source ou PDG</span>
          <span className="flex items-center gap-1"><Ban className="w-3 h-3" /> Annuler : Chef source/destination ou PDG</span>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown { animation: slideDown 0.35s ease-out; }
      `}</style>
    </div>
  )
}

export default Transferts