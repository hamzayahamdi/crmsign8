"use client"

import { cn } from "@/lib/utils"

interface LeadsTableSkeletonProps {
  rows?: number
}

export function LeadsTableSkeleton({ rows = 5 }: LeadsTableSkeletonProps) {
  return (
    <div className="glass rounded-lg border border-slate-600/30 overflow-hidden">
      {/* Table Header */}
      <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-600/30">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-32 bg-slate-700/50 rounded animate-pulse"></div>
            <div className="h-4 w-24 bg-slate-700/30 rounded animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[13%]" />
            <col className="w-[11%]" />
            <col className="w-[11%]" />
            <col className="w-[11%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead className="bg-slate-700/30">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                👤 Contact
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                🏙️ Ville
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                🏠 Bien
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                🧭 Source
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                👤 Assigné à
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                🔖 Statut
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                📅 Créé le
              </th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                ⚙️ Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-600/30">
            {Array.from({ length: rows }).map((_, index) => (
              <tr key={index} className="animate-pulse">
                {/* Contact (Nom & Téléphone) */}
                <td className="px-6 py-5">
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-32 bg-slate-700/50 rounded"></div>
                    <div className="h-3 w-28 bg-slate-700/30 rounded"></div>
                  </div>
                </td>

                {/* Ville */}
                <td className="px-4 py-5">
                  <div className="h-4 w-20 bg-slate-700/50 rounded"></div>
                </td>

                {/* Bien */}
                <td className="px-4 py-5">
                  <div className="h-4 w-24 bg-slate-700/50 rounded"></div>
                </td>

                {/* Source */}
                <td className="px-4 py-5">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 bg-slate-700/50 rounded"></div>
                      <div className="h-4 w-28 bg-slate-700/50 rounded"></div>
                    </div>
                    <div className="ml-5">
                      <div className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 border bg-slate-700/40 border-slate-600/60">
                        <div className="h-3.5 w-3.5 rounded-full bg-slate-600/70"></div>
                        <div className="h-2.5 w-12 rounded bg-slate-600/60"></div>
                        <div className="h-2.5 w-16 rounded bg-slate-600/50"></div>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Assigné à */}
                <td className="px-4 py-5">
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-3.5 bg-slate-700/50 rounded"></div>
                    <div className="h-4 w-16 bg-slate-700/50 rounded"></div>
                  </div>
                </td>

                {/* Statut */}
                <td className="px-4 py-5">
                  <div className="h-6 w-24 bg-slate-700/50 rounded-full"></div>
                </td>

                {/* Date création */}
                <td className="px-4 py-5">
                  <div className="h-4 w-20 bg-slate-700/50 rounded"></div>
                </td>

                {/* Actions */}
                <td className="px-4 py-5">
                  <div className="flex items-center justify-end space-x-1.5">
                    <div className="h-9 w-20 bg-slate-700/50 rounded"></div>
                    <div className="h-9 w-9 bg-slate-700/50 rounded"></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
