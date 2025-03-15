
import React from 'react';
import { Move, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

export type TouchControlMode = 'none' | 'pan' | 'rotate' | 'zoom';

interface TouchControlsPanelProps {
  activeMode: TouchControlMode;
  onModeChange: (mode: TouchControlMode) => void;
  isTouchDevice: boolean;
  isMobile?: boolean;
  isPortrait?: boolean;
}

const TouchControlsPanel: React.FC<TouchControlsPanelProps> = ({ 
  activeMode, 
  onModeChange,
  isTouchDevice,
  isMobile,
  isPortrait
}) => {
  if (!isTouchDevice) {
    return null;
  }

  const handleButtonClick = (mode: TouchControlMode) => {
    // If clicking the same button again (except zoom), turn it off
    if (mode === activeMode && mode !== 'zoom') {
      onModeChange('none');
    } else {
      onModeChange(mode);
    }
  };

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
