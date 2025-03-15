
import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined)
  const [isPortrait, setIsPortrait] = React.useState<boolean | undefined>(undefined)
  const [isTouchDevice, setIsTouchDevice] = React.useState<boolean>(false)
  const [hasMouseAttached, setHasMouseAttached] = React.useState<boolean>(false)
  const touchEventRef = React.useRef<boolean>(false)

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

    // Simplified touch detection strategy
    const checkTouchSupport = () => {
      // Primary detection method: check both standard properties
      const hasTouchPoints = navigator.maxTouchPoints > 0 || (navigator as any).msMaxTouchPoints > 0;
      const hasTouch = 'ontouchstart' in window;
      
      // Most reliable detection for modern browsers
      const isTouch = hasTouchPoints || hasTouch;
      console.log(`Touch detection: maxTouchPoints=${navigator.maxTouchPoints}, ontouchstart=${hasTouch ? 'yes' : 'no'}`);
      
      setIsTouchDevice(isTouch);
      
      // Mouse detection happens in parallel rather than influencing touch detection
      checkForMouse();
    }
    
    // Check for mouse capability separately
    const checkForMouse = () => {
      // Check for hover capability
      const hasHoverCapability = window.matchMedia('(hover: hover)').matches;
      
      // Set initial value based on hover capability
      setHasMouseAttached(hasHoverCapability);
      
      // Add a mouse movement detector
      const mouseListener = () => {
        setHasMouseAttached(true);
        document.removeEventListener('mousemove', mouseListener);
      };
      
      document.addEventListener('mousemove', mouseListener, { once: true });
    }
    
    // Setup event listeners for changes in browser window
    mobileMql.addEventListener("change", onChange)
    tabletMql.addEventListener("change", onChange)
    
    // Initial setup
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    setIsTablet(window.innerWidth < TABLET_BREAKPOINT && window.innerWidth >= MOBILE_BREAKPOINT)
    checkOrientation()
    checkTouchSupport()
    
    // Listen for orientation changes
    window.addEventListener("resize", checkOrientation)
    window.addEventListener("orientationchange", checkOrientation)
    
    // Direct touch and mouse event listeners for runtime detection
    const handleTouchStart = () => {
      touchEventRef.current = true;
      setIsTouchDevice(true);
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      // Only count real mouse events, not simulated ones from touch
      if (!touchEventRef.current) {
        setHasMouseAttached(true);
      }
      // Reset touch flag after each event cycle
      setTimeout(() => {
        touchEventRef.current = false;
      }, 500);
    };
    
    window.addEventListener('touchstart', handleTouchStart, { passive: true, once: false });
    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    
    return () => {
      mobileMql.removeEventListener("change", onChange)
      tabletMql.removeEventListener("change", onChange)
      window.removeEventListener("resize", checkOrientation)
      window.removeEventListener("orientationchange", checkOrientation)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('mousedown', handleMouseDown)
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
