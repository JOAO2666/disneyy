/**
 * Capacitor Polyfills for Android
 * Ensure web APIs work correctly on Android platform
 */

// ============================================
// 1. DETECT CAPACITOR ENVIRONMENT
// ============================================

export const isCapacitor = () => {
  return typeof window !== 'undefined' && window.Capacitor !== undefined;
};

export const isAndroid = () => {
  if (!isCapacitor()) return false;
  return window.Capacitor.platform === 'android';
};

export const isWeb = () => {
  return !isCapacitor() || window.Capacitor.platform === 'web';
};

// ============================================
// 2. CAPACITOR INITIALIZATION
// ============================================

export const initializeCapacitor = async () => {
  try {
    if (!isCapacitor()) return;

    const { App } = window.Capacitor.Plugins;
    const { SplashScreen } = window.Capacitor.Plugins;
    const { StatusBar } = window.Capacitor.Plugins;

    // Hide splash screen after app loads
    if (SplashScreen) {
      setTimeout(() => {
        SplashScreen.hide();
      }, 2000);
    }

    // Setup status bar
    if (StatusBar && isAndroid()) {
      StatusBar.setStyle({ style: 'DARK' });
      StatusBar.setBackgroundColor({ color: '#000000' });
    }

    // Handle app state
    if (App) {
      App.addListener('appStateChange', (state) => {
        console.log('App state changed:', state);
      });

      App.addListener('backButton', () => {
        // Handle back button on Android
        if (window.history.length > 0) {
          window.history.back();
        }
      });
    }
  } catch (error) {
    console.warn('Capacitor initialization error:', error);
  }
};

// ============================================
// 3. NETWORK STATUS HANDLING
// ============================================

export const setupNetworkListener = async () => {
  try {
    if (!isCapacitor()) {
      // Fallback to standard online/offline events
      window.addEventListener('online', () => {
        console.log('Network: Online');
        document.body.classList.remove('offline');
      });

      window.addEventListener('offline', () => {
        console.log('Network: Offline');
        document.body.classList.add('offline');
      });
      return;
    }

    const { Network } = window.Capacitor.Plugins;

    Network.addListener('networkStatusChange', (status) => {
      console.log('Network status:', status);
      if (status.connected) {
        document.body.classList.remove('offline');
      } else {
        document.body.classList.add('offline');
      }
    });

    // Check initial status
    const status = await Network.getStatus();
    console.log('Initial network status:', status);
  } catch (error) {
    console.warn('Network listener setup error:', error);
  }
};

// ============================================
// 4. STORAGE POLYFILLS
// ============================================

export const setupStoragePolyfills = () => {
  // For Capacitor, localStorage should work fine
  // But ensure we have fallback to memory storage
  if (typeof localStorage === 'undefined') {
    window.localStorage = {
      data: {},
      getItem(key) {
        return this.data[key] || null;
      },
      setItem(key, value) {
        this.data[key] = String(value);
      },
      removeItem(key) {
        delete this.data[key];
      },
      clear() {
        this.data = {};
      },
      key(index) {
        return Object.keys(this.data)[index] || null;
      },
      get length() {
        return Object.keys(this.data).length;
      },
    };
  }
};

// ============================================
// 5. MEDIA QUERY FIXES
// ============================================

export const setupMediaQueryFixes = () => {
  // Fix viewport height issues on Android
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);

  window.addEventListener('resize', () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  });

  // Fix safe area insets
  if (isAndroid()) {
    const safeAreaTop = getComputedStyle(document.documentElement).getPropertyValue(
      '--safe-area-inset-top'
    ) || '0';
    const safeAreaLeft = getComputedStyle(document.documentElement).getPropertyValue(
      '--safe-area-inset-left'
    ) || '0';
    const safeAreaRight = getComputedStyle(document.documentElement).getPropertyValue(
      '--safe-area-inset-right'
    ) || '0';
    const safeAreaBottom = getComputedStyle(document.documentElement).getPropertyValue(
      '--safe-area-inset-bottom'
    ) || '0';

    console.log('Safe area insets:', {
      top: safeAreaTop,
      left: safeAreaLeft,
      right: safeAreaRight,
      bottom: safeAreaBottom,
    });
  }
};

// ============================================
// 6. CSS VARIABLES FOR RESPONSIVE DESIGN
// ============================================

export const setupCSSVariables = () => {
  const root = document.documentElement;

  // Device information
  root.style.setProperty('--device-width', `${window.innerWidth}px`);
  root.style.setProperty('--device-height', `${window.innerHeight}px`);

  // Platform-specific styles
  if (isAndroid()) {
    root.classList.add('android-platform');
  } else if (isCapacitor()) {
    root.classList.add('ios-platform');
  } else {
    root.classList.add('web-platform');
  }

  // Update on resize
  window.addEventListener('resize', () => {
    root.style.setProperty('--device-width', `${window.innerWidth}px`);
    root.style.setProperty('--device-height', `${window.innerHeight}px`);
  });
};

// ============================================
// 7. AUDIO/VIDEO FIXES
// ============================================

export const setupMediaFixes = () => {
  // Fix for autoplay on Android
  const audioElements = document.querySelectorAll('audio');
  const videoElements = document.querySelectorAll('video');

  audioElements.forEach((audio) => {
    if (isAndroid()) {
      audio.muted = true; // Android requires muted attribute for autoplay
    }
  });

  videoElements.forEach((video) => {
    if (isAndroid()) {
      video.muted = true; // Android requires muted attribute for autoplay
      video.playsInline = true; // Prevent fullscreen on Android
    }
  });
};

// ============================================
// 8. MAIN INITIALIZATION FUNCTION
// ============================================

export const setupCapacitorPolyfills = async () => {
  console.log('Setting up Capacitor polyfills...');

  setupStoragePolyfills();
  setupMediaQueryFixes();
  setupCSSVariables();
  setupMediaFixes();

  await initializeCapacitor();
  await setupNetworkListener();

  console.log('Capacitor polyfills setup complete');
  console.log(`Platform: ${isAndroid() ? 'Android' : isCapacitor() ? 'iOS' : 'Web'}`);
};

export default setupCapacitorPolyfills;
