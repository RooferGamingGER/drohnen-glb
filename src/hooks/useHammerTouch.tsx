
import { useRef, useEffect } from 'react';
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
    hammerRef.current = new Hammer(containerRef.current);
    const hammer = hammerRef.current;
    
    // Configure recognizers with proper settings for 3D manipulation
    hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL, threshold: 5 });
    hammer.get('pinch').set({ enable: true });
    hammer.get('rotate').set({ enable: true });
    hammer.get('tap').set({ taps: 1 });
    hammer.get('doubletap').set({ taps: 2 });
    
    // Ensure that pinch and rotate can work simultaneously
    const pinch = hammer.get('pinch');
    const rotate = hammer.get('rotate');
    const pan = hammer.get('pan');
    
    pinch.recognizeWith(rotate);
    pinch.recognizeWith(pan);
    rotate.recognizeWith(pan);
    
    // Pan event for rotation or translation
    hammer.on('panstart', (event) => {
      if (controlsRef.current) {
        // Remember current camera position for transitions
        console.log("Pan started");
      }
    });
    
    hammer.on('panmove', (event) => {
      if (controlsRef.current && cameraRef.current) {
        const deltaX = event.deltaX * 0.005;
        const deltaY = event.deltaY * 0.005;
        
        // Determine if this is likely a rotation or translation based on gesture
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
      }
    });
    
    hammer.on('panend', () => {
      console.log("Pan ended");
    });
    
    // Pinch event for zooming
    hammer.on('pinchstart', (event) => {
      initialPinchDistanceRef.current = event.scale;
      console.log("Pinch started", event.scale);
    });
    
    hammer.on('pinchmove', (event) => {
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
    
    // Tap event for selection
    hammer.on('tap', (event) => {
      if (!modelRef.current || !containerRef.current || !cameraRef.current || !onTap) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((event.center.x - rect.left) / rect.width) * 2 - 1;
      const y = -((event.center.y - rect.top) / rect.height) * 2 + 1;
      
      const mousePosition = new THREE.Vector2(x, y);
      
      raycasterRef.current.setFromCamera(mousePosition, cameraRef.current);
      const intersects = raycasterRef.current.intersectObject(modelRef.current, true);
      
      if (intersects.length > 0) {
        const point = intersects[0].point;
        onTap(point);
      }
    });
    
    // Double tap for reset view
    hammer.on('doubletap', () => {
      if (controlsRef.current) {
        console.log("Double tap - resetting view");
        controlsRef.current.reset();
      }
    });
    
    return () => {
      console.log("Cleaning up Hammer.js");
      if (hammer) {
        hammer.destroy();
      }
    };
  }, [containerRef.current, cameraRef.current, controlsRef.current, modelRef.current, isTouchDevice, onTap]);
  
  return {
    isTouchControlsActive: !!hammerRef.current
  };
};
