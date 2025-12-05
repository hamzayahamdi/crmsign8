import { prisma } from './database'

export interface CreateTaskWithEventInput {
  title: string
  description: string
  dueDate: Date
  assignedTo: string
  linkedType: 'lead' | 'client'
  linkedId: string
  linkedName?: string | null
  status?: 'a_faire' | 'en_cours' | 'termine'
  reminderEnabled?: boolean
  reminderDays?: number | null
  createdBy?: string
}

export interface CreateTaskWithEventResult {
  success: boolean
  task?: any
  event?: any
  error?: string
}

/**
 * Creates a task and automatically syncs it with the calendar
 * Returns both the created task and the calendar event (if calendar sync is needed)
 */
export async function createTaskWithEvent(
  input: CreateTaskWithEventInput
): Promise<CreateTaskWithEventResult> {
  try {
    // Validate user exists
    const user = await prisma.user.findFirst({
      where: { name: input.assignedTo }
    })

    if (!user) {
      return {
        success: false,
        error: `User "${input.assignedTo}" not found`
      }
    }

    // Get creator user ID - MUST be a UUID for calendar events
    let creatorId: string | null = null
    if (input.createdBy && input.createdBy !== 'Système') {
      const creator = await prisma.user.findFirst({
        where: { name: input.createdBy }
      })
      if (creator) {
        creatorId = creator.id
      }
    }

    // If creator not found or is "Système", use the first admin as fallback
    if (!creatorId) {
      const firstAdmin = await prisma.user.findFirst({
        where: { role: 'admin' }
      })
      if (firstAdmin) {
        creatorId = firstAdmin.id
      } else {
        // Last resort: use the assigned user
        creatorId = user.id
      }
    }

    // Get all admin users for participants
    const admins = await prisma.user.findMany({
      where: { role: 'admin' }
    })
    const adminIds = admins.map(admin => admin.id)

    // Create the task
    const task = await prisma.task.create({
      data: {
        title: input.title,
        description: input.description,
        dueDate: input.dueDate,
        assignedTo: input.assignedTo,
        linkedType: input.linkedType,
        linkedId: input.linkedId,
        linkedName: input.linkedName || null,
        status: input.status || 'a_faire',
        reminderEnabled: input.reminderEnabled || false,
        reminderDays: input.reminderDays || null,
        createdBy: input.createdBy || 'Système',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    })

    // Automatically create a calendar event for this task
    const endDate = new Date(input.dueDate)
    endDate.setHours(endDate.getHours() + 1) // Add 1 hour to the due date

    // Prepare participants: task assignee + all admins
    const participants = [user.id, ...adminIds.filter(id => id !== user.id)]

    const eventData: any = {
      title: input.title, // No prefix - let the frontend handle display
      description: input.description,
      startDate: input.dueDate,
      endDate: endDate,
      eventType: 'suivi_projet',
      assignedTo: user.id, // Use user ID (not name)
      visibility: 'team',
      participants: participants,
      createdBy: creatorId // Use user ID if available
    }

    // Link to lead or client based on linkedType
    if (input.linkedType === 'lead') {
      eventData.linkedLeadId = input.linkedId
    } else if (input.linkedType === 'client') {
      eventData.linkedClientId = input.linkedId
    }

    const event = await prisma.calendarEvent.create({
      data: eventData
    })

    // Create reminder if enabled
    if (input.reminderEnabled && input.reminderDays && input.reminderDays > 0) {
      try {
        // Calculate reminder time: X days before the due date
        const reminderTime = new Date(input.dueDate)
        reminderTime.setDate(reminderTime.getDate() - input.reminderDays)

        // Create reminder for the assigned user
        await prisma.$executeRaw`
          INSERT INTO event_reminders (id, event_id, user_id, reminder_time, reminder_type, notification_sent, created_at, updated_at)
          VALUES (gen_random_uuid(), ${event.id}, ${user.id}, ${reminderTime}, 'custom', false, NOW(), NOW())
          ON CONFLICT (event_id, user_id) 
          DO UPDATE SET 
            reminder_time = ${reminderTime},
            reminder_type = 'custom',
            notification_sent = false,
            updated_at = NOW()
        `

        console.log(`[task-calendar-sync] Created reminder for task "${input.title}" - will notify ${input.reminderDays} days before due date (${reminderTime.toISOString()})`)
      } catch (reminderError) {
        console.error('[task-calendar-sync] Failed to create reminder, but task and event were created successfully:', reminderError)
        // Don't fail the entire operation if reminder creation fails
      }
    }

    return {
      success: true,
      task,
      event
    }
  } catch (error: any) {
    console.error('[task-calendar-sync] Error creating task with event:', error)
    return {
      success: false,
      error: error?.message || 'Failed to create task with calendar event'
    }
  }
}

/**
 * Syncs an existing task with the calendar
 * Creates a calendar event if one doesn't exist for this task
 */
export async function syncTaskWithCalendar(taskId: string): Promise<CreateTaskWithEventResult> {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    })

    if (!task) {
      return {
        success: false,
        error: `Task "${taskId}" not found`
      }
    }

    // Check if calendar event already exists for this task
    // We can identify it by matching title, assignedTo (user ID), and approximate creation time
    const user = await prisma.user.findFirst({
      where: { name: task.assignedTo }
    })

    if (!user) {
      return {
        success: false,
        error: `User "${task.assignedTo}" not found`
      }
    }

    const existingEvent = await prisma.calendarEvent.findFirst({
      where: {
        title: task.title,
        assignedTo: user.id,
        // Match events created around the same time as the task
        createdAt: {
          gte: new Date(task.createdAt.getTime() - 60000), // Within 1 minute
          lte: new Date(task.createdAt.getTime() + 60000)
        }
      }
    })

    if (existingEvent) {
      return {
        success: true,
        task,
        event: existingEvent
      }
    }

    // Get creator user ID
    let creatorId = task.createdBy
    const creator = await prisma.user.findFirst({
      where: { name: task.createdBy }
    })
    if (creator) {
      creatorId = creator.id
    }

    // Get all admin users
    const admins = await prisma.user.findMany({
      where: { role: 'admin' }
    })
    const adminIds = admins.map(admin => admin.id)

    // Create new calendar event
    const endDate = new Date(task.dueDate)
    endDate.setHours(endDate.getHours() + 1)

    const participants = [user.id, ...adminIds.filter(id => id !== user.id)]

    const eventData: any = {
      title: task.title,
      description: task.description,
      startDate: task.dueDate,
      endDate: endDate,
      eventType: 'suivi_projet',
      assignedTo: user.id, // Use user ID (not name)
      visibility: 'team',
      participants: participants,
      createdBy: creatorId
    }

    if (task.linkedType === 'lead') {
      eventData.linkedLeadId = task.linkedId
    } else if (task.linkedType === 'client') {
      eventData.linkedClientId = task.linkedId
    }

    const event = await prisma.calendarEvent.create({
      data: eventData
    })

    return {
      success: true,
      task,
      event
    }
  } catch (error: any) {
    console.error('[task-calendar-sync] Error syncing task with calendar:', error)
    return {
      success: false,
      error: error?.message || 'Failed to sync task with calendar'
    }
  }
}

/**
 * Removes a task from the calendar when the task is deleted
 */
export async function removeTaskFromCalendar(taskId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete the task
    await prisma.task.delete({
      where: { id: taskId }
    })
    return { success: true }
  } catch (error: any) {
    console.error('[task-calendar-sync] Error removing task from calendar:', error)
    return {
      success: false,
      error: error?.message || 'Failed to remove task from calendar'
    }
  }
}
