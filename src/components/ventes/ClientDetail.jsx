// src/components/sales/ClientDetail.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  ArrowLeft, User, Building2, Phone, Mail, MapPin, Edit,
  ShoppingCart, FileText, CreditCard, Star, StarOff,
  Calendar, Briefcase, Tag, AlertCircle, CheckCircle,
  RefreshCw, Trash2, Package, DollarSign
} from 'lucide-react'

const ClientDetail = () => {
  const navigate = useNavigate()
  const { id } = useParams()

  const [client, setClient] = useState(null)
  const [ventes, setVentes] = useState([])
  const [factures, setFactures] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ventes')
  const [notification, setNotification] = useState(null)

  const showMessage = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [clientRes, ventesRes, facturesRes] = await Promise.all([
        AxiosInstance.get(`/clients/${id}/`),
        AxiosInstance.get(`/ventes/?client_id=${id}`).catch(() => ({ data: [] })),
        AxiosInstance.get(`/factures/?client=${id}`).catch(() => ({ data: [] }))
      ])
      
      setClient(clientRes.data)
      setVentes(ventesRes.data || [])
      setFactures(facturesRes.data || [])
      
      // Calculer les statistiques
      const totalAchats = (ventesRes.data || []).reduce((sum, v) => sum + v.total, 0)
      const totalPaye = (ventesRes.data || []).reduce((sum, v) => sum + v.montant_paye, 0)
      const nbVentes = (ventesRes.data || []).length
      const nbFactures = (facturesRes.data || []).length
      
      setStats({
        totalAchats,
        totalPaye,
        resteAPayer: totalAchats - totalPaye,
        nbVentes,
        nbFactures
      })
    } catch (error) {
      console.error('Erreur:', error)
      if (error.response?.status === 404) {
        showMessage('Client non trouvé', 'error')
        setTimeout(() => navigate('/clients'), 1500)
      } else {
        showMessage('Erreur de chargement', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const getClientTypeIcon = () => {
    if (!client) return <User className="w-5 h-5" />
    switch(client.client_type) {
      case 'entreprise': return <Building2 className="w-5 h-5" />
      case 'revendeur': return <Star className="w-5 h-5" />
      default: return <User className="w-5 h-5" />
    }
  }

  const getClientTypeLabel = () => {
    if (!client) return ''
    switch(client.client_type) {
      case 'entreprise': return 'Entreprise'
      case 'revendeur': return 'Revendeur'
      default: return 'Particulier'
    }
  }

  const formatPrice = (price) => {
    if (!price) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA'
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-100">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!client) return null

  return (
    <div className="min-h-screen bg-base-100 p-4 lg:p-8">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-20 right-6 z-50 animate-slideDown alert ${notification.type === 'error' ? 'alert-error' : 'alert-success'} shadow-lg max-w-md`}>
          {notification.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/clients')} className="btn btn-ghost btn-sm btn-circle">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-primary">
              {client.nom} {client.prenom || ''}
            </h1>
            {client.raison_sociale && (
              <p className="text-sm text-base-content/60">{client.raison_sociale}</p>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn btn-outline btn-sm gap-2">
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
          <button 
            onClick={() => navigate(`/clients/${id}/modifier`)} 
            className="btn btn-primary btn-sm gap-2"
          >
            <Edit className="w-4 h-4" />
            Modifier
          </button>
        </div>
      </div>

      {/* Cartes d'information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Informations personnelles */}
        <div className="card bg-base-200 shadow-lg lg:col-span-1">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                {getClientTypeIcon()}
              </div>
              <div>
                <h2 className="text-lg font-semibold">Informations</h2>
                <p className="text-xs text-base-content/60">{getClientTypeLabel()}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {client.telephone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-base-content/60" />
                  <span>{client.telephone}</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-base-content/60" />
                  <span>{client.email}</span>
                </div>
              )}
              {client.adresse && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-base-content/60" />
                  <span>{client.adresse}</span>
                </div>
              )}
              {client.numero_tva && (
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="w-4 h-4 text-base-content/60" />
                  <span>TVA: {client.numero_tva}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t flex gap-2">
              {client.est_revendeur && (
                <span className="badge badge-warning gap-1">
                  <Star className="w-3 h-3" /> Revendeur
                </span>
              )}
              {!client.is_active && (
                <span className="badge badge-error gap-1">
                  <StarOff className="w-3 h-3" /> Inactif
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card bg-base-200 shadow-lg">
            <div className="card-body text-center">
              <ShoppingCart className="w-8 h-8 mx-auto text-primary mb-2" />
              <p className="stat-value text-primary">{stats?.nbVentes || 0}</p>
              <p className="stat-title">Ventes</p>
            </div>
          </div>
          
          <div className="card bg-base-200 shadow-lg">
            <div className="card-body text-center">
              <FileText className="w-8 h-8 mx-auto text-secondary mb-2" />
              <p className="stat-value text-secondary">{stats?.nbFactures || 0}</p>
              <p className="stat-title">Factures</p>
            </div>
          </div>
          
          <div className="card bg-base-200 shadow-lg">
            <div className="card-body text-center">
              <DollarSign className="w-8 h-8 mx-auto text-success mb-2" />
              <p className="stat-value text-success">{formatPrice(stats?.totalAchats)}</p>
              <p className="stat-title">Total achats</p>
            </div>
          </div>
          
          <div className="card bg-base-200 shadow-lg">
            <div className="card-body text-center">
              <CreditCard className="w-8 h-8 mx-auto text-warning mb-2" />
              <p className="stat-value text-warning">{formatPrice(stats?.resteAPayer)}</p>
              <p className="stat-title">Reste à payer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed bg-base-200 p-1 mb-6">
        <button 
          className={`tab gap-2 ${activeTab === 'ventes' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('ventes')}
        >
          <ShoppingCart className="w-4 h-4" /> Ventes ({ventes.length})
        </button>
        <button 
          className={`tab gap-2 ${activeTab === 'factures' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('factures')}
        >
          <FileText className="w-4 h-4" /> Factures ({factures.length})
        </button>
      </div>

      {/* Contenu Ventes */}
      {activeTab === 'ventes' && (
        <div className="card bg-base-200 shadow-lg">
          <div className="card-body">
            <h3 className="text-lg font-semibold mb-4">Historique des ventes</h3>
            {ventes.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 mx-auto text-base-content/30 mb-2" />
                <p className="text-base-content/60">Aucune vente pour ce client</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr className="bg-base-300">
                      <th>Référence</th>
                      <th>Date</th>
                      <th>Total</th>
                      <th>Payé</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventes.map((vente) => (
                      <tr key={vente.id} className="hover:bg-base-300 cursor-pointer" onClick={() => navigate(`/ventes/${vente.id}`)}>
                        <td className="font-mono text-sm">{vente.reference}</td>
                        <td className="text-sm">{formatDate(vente.date_vente)}</td>
                        <td className="font-semibold">{formatPrice(vente.total)}</td>
                        <td>{formatPrice(vente.montant_paye)}</td>
                        <td>
                          <span className={`badge ${
                            vente.status === 'completed' ? 'badge-success' :
                            vente.status === 'pending_approval' ? 'badge-warning' :
                            vente.status === 'approved' ? 'badge-info' :
                            'badge-ghost'
                          }`}>
                            {vente.status === 'completed' ? 'Complétée' :
                             vente.status === 'pending_approval' ? 'En attente' :
                             vente.status === 'approved' ? 'Approuvée' : vente.status}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-xs">Voir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contenu Factures */}
      {activeTab === 'factures' && (
        <div className="card bg-base-200 shadow-lg">
          <div className="card-body">
            <h3 className="text-lg font-semibold mb-4">Historique des factures</h3>
            {factures.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-base-content/30 mb-2" />
                <p className="text-base-content/60">Aucune facture pour ce client</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr className="bg-base-300">
                      <th>Référence</th>
                      <th>Date</th>
                      <th>Échéance</th>
                      <th>Total</th>
                      <th>Payé</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {factures.map((facture) => (
                      <tr key={facture.id} className="hover:bg-base-300 cursor-pointer" onClick={() => navigate(`/factures/${facture.id}`)}>
                        <td className="font-mono text-sm">{facture.reference}</td>
                        <td className="text-sm">{formatDate(facture.date_facture)}</td>
                        <td className="text-sm">{new Date(facture.date_echeance).toLocaleDateString('fr-FR')}</td>
                        <td className="font-semibold">{formatPrice(facture.total_ttc)}</td>
                        <td>{formatPrice(facture.montant_paye)}</td>
                        <td>
                          <span className={`badge ${
                            facture.statut === 'payee' ? 'badge-success' :
                            facture.statut === 'en_retard' ? 'badge-error' :
                            facture.statut === 'partiellement_payee' ? 'badge-warning' :
                            'badge-info'
                          }`}>
                            {facture.statut === 'payee' ? 'Payée' :
                             facture.statut === 'en_retard' ? 'En retard' :
                             facture.statut === 'partiellement_payee' ? 'Partiel' : facture.statut}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-xs">Voir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientDetail