import { NextResponse } from "next/server"

export async function POST() {
  try {
    // Create response
    const response = NextResponse.json(
      {
        success: true,
        message: "Déconnexion réussie",
      },
      { status: 200 }
    )
    
    // Clear the token cookie
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/',
    })
    
    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la déconnexion" },
      { status: 500 }
    )
  }
}
