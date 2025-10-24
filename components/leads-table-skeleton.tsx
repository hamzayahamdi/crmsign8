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
            <col className="w-[28%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[11%]" />
            <col className="w-[10%]" />
            <col className="w-[9%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead className="bg-slate-700/30">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Bien
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Source
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Priorité
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Assigné
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Mis à jour
              </th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-600/30">
            {Array.from({ length: rows }).map((_, index) => (
              <tr key={index} className="animate-pulse">
                {/* Contact Info */}
                <td className="px-6 py-5">
                  <div className="flex items-start space-x-3">
                    <div className="w-11 h-11 rounded-full bg-slate-700/50"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-slate-700/50 rounded"></div>
                      <div className="h-3 w-24 bg-slate-700/30 rounded"></div>
                      <div className="h-3 w-40 bg-slate-700/20 rounded"></div>
                    </div>
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-5">
                  <div className="h-6 w-20 bg-slate-700/50 rounded-full"></div>
                </td>

                {/* Property */}
                <td className="px-4 py-5">
                  <div className="h-4 w-20 bg-slate-700/50 rounded"></div>
                </td>

                {/* Source */}
                <td className="px-4 py-5">
                  <div className="h-4 w-24 bg-slate-700/50 rounded"></div>
                </td>

                {/* Priority */}
                <td className="px-4 py-5">
                  <div className="h-6 w-16 bg-slate-700/50 rounded-full"></div>
                </td>

                {/* Assigned */}
                <td className="px-4 py-5">
                  <div className="h-4 w-16 bg-slate-700/50 rounded"></div>
                </td>

                {/* Last Update */}
                <td className="px-4 py-5">
                  <div className="h-4 w-20 bg-slate-700/50 rounded"></div>
                </td>

                {/* Actions */}
                <td className="px-4 py-5">
                  <div className="flex items-center justify-end space-x-1.5">
                    <div className="h-9 w-9 bg-slate-700/50 rounded"></div>
                    <div className="h-9 w-9 bg-slate-700/50 rounded"></div>
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
