
import { useRef, useEffect } from 'react';
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
  const { isTouchDevice } = useIsMobile();
  
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const isDraggingRef = useRef<boolean>(false);
  const selectedPointRef = useRef<{id: string, index: number} | null>(null);
  const tapCooldownRef = useRef<boolean>(false);
  
  // Initialize Hammer touch controls for touch devices
  const hammerControls = useHammerTouch({
    containerRef,
    cameraRef,
    controlsRef,
    modelRef,
    onTap: (point) => {
      if (tapCooldownRef.current) return;
      
      // Set cooldown to prevent accidental multiple taps
      tapCooldownRef.current = true;
      setTimeout(() => {
        tapCooldownRef.current = false;
      }, 500);
      
      if (activeTool !== 'none' && onTouchPoint) {
        console.log("Touch tap registered with activeTool:", activeTool);
        onTouchPoint(point);
      }
    }
  });
  
  // Traditional mouse handling for desktop
  useEffect(() => {
    if (!containerRef.current || isTouchDevice) return;
    
    const handleMouseDown = (event: MouseEvent) => {
      if (!modelRef.current || !cameraRef.current) return;
      
      // Right-click handling for panning
      if (event.button === 2) {
        event.preventDefault();
        if (controlsRef.current) {
          controlsRef.current.enablePan = true;
        }
      }
      
      // Left-click handling for model interaction
      if (event.button === 0 && activeTool !== 'none' && onTouchPoint) {
        const rect = containerRef.current!.getBoundingClientRect();
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        const intersects = raycasterRef.current.intersectObject(modelRef.current, true);
        
        if (intersects.length > 0) {
          onTouchPoint(intersects[0].point);
        }
      }
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
    
    return () => {
      containerRef.current?.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      containerRef.current?.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [containerRef.current, cameraRef.current, modelRef.current, activeTool, isTouchDevice, onTouchPoint]);
  
  // Configure orbit controls based on device type
  useEffect(() => {
    if (!controlsRef.current) return;
    
    if (isTouchDevice) {
      // For touch devices, disable default OrbitControls behavior
      // and let Hammer.js handle the interactions
      controlsRef.current.enableRotate = false;
      controlsRef.current.enablePan = false;
      controlsRef.current.enableZoom = false;
    } else {
      // For desktop, use traditional OrbitControls
      controlsRef.current.enableRotate = true;
      controlsRef.current.enableZoom = true;
      controlsRef.current.enablePan = false; // Only enable pan on right click
    }
    
    controlsRef.current.update();
  }, [isTouchDevice, controlsRef.current]);
  
  return {
    isTouchDevice,
    isTouchControlsActive: hammerControls.isTouchControlsActive
  };
};
