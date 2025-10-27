import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

// GET single task
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: params.id }
    })

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: task
    })
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch task' },
      { status: 500 }
    )
  }
}

// PUT - Update task
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    let id = params?.id
    if (!id || id === 'undefined' || id === 'null') {
      if (body?.id && typeof body.id === 'string') {
        id = body.id
      }
    }
    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json({ success: false, error: 'Missing task id' }, { status: 400 })
    }
    const updateData: any = {}

    if (body.title !== undefined) updateData.title = String(body.title)
    if (body.description !== undefined) updateData.description = String(body.description)
    if (body.dueDate !== undefined) {
      const d = new Date(body.dueDate)
      if (isNaN(d.getTime())) {
        return NextResponse.json({ success: false, error: 'Invalid dueDate' }, { status: 400 })
      }
      updateData.dueDate = d
    }
    if (body.assignedTo !== undefined) updateData.assignedTo = String(body.assignedTo)
    if (body.linkedType !== undefined) {
      const validLinked = ['lead','client']
      if (!validLinked.includes(body.linkedType)) {
        return NextResponse.json({ success: false, error: 'Invalid linkedType' }, { status: 400 })
      }
      updateData.linkedType = body.linkedType
    }
    if (body.linkedId !== undefined) updateData.linkedId = String(body.linkedId)
    if (body.linkedName !== undefined) updateData.linkedName = body.linkedName ? String(body.linkedName) : null
    if (body.status !== undefined) {
      const validStatus = ['a_faire','en_cours','termine']
      if (!validStatus.includes(body.status)) {
        return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 })
      }
      updateData.status = body.status
    }
    if (body.reminderEnabled !== undefined) updateData.reminderEnabled = Boolean(body.reminderEnabled)
    if (body.reminderDays !== undefined) updateData.reminderDays = body.reminderDays === null ? null : Number(body.reminderDays)

    const task = await prisma.task.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      data: task
    })
  } catch (error: any) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update task' },
      { status: 500 }
    )
  }
}

// DELETE task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.task.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
