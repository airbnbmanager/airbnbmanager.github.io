import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // 1. Service Worker Registration
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Haven PWA ServiceWorker registered with scope:', registration.scope);
          })
          .catch((err) => {
            console.log('Haven PWA ServiceWorker registration skipped/failed:', err);
          });
      });
    }

    // 2. Check if already installed in standalone mode
    const checkStandalone = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      setIsInstalled(!!isStandalone);
    };
    checkStandalone();

    // 3. Capture beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // 4. Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      toast.success('Haven CRM successfully installed as a native app!');
    };

    // 5. Online/Offline detection
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored — Live sync active');
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Offline mode — Cached operations available');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) {
      toast.info('To install Haven CRM on this browser, use "Add to Home Screen" or the install icon in the URL bar.');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        toast.success('Installing Haven CRM...');
        setIsInstalled(true);
        setIsInstallable(false);
      } else {
        toast.info('Installation dismissed');
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('Error during installation prompt:', err);
    }
  };

  return {
    isInstallable,
    isInstalled,
    isOnline,
    installApp,
  };
}
