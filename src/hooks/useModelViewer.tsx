import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { backgroundOptions, BackgroundOption, loadTexture } from '@/utils/modelUtils';
import { useThreeScene } from './useThreeScene';
import { useModelLoader } from './useModelLoader';
import { useMeasurements } from './useMeasurements';
import { useTouch } from './useTouch';
import { useIsMobile } from './use-mobile';

interface UseModelViewerProps {
  containerRef: React.RefObject<HTMLDivElement>;
  onLoadComplete?: () => void;
}

export const useModelViewer = ({ containerRef, onLoadComplete }: UseModelViewerProps) => {
  const [background, setBackground] = useState<BackgroundOption>(
    backgroundOptions.find(bg => bg.id === 'dark') || backgroundOptions[0]
  );
  
  const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | null>(null);
  const [progress, setProgress] = useState(0);
  const { isTouchDevice } = useIsMobile();
  
  // Initialize Three.js scene, camera, renderer
  const { 
    scene: sceneRef,
    camera: cameraRef, 
    renderer: rendererRef, 
    controls: controlsRef,
    updateScene 
  } = useThreeScene({ containerRef });
  
  // Initialize model loading functionality
  const {
    isLoading,
    progress: modelProgress,
    error,
    loadModel,
    modelRef,
    adjustCameraToModelSize,
    resetView
  } = useModelLoader({
    sceneRef,
    cameraRef,
    controlsRef,
    onLoadComplete
  });
  
  // Use model progress for our progress state
  useEffect(() => {
    setProgress(modelProgress);
  }, [modelProgress]);
  
  // Initialize measurement functionality
  const measurements = useMeasurements({
    modelRef,
    sceneRef,
    cameraRef,
    controlsRef
  });
  
  // Initialize touch control functionality
  useTouch({
    containerRef,
    cameraRef,
    controlsRef,
    activeTool: measurements.activeTool,
    modelRef,
    onTouchPoint: (point) => {
      if (measurements.activeTool !== 'none') {
        const worldPoint = point.clone();
        measurements.setTemporaryPoints(prev => [...prev, { 
          position: point,
          worldPosition: worldPoint
        }]);
        
        measurements.addMeasurementPoint(point);
        
        if ((measurements.activeTool === 'length' || measurements.activeTool === 'height') && 
            measurements.temporaryPoints.length === 1) {
          const newPoints = [...measurements.temporaryPoints, { position: point, worldPosition: worldPoint }];
          measurements.finalizeMeasurement(newPoints);
        }
      }
    }
  });
  
  // Initialize measurement group when scene is ready
  useEffect(() => {
    if (sceneRef.current) {
      measurements.initMeasurementGroup();
    }
  }, [sceneRef.current]);
  
  // Add mouse move handler for measurement point hovering
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    measurements.mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    measurements.mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    if (measurements.isDraggingPoint && measurements.draggedPointRef.current && 
        modelRef.current && cameraRef.current) {
      event.preventDefault();
      
      measurements.raycasterRef.current.setFromCamera(measurements.mouseRef.current, cameraRef.current);
      
      const intersects = measurements.raycasterRef.current.intersectObject(modelRef.current, true);
      
      if (intersects.length > 0) {
        const newPosition = intersects[0].point.clone();
        
        measurements.draggedPointRef.current.position.copy(newPosition);
        
        if (measurements.selectedMeasurementId !== null && measurements.selectedPointIndex !== null) {
          measurements.updateMeasurementPointPosition(
            measurements.selectedMeasurementId, 
            measurements.selectedPointIndex, 
            newPosition
          );
        }
      }
    } else if (measurements.activeTool !== 'none' && modelRef.current && cameraRef.current) {
      measurements.raycasterRef.current.setFromCamera(measurements.mouseRef.current, cameraRef.current);
      const intersects = measurements.raycasterRef.current.intersectObject(modelRef.current, true);
      
      if (intersects.length > 0) {
        setHoverPoint(intersects[0].point.clone());
      } else {
        setHoverPoint(null);
      }
    } else if (measurements.activeTool === 'none' && measurements.measurementGroupRef.current && cameraRef.current) {
      measurements.raycasterRef.current.setFromCamera(measurements.mouseRef.current, cameraRef.current);
      
      const pointObjects = measurements.measurementGroupRef.current.children.filter(
        child => child instanceof THREE.Mesh && child.name.startsWith('point-')
      );
      
      const intersects = measurements.raycasterRef.current.intersectObjects(pointObjects, false);
      
      if (intersects.length > 0) {
        const pointId = intersects[0].object.name;
        measurements.setHoveredPointId(pointId);
        document.body.style.cursor = 'pointer';
        
        if (intersects[0].object instanceof THREE.Mesh) {
          const nameParts = pointId.split('-');
          if (nameParts.length >= 3) {
            const measurementId = nameParts[1];
            const measurement = measurements.measurements.find(m => m.id === measurementId);
            
            if (!measurement?.editMode) {
              intersects[0].object.material = createDraggablePointMaterial(true);
            } else {
              intersects[0].object.material = createEditablePointMaterial(false);
            }
          } else {
            intersects[0].object.material = createDraggablePointMaterial(true);
          }
        }
      } else {
        if (measurements.hoveredPointId) {
          const prevHoveredPoint = measurements.measurementGroupRef.current.children.find(
            child => child.name === measurements.hoveredPointId
          );
          
          if (prevHoveredPoint && prevHoveredPoint instanceof THREE.Mesh) {
            const nameParts = measurements.hoveredPointId.split('-');
            if (nameParts.length >= 3) {
              const measurementId = nameParts[1];
              const measurement = measurements.measurements.find(m => m.id === measurementId);
              
              if (measurement?.editMode) {
                prevHoveredPoint.material = createEditablePointMaterial(false);
              } else {
                prevHoveredPoint.material = createDraggablePointMaterial(false);
              }
            } else {
              prevHoveredPoint.material = createDraggablePointMaterial(false);
            }
          }
        }
        
        measurements.setHoveredPointId(null);
        document.body.style.cursor = 'auto';
      }
    } else {
      if (hoverPoint) setHoverPoint(null);
      if (measurements.hoveredPointId) measurements.setHoveredPointId(null);
      document.body.style.cursor = 'auto';
    }
    
    measurements.previousMouseRef.current.copy(measurements.mouseRef.current);
  }, [measurements.activeTool, measurements.temporaryPoints, measurements.isDraggingPoint, measurements.hoveredPointId]);
  
  // Add mouse down handler for point interaction
  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (!containerRef.current || !measurements.measurementGroupRef.current) return;
    
    if (measurements.hoveredPointId && !measurements.isDraggingPoint) {
      const nameParts = measurements.hoveredPointId.split('-');
      if (nameParts.length >= 3) {
        const measurementId = nameParts[1];
        const measurement = measurements.measurements.find(m => m.id === measurementId);
        
        if (measurement?.editMode) {
          const pointIndex = parseInt(nameParts[2], 10);
          const pointMesh = measurements.measurementGroupRef.current.children.find(
            child => child.name === measurements.hoveredPointId
          ) as THREE.Mesh;
          
          if (pointMesh) {
            event.preventDefault();
            event.stopPropagation();
            
            measurements.setIsDraggingPoint(true);
            measurements.draggedPointRef.current = pointMesh;
            document.body.style.cursor = 'grabbing';
            
            measurements.setSelectedMeasurementId(measurementId);
            measurements.setSelectedPointIndex(pointIndex);
            
            if (controlsRef.current) {
              controlsRef.current.enabled = false;
            }
            
            pointMesh.userData = {
              ...pointMesh.userData,
              isBeingDragged: true
            };
          }
        }
      }
    }
  }, [measurements.hoveredPointId, measurements.isDraggingPoint]);
  
  // Add mouse up handler to finalize point dragging
  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (measurements.isDraggingPoint) {
      measurements.setIsDraggingPoint(false);
      
      if (measurements.draggedPointRef.current?.userData) {
        measurements.draggedPointRef.current.userData.isBeingDragged = false;
      }
      
      measurements.draggedPointRef.current = null;
      document.body.style.cursor = measurements.hoveredPointId ? 'pointer' : 'auto';
      
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
      
      measurements.setIsDraggingPoint(false);
      measurements.setSelectedMeasurementId(null);
      measurements.setSelectedPointIndex(null);
    }
  }, [measurements.isDraggingPoint, measurements.hoveredPointId]);
  
  // Handle measurement click events
  const handleMeasurementClick = useCallback((event: MouseEvent) => {
    if (measurements.isDraggingPoint) return;
    
    if (measurements.activeTool === 'none' || !modelRef.current || !containerRef.current || 
        !sceneRef.current || !cameraRef.current) {
      return;
    }
    
    const rect = containerRef.current.getBoundingClientRect();
    measurements.mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    measurements.mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    measurements.raycasterRef.current.setFromCamera(measurements.mouseRef.current, cameraRef.current);
    
    const intersects = measurements.raycasterRef.current.intersectObject(modelRef.current, true);
    
    if (intersects.length > 0) {
      const point = intersects[0].point.clone();
      const worldPoint = point.clone();
      
      measurements.setTemporaryPoints(prev => [...prev, { 
        position: point,
        worldPosition: worldPoint
      }]);
      
      measurements.addMeasurementPoint(point);
      
      if ((measurements.activeTool === 'length' || measurements.activeTool === 'height') && 
          measurements.temporaryPoints.length === 1) {
        const newPoints = [...measurements.temporaryPoints, { position: point, worldPosition: worldPoint }];
        measurements.finalizeMeasurement(newPoints);
      }
    }
  }, [measurements.activeTool, measurements.temporaryPoints, measurements.isDraggingPoint]);
  
  // Set up mouse event listeners
  useEffect(() => {
    if (!containerRef.current || !isTouchDevice) return;
    
    containerRef.current.addEventListener('mousemove', handleMouseMove);
    containerRef.current.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    if (measurements.activeTool !== 'none') {
      containerRef.current.addEventListener('click', handleMeasurementClick);
    }
    
    return () => {
      containerRef.current?.removeEventListener('mousemove', handleMouseMove);
      containerRef.current?.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      containerRef.current?.removeEventListener('click', handleMeasurementClick);
    };
  }, [
    handleMouseMove, 
    handleMouseDown, 
    handleMouseUp, 
    handleMeasurementClick, 
    measurements.activeTool,
    isTouchDevice
  ]);
  
  // Update canUndo state based on temporary points
  useEffect(() => {
    measurements.setCanUndo(measurements.temporaryPoints.length > 0);
  }, [measurements.temporaryPoints]);
  
  // Apply background color or texture
  const applyBackground = async (option: BackgroundOption) => {
    if (!sceneRef.current || !rendererRef.current) return;

    if (sceneRef.current.background) {
      if (sceneRef.current.background instanceof THREE.Texture) {
        sceneRef.current.background.dispose();
      }
      sceneRef.current.background = null;
    }

    rendererRef.current.setClearAlpha(option.id === 'transparent' ? 0 : 1);

    if (option.color) {
      sceneRef.current.background = new THREE.Color(option.color);
    } else if (option.texture) {
      try {
        const texture = await loadTexture(option.texture);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(10, 10);
        sceneRef.current.background = texture;
      } catch (error) {
        console.error('Error loading texture:', error);
      }
    }

    setBackground(option);
  };
  
  // Toggle visibility of all measurements
  const toggleMeasurementsVisibility = (visible: boolean) => {
    if (!measurements.measurementGroupRef.current) return;
    
    measurements.measurementGroupRef.current.traverse((child) => {
      if (child.name === 'hoverPoint') return;
      
      child.visible = visible;
    });
  };

  // Get necessary functions for point handling
  const createDraggablePointMaterial = (isHovered: boolean) => {
    const material = new THREE.MeshBasicMaterial({
      color: isHovered ? 0xffaa00 : 0xff0000,
      transparent: true,
      opacity: 0.8,
      depthTest: false
    });
    return material;
  };

  const createEditablePointMaterial = (isSelected: boolean) => {
    const material = new THREE.MeshBasicMaterial({
      color: isSelected ? 0x00ff00 : 0x3399ff,
      transparent: true,
      opacity: 0.8,
      depthTest: false
    });
    return material;
  };

  // Return the complete API
  return {
    isLoading,
    progress,
    error,
    loadModel,
    background,
    setBackground: applyBackground,
    backgroundOptions,
    resetView,
    activeTool: measurements.activeTool,
    setActiveTool: measurements.setActiveTool,
    measurements: measurements.measurements,
    clearMeasurements: measurements.clearMeasurements,
    undoLastPoint: measurements.undoLastPoint,
    deleteMeasurement: measurements.deleteMeasurement,
    deleteSinglePoint: measurements.deleteSinglePoint,
    deleteTempPoint: measurements.deleteTempPoint,
    updateMeasurement: measurements.updateMeasurement,
    toggleMeasurementsVisibility,
    setProgress,
    canUndo: measurements.canUndo,
    tempPoints: measurements.temporaryPoints,
    measurementGroupRef: measurements.measurementGroupRef,
    renderer: rendererRef.current,
    scene: sceneRef.current,
    camera: cameraRef.current,
    controls: controlsRef.current,
    loadedModel: modelRef.current,
    updateModelViewer: updateScene,
    adjustCameraToModelSize,
    isTouchDevice
  };
};
