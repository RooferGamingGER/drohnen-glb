
import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined)
  const [isPortrait, setIsPortrait] = React.useState<boolean | undefined>(undefined)
  const [isTouchDevice, setIsTouchDevice] = React.useState<boolean>(false)
  const [hasMouseAttached, setHasMouseAttached] = React.useState<boolean>(false)

  React.useEffect(() => {
    const mobileMql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const tabletMql = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT - 1}px)`)
    
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth)
    }
    
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
      setIsTablet(window.innerWidth < TABLET_BREAKPOINT && window.innerWidth >= MOBILE_BREAKPOINT)
      checkOrientation()
    }

    // Verbesserte Touch-Erkennung mit mehreren Methoden
    const checkTouchSupport = () => {
      const hasTouchPoints = navigator.maxTouchPoints > 0 || (navigator as any).msMaxTouchPoints > 0;
      const hasTouch = 'ontouchstart' in window;
      const hasPointerEvents = !!window.PointerEvent && navigator.maxTouchPoints > 0;
      
      // Kombinierte Detection-Strategie
      setIsTouchDevice(hasTouchPoints || hasTouch || hasPointerEvents);
      
      // Überprüfung auf angeschlossene Maus
      checkForMouse();
    }
    
    // Überprüfung auf angeschlossene Maus
    const checkForMouse = () => {
      // Erste Prüfung: hat Media Query für Hover
      const hasHoverCapability = window.matchMedia('(hover: hover)').matches;
      
      // Zweite Prüfung: Auf Mausbewegung warten
      let mouseDetected = false;
      
      const mouseListener = () => {
        mouseDetected = true;
        setHasMouseAttached(true);
        document.removeEventListener('mousemove', mouseListener);
      };
      
      document.addEventListener('mousemove', mouseListener);
      
      // Timeout, falls keine Mausbewegung erkannt wird
      setTimeout(() => {
        if (!mouseDetected) {
          setHasMouseAttached(false);
        }
        document.removeEventListener('mousemove', mouseListener);
      }, 1000);
      
      // Setze den initialen Wert auf Basis des hover-Queries
      setHasMouseAttached(hasHoverCapability);
    }
    
    mobileMql.addEventListener("change", onChange)
    tabletMql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    setIsTablet(window.innerWidth < TABLET_BREAKPOINT && window.innerWidth >= MOBILE_BREAKPOINT)
    checkOrientation()
    checkTouchSupport()
    
    window.addEventListener("resize", checkOrientation)
    window.addEventListener("orientationchange", checkOrientation)
    
    // Erneute Überprüfung bei Geräteänderungen
    window.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse") {
        setHasMouseAttached(true);
      } else if (e.pointerType === "touch") {
        setIsTouchDevice(true);
      }
    }, { once: true });
    
    return () => {
      mobileMql.removeEventListener("change", onChange)
      tabletMql.removeEventListener("change", onChange)
      window.removeEventListener("resize", checkOrientation)
      window.removeEventListener("orientationchange", checkOrientation)
    }
  }, [])

  // Return both the object with properties and a boolean for backward compatibility
  return {
    isMobile: !!isMobile,
    isTablet: !!isTablet,
    isPortrait: !!isPortrait,
    isTouchDevice,
    hasMouseAttached,
    // For backward compatibility with code expecting a boolean directly
    [Symbol.toPrimitive](hint: string) {
      return hint === 'boolean' ? !!isMobile : undefined;
    }
  }
}

// Add a convenience hook for when only the boolean is needed
export function useIsMobileBoolean(): boolean {
  const mobileState = useIsMobile();
  return mobileState.isMobile;
}
