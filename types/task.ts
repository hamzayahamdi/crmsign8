export type TaskStatus = "a_faire" | "en_cours" | "termine"
export type LinkedType = "lead" | "client" | "contact"

export interface Task {
  id: string
  title: string
  description: string
  dueDate: string
  assignedTo: string
  linkedType: LinkedType
  linkedId: string
  linkedName?: string // For display purposes
  status: TaskStatus
  reminderEnabled?: boolean
  reminderDays?: number
  createdAt: string
  updatedAt: string
  createdBy: string
}
