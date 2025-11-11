'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Bell, TestTube } from 'lucide-react';

export function NotificationTestPanel() {
  const [loading, setLoading] = useState(false);

  const sendTestNotification = async (type: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ type }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Test] Notification created:', data);
        toast.success('✅ Notification de test créée!');
      } else {
        const error = await response.json();
        console.error('[Test] Error:', error);
        toast.error('❌ Erreur: ' + (error.error || 'Inconnue'));
      }
    } catch (error) {
      console.error('[Test] Exception:', error);
      toast.error('❌ Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <TestTube className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Test Notifications</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => sendTestNotification('rdv_reminder')}
          disabled={loading}
        >
          <Bell className="h-4 w-4 mr-2" />
          RDV Reminder
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => sendTestNotification('rdv_created')}
          disabled={loading}
        >
          RDV Created
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => sendTestNotification('stage_changed')}
          disabled={loading}
        >
          Stage Changed
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => sendTestNotification('task_assigned')}
          disabled={loading}
        >
          Task Assigned
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Vérifiez la console pour les logs détaillés
      </p>
    </Card>
  );
}
