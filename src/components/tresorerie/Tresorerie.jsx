// src/components/tresorerie/Tresorerie.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AxiosInstance from '../AxiosInstance'
import {
  Wallet, Coins, PiggyBank, ArrowLeftRight, Receipt, TrendingUp,
  CheckCircle, Calendar, Plus, RefreshCw, AlertCircle, Check,
  Loader2, X,
} from 'lucide-react'

const todayLocal = () => {
  const d = new Date()
  const off = d.getTimezoneOffset()
  const local = new Date(d.getTime() - off * 60 * 1000)
  return local.toISOString().split('T')[0]
}

const unwrapList = (payload) => Array.isArray(payload) ? payload : (payload?.results || [])

const Tresorerie = () => {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    solde_global: 0, solde_caisses: 0, solde_banques: 0,
    nb_caisses: 0, nb_comptes: 0,
    encaissements_jour: 0, decaissements_jour: 0, flux_jour: 0,
    previsions_7j: 0, alertes: 0,
  })
  const [derniersMouvements, setDerniersMouvements] = useState([])
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })

  const abortRef = useRef(null)
  const notifTimerRef = useRef(null)

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type })
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current)
    notifTimerRef.current = setTimeout(
      () => setNotification({ show: false, message: '', type: 'success' }), 4000
    )
  }, [])

  useEffect(() => {
    return () => {
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  const fetchData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true); setError(null)
    try {
      const today = todayLocal()

      // ✅ 7 requêtes EN PARALLÈLE + bons endpoints + pagination
      const [globalRes, caissesRes, comptesRes, mvtJourRes, previsionsRes, alertesRes, derniersRes] = await Promise.all([
        // ✅ Bon endpoint (TresorerieGlobalView)
        AxiosInstance.get('/tresorerie-global/', { signal: controller.signal }).catch(() => ({ data: {} })),
        AxiosInstance.get('/caisses/', { params: { page_size: 200, is_active: true }, signal: controller.signal }).catch(() => ({ data: [] })),
        AxiosInstance.get('/comptes-bancaires/', { params: { page_size: 200, is_active: true }, signal: controller.signal }).catch(() => ({ data: [] })),
        // ✅ Bons params : date_debut/date_fin (pas ?date)
        AxiosInstance.get('/mouvements/', {
          params: { date_debut: today, date_fin: today, page_size: 500, status: 'effectue' },
          signal: controller.signal,
        }).catch(() => ({ data: [] })),
        AxiosInstance.get('/previsions/', {
          params: { date_debut: today, page_size: 200, statut: 'valide' },
          signal: controller.signal,
        }).catch(() => ({ data: [] })),
        AxiosInstance.get('/alertes-tresorerie/', { signal: controller.signal }).catch(() => ({ data: [] })),
        // ✅ page_size (pas limit)
        AxiosInstance.get('/mouvements/', {
          params: { page_size: 5, ordering: '-date_mouvement' },
          signal: controller.signal,
        }).catch(() => ({ data: [] })),
      ])

      const global = globalRes.data || {}
      const soldeGlobal = Number(global.solde_global) || 0
      const soldeCaissesFromGlobal = Number(global.solde_caisses) || 0
      const soldeBanquesFromGlobal = Number(global.solde_banques) || 0
      const nbCaissesFromGlobal = global.nb_caisses
      const nbComptesFromGlobal = global.nb_comptes

      const caisses = unwrapList(caissesRes.data)
      const comptes = unwrapList(comptesRes.data)

      // Fallback côté client si l'endpoint global renvoie 0
      const soldeCaisses = soldeCaissesFromGlobal || caisses.reduce((s, c) => s + (Number(c.solde_actuel) || 0), 0)
      const soldeBanques = soldeBanquesFromGlobal || comptes.reduce((s, c) => s + (Number(c.solde_actuel) || 0), 0)
      const soldeFinal = soldeGlobal || (soldeCaisses + soldeBanques)

      const mouvementsJour = unwrapList(mvtJourRes.data)
      const encaissements = mouvementsJour
        .filter(m => m.type_mouvement === 'encaissement')
        .reduce((s, m) => s + (Number(m.montant) || 0), 0)
      const decaissements = mouvementsJour
        .filter(m => m.type_mouvement === 'decaissement')
        .reduce((s, m) => s + (Number(m.montant) || 0), 0)

      // ✅ Prévisions 7j filtrées côté serveur (date_debut >= today, <= today+7)
      const sevenDays = new Date(Date.now() + 7 * 86400000)
      const sevenDaysLocal = new Date(sevenDays.getTime() - sevenDays.getTimezoneOffset() * 60000).toISOString().split('T')[0]
      const previsions = unwrapList(previsionsRes.data).filter(p => {
        const d = p.date_debut
        return d >= today && d <= sevenDaysLocal
      })
      const previsions7j = previsions.reduce((s, p) => s + (Number(p.montant_prevu) || 0), 0)

      const alertes = unwrapList(alertesRes.data)
      const alertesActives = alertes.filter(a => a.est_active !== false)

      setDerniersMouvements(unwrapList(derniersRes.data).slice(0, 5))

      setStats({
        solde_global: soldeFinal,
        solde_caisses: soldeCaisses,
        solde_banques: soldeBanques,
        nb_caisses: nbCaissesFromGlobal ?? caisses.length,
        nb_comptes: nbComptesFromGlobal ?? comptes.length,
        encaissements_jour: encaissements,
        decaissements_jour: decaissements,
        flux_jour: encaissements - decaissements,
        previsions_7j: previsions7j,
        alertes: alertesActives.length,
      })
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
      console.error('Erreur chargement trésorerie:', err)
      if (err.response?.status === 401) setError('Session expirée, veuillez vous reconnecter')
      else if (err.response?.status === 403) setError("Vous n'avez pas les droits pour voir cette page")
      else setError('Erreur de chargement de la trésorerie')
      showNotification('Erreur de chargement de la trésorerie', 'error')
    } finally {
      setLoading(false)
    }
  }, [showNotification])

  useEffect(() => { fetchData() }, [fetchData])

  const formatMontant = (montant) => {
    const n = Number(montant)
    if (!Number.isFinite(n)) return '0 FCFA'
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n) + ' FCFA'
  }

  const formatDate = (dateString, withTime = true) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
      })
    } catch { return '-' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-base sm:text-xl font-semibold text-base-content/70 animate-pulse">
            Chargement de la trésorerie...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h2 className="text-xl font-bold text-base-content mb-2">Erreur de chargement</h2>
          <p className="text-base-content/60 mb-4">{error}</p>
          <button onClick={fetchData} className="btn btn-primary gap-2">
            <RefreshCw className="w-4 h-4" /> Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      {notification.show && (
        <div className="fixed top-16 right-3 sm:right-6 z-50 animate-slideDown">
          <div className={`alert ${notification.type === 'success' ? 'alert-success' : 'alert-error'} shadow-lg text-sm sm:text-base`}>
            {notification.type === 'success'
              ? <Check className="w-4 h-4 sm:w-5 sm:h-5" />
              : <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
            <span className="font-semibold">{notification.message}</span>
            <button className="btn btn-ghost btn-xs btn-circle" onClick={() => setNotification({ ...notification, show: false })}>
              <X className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-base-content bg-gradient-to-r from-success to-primary bg-clip-text text-transparent">
            💰 Trésorerie
          </h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            Vue d'ensemble des flux financiers et des soldes
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button onClick={fetchData} className="btn btn-sm sm:btn-md btn-outline gap-1 sm:gap-2" disabled={loading}>
            <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Actualiser</span>
          </button>
          <button onClick={() => navigate('/mouvements/nouveau')} className="btn btn-sm sm:btn-md btn-success gap-1 sm:gap-2">
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Nouveau mouvement</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-success"><Wallet className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Solde global</div>
          <div className={`stat-value text-lg sm:text-2xl lg:text-3xl font-black ${stats.solde_global >= 0 ? 'text-success' : 'text-error'}`}>
            {formatMontant(stats.solde_global)}
          </div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-info"><Coins className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Caisses</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-info">
            {formatMontant(stats.solde_caisses)}
          </div>
          <div className="stat-desc text-xs">{stats.nb_caisses} caisse(s)</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-primary"><PiggyBank className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Comptes bancaires</div>
          <div className="stat-value text-lg sm:text-2xl lg:text-3xl font-black text-primary">
            {formatMontant(stats.solde_banques)}
          </div>
          <div className="stat-desc text-xs">{stats.nb_comptes} compte(s)</div>
        </div>
        <div className="stat bg-base-100 rounded-xl shadow-md border border-base-200 p-2 sm:p-3 lg:p-4">
          <div className="stat-figure text-warning"><ArrowLeftRight className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" /></div>
          <div className="stat-title text-xs sm:text-sm font-semibold">Flux du jour</div>
          <div className={`stat-value text-lg sm:text-2xl lg:text-3xl font-black ${stats.flux_jour >= 0 ? 'text-success' : 'text-error'}`}>
            {stats.flux_jour >= 0 ? '+' : ''}{formatMontant(stats.flux_jour)}
          </div>
          <div className="stat-desc text-xs flex gap-2 flex-wrap">
            <span className="text-success">+{formatMontant(stats.encaissements_jour)}</span>
            <span className="text-error">-{formatMontant(stats.decaissements_jour)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
        <button onClick={() => navigate('/caisses')} className="p-3 sm:p-4 bg-base-100 rounded-xl shadow-md border border-base-200 hover:border-info transition-all text-center group">
          <Coins className="w-6 h-6 sm:w-8 sm:h-8 text-info mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-medium text-xs sm:text-sm">Caisses</p>
        </button>
        <button onClick={() => navigate('/comptes-bancaires')} className="p-3 sm:p-4 bg-base-100 rounded-xl shadow-md border border-base-200 hover:border-primary transition-all text-center group">
          <PiggyBank className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-medium text-xs sm:text-sm">Comptes bancaires</p>
        </button>
        <button onClick={() => navigate('/mouvements')} className="p-3 sm:p-4 bg-base-100 rounded-xl shadow-md border border-base-200 hover:border-warning transition-all text-center group">
          <ArrowLeftRight className="w-6 h-6 sm:w-8 sm:h-8 text-warning mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-medium text-xs sm:text-sm">Mouvements</p>
        </button>
        <button onClick={() => navigate('/previsions')} className="p-3 sm:p-4 bg-base-100 rounded-xl shadow-md border border-base-200 hover:border-success transition-all text-center group">
          <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-success mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-medium text-xs sm:text-sm">Prévisions</p>
        </button>
        <button onClick={() => navigate('/rapprochements')} className="p-3 sm:p-4 bg-base-100 rounded-xl shadow-md border border-base-200 hover:border-secondary transition-all text-center group">
          <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-secondary mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-medium text-xs sm:text-sm">Rapprochements</p>
        </button>
        <button onClick={() => navigate('/frais')} className="p-3 sm:p-4 bg-base-100 rounded-xl shadow-md border border-base-200 hover:border-error transition-all text-center group">
          <Receipt className="w-6 h-6 sm:w-8 sm:h-8 text-error mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-medium text-xs sm:text-sm">Frais</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">📋 Derniers mouvements</h2>
            <button onClick={() => navigate('/mouvements')} className="text-sm text-primary hover:underline">
              Voir tout →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr className="text-xs text-base-content/60">
                  <th>Date</th>
                  <th>Type</th>
                  <th>Libellé</th>
                  <th className="text-right">Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {derniersMouvements.length > 0 ? (
                  derniersMouvements.map((m) => (
                    <tr key={m.id} className="hover">
                      <td className="text-xs whitespace-nowrap">{formatDate(m.date_mouvement)}</td>
                      <td>
                        <span className={`badge badge-sm ${m.type_mouvement === 'encaissement' ? 'badge-success' : m.type_mouvement === 'decaissement' ? 'badge-error' : 'badge-info'}`}>
                          {m.type_mouvement_display || m.type_mouvement}
                        </span>
                      </td>
                      <td className="text-sm truncate max-w-[150px]" title={m.libelle}>{m.libelle}</td>
                      <td className={`text-right font-mono text-sm ${m.type_mouvement === 'encaissement' ? 'text-success' : m.type_mouvement === 'decaissement' ? 'text-error' : ''}`}>
                        {m.type_mouvement === 'encaissement' ? '+' : m.type_mouvement === 'decaissement' ? '-' : ''}
                        {formatMontant(m.montant)}
                      </td>
                      <td>
                        <span className={`badge badge-sm ${m.status === 'effectue' ? 'badge-success' : m.status === 'planifie' ? 'badge-warning' : 'badge-ghost'}`}>
                          {m.status_display || m.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-base-content/40">
                      Aucun mouvement récent
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-base-100 rounded-xl shadow-md border border-base-200 p-4">
          <h2 className="text-lg font-semibold mb-4">🔔 Alertes</h2>
          <div className="space-y-3">
            {stats.alertes > 0 ? (
              <div className="p-3 bg-warning/10 rounded-xl border border-warning/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-warning">Alertes actives</p>
                    <p className="text-sm text-base-content/60">{stats.alertes} alerte(s) à traiter</p>
                    <button onClick={() => navigate('/alertes')} className="btn btn-xs btn-warning btn-outline mt-2">
                      Voir les alertes
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-success/10 rounded-xl border border-success/20">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-success">Tout est bon !</p>
                    <p className="text-sm text-base-content/60">Aucune alerte à signaler</p>
                  </div>
                </div>
              </div>
            )}

            {stats.previsions_7j > 0 && (
              <div className="p-3 bg-info/10 rounded-xl border border-info/20">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-info mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-info">Prévisions 7 jours</p>
                    <p className="text-sm font-bold text-info">{formatMontant(stats.previsions_7j)}</p>
                    <p className="text-xs text-base-content/60">Entrées prévues</p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-3 bg-base-200 rounded-xl">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Suivi journalier</p>
                  <div className="flex gap-4 mt-1">
                    <div>
                      <p className="text-xs text-base-content/60">Entrées</p>
                      <p className="text-sm font-bold text-success">+{formatMontant(stats.encaissements_jour)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-base-content/60">Sorties</p>
                      <p className="text-sm font-bold text-error">-{formatMontant(stats.decaissements_jour)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button onClick={() => navigate('/tresorerie-journaliere')} className="w-full btn btn-outline btn-sm gap-2">
              <Calendar className="w-4 h-4" /> Voir le suivi journalier
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
      `}</style>
    </div>
  )
}

export default Tresorerie