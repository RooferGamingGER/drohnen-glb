
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

export type BackgroundOption = {
  id: string;
  name: string;
  color: string | null;
  texture: string | null;
};

export const backgroundOptions: BackgroundOption[] = [
  { id: 'neutral', name: 'Weiß', color: '#ffffff', texture: null },
  { id: 'dark', name: 'Dunkel', color: '#1d1d1f', texture: null },
  { id: 'gray', name: 'Grau', color: '#404040', texture: null },
];

// Extract camera position from model for better initial view
export const extractCameraPositionFromModel = (box: THREE.Box3): THREE.Vector3 => {
  const size = new THREE.Vector3();
  box.getSize(size);
  
  // Calculate a good distance based on the model's size
  const maxDimension = Math.max(size.x, size.y, size.z);
  const distance = maxDimension * 2.0; // Increased for better visibility
  
  // Position the camera at an angle, adjusted for better initial view
  return new THREE.Vector3(distance, distance * 0.8, distance);
};

// Calculate zoom factor based on distance to model
export const calculateZoomFactor = (camera: THREE.Camera, target: THREE.Vector3, modelSize: number): number => {
  // Get distance to target
  const cameraPosition = new THREE.Vector3().copy(camera.position);
  const distance = cameraPosition.distanceTo(target);
  
  // Calculate minimum movement speed (20% of normal speed)
  const MIN_MOVEMENT_FACTOR = 0.2;
  
  // Calculate a factor based on how close we are to the model
  // The closer we are, the slower the movement should be
  const modelRadius = modelSize * 0.5;
  
  // If we're very close to the model, use the minimum speed
  if (distance < modelRadius * 0.5) {
    return MIN_MOVEMENT_FACTOR;
  }
  
  // Linear interpolation between 1.0 and MIN_MOVEMENT_FACTOR based on distance
  const factor = Math.max(
    MIN_MOVEMENT_FACTOR,
    Math.min(1.0, distance / (modelRadius * 3))
  );
  
  return factor;
};

// Calculate camera pan speed factor based on distance to model
export const calculatePanSpeedFactor = (camera: THREE.Camera, target: THREE.Vector3, modelSize: number): number => {
  // Get distance to target
  const cameraPosition = new THREE.Vector3().copy(camera.position);
  const distance = cameraPosition.distanceTo(target);
  
  // Base speed factor - make it slow for precise control
  const BASE_SPEED = 0.001;
  
  // Calculate a factor based on model size and distance
  // The larger the model or greater the distance, the faster we can pan
  const modelRadius = modelSize * 0.5;
  const distanceFactor = distance / modelRadius;
  
  // Calculate final pan speed with limits
  // Slower when close to model, faster when further away
  const speedFactor = BASE_SPEED * Math.min(Math.max(distanceFactor, 0.5), 2.0);
  
  return speedFactor;
};

// Load GLB model
export const loadGLBModel = (file: File): Promise<THREE.Group> => {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    
    // Add DRACO loader support
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    dracoLoader.setDecoderConfig({ type: 'js' });
    loader.setDRACOLoader(dracoLoader);
    
    const fileURL = URL.createObjectURL(file);

    loader.load(
      fileURL,
      (gltf) => {
        URL.revokeObjectURL(fileURL);
        console.log("Model loaded successfully:", gltf.scene);
        
        // Ensure all materials are properly set up
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            // Make sure materials are visible and properly configured
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(material => {
                  material.needsUpdate = true;
                });
              } else {
                child.material.needsUpdate = true;
              }
            }
          }
        });
        
        resolve(gltf.scene);
      },
      (progress) => {
        console.log("Loading progress:", (progress.loaded / progress.total) * 100);
      },
      (error) => {
        console.error("Error loading model:", error);
        URL.revokeObjectURL(fileURL);
        reject(error);
      }
    );
  });
};

// Center model and adjust camera
export const centerModel = (model: THREE.Object3D): THREE.Box3 => {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  
  // Adjust model position to be centered
  model.position.x = -center.x;
  model.position.y = -center.y;
  model.position.z = -center.z;
  
  // Ensure model is properly positioned in all orientations
  model.updateMatrix();
  model.updateMatrixWorld(true);
  
  return box;
};

// Optimales Zentrieren des Models nach dem Laden oder Orientierungswechsel
export const optimallyCenterModel = (
  model: THREE.Object3D, 
  camera: THREE.Camera, 
  controls: any
): void => {
  console.log("Optimally centering model...");
  
  // Berechne Bounding Box
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = new THREE.Vector3();
  box.getSize(size);
  
  console.log("Model size:", size);
  console.log("Model center:", center);
  
  // Zentriere das Modell an seinem Schwerpunkt
  model.position.x = -center.x;
  model.position.y = -center.y;
  model.position.z = -center.z;
  
  // Berechne die optimale Kameraposition
  const maxDimension = Math.max(size.x, size.y, size.z);
  const distance = maxDimension * 2.0; // Konsistenter Abstand für alle Ansichten
  
  console.log("Using distance:", distance);
  
  // Setze Kamera auf eine einheitliche Position mit gutem Überblick
  camera.position.set(distance, distance * 0.8, distance);
  
  // Setze den Zielpunkt auf den Mittelpunkt des Modells
  if (controls) {
    controls.target.set(0, 0, 0);
    controls.update();
  }
  
  // Aktualisiere die Matrizen
  model.updateMatrix();
  model.updateMatrixWorld(true);
  
  // Stellen Sie sicher, dass sich die Kamera auf das gesamte Modell konzentriert
  if (camera instanceof THREE.PerspectiveCamera) {
    const aspect = camera.aspect;
    const fov = camera.fov * (Math.PI / 180);
    
    // Berechne den erforderlichen Abstand um das gesamte Modell zu sehen
    const requiredDistance = (maxDimension / 2) / Math.tan(fov / 2);
    
    // Setze die Kamera auf einen konsistenten Abstand für alle Ansichten
    // Verwende einen festen Faktor (1.2) um etwas Abstand um das Modell herum zu haben
    const newPosition = camera.position.clone().normalize().multiplyScalar(requiredDistance * 1.2);
    camera.position.copy(newPosition);
    
    console.log("Camera position set to:", camera.position);
    
    if (controls) {
      controls.update();
    }
  }
};

// Create a texture loader
export const loadTexture = (url: string): Promise<THREE.Texture> => {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (texture) => {
        resolve(texture);
      },
      undefined,
      (error) => {
        reject(error);
      }
    );
  });
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// File validation
export const validateFile = (file: File): boolean => {
  // Check file type
  if (!file.name.toLowerCase().endsWith('.glb')) {
    return false;
  }
  
  // Max file size (100MB)
  const maxSize = 100 * 1024 * 1024;
  if (file.size > maxSize) {
    return false;
  }
  
  return true;
};
