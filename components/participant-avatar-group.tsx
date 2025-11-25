'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface ParticipantInfo {
  id: string;
  name: string;
  email: string;
}

interface ParticipantAvatarGroupProps {
  participants: ParticipantInfo[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  overlap?: boolean;
}

const sizeClasses = {
  sm: 'h-5 w-5 text-xs',
  md: 'h-7 w-7 text-sm',
  lg: 'h-10 w-10 text-base',
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function ParticipantAvatarGroup({
  participants,
  maxVisible = 3,
  size = 'sm',
  overlap = true,
}: ParticipantAvatarGroupProps) {
  const visible = participants.slice(0, maxVisible);
  const extra = participants.length - maxVisible;

  return (
    <TooltipProvider>
      <div className={`flex ${overlap ? '-space-x-1.5' : 'gap-1'}`}>
        {visible.map((participant) => (
          <Tooltip key={participant.id}>
            <TooltipTrigger asChild>
              <Avatar className={`${sizeClasses[size]} border-2 border-white/20 dark:border-gray-700 cursor-pointer`}>
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.email}`}
                  alt={participant.name}
                />
                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 font-semibold">
                  {getInitials(participant.name)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {participant.name}
              <br />
              <span className="text-xs opacity-75">{participant.email}</span>
            </TooltipContent>
          </Tooltip>
        ))}

        {extra > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white/20 dark:border-gray-700 font-semibold cursor-pointer`}>
                +{extra}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <div className="text-xs space-y-1">
                {participants.slice(maxVisible).map((p) => (
                  <div key={p.id}>
                    {p.name}
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
