import { prisma } from './database'
import type { Task } from '@prisma/client'
import { LinkedType, NotificationPriority, NotificationType, TaskStatus } from '@prisma/client'

export type AssignTaskInput = {
  title: string
  description: string
  dueDate: Date | string
  assignedTo: string
  linkedType: LinkedType | 'lead' | 'client'
  linkedId: string
  reminderEnabled?: boolean
  reminderDays?: number | null
  status?: TaskStatus | 'a_faire' | 'en_cours' | 'termine'
}

export type CurrentUser = {
  id: string
  name: string
  role: string // e.g. 'admin' | 'manager' | 'architecte' | 'commercial' | ...
}

export type AssignTaskResult = {
  task: Task
  message: string
}

function isPrivileged(role: string) {
  return role === 'admin' || role === 'manager'
}

export async function assignTask(input: AssignTaskInput, currentUser: CurrentUser): Promise<AssignTaskResult> {
  try {
    const due = typeof input.dueDate === 'string' ? new Date(input.dueDate) : input.dueDate

    // Permission checks
    const assigningToSelf = input.assignedTo === currentUser.id
    if (!isPrivileged(currentUser.role) && !assigningToSelf) {
      throw new Error('Permission refusée')
    }

    // Validate recipient user
    const recipient = await prisma.user.findUnique({ where: { id: input.assignedTo } })
    if (!recipient) {
      throw new Error('Utilisateur introuvable')
    }

    // Validate and load linked entity and name
    const isLead = input.linkedType === 'lead'
    const isClient = input.linkedType === 'client'

    if (!isLead && !isClient) {
      throw new Error('linkedType invalide, doit être "lead" ou "client"')
    }

    const linkedName = isLead
      ? (await prisma.lead.findUnique({ where: { id: input.linkedId }, select: { nom: true } }))?.nom
      : (await prisma.client.findUnique({ where: { id: input.linkedId }, select: { nom: true } }))?.nom

    if (!linkedName) {
      throw new Error('Lead ou client introuvable')
    }

    const taskStatus: TaskStatus =
      (input.status as TaskStatus) ?? TaskStatus.a_faire

    const created = await prisma.$transaction(async (tx) => {
      // Create task
      const task = await tx.task.create({
        data: {
          title: input.title,
          description: input.description,
          dueDate: due,
          assignedTo: recipient.name,
          linkedType: isLead ? LinkedType.lead : LinkedType.client,
          linkedId: input.linkedId,
          linkedName,
          status: taskStatus,
          reminderEnabled: Boolean(input.reminderEnabled),
          reminderDays: input.reminderDays ?? null,
          createdBy: currentUser.name,
        },
      })

      // Create notification to assignee
      await tx.notification.create({
        data: {
          userId: input.assignedTo,
          type: NotificationType.task_assigned,
          priority: NotificationPriority.medium,
          title: 'Nouvelle tâche assignée',
          message: `Une nouvelle tâche vous a été assignée par ${currentUser.name}`,
          linkedType: isLead ? 'lead' : 'client',
          linkedId: input.linkedId,
          linkedName,
          createdBy: currentUser.name,
        },
      })

      // Bonus UX: lead note or client historique
      if (isLead) {
        await tx.leadNote.create({
          data: {
            leadId: input.linkedId,
            content: `📌 Tâche assignée à ${recipient.name} : ${input.title}.`,
            author: currentUser.name,
          },
        })
      } else {
        await tx.historique.create({
          data: {
            clientId: input.linkedId,
            type: 'tâche',
            description: `Tâche assignée à ${recipient.name}`,
            auteur: currentUser.name,
          },
        })
      }

      return task
    })

    return {
      task: created,
      message: 'Tâche créée et notification envoyée',
    }
  } catch (error: any) {
    // Normalize known messages
    const knownMessages = [
      'Permission refusée',
      'Utilisateur introuvable',
      'Lead ou client introuvable',
      'linkedType invalide, doit être "lead" ou "client"',
    ]

    const message = knownMessages.includes(error?.message)
      ? error.message
      : 'Une erreur est survenue lors de la création de la tâche'

    throw new Error(message)
  }
}
