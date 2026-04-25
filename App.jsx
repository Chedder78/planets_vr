import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// CSS INJECTION - critical for mobile
const injectStyles = () => {
  if (document.getElementById('cosmic-styles')) return;
  const style = document.createElement('style');
  style.id = 'cosmic-styles';
  style.textContent = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #root {
      width: 100%;
      height: 100%;
      overflow: hidden;
      position: fixed;
      top: 0;
      left: 0;
      background: #000;
      touch-action: manipulation;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    }
    canvas {
      display: block;
      width: 100% !important;
      height: 100% !important;
    }
  `;
  document.head.appendChild(style);
};

const CosmicLandscape = () => {
  const mountRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const rendererRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    // Prevent double mount in StrictMode
    if (mountedRef.current) return;
    mountedRef.current = true;
    
    injectStyles();

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000b2e);
    scene.fog = new THREE.FogExp2(0x000b2e, 0.0005);

    // Camera - wider near plane
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.5,  // Increased from 0.1 to prevent clipping
      2000
    );
    camera.position.set(0, 8, 20);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: false 
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // NO renderer.xr - no VR split screen
    
    if (mountRef.current) {
      mountRef.current.innerHTML = ''; // Clear any existing canvas
      mountRef.current.appendChild(renderer.domElement);
    }
    rendererRef.current = renderer;

    // Post-processing
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.0, 0.4, 0.85
    );
    composer.addPass(bloomPass);

    // Terrain - SIMPLE and WORKING
    const terrainGeo = new THREE.PlaneGeometry(500, 500, 100, 100);
    terrainGeo.rotateX(-Math.PI / 2);
    
    const positions = terrainGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const height = Math.sin(x * 0.03) * Math.cos(z * 0.03) * 8 + Math.random() * 3;
      positions.setZ(i, height); // Set Z as height since we rotated
    }
    terrainGeo.computeVertexNormals();
    
    const terrain = new THREE.Mesh(
      terrainGeo,
      new THREE.MeshStandardMaterial({ color: 0x1a3f3e, roughness: 0.8, flatShading: true })
    );
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Simple reflective floor instead of complex water
    const floorGeo = new THREE.PlaneGeometry(1000, 1000);
    floorGeo.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(
      floorGeo,
      new THREE.MeshStandardMaterial({ 
        color: 0x0a2a2a, 
        roughness: 0.3, 
        metalness: 0.8,
        transparent: true,
        opacity: 0.8
      })
    );
    floor.position.y = -1;
    scene.add(floor);

    // Sky - smaller scale
    const sky = new Sky();
    sky.scale.setScalar(5000);
    const sun = new THREE.Vector3();
    sun.setFromSphericalCoords(1, Math.PI / 3, Math.PI / 4);
    sky.material.uniforms['sunPosition'].value.copy(sun);
    sky.material.uniforms['turbidity'].value = 8;
    sky.material.uniforms['rayleigh'].value = 2;
    scene.add(sky);

    // Simple lighting
    scene.add(new THREE.AmbientLight(0x334466, 0.6));
    
    const sunLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    sunLight.position.copy(sun).multiplyScalar(100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    scene.add(sunLight);

    // Stars
    const starsGeo = new THREE.BufferGeometry();
    const starsCount = 2000;
    const starsArr = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i += 3) {
      starsArr[i] = (Math.random() - 0.5) * 1000;
      starsArr[i+1] = Math.random() * 500 + 50;
      starsArr[i+2] = (Math.random() - 0.5) * 1000;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starsArr, 3));
    const stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({ 
      color: 0xffffff, size: 0.5, transparent: true, opacity: 0.8 
    }));
    scene.add(stars);

    // Big planet
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(10, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0x4a86e8, roughness: 0.7 })
    );
    planet.position.set(80, 40, -150);
    scene.add(planet);

    // Glowing plants
    const plants = [];
    const plantGeo = new THREE.ConeGeometry(0.3, 1.5, 6);
    
    for (let i = 0; i < 100; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.3 + Math.random() * 0.3, 1, 0.5),
        emissive: new THREE.Color().setHSL(0.3 + Math.random() * 0.3, 1, 0.3),
        emissiveIntensity: 0.5
      });
      
      const plant = new THREE.Mesh(plantGeo, mat);
      plant.position.set(
        (Math.random() - 0.5) * 200,
        0,
        (Math.random() - 0.5) * 200
      );
      // Place on terrain
      const px = plant.position.x;
      const pz = plant.position.z;
      plant.position.y = Math.sin(px * 0.03) * Math.cos(pz * 0.03) * 8 + Math.random() * 3;
      
      plant.userData = { interactive: true, baseEmissive: 0.5, speed: 1 + Math.random() * 2 };
      scene.add(plant);
      plants.push(plant);
    }

    // Touch/click interaction
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPointerDown = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(plants);
      
      if (hits.length > 0) {
        const plant = hits[0].object;
        plant.material.emissiveIntensity = 2;
        plant.scale.setScalar(1.5);
      }
    };

    const onPointerUp = () => {
      plants.forEach(p => {
        p.material.emissiveIntensity = p.userData.baseEmissive;
        p.scale.setScalar(1);
      });
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // Animation
    const clock = new THREE.Clock();

    const animate = () => {
      const t = clock.getElapsedTime();
      
      plants.forEach(p => {
        p.material.emissiveIntensity = p.userData.baseEmissive + 
          Math.sin(t * p.userData.speed) * 0.3;
      });
      
      planet.rotation.y += 0.003;
      stars.rotation.y += 0.0005;
      
      composer.render();
    };

    renderer.setAnimationLoop(animate);

    // Resize handler
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // Loading simulation
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 20;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setTimeout(() => setLoading(false), 500);
      }
      setProgress(Math.round(p));
    }, 200);

    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.setAnimationLoop(null);
      renderer.dispose();
      mountedRef.current = false;
    };
  }, []);

  return (
    <>
      <div 
        ref={mountRef} 
        style={{ 
          width: '100vw', 
          height: '100vh', 
          position: 'fixed',
          top: 0,
          left: 0,
          overflow: 'hidden'
        }} 
      />
      {loading && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          color: 'white',
          textAlign: 'center',
          background: 'rgba(0,0,20,0.9)',
          padding: '30px 40px',
          borderRadius: '16px',
          border: '2px solid rgba(100,150,255,0.5)',
          fontFamily: 'Arial, sans-serif',
          pointerEvents: 'none'
        }}>
          <div style={{ fontSize: '20px', marginBottom: '16px' }}>🌌 Cosmic Landscape</div>
          <div style={{
            width: '200px',
            height: '4px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #4a86e8, #00ff88)',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
            {progress}%
          </div>
        </div>
      )}
    </>
  );
};

export default CosmicLandscape;
