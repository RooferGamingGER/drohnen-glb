
import { forwardRef, ReactNode, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ViewerContainerProps {
  children: ReactNode;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
}

const ViewerContainer = forwardRef<HTMLDivElement, ViewerContainerProps>(
  ({ children, onDragOver, onDrop }, ref) => {
    const { isPortrait, isTouchDevice } = useIsMobile();
    
    // Prevent default touch behavior on the container
    useEffect(() => {
      const container = ref as React.RefObject<HTMLDivElement>;
      if (!container.current || !isTouchDevice) return;
      
      const preventDefaultTouch = (e: TouchEvent) => {
        // Don't prevent default on input elements to allow file selection
        if ((e.target as HTMLElement).tagName !== 'INPUT') {
          e.preventDefault();
        }
      };
      
      const containerEl = container.current;
      containerEl.addEventListener('touchstart', preventDefaultTouch, { passive: false });
      containerEl.addEventListener('touchmove', preventDefaultTouch, { passive: false });
      containerEl.addEventListener('touchend', preventDefaultTouch, { passive: false });
      
      return () => {
        containerEl.removeEventListener('touchstart', preventDefaultTouch);
        containerEl.removeEventListener('touchmove', preventDefaultTouch);
        containerEl.removeEventListener('touchend', preventDefaultTouch);
      };
    }, [ref, isTouchDevice]);
    
    return (
      <div 
        ref={ref}
        className={`relative h-full w-full ${isTouchDevice ? 'touch-none' : ''}`}
        onDragOver={onDragOver}
        onDrop={onDrop}
        style={{ touchAction: 'none' }}
      >
        {children}
      </div>
    );
  }
);

ViewerContainer.displayName = 'ViewerContainer';

export default ViewerContainer;
