'use client';

import React, { useRef, useEffect, useState } from 'react';

interface AssessmentData {
  feasibilityScore?: number;
  potentialWaterCollection?: number;
  recommendedSystem?: {
    tankCapacityLiters?: number;
  };
  propertyDetails?: {
    roofArea?: number;
    roofType?: string;
  };
}

interface ThreeVisualizationProps {
  assessmentData?: AssessmentData;
  onModelLoad?: (model: any) => void;
}

const ThreeVisualization: React.FC<ThreeVisualizationProps> = ({
  assessmentData,
  onModelLoad
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const animationIdRef = useRef<number>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeThreeJS = async () => {
      try {
        if (!containerRef.current) return;

        // Dynamically import Three.js to avoid SSR issues
        const THREE = await import('three');
        
        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f8ff);
        sceneRef.current = scene;

        // Create camera
        const camera = new THREE.PerspectiveCamera(
          75,
          containerRef.current.clientWidth / containerRef.current.clientHeight,
          0.1,
          1000
        );
        camera.position.set(0, 5, 10);

        // Create renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        rendererRef.current = renderer;

        // Add renderer to DOM
        containerRef.current.appendChild(renderer.domElement);

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);

        // Create rainwater harvesting system model
        const systemGroup = new THREE.Group();

        // House base
        const houseGeometry = new THREE.BoxGeometry(8, 3, 6);
        const houseMaterial = new THREE.MeshLambertMaterial({ color: 0x8B7355 });
        const house = new THREE.Mesh(houseGeometry, houseMaterial);
        house.position.set(0, 1.5, 0);
        house.castShadow = true;
        house.receiveShadow = true;
        systemGroup.add(house);

        // Roof
        const roofGeometry = new THREE.ConeGeometry(6, 2, 4);
        const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(0, 4, 0);
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        systemGroup.add(roof);

        // Water tank (size based on assessment data)
        const tankScale = Math.max(0.5, Math.min(2.0, (assessmentData?.recommendedSystem?.tankCapacityLiters || 5000) / 5000));
        const tankGeometry = new THREE.CylinderGeometry(1.5 * tankScale, 1.5 * tankScale, 3 * tankScale, 16);
        const tankMaterial = new THREE.MeshLambertMaterial({
          color: 0x4169E1,
          transparent: true,
          opacity: 0.8
        });
        const tank = new THREE.Mesh(tankGeometry, tankMaterial);
        tank.position.set(5, 1.5 * tankScale, 0);
        tank.castShadow = true;
        systemGroup.add(tank);

        // Water level indicator inside tank
        const waterGeometry = new THREE.CylinderGeometry(1.4 * tankScale, 1.4 * tankScale, 2.8 * tankScale, 16);
        const waterMaterial = new THREE.MeshLambertMaterial({
          color: 0x87CEEB,
          transparent: true,
          opacity: 0.6
        });
        const water = new THREE.Mesh(waterGeometry, waterMaterial);
        water.position.set(5, 1.4 * tankScale, 0);
        systemGroup.add(water);

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

        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        systemGroup.add(ground);

        // Add efficiency indicators based on assessment data
        if (assessmentData?.feasibilityScore) {
          const score = assessmentData.feasibilityScore;
          const color = score > 0.8 ? 0x00ff00 : score > 0.6 ? 0xffff00 : 0xff0000;
          
          // Add glow effect to components based on efficiency
          systemGroup.children.forEach(child => {
            if (child instanceof THREE.Mesh && child.material) {
              (child.material as any).emissive = new THREE.Color(color);
              (child.material as any).emissiveIntensity = 0.1;
            }
          });
        }

        systemGroup.scale.set(0.5, 0.5, 0.5);
        scene.add(systemGroup);

        // Camera controls simulation (basic rotation)
        let rotationSpeed = 0.005;
        
        // Animation loop
        const animate = () => {
          if (!mounted) return;
          
          // Rotate the system slightly for better viewing
          systemGroup.rotation.y += rotationSpeed;
          
          // Animate water level
          const time = Date.now() * 0.001;
          water.position.y = 1.4 * tankScale + Math.sin(time) * 0.1;
          
          renderer.render(scene, camera);
          animationIdRef.current = requestAnimationFrame(animate);
        };

        animate();

        // Handle resize
        const handleResize = () => {
          if (!containerRef.current || !renderer || !camera) return;
          
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;
          
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        };

        window.addEventListener('resize', handleResize);

        if (onModelLoad) {
          onModelLoad(systemGroup);
        }

        setIsLoading(false);

        // Cleanup function
        return () => {
          mounted = false;
          window.removeEventListener('resize', handleResize);
          
          if (animationIdRef.current) {
            cancelAnimationFrame(animationIdRef.current);
          }
          
          if (renderer) {
            renderer.dispose();
          }
          
          // Clean up geometries and materials
          scene.traverse((object: any) => {
            if (object.geometry) {
              object.geometry.dispose();
            }
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach((material: any) => material.dispose());
              } else {
                object.material.dispose();
              }
            }
          });
        };

      } catch (err) {
        console.error('Three.js initialization error:', err);
        setError('Failed to load 3D visualization. Your browser may not support WebGL.');
        setIsLoading(false);
      }
    };

    initializeThreeJS();

    return () => {
      mounted = false;
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [assessmentData, onModelLoad]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg border border-red-200">
        <div className="text-center p-6">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Visualization Error</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Rendering 3D model...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="w-full h-96 rounded-lg overflow-hidden"
      style={{ minHeight: '400px' }}
    />
  );
};

export default ThreeVisualization;