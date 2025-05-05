import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

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

    // Initialize renderer with WebXR
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    mountRef.current.appendChild(VRButton.createButton(renderer));

    // A-Frame compatibility layer
    const aframeScript = document.createElement('script');
    aframeScript.src = 'https://aframe.io/releases/1.7.0/aframe.min.js';
    document.head.appendChild(aframeScript);

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
    const terrainMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a3f3e,
      displacementScale: 15,
      metalness: 0.1,
      roughness: 0.8
    });
    
    // Generate heightmap
    const heightmap = new Float32Array(terrainGeometry.attributes.position.count);
    for (let i = 0; i < heightmap.length; i++) {
      const x = terrainGeometry.attributes.position.getX(i);
      const z = terrainGeometry.attributes.position.getZ(i);
      heightmap[i] = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 5 + 
                     Math.random() * 2;
    }
    terrainGeometry.setAttribute('position', new THREE.BufferAttribute(heightmap, 1));
    terrainGeometry.computeVertexNormals();
    
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Water
    const waterGeometry = new THREE.PlaneGeometry(1000, 1000);
    const water = new Water(waterGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load('https://threejs.org/examples/textures/waternormals.jpg'),
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: scene.fog !== undefined
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
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.2,
      transparent: true,
      opacity: 0.8
    });

    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
      const x = (Math.random() - 0.5) * 2000;
      const y = (Math.random() - 0.5) * 2000;
      const z = (Math.random() - 0.5) * 2000;
      starVertices.push(x, y, z);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
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
      const plant = new THREE.Mesh(plantGeometry, plantMaterial);
      plant.position.set(
        (Math.random() - 0.5) * 400,
        0,
        (Math.random() - 0.5) * 400
      );
      plant.rotation.x = Math.random() * Math.PI;
      plant.castShadow = true;
      scene.add(plant);
      bioluminescentPlants.push(plant);
    }

    // Controller setup
    const controllerModelFactory = new XRControllerModelFactory();
    const controllers = [];

    function setupControllers() {
      for (let i = 0; i < 2; i++) {
        const controller = renderer.xr.getController(i);
        controller.addEventListener('selectstart', onSelectStart);
        controller.addEventListener('selectend', onSelectEnd);
        scene.add(controller);

        const grip = renderer.xr.getControllerGrip(i);
        grip.add(controllerModelFactory.createControllerModel(grip));
        scene.add(grip);

        controllers.push(controller);
      }
    }

    function onSelectStart(event) {
      const controller = event.target;
      const intersections = getIntersections(controller);
      
      if (intersections.length > 0) {
        const object = intersections[0].object;
        if (object.userData.interactive) {
          object.material.emissiveIntensity = 2;
        }
      }
    }

    function onSelectEnd(event) {
      const controller = event.target;
      const intersections = getIntersections(controller);
      
      if (intersections.length > 0) {
        const object = intersections[0].object;
        if (object.userData.interactive) {
          object.material.emissiveIntensity = 0.5;
        }
      }
    }

    function getIntersections(controller) {
      const tempMatrix = new THREE.Matrix4();
      tempMatrix.identity().extractRotation(controller.matrixWorld);
      
      const raycaster = new THREE.Raycaster();
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
      
      return raycaster.intersectObjects(bioluminescentPlants);
    }

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
      const delta = clock.getDelta();
      
      // Update water
      water.material.uniforms['time'].value += delta * 0.5;
      
      // Animate plants
      bioluminescentPlants.forEach(plant => {
        plant.material.emissiveIntensity = 0.5 + Math.sin(clock.elapsedTime * 2) * 0.5;
      });
      
      // Rotate gas giant
      gasGiant.rotation.y += delta * 0.05;
      
      // Update composer
      composer.render();
      
      renderer.setAnimationLoop(animate);
    };

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Start rendering
    setupControllers();
    animate();
    setLoading(false);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      mountRef.current.removeChild(renderer.domElement);
      renderer.dispose();
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
          fontSize: '24px'
        }}>
          Loading cosmic landscape... {Math.round(progress)}%
        </div>
      )}
    </>
  );
};

export default CosmicLandscape;