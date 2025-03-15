
import { useState, useRef } from 'react';
import * as THREE from 'three';
import { useToast } from '@/hooks/use-toast';
import {
  MeasurementType,
  Measurement,
  MeasurementPoint,
  calculateDistance,
  calculateHeight,
  calculateInclination,
  createMeasurementId,
  createTextSprite,
  updateLabelScale,
  createDraggablePointMaterial,
  createEditablePointMaterial,
  createDraggablePoint,
  createMeasurementLine,
  isDoubleClick,
  togglePointSelection,
  isPointSelected,
  formatMeasurementWithInclination
} from '@/utils/measurementUtils';

interface UseMeasurementsProps {
  modelRef: React.MutableRefObject<THREE.Group | null>;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  controlsRef: React.MutableRefObject<any>;
}

export const useMeasurements = ({
  modelRef,
  sceneRef,
  cameraRef,
  controlsRef
}: UseMeasurementsProps) => {
  const { toast } = useToast();
  const [activeTool, setActiveTool] = useState<MeasurementType>('none');
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [temporaryPoints, setTemporaryPoints] = useState<MeasurementPoint[]>([]);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const [isDraggingPoint, setIsDraggingPoint] = useState(false);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  const measurementGroupRef = useRef<THREE.Group | null>(null);
  const currentMeasurementRef = useRef<{
    points: THREE.Vector3[];
    lines: THREE.Line[];
    labels: THREE.Sprite[];
    meshes: THREE.Mesh[];
  } | null>(null);
  const draggedPointRef = useRef<THREE.Mesh | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const previousMouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // Initialize the measurement group
  const initMeasurementGroup = () => {
    if (!sceneRef.current) return;
    
    // Clean up existing group if it exists
    if (measurementGroupRef.current) {
      sceneRef.current.remove(measurementGroupRef.current);
    }
    
    const group = new THREE.Group();
    group.name = "measurements";
    sceneRef.current.add(group);
    measurementGroupRef.current = group;
  };

  const addMeasurementPoint = (position: THREE.Vector3) => {
    if (!measurementGroupRef.current) return;
    
    const pointName = `point-temp-${temporaryPoints.length}`;
    const point = createDraggablePoint(position, pointName);
    
    measurementGroupRef.current.add(point);
    
    if (!currentMeasurementRef.current) {
      currentMeasurementRef.current = {
        points: [position],
        lines: [],
        labels: [],
        meshes: [point]
      };
    } else {
      currentMeasurementRef.current.points.push(position);
      currentMeasurementRef.current.meshes.push(point);
    }
    
    if (temporaryPoints.length > 0) {
      const prevPoint = temporaryPoints[temporaryPoints.length - 1].position;
      
      let linePoints: THREE.Vector3[];
      
      if (activeTool === 'height') {
        const verticalPoint = new THREE.Vector3(
          prevPoint.x, 
          position.y,
          prevPoint.z
        );
        
        linePoints = [prevPoint, verticalPoint, position];
      } else {
        linePoints = [prevPoint, position];
      }
      
      const line = createMeasurementLine(
        linePoints,
        activeTool === 'length' ? 0x00ff00 : 0x0000ff
      );
      
      measurementGroupRef.current.add(line);
      
      if (currentMeasurementRef.current) {
        currentMeasurementRef.current.lines.push(line);
      }
      
      if (activeTool === 'length' || activeTool === 'height') {
        let value: number;
        let unit = 'm';
        let inclination: number | undefined;
        
        if (activeTool === 'length') {
          value = calculateDistance(prevPoint, position);
          inclination = calculateInclination(prevPoint, position);
          
          const midPoint = new THREE.Vector3().addVectors(prevPoint, position).multiplyScalar(0.5);
          midPoint.y += 0.1;
          
          const labelText = formatMeasurementWithInclination(value, inclination);
          const labelSprite = createTextSprite(labelText, midPoint, 0x00ff00);
          
          labelSprite.userData = {
            ...labelSprite.userData,
            isLabel: true,
            baseScale: { x: 0.8, y: 0.4, z: 1 }
          };
          
          if (cameraRef.current) {
            updateLabelScale(labelSprite, cameraRef.current);
          }
          
          measurementGroupRef.current.add(labelSprite);
          
          if (currentMeasurementRef.current) {
            currentMeasurementRef.current.labels.push(labelSprite);
          }
        } else {
          value = calculateHeight(prevPoint, position);
          
          const midHeight = (prevPoint.y + position.y) / 2;
          const midPoint = new THREE.Vector3(
            prevPoint.x,
            midHeight,
            prevPoint.z
          );
          midPoint.x += 0.1;
          
          const labelText = `${value.toFixed(2)} ${unit}`;
          const labelSprite = createTextSprite(labelText, midPoint, 0x0000ff);
          
          labelSprite.userData = {
            ...labelSprite.userData,
            isLabel: true,
            baseScale: { x: 0.8, y: 0.4, z: 1 }
          };
          
          if (cameraRef.current) {
            updateLabelScale(labelSprite, cameraRef.current);
          }
          
          measurementGroupRef.current.add(labelSprite);
          
          if (currentMeasurementRef.current) {
            currentMeasurementRef.current.labels.push(labelSprite);
          }
        }
      }
    }
  };

  const finalizeMeasurement = (points: MeasurementPoint[]) => {
    if (activeTool === 'none' || points.length < 2) return;
    
    let value = 0;
    let unit = 'm';
    let inclination: number | undefined;
    
    if (activeTool === 'length') {
      value = calculateDistance(points[0].position, points[1].position);
      inclination = calculateInclination(points[0].position, points[1].position);
    } else if (activeTool === 'height') {
      value = calculateHeight(points[0].position, points[1].position);
    }
    
    const measurementId = createMeasurementId();
    
    if (currentMeasurementRef.current && currentMeasurementRef.current.meshes) {
      currentMeasurementRef.current.meshes.forEach((mesh, index) => {
        mesh.name = `point-${measurementId}-${index}`;
      });
    }
    
    const measurementObjects = {
      pointObjects: currentMeasurementRef.current?.meshes || [],
      lineObjects: currentMeasurementRef.current?.lines || [],
      labelObject: currentMeasurementRef.current?.labels[0] || null
    };
    
    const newMeasurement: Measurement = {
      id: measurementId,
      type: activeTool,
      points: points,
      value,
      unit,
      inclination: activeTool === 'length' ? inclination : undefined,
      ...measurementObjects,
      editMode: false,
      visible: true
    };
    
    setMeasurements(prev => [...prev, newMeasurement]);
    setTemporaryPoints([]);
    
    currentMeasurementRef.current = null;
  };

  const updateMeasurementPointPosition = (
    measurementId: string,
    pointIndex: number,
    newPosition: THREE.Vector3
  ) => {
    setMeasurements(prevMeasurements => {
      return prevMeasurements.map(measurement => {
        if (measurement.id === measurementId) {
          const updatedPoints = [...measurement.points];
          
          if (updatedPoints[pointIndex]) {
            updatedPoints[pointIndex] = {
              ...updatedPoints[pointIndex],
              position: newPosition,
              worldPosition: newPosition.clone()
            };
          }
          
          let newValue: number;
          let inclination: number | undefined;
          
          if (measurement.type === 'length') {
            newValue = calculateDistance(
              updatedPoints[0].position,
              updatedPoints[1].position
            );
            
            inclination = calculateInclination(
              updatedPoints[0].position,
              updatedPoints[1].position
            );
          } else {
            newValue = calculateHeight(
              updatedPoints[0].position,
              updatedPoints[1].position
            );
          }
          
          if (measurement.labelObject) {
            let labelPosition: THREE.Vector3;
            
            if (measurement.type === 'length') {
              labelPosition = new THREE.Vector3().addVectors(
                updatedPoints[0].position,
                updatedPoints[1].position
              ).multiplyScalar(0.5);
              labelPosition.y += 0.1;
            } else {
              const midHeight = (
                updatedPoints[0].position.y + 
                updatedPoints[1].position.y
              ) / 2;
              
              labelPosition = new THREE.Vector3(
                updatedPoints[0].position.x,
                midHeight,
                updatedPoints[0].position.z
              );
              labelPosition.x += 0.1;
            }
            
            measurement.labelObject.position.copy(labelPosition);
            
            const labelText = measurement.type === 'length' 
              ? formatMeasurementWithInclination(newValue, inclination)
              : `${newValue.toFixed(2)} ${measurement.unit}`;
            
            const newSprite = createTextSprite(
              labelText, 
              labelPosition,
              measurement.type === 'length' ? 0x00ff00 : 0x0000ff
            );
            
            newSprite.userData = measurement.labelObject.userData;
            newSprite.scale.copy(measurement.labelObject.scale);
            
            if (measurementGroupRef.current) {
              if (measurement.labelObject.material instanceof THREE.SpriteMaterial) {
                measurement.labelObject.material.map?.dispose();
                measurement.labelObject.material.dispose();
              }
              
              measurementGroupRef.current.remove(measurement.labelObject);
              measurementGroupRef.current.add(newSprite);
            }
            
            if (measurement.lineObjects && measurement.lineObjects.length > 0) {
              if (measurement.type === 'length') {
                const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                  updatedPoints[0].position,
                  updatedPoints[1].position
                ]);
                
                measurement.lineObjects[0].geometry.dispose();
                measurement.lineObjects[0].geometry = lineGeometry;
              } else {
                const verticalPoint = new THREE.Vector3(
                  updatedPoints[0].position.x,
                  updatedPoints[1].position.y,
                  updatedPoints[0].position.z
                );
                
                const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                  updatedPoints[0].position,
                  verticalPoint,
                  updatedPoints[1].position
                ]);
                
                measurement.lineObjects[0].geometry.dispose();
                measurement.lineObjects[0].geometry = lineGeometry;
              }
            }
            
            return {
              ...measurement,
              points: updatedPoints,
              value: newValue,
              inclination: measurement.type === 'length' ? inclination : undefined,
              labelObject: newSprite
            };
          }
          
          return {
            ...measurement,
            points: updatedPoints,
            value: newValue,
            inclination: measurement.type === 'length' ? inclination : undefined
          };
        }
        return measurement;
      });
    });
  };

  const clearMeasurements = () => {
    if (measurementGroupRef.current) {
      measurements.forEach(measurement => {
        if (measurement.labelObject) {
          if (measurement.labelObject.material instanceof THREE.SpriteMaterial) {
            measurement.labelObject.material.map?.dispose();
            measurement.labelObject.material.dispose();
          }
          measurementGroupRef.current?.remove(measurement.labelObject);
        }
        
        if (measurement.lineObjects) {
          measurement.lineObjects.forEach(line => {
            line.geometry.dispose();
            (line.material as THREE.Material).dispose();
            measurementGroupRef.current?.remove(line);
          });
        }
        
        if (measurement.pointObjects) {
          measurement.pointObjects.forEach(point => {
            point.geometry.dispose();
            (point.material as THREE.Material).dispose();
            measurementGroupRef.current?.remove(point);
          });
        }
      });
      
      const hoverPoint = measurementGroupRef.current.children.find(
        child => child.name === 'hoverPoint'
      );
      if (hoverPoint) {
        measurementGroupRef.current.remove(hoverPoint);
      }
    }
    
    setMeasurements([]);
    setTemporaryPoints([]);
    currentMeasurementRef.current = null;
  };

  const updateMeasurement = (id: string, data: Partial<Measurement>) => {
    setMeasurements(prevMeasurements => 
      prevMeasurements.map(m => {
        if (m.id === id) {
          const updatedMeasurement = { ...m, ...data };
          
          if (data.visible !== undefined && measurementGroupRef.current) {
            const measObjects = [
              ...(m.pointObjects || []),
              ...(m.lineObjects || []),
              m.labelObject
            ].filter(Boolean);
            
            measObjects.forEach(obj => {
              if (obj) obj.visible = data.visible as boolean;
            });
          }
          
          return updatedMeasurement;
        }
        return m;
      })
    );
  };

  const undoLastPoint = () => {
    if (temporaryPoints.length > 0) {
      const newPoints = temporaryPoints.slice(0, -1);
      setTemporaryPoints(newPoints);
      
      if (measurementGroupRef.current) {
        const lastPoint = measurementGroupRef.current.children.find(
          child => child instanceof THREE.Mesh && 
          child.position.equals(temporaryPoints[temporaryPoints.length - 1].position)
        );
        if (lastPoint) measurementGroupRef.current.remove(lastPoint);
        
        if (currentMeasurementRef.current?.lines.length) {
          const lastLine = currentMeasurementRef.current.lines[currentMeasurementRef.current.lines.length - 1];
          measurementGroupRef.current.remove(lastLine);
          currentMeasurementRef.current.lines.pop();
        }
        
        if (currentMeasurementRef.current?.labels.length) {
          const lastLabel = currentMeasurementRef.current.labels[currentMeasurementRef.current.labels.length - 1];
          measurementGroupRef.current.remove(lastLabel);
          currentMeasurementRef.current.labels.pop();
        }
      }
    }
  };

  const deleteMeasurement = (id: string) => {
    const measurementToDelete = measurements.find(m => m.id === id);
    if (measurementToDelete && measurementGroupRef.current) {
      if (measurementToDelete.labelObject) {
        if (measurementToDelete.labelObject.material instanceof THREE.SpriteMaterial) {
          measurementToDelete.labelObject.material.map?.dispose();
          measurementToDelete.labelObject.material.dispose();
        }
        measurementGroupRef.current.remove(measurementToDelete.labelObject);
      }
      
      if (measurementToDelete.lineObjects) {
        measurementToDelete.lineObjects.forEach(line => {
          line.geometry.dispose();
          (line.material as THREE.Material).dispose();
          measurementGroupRef.current?.remove(line);
        });
      }
      
      if (measurementToDelete.pointObjects) {
        measurementToDelete.pointObjects.forEach(point => {
          point.geometry.dispose();
          (point.material as THREE.Material).dispose();
          measurementGroupRef.current?.remove(point);
        });
      }
      
      setMeasurements(prev => prev.filter(m => m.id !== id));
    }
  };

  const deleteSinglePoint = (measurementId: string, pointIndex: number) => {
    const measurement = measurements.find(m => m.id === measurementId);
    
    if (!measurement || !measurementGroupRef.current) {
      return;
    }
    
    if (measurement.type === 'length' && measurement.points.length <= 2) {
      deleteMeasurement(measurementId);
      toast({
        title: "Messung gelöscht",
        description: "Die Messung wurde gelöscht, da sie mindestens zwei Punkte benötigt.",
      });
      return;
    }
    
    if (measurement.type === 'height' && measurement.points.length <= 2) {
      deleteMeasurement(measurementId);
      toast({
        title: "Messung gelöscht",
        description: "Die Messung wurde gelöscht, da sie mindestens zwei Punkte benötigt.",
      });
      return;
    }
    
    const pointToDelete = measurement.pointObjects?.[pointIndex];
    if (pointToDelete && measurementGroupRef.current) {
      pointToDelete.geometry.dispose();
      (pointToDelete.material as THREE.Material).dispose();
      measurementGroupRef.current.remove(pointToDelete);
    }
    
    setMeasurements(prevMeasurements => 
      prevMeasurements.map(m => {
        if (m.id === measurementId) {
          const updatedPoints = [...m.points];
          updatedPoints.splice(pointIndex, 1);
          
          const updatedPointObjects = [...(m.pointObjects || [])];
          updatedPointObjects.splice(pointIndex, 1);
          
          if (m.lineObjects && measurementGroupRef.current) {
            m.lineObjects.forEach(line => {
              line.geometry.dispose();
              (line.material as THREE.Material).dispose();
              measurementGroupRef.current?.remove(line);
            });
          }
          
          let newLineObjects: THREE.Line[] = [];
          if (updatedPoints.length >= 2) {
            if (m.type === 'length') {
              for (let i = 0; i < updatedPoints.length - 1; i++) {
                const line = createMeasurementLine(
                  [updatedPoints[i].position, updatedPoints[i + 1].position],
                  0x00ff00
                );
                measurementGroupRef.current?.add(line);
                newLineObjects.push(line);
              }
            } else if (m.type === 'height') {
              for (let i = 0; i < updatedPoints.length - 1; i++) {
                const verticalPoint = new THREE.Vector3(
                  updatedPoints[i].position.x,
                  updatedPoints[i + 1].position.y,
                  updatedPoints[i].position.z
                );
                
                const line = createMeasurementLine(
                  [updatedPoints[i].position, verticalPoint, updatedPoints[i + 1].position],
                  0x0000ff
                );
                measurementGroupRef.current?.add(line);
                newLineObjects.push(line);
              }
            }
          }
          
          let newValue = 0;
          let newInclination: number | undefined;
          let newLabelObject: THREE.Sprite | null = null;
          
          if (updatedPoints.length >= 2) {
            if (m.type === 'length') {
              for (let i = 0; i < updatedPoints.length - 1; i++) {
                newValue += calculateDistance(
                  updatedPoints[i].position,
                  updatedPoints[i + 1].position
                );
              }
              
              newInclination = calculateInclination(
                updatedPoints[0].position,
                updatedPoints[1].position
              );
              
              const midPoint = new THREE.Vector3().addVectors(
                updatedPoints[0].position,
                updatedPoints[updatedPoints.length - 1].position
              ).multiplyScalar(0.5);
              midPoint.y += 0.1;
              
              const labelText = formatMeasurementWithInclination(newValue, newInclination);
              newLabelObject = createTextSprite(labelText, midPoint, 0x00ff00);
              
              newLabelObject.userData = {
                isLabel: true,
                baseScale: { x: 0.8, y: 0.4, z: 1 }
              };
              
              if (cameraRef.current) {
                updateLabelScale(newLabelObject, cameraRef.current);
              }
              
              measurementGroupRef.current?.add(newLabelObject);
            } else if (m.type === 'height') {
              newValue = calculateHeight(
                updatedPoints[0].position,
                updatedPoints[updatedPoints.length - 1].position
              );
              
              const midHeight = (
                updatedPoints[0].position.y + 
                updatedPoints[updatedPoints.length - 1].position.y
              ) / 2;
              
              const midPoint = new THREE.Vector3(
                updatedPoints[0].position.x,
                midHeight,
                updatedPoints[0].position.z
              );
              midPoint.x += 0.1;
              
              const labelText = `${newValue.toFixed(2)} ${m.unit}`;
              newLabelObject = createTextSprite(labelText, midPoint, 0x0000ff);
              
              newLabelObject.userData = {
                isLabel: true,
                baseScale: { x: 0.8, y: 0.4, z: 1 }
              };
              
              if (cameraRef.current) {
                updateLabelScale(newLabelObject, cameraRef.current);
              }
              
              measurementGroupRef.current?.add(newLabelObject);
            }
          }
          
          return {
            ...m,
            points: updatedPoints,
            pointObjects: updatedPointObjects,
            lineObjects: newLineObjects,
            labelObject: newLabelObject,
            value: newValue,
            inclination: m.type === 'length' ? newInclination : undefined
          };
        }
        return m;
      })
    );
    
    toast({
      title: "Punkt gelöscht",
      description: "Der Messpunkt wurde erfolgreich gelöscht.",
    });
  };

  const deleteTempPoint = (index: number) => {
    if (temporaryPoints.length > index && measurementGroupRef.current) {
      const newPoints = [...temporaryPoints];
      const removedPoint = newPoints.splice(index, 1)[0];
      setTemporaryPoints(newPoints);
      
      const pointMesh = measurementGroupRef.current.children.find(
        child => child instanceof THREE.Mesh && 
        child.position.equals(removedPoint.position) &&
        child.name.startsWith('point-temp-')
      );
      
      if (pointMesh && pointMesh instanceof THREE.Mesh) {
        pointMesh.geometry.dispose();
        pointMesh.material.dispose();
        measurementGroupRef.current.remove(pointMesh);
      }
      
      if (currentMeasurementRef.current && currentMeasurementRef.current.lines.length > 0) {
        const lastLine = currentMeasurementRef.current.lines[currentMeasurementRef.current.lines.length - 1];
        if (lastLine && measurementGroupRef.current) {
          lastLine.geometry.dispose();
          (lastLine.material as THREE.Material).dispose();
          measurementGroupRef.current.remove(lastLine);
          currentMeasurementRef.current.lines.pop();
        }
      }
    }
  };

  return {
    activeTool,
    setActiveTool,
    measurements,
    temporaryPoints,
    hoveredPointId,
    setHoveredPointId,
    isDraggingPoint,
    setIsDraggingPoint,
    selectedMeasurementId, 
    setSelectedMeasurementId,
    selectedPointIndex,
    setSelectedPointIndex,
    hoverPoint,
    setHoverPoint,
    canUndo,
    setCanUndo,
    draggedPointRef,
    measurementGroupRef,
    raycasterRef,
    mouseRef,
    previousMouseRef,
    currentMeasurementRef,
    addMeasurementPoint,
    finalizeMeasurement,
    updateMeasurementPointPosition,
    clearMeasurements,
    updateMeasurement,
    undoLastPoint,
    deleteMeasurement,
    deleteSinglePoint,
    deleteTempPoint,
    initMeasurementGroup,
    setTemporaryPoints
  };
};
