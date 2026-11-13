'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AvatarStatus } from '@/types/echo';
import { cn } from '@/lib/utils';

interface ThreeHoloAvatarProps {
  status: AvatarStatus;
  amplitude?: number; // 0 to 1 from voice audio
  className?: string;
}

/**
 * Creates an anatomical 3D Humanoid Head Geometry
 * with tagged vertex attributes for jaw movement and facial morphing.
 */
function createHumanoidHeadGeometry(): {
  geometry: THREE.BufferGeometry;
  jawIndices: number[];
  basePositions: Float32Array;
} {
  const uSegments = 54;
  const vSegments = 46;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const jawWeights: number[] = []; // 1.0 for lower jaw/chin, 0.0 for cranium/upper face

  for (let j = 0; j <= vSegments; j++) {
    const v = j / vSegments; // 0 (top of head) to 1 (base of neck)
    const theta = (v - 0.5) * Math.PI; // -PI/2 to PI/2

    for (let i = 0; i <= uSegments; i++) {
      const u = i / uSegments; // 0 to 1 around head
      const phi = u * Math.PI * 2; // 0 to 2PI

      // Base sphere coordinate
      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);

      let x = cosTheta * sinPhi;
      let y = sinTheta;
      let z = cosTheta * cosPhi;

      // --- Anatomical Humanoid Facial Sculpting Formulations ---
      // 1. Overall Head Proportion (Ellipsoid: taller than wide, deeper than wide)
      x *= 0.92;
      y *= 1.25;
      z *= 1.05;

      const isFront = z > 0;
      const frontFactor = Math.max(0, z);

      // 2. Forehead & Cranium: broader at top, tapering slightly to temples
      if (y > 0.3) {
        const topTaper = (y - 0.3) / 0.95;
        x *= 1.0 - topTaper * 0.12;
        z *= 1.0 - topTaper * 0.1;
      }

      // 3. Eye Orbit Recesses (y between 0.18 and 0.45, x between 0.2 and 0.6)
      if (isFront && y > 0.15 && y < 0.48) {
        const eyeXDist = Math.abs(x) - 0.42;
        const eyeYDist = y - 0.32;
        const eyeDistSq = eyeXDist * eyeXDist * 5.5 + eyeYDist * eyeYDist * 16.0;
        if (eyeDistSq < 1.0) {
          const orbitDepth = (1.0 - eyeDistSq) * 0.16 * frontFactor;
          z -= orbitDepth;
        }
      }

      // 4. Brow Ridge Prominence (y between 0.38 and 0.52)
      if (isFront && y > 0.36 && y < 0.52) {
        const browFactor = Math.sin(((y - 0.36) / 0.16) * Math.PI) * frontFactor;
        z += browFactor * 0.09;
      }

      // 5. Cheekbone (Zygomatic Arch) Prominence (y between 0.0 and 0.25, lateral x)
      if (isFront && y > -0.05 && y < 0.28) {
        const cheekFactor = Math.sin(((y + 0.05) / 0.33) * Math.PI) * (Math.abs(x) * 0.65);
        x *= 1.0 + cheekFactor * 0.14;
        z += cheekFactor * 0.08 * frontFactor;
      }

      // 6. Nose Bridge & Nose Tip (y between -0.15 and 0.35, centered near x=0)
      if (isFront && Math.abs(x) < 0.32 && y > -0.18 && y < 0.38) {
        const noseXFactor = Math.cos((Math.abs(x) / 0.32) * (Math.PI / 2));
        const noseYFactor = Math.sin(((y + 0.18) / 0.56) * Math.PI);
        const noseProtrusion = noseXFactor * noseYFactor * 0.28;
        z += noseProtrusion;

        // Nose tip refinement at y = -0.08
        if (y > -0.15 && y < 0.02 && Math.abs(x) < 0.18) {
          const tipFactor = Math.cos((x / 0.18) * (Math.PI / 2)) * Math.sin(((y + 0.15) / 0.17) * Math.PI);
          z += tipFactor * 0.12;
        }
      }

      // 7. Philtrum & Upper Lip (y between -0.32 and -0.16)
      if (isFront && y > -0.32 && y < -0.16 && Math.abs(x) < 0.35) {
        const lipXFactor = Math.cos((x / 0.35) * (Math.PI / 2));
        const upperLipFactor = Math.sin(((y + 0.32) / 0.16) * Math.PI) * lipXFactor;
        z += upperLipFactor * 0.11;
      }

      // 8. Lower Lip, Chin & Mandible (y < -0.22)
      let isJawVertex = 0.0;
      if (y < -0.2) {
        const jawProgress = Math.min(1.0, (-y - 0.2) / 0.7);
        isJawVertex = isFront ? Math.min(1.0, jawProgress * (1.0 + frontFactor * 0.5)) : jawProgress * 0.4;

        // Chin projection at y between -0.45 and -0.7
        if (isFront && y > -0.72 && y < -0.42 && Math.abs(x) < 0.28) {
          const chinXFactor = Math.cos((x / 0.28) * (Math.PI / 2));
          const chinYFactor = Math.sin(((y + 0.72) / 0.3) * Math.PI);
          z += chinXFactor * chinYFactor * 0.18;
        }

        // Jawline taper to chin
        if (y > -0.75) {
          const taper = (y + 0.2) / -0.55;
          x *= 1.0 - taper * 0.22;
        }
      }

      // 9. Neck Column (y < -0.75)
      if (y <= -0.75) {
        const neckFactor = (-y - 0.75) / 0.5;
        x *= 0.65 + neckFactor * 0.1;
        z = z * 0.65 - neckFactor * 0.1;
        isJawVertex = 0.0; // Neck stays anchored
      }

      positions.push(x, y, z);
      normals.push(x, y, z); // Initial approximations; will computeVertexNormals
      uvs.push(u, v);
      jawWeights.push(isJawVertex);
    }
  }

  // Construct Index Buffer
  const indices: number[] = [];
  for (let j = 0; j < vSegments; j++) {
    for (let i = 0; i < uSegments; i++) {
      const a = j * (uSegments + 1) + i;
      const b = (j + 1) * (uSegments + 1) + i;
      const c = (j + 1) * (uSegments + 1) + (i + 1);
      const d = j * (uSegments + 1) + (i + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  const posArray = new Float32Array(positions);
  geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
  geometry.setAttribute('jawWeight', new THREE.BufferAttribute(new Float32Array(jawWeights), 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const jawIndices: number[] = [];
  for (let idx = 0; idx < jawWeights.length; idx++) {
    if (jawWeights[idx] > 0.1) {
      jawIndices.push(idx);
    }
  }

  return {
    geometry,
    jawIndices,
    basePositions: new Float32Array(posArray),
  };
}

/**
 * Custom Hologram Shader with Fresnel Edge Glow, Scanlines & Interference
 */
function createHologramMaterial(primaryColor: THREE.Color, secondaryColor: THREE.Color) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: primaryColor },
      uRimColor: { value: secondaryColor },
      uFresnelPower: { value: 2.2 },
      uOpacity: { value: 0.85 },
      uScanlineSpeed: { value: 1.8 },
      uScanlineFreq: { value: 65.0 },
      uNoiseIntensity: { value: 0.06 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uNoiseIntensity;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vWorldPosition;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        
        // Subtle holographic quantum jitter
        vec3 pos = position;
        float jitter = sin(pos.y * 30.0 + uTime * 6.0) * uNoiseIntensity * 0.012;
        pos.x += jitter;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        vViewPosition = -mvPosition.xyz;
        vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform vec3 uRimColor;
      uniform float uFresnelPower;
      uniform float uOpacity;
      uniform float uScanlineSpeed;
      uniform float uScanlineFreq;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vWorldPosition;
      varying vec2 vUv;

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);

        // 1. Fresnel Edge Glow (Classic Sci-Fi Hologram)
        float NdotV = max(0.0, dot(normal, viewDir));
        float fresnel = pow(1.0 - NdotV, uFresnelPower);

        // 2. Vertical Moving Scanlines
        float scanline = sin((vWorldPosition.y + uTime * 0.4) * uScanlineFreq) * 0.5 + 0.5;
        scanline = pow(scanline, 1.4);

        // 3. Grid Lattice Modulation
        float lattice = sin(vUv.x * 120.0) * sin(vUv.y * 120.0);
        lattice = smoothstep(0.4, 0.9, lattice) * 0.15;

        // Composite Final Hologram Shading
        vec3 baseGlow = uColor * (0.35 + scanline * 0.25 + lattice);
        vec3 rimGlow = uRimColor * (fresnel * 1.6);
        vec3 finalColor = baseGlow + rimGlow;

        float alpha = clamp((fresnel * 0.9 + 0.22 + scanline * 0.15) * uOpacity, 0.0, 1.0);
        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

export function ThreeHoloAvatar({ status, amplitude = 0, className }: ThreeHoloAvatarProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef(status);
  const ampRef = useRef(amplitude);

  useEffect(() => {
    statusRef.current = status;
    ampRef.current = amplitude;
  }, [status, amplitude]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- 1. Scene, Camera, WebGL Renderer ---
    const scene = new THREE.Scene();

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.1, 3.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // --- 2. Color Palettes by Avatar Status ---
    const getColors = (st: AvatarStatus) => {
      switch (st) {
        case 'listening':
          return { primary: new THREE.Color(0x10b981), rim: new THREE.Color(0x34d399), light: 0x10b981 };
        case 'thinking':
          return { primary: new THREE.Color(0xa855f7), rim: new THREE.Color(0xe879f9), light: 0xa855f7 };
        case 'speaking':
          return { primary: new THREE.Color(0x00e5ff), rim: new THREE.Color(0x7dd3fc), light: 0x38bdf8 };
        case 'error':
          return { primary: new THREE.Color(0xf43f5e), rim: new THREE.Color(0xfb7185), light: 0xf43f5e };
        case 'idle':
        default:
          return { primary: new THREE.Color(0x00e5ff), rim: new THREE.Color(0x38bdf8), light: 0x00e5ff };
      }
    };

    const initialColors = getColors(statusRef.current);

    // --- 3. Build 3D Humanoid Head Mesh ---
    const { geometry: headGeom, jawIndices, basePositions } = createHumanoidHeadGeometry();
    const holoMaterial = createHologramMaterial(initialColors.primary, initialColors.rim);
    const headMesh = new THREE.Mesh(headGeom, holoMaterial);
    headMesh.position.set(0, 0.15, 0);
    scene.add(headMesh);

    // Wireframe Overlay Layer (Fine Cyber-Tessellation)
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: initialColors.rim,
      wireframe: true,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
    });
    const wireMesh = new THREE.Mesh(headGeom, wireframeMat);
    wireMesh.position.set(0, 0.15, 0);
    scene.add(wireMesh);

    // --- 4. 3D Cybernetic Ocular Lenses (Eyes) ---
    const eyeGroup = new THREE.Group();
    const eyeGeom = new THREE.SphereGeometry(0.082, 24, 24);
    const eyeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const irisMat = new THREE.MeshBasicMaterial({
      color: initialColors.primary,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    const leftEye = new THREE.Mesh(eyeGeom, irisMat);
    leftEye.position.set(-0.38, 0.32, 0.44);
    const rightEye = new THREE.Mesh(eyeGeom, irisMat);
    rightEye.position.set(0.38, 0.32, 0.44);

    const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.038, 16, 16), eyeMat);
    leftPupil.position.set(0, 0, 0.06);
    leftEye.add(leftPupil);

    const rightPupil = new THREE.Mesh(new THREE.SphereGeometry(0.038, 16, 16), eyeMat);
    rightPupil.position.set(0, 0, 0.06);
    rightEye.add(rightPupil);

    eyeGroup.add(leftEye);
    eyeGroup.add(rightEye);
    eyeGroup.position.set(0, 0.15, 0);
    scene.add(eyeGroup);

    // --- 5. 3D Holographic Neural Particle Constellation ---
    const particleCount = 750;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 1.05 + Math.random() * 0.45;
      const sinPhi = Math.sin(phi);
      particlePositions[i * 3] = r * sinPhi * Math.cos(theta) * 0.95;
      particlePositions[i * 3 + 1] = r * Math.cos(phi) * 1.25 + 0.15;
      particlePositions[i * 3 + 2] = r * sinPhi * Math.sin(theta) * 1.05;
      particleSpeeds[i] = 0.4 + Math.random() * 0.8;
    }
    const particleGeom = new THREE.BufferGeometry();
    particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: initialColors.rim,
      size: 0.024,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const particlePoints = new THREE.Points(particleGeom, particleMat);
    scene.add(particlePoints);

    // --- 6. 3D Projector Podium Floor Rings (X-Z plane below head) ---
    const projectorGroup = new THREE.Group();
    projectorGroup.position.set(0, -1.35, 0);

    const ringGeom1 = new THREE.RingGeometry(0.9, 0.92, 64);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: initialColors.primary,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const ringMesh1 = new THREE.Mesh(ringGeom1, ringMat1);
    ringMesh1.rotation.x = Math.PI / 2;
    projectorGroup.add(ringMesh1);

    const ringGeom2 = new THREE.RingGeometry(1.2, 1.22, 64);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: initialColors.rim,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const ringMesh2 = new THREE.Mesh(ringGeom2, ringMat2);
    ringMesh2.rotation.x = Math.PI / 2;
    projectorGroup.add(ringMesh2);

    scene.add(projectorGroup);

    // --- 7. Internal Vocal Resonance Core Light ---
    const vocalLight = new THREE.PointLight(initialColors.light, 1.5, 3.5);
    vocalLight.position.set(0, -0.15, 0.4);
    scene.add(vocalLight);

    const cranialLight = new THREE.PointLight(initialColors.light, 2.0, 4.0);
    cranialLight.position.set(0, 0.6, 0.2);
    scene.add(cranialLight);

    // --- 8. Mouse & Head Interaction Tracking ---
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouse.targetX = Math.max(-1, Math.min(1, nx));
      mouse.targetY = Math.max(-1, Math.min(1, ny));
    };
    window.addEventListener('mousemove', handleMouseMove);

    // --- 9. Resize Observer ---
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 500;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // --- 10. Animation Loop ---
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();
      const currentStatus = statusRef.current;
      const currentAmp = ampRef.current;

      // Update shader uniforms
      holoMaterial.uniforms.uTime.value = elapsedTime;

      // Dynamic Color Interpolation on Status Change
      const targetColors = getColors(currentStatus);
      holoMaterial.uniforms.uColor.value.lerp(targetColors.primary, 0.08);
      holoMaterial.uniforms.uRimColor.value.lerp(targetColors.rim, 0.08);
      wireframeMat.color.lerp(targetColors.rim, 0.08);
      irisMat.color.lerp(targetColors.primary, 0.08);
      particleMat.color.lerp(targetColors.rim, 0.08);
      ringMat1.color.lerp(targetColors.primary, 0.08);
      ringMat2.color.lerp(targetColors.rim, 0.08);
      vocalLight.color.lerp(new THREE.Color(targetColors.light), 0.08);
      cranialLight.color.lerp(new THREE.Color(targetColors.light), 0.08);

      // Smooth Mouse Tracking Rotation
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      // Organic Idle Breathing & Floating Motion
      const floatY = Math.sin(elapsedTime * 1.6) * 0.038;
      const idleTilt = Math.sin(elapsedTime * 0.8) * 0.02;

      headMesh.position.y = 0.15 + floatY;
      wireMesh.position.y = 0.15 + floatY;
      eyeGroup.position.y = 0.15 + floatY;

      const targetRotY = mouse.x * 0.28 + Math.sin(elapsedTime * 0.5) * 0.06;
      const targetRotX = -mouse.y * 0.18 + idleTilt;

      headMesh.rotation.y += (targetRotY - headMesh.rotation.y) * 0.08;
      headMesh.rotation.x += (targetRotX - headMesh.rotation.x) * 0.08;
      wireMesh.rotation.y = headMesh.rotation.y;
      wireMesh.rotation.x = headMesh.rotation.x;
      eyeGroup.rotation.y = headMesh.rotation.y;
      eyeGroup.rotation.x = headMesh.rotation.x;

      // --- Real-time 3D Jaw & Mouth Articulation ---
      const isSpeaking = currentStatus === 'speaking';
      const effectiveAmp = isSpeaking ? Math.max(0.12, Math.min(1.0, currentAmp)) : 0;
      const jawDropAmount = effectiveAmp * 0.16;

      // Update positions buffer for articulated lower jaw
      const posAttr = headGeom.attributes.position;
      const jawAttr = headGeom.attributes.jawWeight;
      const count = posAttr.count;

      for (let i = 0; i < count; i++) {
        const weight = jawAttr.getX(i);
        if (weight > 0.05) {
          const baseY = basePositions[i * 3 + 1];
          const baseZ = basePositions[i * 3 + 2];
          // Displace jaw downwards and slightly backwards around TMJ hinge
          posAttr.setY(i, baseY - jawDropAmount * weight);
          posAttr.setZ(i, baseZ - jawDropAmount * 0.25 * weight);
        }
      }
      posAttr.needsUpdate = true;
      headGeom.computeVertexNormals();

      // Vocal Light Intensity Driven by Amplitude
      vocalLight.intensity = isSpeaking ? 1.0 + effectiveAmp * 3.5 : 0.6;

      // Micro-Blink scale on pupils/eyes
      const blinkCycle = elapsedTime % 4.5;
      const isBlinking = blinkCycle > 4.35;
      const eyeScaleY = isBlinking ? 0.1 : 1.0;
      leftEye.scale.y += (eyeScaleY - leftEye.scale.y) * 0.3;
      rightEye.scale.y += (eyeScaleY - rightEye.scale.y) * 0.3;

      // Orbit Neural Particles
      const rotSpeed = currentStatus === 'thinking' ? 0.015 : 0.003;
      particlePoints.rotation.y += rotSpeed;
      particlePoints.position.y = floatY * 0.5;

      // Rotate Projector Floor Rings
      ringMesh1.rotation.z += 0.005;
      ringMesh2.rotation.z -= 0.003;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      geometryDispose(headGeom);
      geometryDispose(eyeGeom);
      geometryDispose(particleGeom);
      geometryDispose(ringGeom1);
      geometryDispose(ringGeom2);
      materialDispose(holoMaterial);
      materialDispose(wireframeMat);
      materialDispose(eyeMat);
      materialDispose(irisMat);
      materialDispose(particleMat);
      materialDispose(ringMat1);
      materialDispose(ringMat2);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full h-full flex items-center justify-center overflow-hidden', className)}
    />
  );
}

function geometryDispose(g: THREE.BufferGeometry) {
  g.dispose();
}

function materialDispose(m: THREE.Material) {
  m.dispose();
}
