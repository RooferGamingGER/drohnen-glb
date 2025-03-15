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

interface CustomCssProps {
  contentZooming: string;
  tapHighlightColor: string;
  touchCallout: string;
  userDrag: string;
  userSelect: string;
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
    touchModeRef.current = isTouchDevice && !hasMouseAttached;
    console.log(`Touch mode: ${touchModeRef.current ? 'ENABLED' : 'DISABLED'}`);
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
      const hammerOptions: any = {
        inputClass: Hammer.TouchInput,
        touchAction: 'none',
        cssProps: {
          contentZooming: 'none',
          tapHighlightColor: 'rgba(0,0,0,0)',
          touchCallout: 'none',
          userDrag: 'none',
          userSelect: 'none'
        }
      };
      
      const hammer = new Hammer(containerRef.current, hammerOptions);
      
      const pinch = new Hammer.Pinch();
      const rotate = new Hammer.Rotate();
      const pan = new Hammer.Pan({
        direction: Hammer.DIRECTION_ALL,
        threshold: 5
      });
      const tap = new Hammer.Tap({
        event: 'singletap',
        taps: 1,
        posThreshold: 20,
        threshold: 9, 
        time: 250
      });
      const doubleTap = new Hammer.Tap({
        event: 'doubletap',
        taps: 2,
        posThreshold: 20,
        threshold: 9,
        time: 350
      });
      const press = new Hammer.Press({
        time: 500
      });
      
      hammer.add([pan, pinch, rotate, press, doubleTap, tap]);
      
      doubleTap.recognizeWith(tap);
      pan.recognizeWith(pinch);
      pan.recognizeWith(rotate);
      pinch.recognizeWith(rotate);
      
      tap.requireFailure(doubleTap);
      tap.requireFailure(press);
      tap.requireFailure(pan);
      tap.requireFailure(pinch);
      tap.requireFailure(rotate);
      
      hammer.on('singletap doubletap press panstart panmove panend pinchstart pinchmove pinchend rotatestart rotatemove rotateend', 
        (event) => {
          console.log(`Touch gesture: ${event.type}`);
          setLastGestureType(event.type);
          event.preventDefault && event.preventDefault();
          setIsTouchControlsActive(true);
        });
      
      hammer.on('panstart', (event) => {
        event.preventDefault && event.preventDefault();
        if (tapCooldownRef.current) return;
        console.log(`Pan gestartet mit ${event.pointers.length} Fingern`);
        isTappingRef.current = false;
        vibrate(10);
      });
      
      hammer.on('panmove', (event) => {
        event.preventDefault && event.preventDefault();
        if (!controlsRef.current || !cameraRef.current || tapCooldownRef.current) return;
        const deltaX = event.deltaX * 0.005;
        const deltaY = event.deltaY * 0.005;
        if (event.pointers.length === 1) {
          controlsRef.current.rotateLeft(deltaX * 0.5);
          controlsRef.current.rotateUp(deltaY * 0.5);
        } else if (event.pointers.length === 2) {
          const adaptiveFactor = Math.max(0.1, modelSizeRef.current * 0.0005);
          controlsRef.current.pan(-event.deltaX * adaptiveFactor, event.deltaY * adaptiveFactor);
        }
        controlsRef.current.update();
      });
      
      hammer.on('rotatemove', (event) => {
        event.preventDefault && event.preventDefault();
        if (!controlsRef.current || !cameraRef.current) return;
        const rotationFactor = 0.008;
        controlsRef.current.rotateLeft(event.rotation * rotationFactor);
        controlsRef.current.update();
      });
      
      hammer.on('pinchstart', (event) => {
        event.preventDefault && event.preventDefault();
        initialPinchDistanceRef.current = event.scale;
        console.log("Pinch gestartet:", event.scale);
        isTappingRef.current = false;
      });
      
      hammer.on('pinchmove', (event) => {
        event.preventDefault && event.preventDefault();
        if (!controlsRef.current || !cameraRef.current) return;
        const scaleDelta = event.scale - initialPinchDistanceRef.current;
        initialPinchDistanceRef.current = event.scale;
        const zoomDirection = scaleDelta > 0 ? -1 : 1;
        const zoomIntensity = Math.abs(scaleDelta) * 10;
        const adaptiveFactor = Math.max(0.1, modelSizeRef.current * 0.05);
        const zoomSpeed = adaptiveFactor * 0.025;
        controlsRef.current.dollyIn(1 + (zoomDirection * zoomIntensity * zoomSpeed));
        controlsRef.current.update();
      });
      
      hammer.on('singletap', (event) => {
        event.preventDefault && event.preventDefault();
        const currentTime = Date.now();
        const timeSinceLastTap = currentTime - lastTapTimeRef.current;
        if (timeSinceLastTap < 500 || tapCooldownRef.current) {
          console.log("Tap ignoriert - innerhalb der Cooldown-Zeit");
          return;
        }
        lastTapTimeRef.current = currentTime;
        tapCooldownRef.current = true;
        console.log("Tap erkannt");
        vibrate(20);
        if (!modelRef.current || !containerRef.current || !cameraRef.current || !onTap) {
          tapCooldownRef.current = false;
          return;
        }
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((event.center.x - rect.left) / rect.width) * 2 - 1;
        const y = -((event.center.y - rect.top) / rect.height) * 2 + 1;
        const mousePosition = new THREE.Vector2(x, y);
        raycasterRef.current.setFromCamera(mousePosition, cameraRef.current);
        const intersects = raycasterRef.current.intersectObject(modelRef.current, true);
        if (intersects.length > 0) {
          const point = intersects[0].point;
          vibrate(50);
          onTap(point);
        } else {
          vibrate([20, 30, 20]);
        }
        setTimeout(() => {
          tapCooldownRef.current = false;
        }, 500);
      });
      
      hammer.on('doubletap', (event) => {
        event.preventDefault && event.preventDefault();
        if (controlsRef.current) {
          console.log("Double tap - Ansicht zurücksetzen");
          vibrate([30, 50, 30]);
          controlsRef.current.reset();
        }
        tapCooldownRef.current = true;
        setTimeout(() => {
          tapCooldownRef.current = false;
        }, 800);
      });
      
      hammerRef.current = hammer;
      setIsTouchControlsActive(true);
      
      return () => {
        console.log("Hammer.js Touch-Steuerungen werden bereinigt");
        if (hammer) {
          hammer.destroy();
        }
        setIsTouchControlsActive(false);
      };
    } catch (error) {
      console.error("Fehler beim Initialisieren der Touch-Steuerungen:", error);
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
