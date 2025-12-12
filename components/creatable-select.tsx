"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

interface CreatableSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: string[]
  placeholder?: string
  emptyText?: string
  searchPlaceholder?: string
  className?: string
  disabled?: boolean
  onCreateNew?: (newValue: string) => void
}

export function CreatableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Sélectionner...",
  emptyText = "Aucun résultat trouvé",
  searchPlaceholder = "Rechercher...",
  className,
  disabled = false,
  onCreateNew,
}: CreatableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  const [localOptions, setLocalOptions] = React.useState<string[]>(options)

  // Update local options when props change
  React.useEffect(() => {
    setLocalOptions(options)
  }, [options])

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue)
    setOpen(false)
    setSearchValue("")
  }

  const handleCreateNew = () => {
    const trimmedValue = searchValue.trim()
    if (trimmedValue && !localOptions.includes(trimmedValue)) {
      const newOptions = [...localOptions, trimmedValue]
      setLocalOptions(newOptions)
      onValueChange(trimmedValue)

      // Call the callback to update parent state
      if (onCreateNew) {
        onCreateNew(trimmedValue)
      }

      setOpen(false)
      setSearchValue("")
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onValueChange("")
  }

  const trimmedSearch = searchValue.trim()
  const filteredOptions = localOptions.filter((option) =>
    option.toLowerCase().includes(searchValue.toLowerCase())
  )

  const canCreateNew = trimmedSearch && !localOptions.some(opt => opt.toLowerCase() === trimmedSearch.toLowerCase())

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          type="button"
          className={cn(
            "w-full h-8 justify-between border border-slate-600/40 bg-slate-800/60 text-white hover:bg-slate-800/70 hover:border-slate-500/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 focus:bg-slate-800/60 transition-all duration-200 font-normal px-3 text-xs",
            !value && "text-slate-400",
            open && "border-primary/50 ring-1 ring-primary/20",
            className
          )}
        >
          <span className="truncate text-left font-light flex-1 mr-2 text-xs">
            {value || placeholder}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {value && !disabled && (
              <div
                className="h-3.5 w-3.5 shrink-0 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                onClick={handleClear}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <X className="h-3.5 w-3.5" />
              </div>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-slate-800/95 backdrop-blur-xl border-slate-600/50 shadow-xl" align="start">
        <Command className="bg-transparent" shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
            className="border-none focus:ring-0 h-8 text-white bg-slate-800/50 placeholder:text-slate-400 text-xs"
          />
          <CommandList className="max-h-[240px]">
            {filteredOptions.length === 0 && !canCreateNew && (
              <div className="py-4 text-center text-sm">
                <p className="text-muted-foreground">{emptyText}</p>
              </div>
            )}

            {filteredOptions.length > 0 && (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => handleSelect(option)}
                    className="cursor-pointer hover:bg-slate-700/50 transition-colors text-white font-light"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 text-primary",
                        value === option ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className={cn(
                      value === option && "font-medium text-primary"
                    )}>
                      {option}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {canCreateNew && (
              <CommandGroup className={cn(filteredOptions.length > 0 && "border-t border-border/30 mt-1")}>
                <CommandItem
                  onSelect={handleCreateNew}
                  className="cursor-pointer bg-gradient-to-r from-emerald-500/10 to-primary/10 hover:from-emerald-500/20 hover:to-primary/20 transition-all py-2.5"
                >
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 mr-2">
                    <Plus className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <span className="text-emerald-400 font-semibold text-xs">
                    Créer "{trimmedSearch}"
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
