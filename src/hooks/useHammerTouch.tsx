
import { useRef, useEffect, useState, useCallback } from 'react';
import Hammer from 'hammerjs';
import * as THREE from 'three';
import { useIsMobile } from './use-mobile';

interface UseHammerTouchProps {
  containerRef: React.RefObject<HTMLDivElement>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  controlsRef: React.MutableRefObject<any>;
  modelRef: React.MutableRefObject<THREE.Group | null>;
  onTap?: (point: THREE.Vector3) => void;
}

export const useHammerTouch = ({
  containerRef,
  cameraRef,
  controlsRef,
  modelRef,
  onTap
}: UseHammerTouchProps) => {
  const { isTouchDevice, hasMouseAttached } = useIsMobile();
  const hammerRef = useRef<HammerManager | null>(null);
  const initialPinchDistanceRef = useRef<number>(0);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const modelSizeRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(0);
  const isTappingRef = useRef<boolean>(false);
  const tapCooldownRef = useRef<boolean>(false);
  const touchModeRef = useRef<boolean>(false);
  
  const [isTouchControlsActive, setIsTouchControlsActive] = useState(false);
  const [lastGestureType, setLastGestureType] = useState<string>('none');
  
  const updateModelSize = useCallback(() => {
    if (modelRef.current) {
      const box = new THREE.Box3().setFromObject(modelRef.current);
      const size = new THREE.Vector3();
      box.getSize(size);
      modelSizeRef.current = Math.max(size.x, size.y, size.z);
    }
  }, [modelRef]);
  
  useEffect(() => {
    updateModelSize();
  }, [modelRef.current, updateModelSize]);
  
  const vibrate = useCallback((pattern: number | number[]) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);
  
  useEffect(() => {
    touchModeRef.current = isTouchDevice;
    console.log(`Touch mode: ${touchModeRef.current ? 'ENABLED' : 'DISABLED'}, isTouchDevice: ${isTouchDevice}, hasMouseAttached: ${hasMouseAttached}`);
  }, [isTouchDevice, hasMouseAttached]);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const touchMode = touchModeRef.current;
    if (!touchMode) {
      console.log("Touch controls not initialized - not in touch mode");
      setIsTouchControlsActive(false);
      return;
    }
    
    console.log("Initializing Hammer.js touch controls");
    
    if (hammerRef.current) {
      hammerRef.current.destroy();
      hammerRef.current = null;
    }
    
    try {
      // Using any to bypass TypeScript's strict checking
      const hammerOptions: any = {
        inputClass: Hammer.TouchInput,
        touchAction: 'none',
        cssProps: {
          contentZooming: 'none',
          tapHighlightColor: 'rgba(0,0,0,0)',
          touchCallout: 'none',
          userDrag: 'none',
          userSelect: 'none',
          touchSelect: 'none' // Added missing property
        }
      };
      
      const hammer = new Hammer(containerRef.current, hammerOptions);
      
      // Configure recognizers with lower thresholds for better responsiveness
      const pinch = new Hammer.Pinch();
      const rotate = new Hammer.Rotate();
      const pan = new Hammer.Pan({
        direction: Hammer.DIRECTION_ALL,
        threshold: 3  // Lower threshold for easier activation
      });
      const tap = new Hammer.Tap({
        event: 'singletap',
        taps: 1,
        posThreshold: 15,  // Lower threshold
        threshold: 5,      // Lower threshold
        time: 300          // Longer time window
      });
      const doubleTap = new Hammer.Tap({
        event: 'doubletap',
        taps: 2,
        posThreshold: 15,
        threshold: 5,
        time: 400
      });
      const press = new Hammer.Press({
        time: 500
      });
      
      hammer.add([pan, pinch, rotate, press, doubleTap, tap]);
      
      // Configure recognizer relationships
      doubleTap.recognizeWith(tap);
      pan.recognizeWith(pinch);
      pan.recognizeWith(rotate);
      pinch.recognizeWith(rotate);
      
      tap.requireFailure(doubleTap);
      tap.requireFailure(press);
      tap.requireFailure(pan);
      tap.requireFailure(pinch);
      tap.requireFailure(rotate);
      
      // Log and track all gesture events
      hammer.on('singletap doubletap press panstart panmove panend pinchstart pinchmove pinchend rotatestart rotatemove rotateend', 
        (event) => {
          console.log(`Touch gesture detected: ${event.type}`);
          setLastGestureType(event.type);
          event.preventDefault && event.preventDefault();
          setIsTouchControlsActive(true);
        });
      
      hammer.on('panstart', (event) => {
        event.preventDefault && event.preventDefault();
        if (tapCooldownRef.current) return;
        console.log(`Pan started with ${event.pointers.length} fingers`);
        isTappingRef.current = false;
        vibrate(10);
        
        // Disable OrbitControls during touch gesture
        if (controlsRef.current) {
          controlsRef.current.enabled = false;
        }
      });
      
      hammer.on('panmove', (event) => {
        event.preventDefault && event.preventDefault();
        if (!controlsRef.current || !cameraRef.current || tapCooldownRef.current) return;
        
        // Increased movement sensitivity
        const deltaX = event.deltaX * 0.01;
        const deltaY = event.deltaY * 0.01;
        
        if (event.pointers.length === 1) {
          // Single finger = rotate
          controlsRef.current.rotateLeft(deltaX * 0.7); // Increased rotation speed
          controlsRef.current.rotateUp(deltaY * 0.7);
        } else if (event.pointers.length === 2) {
          // Two fingers = pan
          const adaptiveFactor = Math.max(0.1, modelSizeRef.current * 0.001);
          controlsRef.current.pan(-event.deltaX * adaptiveFactor, event.deltaY * adaptiveFactor);
        }
        controlsRef.current.update();
      });
      
      hammer.on('panend', (event) => {
        // Re-enable OrbitControls after gesture
        if (controlsRef.current) {
          controlsRef.current.enabled = true;
        }
      });
      
      hammer.on('rotatemove', (event) => {
        event.preventDefault && event.preventDefault();
        if (!controlsRef.current || !cameraRef.current) return;
        
        // Increased rotation sensitivity
        const rotationFactor = 0.012;
        controlsRef.current.rotateLeft(event.rotation * rotationFactor);
        controlsRef.current.update();
      });
      
      hammer.on('pinchstart', (event) => {
        event.preventDefault && event.preventDefault();
        initialPinchDistanceRef.current = event.scale;
        console.log("Pinch started:", event.scale);
        isTappingRef.current = false;
        
        // Disable OrbitControls during pinch
        if (controlsRef.current) {
          controlsRef.current.enabled = false;
        }
      });
      
      hammer.on('pinchmove', (event) => {
        event.preventDefault && event.preventDefault();
        if (!controlsRef.current || !cameraRef.current) return;
        
        const scaleDelta = event.scale - initialPinchDistanceRef.current;
        initialPinchDistanceRef.current = event.scale;
        
        const zoomDirection = scaleDelta > 0 ? -1 : 1;
        const zoomIntensity = Math.abs(scaleDelta) * 15; // Increased zoom sensitivity
        
        const adaptiveFactor = Math.max(0.1, modelSizeRef.current * 0.05);
        const zoomSpeed = adaptiveFactor * 0.03; // Increased zoom speed
        
        controlsRef.current.dollyIn(1 + (zoomDirection * zoomIntensity * zoomSpeed));
        controlsRef.current.update();
      });
      
      hammer.on('pinchend', (event) => {
        // Re-enable OrbitControls after pinch
        if (controlsRef.current) {
          controlsRef.current.enabled = true;
        }
      });
      
      hammer.on('singletap', (event) => {
        event.preventDefault && event.preventDefault();
        
        const currentTime = Date.now();
        const timeSinceLastTap = currentTime - lastTapTimeRef.current;
        
        if (timeSinceLastTap < 500 || tapCooldownRef.current) {
          console.log("Tap ignored - within cooldown period");
          return;
        }
        
        lastTapTimeRef.current = currentTime;
        tapCooldownRef.current = true;
        console.log("Tap detected");
        vibrate(20);
        
        if (!modelRef.current || !containerRef.current || !cameraRef.current || !onTap) {
          tapCooldownRef.current = false;
          return;
        }
        
        // Handle tap - convert screen coordinates to raycaster position
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((event.center.x - rect.left) / rect.width) * 2 - 1;
        const y = -((event.center.y - rect.top) / rect.height) * 2 + 1;
        const mousePosition = new THREE.Vector2(x, y);
        
        raycasterRef.current.setFromCamera(mousePosition, cameraRef.current);
        const intersects = raycasterRef.current.intersectObject(modelRef.current, true);
        
        if (intersects.length > 0) {
          const point = intersects[0].point;
          vibrate(50);
          console.log("Tap registered on model at point:", point);
          onTap(point);
        } else {
          vibrate([20, 30, 20]);
        }
        
        // Reset cooldown after a reasonable time
        setTimeout(() => {
          tapCooldownRef.current = false;
        }, 300); // Reduced cooldown time
      });
      
      hammer.on('doubletap', (event) => {
        event.preventDefault && event.preventDefault();
        
        if (controlsRef.current) {
          console.log("Double tap - Reset view");
          vibrate([30, 50, 30]);
          controlsRef.current.reset();
        }
        
        tapCooldownRef.current = true;
        setTimeout(() => {
          tapCooldownRef.current = false;
        }, 500);
      });
      
      hammerRef.current = hammer;
      setIsTouchControlsActive(true);
      
      return () => {
        console.log("Cleaning up Hammer.js touch controls");
        if (hammer) {
          hammer.destroy();
        }
        setIsTouchControlsActive(false);
      };
    } catch (error) {
      console.error("Error initializing touch controls:", error);
      setIsTouchControlsActive(false);
    }
  }, [
    containerRef.current, 
    cameraRef.current, 
    controlsRef.current, 
    modelRef.current, 
    onTap, 
    vibrate, 
    updateModelSize,
    isTouchDevice,
    hasMouseAttached
  ]);
  
  return {
    isTouchControlsActive,
    lastGestureType
  };
};
