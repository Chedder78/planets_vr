import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
// REMOVED: GLTFLoader - not used anywhere

const CosmicLandscape = () => {
  const mountRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Initialize scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000b2e, 0.0008);

    // Initialize camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 5, 15);

    // Initialize renderer - NO WebXR for mobile walking
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // REMOVED: renderer.xr.enabled = true - no VR split screen
    mountRef.current.appendChild(renderer.domElement);
    
    // REMOVED: VRButton - no VR mode
    // REMOVED: A-Frame script injection - conflicts with Three.js

    // Post-processing
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5, 0.4, 0.85
    );
    bloomPass.threshold = 0;
    bloomPass.strength = 1.5;
    bloomPass.radius = 0.5;
    composer.addPass(bloomPass);

    // Terrain generation
    const terrainGeometry = new THREE.PlaneGeometry(500, 500, 128, 128);
    
    // Generate heightmap
    const positions = terrainGeometry.attributes.position;
    const heightmap = new Float32Array(positions.count);
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      heightmap[i] = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 5 + Math.random() * 2;
    }
    
    // FIXED: Properly set heightmap as Y displacement
    // The original code was replacing the entire position attribute with height values
    for (let i = 0; i < positions.count; i++) {
      positions.setY(i, heightmap[i]);
    }
    terrainGeometry.computeVertexNormals();
    
    const terrainMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a3f3e,
      roughness: 0.8,
      metalness: 0.1
    });
    
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Water - load texture first
    const waterNormalsTexture = new THREE.TextureLoader().load(
      'https://threejs.org/examples/textures/waternormals.jpg',
      undefined,
      undefined,
      () => console.error('Failed to load water normals texture')
    );
    
    const waterGeometry = new THREE.PlaneGeometry(1000, 1000);
    const water = new Water(waterGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: waterNormalsTexture,
      sunDirection: new THREE.Vector3(0, 1, 0),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: !!scene.fog
    });
    water.rotation.x = -Math.PI / 2;
    water.position.y = 1;
    scene.add(water);

    // Sky
    const sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);

    const skyUniforms = sky.material.uniforms;
    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 50, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    scene.add(directionalLight);

    // Celestial bodies
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = new Float32Array(10000 * 3);
    
    for (let i = 0; i < 10000 * 3; i += 3) {
      starVertices[i] = (Math.random() - 0.5) * 2000;
      starVertices[i+1] = (Math.random() - 0.5) * 2000;
      starVertices[i+2] = (Math.random() - 0.5) * 2000;
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starVertices, 3));
    
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.2,
      transparent: true,
      opacity: 0.8
    });
    
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Gas giant planet
    const gasGiantGeometry = new THREE.SphereGeometry(15, 64, 64);
    const gasGiantMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a86e8,
      roughness: 0.8,
      metalness: 0.2
    });
    const gasGiant = new THREE.Mesh(gasGiantGeometry, gasGiantMaterial);
    gasGiant.position.set(100, 50, -200);
    scene.add(gasGiant);

    // Bioluminescent flora
    const bioluminescentPlants = [];
    const plantGeometry = new THREE.ConeGeometry(0.5, 2, 8);
    const plantMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 0.5
    });

    for (let i = 0; i < 200; i++) {
      const plant = new THREE.Mesh(plantGeometry, plantMaterial.clone()); // Clone material to allow individual control
      plant.position.set(
        (Math.random() - 0.5) * 400,
        0,
        (Math.random() - 0.5) * 400
      );
      plant.rotation.x = Math.random() * Math.PI;
      plant.castShadow = true;
      plant.userData = { interactive: true, baseIntensity: 0.5 + Math.random() * 0.5 };
      scene.add(plant);
      bioluminescentPlants.push(plant);
    }

    // FIXED: Removed XR controller setup - not available without renderer.xr.enabled
    // Instead, use touch/mouse interaction for mobile
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onPointerDown(event) {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      raycaster.setFromCamera(mouse, camera);
      const intersections = raycaster.intersectObjects(bioluminescentPlants);
      
      if (intersections.length > 0) {
        const plant = intersections[0].object;
        if (plant.userData.interactive) {
          plant.material.emissiveIntensity = 2;
          plant.scale.set(1.3, 1.3, 1.3);
        }
      }
    }
    
    function onPointerUp() {
      bioluminescentPlants.forEach(plant => {
        plant.material.emissiveIntensity = plant.userData.baseIntensity;
        plant.scale.set(1, 1, 1);
      });
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // FIXED: Animation loop - no recursive setAnimationLoop
    const clock = new THREE.Clock();
    
    const animate = () => {
      const delta = clock.getDelta();
      
      // Update water
      water.material.uniforms['time'].value += delta * 0.5;
      
      // Animate plants
      bioluminescentPlants.forEach(plant => {
        const baseIntensity = plant.userData.baseIntensity || 0.5;
        plant.material.emissiveIntensity = baseIntensity + Math.sin(clock.elapsedTime * 2 + plant.position.x) * 0.3;
      });
      
      // Rotate gas giant
      gasGiant.rotation.y += delta * 0.05;
      
      // Rotate stars slowly
      stars.rotation.y += delta * 0.01;
      
      // Update composer
      composer.render();
      
      // Update terrain wave effect
      const time = clock.elapsedTime * 0.5;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);
        positions.setY(i, heightmap[i] + Math.sin(x * 0.1 + time) * Math.cos(z * 0.1 + time) * 0.5);
      }
      terrainGeometry.attributes.position.needsUpdate = true;
      terrainGeometry.computeVertexNormals();
    };

    renderer.setAnimationLoop(animate);

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Simulate loading progress
    let loadProgress = 0;
    const progressInterval = setInterval(() => {
      loadProgress += Math.random() * 30;
      if (loadProgress >= 100) {
        loadProgress = 100;
        clearInterval(progressInterval);
        setLoading(false);
      }
      setProgress(loadProgress);
    }, 300);

    // Cleanup
    return () => {
      clearInterval(progressInterval);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.setAnimationLoop(null);
      renderer.dispose();
      if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <>
      <div ref={mountRef} style={{ width: '100%', height: '100vh' }} />
      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '24px',
          fontFamily: 'Arial, sans-serif',
          textAlign: 'center',
          background: 'rgba(0,0,0,0.7)',
          padding: '20px 40px',
          borderRadius: '10px',
          border: '2px solid #4a86e8'
        }}>
          <div style={{ marginBottom: '10px' }}>🌌 Loading cosmic landscape...</div>
          <div style={{
            width: '200px',
            height: '6px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '3px',
            overflow: 'hidden',
            margin: '0 auto'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #4a86e8, #00ff00)',
              transition: 'width 0.3s'
            }} />
          </div>
          <div style={{ marginTop: '10px', fontSize: '14px' }}>{Math.round(progress)}%</div>
        </div>
      )}
    </>
  );
};

export default CosmicLandscape;
