import { useEffect, useState } from "react";

const ScraperProtection = ({ children }: { children: React.ReactNode }) => {
  const [isBot, setIsBot] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    // Check 1: User Agent Detection
    const checkUserAgent = () => {
      const botPatterns = [
        /bot/i, /crawl/i, /spider/i, /scrape/i,
        /python/i, /curl/i, /wget/i, /libwww/i,
        /scrapy/i, /requests/i, /mechanize/i,
        /beautifulsoup/i, /selenium/i, /puppeteer/i,
        /playwright/i, /headless/i, /phantom/i
      ];
      
      const ua = navigator.userAgent;
      return botPatterns.some(pattern => pattern.test(ua));
    };

    // Check 2: Headless Browser Detection
    const checkHeadless = () => {
      // Check for common headless browser indicators
      const checks = [
        !navigator.webdriver ? 0 : 1,
        !(window as any).chrome ? 1 : 0,
        (window as any).callPhantom || (window as any)._phantom ? 1 : 0,
        (window as any).__nightmare ? 1 : 0,
        (document as any).__selenium_unwrapped || (document as any).__webdriver_evaluate || (document as any).__driver_evaluate ? 1 : 0
      ];
      
      return checks.reduce((a, b) => a + b, 0) >= 2;
    };

    // Check 3: Canvas Fingerprinting
    const checkCanvas = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return true;
        
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(0, 0, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('ScraperCheck', 2, 2);
        
        const dataURL = canvas.toDataURL();
        // Bots often return the same canvas fingerprint
        return dataURL === 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      } catch {
        return true;
      }
    };

    // Check 4: WebGL Detection
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !gl;
      } catch {
        return true;
      }
    };

    // Check 5: Plugin Detection
    const checkPlugins = () => {
      // Headless browsers typically have no plugins
      return navigator.plugins.length === 0;
    };

    // Check 6: Language Detection
    const checkLanguages = () => {
      // Bots often don't have languages set properly
      return navigator.languages.length === 0 || !navigator.language;
    };

    // Check 7: Chrome-specific checks
    const checkChrome = () => {
      const win = window as any;
      if (win.chrome && !win.chrome.runtime) {
        return true; // Chrome without runtime is suspicious
      }
      return false;
    };

    // Check 8: Permissions API
    const checkPermissions = async () => {
      try {
        await (navigator as any).permissions.query({ name: 'notifications' });
        return false;
      } catch {
        return true; // Bots often don't support Permissions API
      }
    };

    // Run all checks
    const runBotDetection = async () => {
      const checks = [
        checkUserAgent(),
        checkHeadless(),
        checkCanvas(),
        checkWebGL(),
        checkPlugins(),
        checkLanguages(),
        checkChrome(),
        await checkPermissions()
      ];

      const botScore = checks.filter(Boolean).length;
      
      // If 3 or more checks indicate bot behavior, block
      if (botScore >= 3) {
        setIsBot(true);
        
        // Log bot detection (for analytics)
        console.error('Bot detected - Access denied');
        
        // Clear page content
        document.body.innerHTML = '';
        
        // Return 404-like response
        window.history.replaceState(null, '', '/404');
      }
    };

    runBotDetection();

    // Check 9: Mouse Movement Detection
    let mouseMoveCount = 0;
    const handleMouseMove = () => {
      mouseMoveCount++;
      if (mouseMoveCount > 5) {
        setHasInteracted(true);
      }
    };

    // Check 10: Keyboard Detection
    const handleKeyPress = () => {
      setHasInteracted(true);
    };

    // Check 11: Touch Detection
    const handleTouch = () => {
      setHasInteracted(true);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keypress', handleKeyPress);
    window.addEventListener('touchstart', handleTouch);

    // Check 12: Timeout for interaction
    const interactionTimeout = setTimeout(() => {
      if (!hasInteracted && !isBot) {
        // No interaction detected in 10 seconds - possible bot
        const botProbability = Math.random();
        if (botProbability > 0.3) { // 70% chance to block if no interaction
          setIsBot(true);
          document.body.innerHTML = '';
          window.history.replaceState(null, '', '/error');
        }
      }
    }, 10000);

    // Check 13: DevTools Detection
    const checkDevTools = () => {
      const threshold = 160;
      if (
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold
      ) {
        // DevTools might be open - common in scraping
        return true;
      }
      return false;
    };

    const devToolsInterval = setInterval(() => {
      if (checkDevTools()) {
        // Could be a scraper with DevTools
        console.warn('Suspicious activity detected');
      }
    }, 1000);

    // Check 14: Timing Analysis (bots are often faster)
    const startTime = performance.now();
    const timingCheck = setTimeout(() => {
      const loadTime = performance.now() - startTime;
      if (loadTime < 50) {
        // Page loaded suspiciously fast
        setIsBot(true);
      }
    }, 100);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keypress', handleKeyPress);
      window.removeEventListener('touchstart', handleTouch);
      clearTimeout(interactionTimeout);
      clearInterval(devToolsInterval);
      clearTimeout(timingCheck);
    };
  }, [hasInteracted, isBot]);

  // If bot detected, show nothing
  if (isBot) {
    return null;
  }

  // Create honeypot (invisible element that bots might interact with)
  return (
    <>
      <div 
        style={{ 
          position: 'absolute', 
          left: '-9999px', 
          width: '1px', 
          height: '1px',
          opacity: 0,
          pointerEvents: 'none'
        }}
        aria-hidden="true"
        className="honeypot-trap"
      >
        {/* Honeypot link - if clicked, it's likely a bot */}
        <a href="/admin" onClick={(e) => {
          e.preventDefault();
          setIsBot(true);
          document.body.innerHTML = '';
        }}>Admin</a>
      </div>
      {children}
    </>
  );
};

export default ScraperProtection;
