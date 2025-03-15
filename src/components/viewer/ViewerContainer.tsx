
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
    
    // Setze den Touch-Modus basierend auf der Geräteerkennung
    useEffect(() => {
      setTouchMode(isTouchDevice && !hasMouseAttached);
    }, [isTouchDevice, hasMouseAttached]);
    
    // Prevent default touch behavior on the container but allow necessary interactions
    useEffect(() => {
      const container = ref as React.RefObject<HTMLDivElement>;
      if (!container.current || !touchMode) return;
      
      // Verbesserte Touch-Event-Behandlung
      const preventDefaultTouch = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        
        // Erlaube Touch-Events auf bestimmten Elementen
        const allowTouchOn = [
          'INPUT',
          'BUTTON',
          'A',
          'LABEL',
          'SELECT'
        ];
        
        // Erlaube Touch-Events auf Elementen mit bestimmten Klassen
        const allowedClasses = [
          'clickable',
          'touch-allow',
          'file-upload'
        ];
        
        // Prüfe, ob das Element erlaubt ist
        const isAllowedElement = allowTouchOn.includes(target.tagName);
        const hasAllowedClass = allowedClasses.some(className => 
          target.classList.contains(className) || 
          target.closest(`.${className}`) !== null
        );
        
        // Nur verhindern, wenn nicht auf erlaubten Elementen
        if (!isAllowedElement && !hasAllowedClass) {
          e.preventDefault();
        }
      };
      
      const containerEl = container.current;
      
      // Passive: false ist wichtig, damit preventDefault funktioniert
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
        className={`relative h-full w-full ${touchMode ? 'touch-none' : ''}`}
        onDragOver={onDragOver}
        onDrop={onDrop}
        style={{ touchAction: touchMode ? 'none' : 'auto' }}
        data-touch-mode={touchMode ? 'true' : 'false'}
      >
        {children}
      </div>
    );
  }
);

ViewerContainer.displayName = 'ViewerContainer';

export default ViewerContainer;
