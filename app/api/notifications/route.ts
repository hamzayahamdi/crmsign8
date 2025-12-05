import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { sendWhatsAppNotification } from '@/lib/sendWhatsAppNotification'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

function verifyToken(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
    request.cookies.get('token')?.value
  if (!token) return null
  try {
    return jwt.verify(token, JWT_SECRET) as any
  } catch {
    return null
  }
}

// GET /api/notifications?userId=...
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'ID utilisateur requis' },
        { status: 400 },
      )
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ])

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    console.error('[API/notifications] Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des notifications' },
      { status: 500 },
    )
  }
}

// POST /api/notifications - Create notification with WhatsApp
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const {
      userId,
      type,
      priority = 'medium',
      title,
      message,
      linkedType,
      linkedId,
      linkedName,
      metadata
    } = body

    // Validate required fields
    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Champs requis manquants' },
        { status: 400 }
      )
    }

    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        priority,
        title,
        message,
        linkedType,
        linkedId,
        linkedName,
        metadata,
        createdBy: user.userId
      }
    })

    console.log('[API/notifications] ✅ Notification created:', notification.id)

    // Send WhatsApp notification
    try {
      const recipient = await prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true, name: true }
      })

      if (recipient?.phone) {
        console.log('[API/notifications] Sending WhatsApp to:', recipient.name)

        await sendWhatsAppNotification({
          userId,
          phone: recipient.phone,
          title,
          message,
          type,
          priority,
          linkedType,
          linkedId,
          linkedName,
          metadata
        })

        console.log('[API/notifications] ✅ WhatsApp sent to:', recipient.name)
      } else {
        console.log('[API/notifications] ⚠️ No phone number for user:', userId)
      }
    } catch (whatsappError) {
      console.error('[API/notifications] Error sending WhatsApp:', whatsappError)
      // Don't fail the request if WhatsApp fails
    }

    return NextResponse.json({
      success: true,
      notification
    }, { status: 201 })

  } catch (error) {
    console.error('[API/notifications] Error creating notification:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la notification' },
      { status: 500 }
    )
  }
}
