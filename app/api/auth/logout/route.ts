import { NextResponse } from "next/server"

export async function POST() {
  try {
    // In a more complex setup, you might invalidate the token in a database
    // For now, we'll just return success and let the client handle token removal
    
    return NextResponse.json(
      {
        success: true,
        message: "Déconnexion réussie",
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la déconnexion" },
      { status: 500 }
    )
  }
}
