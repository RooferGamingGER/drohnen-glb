
import React, { useEffect, useState } from 'react';
import { Move, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface TouchControlsPanelProps {
  activeMode: 'none' | 'pan' | 'rotate' | 'zoom';
  onModeChange: (mode: 'none' | 'pan' | 'rotate' | 'zoom') => void;
}

const TouchControlsPanel: React.FC<TouchControlsPanelProps> = ({ 
  activeMode, 
  onModeChange 
}) => {
  const { isTouchDevice } = useIsMobile();
  const [hasInitiallySet, setHasInitiallySet] = useState(false);
  
  console.log("TouchControlsPanel rendered with activeMode:", activeMode, "isTouchDevice:", isTouchDevice);

  useEffect(() => {
    // For touch devices, default to rotate mode initially if no mode is set
    if (isTouchDevice && !hasInitiallySet && activeMode === 'none') {
      console.log("Setting default rotate mode for touch device");
      onModeChange('rotate');
      setHasInitiallySet(true);
    }
  }, [activeMode, isTouchDevice, hasInitiallySet, onModeChange]);

  const handleButtonClick = (mode: 'none' | 'pan' | 'rotate' | 'zoom') => {
    console.log(`Button clicked: ${mode}`);
    
    // If clicking the same button again (except zoom), turn it off
    if (mode === activeMode && mode !== 'zoom') {
      console.log("Setting mode to none");
      onModeChange('none');
    } else {
      console.log(`Setting mode to ${mode}`);
      onModeChange(mode);
    }
  };

  // Only show controls for touch devices
  if (!isTouchDevice) {
    return null;
  }

  return (
    <div className="touch-controls-panel fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white/80 dark:bg-black/80 rounded-full px-4 py-2 flex gap-4 shadow-lg z-50 backdrop-blur">
      <button
        type="button"
        className={`touch-control-button p-2 rounded-full ${activeMode === 'pan' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
        onClick={() => handleButtonClick('pan')}
        aria-label="Verschieben"
      >
        <Move size={24} />
      </button>
      
      <button
        type="button"
        className={`touch-control-button p-2 rounded-full ${activeMode === 'rotate' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
        onClick={() => handleButtonClick('rotate')}
        aria-label="Drehen"
      >
        <RotateCw size={24} />
      </button>
      
      <button
        type="button"
        className="touch-control-button p-2 rounded-full bg-muted"
        onClick={() => handleButtonClick('zoom')}
        aria-label="Heranzoomen"
      >
        <ZoomIn size={24} />
      </button>
      
      <button
        type="button"
        className="touch-control-button p-2 rounded-full bg-muted"
        onClick={() => onModeChange('zoom')}
        aria-label="Herauszoomen"
      >
        <ZoomOut size={24} />
      </button>
    </div>
  );
};

export default TouchControlsPanel;
