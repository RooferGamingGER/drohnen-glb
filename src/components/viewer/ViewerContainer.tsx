
import { forwardRef, ReactNode, useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ViewerContainerProps {
  children: ReactNode;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
}

const ViewerContainer = forwardRef<HTMLDivElement, ViewerContainerProps>(
  ({ children, onDragOver, onDrop }, ref) => {
    const { isPortrait, isTouchDevice, hasMouseAttached } = useIsMobile();
    const [touchMode, setTouchMode] = useState(false);
    
    // Set touch mode based on device detection
    useEffect(() => {
      setTouchMode(isTouchDevice);
      console.log(`ViewerContainer: Touch mode ${isTouchDevice ? 'enabled' : 'disabled'}`);
    }, [isTouchDevice, hasMouseAttached]);
    
    // Prevent default touch behavior but allow necessary interactions
    useEffect(() => {
      const container = ref as React.RefObject<HTMLDivElement>;
      if (!container.current || !touchMode) return;
      
      // Improved touch event handling with passive: false
      const preventDefaultTouch = (e: TouchEvent) => {
        // Don't prevent all events by default
        const target = e.target as HTMLElement;
        
        // Allow touch events on specific elements
        const allowTouchOn = [
          'INPUT',
          'BUTTON',
          'A',
          'LABEL',
          'SELECT'
        ];
        
        // Allow touch events on elements with specific classes
        const allowedClasses = [
          'clickable',
          'touch-allow',
          'file-upload'
        ];
        
        // Check if element is allowed
        const isAllowedElement = allowTouchOn.includes(target.tagName);
        const hasAllowedClass = allowedClasses.some(className => 
          target.classList.contains(className) || 
          target.closest(`.${className}`) !== null
        );
        
        // Only prevent on 3D viewer area, not controls
        if (!isAllowedElement && !hasAllowedClass) {
          // We need to prevent default to stop browser from scrolling/zooming
          e.preventDefault();
        }
      };
      
      const containerEl = container.current;
      
      // Using passive: false is crucial for preventDefault to work
      containerEl.addEventListener('touchstart', preventDefaultTouch, { passive: false });
      containerEl.addEventListener('touchmove', preventDefaultTouch, { passive: false });
      containerEl.addEventListener('touchend', preventDefaultTouch, { passive: false });
      
      return () => {
        containerEl.removeEventListener('touchstart', preventDefaultTouch);
        containerEl.removeEventListener('touchmove', preventDefaultTouch);
        containerEl.removeEventListener('touchend', preventDefaultTouch);
      };
    }, [ref, touchMode]);
    
    return (
      <div 
        ref={ref}
        className={`relative h-full w-full overflow-hidden ${touchMode ? 'touch-none' : ''}`}
        onDragOver={onDragOver}
        onDrop={onDrop}
        style={{ 
          touchAction: touchMode ? 'none' : 'auto',
          WebkitTapHighlightColor: 'rgba(0,0,0,0)',
          WebkitUserSelect: 'none',
          userSelect: 'none'
        }}
        data-touch-mode={touchMode ? 'true' : 'false'}
      >
        {children}
      </div>
    );
  }
);

ViewerContainer.displayName = 'ViewerContainer';

export default ViewerContainer;
