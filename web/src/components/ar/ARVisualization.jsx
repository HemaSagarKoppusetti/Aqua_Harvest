import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import './ARVisualization.css';

const ARVisualization = ({ 
  assessmentData, 
  onModelLoad, 
  onARStart, 
  onAREnd 
}) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const [isARSupported, setIsARSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [model, setModel] = useState(null);

  useEffect(() => {
    initializeAR();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (model && assessmentData) {
      updateModelWithAssessmentData();
    }
  }, [model, assessmentData]);

  const initializeAR = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check WebXR support
      if ('xr' in navigator) {
        const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
        setIsARSupported(isSupported);
      } else {
        setIsARSupported(false);
      }

      // Initialize Three.js scene
      setupScene();
      setupRenderer();
      setupCamera();
      setupLighting();
      await loadRainwaterHarvestingModel();
      
      setIsLoading(false);
    } catch (err) {
      console.error('AR initialization failed:', err);
      setError('Failed to initialize AR. Please ensure your device supports WebXR.');
      setIsLoading(false);
    }
  };

  const setupScene = () => {
    sceneRef.current = new THREE.Scene();
    sceneRef.current.background = new THREE.Color(0xf0f0f0);
  };

  const setupRenderer = () => {
    if (!containerRef.current) return;

    rendererRef.current = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true 
    });
    rendererRef.current.setPixelRatio(window.devicePixelRatio);
    rendererRef.current.setSize(
      containerRef.current.clientWidth, 
      containerRef.current.clientHeight
    );
    rendererRef.current.xr.enabled = true;
    rendererRef.current.shadowMap.enabled = true;
    rendererRef.current.shadowMap.type = THREE.PCFSoftShadowMap;
    
    containerRef.current.appendChild(rendererRef.current.domElement);

    // Add AR button if supported
    if (isARSupported) {
      const arButton = ARButton.createButton(rendererRef.current, {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay', 'light-estimation'],
        domOverlay: { root: containerRef.current }
      });
      
      arButton.addEventListener('click', handleARStart);
      containerRef.current.appendChild(arButton);
    }
  };

  const setupCamera = () => {
    cameraRef.current = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    cameraRef.current.position.set(0, 1.5, 3);
  };

  const setupLighting = () => {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    sceneRef.current.add(ambientLight);

    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    sceneRef.current.add(directionalLight);

    // Point light for better illumination
    const pointLight = new THREE.PointLight(0xffffff, 0.5, 100);
    pointLight.position.set(0, 10, 0);
    sceneRef.current.add(pointLight);
  };

  const loadRainwaterHarvestingModel = async () => {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    loader.setDRACOLoader(dracoLoader);

    try {
      // Create a basic rainwater harvesting system model
      const systemGroup = new THREE.Group();
      
      // House foundation
      const houseGeometry = new THREE.BoxGeometry(8, 3, 6);
      const houseMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
      const house = new THREE.Mesh(houseGeometry, houseMaterial);
      house.position.set(0, 1.5, 0);
      house.castShadow = true;
      house.receiveShadow = true;
      systemGroup.add(house);

      // Roof
      const roofGeometry = new THREE.ConeGeometry(6, 2, 4);
      const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.set(0, 4, 0);
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      systemGroup.add(roof);

      // Water tank
      const tankGeometry = new THREE.CylinderGeometry(1.5, 1.5, 3, 16);
      const tankMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x4169E1,
        transparent: true,
        opacity: 0.8
      });
      const tank = new THREE.Mesh(tankGeometry, tankMaterial);
      tank.position.set(5, 1.5, 0);
      tank.castShadow = true;
      systemGroup.add(tank);

      // Gutters
      const gutterGeometry = new THREE.BoxGeometry(8.5, 0.2, 0.3);
      const gutterMaterial = new THREE.MeshLambertMaterial({ color: 0x708090 });
      
      const gutterFront = new THREE.Mesh(gutterGeometry, gutterMaterial);
      gutterFront.position.set(0, 3.2, 3.2);
      systemGroup.add(gutterFront);
      
      const gutterBack = new THREE.Mesh(gutterGeometry, gutterMaterial);
      gutterBack.position.set(0, 3.2, -3.2);
      systemGroup.add(gutterBack);

      // Downspouts
      const downspoutGeometry = new THREE.BoxGeometry(0.2, 3, 0.2);
      const downspoutMaterial = new THREE.MeshLambertMaterial({ color: 0x708090 });
      
      const downspout1 = new THREE.Mesh(downspoutGeometry, downspoutMaterial);
      downspout1.position.set(4, 1.6, 3.2);
      systemGroup.add(downspout1);
      
      const downspout2 = new THREE.Mesh(downspoutGeometry, downspoutMaterial);
      downspout2.position.set(-4, 1.6, 3.2);
      systemGroup.add(downspout2);

      // Connection pipes
      const pipeGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8);
      const pipeMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
      
      const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
      pipe.position.set(4.75, 0.3, 1.6);
      pipe.rotation.z = Math.PI / 2;
      systemGroup.add(pipe);

      // Ground plane for shadows
      const groundGeometry = new THREE.PlaneGeometry(20, 20);
      const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      systemGroup.add(ground);

      // Add water effect animation
      const waterGeometry = new THREE.CylinderGeometry(1.4, 1.4, 2.8, 16);
      const waterMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x4169E1,
        transparent: true,
        opacity: 0.6
      });
      const water = new THREE.Mesh(waterGeometry, waterMaterial);
      water.position.set(5, 1.4, 0);
      systemGroup.add(water);

      systemGroup.scale.set(0.5, 0.5, 0.5);
      sceneRef.current.add(systemGroup);
      setModel(systemGroup);

      if (onModelLoad) {
        onModelLoad(systemGroup);
      }

      // Start render loop
      animate();

    } catch (err) {
      console.error('Error loading model:', err);
      setError('Failed to load 3D model');
    }
  };

  const updateModelWithAssessmentData = () => {
    if (!model || !assessmentData) return;

    // Update tank size based on recommended system
    const tankMesh = model.children.find(child => 
      child.material && child.material.color.getHex() === 0x4169E1
    );
    
    if (tankMesh && assessmentData.recommendedSystem) {
      const capacity = assessmentData.recommendedSystem.tankCapacityLiters;
      const scale = Math.max(0.5, Math.min(2.0, capacity / 5000));
      tankMesh.scale.set(scale, scale, scale);
    }

    // Add efficiency indicators
    if (assessmentData.feasibilityScore) {
      const score = assessmentData.feasibilityScore;
      const color = score > 0.8 ? 0x00ff00 : score > 0.6 ? 0xffff00 : 0xff0000;
      
      // Update materials based on efficiency
      model.children.forEach(child => {
        if (child.material && child.material.color) {
          child.material.emissive = new THREE.Color(color);
          child.material.emissiveIntensity = 0.1;
        }
      });
    }
  };

  const handleARStart = () => {
    if (onARStart) {
      onARStart();
    }
  };

  const handleAREnd = () => {
    if (onAREnd) {
      onAREnd();
    }
  };

  const animate = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    rendererRef.current.setAnimationLoop(() => {
      // Rotate model slightly for better viewing
      if (model) {
        model.rotation.y += 0.005;
      }

      rendererRef.current.render(sceneRef.current, cameraRef.current);
    });
  };

  const cleanup = () => {
    if (rendererRef.current) {
      rendererRef.current.setAnimationLoop(null);
      rendererRef.current.dispose();
    }
    
    if (sceneRef.current) {
      // Dispose of geometries and materials
      sceneRef.current.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }
  };

  const handleResize = () => {
    if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="ar-visualization-container">
      <div 
        ref={containerRef} 
        className="ar-canvas-container"
        style={{ width: '100%', height: '400px', position: 'relative' }}
      />
      
      {isLoading && (
        <div className="ar-loading-overlay">
          <div className="ar-loading-spinner"></div>
          <p>Loading 3D model...</p>
        </div>
      )}

      {error && (
        <div className="ar-error-overlay">
          <div className="ar-error-message">
            <h3>AR Error</h3>
            <p>{error}</p>
            {!isARSupported && (
              <p className="ar-support-info">
                Your device doesn't support WebXR. You can still view the 3D model.
              </p>
            )}
          </div>
        </div>
      )}

      {!isARSupported && !error && (
        <div className="ar-info-banner">
          <p>
            <strong>Note:</strong> WebXR not supported. Showing 3D preview only.
          </p>
        </div>
      )}

      <div className="ar-controls">
        <div className="ar-info">
          <h4>System Preview</h4>
          {assessmentData && (
            <div className="assessment-info">
              <p>Tank Capacity: {assessmentData.recommendedSystem?.tankCapacityLiters || 0}L</p>
              <p>Feasibility: {((assessmentData.feasibilityScore || 0) * 100).toFixed(1)}%</p>
              <p>Collection Potential: {(assessmentData.potentialWaterCollection || 0).toFixed(0)}L/year</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ARVisualization;