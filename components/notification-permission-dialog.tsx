'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Bell, Mail, Smartphone, X } from 'lucide-react';
import { notificationService } from '@/lib/notification-service-client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationPermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail?: string;
}

export function NotificationPermissionDialog({
  isOpen,
  onClose,
  userId,
  userEmail
}: NotificationPermissionDialogProps) {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [email, setEmail] = useState(userEmail || '');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'intro' | 'settings'>('intro');
  const [emailError, setEmailError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
      setEmailError('');
    } else {
      // Reset state when modal closes
      setEmailError('');
      setStep('intro');
    }
  }, [isOpen]);

  const loadPreferences = async () => {
    try {
      const prefs = await notificationService.getPreferences(userId);
      if (prefs) {
        setPushEnabled(prefs.pushEnabled);
        setEmailEnabled(prefs.emailEnabled);
        if (prefs.email) {
          setEmail(prefs.email);
        } else if (userEmail) {
          setEmail(userEmail);
        }
      } else if (userEmail) {
        setEmail(userEmail);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  // Email validation function
  const validateEmail = (emailValue: string): string => {
    if (!emailValue || !emailValue.trim()) {
      return 'L\'adresse email est requise';
    }
    
    const trimmedEmail = emailValue.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(trimmedEmail)) {
      return 'Format d\'email invalide';
    }
    
    return '';
  };

  // Handle email input change with validation
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailEnabled && value) {
      const error = validateEmail(value);
      setEmailError(error);
    } else {
      setEmailError('');
    }
  };

  // Handle email enabled toggle
  const handleEmailEnabledChange = (enabled: boolean) => {
    setEmailEnabled(enabled);
    if (enabled) {
      // Validate email when enabling
      if (email) {
        const error = validateEmail(email);
        setEmailError(error);
      } else {
        setEmailError('L\'adresse email est requise');
      }
    } else {
      setEmailError('');
    }
  };

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      // Initialize service worker
      await notificationService.initServiceWorker();

      // Request permission
      const permission = await notificationService.requestPermission();

      if (permission === 'granted') {
        setPushEnabled(true);
        setStep('settings');
        toast.success('Notifications activées avec succès! 🎉');
      } else if (permission === 'denied') {
        toast.error('Les notifications ont été refusées. Vous pouvez les activer dans les paramètres de votre navigateur.');
        setStep('settings');
      } else {
        toast.info('Permission de notification en attente');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Erreur lors de l\'activation des notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    // Validate email if email notifications are enabled
    if (emailEnabled) {
      const error = validateEmail(email);
      if (error) {
        setEmailError(error);
        toast.error(error);
        return;
      }
    }

    setIsLoading(true);
    setEmailError('');
    
    try {
      const trimmedEmail = email.trim();
      await notificationService.updatePreferences(userId, {
        pushEnabled,
        emailEnabled,
        email: emailEnabled ? trimmedEmail : undefined
      });

      toast.success('Préférences enregistrées avec succès! ✅');
      onClose();
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      
      // Handle specific error messages from API
      const errorMessage = error?.message || '';
      
      if (error?.response?.status === 409 || errorMessage.toLowerCase().includes('déjà utilisée') || errorMessage.toLowerCase().includes('already')) {
        const errorMsg = 'Cette adresse email est déjà utilisée';
        setEmailError(errorMsg);
        toast.error(errorMsg);
      } else if (error?.response?.status === 400 || errorMessage.toLowerCase().includes('email') || errorMessage.toLowerCase().includes('invalide')) {
        const errorMsg = errorMessage || 'Données invalides. Veuillez vérifier votre email.';
        setEmailError(errorMsg);
        toast.error(errorMsg);
      } else {
        const errorMsg = errorMessage || 'Erreur lors de l\'enregistrement des préférences';
        toast.error(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Save default preferences (email only)
    notificationService.updatePreferences(userId, {
      pushEnabled: false,
      emailEnabled: true,
      email: userEmail
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-[500px] p-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 'intro' ? (
            <motion.div
              key="intro"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6"
            >
              <DialogHeader>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                    <Bell className="h-8 w-8 text-primary" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSkip}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <DialogTitle className="text-2xl">
                  Ne manquez plus aucun rendez-vous
                </DialogTitle>
                <DialogDescription className="text-base mt-2">
                  Activez les notifications pour recevoir des rappels avant vos événements importants.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
                    <Smartphone className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Notifications push</h4>
                    <p className="text-sm text-muted-foreground">
                      Recevez des alertes instantanées sur votre appareil, même quand l'application est fermée.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="p-2 bg-green-500/10 rounded-lg shrink-0">
                    <Mail className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Rappels par email</h4>
                    <p className="text-sm text-muted-foreground">
                      Recevez également des emails de rappel pour ne rien manquer.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-6 gap-2">
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  disabled={isLoading}
                >
                  Plus tard
                </Button>
                <Button
                  onClick={handleEnableNotifications}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Bell className="h-4 w-4" />
                  Activer les notifications
                </Button>
              </DialogFooter>
            </motion.div>
          ) : (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              <DialogHeader>
                <DialogTitle className="text-xl">
                  Préférences de notification
                </DialogTitle>
                <DialogDescription>
                  Personnalisez comment vous souhaitez recevoir vos rappels.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-6 space-y-6">
                {/* Push Notifications */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Smartphone className="h-4 w-4 text-primary" />
                      <Label htmlFor="push-enabled" className="font-semibold">
                        Notifications push
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Alertes instantanées sur votre appareil
                    </p>
                  </div>
                  <Switch
                    id="push-enabled"
                    checked={pushEnabled}
                    onCheckedChange={setPushEnabled}
                  />
                </div>

                {/* Email Notifications */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Mail className="h-4 w-4 text-primary" />
                        <Label htmlFor="email-enabled" className="font-semibold">
                          Rappels par email
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Recevez des emails de rappel
                      </p>
                    </div>
                    <Switch
                      id="email-enabled"
                      checked={emailEnabled}
                      onCheckedChange={handleEmailEnabledChange}
                    />
                  </div>

                  {emailEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <Label htmlFor="email" className="text-sm">
                        Adresse email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        onBlur={() => {
                          if (emailEnabled && email) {
                            const error = validateEmail(email);
                            setEmailError(error);
                          }
                        }}
                        placeholder="votre@email.com"
                        className={`mt-1.5 ${emailError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                      />
                      {emailError && (
                        <p className="text-xs text-red-500 mt-1.5">{emailError}</p>
                      )}
                    </motion.div>
                  )}
                </div>

                {!pushEnabled && !emailEnabled && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      ⚠️ Vous ne recevrez aucun rappel si les deux options sont désactivées.
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-6 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('intro')}
                  disabled={isLoading}
                >
                  Retour
                </Button>
                <Button
                  onClick={handleSavePreferences}
                  disabled={isLoading || (emailEnabled && (!email || !!emailError))}
                >
                  {isLoading ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
