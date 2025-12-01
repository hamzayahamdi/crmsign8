import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { notifyTaskAssigned } from '@/lib/notification-creator'
import { createTaskWithEvent } from '@/lib/task-calendar-sync'
import { verify } from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { shouldViewOwnDataOnly } from '@/lib/permissions'

// Ensure we run on Node.js runtime (Prisma is not supported on edge)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

interface JWTPayload {
  userId: string
  email: string
  role: string
  name: string
}

async function getUserFromToken(request?: NextRequest): Promise<JWTPayload | null> {
  try {
    let token: string | undefined

    // First, try to get token from Authorization header
    if (request) {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    // Fall back to cookies if no Authorization header
    if (!token) {
      const cookieStore = await cookies()
      token = cookieStore.get('token')?.value
    }

    if (!token) {
      return null
    }

    const decoded = verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    console.error('[Tasks Auth] Token verification failed:', error)
    return null
  }
}

// GET all tasks with optional filters
export async function GET(request: NextRequest) {
  try {
    console.log('[Tasks API] GET request received')

    // Get authenticated user
    const user = await getUserFromToken(request)
    if (!user) {
      console.error('[Tasks API] Authentication failed - no valid token')
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })
    }

    console.log('[Tasks API] User authenticated:', { userId: user.userId, role: user.role })

    const { searchParams } = new URL(request.url)
    const assignedTo = searchParams.get('assignedTo')
    const status = searchParams.get('status')
    const linkedType = searchParams.get('linkedType')

    const where: any = {}

    // Role-based filtering: Gestionnaire and Architect see only their own tasks
    if (shouldViewOwnDataOnly(user.role)) {
      console.log('[Tasks API] Applying role-based filtering for:', user.role)

      // Get user's name from database to match task assignments
      try {
        const userRecord = await prisma.user.findUnique({
          where: { id: user.userId },
          select: { name: true }
        })

        if (userRecord?.name) {
          where.OR = [
            { assignedTo: userRecord.name },
            { createdBy: userRecord.name },
            { participants: { has: user.userId } }
          ]
          console.log('[Tasks API] Filter applied for user:', userRecord.name)
        } else {
          console.warn('[Tasks API] User record not found or has no name:', user.userId)
          // Return empty array instead of failing
          return NextResponse.json({ success: true, data: [], count: 0 })
        }
      } catch (userError) {
        console.error('[Tasks API] Error fetching user record:', userError)
        // Return empty array instead of failing
        return NextResponse.json({ success: true, data: [], count: 0 })
      }
    }

    // Apply additional filters
    if (assignedTo && assignedTo !== 'all') where.assignedTo = assignedTo
    if (status && status !== 'all') where.status = status
    if (linkedType && linkedType !== 'all') where.linkedType = linkedType

    console.log('[Tasks API] Fetching tasks with filters:', where)

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    console.log('[Tasks API] Successfully fetched', tasks.length, 'tasks')
    return NextResponse.json({ success: true, data: tasks, count: tasks.length })
  } catch (error: any) {
    console.error('[Tasks API] Error fetching tasks:', error)

    // Handle Prisma connection errors
    if (error?.code === 'P1001') {
      console.error('[Tasks API] Database connection failed')
      return NextResponse.json(
        {
          success: false,
          error: 'Erreur de connexion à la base de données. Veuillez réessayer dans quelques instants.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 503 }
      )
    }

    // Handle other Prisma errors
    if (error?.code?.startsWith('P')) {
      console.error('[Tasks API] Prisma error:', error.code, error.message)
      return NextResponse.json(
        {
          success: false,
          error: 'Erreur de base de données. Veuillez contacter le support.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erreur lors du chargement des tâches. Veuillez réessayer.'
      },
      { status: 500 }
    )
  }
}

// POST - Create new task (with automatic calendar event)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[API /tasks POST] Received body:', { title: body.title, assignedTo: body.assignedTo, linkedType: body.linkedType });

    // Basic validation
    if (!body?.title || !body?.description || !body?.dueDate || !body?.assignedTo || !body?.linkedType || !body?.linkedId) {
      console.log('[API /tasks POST] Missing required fields');
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }
    const validStatus = ['a_faire', 'en_cours', 'termine']
    const validLinked = ['lead', 'client']
    if (body.status && !validStatus.includes(body.status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 })
    }
    if (!validLinked.includes(body.linkedType)) {
      return NextResponse.json({ success: false, error: 'Invalid linkedType' }, { status: 400 })
    }

    console.log('[API /tasks POST] Calling createTaskWithEvent...');
    // Create task WITH automatic calendar event using sync function
    const result = await createTaskWithEvent({
      title: body.title,
      description: body.description,
      dueDate: new Date(body.dueDate),
      assignedTo: body.assignedTo,
      linkedType: body.linkedType,
      linkedId: body.linkedId,
      linkedName: body.linkedName || null,
      status: body.status || 'a_faire',
      reminderEnabled: body.reminderEnabled || false,
      reminderDays: body.reminderDays || null,
      createdBy: body.createdBy || 'Système',
    })

    console.log('[API /tasks POST] Result:', { success: result.success, taskId: result.task?.id, eventId: result.event?.id, error: result.error });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    const task = result.task

    // Try to notify assignee immediately
    try {
      // Find the userId from the assigned user name
      const user = await prisma.user.findFirst({ where: { name: body.assignedTo } })
      if (user?.id) {
        await notifyTaskAssigned({
          userId: user.id,
          taskTitle: body.title,
          taskId: task.id,
          dueDate: new Date(body.dueDate).toISOString(),
          linkedName: body.linkedName || undefined,
          createdBy: body.createdBy || 'Système',
        })
      }
    } catch (notifyError) {
      console.error('[API/tasks] Failed to send assignment notification:', notifyError)
      // Do not fail the request because of notification errors
    }

    // Create historique entry if linked to a client
    if (body.linkedType === 'client' && body.linkedId) {
      try {
        await prisma.historique.create({
          data: {
            clientId: body.linkedId,
            date: new Date(),
            type: 'tache',
            description: `Tâche créée: "${body.title}"`,
            auteur: body.createdBy || 'Système',
            metadata: { taskId: task.id, eventId: result.event?.id }
          }
        })
      } catch (histError) {
        console.error('Error creating historique entry for task:', histError)
        // Don't fail the task creation if historique fails
      }
    }

    return NextResponse.json({
      success: true,
      data: task,
      event: result.event
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating task:', error)

    // Handle Prisma connection errors
    if (error?.code === 'P1001') {
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection failed. Please check your database configuration and ensure the server is running.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to create task'
      },
      { status: 500 }
    )
  }
}
