"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Home,
  Users,
  Briefcase,
  Calendar,
  CalendarDays,
  Bell,
  Settings,
  Target,
  Compass,
  Search,
  Plus,
  CheckSquare,
  User,
  Building2,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  ChevronDown,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useAuth } from "@/contexts/auth-context"
import { getVisibleSidebarItems, hasPermission } from "@/lib/permissions"
import { cn } from "@/lib/utils"

interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateLead?: () => void
  onCreateTask?: () => void
  onCreateContact?: () => void
}

interface SearchResult {
  id: string
  type: "page" | "client" | "contact" | "task" | "action"
  title: string
  description?: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  keywords?: string[]
  action?: () => void
  metadata?: {
    phone?: string
    email?: string
    status?: string
    city?: string
  }
  score?: number
}

// Smart search function with fuzzy matching and ranking
function smartSearch(query: string, items: SearchResult[]): SearchResult[] {
  if (!query || query.length < 1) return items

  const lowerQuery = query.toLowerCase().trim()
  const queryWords = lowerQuery.split(/\s+/)

  return items
    .map((item) => {
      let score = 0
      const searchableText = `${item.title} ${item.description || ""} ${item.keywords?.join(" ") || ""}`.toLowerCase()

      // Exact match in title (highest priority)
      if (item.title.toLowerCase().includes(lowerQuery)) {
        score += 100
        if (item.title.toLowerCase().startsWith(lowerQuery)) {
          score += 50
        }
      }

      // Exact match in description
      if (item.description?.toLowerCase().includes(lowerQuery)) {
        score += 30
      }

      // Keyword matches
      item.keywords?.forEach((keyword) => {
        if (keyword && typeof keyword === 'string' && keyword.includes(lowerQuery)) {
          score += 20
        }
      })

      // Word-by-word matching
      queryWords.forEach((word) => {
        if (searchableText.includes(word)) {
          score += 10
        }
      })

      // Metadata matching
      if (item.metadata) {
        if (item.metadata.phone?.includes(lowerQuery)) score += 25
        if (item.metadata.email?.toLowerCase().includes(lowerQuery)) score += 25
        if (item.metadata.status?.toLowerCase().includes(lowerQuery)) score += 15
        if (item.metadata.city?.toLowerCase().includes(lowerQuery)) score += 15
      }

      return { ...item, score }
    })
    .filter((item) => item.score! > 0)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
}

export function CommandMenu({
  open,
  onOpenChange,
  onCreateLead,
  onCreateTask,
  onCreateContact,
}: CommandMenuProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [search, setSearch] = React.useState("")
  const [clients, setClients] = React.useState<any[]>([])
  const [contacts, setContacts] = React.useState<any[]>([])
  const [tasks, setTasks] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    navigation: false,
    actions: false,
    clients: false,
    contacts: false,
    tasks: false,
  })
  const searchTimeoutRef = React.useRef<NodeJS.Timeout>()

  const getAuthToken = React.useCallback(() => {
    if (typeof document === "undefined") return ""
    const cookies = document.cookie.split(";")
    const tokenCookie = cookies.find((c) => c.trim().startsWith("token="))
    return tokenCookie ? tokenCookie.split("=")[1] : ""
  }, [])

  // Debounced search with smarter fetching
  const fetchSearchData = React.useCallback(async (query: string) => {
    if (query.length < 2) {
      setClients([])
      setContacts([])
      setTasks([])
      return
    }

    setIsLoading(true)
    try {
      const [clientsRes, contactsRes, tasksRes] = await Promise.all([
        fetch("/api/clients", { credentials: "include" }),
        fetch(`/api/contacts?search=${encodeURIComponent(query)}&limit=10`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
        }),
        fetch("/api/tasks", { credentials: "include" }),
      ])

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json()
        const allClients = clientsData.data || []
        const filtered = allClients.filter((c: any) => {
          const searchText = `${c.nom || ""} ${c.nomProjet || ""} ${c.telephone || ""} ${c.statutProjet || ""} ${c.ville || ""}`.toLowerCase()
          return searchText.includes(query.toLowerCase())
        })
        setClients(filtered.slice(0, 8))
      }

      if (contactsRes.ok) {
        const contactsData = await contactsRes.json()
        setContacts((contactsData.data || []).slice(0, 8))
      }

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json()
        const allTasks = tasksData.data || []
        const filtered = allTasks.filter((t: any) => {
          const searchText = `${t.title || ""} ${t.description || ""} ${t.clientName || ""} ${t.status || ""} ${t.assignedTo || ""}`.toLowerCase()
          return searchText.includes(query.toLowerCase())
        })
        setTasks(filtered.slice(0, 8))
      }
    } catch (error) {
      console.error("Error fetching search data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [getAuthToken])

  React.useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (open && search.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchSearchData(search)
      }, 200)
    } else if (open && search.length < 2) {
      setClients([])
      setContacts([])
      setTasks([])
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [open, search, fetchSearchData])

  // Build navigation items
  const navigationItems = React.useMemo(() => {
    if (!user?.role) return []

    const visibleItems = getVisibleSidebarItems(user.role)
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      Home,
      Users,
      Briefcase,
      Compass,
      CalendarDays,
      Calendar,
      Bell,
      Settings,
      Target,
    }

    return visibleItems.map((item) => ({
      id: `nav-${item.id}`,
      type: "page" as const,
      title: item.label,
      href: item.href,
      icon: iconMap[item.icon] || Home,
      keywords: [
        item.label.toLowerCase(),
        item.href,
        item.id.toLowerCase(),
        ...item.label.toLowerCase().split(" "),
      ].filter((k): k is string => typeof k === 'string' && k.length > 0),
    }))
  }, [user?.role])

  // Build action items
  const actionItems = React.useMemo(() => {
    const actions: SearchResult[] = []

    if (hasPermission(user?.role, "leads", "create") && onCreateLead) {
      actions.push({
        id: "action-create-lead",
        type: "action",
        title: "Créer un nouveau lead",
        description: "Ajouter un nouveau lead au tableau de bord",
        icon: Plus,
        keywords: ["lead", "nouveau", "créer", "ajouter", "add", "new"],
        action: () => {
          onCreateLead()
          onOpenChange(false)
        },
      })
    }

    if (hasPermission(user?.role, "tasks", "create") && onCreateTask) {
      actions.push({
        id: "action-create-task",
        type: "action",
        title: "Créer une nouvelle tâche",
        description: "Ajouter une nouvelle tâche à la liste",
        icon: CheckSquare,
        keywords: ["tâche", "task", "nouveau", "créer", "ajouter", "add", "new", "todo"],
        action: () => {
          onCreateTask()
          onOpenChange(false)
        },
      })
    }

    if (hasPermission(user?.role, "contacts", "create") && onCreateContact) {
      actions.push({
        id: "action-create-contact",
        type: "action",
        title: "Créer un nouveau contact",
        description: "Ajouter un nouveau contact au système",
        icon: User,
        keywords: ["contact", "nouveau", "créer", "ajouter", "add", "new", "client"],
        action: () => {
          onCreateContact()
          onOpenChange(false)
        },
      })
    }

    return actions
  }, [user?.role, onCreateLead, onCreateTask, onCreateContact, onOpenChange])

  // Build all results with smart search
  const allResults = React.useMemo(() => {
    const results: SearchResult[] = []

    const navItems = search.length === 0 
      ? navigationItems 
      : smartSearch(search, navigationItems)
    results.push(...navItems)

    const filteredActions = search.length === 0
      ? actionItems
      : smartSearch(search, actionItems)
    results.push(...filteredActions)

    if (search.length >= 2) {
      const clientResults = clients.map((client) => ({
        id: `client-${client.id}`,
        type: "client" as const,
        title: client.nomProjet || client.nom || "Sans nom",
        description: client.nom || "",
        href: `/clients/${client.id}`,
        icon: Building2,
        keywords: [
          client.nom?.toLowerCase(),
          client.nomProjet?.toLowerCase(),
          client.telephone,
          client.statutProjet?.toLowerCase(),
          client.ville?.toLowerCase(),
        ].filter((k): k is string => typeof k === 'string' && k.length > 0),
        metadata: {
          phone: client.telephone,
          status: client.statutProjet,
          city: client.ville,
        },
      }))
      results.push(...smartSearch(search, clientResults))
    }

    if (search.length >= 2) {
      const contactResults = contacts.map((contact) => ({
        id: `contact-${contact.id}`,
        type: "contact" as const,
        title: contact.nom || "Sans nom",
        description: contact.tag || "Contact",
        href: `/contacts/${contact.id}`,
        icon: User,
        keywords: [
          contact.nom?.toLowerCase(),
          contact.telephone,
          contact.email?.toLowerCase(),
          contact.tag?.toLowerCase(),
          contact.ville?.toLowerCase(),
        ].filter((k): k is string => typeof k === 'string' && k.length > 0),
        metadata: {
          phone: contact.telephone,
          email: contact.email,
          status: contact.tag,
          city: contact.ville,
        },
      }))
      results.push(...smartSearch(search, contactResults))
    }

    if (search.length >= 2) {
      const taskResults = tasks.map((task) => ({
        id: `task-${task.id}`,
        type: "task" as const,
        title: task.title || "Sans titre",
        description: task.clientName || task.assignedTo || "",
        href: "/tasks",
        icon: CheckSquare,
        keywords: [
          task.title?.toLowerCase(),
          task.description?.toLowerCase(),
          task.clientName?.toLowerCase(),
          task.status?.toLowerCase(),
          task.assignedTo?.toLowerCase(),
        ].filter((k): k is string => typeof k === 'string' && k.length > 0),
        metadata: {
          status: task.status,
        },
      }))
      results.push(...smartSearch(search, taskResults))
    }

    return results
  }, [search, navigationItems, actionItems, clients, contacts, tasks])

  const handleSelect = (result: SearchResult) => {
    if (result.action) {
      result.action()
    } else if (result.href) {
      router.push(result.href)
      onOpenChange(false)
      setSearch("")
    }
  }

  // Group results by type
  const groupedResults = React.useMemo(() => {
    const groups: Record<string, SearchResult[]> = {}
    const order = ["page", "action", "client", "contact", "task"]
    
    allResults.forEach((result) => {
      const groupKey = result.type
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(result)
    })

    const orderedGroups: Record<string, SearchResult[]> = {}
    order.forEach((key) => {
      if (groups[key]) {
        orderedGroups[key] = groups[key]
      }
    })

    return orderedGroups
  }, [allResults])

  const hasResults = Object.keys(groupedResults).length > 0

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      className="[&>div>div]:bg-[rgb(15,20,32)] [&>div>div]:border-[rgb(30,41,59)] [&>div>div]:shadow-2xl [&>div>div]:backdrop-blur-xl [&>div>div]:max-w-2xl"
    >
      <div className="border-b border-[rgb(30,41,59)] px-4 py-3.5">
        <CommandInput
          placeholder="Rechercher des pages, clients, contacts, tâches..."
          value={search}
          onValueChange={setSearch}
          className="h-12 text-base bg-transparent text-white placeholder:text-slate-500 focus:ring-0 focus:ring-offset-0 border-0"
        />
        {search.length > 0 && (
          <div className="flex items-center gap-2 mt-2.5 text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>
              {isLoading ? "Recherche..." : `${allResults.length} résultat${allResults.length !== 1 ? "s" : ""} trouvé${allResults.length !== 1 ? "s" : ""}`}
            </span>
          </div>
        )}
      </div>

      <CommandList className="max-h-[600px] overflow-y-auto pb-6">
        <CommandEmpty>
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="inline-flex items-center gap-3 text-sm text-slate-400">
                <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span>Recherche en cours...</span>
              </div>
            </div>
          ) : search.length < 2 ? (
            <div className="py-16 text-center px-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/10 mb-4 border border-blue-500/20">
                <Search className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-base font-medium text-white mb-2">
                Recherche rapide
              </p>
              <p className="text-sm text-slate-400 mb-1">
                Tapez au moins 2 caractères pour rechercher
              </p>
              <p className="text-xs text-slate-500 mt-4">
                Utilisez <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs">⌘K</kbd> pour ouvrir rapidement ce menu
              </p>
            </div>
          ) : (
            <div className="py-16 text-center px-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/50 mb-4">
                <Search className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-base font-medium text-white mb-2">
                Aucun résultat
              </p>
              <p className="text-sm text-slate-400">
                Aucun résultat trouvé pour <span className="text-white font-medium">"{search}"</span>
              </p>
              <p className="text-xs text-slate-500 mt-3">
                Essayez avec d'autres mots-clés
              </p>
            </div>
          )}
        </CommandEmpty>

        {hasResults && (
          <div className="px-2 py-2 space-y-1">
            {/* Navigation Pages */}
            {groupedResults.page && groupedResults.page.length > 0 && (
              <Collapsible
                open={openSections.navigation}
                onOpenChange={() => toggleSection("navigation")}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-800/30 rounded-lg transition-colors group">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Compass className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <span className="text-[10px] font-light text-slate-400 uppercase tracking-wider">
                        Navigation
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-800/50 text-[10px] text-slate-500 font-medium">
                        {groupedResults.page.length}
                      </span>
                    </div>
                    <ChevronDown className={cn(
                      "w-3.5 h-3.5 text-slate-500 transition-transform duration-200",
                      openSections.navigation && "rotate-180"
                    )} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                  <div className="space-y-1.5 px-2 pt-1 pb-2">
                    {groupedResults.page.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        onSelect={() => handleSelect(item)}
                        className="data-[selected]:bg-blue-500/20 data-[selected]:text-white data-[selected]:border-l-2 data-[selected]:border-blue-500 cursor-pointer rounded-lg px-3 py-2.5 h-auto min-h-[52px] flex items-center gap-3 transition-all hover:bg-slate-800/20"
                      >
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/10 shrink-0">
                          <item.icon className="w-4 h-4 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white text-[13px] leading-tight">{item.title}</div>
                          {item.description && (
                            <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>
                          )}
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </CommandItem>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Actions */}
            {groupedResults.action && groupedResults.action.length > 0 && (
              <>
                {groupedResults.page && <div className="h-px bg-slate-800/50 my-1.5" />}
                <Collapsible
                  open={openSections.actions}
                  onOpenChange={() => toggleSection("actions")}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-800/30 rounded-lg transition-colors group">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                          <Plus className="w-3.5 h-3.5 text-green-400" />
                        </div>
                        <span className="text-[10px] font-light text-slate-400 uppercase tracking-wider">
                          Actions rapides
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full bg-slate-800/50 text-[10px] text-slate-500 font-medium">
                          {groupedResults.action.length}
                        </span>
                      </div>
                      <ChevronDown className={cn(
                        "w-3.5 h-3.5 text-slate-500 transition-transform duration-200",
                        openSections.actions && "rotate-180"
                      )} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1 duration-200">
                    <div className="space-y-1.5 px-2 pt-1 pb-2">
                      {groupedResults.action.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={item.id}
                          onSelect={() => handleSelect(item)}
                          className="data-[selected]:bg-green-500/20 data-[selected]:text-white data-[selected]:border-l-2 data-[selected]:border-green-500 cursor-pointer rounded-lg px-3 py-2.5 h-auto min-h-[52px] flex items-center gap-3 transition-all hover:bg-slate-800/20"
                        >
                          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-500/10 shrink-0">
                            <item.icon className="w-4 h-4 text-green-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white text-[13px] leading-tight">{item.title}</div>
                            {item.description && (
                              <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </CommandItem>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            {/* Clients */}
            {groupedResults.client && groupedResults.client.length > 0 && (
              <>
                <div className="h-px bg-slate-800/50 my-1.5" />
                <Collapsible
                  open={openSections.clients}
                  onOpenChange={() => toggleSection("clients")}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-800/30 rounded-lg transition-colors group">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                        <span className="text-[10px] font-light text-slate-400 uppercase tracking-wider">
                          Clients
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full bg-slate-800/50 text-[10px] text-slate-500 font-medium">
                          {groupedResults.client.length}
                        </span>
                      </div>
                      <ChevronDown className={cn(
                        "w-3.5 h-3.5 text-slate-500 transition-transform duration-200",
                        openSections.clients && "rotate-180"
                      )} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1 duration-200">
                    <div className="space-y-1.5 px-2 pt-1 pb-2">
                      {groupedResults.client.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={item.id}
                          onSelect={() => handleSelect(item)}
                          className="data-[selected]:bg-blue-500/20 data-[selected]:text-white data-[selected]:border-l-2 data-[selected]:border-blue-500 cursor-pointer rounded-lg px-3 py-2.5 h-auto min-h-[60px] flex items-center gap-3 transition-all hover:bg-slate-800/20"
                        >
                          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/10 shrink-0">
                            <Building2 className="w-4 h-4 text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white text-[13px] leading-tight truncate">{item.title}</div>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                              {item.metadata?.phone && (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="w-3 h-3" />
                                  <span>{item.metadata.phone}</span>
                                </div>
                              )}
                              {item.metadata?.city && (
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="w-3 h-3" />
                                  <span>{item.metadata.city}</span>
                                </div>
                              )}
                              {item.metadata?.status && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px]">
                                  {item.metadata.status}
                                </span>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </CommandItem>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            {/* Contacts */}
            {groupedResults.contact && groupedResults.contact.length > 0 && (
              <>
                <div className="h-px bg-slate-800/50 my-1.5" />
                <Collapsible
                  open={openSections.contacts}
                  onOpenChange={() => toggleSection("contacts")}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-800/30 rounded-lg transition-colors group">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5 text-purple-400" />
                        </div>
                        <span className="text-[10px] font-light text-slate-400 uppercase tracking-wider">
                          Contacts
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full bg-slate-800/50 text-[10px] text-slate-500 font-medium">
                          {groupedResults.contact.length}
                        </span>
                      </div>
                      <ChevronDown className={cn(
                        "w-3.5 h-3.5 text-slate-500 transition-transform duration-200",
                        openSections.contacts && "rotate-180"
                      )} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1 duration-200">
                    <div className="space-y-1.5 px-2 pt-1 pb-2">
                      {groupedResults.contact.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={item.id}
                          onSelect={() => handleSelect(item)}
                          className="data-[selected]:bg-purple-500/20 data-[selected]:text-white data-[selected]:border-l-2 data-[selected]:border-purple-500 cursor-pointer rounded-lg px-3 py-2.5 h-auto min-h-[60px] flex items-center gap-3 transition-all hover:bg-slate-800/20"
                        >
                          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-500/10 shrink-0">
                            <User className="w-4 h-4 text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white text-[13px] leading-tight truncate">{item.title}</div>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                              {item.metadata?.phone && (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="w-3 h-3" />
                                  <span>{item.metadata.phone}</span>
                                </div>
                              )}
                              {item.metadata?.email && (
                                <div className="flex items-center gap-1.5">
                                  <Mail className="w-3 h-3" />
                                  <span className="truncate max-w-[150px]">{item.metadata.email}</span>
                                </div>
                              )}
                              {item.metadata?.status && (
                                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px]">
                                  {item.metadata.status}
                                </span>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </CommandItem>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            {/* Tasks */}
            {groupedResults.task && groupedResults.task.length > 0 && (
              <>
                <div className="h-px bg-slate-800/50 my-1.5" />
                <Collapsible
                  open={openSections.tasks}
                  onOpenChange={() => toggleSection("tasks")}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-800/30 rounded-lg transition-colors group">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                          <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <span className="text-[10px] font-light text-slate-400 uppercase tracking-wider">
                          Tâches
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full bg-slate-800/50 text-[10px] text-slate-500 font-medium">
                          {groupedResults.task.length}
                        </span>
                      </div>
                      <ChevronDown className={cn(
                        "w-3.5 h-3.5 text-slate-500 transition-transform duration-200",
                        openSections.tasks && "rotate-180"
                      )} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1 duration-200">
                    <div className="space-y-1.5 px-2 pt-1 pb-2">
                      {groupedResults.task.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={item.id}
                          onSelect={() => handleSelect(item)}
                          className="data-[selected]:bg-amber-500/20 data-[selected]:text-white data-[selected]:border-l-2 data-[selected]:border-amber-500 cursor-pointer rounded-lg px-3 py-2.5 h-auto min-h-[60px] flex items-center gap-3 transition-all hover:bg-slate-800/20"
                        >
                          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-500/10 shrink-0">
                            <CheckSquare className="w-4 h-4 text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white text-[13px] leading-tight truncate">{item.title}</div>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                              {item.description && (
                                <span className="truncate">{item.description}</span>
                              )}
                              {item.metadata?.status && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px]">
                                  {item.metadata.status}
                                </span>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </CommandItem>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
          </div>
        )}
      </CommandList>
    </CommandDialog>
  )
}
