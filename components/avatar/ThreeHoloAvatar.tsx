'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AvatarStatus } from '@/types/echo';
import { cn } from '@/lib/utils';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ThreeHoloAvatarProps {
  status: AvatarStatus;
  amplitude?: number; // 0 to 1 from voice audio
  className?: string;
  modelUrl?: string;
}

// Status-based sci-fi holographic color themes
const STATUS_THEMES: Record<AvatarStatus, { primary: number; rim: number; ambient: number; glow: string }> = {
  idle: {
    primary: 0x00e5ff, // Cyan
    rim: 0x38bdf8,
    ambient: 0x082032,
    glow: 'rgba(0, 229, 255, 0.45)',
  },
  listening: {
    primary: 0x10b981, // Emerald green
    rim: 0x34d399,
    ambient: 0x06281e,
    glow: 'rgba(16, 185, 129, 0.65)',
  },
  thinking: {
    primary: 0xa855f7, // Violet/Purple
    rim: 0xe879f9,
    ambient: 0x200b3b,
    glow: 'rgba(168, 85, 247, 0.7)',
  },
  speaking: {
    primary: 0x38bdf8, // Electric Sky Blue
    rim: 0x7dd3fc,
    ambient: 0x092540,
    glow: 'rgba(56, 189, 248, 0.9)',
  },
  error: {
    primary: 0xf43f5e, // Rose/Red
    rim: 0xfb7185,
    ambient: 0x3b0a14,
    glow: 'rgba(244, 63, 94, 0.8)',
  },
};

export function ThreeHoloAvatar({
  status,
  amplitude = 0,
  className,
  modelUrl = '/avatars/echo-avatar.glb',
}: ThreeHoloAvatarProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef(status);
  const ampRef = useRef(amplitude);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Keep refs synchronized without recreating the scene
  useEffect(() => {
    statusRef.current = status;
    ampRef.current = amplitude;
  }, [status, amplitude]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isMounted = true;
    let animationFrameId: number;

    // --- 1. Scene, Camera, WebGL Renderer ---
    const scene = new THREE.Scene();

    const width = container.clientWidth || 440;
    const height = container.clientHeight || 440;

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
    // Camera positioned at eye level framing head & upper neck
    camera.position.set(0, 0, 0.72);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // --- 2. Timer (Modern Three.js Timer replacing deprecated Clock) ---
    const timer = new THREE.Timer();

    // --- 3. Studio & Holographic Lighting Rig ---
    const initialTheme = STATUS_THEMES[statusRef.current] || STATUS_THEMES.idle;

    // Key Light (crisp studio key light from top-front)
    const keyLight = new THREE.DirectionalLight(0xf0f9ff, 1.4);
    keyLight.position.set(0.3, 0.6, 0.9);
    scene.add(keyLight);

    // Fill Light (cool holographic fill)
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.7);
    fillLight.position.set(-0.5, 0.2, 0.7);
    scene.add(fillLight);

    // Rim / Back Silhouette Light (distinct sci-fi edge glow)
    const rimLight = new THREE.DirectionalLight(initialTheme.rim, 3.8);
    rimLight.position.set(0, 0.6, -0.7);
    scene.add(rimLight);

    // Soft Projector Uplight
    const bottomLight = new THREE.DirectionalLight(initialTheme.primary, 0.6);
    bottomLight.position.set(0, -0.6, 0.3);
    scene.add(bottomLight);

    // Ambient Lighting (balanced contrast)
    const ambientLight = new THREE.AmbientLight(initialTheme.ambient, 1.0);
    scene.add(ambientLight);

    // Vocal Core Internal Light (soft glow scaling with amplitude)
    const vocalLight = new THREE.PointLight(initialTheme.primary, 1.0, 1.5);
    vocalLight.position.set(0, -0.1, 0.3);
    scene.add(vocalLight);

    // --- 4. Hologram Background Particles (Behind Head) ---
    const particleCount = 350;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const r = 0.35 + Math.random() * 0.45;
      particlePositions[i * 3] = Math.cos(theta) * r;
      particlePositions[i * 3 + 1] = (Math.random() - 0.4) * 0.7;
      particlePositions[i * 3 + 2] = -0.15 - Math.random() * 0.5; // Behind the head
    }
    const particleGeom = new THREE.BufferGeometry();
    particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: initialTheme.rim,
      size: 0.008,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });
    const particlePoints = new THREE.Points(particleGeom, particleMat);
    scene.add(particlePoints);

    // --- 5. Projector Floor Rings (Beneath Hologram) ---
    const projectorGroup = new THREE.Group();
    projectorGroup.position.set(0, -0.36, 0);

    const ringGeom1 = new THREE.RingGeometry(0.24, 0.244, 64);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: initialTheme.primary,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const ringMesh1 = new THREE.Mesh(ringGeom1, ringMat1);
    ringMesh1.rotation.x = Math.PI / 2;
    projectorGroup.add(ringMesh1);

    const ringGeom2 = new THREE.RingGeometry(0.32, 0.323, 64);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: initialTheme.rim,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const ringMesh2 = new THREE.Mesh(ringGeom2, ringMat2);
    ringMesh2.rotation.x = Math.PI / 2;
    projectorGroup.add(ringMesh2);

    scene.add(projectorGroup);

    // --- 6. Avatar Rig & Morph Target Animation State ---
    const avatarGroup = new THREE.Group();
    scene.add(avatarGroup);

    interface MorphMesh {
      mesh: THREE.Mesh;
      dict: Record<string, number>;
    }
    const morphMeshes: MorphMesh[] = [];
    const originalMaterials: Array<{ material: THREE.MeshStandardMaterial; mesh: THREE.Mesh }> = [];

    // Current morph target values for smooth spring-like dampening
    const currentMorphs = {
      jawOpen: 0,
      mouthOpen: 0,
      viseme_aa: 0,
      viseme_O: 0,
      eyeBlinkLeft: 0,
      eyeBlinkRight: 0,
      mouthSmileLeft: 0.1,
      mouthSmileRight: 0.1,
      browInnerUp: 0,
    };

    // Load GLTF / GLB Humanoid Avatar Model
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        if (!isMounted) return;

        const model = gltf.scene;

        // Position model so head center (~y: 1.58 in model space) is at (0, 0, 0) in scene
        model.position.set(0, -1.58, 0);
        model.scale.set(1.0, 1.0, 1.0);

        // Process meshes and apply restrained holographic PBR styling
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;

            // Cache morph target dictionaries
            if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
              morphMeshes.push({
                mesh,
                dict: mesh.morphTargetDictionary,
              });
            }

            // Style materials: retain diffuse textures, normals & roughness,
            // but add restrained holographic transparency and emissive tint
            if (mesh.material) {
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              mats.forEach((mat) => {
                if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                  const stdMat = mat as THREE.MeshStandardMaterial;
                  stdMat.transparent = true;
                  stdMat.opacity = 0.96;
                  stdMat.depthWrite = true;
                  stdMat.roughness = Math.max(0.4, stdMat.roughness || 0.6);
                  stdMat.emissive = new THREE.Color(initialTheme.primary);
                  stdMat.emissiveIntensity = 0.04;

                  originalMaterials.push({ material: stdMat, mesh });
                }
              });
            }
          }
        });

        avatarGroup.add(model);
        setIsLoading(false);
      },
      undefined,
      (err) => {
        console.warn('Failed to load humanoid avatar model:', err);
        if (isMounted) {
          setLoadError('Unable to load 3D holographic avatar asset.');
          setIsLoading(false);
        }
      }
    );

    // --- 7. Mouse Cursor Parallax Tracking ---
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouse.targetX = Math.max(-1, Math.min(1, nx));
      mouse.targetY = Math.max(-1, Math.min(1, ny));
    };
    window.addEventListener('mousemove', handleMouseMove);

    // --- 8. Responsive Resize Handling ---
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 440;
      const h = container.clientHeight || 440;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // --- 9. Animation Loop ---
    const animate = (timestamp?: number) => {
      // Update Three.js Timer
      timer.update(timestamp);
      const elapsedTime = timer.getElapsed();

      const currentStatus = statusRef.current;
      const currentAmp = ampRef.current;
      const theme = STATUS_THEMES[currentStatus] || STATUS_THEMES.idle;

      // Dynamic Lighting & Hologram Material Color Interpolation
      const targetRim = new THREE.Color(theme.rim);
      const targetPrimary = new THREE.Color(theme.primary);
      const targetAmbient = new THREE.Color(theme.ambient);

      rimLight.color.lerp(targetRim, 0.08);
      bottomLight.color.lerp(targetPrimary, 0.08);
      ambientLight.color.lerp(targetAmbient, 0.08);
      vocalLight.color.lerp(targetPrimary, 0.08);
      ringMat1.color.lerp(targetPrimary, 0.08);
      ringMat2.color.lerp(targetRim, 0.08);
      particleMat.color.lerp(targetRim, 0.08);

      originalMaterials.forEach(({ material }) => {
        material.emissive.lerp(targetPrimary, 0.08);
      });

      // Smooth Mouse Tracking Rotation
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      // Natural Humanoid Floating & Breathing Micro-motion
      const breathing = Math.sin(elapsedTime * 1.6) * 0.005;
      const idleSway = Math.sin(elapsedTime * 0.9) * 0.015;

      avatarGroup.position.y = breathing;
      const targetRotY = mouse.x * 0.22 + idleSway;
      const targetRotX = -mouse.y * 0.12 + Math.sin(elapsedTime * 0.8) * 0.008;

      avatarGroup.rotation.y += (targetRotY - avatarGroup.rotation.y) * 0.08;
      avatarGroup.rotation.x += (targetRotX - avatarGroup.rotation.x) * 0.08;

      // --- Morph Target Speech & Facial Animation ---
      const isSpeaking = currentStatus === 'speaking';
      const isListening = currentStatus === 'listening';
      const isThinking = currentStatus === 'thinking';

      // Amplitude-driven jaw & mouth opening
      const effectiveAmp = isSpeaking ? Math.max(0.12, Math.min(1.0, currentAmp)) : 0;
      const targetJaw = effectiveAmp * 0.85;
      const targetMouth = effectiveAmp * 0.65;
      const targetVisemeAa = effectiveAmp * 0.45;
      const targetVisemeO = effectiveAmp * 0.35;

      // Natural Blink Cycle (every 4.2 seconds)
      const blinkCycle = elapsedTime % 4.2;
      const isBlinking = blinkCycle > 4.05;
      const targetBlink = isBlinking ? 1.0 : isThinking ? 0.2 : 0.0;

      // Facial Expression by State
      const targetSmile = isSpeaking ? 0.2 : isListening ? 0.15 : 0.08;
      const targetBrow = isListening ? 0.3 : isThinking ? -0.2 : 0.0;

      // Smooth interpolation for morph values
      currentMorphs.jawOpen += (targetJaw - currentMorphs.jawOpen) * 0.25;
      currentMorphs.mouthOpen += (targetMouth - currentMorphs.mouthOpen) * 0.25;
      currentMorphs.viseme_aa += (targetVisemeAa - currentMorphs.viseme_aa) * 0.25;
      currentMorphs.viseme_O += (targetVisemeO - currentMorphs.viseme_O) * 0.25;
      currentMorphs.eyeBlinkLeft += (targetBlink - currentMorphs.eyeBlinkLeft) * 0.4;
      currentMorphs.eyeBlinkRight += (targetBlink - currentMorphs.eyeBlinkRight) * 0.4;
      currentMorphs.mouthSmileLeft += (targetSmile - currentMorphs.mouthSmileLeft) * 0.1;
      currentMorphs.mouthSmileRight += (targetSmile - currentMorphs.mouthSmileRight) * 0.1;
      currentMorphs.browInnerUp += (targetBrow - currentMorphs.browInnerUp) * 0.1;

      // Apply morph values to all rigged meshes
      morphMeshes.forEach(({ mesh, dict }) => {
        if (!mesh.morphTargetInfluences) return;

        const setTarget = (name: string, value: number) => {
          const idx = dict[name];
          if (idx !== undefined && mesh.morphTargetInfluences) {
            mesh.morphTargetInfluences[idx] = Math.max(0, Math.min(1, value));
          }
        };

        setTarget('jawOpen', currentMorphs.jawOpen);
        setTarget('mouthOpen', currentMorphs.mouthOpen);
        setTarget('viseme_aa', currentMorphs.viseme_aa);
        setTarget('viseme_O', currentMorphs.viseme_O);
        setTarget('eyeBlinkLeft', currentMorphs.eyeBlinkLeft);
        setTarget('eyeBlinkRight', currentMorphs.eyeBlinkRight);
        setTarget('mouthSmileLeft', currentMorphs.mouthSmileLeft);
        setTarget('mouthSmileRight', currentMorphs.mouthSmileRight);
        setTarget('browInnerUp', Math.max(0, currentMorphs.browInnerUp));
        setTarget('browDownLeft', Math.max(0, -currentMorphs.browInnerUp));
        setTarget('browDownRight', Math.max(0, -currentMorphs.browInnerUp));
      });

      // Vocal Core Light Pulse Driven by Speech Amplitude
      vocalLight.intensity = isSpeaking ? 1.5 + effectiveAmp * 3.5 : 1.2;

      // Orbit Neural Particle Cloud
      const rotSpeed = isThinking ? 0.012 : 0.003;
      particlePoints.rotation.y += rotSpeed;

      // Rotate Floor Projector Rings
      ringMesh1.rotation.z += 0.004;
      ringMesh2.rotation.z -= 0.003;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    // --- 10. Cleanup ---
    return () => {
      isMounted = false;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      particleGeom.dispose();
      particleMat.dispose();
      ringGeom1.dispose();
      ringMat1.dispose();
      ringGeom2.dispose();
      ringMat2.dispose();
      renderer.dispose();
    };
  }, [modelUrl]);

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full h-full flex items-center justify-center overflow-hidden', className)}
    >
      {/* Loading Placeholder */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 pointer-events-none z-10">
          <RefreshCw className="w-6 h-6 text-echo-cyan animate-spin opacity-80" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-echo-cyan/70">
            INITIALIZING HOLOGRAPHIC MATRIX
          </span>
        </div>
      )}

      {/* Graceful Fallback if 3D Asset Loading Fails */}
      {loadError && (
        <div className="absolute inset-4 flex flex-col items-center justify-center p-4 rounded-2xl bg-echo-surface/90 border border-echo-rose/40 text-center space-y-2 z-20">
          <AlertCircle className="w-8 h-8 text-echo-rose animate-pulse" />
          <p className="text-xs font-mono font-semibold text-echo-rose">{loadError}</p>
          <span className="text-[10px] font-mono text-echo-muted">
            AUDIO & TACTICAL PROTOCOLS REMAIN FULLY OPERATIONAL
          </span>
        </div>
      )}
    </div>
  );
}
