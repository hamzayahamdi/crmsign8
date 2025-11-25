'use client';

import { useState, useMemo } from 'react';
import { EVENT_TYPE_CONFIG, EventType, EventCategory } from '@/types/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Calendar, Filter, RotateCcw, Users, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface CalendarFiltersSidebarProps {
  architects: Array<{ id: string; name: string }>;
  selectedEventTypes: EventType[];
  onEventTypeChange: (types: EventType[]) => void;
  selectedArchitects: string[];
  onArchitectChange: (architects: string[]) => void;
  showOnlyMyEvents: boolean;
  onShowOnlyMyEventsChange: (show: boolean) => void;
  currentUserId: string;
  onSearch?: (query: string) => void;
}

export function CalendarFiltersSidebar({
  architects,
  selectedEventTypes,
  onEventTypeChange,
  selectedArchitects,
  onArchitectChange,
  showOnlyMyEvents,
  onShowOnlyMyEventsChange,
  currentUserId,
  onSearch,
}: CalendarFiltersSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const categories: EventCategory[] = ['RDV', 'TASKS', 'PAYMENTS', 'DEVIS', 'INTERNAL'];

  const eventTypesInCategory = (category: EventCategory): EventType[] => {
    return (Object.entries(EVENT_TYPE_CONFIG) as [EventType, typeof EVENT_TYPE_CONFIG[EventType]][])
      .filter(([_, config]) => config.category === category)
      .map(([type]) => type);
  };

  const isCategorySelected = (category: EventCategory) => {
    const types = eventTypesInCategory(category);
    return types.every((type) => selectedEventTypes.includes(type));
  };

  const handleCategoryChange = (category: EventCategory, checked: boolean) => {
    const types = eventTypesInCategory(category);
    if (checked) {
      const newTypes = [...selectedEventTypes, ...types].filter(
        (type, index, self) => self.indexOf(type) === index
      );
      onEventTypeChange(newTypes);
    } else {
      const newTypes = selectedEventTypes.filter((type) => !types.includes(type));
      onEventTypeChange(newTypes);
    }
  };

  const handleEventTypeChange = (type: EventType, checked: boolean) => {
    if (checked) {
      onEventTypeChange([...selectedEventTypes, type]);
    } else {
      onEventTypeChange(selectedEventTypes.filter((t) => t !== type));
    }
  };

  const handleResetFilters = () => {
    onEventTypeChange(
      (Object.entries(EVENT_TYPE_CONFIG) as [EventType, typeof EVENT_TYPE_CONFIG[EventType]][]).map(
        ([type]) => type
      )
    );
    onArchitectChange([]);
    onShowOnlyMyEventsChange(false);
    setSearchQuery('');
  };

  const selectedCount = selectedEventTypes.length + selectedArchitects.length;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col bg-background border-r border-border/40"
    >
      {/* Header */}
      <div className="p-4 border-b border-border/40">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Filtres</h3>
          </div>
          {selectedCount > 0 && (
            <span className="text-xs bg-blue-600 text-white rounded-full px-2 py-1">
              {selectedCount}
            </span>
          )}
        </div>

        {/* Search */}
        <Input
          placeholder="Chercher un événement..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            onSearch?.(e.target.value);
          }}
          className="h-8 text-sm"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Event Type Filters */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              Type d'événement
            </h4>
            <div className="space-y-2">
              {categories.map((category) => {
                const isSelected = isCategorySelected(category);
                const types = eventTypesInCategory(category);
                const categoryTitle = {
                  RDV: 'Rendez-vous',
                  TASKS: 'Tâches',
                  PAYMENTS: 'Paiements',
                  DEVIS: 'Devis',
                  INTERNAL: 'Événements internes',
                }[category];

                return (
                  <div key={category}>
                    {/* Category Header */}
                    <div className="flex items-center gap-2 mb-1">
                      <Checkbox
                        id={`category-${category}`}
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleCategoryChange(category, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`category-${category}`}
                        className="text-sm font-medium cursor-pointer flex-1"
                      >
                        {categoryTitle}
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        ({types.filter((t) => selectedEventTypes.includes(t)).length}/{types.length})
                      </span>
                    </div>

                    {/* Event Types in Category */}
                    <div className="ml-6 space-y-1.5 mb-2">
                      {types.map((type) => {
                        const config = EVENT_TYPE_CONFIG[type];
                        const isChecked = selectedEventTypes.includes(type);
                        return (
                          <div key={type} className="flex items-center gap-2">
                            <Checkbox
                              id={`type-${type}`}
                              checked={isChecked}
                              onCheckedChange={(checked) =>
                                handleEventTypeChange(type, checked as boolean)
                              }
                            />
                            <Label
                              htmlFor={`type-${type}`}
                              className="text-xs cursor-pointer flex items-center gap-2"
                            >
                              <span className={`w-2 h-2 rounded-full ${config.color}`} />
                              {config.label}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Architect Filter */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              Architectes
            </h4>
            <div className="space-y-2">
              {architects.map((architect) => (
                <div key={architect.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`architect-${architect.id}`}
                    checked={selectedArchitects.includes(architect.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onArchitectChange([...selectedArchitects, architect.id]);
                      } else {
                        onArchitectChange(
                          selectedArchitects.filter((id) => id !== architect.id)
                        );
                      }
                    }}
                  />
                  <Label
                    htmlFor={`architect-${architect.id}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {architect.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Show Only My Events */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              Vue personnelle
            </h4>
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-my-events"
                checked={showOnlyMyEvents}
                onCheckedChange={(checked) => onShowOnlyMyEventsChange(checked as boolean)}
              />
              <Label htmlFor="show-my-events" className="text-sm cursor-pointer flex-1">
                Afficher seulement mes événements
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Reset Button */}
      <div className="p-4 border-t border-border/40">
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetFilters}
          className="w-full text-xs"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Réinitialiser les filtres
        </Button>
      </div>
    </motion.div>
  );
}
