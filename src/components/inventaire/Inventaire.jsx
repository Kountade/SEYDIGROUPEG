// src/components/inventaire/Inventaire.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import { Package, ClipboardList, ArrowLeftRight, TrendingUp, Warehouse } from 'lucide-react'

const Inventaire = () => {
  const modules = [
    {
      to: '/inventaire/inventory-counts',
      icon: ClipboardList,
      title: 'Inventaires',
      description: 'Comptages et ajustements de stock',
      color: 'primary',
    },
    {
      to: '/inventaire/warehouses',
      icon: Warehouse,
      title: 'Entrepôts',
      description: 'Gérer les entrepôts et magasins',
      color: 'secondary',
    },
    {
      to: '/inventaire/stock-movements',
      icon: TrendingUp,
      title: 'Mouvements',
      description: 'Entrées, sorties et transferts',
      color: 'accent',
    },
    {
      to: '/inventaire/transfers',
      icon: ArrowLeftRight,
      title: 'Transferts',
      description: 'Transferts entre agences',
      color: 'info',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Module Inventaire
        </h1>
        <p className="text-base-content/60 mt-1">
          Gérez vos stocks, entrepôts et mouvements
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {modules.map(m => {
          const Icon = m.icon
          return (
            <Link
              key={m.to}
              to={m.to}
              className="card bg-base-100 shadow-md border border-base-300 hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              <div className="card-body items-center text-center p-6">
                <div className={`w-14 h-14 rounded-xl bg-${m.color}/10 flex items-center justify-center`}>
                  <Icon className={`w-7 h-7 text-${m.color}`} />
                </div>
                <h3 className="font-bold text-lg mt-2">{m.title}</h3>
                <p className="text-sm text-base-content/60">{m.description}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default Inventaire