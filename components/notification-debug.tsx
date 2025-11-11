'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

export function NotificationDebug() {
  const [status, setStatus] = useState({
    supabaseConfigured: false,
    notificationPermission: 'unknown',
    userAuthenticated: false,
    userId: '',
    toasterPresent: false,
    serviceWorkerRegistered: false,
  });

  const checkStatus = () => {
    // Check Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Check auth
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    // Check notification permission
    const permission = typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : 'not-supported';
    
    // Check service worker
    const swRegistered = typeof window !== 'undefined' && 'serviceWorker' in navigator;
    
    // Check for Toaster - Sonner adds this attribute when mounted
    const toasterPresent = typeof document !== 'undefined' 
      ? (document.querySelector('[data-sonner-toaster]') !== null || 
         document.querySelector('.toaster') !== null)
      : false;

    setStatus({
      supabaseConfigured: !!(supabaseUrl && supabaseKey),
      notificationPermission: permission,
      userAuthenticated: !!token,
      userId: token ? 'Present' : 'None',
      toasterPresent,
      serviceWorkerRegistered: swRegistered,
    });
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const StatusItem = ({ 
    label, 
    value, 
    isGood 
  }: { 
    label: string; 
    value: string; 
    isGood: boolean;
  }) => (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{value}</span>
        {isGood ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500" />
        )}
      </div>
    </div>
  );

  const allGood = 
    status.supabaseConfigured &&
    status.notificationPermission === 'granted' &&
    status.userAuthenticated &&
    status.toasterPresent;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Notification System Status</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={checkStatus}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-1">
        <StatusItem
          label="Supabase Configured"
          value={status.supabaseConfigured ? 'Yes' : 'No'}
          isGood={status.supabaseConfigured}
        />
        <StatusItem
          label="User Authenticated"
          value={status.userAuthenticated ? 'Yes' : 'No'}
          isGood={status.userAuthenticated}
        />
        <StatusItem
          label="Notification Permission"
          value={status.notificationPermission}
          isGood={status.notificationPermission === 'granted'}
        />
        <StatusItem
          label="Toaster Component"
          value={status.toasterPresent ? 'Present' : 'Missing'}
          isGood={status.toasterPresent}
        />
        <StatusItem
          label="Service Worker Support"
          value={status.serviceWorkerRegistered ? 'Yes' : 'No'}
          isGood={status.serviceWorkerRegistered}
        />
      </div>

      <div className="pt-2">
        {allGood ? (
          <Badge variant="default" className="w-full justify-center bg-green-500">
            ✓ All Systems Ready
          </Badge>
        ) : (
          <Badge variant="destructive" className="w-full justify-center">
            ⚠ Issues Detected
          </Badge>
        )}
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Next Steps:</strong></p>
        {!status.supabaseConfigured && (
          <p>• Configure Supabase credentials in .env.local</p>
        )}
        {!status.userAuthenticated && (
          <p>• Log in to authenticate</p>
        )}
        {status.notificationPermission !== 'granted' && (
          <p>• Grant notification permissions in browser</p>
        )}
        {!status.toasterPresent && (
          <p>• Check that Toaster component is in layout.tsx</p>
        )}
      </div>
    </Card>
  );
}
