import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createNotification } from '@/lib/notification-creator';

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

// POST /api/notifications/test - Create a test notification
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    console.log('[API Test] User from token:', { id: user.id, email: user.email, role: user.role });

    const body = await request.json();
    const { userId, type = 'rdv_reminder' } = body;

    const targetUserId = userId || user.id;
    
    if (!targetUserId) {
      return NextResponse.json({ 
        error: 'User ID manquant',
        details: 'Le token JWT ne contient pas d\'ID utilisateur valide'
      }, { status: 400 });
    }
    
    console.log('[API Test] Target user ID:', targetUserId);

    let notification;
    
    switch (type) {
      case 'rdv_reminder':
        notification = await createNotification({
          userId: targetUserId,
          type: 'rdv_reminder',
          priority: 'high',
          title: '🔔 Test: Rappel RDV',
          message: 'Ceci est une notification de test pour un rappel de rendez-vous',
          linkedType: 'client',
          linkedId: 'test-client-id',
          linkedName: 'Client Test',
          metadata: {
            appointmentDate: new Date().toISOString(),
            location: 'Bureau Test',
          },
          createdBy: user.id,
        });
        break;
      
      case 'rdv_created':
        notification = await createNotification({
          userId: targetUserId,
          type: 'rdv_created',
          priority: 'high',
          title: '📅 Test: Nouveau RDV',
          message: 'Un nouveau rendez-vous a été créé (test)',
          linkedType: 'client',
          linkedId: 'test-client-id',
          linkedName: 'Client Test',
          createdBy: user.id,
        });
        break;
      
      case 'stage_changed':
        notification = await createNotification({
          userId: targetUserId,
          type: 'stage_changed',
          priority: 'medium',
          title: '🔄 Test: Changement d\'étape',
          message: 'Le statut d\'un client a changé (test)',
          linkedType: 'client',
          linkedId: 'test-client-id',
          linkedName: 'Client Test',
          metadata: {
            previousStage: 'Lead',
            newStage: 'Qualifié',
          },
          createdBy: user.id,
        });
        break;
      
      default:
        notification = await createNotification({
          userId: targetUserId,
          type: 'task_assigned',
          priority: 'medium',
          title: '✅ Test: Notification',
          message: 'Ceci est une notification de test générique',
          linkedType: 'test',
          linkedId: 'test-id',
          createdBy: user.id,
        });
    }

    console.log('[API] Test notification created:', notification);

    return NextResponse.json({
      success: true,
      notification,
      message: 'Notification de test créée avec succès',
    }, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating test notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[API] Error details:', { message: errorMessage, stack: errorStack });
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la création de la notification de test',
        details: errorMessage,
        type: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    );
  }
}
