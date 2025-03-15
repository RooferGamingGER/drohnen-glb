
import { useRef, useEffect } from 'react';
import { useIsMobile } from './use-mobile';
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
  
  const touchStartPositionRef = useRef<{x: number, y: number} | null>(null);
  const isTouchMoveRef = useRef<boolean>(false);
  const touchStartTimeRef = useRef<number>(0);
  const touchIdentifierRef = useRef<number | null>(null);
  const pinchDistanceStartRef = useRef<number | null>(null);
  const isPinchingRef = useRef<boolean>(false);
  const lastTouchTimeRef = useRef<number>(0);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  const handleTouchStart = (event: TouchEvent) => {
    if (!containerRef.current) return;
    
    event.preventDefault();
    
    if (event.touches.length === 2) {
      isPinchingRef.current = true;
      
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      pinchDistanceStartRef.current = Math.sqrt(dx * dx + dy * dy);
      
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }
      
      return;
    }
    
    isPinchingRef.current = false;
    
    if (event.touches.length !== 1) return;
    
    const touch = event.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const now = Date.now();
    
    touchStartPositionRef.current = { x: touch.clientX, y: touch.clientY };
    touchIdentifierRef.current = touch.identifier;
    isTouchMoveRef.current = false;
    touchStartTimeRef.current = now;
    
    mouseRef.current.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
    
    if (activeTool !== 'none' && modelRef.current && cameraRef.current) {
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const modelIntersects = raycasterRef.current.intersectObject(modelRef.current, true);
      
      if (modelIntersects.length > 0) {
        const touchPoint = modelIntersects[0].point.clone();
        setTimeout(() => {
          if (!isTouchMoveRef.current && 
              touchIdentifierRef.current === touch.identifier && 
              touchStartPositionRef.current && 
              Math.abs(touchStartPositionRef.current.x - touch.clientX) < 10 && 
              Math.abs(touchStartPositionRef.current.y - touch.clientY) < 10) {
            onTouchPoint?.(touchPoint);
          }
        }, 200); // Reduced delay for more responsive touch
      }
    }
  };

  const handleTouchMove = (event: TouchEvent) => {
    if (!containerRef.current) return;
    
    event.preventDefault();
    
    if (isPinchingRef.current && event.touches.length === 2 && cameraRef.current && pinchDistanceStartRef.current) {
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      const pinchDistance = Math.sqrt(dx * dx + dy * dy);
      
      const zoomDelta = (pinchDistance - pinchDistanceStartRef.current) * 0.01;
      const newZoom = cameraRef.current.position.z - zoomDelta;
      
      cameraRef.current.position.z = Math.max(2, Math.min(20, newZoom));
      
      pinchDistanceStartRef.current = pinchDistance;
      
      return;
    }
    
    if (event.touches.length !== 1) return;
    
    const touch = event.touches[0];
    
    if (touchStartPositionRef.current) {
      const deltaX = Math.abs(touch.clientX - touchStartPositionRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartPositionRef.current.y);
      
      if (deltaX > 10 || deltaY > 10) {
        isTouchMoveRef.current = true;
      }
    }
    
    if (isTouchMoveRef.current && controlsRef.current && touchStartPositionRef.current && activeTool === 'none' && !isPinchingRef.current) {
      if (controlsRef.current) {
        const deltaX = (touch.clientX - touchStartPositionRef.current.x) * 0.005;
        const deltaY = (touch.clientY - touchStartPositionRef.current.y) * 0.005;
        
        if (cameraRef.current) {
          const radius = cameraRef.current.position.distanceTo(controlsRef.current.target);
          
          controlsRef.current.update();
          
          cameraRef.current.position.y += deltaY * radius;
          
          const theta = Math.atan2(
            cameraRef.current.position.x - controlsRef.current.target.x,
            cameraRef.current.position.z - controlsRef.current.target.z
          );
          
          const newTheta = theta - deltaX;
          const x = controlsRef.current.target.x + radius * Math.sin(newTheta);
          const z = controlsRef.current.target.z + radius * Math.cos(newTheta);
          
          cameraRef.current.position.x = x;
          cameraRef.current.position.z = z;
          
          cameraRef.current.lookAt(controlsRef.current.target);
          
          controlsRef.current.update();
        }
      }
      
      touchStartPositionRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchEnd = (event: TouchEvent) => {
    if (isPinchingRef.current) {
      isPinchingRef.current = false;
      pinchDistanceStartRef.current = null;
      
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
    }
    
    if (!isTouchMoveRef.current && activeTool !== 'none' && modelRef.current && containerRef.current && event.changedTouches.length > 0) {
      const touch = event.changedTouches[0];
      if (touchIdentifierRef.current === touch.identifier) {
        const rect = containerRef.current.getBoundingClientRect();
        mouseRef.current.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
        
        if (cameraRef.current) {
          raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
          const intersects = raycasterRef.current.intersectObject(modelRef.current, true);
          
          if (intersects.length > 0) {
            const point = intersects[0].point.clone();
            onTouchPoint?.(point);
          }
        }
      }
    }
    
    touchStartPositionRef.current = null;
    isTouchMoveRef.current = false;
    touchIdentifierRef.current = null;
  };

  // Set up event listeners
  useEffect(() => {
    if (!containerRef.current || !isTouchDevice) return;
    
    containerRef.current.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      containerRef.current?.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [containerRef.current, isTouchDevice, activeTool]);

  return {
    isTouchDevice
  };
};
