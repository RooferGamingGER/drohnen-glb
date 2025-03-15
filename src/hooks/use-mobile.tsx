
import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined)
  const [isPortrait, setIsPortrait] = React.useState<boolean | undefined>(undefined)
  const [isTouchDevice, setIsTouchDevice] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Check if device has touch capabilities
    const checkTouch = () => {
      const hasTouchSupport = (
        'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        (navigator.msMaxTouchPoints !== undefined && navigator.msMaxTouchPoints > 0)
      )
      return hasTouchSupport
    }

    const mobileMql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const tabletMql = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT - 1}px)`)
    
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth)
    }
    
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
      setIsTablet(window.innerWidth < TABLET_BREAKPOINT && window.innerWidth >= MOBILE_BREAKPOINT)
      setIsTouchDevice(checkTouch())
      checkOrientation()
    }
    
    mobileMql.addEventListener("change", onChange)
    tabletMql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    setIsTablet(window.innerWidth < TABLET_BREAKPOINT && window.innerWidth >= MOBILE_BREAKPOINT)
    setIsTouchDevice(checkTouch())
    checkOrientation()
    
    window.addEventListener("resize", checkOrientation)
    window.addEventListener("orientationchange", checkOrientation)
    
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
    isTouchDevice: !!isTouchDevice,
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
