"use client"

import { motion } from "framer-motion"

export function ArchitectCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="glass rounded-2xl p-6 border border-slate-600/30"
    >
      {/* Header with Avatar */}
      <div className="flex items-start gap-4 mb-5">
        <div className="h-16 w-16 rounded-full bg-slate-700/50 animate-pulse" />
        
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-5 bg-slate-700/50 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-slate-700/50 rounded animate-pulse w-1/2" />
        </div>
      </div>

      {/* Info Grid */}
      <div className="space-y-3 mb-5">
        <div className="h-4 bg-slate-700/50 rounded animate-pulse w-2/3" />
        <div className="h-4 bg-slate-700/50 rounded animate-pulse w-1/2" />
        <div className="h-4 bg-slate-700/50 rounded animate-pulse w-3/5" />
      </div>

      {/* Stats Pills */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass rounded-lg p-2 border border-slate-600/20">
            <div className="h-6 bg-slate-700/50 rounded animate-pulse mb-1" />
            <div className="h-3 bg-slate-700/50 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Action Button */}
      <div className="h-10 bg-slate-700/50 rounded-lg animate-pulse" />
    </motion.div>
  )
}

export function ArchitectTableSkeleton() {
  return (
    <div className="glass rounded-2xl border border-slate-600/30 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-600/30 bg-slate-800/60">
              <th className="text-left p-4 text-sm font-semibold text-slate-300">Architecte</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-300">Contact</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-300">Ville</th>
              <th className="text-left p-4 text-sm font-semibold text-slate-300">Spécialité</th>
              <th className="text-center p-4 text-sm font-semibold text-slate-300">Dossiers</th>
              <th className="text-center p-4 text-sm font-semibold text-slate-300">Statut</th>
              <th className="text-center p-4 text-sm font-semibold text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="border-b border-slate-600/20">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-700/50 animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-700/50 rounded animate-pulse w-32" />
                      <div className="h-3 bg-slate-700/50 rounded animate-pulse w-24" />
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-700/50 rounded animate-pulse w-28" />
                    <div className="h-3 bg-slate-700/50 rounded animate-pulse w-32" />
                  </div>
                </td>
                <td className="p-4">
                  <div className="h-4 bg-slate-700/50 rounded animate-pulse w-20" />
                </td>
                <td className="p-4">
                  <div className="h-6 bg-slate-700/50 rounded-full animate-pulse w-24" />
                </td>
                <td className="p-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-8 bg-slate-700/50 rounded animate-pulse w-12" />
                    <div className="h-3 bg-slate-700/50 rounded animate-pulse w-32" />
                  </div>
                </td>
                <td className="p-4 text-center">
                  <div className="h-6 bg-slate-700/50 rounded-full animate-pulse w-20 mx-auto" />
                </td>
                <td className="p-4 text-center">
                  <div className="h-8 bg-slate-700/50 rounded animate-pulse w-20 mx-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
