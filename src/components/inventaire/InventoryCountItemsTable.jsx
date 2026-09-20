// src/components/inventaire/InventoryCountItemsTable.jsx
import React, { useState, useMemo } from 'react'
import {
  Search, Save, Loader2, Package, TrendingUp, TrendingDown, Check
} from 'lucide-react'

const InventoryCountItemsTable = ({
  items,
  onSaveItem,
  saving,
  readOnly = false
}) => {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [localValues, setLocalValues] = useState({})

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchSearch = search === '' ||
        item.product_name?.toLowerCase().includes(search.toLowerCase()) ||
        item.product_reference?.toLowerCase().includes(search.toLowerCase())

      let matchFilter = true
      if (filter === 'pending') matchFilter = !item.is_counted
      if (filter === 'counted') matchFilter = item.is_counted
      if (filter === 'differences') matchFilter = item.difference !== 0

      return matchSearch && matchFilter
    })
  }, [items, search, filter])

  const getDisplayValue = (item) =>
    localValues[item.id] !== undefined
      ? localValues[item.id]
      : (item.counted_quantity ?? item.theoretical_quantity ?? 0)

  const handleChange = (item, value) => {
    const counted = value === '' ? '' : parseInt(value)
    setLocalValues(prev => ({ ...prev, [item.id]: counted }))
  }

  const handleSaveItem = async (item) => {
    const counted = parseInt(localValues[item.id] ?? getDisplayValue(item)) || 0
    await onSaveItem(item.id, counted)
    setLocalValues(prev => {
      const cp = { ...prev }
      delete cp[item.id]
      return cp
    })
  }

  const formatPrice = (v) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'XOF', maximumFractionDigits: 0,
    }).format(v || 0)

  const formatNumber = (n) => new Intl.NumberFormat('fr-FR').format(n || 0)

  return (
    <div className="space-y-4">
      {/* Barre outils */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un produit..."
            className="input input-bordered w-full pl-10"
          />
        </div>

        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="select select-bordered min-w-[180px]"
        >
          <option value="all">Tous les articles</option>
          <option value="pending">Non comptés</option>
          <option value="counted">Comptés</option>
          <option value="differences">Avec écarts</option>
        </select>
      </div>

      {/* Résumé */}
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="badge badge-ghost gap-1">
          <Package className="w-3 h-3" /> {items.length} articles
        </span>
        <span className="badge badge-success gap-1">
          <Check className="w-3 h-3" />
          {items.filter(i => i.is_counted).length} comptés
        </span>
        <span className="badge badge-warning gap-1">
          {items.filter(i => i.difference !== 0).length} écarts
        </span>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto rounded-xl border border-base-300">
        <table className="table table-zebra">
          <thead className="bg-base-200">
            <tr>
              <th>Produit</th>
              <th>Référence</th>
              <th className="text-center">Théorique</th>
              <th className="text-center">Compté</th>
              <th className="text-center">Écart</th>
              <th className="text-right">Valeur écart</th>
              {!readOnly && <th className="text-right">Action</th>}
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => {
              const display = getDisplayValue(item)
              const diff = (parseInt(display) || 0) - item.theoretical_quantity
              const hasDiff = diff !== 0
              const isDirty = localValues[item.id] !== undefined

              return (
                <tr key={item.id} className="hover">
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium">{item.product_name}</span>
                    </div>
                  </td>
                  <td>
                    <code className="text-xs bg-base-200 px-2 py-1 rounded font-mono">
                      {item.product_reference}
                    </code>
                  </td>
                  <td className="text-center font-semibold">
                    {formatNumber(item.theoretical_quantity)}
                  </td>
                  <td className="text-center">
                    {readOnly ? (
                      <span className="font-semibold">
                        {formatNumber(item.counted_quantity)}
                      </span>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        value={display}
                        onChange={e => handleChange(item, e.target.value)}
                        className={`input input-sm input-bordered w-24 text-center ${
                          isDirty ? 'input-warning' : ''
                        }`}
                      />
                    )}
                  </td>
                  <td className="text-center">
                    {hasDiff ? (
                      <span className={`badge gap-1 ${
                        diff > 0 ? 'badge-success' : 'badge-error'
                      }`}>
                        {diff > 0
                          ? <TrendingUp className="w-3 h-3" />
                          : <TrendingDown className="w-3 h-3" />}
                        {diff > 0 ? '+' : ''}{formatNumber(diff)}
                      </span>
                    ) : (
                      <span className="text-base-content/40">—</span>
                    )}
                  </td>
                  <td className="text-right font-semibold">
                    {hasDiff
                      ? formatPrice(diff * (item.unit_price || 0))
                      : '—'}
                  </td>
                  {!readOnly && (
                    <td className="text-right">
                      <button
                        onClick={() => handleSaveItem(item)}
                        disabled={!isDirty || saving}
                        className="btn btn-xs btn-primary gap-1"
                      >
                        {saving
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Save className="w-3 h-3" />}
                        OK
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredItems.length === 0 && (
          <div className="text-center py-12 text-base-content/50">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Aucun article à afficher</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default InventoryCountItemsTable