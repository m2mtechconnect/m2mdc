/**
 * FacilityLighting
 * Industrial lighting rig for the data hall: neutral 4000-5000K ceiling area
 * lights, soft key/fill, and grounded ambient. No cyberpunk tint, no bloom.
 */

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { QualityProfile } from '@/three/qualityProfiles';

interface FacilityLightingProps {
  /** Centre of the data hall, metres. */
  centre: [number, number, number];
  /** Bounding radius of the hall, metres. */
  radius: number;
  profile: QualityProfile;
}

/** ~4300K neutral white for luminaires. */
const LUMINAIRE_COLOR = '#fff2e0';
/** Cool bounce off the raised floor / containment panels. */
const BOUNCE_COLOR = '#c8d4e0';

/**
 * Locally generated environment map (no network fetch, no external HDRI
 * dependency) so reflections work offline and never block the canvas.
 */
function LocalEnvironment({ intensity }: { intensity: number }) {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envScene = new RoomEnvironment();
    const target = pmrem.fromScene(envScene, 0.04);
    scene.environment = target.texture;
    (scene as THREE.Scene & { environmentIntensity?: number }).environmentIntensity = intensity;
    return () => {
      scene.environment = null;
      target.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, intensity]);

  return null;
}

export function FacilityLighting({ centre, radius, profile }: FacilityLightingProps) {
  const [cx, , cz] = centre;
  const ceilingHeight = 5.2;
  const spacing = Math.max(4, radius / 1.5);

  // A small, fixed grid of ceiling luminaires keeps light count bounded.
  const luminaires: Array<[number, number]> = [
    [cx - spacing, cz - spacing],
    [cx + spacing, cz - spacing],
    [cx - spacing, cz + spacing],
    [cx + spacing, cz + spacing],
  ];

  return (
    <>
      {/* Base ambient so nothing crushes to pure black */}
      <ambientLight intensity={0.45} color={BOUNCE_COLOR} />
      <hemisphereLight args={[LUMINAIRE_COLOR, '#41474f', 0.5]} />

      {/* Key light approximating the main ceiling run */}
      <directionalLight
        position={[cx + radius * 0.6, ceilingHeight * 2.4, cz + radius * 0.6]}
        intensity={1.05}
        color={LUMINAIRE_COLOR}
        castShadow={profile.shadows}
        shadow-mapSize={[profile.shadowMapSize, profile.shadowMapSize]}
        shadow-bias={-0.0005}
      />
      {/* Fill from the opposite aisle - shadowless to keep cost down */}
      <directionalLight
        position={[cx - radius * 0.8, ceilingHeight * 1.6, cz - radius * 0.5]}
        intensity={0.35}
        color={BOUNCE_COLOR}
      />

      {/* Ceiling luminaires: emissive panel + local light */}
      {luminaires.map(([lx, lz]) => (
        <group key={`${lx}:${lz}`} position={[lx, ceilingHeight, lz]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.8, 0.5]} />
            <meshBasicMaterial color={LUMINAIRE_COLOR} />
          </mesh>
          <pointLight
            intensity={profile.id === 'low' ? 0.5 : 0.9}
            distance={radius * 1.8}
            decay={2}
            color={LUMINAIRE_COLOR}
          />
        </group>
      ))}

      {/* Environment reflections for metal and glass */}
      {profile.environment && <LocalEnvironment intensity={profile.envIntensity} />}
    </>
  );
}