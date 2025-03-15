import { useRef, useEffect, useState, useCallback } from 'react';
import { useIsMobile } from './use-mobile';
import { useHammerTouch } from './useHammerTouch';
import * as THREE from 'three';

interface UseTouchProps {
  containerRef: React.RefObject<HTMLDivElement>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  controlsRef: React.MutableRefObject<any>;
  onTouchPoint?: (point: THREE.Vector3) => void;
  activeTool: string;
  modelRef: React.MutableRefObject<THREE.Group | null>;
}

export const useTouch = ({
  containerRef,
  cameraRef,
  controlsRef,
  onTouchPoint,
  activeTool,
  modelRef
}: UseTouchProps) => {
  const { isTouchDevice, hasMouseAttached } = useIsMobile();
  const [isInTouchMode, setIsInTouchMode] = useState<boolean>(false);
  
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const isDraggingRef = useRef<boolean>(false);
  const selectedPointRef = useRef<{id: string, index: number} | null>(null);
  const tapCooldownRef = useRef<boolean>(false);
  
  useEffect(() => {
    setIsInTouchMode(isTouchDevice && !hasMouseAttached);
    console.log(`Touch mode in useTouch: ${isTouchDevice && !hasMouseAttached ? 'ENABLED' : 'DISABLED'}`);
  }, [isTouchDevice, hasMouseAttached]);
  
  const hammerControls = useHammerTouch({
    containerRef,
    cameraRef,
    controlsRef,
    modelRef,
    onTap: (point) => {
      if (tapCooldownRef.current) return;
      
      tapCooldownRef.current = true;
      setTimeout(() => {
        tapCooldownRef.current = false;
      }, 500);
      
      if (activeTool !== 'none' && onTouchPoint) {
        console.log("Touch tap registriert mit activeTool:", activeTool);
        onTouchPoint(point);
      }
    }
  });
  
  const handleMouseClick = useCallback((event: MouseEvent) => {
    if (!modelRef.current || !cameraRef.current || !containerRef.current) return;
    if (isInTouchMode) return;
    
    if (event.button === 2) {
      event.preventDefault();
      if (controlsRef.current) {
        controlsRef.current.enablePan = true;
      }
      return;
    }
    
    if (event.button === 0 && activeTool !== 'none' && onTouchPoint) {
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObject(modelRef.current, true);
      
      if (intersects.length > 0) {
        onTouchPoint(intersects[0].point);
      }
    }
  }, [modelRef, cameraRef, containerRef, controlsRef, activeTool, onTouchPoint, isInTouchMode]);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    if (!isInTouchMode) {
      console.log("Maussteuerung aktiviert");
      
      const handleMouseDown = (event: MouseEvent) => {
        handleMouseClick(event);
      };
      
      const handleMouseUp = (event: MouseEvent) => {
        if (event.button === 2 && controlsRef.current) {
          controlsRef.current.enablePan = false;
        }
      };
      
      const handleContextMenu = (event: MouseEvent) => {
        event.preventDefault();
      };
      
      containerRef.current.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mouseup', handleMouseUp);
      containerRef.current.addEventListener('contextmenu', handleContextMenu);
      
      if (controlsRef.current) {
        controlsRef.current.enableRotate = true;
        controlsRef.current.enablePan = false;
        controlsRef.current.enableZoom = true;
        controlsRef.current.update();
      }
      
      return () => {
        containerRef.current?.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mouseup', handleMouseUp);
        containerRef.current?.removeEventListener('contextmenu', handleContextMenu);
      };
    } else {
      console.log("Touch-Steuerung aktiviert");
      
      if (controlsRef.current) {
        controlsRef.current.enableRotate = false;
        controlsRef.current.enablePan = false;
        controlsRef.current.enableZoom = false;
        controlsRef.current.update();
      }
    }
  }, [
    containerRef.current, 
    cameraRef.current, 
    controlsRef.current, 
    modelRef.current, 
    activeTool, 
    isInTouchMode, 
    handleMouseClick
  ]);
  
  return {
    isTouchDevice,
    isTouchControlsActive: hammerControls.isTouchControlsActive,
    isInTouchMode,
    lastGestureType: hammerControls.lastGestureType
  };
};
