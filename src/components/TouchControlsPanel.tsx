
import React, { useEffect, useState } from 'react';
import { useIsMobile } from '../hooks/use-mobile';
import { TouchIcon, GestureHorizontal, GestureTap, Rotate3d, Resize } from 'lucide-react';

// This component now serves as a visual guide rather than actual controls
const TouchControlsPanel: React.FC = () => {
  const { isTouchDevice } = useIsMobile();
  const [showHelp, setShowHelp] = useState(true);
  
  // Auto-hide help after a few seconds
  useEffect(() => {
    if (isTouchDevice && showHelp) {
      const timer = setTimeout(() => {
        setShowHelp(false);
      }, 8000); // Hide after 8 seconds
      
      return () => clearTimeout(timer);
    }
  }, [isTouchDevice, showHelp]);
  
  // Don't render for non-touch devices
  if (!isTouchDevice) {
    return null;
  }
  
  if (!showHelp) {
    return (
      <button 
        className="fixed bottom-4 right-4 bg-primary text-primary-foreground rounded-full p-2 shadow-lg z-50"
        onClick={() => setShowHelp(true)}
        aria-label="Show touch controls help"
      >
        <TouchIcon size={24} />
      </button>
    );
  }
  
  return (
    <div className="touch-controls-help fixed bottom-0 left-0 right-0 bg-background/80 dark:bg-background/90 backdrop-blur-sm p-4 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium">Touch Gestures</h3>
        <button 
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setShowHelp(false)}
          aria-label="Close help"
        >
          Schließen
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex flex-col items-center">
          <div className="bg-muted rounded-full p-3 mb-2">
            <GestureHorizontal size={24} />
          </div>
          <span className="text-sm text-center">Ein Finger: Drehen</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="bg-muted rounded-full p-3 mb-2">
            <Resize size={24} />
          </div>
          <span className="text-sm text-center">Zwei Finger: Zoom</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="bg-muted rounded-full p-3 mb-2">
            <Rotate3d size={24} />
          </div>
          <span className="text-sm text-center">Zwei Finger bewegen: Verschieben</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="bg-muted rounded-full p-3 mb-2">
            <GestureTap size={24} />
          </div>
          <span className="text-sm text-center">Doppeltipp: Ansicht zurücksetzen</span>
        </div>
      </div>
    </div>
  );
};

export default TouchControlsPanel;
