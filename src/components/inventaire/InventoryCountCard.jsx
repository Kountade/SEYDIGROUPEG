// src/components/inventaire/InventoryCountCard.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import {
  Warehouse, Calendar, User, Package, AlertTriangle,
  TrendingUp, TrendingDown, Eye
} from 'lucide-react'
import InventoryCountStatusBadge from './InventoryCountStatusBadge'

const InventoryCountCard = ({ inventory }) => {
  const {
    id, reference, warehouse_name, status, count_date,
    counted_by_name, total_items, total_differences,
    total_difference_value
  } = inventory

  const hasDifferences = total_differences > 0
  const differenceValue = parseFloat(total_difference_value) || 0
  const isPositive = differenceValue >= 0

  const formatPrice = (value) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'XOF', maximumFractionDigits: 0,
    }).format(value || 0)

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
    }) : '-'

  return (
    <div className="card bg-base-100 shadow-md border border-base-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="card-body p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-base-content">{reference}</h3>
              <p className="text-xs text-base-content/60 flex items-center gap-1">
                <Warehouse className="w-3 h-3" />
                {warehouse_name}
              </p>
            </div>
          </div>
          <InventoryCountStatusBadge status={status} size="sm" />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-base-content/60 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Date
            </span>
            <span className="font-medium">{formatDate(count_date)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-base-content/60 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Compté par
            </span>
            <span className="font-medium truncate max-w-[150px]">
              {counted_by_name || '-'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-base-content/60 flex items-center gap-1">
              <Package className="w-3.5 h-3.5" /> Articles
            </span>
            <span className="font-medium">{total_items}</span>
          </div>

          {hasDifferences && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-base-content/60 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning" /> Écarts
                </span>
                <span className="badge badge-warning badge-sm">
                  {total_differences}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-base-300">
                <span className="text-base-content/60">Valeur écart</span>
                <span className={`font-bold flex items-center gap-1 ${
                  isPositive ? 'text-success' : 'text-error'
                }`}>
                  {isPositive
                    ? <TrendingUp className="w-4 h-4" />
                    : <TrendingDown className="w-4 h-4" />}
                  {formatPrice(differenceValue)}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="card-actions justify-end mt-4 pt-3 border-t border-base-300">
          <Link
            to={`/inventaire/inventory-counts/${id}`}
            className="btn btn-primary btn-sm gap-2"
          >
            <Eye className="w-4 h-4" />
            Voir détails
          </Link>
        </div>
      </div>
    </div>
  )
}

export default InventoryCountCard