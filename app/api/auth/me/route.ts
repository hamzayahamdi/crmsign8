import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export async function GET(request: NextRequest) {
  try {
    let token: string | undefined;
    
    // First, try to get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // Fall back to cookies if no Authorization header
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get('token')?.value;
    }
    
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    const decoded = verify(token, JWT_SECRET) as JWTPayload;
    
    return NextResponse.json({
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    });
  } catch (error) {
    console.error('[Auth Me] Error:', error);
    return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
  }
}
