
import React, { useEffect, useState, useCallback } from 'react';
import { useIsMobile } from '../hooks/use-mobile';
import { TouchpadIcon, StretchHorizontal, MousePointerClick, Maximize, Hand, Move, RotateCcw } from 'lucide-react';

// Diese Komponente zeigt eine visuelle Hilfe für Touch-Gesten an
const TouchControlsPanel: React.FC<{ lastGestureType?: string }> = ({ lastGestureType = 'none' }) => {
  const { isTouchDevice, hasMouseAttached } = useIsMobile();
  const [showHelp, setShowHelp] = useState(true);
  const [gestureHighlight, setGestureHighlight] = useState<string | null>(null);
  const [isInTouchMode, setIsInTouchMode] = useState(false);
  
  // Touch-Modus basierend auf Geräteerkennung aktualisieren
  useEffect(() => {
    setIsInTouchMode(isTouchDevice && !hasMouseAttached);
  }, [isTouchDevice, hasMouseAttached]);
  
  // Hilfsdialog nach einigen Sekunden automatisch ausblenden
  useEffect(() => {
    if (isInTouchMode && showHelp) {
      const timer = setTimeout(() => {
        setShowHelp(false);
      }, 10000); // 10 Sekunden anzeigen
      
      return () => clearTimeout(timer);
    }
  }, [isInTouchMode, showHelp]);
  
  // Bei Gestenwechsel die entsprechende Geste hervorheben
  useEffect(() => {
    if (!lastGestureType || lastGestureType === 'none') return;
    
    let gestureToHighlight = '';
    
    if (lastGestureType.includes('pan')) {
      gestureToHighlight = 'pan';
    } else if (lastGestureType.includes('pinch')) {
      gestureToHighlight = 'pinch';
    } else if (lastGestureType.includes('rotate')) {
      gestureToHighlight = 'rotate';
    } else if (lastGestureType.includes('tap')) {
      gestureToHighlight = 'tap';
    } else if (lastGestureType.includes('double')) {
      gestureToHighlight = 'doubletap';
    }
    
    if (gestureToHighlight) {
      setGestureHighlight(gestureToHighlight);
      
      // Nach 1,5 Sekunden die Hervorhebung zurücksetzen
      const timer = setTimeout(() => {
        setGestureHighlight(null);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [lastGestureType]);
  
  // Für nicht-Touch-Geräte nichts rendern
  if (!isInTouchMode) {
    return null;
  }
  
  // Wenn die Hilfe ausgeblendet ist, nur einen Button anzeigen
  if (!showHelp) {
    return (
      <button 
        className="fixed bottom-4 right-4 bg-primary text-primary-foreground rounded-full p-3 shadow-lg z-50 touch-manipulation"
        onClick={() => setShowHelp(true)}
        aria-label="Touch-Steuerung Hilfe anzeigen"
      >
        <TouchpadIcon size={24} />
      </button>
    );
  }
  
  // Hilfsklasse für die Hervorhebung einer aktiven Geste
  const getHighlightClass = (gesture: string) => {
    return gestureHighlight === gesture 
      ? 'bg-primary text-primary-foreground scale-110 transition-all duration-300'
      : 'bg-muted';
  };
  
  return (
    <div className="touch-controls-help fixed bottom-0 left-0 right-0 bg-background/90 dark:bg-background/95 backdrop-blur-sm p-4 z-50 animate-in slide-in-from-bottom duration-300 touch-manipulation">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium text-lg">Touch-Steuerung</h3>
        <button 
          className="text-muted-foreground hover:text-foreground px-3 py-1 rounded-md"
          onClick={() => setShowHelp(false)}
          aria-label="Hilfe schließen"
        >
          Schließen
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="flex flex-col items-center">
          <div className={`rounded-full p-3 mb-2 transition-all ${getHighlightClass('pan')}`}>
            <StretchHorizontal size={28} />
          </div>
          <span className="text-sm text-center">Ein Finger: Drehen</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className={`rounded-full p-3 mb-2 transition-all ${getHighlightClass('pinch')}`}>
            <Maximize size={28} />
          </div>
          <span className="text-sm text-center">Zwei Finger: Zoom</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className={`rounded-full p-3 mb-2 transition-all ${getHighlightClass('rotate')}`}>
            <RotateCcw size={28} />
          </div>
          <span className="text-sm text-center">Rotation: Zwei Finger drehen</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className={`rounded-full p-3 mb-2 transition-all ${getHighlightClass('pan')}`}>
            <Move size={28} />
          </div>
          <span className="text-sm text-center">Zwei Finger bewegen: Verschieben</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className={`rounded-full p-3 mb-2 transition-all ${getHighlightClass('tap')}`}>
            <MousePointerClick size={28} />
          </div>
          <span className="text-sm text-center">Tippen: Punkt setzen</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className={`rounded-full p-3 mb-2 transition-all ${getHighlightClass('doubletap')}`}>
            <Hand size={28} />
          </div>
          <span className="text-sm text-center">Doppeltippen: Ansicht zurücksetzen</span>
        </div>
      </div>
      
      <div className="mt-3 text-xs text-center text-muted-foreground">
        Um die bestmögliche Kontrolle zu gewährleisten, verwenden Sie zwischen Taps ca. 0,5 Sekunden Pause.
      </div>
    </div>
  );
};

export default TouchControlsPanel;
