/**
 * Explicit derivative loader.
 *
 * The scene loads approved GLB derivatives through a plain three.js
 * `GLTFLoader` with an observable state machine (loading -> ready | failed)
 * instead of a Suspense-throwing hook. Suspense hid two failure modes that a
 * pilot cannot ship with: a load that never settles reads as a blank scene with
 * no reason, and a decode failure surfaces only as a thrown boundary. Here both
 * end up in state the coverage store can report.
 *
 * Results are cached per URL, so one derivative means exactly one network
 * request and one parsed scene shared by every placement.
 */
import { useEffect, useState } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Group } from 'three';

export type DerivativeLoadState =
  | { status: 'loading'; scene: null; error: null }
  | { status: 'ready'; scene: Group; error: null }
  | { status: 'failed'; scene: null; error: string };

const LOADING: DerivativeLoadState = { status: 'loading', scene: null, error: null };

const cache = new Map<string, Promise<Group>>();
const settled = new Map<string, DerivativeLoadState>();

let loader: GLTFLoader | null = null;
function getLoader(): GLTFLoader {
  if (!loader) loader = new GLTFLoader();
  return loader;
}

/** Loads (or reuses) the parsed scene graph for one derivative URL. */
export function loadDerivative(url: string): Promise<Group> {
  const existing = cache.get(url);
  if (existing) return existing;
  const promise = new Promise<Group>((resolve, reject) => {
    getLoader().load(
      url,
      (gltf) => resolve(gltf.scene as unknown as Group),
      undefined,
      (event) => reject(event instanceof Error ? event : new Error(`Failed to load ${url}`)),
    );
  });
  promise
    .then((scene) => settled.set(url, { status: 'ready', scene, error: null }))
    .catch((error: unknown) =>
      settled.set(url, {
        status: 'failed',
        scene: null,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  cache.set(url, promise);
  return promise;
}

export function useDerivativeGltf(url: string | null): DerivativeLoadState {
  const [state, setState] = useState<DerivativeLoadState>(
    () => (url ? settled.get(url) ?? LOADING : LOADING),
  );

  useEffect(() => {
    if (!url) {
      setState(LOADING);
      return;
    }
    const cached = settled.get(url);
    if (cached) {
      setState(cached);
      return;
    }
    let live = true;
    setState(LOADING);
    loadDerivative(url)
      .then((scene) => {
        if (live) setState({ status: 'ready', scene, error: null });
      })
      .catch((error: unknown) => {
        if (live)
          setState({
            status: 'failed',
            scene: null,
            error: error instanceof Error ? error.message : String(error),
          });
      });
    return () => {
      live = false;
    };
  }, [url]);

  return state;
}
