
import { useState, useRef } from 'react';
import * as THREE from 'three';
import { loadGLBModel, centerModel } from '@/utils/modelUtils';
import { useToast } from '@/hooks/use-toast';

interface UseModelLoaderProps {
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  controlsRef: React.MutableRefObject<any>;
  onLoadComplete?: () => void;
}

export const useModelLoader = ({
  sceneRef,
  cameraRef,
  controlsRef,
  onLoadComplete
}: UseModelLoaderProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const modelRef = useRef<THREE.Group | null>(null);
  const modelSizeRef = useRef<number>(0);
  const loadStartTimeRef = useRef<number | null>(null);
  const processingStartTimeRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  const loadModel = async (file: File) => {
    try {
      if (!sceneRef.current) return null;

      // Clean up any existing model
      if (modelRef.current && sceneRef.current) {
        sceneRef.current.remove(modelRef.current);
        modelRef.current = null;
      }

      // Start loading process
      setIsLoading(true);
      setProgress(0);
      setError(null);

      modelSizeRef.current = file.size;
      loadStartTimeRef.current = Date.now();

      // Set up progress updates
      const totalEstimatedTime = Math.max(3000, Math.min(15000, file.size / 100000));
      let lastUpdateTime = Date.now();
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }

      progressIntervalRef.current = window.setInterval(() => {
        const currentTime = Date.now();
        const elapsedTime = currentTime - (loadStartTimeRef.current || 0);
        
        const baseProgress = Math.min(99, (elapsedTime / totalEstimatedTime) * 100);
        
        let adjustedProgress = baseProgress;
        if (baseProgress > 90) {
          adjustedProgress = 90 + (baseProgress - 90) * 0.5;
        } else if (baseProgress > 80) {
          adjustedProgress = 80 + (baseProgress - 80) * 0.7;
        } else if (baseProgress > 70) {
          adjustedProgress = 70 + (baseProgress - 70) * 0.8;
        }
        
        setProgress(Math.round(adjustedProgress));
      }, 100);

      // Load the model
      const model = await loadGLBModel(file);
      processingStartTimeRef.current = Date.now();

      // Center the model and adjust camera
      const box = centerModel(model);
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());

      model.rotation.x = -Math.PI / 2;

      if (cameraRef.current && controlsRef.current) {
        const distance = size * 1.5;
        
        cameraRef.current.position.set(0, 0, 0);
        cameraRef.current.position.copy(center);
        cameraRef.current.position.z += distance;
        cameraRef.current.lookAt(center);

        controlsRef.current.target.copy(center);
        controlsRef.current.update();
        controlsRef.current.saveState();
      }

      // Add model to scene
      sceneRef.current.add(model);
      modelRef.current = model;

      // Clean up and complete
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      setIsLoading(false);
      setProgress(100);
      
      // Adjust camera after a short delay to ensure model is properly loaded
      setTimeout(() => {
        adjustCameraToModelSize();
      }, 300);
      
      if (onLoadComplete) {
        onLoadComplete();
      }

      return model;
    } catch (error) {
      console.error('Error loading model:', error);
      
      // Clean up on error
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setIsLoading(false);
      setProgress(0);
      setError(`Fehler beim Laden des Modells: ${errorMessage}`);
      
      toast({
        title: "Fehler beim Laden",
        description: `Das Modell konnte nicht geladen werden: ${errorMessage}`,
        variant: "destructive",
        duration: 5000,
      });

      throw error;
    }
  };

  const adjustCameraToModelSize = () => {
    if (!modelRef.current || !cameraRef.current || !controlsRef.current) return;
    
    const box = new THREE.Box3().setFromObject(modelRef.current);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    const maxDimension = Math.max(size.x, size.y, size.z);
    
    const fov = cameraRef.current.fov * (Math.PI / 180);
    const optimalDistance = maxDimension / (2 * Math.tan(fov / 2));
    
    const direction = new THREE.Vector3();
    direction.subVectors(cameraRef.current.position, center).normalize();
    
    const newPosition = new THREE.Vector3();
    newPosition.copy(center).add(direction.multiplyScalar(optimalDistance * 1.2));
    
    cameraRef.current.position.copy(newPosition);
    controlsRef.current.target.copy(center);
    controlsRef.current.update();
  };

  const resetView = () => {
    if (controlsRef.current && modelRef.current && cameraRef.current) {
      adjustCameraToModelSize();
      controlsRef.current.reset();
    }
  };

  return {
    isLoading,
    progress,
    error,
    loadModel,
    modelRef,
    adjustCameraToModelSize,
    resetView
  };
};
