import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/database"
import bcrypt from "bcryptjs"

const ALLOWED_ROLES = new Set(["admin", "operator", "gestionnaire", "architect", "commercial", "magasiner", "chef_de_chantier"])

// GET all users - sorted by most recent first
export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc' // Most recent first
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        magasin: true,
        ville: true,
        createdAt: true,
        updatedAt: true,
        // Don't return password
      }
    })

    return NextResponse.json(users, { status: 200 })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}

// POST create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name } = body
    let role: string = typeof body.role === 'string' ? body.role : 'architect'
    if (!ALLOWED_ROLES.has(role as any)) {
      role = 'architect'
    }
    const magasin: string | undefined = typeof body.magasin === 'string' ? body.magasin : undefined
    const ville: string | undefined = typeof body.ville === 'string' ? body.ville : undefined

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      )
    }

    // If role is magasiner, magasin is required
    if (role === 'magasiner' && !magasin) {
      return NextResponse.json(
        { error: "Magasin is required for magasiner users" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role,
        magasin: role === 'magasiner' ? magasin : undefined,
        ville,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        magasin: true,
        ville: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    )
  }
}
