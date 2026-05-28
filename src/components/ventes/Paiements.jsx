// src/components/paiements/Paiements.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import PaiementPdf from './PaiementPdf'
import {
  Plus, Edit, Trash2, Search, RefreshCw, Filter, CreditCard,
  X, AlertCircle, CheckCircle, Eye, MoreVertical, ChevronLeft, ChevronRight,
  ArrowUpDown, LayoutGrid, List, Phone, Calendar, DollarSign,
  Clock, XCircle, FileText, Download
} from 'lucide-react'

const Paiements = () => {
  const navigate = useNavigate()
  const [paiements, setPaiements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMethode, setFilterMethode] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [paiementToDelete, setPaiementToDelete] = useState(null)
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })
  
  // ✅ MODIFICATION ICI : viewMode par défaut = 'table'
  const [viewMode, setViewMode] = useState('table')
  
  const [sortField, setSortField] = useState('date_paiement')
  const [sortDirection, setSortDirection] = useState('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [stats, setStats] = useState({ total: 0, total_montant: 0, montant_jour: 0 })
  const [pdfLoadingId, setPdfLoadingId] = useState(null)

  const methodesPaiement = {
    especes: 'Espèces', carte: 'Carte bancaire', cheque: 'Chèque',
    virement: 'Virement', mobile_money: 'Mobile Money', autre: 'Autre'
  }

  const statutsPaiement = {
    pending: 'En attente', completed: 'Complété', failed: 'Échoué', refunded: 'Remboursé'
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 4000)
  }

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('Token')
      if (!token) {
        setError('Veuillez vous connecter')
        setLoading(false)
        return
      }
      const [paiementsRes, statsRes] = await Promise.all([
        AxiosInstance.get('/paiements/'),
        AxiosInstance.get('/paiements/stats/')
      ])
      setPaiements(paiementsRes.data)
      setStats(statsRes.data)
    } catch (err) {
      console.error(err)
      setError('Erreur de chargement des paiements')
      showNotification('Erreur de chargement des paiements', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleDelete = async () => {
    if (!paiementToDelete) return
    try {
      await AxiosInstance.delete(`/paiements/${paiementToDelete.id}/`)
      showNotification(`Paiement ${paiementToDelete.reference} supprimé`, 'success')
      fetchData()
      setShowDeleteModal(false)
      setPaiementToDelete(null)
    } catch (error) {
      showNotification('Erreur lors de la suppression', 'error')
    }
  }

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('asc') }
  }

  const getStatutBadge = (statut) => {
    const config = {
      completed: { class: 'badge-success', icon: CheckCircle, label: 'Complété' },
      pending: { class: 'badge-warning', icon: Clock, label: 'En attente' },
      failed: { class: 'badge-error', icon: XCircle, label: 'Échoué' },
      refunded: { class: 'badge-info', icon: RefreshCw, label: 'Remboursé' }
    }
    const { class: bgClass, icon: Icon, label } = config[statut] || config.completed
    return (
      <div className={`badge ${bgClass} gap-1 text-xs`}>
        <Icon className="w-3 h-3" /> {label}
      </div>
    )
  }

  const filteredAndSorted = React.useMemo(() => {
    let filtered = paiements.filter(p => {
      const search = searchTerm.toLowerCase()
      const matchSearch =
        (p.reference || '').toLowerCase().includes(search) ||
        (p.client?.nom || '').toLowerCase().includes(search) ||
        (p.facture?.reference || '').toLowerCase().includes(search) ||
        (p.reference_externe || '').toLowerCase().includes(search)
      const matchMethode = filterMethode === '' || p.methode === filterMethode
      const matchStatut = filterStatut === '' || p.statut === filterStatut
      return matchSearch && matchMethode && matchStatut
    })
    filtered.sort((a, b) => {
      let aVal = a[sortField] || '', bVal = b[sortField] || ''
      if (sortField === 'date_paiement') {
        aVal = new Date(aVal).getTime(); bVal = new Date(bVal).getTime()
      } else if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase() }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    return filtered
  }, [paiements, searchTerm, filterMethode, filterStatut, sortField, sortDirection])

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage)
  const paginated = filteredAndSorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) setItemsPerPage(6)
      else if (window.innerWidth < 1024) setItemsPerPage(9)
      else setItemsPerPage(12)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleViewDetail = (id) => navigate(`/paiements/${id}`)

  const handleDownloadPDF = async (paiement, id) => {
    setPdfLoadingId(id)
    try {
      await PaiementPdf(paiement)
    } catch (err) {
      console.error(err)
      showNotification('Erreur lors de la génération du PDF', 'error')
    } finally {
      setPdfLoadingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <div className="loading loading-spinner loading-lg text-primary w-12 h-12"></div>
          <p className="text-xl font-semibold">Chargement des paiements...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Erreur</h2>
          <p className="mb-4">{error}</p>
          <button onClick={fetchData} className="btn btn-primary gap-2">
            <RefreshCw className="w-4 h-4" /> Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 bg-base-100">
      {notification.show && (
        <div className="fixed top-16 right-6 z-50 animate-slideDown">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg`}>
            {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{notification.message}</span>
            <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setNotification({ ...notification, show: false })}>
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black">Paiements</h1>
          <p className="text-base-content/60">Gestion des encaissements et reçus</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchData} className="btn btn-ghost gap-2"><RefreshCw className="w-4 h-4" /> Actualiser</button>
          <button onClick={() => navigate('/paiements/nouveau')} className="btn btn-primary gap-2">
            <Plus className="w-4 h-4" /> Nouveau paiement
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="stat bg-base-200 rounded-2xl p-5">
          <div className="stat-figure text-primary"><CreditCard className="w-8 h-8" /></div>
          <div className="stat-title">Total encaissé</div>
          <div className="stat-value text-3xl font-bold">{stats.total_montant?.toLocaleString()} FCFA</div>
          <div className="stat-desc">{stats.total} transactions</div>
        </div>
        <div className="stat bg-base-200 rounded-2xl p-5">
          <div className="stat-figure text-success"><Calendar className="w-8 h-8" /></div>
          <div className="stat-title">Aujourd'hui</div>
          <div className="stat-value text-3xl font-bold">{stats.montant_jour?.toLocaleString()} FCFA</div>
        </div>
        <div className="stat bg-base-200 rounded-2xl p-5">
          <div className="stat-figure text-info"><DollarSign className="w-8 h-8" /></div>
          <div className="stat-title">Moyenne par paiement</div>
          <div className="stat-value text-3xl font-bold">
            {stats.total > 0 ? Math.round(stats.total_montant / stats.total).toLocaleString() : 0} FCFA
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40" />
          <input
            type="text"
            placeholder="Rechercher par référence, client, facture..."
            className="input input-ghost w-full pl-12 bg-base-200 rounded-2xl"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setShowFilters(!showFilters)} className="btn btn-ghost btn-sm gap-2">
            <Filter className="w-4 h-4" /> Filtres
          </button>
          <div className={`flex flex-wrap gap-3 ${showFilters ? 'flex' : 'hidden sm:flex'}`}>
            <select className="select select-ghost bg-base-200 rounded-2xl" value={filterMethode}
              onChange={(e) => { setFilterMethode(e.target.value); setCurrentPage(1) }}>
              <option value="">Toutes méthodes</option>
              {Object.entries(methodesPaiement).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="select select-ghost bg-base-200 rounded-2xl" value={filterStatut}
              onChange={(e) => { setFilterStatut(e.target.value); setCurrentPage(1) }}>
              <option value="">Tous statuts</option>
              {Object.entries(statutsPaiement).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilterMethode(''); setFilterStatut(''); setSearchTerm(''); setCurrentPage(1) }}>
              Réinitialiser
            </button>
          </div>
          <div className="join ml-auto">
            <button className={`join-item btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('grid')}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button className={`join-item btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('table')}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Contenu : tableau par défaut */}
      {filteredAndSorted.length === 0 ? (
        <div className="py-16 text-center">
          <CreditCard className="w-20 h-20 mx-auto mb-4 text-base-content/20" />
          <p className="text-xl font-semibold">Aucun paiement trouvé</p>
          <button onClick={() => navigate('/paiements/nouveau')} className="btn btn-primary mt-6">Nouveau paiement</button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Mode grille (cartes) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {paginated.map(p => (
            <div key={p.id} className="bg-base-200 rounded-2xl p-5 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-mono font-bold text-lg">{p.reference}</div>
                  <div className="text-xs text-base-content/50">{new Date(p.date_paiement).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleViewDetail(p.id)} className="btn btn-ghost btn-sm btn-circle text-primary" title="Détails">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDownloadPDF(p, p.id)} className="btn btn-ghost btn-sm btn-circle text-info" title="PDF" disabled={pdfLoadingId === p.id}>
                    {pdfLoadingId === p.id ? <span className="loading loading-spinner loading-xs"></span> : <Download className="w-4 h-4" />}
                  </button>
                  <div className="dropdown dropdown-end">
                    <button className="btn btn-ghost btn-sm btn-circle"><MoreVertical className="w-4 h-4" /></button>
                    <ul className="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-2xl w-44">
                      <li><button onClick={() => navigate(`/paiements/${p.id}/edit`)}><Edit className="w-4 h-4" /> Modifier</button></li>
                      <li><button className="text-error" onClick={() => { setPaiementToDelete(p); setShowDeleteModal(true) }}><Trash2 className="w-4 h-4" /> Supprimer</button></li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-2xl font-bold text-primary">
                  <DollarSign className="w-5 h-5" /> {p.montant.toLocaleString()} FCFA
                </div>
                <div className="flex items-center gap-2 text-sm"><CreditCard className="w-4 h-4" /> {methodesPaiement[p.methode] || p.methode}</div>
                <div className="flex items-center gap-2 text-sm truncate"><FileText className="w-4 h-4" /> Facture: {p.facture?.reference || '-'}</div>
                {p.client && <div className="flex items-center gap-2 text-sm truncate"><Phone className="w-4 h-4" /> {p.client.nom}</div>}
              </div>
              <div className="mt-4 pt-3 flex justify-between items-center border-t border-base-300/50">
                {getStatutBadge(p.statut)}
                {p.reference_externe && <span className="text-xs text-base-content/40">Ref: {p.reference_externe}</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Mode tableau (par défaut) */
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead className="bg-base-200/50">
              <tr>
                <th><button onClick={() => handleSort('reference')}>Référence <ArrowUpDown className="w-3 h-3 inline" /></button></th>
                <th><button onClick={() => handleSort('date_paiement')}>Date <ArrowUpDown className="w-3 h-3 inline" /></button></th>
                <th>Client</th>
                <th>Facture</th>
                <th><button onClick={() => handleSort('montant')}>Montant <ArrowUpDown className="w-3 h-3 inline" /></button></th>
                <th>Méthode</th>
                <th>Statut</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(p => (
                <tr key={p.id}>
                  <td className="font-mono">{p.reference}</td>
                  <td>{new Date(p.date_paiement).toLocaleDateString()}</td>
                  <td>{p.client?.nom || '-'}</td>
                  <td>{p.facture?.reference || '-'}</td>
                  <td className="font-mono font-semibold">{p.montant.toLocaleString()} FCFA</td>
                  <td>{methodesPaiement[p.methode]}</td>
                  <td>{getStatutBadge(p.statut)}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleViewDetail(p.id)} className="btn btn-ghost btn-sm" title="Détails"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => handleDownloadPDF(p, p.id)} className="btn btn-ghost btn-sm text-info" title="PDF" disabled={pdfLoadingId === p.id}>
                        {pdfLoadingId === p.id ? <span className="loading loading-spinner loading-xs"></span> : <Download className="w-4 h-4" />}
                      </button>
                      <button onClick={() => navigate(`/paiements/${p.id}/edit`)} className="btn btn-ghost btn-sm text-primary" title="Modifier"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => { setPaiementToDelete(p); setShowDeleteModal(true) }} className="btn btn-ghost btn-sm text-error" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {filteredAndSorted.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4">
          <div className="text-sm text-base-content/60">
            {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredAndSorted.length)} sur {filteredAndSorted.length}
          </div>
          <div className="join">
            <button className="join-item btn btn-ghost btn-sm" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 3) {
                pageNum = i + 1
              } else if (currentPage <= 2) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 1) {
                pageNum = totalPages - 2 + i
              } else {
                pageNum = currentPage - 1 + i
              }
              return (
                <button
                  key={i}
                  className={`join-item btn btn-sm ${currentPage === pageNum ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              )
            })}
            <button className="join-item btn btn-ghost btn-sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal suppression */}
      {showDeleteModal && paiementToDelete && (
        <div className="modal modal-open">
          <div className="modal-box rounded-2xl p-6">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-error mx-auto mb-3" />
              <h3 className="font-bold text-xl">Confirmer la suppression</h3>
              <p>Supprimer définitivement le paiement <span className="font-bold">{paiementToDelete.reference}</span> ?</p>
              <div className="flex gap-3 mt-6">
                <button className="btn btn-ghost flex-1" onClick={() => setShowDeleteModal(false)}>Annuler</button>
                <button className="btn btn-error flex-1" onClick={handleDelete}>Supprimer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideDown { animation: slideDown 0.2s ease-out; }
      `}</style>
    </div>
  )
}

export default Paiements