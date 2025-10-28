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

    // Return success with token and user data
    return NextResponse.json(
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
