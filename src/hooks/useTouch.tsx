
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
  
  // Update touch mode when device capabilities change
  useEffect(() => {
    const newTouchMode = isTouchDevice;
    setIsInTouchMode(newTouchMode);
    console.log(`Touch mode in useTouch: ${newTouchMode ? 'ENABLED' : 'DISABLED'}, isTouchDevice: ${isTouchDevice}, hasMouseAttached: ${hasMouseAttached}`);
  }, [isTouchDevice, hasMouseAttached]);
  
  // Initialize Hammer.js for touch controls
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
      }, 300); // Reduced cooldown for more responsive interaction
      
      if (activeTool !== 'none' && onTouchPoint) {
        console.log("Touch tap registered with activeTool:", activeTool);
        onTouchPoint(point);
      }
    }
  });
  
  // Handle mouse clicks when not in touch mode
  const handleMouseClick = useCallback((event: MouseEvent) => {
    if (!modelRef.current || !cameraRef.current || !containerRef.current) return;
    if (isInTouchMode) return; // Skip in touch mode, let Hammer.js handle it
    
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
  
  // Set up mouse or touch controls based on device type
  useEffect(() => {
    if (!containerRef.current) return;
    
    if (!isInTouchMode) {
      console.log("Mouse controls activated");
      
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
      console.log("Touch controls activated");
      
      // In touch mode, we'll let Hammer.js take over the controls
      if (controlsRef.current) {
        // OrbitControls should not compete with Hammer.js
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
