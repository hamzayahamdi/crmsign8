import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/database"
import bcrypt from "bcryptjs"

const ALLOWED_ROLES = new Set(["admin", "architect", "commercial"])
// GET single user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        magasin: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(user, { status: 200 })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    )
  }
}

// PATCH update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Resolve id from params, with a safe fallback from URL parsing in case params is undefined
    const url = new URL(request.url)
    const pathname = url.pathname
    const idFromUrl = (() => {
      const segments = pathname.split("/")
      const usersIndex = segments.findIndex((seg) => seg === "users")
      if (usersIndex !== -1 && segments.length > usersIndex + 1) {
        return segments[usersIndex + 1]
      }
      return undefined
    })()
    const userId = params?.id ?? idFromUrl

    if (!userId) {
      return NextResponse.json(
        { error: "User id is required in the route (e.g., /api/users/:id)" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { email, password, name } = body

    const updateData: any = {}
    
    if (email) updateData.email = email.toLowerCase()
    if (name) updateData.name = name
    if (typeof body.role === 'string' && ALLOWED_ROLES.has(body.role)) {
      updateData.role = body.role
    }
    // Allow updating magasin; require it if role becomes/commercial
    if (typeof body.magasin === 'string') {
      updateData.magasin = body.magasin
    }
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    // Avoid calling update with empty data
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        magasin: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json(user, { status: 200 })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
  }
}

// DELETE user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.user.delete({
      where: { id: params.id }
    })

    return NextResponse.json(
      { message: "User deleted successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    )
  }
}
