'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { Sidebar } from '@/components/sidebar';
import { NotificationDebug } from '@/components/notification-debug';
import { NotificationTestPanel } from '@/components/notification-test-panel';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Bell, Zap, Info } from 'lucide-react';

function TestNotificationsContent() {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  const testSimpleToast = () => {
    addLog('Testing simple toast...');
    toast.info('🔔 Simple Toast Test', {
      description: 'This is a basic toast notification',
      duration: 5000,
    });
    addLog('Simple toast triggered');
  };

  const testSystemDiagnostic = async () => {
    addLog('Running system diagnostic...');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/notifications/test-simple', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      
      const data = await response.json();
      console.log('[Diagnostic] Response:', data);
      
      if (response.ok) {
        addLog(`✅ Auth: User ${data.user.id}`);
        addLog(`✅ Database: ${data.database.status}`);
        if (data.database.error) {
          addLog(`⚠️ DB Error: ${data.database.error}`);
        }
        addLog(`Environment: JWT=${data.environment.hasJwtSecret}, DB=${data.environment.hasDatabaseUrl}`);
        toast.success('Diagnostic terminé - voir les logs');
      } else {
        addLog(`❌ Error: ${data.error}`);
        toast.error('Diagnostic échoué: ' + data.error);
      }
    } catch (error) {
      addLog(`❌ Exception: ${error}`);
      toast.error('Erreur réseau');
    }
  };

  const testSuccessToast = () => {
    addLog('Testing success toast...');
    toast.success('✅ Success!', {
      description: 'This is a success notification',
      duration: 5000,
    });
    addLog('Success toast triggered');
  };

  const testErrorToast = () => {
    addLog('Testing error toast...');
    toast.error('❌ Error!', {
      description: 'This is an error notification',
      duration: 5000,
    });
    addLog('Error toast triggered');
  };

  const testWarningToast = () => {
    addLog('Testing warning toast...');
    toast.warning('⚠️ Warning!', {
      description: 'This is a warning notification',
      duration: 5000,
    });
    addLog('Warning toast triggered');
  };

  const testLongToast = () => {
    addLog('Testing long duration toast...');
    toast.info('⏱️ Long Toast', {
      description: 'This toast will stay for 10 seconds',
      duration: 10000,
    });
    addLog('Long toast triggered (10s)');
  };

  const testToastWithAction = () => {
    addLog('Testing toast with action...');
    toast.info('🎯 Action Toast', {
      description: 'This toast has an action button',
      duration: 8000,
      action: {
        label: 'Click Me',
        onClick: () => {
          addLog('Action button clicked!');
          toast.success('Action executed!');
        }
      }
    });
    addLog('Action toast triggered');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border/40 bg-gradient-to-br from-background via-background to-muted/20 backdrop-blur-xl p-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-amber-500/80 to-amber-500/60 rounded-2xl blur-lg opacity-50"></div>
            <div className="relative p-3 bg-gradient-to-br from-amber-500 via-amber-500/90 to-amber-500/70 rounded-2xl shadow-2xl">
              <Bell className="h-7 w-7 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Test des Notifications
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Testez et déboguez le système de notifications
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* System Status */}
          <div>
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              État du Système
            </h2>
            <NotificationDebug />
          </div>

          {/* Toast Tests */}
          <div>
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Tests de Toast
            </h2>
            <Card className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Button onClick={testSystemDiagnostic} variant="default" className="col-span-2 md:col-span-3">
                  🔍 Run System Diagnostic
                </Button>
                <Button onClick={testSimpleToast} variant="outline">
                  Info Toast
                </Button>
                <Button onClick={testSuccessToast} variant="outline">
                  Success Toast
                </Button>
                <Button onClick={testErrorToast} variant="outline">
                  Error Toast
                </Button>
                <Button onClick={testWarningToast} variant="outline">
                  Warning Toast
                </Button>
                <Button onClick={testLongToast} variant="outline">
                  Long Duration
                </Button>
                <Button onClick={testToastWithAction} variant="outline">
                  With Action
                </Button>
              </div>
            </Card>
          </div>

          {/* API Notification Tests */}
          <div>
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Tests de Notifications API
            </h2>
            <NotificationTestPanel />
          </div>

          {/* Logs */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Logs</h2>
            <Card className="p-4">
              <div className="space-y-1 max-h-96 overflow-auto font-mono text-xs">
                {logs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Aucun log pour le moment. Cliquez sur un bouton de test.
                  </p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="text-muted-foreground">
                      {log}
                    </div>
                  ))
                )}
              </div>
              {logs.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLogs([])}
                  className="mt-3 w-full"
                >
                  Effacer les logs
                </Button>
              )}
            </Card>
          </div>

          {/* Instructions */}
          <Card className="p-6 bg-muted/50">
            <h3 className="font-semibold mb-3">Instructions</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>1. Vérifiez l'état du système</strong> - Tous les indicateurs doivent être verts</p>
              <p><strong>2. Testez les toasts simples</strong> - Cliquez sur les boutons de test de toast</p>
              <p><strong>3. Testez les notifications API</strong> - Créez des notifications via l'API</p>
              <p><strong>4. Vérifiez la console</strong> - Ouvrez DevTools (F12) pour voir les logs détaillés</p>
              <p><strong>5. Vérifiez les logs</strong> - Les actions sont enregistrées dans la section Logs ci-dessus</p>
            </div>
          </Card>

          {/* Troubleshooting */}
          <Card className="p-6 border-amber-500/50 bg-amber-500/5">
            <h3 className="font-semibold mb-3 text-amber-600 dark:text-amber-400">
              Dépannage
            </h3>
            <div className="space-y-2 text-sm">
              <p><strong>Les toasts simples ne s'affichent pas?</strong></p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li>Vérifiez que le composant Toaster est dans layout.tsx</li>
                <li>Vérifiez qu'aucune extension de navigateur ne bloque les toasts</li>
                <li>Essayez en mode navigation privée</li>
              </ul>
              
              <p className="pt-2"><strong>Les notifications API ne créent pas de toasts?</strong></p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li>Vérifiez la configuration Supabase dans .env.local</li>
                <li>Vérifiez que la table notifications existe dans Supabase</li>
                <li>Vérifiez que le realtime est activé pour la table notifications</li>
                <li>Consultez NOTIFICATION_TROUBLESHOOTING.md pour plus de détails</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function TestNotificationsPage() {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <TestNotificationsContent />
      </div>
    </AuthGuard>
  );
}
