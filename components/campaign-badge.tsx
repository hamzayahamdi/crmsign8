"use client"

import { cn } from "@/lib/utils"
import { Sparkles, Archive } from "lucide-react"

interface CampaignBadgeProps {
  campaignName?: string
  className?: string
  size?: "sm" | "md" | "lg"
}

export function CampaignBadge({ campaignName, className, size = "sm" }: CampaignBadgeProps) {
  if (!campaignName) return null

  const isOldCampaign = campaignName.includes('Ancienne Campagne')
  const isNewCampaign = !isOldCampaign

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium transition-all",
        size === "sm" && "px-2 py-0.5 text-[10px]",
        size === "md" && "px-2.5 py-1 text-xs",
        size === "lg" && "px-3 py-1.5 text-sm",
        isNewCampaign && "bg-purple-500/10 border-purple-500/30 text-purple-400",
        isOldCampaign && "bg-gray-500/10 border-gray-500/20 text-gray-500",
        className
      )}
    >
      {isNewCampaign ? (
        <Sparkles className={cn(
          "flex-shrink-0",
          size === "sm" && "h-2.5 w-2.5",
          size === "md" && "h-3 w-3",
          size === "lg" && "h-3.5 w-3.5"
        )} />
      ) : (
        <Archive className={cn(
          "flex-shrink-0",
          size === "sm" && "h-2.5 w-2.5",
          size === "md" && "h-3 w-3",
          size === "lg" && "h-3.5 w-3.5"
        )} />
      )}
      <span className="truncate max-w-[150px]">
        {isNewCampaign ? campaignName : 'Ancienne Campagne'}
      </span>
    </div>
  )
}
