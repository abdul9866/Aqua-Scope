import { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share2, PlusSquare, Check } from 'lucide-react';

export default function PwaInstallPrompt({ deferredPrompt, onInstallSuccess }) {
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS] = useState(() => {
    return (
      typeof window !== 'undefined' &&
      /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
    );
  });
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isStandalone] = useState(() => {
    return (
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true)
    );
  });

  useEffect(() => {
    // Check if user previously dismissed banner in this session
    const dismissed = sessionStorage.getItem('aquascope_pwa_dismissed');

    if (!isStandalone && !dismissed) {
      // Show install prompt banner after brief delay
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowBanner(false);
        if (onInstallSuccess) onInstallSuccess();
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // Generic browser install instructions
      alert('To install Aqua Scope on this browser: click the install icon (⬇) in your address bar or browser menu.');
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('aquascope_pwa_dismissed', 'true');
  };

  if (isStandalone || !showBanner) return null;

  return (
    <>
      <aside className="pwa-mobile-banner" aria-label="Mobile app installation prompt">
        <div className="pwa-banner-content">
          <div className="pwa-app-icon-wrap">
            <Smartphone size={22} className="pwa-phone-icon" />
          </div>
          <div className="pwa-banner-text">
            <strong>Install Aqua Scope Mobile App</strong>
            <small>Add to your phone for full-screen view &amp; offline underwater AI diagnostics.</small>
          </div>
        </div>

        <div className="pwa-banner-actions">
          <button type="button" className="pwa-install-action-btn" onClick={handleInstallClick}>
            <Download size={15} />
            <span>Install App</span>
          </button>
          <button
            type="button"
            className="pwa-dismiss-btn"
            onClick={handleDismiss}
            aria-label="Dismiss install banner"
          >
            <X size={17} />
          </button>
        </div>
      </aside>

      {/* iOS Safari Installation Guide Modal */}
      {showIOSGuide && (
        <div className="ios-guide-backdrop" onClick={() => setShowIOSGuide(false)} role="dialog">
          <div className="ios-guide-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="ios-guide-header">
              <Smartphone size={24} />
              <h3>Install on Apple iOS</h3>
              <button className="ios-close-btn" onClick={() => setShowIOSGuide(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="ios-guide-intro">
              Install Aqua Scope onto your iPhone / iPad home screen in 2 easy steps:
            </p>
            <div className="ios-step-list">
              <div className="ios-step">
                <span className="step-num">1</span>
                <div className="step-text">
                  <span>Tap the <strong>Share</strong> button in the Safari toolbar</span>
                  <Share2 size={18} className="step-icon" />
                </div>
              </div>
              <div className="ios-step">
                <span className="step-num">2</span>
                <div className="step-text">
                  <span>Scroll down and tap <strong>Add to Home Screen</strong></span>
                  <PlusSquare size={18} className="step-icon" />
                </div>
              </div>
            </div>
            <button className="ios-done-btn" onClick={() => setShowIOSGuide(false)}>
              <Check size={16} /> Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
