
import { forwardRef, ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ViewerContainerProps {
  children: ReactNode;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
}

const ViewerContainer = forwardRef<HTMLDivElement, ViewerContainerProps>(
  ({ children, onDragOver, onDrop }, ref) => {
    const { isPortrait, isTouchDevice } = useIsMobile();
    
    return (
      <div 
        ref={ref}
        className={`relative h-full w-full ${isTouchDevice ? 'touch-manipulation' : ''}`}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {children}
      </div>
    );
  }
);

ViewerContainer.displayName = 'ViewerContainer';

export default ViewerContainer;
