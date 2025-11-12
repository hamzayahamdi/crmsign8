"use server"

import { NextRequest, NextResponse } from "next/server"
import { verify } from "jsonwebtoken"
import { assignTask } from "@/lib/task-service"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getTokenFromRequest(request: NextRequest) {
  return (
    request.headers.get("authorization")?.replace("Bearer ", "") ||
    request.cookies.get("token")?.value ||
    null
  )
}

function authenticate(request: NextRequest) {
  const rawToken = getTokenFromRequest(request)
  if (!rawToken) {
    return null
  }

  try {
    return verify(rawToken, JWT_SECRET) as {
      userId: string
      name: string
      role: string
    }
  } catch (error) {
    console.error("[API/tasks/assign] Invalid token:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = authenticate(request)
    if (!auth) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, dueDate, assignedTo, linkedType, linkedId, reminderEnabled, reminderDays, status } = body ?? {}

    if (!title || !dueDate || !assignedTo || !linkedType || !linkedId) {
      return NextResponse.json(
        { error: "Champs requis manquants" },
        { status: 400 },
      )
    }

    if (!["lead", "client"].includes(linkedType)) {
      return NextResponse.json(
        { error: 'linkedType doit être "lead" ou "client"' },
        { status: 400 },
      )
    }

    const result = await assignTask(
      {
        title: String(title),
        description: typeof description === "string" ? description : "",
        dueDate: dueDate,
        assignedTo: String(assignedTo),
        linkedType,
        linkedId: String(linkedId),
        reminderEnabled: Boolean(reminderEnabled),
        reminderDays: reminderDays ?? null,
        status,
      },
      {
        id: auth.userId,
        name: auth.name,
        role: auth.role,
      },
    )

    return NextResponse.json(
      {
        success: true,
        data: result.task,
        message: result.message,
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error("[API/tasks/assign] Error:", error)
    const message = error?.message || "Erreur lors de l'assignation de la tâche"
    const status = ["Permission refusée", "Utilisateur introuvable", "Lead ou client introuvable", 'linkedType invalide, doit être "lead" ou "client"'].includes(message)
      ? 400
      : 500

    return NextResponse.json(
      {
        error: message,
      },
      { status },
    )
  }
}