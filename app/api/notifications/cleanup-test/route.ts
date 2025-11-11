import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Normalize JWT payload (token uses userId)
function verifyToken(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                request.cookies.get('token')?.value
  if (!token) return null
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return {
      id: decoded.userId || decoded.id,
      userId: decoded.userId || decoded.id,
      email: decoded.email,
      role: decoded.role,
    }
  } catch {
    return null
  }
}

// POST /api/notifications/cleanup-test
// Deletes test notifications for the current user
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request)
    if (!user?.userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Criteria for test notifications created during setup
    // - title starts with "Test:" OR message contains "(test)" OR linkedId is "test-client-id"
    const result = await prisma.notification.deleteMany({
      where: {
        userId: user.userId,
        OR: [
          { title: { startsWith: 'Test:' } },
          { message: { contains: '(test)' } },
          { linkedId: 'test-client-id' },
        ],
      },
    })

    return NextResponse.json({ success: true, deleted: result.count })
  } catch (error) {
    console.error('[API] Cleanup test notifications error:', error)
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: 'Erreur lors du nettoyage', details: message }, { status: 500 })
  }
}
