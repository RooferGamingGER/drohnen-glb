
import { useRef, useEffect, useState } from 'react';
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
  const { isTouchDevice } = useIsMobile();
  const hammerRef = useRef<HammerManager | null>(null);
  const initialPinchDistanceRef = useRef<number>(0);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const modelSizeRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(0);
  const isTappingRef = useRef<boolean>(false);
  const tapCooldownRef = useRef<boolean>(false);
  
  // Add state for touch control active state
  const [isTouchControlsActive, setIsTouchControlsActive] = useState(false);
  
  // Calculate model size for adaptive controls
  useEffect(() => {
    if (modelRef.current) {
      const box = new THREE.Box3().setFromObject(modelRef.current);
      const size = new THREE.Vector3();
      box.getSize(size);
      modelSizeRef.current = Math.max(size.x, size.y, size.z);
    }
  }, [modelRef.current]);

  useEffect(() => {
    if (!containerRef.current || !isTouchDevice) return;
    
    console.log("Initializing Hammer.js touch controls");
    
    // Create Hammer manager
    hammerRef.current = new Hammer(containerRef.current, {
      touchAction: 'none', // This prevents browser handling of all panning/zooming gestures
      recognizers: [
        [Hammer.Rotate, { enable: true }],
        [Hammer.Pinch, { enable: true }],
        [Hammer.Pan, { enable: true, direction: Hammer.DIRECTION_ALL, threshold: 5 }],
        [Hammer.Tap, { enable: true, time: 250, threshold: 9 }],
        [Hammer.Press, { enable: true, time: 500 }]
      ]
    });
    
    const hammer = hammerRef.current;
    setIsTouchControlsActive(true);
    
    // Ensure that pinch and rotate can work simultaneously
    const pinch = hammer.get('pinch');
    const rotate = hammer.get('rotate');
    const pan = hammer.get('pan');
    const tap = hammer.get('tap');
    const press = hammer.get('press');
    
    pinch.recognizeWith(rotate);
    pinch.recognizeWith(pan);
    rotate.recognizeWith(pan);
    
    // Set these explicitly to prevent conflicts
    tap.requireFailure(pinch);
    tap.requireFailure(rotate);
    tap.requireFailure(press);
    
    // Clear any previous handlers to prevent duplicates
    hammer.off('panstart panmove panend');
    hammer.off('pinchstart pinchmove pinchend');
    hammer.off('tap doubletap press');
    hammer.off('rotatestart rotatemove rotateend');
    
    // Pan event for rotation (one finger) or translation (two fingers)
    hammer.on('panstart', (event) => {
      // Prevent default browser behavior
      event.preventDefault && event.preventDefault();
      
      // Make sure we're not within tap cooldown
      if (tapCooldownRef.current) return;
      
      console.log("Pan started with " + event.pointers.length + " pointers");
      
      // Cancel any ongoing tap to prevent double actions
      isTappingRef.current = false;
    });
    
    hammer.on('panmove', (event) => {
      // Prevent default browser behavior
      event.preventDefault && event.preventDefault();
      
      if (tapCooldownRef.current || !controlsRef.current || !cameraRef.current) return;
      
      const deltaX = event.deltaX * 0.005;
      const deltaY = event.deltaY * 0.005;
      
      // Determine if this is likely a rotation or translation based on number of pointers
      if (event.pointers.length === 1) {
        // For one finger, rotate the camera (most intuitive for users)
        controlsRef.current.rotateLeft(deltaX * 0.5);
        controlsRef.current.rotateUp(deltaY * 0.5);
      } else if (event.pointers.length === 2) {
        // For two fingers, pan the camera
        const adaptiveFactor = modelSizeRef.current * 0.0005;
        const panSpeed = Math.max(0.1, adaptiveFactor);
        
        controlsRef.current.pan(-event.deltaX * panSpeed, event.deltaY * panSpeed);
      }
      
      controlsRef.current.update();
    });
    
    hammer.on('panend', () => {
      console.log("Pan ended");
    });
    
    // Rotate event handling
    hammer.on('rotatestart', (event) => {
      // Prevent default browser behavior
      event.preventDefault && event.preventDefault();
      console.log("Rotate started");
      
      // Cancel any ongoing tap
      isTappingRef.current = false;
    });
    
    hammer.on('rotatemove', (event) => {
      // Prevent default browser behavior
      event.preventDefault && event.preventDefault();
      
      if (controlsRef.current && cameraRef.current) {
        // Use rotation delta to rotate the model
        controlsRef.current.rotateLeft(event.rotation * 0.01);
        controlsRef.current.update();
      }
    });
    
    // Pinch event for zooming
    hammer.on('pinchstart', (event) => {
      // Prevent default browser behavior
      event.preventDefault && event.preventDefault();
      
      initialPinchDistanceRef.current = event.scale;
      console.log("Pinch started", event.scale);
      
      // Cancel any ongoing tap
      isTappingRef.current = false;
    });
    
    hammer.on('pinchmove', (event) => {
      // Prevent default browser behavior
      event.preventDefault && event.preventDefault();
      
      if (controlsRef.current && cameraRef.current) {
        const scaleDelta = event.scale - initialPinchDistanceRef.current;
        initialPinchDistanceRef.current = event.scale;
        
        const zoomDirection = scaleDelta > 0 ? -1 : 1;
        const zoomIntensity = Math.abs(scaleDelta) * 10;
        
        // Adaptive zoom based on model size
        const adaptiveFactor = modelSizeRef.current * 0.05;
        const zoomSpeed = Math.max(0.1, adaptiveFactor);
        
        controlsRef.current.dollyIn(1 + (zoomDirection * zoomIntensity * zoomSpeed * 0.025));
        controlsRef.current.update();
      }
    });
    
    // Long press for context menu
    hammer.on('press', (event) => {
      // Prevent default browser behavior
      event.preventDefault && event.preventDefault();
      console.log("Long press detected");
    });
    
    // Tap event for selection with cooldown to prevent accidental double taps
    hammer.on('tap', (event) => {
      // Prevent default browser behavior
      event.preventDefault && event.preventDefault();
      
      const currentTime = new Date().getTime();
      const timeSinceLastTap = currentTime - lastTapTimeRef.current;
      
      // Ensure we have sufficient time between taps (500ms cooldown)
      if (timeSinceLastTap < 500 || tapCooldownRef.current) {
        console.log("Tap ignored - within cooldown period");
        return;
      }
      
      lastTapTimeRef.current = currentTime;
      tapCooldownRef.current = true;
      
      console.log("Tap detected");
      
      // Only process if we have all the required refs and callback
      if (!modelRef.current || !containerRef.current || !cameraRef.current || !onTap) {
        tapCooldownRef.current = false;
        return;
      }
      
      // Calculate tap position
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((event.center.x - rect.left) / rect.width) * 2 - 1;
      const y = -((event.center.y - rect.top) / rect.height) * 2 + 1;
      
      const mousePosition = new THREE.Vector2(x, y);
      
      // Cast ray to find intersection with model
      raycasterRef.current.setFromCamera(mousePosition, cameraRef.current);
      const intersects = raycasterRef.current.intersectObject(modelRef.current, true);
      
      if (intersects.length > 0) {
        const point = intersects[0].point;
        
        // Provide haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        
        // Call the tap callback with the intersection point
        onTap(point);
      }
      
      // Reset cooldown after 500ms
      setTimeout(() => {
        tapCooldownRef.current = false;
      }, 500);
    });
    
    // Double tap for reset view - configure separately from single tap
    hammer.on('doubletap', (event) => {
      // Prevent default browser behavior
      event.preventDefault && event.preventDefault();
      
      if (controlsRef.current) {
        console.log("Double tap - resetting view");
        
        // Provide haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate([50, 50, 50]);
        }
        
        controlsRef.current.reset();
      }
      
      // Set a longer cooldown after double tap
      tapCooldownRef.current = true;
      setTimeout(() => {
        tapCooldownRef.current = false;
      }, 800);
    });
    
    return () => {
      console.log("Cleaning up Hammer.js");
      if (hammer) {
        hammer.destroy();
      }
      setIsTouchControlsActive(false);
    };
  }, [containerRef.current, cameraRef.current, controlsRef.current, modelRef.current, isTouchDevice, onTap]);
  
  return {
    isTouchControlsActive
  };
};
