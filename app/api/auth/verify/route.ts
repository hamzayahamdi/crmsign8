import { NextRequest, NextResponse } from "next/server"
import { verify } from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Token manquant" },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    try {
      const decoded = verify(token, JWT_SECRET) as {
        userId: string
        email: string
        name: string
        role: string
        magasin?: string
      }

      return NextResponse.json(
        {
          valid: true,
          user: {
            id: decoded.userId,
            email: decoded.email,
            name: decoded.name,
            role: decoded.role,
            magasin: decoded.magasin,
          },
        },
        { status: 200 }
      )
    } catch (verifyError) {
      return NextResponse.json(
        { error: "Token invalide ou expiré" },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error("Verify error:", error)
    return NextResponse.json(
      { error: "Erreur de vérification" },
      { status: 500 }
    )
  }
}
