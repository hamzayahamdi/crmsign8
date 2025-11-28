"use client"

import { cn } from "@/lib/utils"

interface LeadsTableSkeletonProps {
  rows?: number
}

export function LeadsTableSkeleton({ rows = 5 }: LeadsTableSkeletonProps) {
  return (
    <>
      {/* Mobile Card Skeleton */}
      <div className="lg:hidden space-y-4 px-4 pb-20 mt-4">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={`mobile-${index}`}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3 animate-pulse"
          >
            {/* Header: Name, Status, Date */}
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1">
                <div className="h-4 w-32 bg-slate-700/50 rounded mb-2" />
                <div className="flex items-center gap-2">
                  <div className="h-5 w-20 bg-slate-700/40 rounded-full" />
                  <div className="h-3 w-16 bg-slate-700/30 rounded" />
                </div>
              </div>
              <div className="h-8 w-8 bg-slate-700/50 rounded" />
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 bg-slate-700/50 rounded" />
                <div className="h-3 w-24 bg-slate-700/50 rounded" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 bg-slate-700/50 rounded" />
                <div className="h-3 w-20 bg-slate-700/50 rounded" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 bg-slate-700/50 rounded" />
                <div className="h-3 w-28 bg-slate-700/50 rounded" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 bg-slate-700/50 rounded" />
                <div className="h-3 w-24 bg-slate-700/50 rounded" />
              </div>
            </div>

            {/* Source */}
            <div className="pt-3 border-t border-slate-700/50">
              <div className="h-3 w-32 bg-slate-700/50 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden lg:block rounded-lg border border-[#1F2937] overflow-hidden bg-white/5 backdrop-blur-sm">
        {/* Table Header */}
        <div className="bg-slate-800/30 px-6 py-4 border-b border-[#1F2937]">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 w-36 bg-slate-700/50 rounded animate-pulse" />
              <div className="h-4 w-28 bg-slate-700/30 rounded animate-pulse" />
            </div>
            <div className="hidden md:flex items-center gap-2">
              <div className="h-6 w-24 bg-slate-700/40 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[16%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead className="bg-slate-800/20 border-b border-[#1F2937] sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Ville
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Bien
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Assigné à
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Durée en lead
                </th>
                <th className="px-4 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {/* Actions */}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2937]">
              {Array.from({ length: rows }).map((_, index) => (
                <tr key={index} className="animate-pulse">
                  {/* Contact (Nom & Téléphone) */}
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-2">
                      <div className="h-4 w-40 bg-slate-700/50 rounded" />
                      <div className="h-3 w-28 bg-slate-700/30 rounded" />
                    </div>
                  </td>

                  {/* Ville */}
                  <td className="px-4 py-5">
                    <div className="h-4 w-20 bg-slate-700/50 rounded" />
                  </td>

                  {/* Bien */}
                  <td className="px-4 py-5">
                    <div className="h-4 w-24 bg-slate-700/50 rounded" />
                  </td>

                  {/* Source */}
                  <td className="px-4 py-5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 bg-slate-700/50 rounded" />
                        <div className="h-4 w-28 bg-slate-700/50 rounded" />
                      </div>
                      <div className="ml-5">
                        <div className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 border bg-slate-700/40 border-slate-600/60">
                          <div className="h-3.5 w-3.5 rounded-full bg-slate-600/70" />
                          <div className="h-2.5 w-12 rounded bg-slate-600/60" />
                          <div className="h-2.5 w-16 rounded bg-slate-600/50" />
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Assigné à */}
                  <td className="px-4 py-5">
                    <div className="flex items-center gap-2">
                      <div className="h-3.5 w-3.5 bg-slate-700/50 rounded" />
                      <div className="h-4 w-20 bg-slate-700/50 rounded" />
                    </div>
                  </td>

                  {/* Statut */}
                  <td className="px-4 py-5">
                    <div className="h-6 w-24 bg-slate-700/50 rounded-full" />
                  </td>

                  {/* Durée en lead */}
                  <td className="px-4 py-5">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                      <div className="h-3 w-24 bg-slate-700/50 rounded" />
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-5">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="h-8 w-8 bg-slate-700/50 rounded" />
                      <div className="h-8 w-8 bg-slate-700/50 rounded" />
                      <div className="h-8 w-8 bg-slate-700/50 rounded" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table >
        </div >
      </div >
    </>
  )
}
