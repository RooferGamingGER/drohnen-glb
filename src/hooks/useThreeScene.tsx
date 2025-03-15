
import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useIsMobile } from './use-mobile';

interface UseThreeSceneProps {
  containerRef: React.RefObject<HTMLDivElement>;
}

export const useThreeScene = ({ 
  containerRef 
}: UseThreeSceneProps) => {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const requestRef = useRef<number | null>(null);
  const { isTouchDevice, hasMouseAttached } = useIsMobile();
  const [isInTouchMode, setIsInTouchMode] = useState(false);

  // Aktualisiere den Touch-Modus-Status
  useEffect(() => {
    setIsInTouchMode(isTouchDevice && !hasMouseAttached);
  }, [isTouchDevice, hasMouseAttached]);

  const initScene = () => {
    if (!containerRef.current) return;
    
    // Szene erstellen
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Kamera erstellen
    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;
    
    // Renderer erstellen
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Begrenze PixelRatio für bessere Performance
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMappingExposure = 1;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Beleuchtung hinzufügen
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // OrbitControls konfigurieren
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    
    // Basierend auf dem Gerätetyp konfigurieren
    if (isInTouchMode) {
      console.log("OrbitControls für Touch-Geräte konfigurieren");
      controls.enableRotate = false; // Wird von Hammer.js gesteuert
      controls.enablePan = false;    // Wird von Hammer.js gesteuert
      controls.enableZoom = false;   // Wird von Hammer.js gesteuert
      controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN
      };
    } else {
      console.log("OrbitControls für Desktop konfigurieren");
      controls.rotateSpeed = 0.7;
      controls.zoomSpeed = 1.2;
      controls.panSpeed = 0.8;
      controls.screenSpacePanning = true;
    }
    
    controls.update();
    controlsRef.current = controls;
    
    // Animations-Loop starten
    const animate = () => {
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      
      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);
    
    // Fenstergrößenänderung behandeln
    const handleResize = () => {
      if (containerRef.current && cameraRef.current && rendererRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        
        rendererRef.current.setSize(width, height);
        rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Bereinigungsfunktion zurückgeben
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
    };
  };

  // Initialisiere die Szene beim Komponenten-Mount
  useEffect(() => {
    const cleanup = initScene();
    return cleanup;
  }, [isInTouchMode]); // Neu initialisieren, wenn sich der Touch-Modus ändert

  const resetCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 0, 5);
      cameraRef.current.lookAt(0, 0, 0);
      
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    }
  };

  const updateScene = () => {
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  };

  return {
    scene: sceneRef,
    camera: cameraRef,
    renderer: rendererRef,
    controls: controlsRef,
    resetCamera,
    updateScene,
    isInTouchMode
  };
};
