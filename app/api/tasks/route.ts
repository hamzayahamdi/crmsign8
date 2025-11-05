import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Ensure we run on Node.js runtime (Prisma is not supported on edge)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

// GET all tasks with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assignedTo = searchParams.get('assignedTo')
    const status = searchParams.get('status')
    const linkedType = searchParams.get('linkedType')

    const where: any = {}
    if (assignedTo && assignedTo !== 'all') where.assignedTo = assignedTo
    if (status && status !== 'all') where.status = status
    if (linkedType && linkedType !== 'all') where.linkedType = linkedType

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({ success: true, data: tasks, count: tasks.length })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

// POST - Create new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Basic validation
    if (!body?.title || !body?.description || !body?.dueDate || !body?.assignedTo || !body?.linkedType || !body?.linkedId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }
    const validStatus = ['a_faire','en_cours','termine']
    const validLinked = ['lead','client']
    if (body.status && !validStatus.includes(body.status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 })
    }
    if (!validLinked.includes(body.linkedType)) {
      return NextResponse.json({ success: false, error: 'Invalid linkedType' }, { status: 400 })
    }
    
    const task = await prisma.task.create({
      data: {
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
      }
    })

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
            metadata: { taskId: task.id }
          }
        })
      } catch (histError) {
        console.error('Error creating historique entry for task:', histError)
        // Don't fail the task creation if historique fails
      }
    }

    return NextResponse.json({
      success: true,
      data: task
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create task' },
      { status: 500 }
    )
  }
}
