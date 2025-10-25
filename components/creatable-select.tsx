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
      setLocalOptions([...localOptions, trimmedValue])
      onValueChange(trimmedValue)
      setOpen(false)
      setSearchValue("")
    }
  }

  const handleClear = (e: React.MouseEvent) => {
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
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between border-border/60 hover:border-primary/60 transition-all duration-200 h-10",
            !value && "text-muted-foreground",
            open && "border-primary/60 ring-2 ring-primary/20",
            className
          )}
        >
          <span className="truncate">
            {value || placeholder}
          </span>
          <div className="flex items-center gap-1">
            {value && !disabled && (
              <X
                className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 glass border-primary/30" align="start">
        <Command className="bg-transparent" shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
            className="border-none focus:ring-0 h-11"
          />
          <CommandList className="max-h-[280px]">
            {filteredOptions.length === 0 && !canCreateNew && (
              <div className="py-6 text-center text-sm">
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
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
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
                  className="cursor-pointer bg-gradient-to-r from-primary/10 to-premium/10 hover:from-primary/20 hover:to-premium/20 transition-all py-3"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 mr-2">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-primary font-semibold">
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
