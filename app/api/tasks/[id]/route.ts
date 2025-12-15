import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { notifyTaskAssigned } from '@/lib/notification-creator'
import { Prisma } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

// GET single task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[Task Detail API] GET request for id:', id)

    const task = await prisma.task.findUnique({
      where: { id }
    })

    if (!task) {
      console.warn('[Task Detail API] Task not found:', id)
      return NextResponse.json(
        { success: false, error: 'Tâche non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: task
    })
  } catch (error: any) {
    console.error('[Task Detail API] Error fetching task:', error)

    // Handle Prisma connection errors
    if (error?.code === 'P1001') {
      return NextResponse.json(
        {
          success: false,
          error: 'Erreur de connexion à la base de données. Veuillez réessayer.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Erreur lors du chargement de la tâche' },
      { status: 500 }
    )
  }
}

// PUT - Update task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { id: paramId } = await params
    let id = paramId

    console.log('[Task Detail API] PUT request for id:', id)

    if (!id || id === 'undefined' || id === 'null') {
      if (body?.id && typeof body.id === 'string') {
        id = body.id
      }
    }
    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json({ success: false, error: 'ID de tâche manquant' }, { status: 400 })
    }
    const updateData: any = {}

    if (body.title !== undefined) updateData.title = String(body.title)
    if (body.description !== undefined) updateData.description = String(body.description)
    if (body.dueDate !== undefined) {
      const d = new Date(body.dueDate)
      if (isNaN(d.getTime())) {
        return NextResponse.json({ success: false, error: 'Date d\'échéance invalide' }, { status: 400 })
      }
      updateData.dueDate = d
    }
    if (body.assignedTo !== undefined) updateData.assignedTo = String(body.assignedTo)
    if (body.linkedType !== undefined) {
      const validLinked = ['lead', 'client']
      if (!validLinked.includes(body.linkedType)) {
        return NextResponse.json({ success: false, error: 'Type de lien invalide' }, { status: 400 })
      }
      updateData.linkedType = body.linkedType
    }
    if (body.linkedId !== undefined) updateData.linkedId = String(body.linkedId)
    if (body.linkedName !== undefined) updateData.linkedName = body.linkedName ? String(body.linkedName) : null
    if (body.status !== undefined) {
      const validStatus = ['a_faire', 'en_cours', 'termine']
      if (!validStatus.includes(body.status)) {
        return NextResponse.json({ success: false, error: 'Statut invalide' }, { status: 400 })
      }
      updateData.status = body.status
    }
    if (body.reminderEnabled !== undefined) updateData.reminderEnabled = Boolean(body.reminderEnabled)
    if (body.reminderDays !== undefined) updateData.reminderDays = body.reminderDays === null ? null : Number(body.reminderDays)

    // Fetch previous task to detect assignee change
    const previous = await prisma.task.findUnique({ where: { id } })

    if (!previous) {
      return NextResponse.json({ success: false, error: 'Tâche non trouvée' }, { status: 404 })
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData
    })

    console.log('[Task Detail API] Task updated successfully:', id)

    // If assignedTo changed, notify new assignee
    try {
      if (previous && updateData.assignedTo && previous.assignedTo !== updateData.assignedTo) {
        const user = await prisma.user.findFirst({ where: { name: String(updateData.assignedTo) } })
        if (user?.id) {
          await notifyTaskAssigned({
            userId: user.id,
            taskTitle: task.title,
            taskId: task.id,
            dueDate: task.dueDate.toISOString(),
            linkedName: task.linkedName || undefined,
            createdBy: body?.updatedBy || task.createdBy || 'Système',
          })
        }
      }
    } catch (notifyError) {
      console.error('[Task Detail API] Failed to send reassignment notification:', notifyError)
    }

    return NextResponse.json({
      success: true,
      data: task
    })
  } catch (error: any) {
    console.error('[Task Detail API] Error updating task:', error)

    if (error?.code === 'P1001') {
      return NextResponse.json(
        {
          success: false,
          error: 'Erreur de connexion à la base de données. Veuillez réessayer.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 503 }
      )
    }

    if (error?.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Tâche non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur lors de la mise à jour de la tâche' },
      { status: 500 }
    )
  }
}

// DELETE task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const idFromUrl = segments.length > 2 ? segments[segments.length - 1] : undefined

    const { id: paramId } = await params
    const rawId = paramId ?? idFromUrl ?? ''
    const id = Array.isArray(rawId) ? rawId[0]?.trim() : String(rawId).trim()

    console.log('[Task Detail API] DELETE request for id:', id)

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de tâche manquant' },
        { status: 400 }
      )
    }

    const existing = await prisma.task.findUnique({
      where: { id },
    })

    if (!existing) {
      console.warn('[Task Detail API] Task to delete not found:', id)
      return NextResponse.json(
        { success: false, error: 'Tâche non trouvée' },
        { status: 404 }
      )
    }

    // Find and delete associated calendar events
    // Calendar events are created with eventType 'suivi_projet' and matching title/assignedTo/startDate
    let deletedEventsCount = 0
    try {
      // Get the user ID for the assignedTo name
      const assignedUser = await prisma.user.findFirst({
        where: { name: existing.assignedTo },
        select: { id: true },
      })

      if (assignedUser) {
        // Find calendar events that match this task:
        // - eventType is 'suivi_projet' (tasks create this type)
        // - title matches (exact or similar)
        // - assignedTo matches the user ID
        // - startDate matches the task's dueDate (within 1 hour tolerance)
        // - created around the same time as the task (within 5 minutes)
        const taskStartDate = new Date(existing.dueDate)
        const taskEndDate = new Date(existing.dueDate)
        taskEndDate.setHours(taskEndDate.getHours() + 1)

        const taskCreatedStart = new Date(existing.createdAt)
        taskCreatedStart.setMinutes(taskCreatedStart.getMinutes() - 5)
        const taskCreatedEnd = new Date(existing.createdAt)
        taskCreatedEnd.setMinutes(taskCreatedEnd.getMinutes() + 5)

        const associatedEvents = await prisma.calendarEvent.findMany({
          where: {
            eventType: 'suivi_projet',
            assignedTo: assignedUser.id,
            title: existing.title, // Exact title match
            startDate: {
              gte: taskStartDate,
              lte: taskEndDate,
            },
            createdAt: {
              gte: taskCreatedStart,
              lte: taskCreatedEnd,
            },
          },
          select: { id: true },
        })

        if (associatedEvents.length > 0) {
          const eventIds = associatedEvents.map((e) => e.id)
          console.log(
            `[Task Detail API] Found ${associatedEvents.length} associated calendar event(s) to delete:`,
            eventIds
          )

          // Delete event reminders first (cascade)
          await prisma.eventReminder.deleteMany({
            where: {
              eventId: { in: eventIds },
            },
          })

          // Delete the calendar events
          await prisma.calendarEvent.deleteMany({
            where: {
              id: { in: eventIds },
            },
          })

          deletedEventsCount = associatedEvents.length
          console.log(
            `[Task Detail API] Deleted ${deletedEventsCount} associated calendar event(s)`
          )
        }
      }
    } catch (calendarError) {
      console.error(
        '[Task Detail API] Error deleting associated calendar events:',
        calendarError
      )
      // Don't fail the task deletion if calendar cleanup fails
    }

    await prisma.$transaction(async (tx) => {
      await tx.notification.deleteMany({
        where: {
          linkedType: 'task',
          linkedId: id,
        },
      })

      await tx.task.delete({
        where: { id },
      })
    })

    console.log(
      `[Task Detail API] Task deleted successfully: ${id} (removed ${deletedEventsCount} calendar event(s))`
    )

    return NextResponse.json({
      success: true,
      message: 'Tâche supprimée avec succès'
    })
  } catch (error: any) {
    console.error('[Task Detail API] Error deleting task:', error)

    if (error?.code === 'P1001') {
      return NextResponse.json(
        {
          success: false,
          error: 'Erreur de connexion à la base de données. Veuillez réessayer.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 503 }
      )
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Tâche non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression de la tâche' },
      { status: 500 }
    )
  }
}
