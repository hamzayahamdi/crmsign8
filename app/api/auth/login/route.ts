import { NextRequest, NextResponse } from "next/server"
import { sign } from "jsonwebtoken"
import { prisma } from "@/lib/database"
import bcrypt from "bcryptjs"


const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"
const TOKEN_EXPIRY = "7d" // 7 days

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      )
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      )
    }

    // Verify password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password)
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      )
    }

    // Generate JWT token
    const token = sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        magasin: user.magasin,
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    )

    // Create response with token in cookie AND body
    const response = NextResponse.json(
      {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          magasin: user.magasin,
        },
      },
      { status: 200 }
    )

    // Set token as HTTP-only cookie for API authentication
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    };
    
    response.cookies.set('token', token, cookieOptions);
    
    console.log('[Login] Setting cookie with options:', {
      ...cookieOptions,
      tokenLength: token.length,
      environment: process.env.NODE_ENV
    });

    return response
  } catch (error) {
    console.error("Login error:", error)
    console.error("Error details:", error instanceof Error ? error.message : String(error))
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      { 
        error: "Erreur serveur. Veuillez réessayer.",
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    )
  }
}
