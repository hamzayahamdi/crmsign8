import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Verify JWT token
function verifyToken(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || 
                request.cookies.get('token')?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    // JWT uses 'userId' field, not 'id'
    return {
      id: decoded.userId || decoded.id,
      userId: decoded.userId || decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      magasin: decoded.magasin
    };
  } catch (error) {
    return null;
  }
}

// POST /api/notifications/test-simple - Test without database
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé - pas de token valide' }, { status: 401 });
    }

    console.log('[API Test Simple] User authenticated:', user.id);

    // Test database connection
    let dbStatus = 'unknown';
    let dbError = null;
    
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      // Try to count notifications
      const count = await prisma.notification.count();
      dbStatus = 'connected';
      console.log('[API Test Simple] Database connected, notification count:', count);
      
      await prisma.$disconnect();
    } catch (error) {
      dbStatus = 'error';
      dbError = error instanceof Error ? error.message : String(error);
      console.error('[API Test Simple] Database error:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Test simple réussi',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      database: {
        status: dbStatus,
        error: dbError
      },
      environment: {
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }
    }, { status: 200 });
  } catch (error) {
    console.error('[API Test Simple] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    
    return NextResponse.json(
      { 
        error: 'Erreur lors du test',
        details: errorMessage,
        type: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    );
  }
}
