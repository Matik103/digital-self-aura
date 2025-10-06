import { useEffect, useState } from "react";

const ScraperProtection = ({ children }: { children: React.ReactNode }) => {
  const [isBot, setIsBot] = useState(false);

  useEffect(() => {
    // Check 1: Basic User Agent Detection (only obvious bots)
    const checkUserAgent = () => {
      const botPatterns = [
        /scrapy/i, /python-requests/i, /curl/i, /wget/i,
        /mechanize/i, /beautifulsoup/i, /libwww/i
      ];
      
      const ua = navigator.userAgent;
      return botPatterns.some(pattern => pattern.test(ua));
    };

    // Check 2: Headless Browser Detection (strict)
    const checkHeadless = () => {
      return !!(
        navigator.webdriver ||
        (window as any).__nightmare ||
        (window as any)._phantom ||
        (window as any).callPhantom
      );
    };

    // Run bot detection (less aggressive)
    const runBotDetection = () => {
      const checks = [
        checkUserAgent(),
        checkHeadless()
      ];

      // Only block if clear bot indicators
      if (checks.some(Boolean)) {
        setIsBot(true);
        console.error('Bot detected - Access denied');
        document.body.innerHTML = '<h1>403 Forbidden</h1>';
      }
    };

    runBotDetection();
  }, []);

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
