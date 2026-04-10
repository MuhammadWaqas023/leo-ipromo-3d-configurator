import React, {
  useRef, useEffect, useCallback, forwardRef, useImperativeHandle,
} from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

THREE.Cache.enabled = true;

export const ORIGINAL_COLOR = 'original';

const MATTE = { roughness: 0.82, metalness: 0, envMapIntensity: 0.1 };

const Viewer3D = forwardRef(function Viewer3D(
  { glbUrl, color, logoDataUrl, logoPosition, logoScale, onReady, onPlacingChange },
  ref,
) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);
  const decalRef = useRef(null);
  const frameRef = useRef(null);
  const meshesRef = useRef([]);
  const meshDataRef = useRef(new Map());
  const savedHitRef = useRef(null);
  const logoTexRef = useRef(null);
  const logoScaleRef = useRef(logoScale || 1);
  const placingRef = useRef(false);
  const movedRef = useRef(false);
  const lastColorRef = useRef(null);
  const colorMatsRef = useRef(new Set());
  const originalMatsRef = useRef(new Set());
  const needsRenderRef = useRef(false);

  const requestRender = useCallback(() => {
    if (needsRenderRef.current) return;
    needsRenderRef.current = true;
    requestAnimationFrame(() => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        if (controlsRef.current) controlsRef.current.update();
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      needsRenderRef.current = false;
    });
  }, []);

  const disposeObject = useCallback((obj) => {
    if (!obj) return;
    obj.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => {
          if (m.map) m.map.dispose();
          if (m.normalMap) m.normalMap.dispose();
          if (m.roughnessMap) m.roughnessMap.dispose();
          if (m.aoMap) m.aoMap.dispose();
          m.dispose();
        });
      }
    });
  }, []);

  useImperativeHandle(ref, () => ({
    getCanvas: () => rendererRef.current?.domElement || null,
    getRenderer: () => rendererRef.current,
    startPlacement: () => {
      placingRef.current = true;
      if (mountRef.current) mountRef.current.style.cursor = 'crosshair';
      if (onPlacingChange) onPlacingChange(true);
    },
  }));

  useEffect(() => { logoScaleRef.current = logoScale || 1; }, [logoScale]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const W = container.clientWidth || 800;
    const H = container.clientHeight || 600;

    const renderer = new THREE.WebGLRenderer({
      antialias: true, alpha: false, preserveDrawingBuffer: true,
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.75;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1a1a2e');
    const envLoader = new THREE.CubeTextureLoader();
    envLoader.setPath('https://threejs.org/examples/textures/cube/Park3Med/');
    envLoader.load(['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'], (tex) => {
      scene.environment = tex;
      requestRender();
    });
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 200);
    camera.position.set(0, 0.5, 3.2);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 0.8;
    controls.maxDistance = 7;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;
    controls.addEventListener('start', () => { controls.autoRotate = false; });
    controls.addEventListener('end', () => {
      clearTimeout(controls._resumeTimer);
      controls._resumeTimer = setTimeout(() => { controls.autoRotate = true; }, 3000);
    });
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const key = new THREE.DirectionalLight(0xfff5e8, 1.4);
    key.position.set(3, 5, 4); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); scene.add(key);
    const fill = new THREE.DirectionalLight(0xd0e8ff, 0.6);
    fill.position.set(-4, 2, -2); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.25);
    rim.position.set(0, -2, -4); scene.add(rim);
    const back = new THREE.DirectionalLight(0xffffff, 0.4);
    back.position.set(0, 2, -4); scene.add(back);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.ShadowMaterial({ opacity: 0.2 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.8;
    ground.receiveShadow = true;
    scene.add(ground);

    const md = { x: 0, y: 0 };
    function getXY(e) {
      if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }
    function onStart(e) { const p = getXY(e); md.x = p.x; md.y = p.y; movedRef.current = false; }
    function onMove(e) {
      const p = getXY(e);
      if (Math.hypot(p.x - md.x, p.y - md.y) > 6) movedRef.current = true;
    }
    function onEnd(e) {
      if (movedRef.current) return;
      if (!placingRef.current || !logoTexRef.current) return;
      const synth = e.changedTouches
        ? { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY }
        : e;
      handlePlacementClick(synth);
      requestRender();
    }
    renderer.domElement.addEventListener('mousedown', onStart);
    renderer.domElement.addEventListener('mousemove', onMove);
    renderer.domElement.addEventListener('mouseup', onEnd);
    renderer.domElement.addEventListener('touchstart', onStart, { passive: true });
    renderer.domElement.addEventListener('touchmove', onMove, { passive: true });
    renderer.domElement.addEventListener('touchend', onEnd);

    // ── Render loop — switch to demand-based ──
    controls.addEventListener('change', requestRender);
    requestRender();

    const ro = new ResizeObserver(() => {
      const W = container.clientWidth;
      const H = container.clientHeight;
      if (!W || !H) return;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
      requestRender();
    });
    ro.observe(container);

    return () => {
      controls.removeEventListener('change', requestRender);
      clearTimeout(controls._resumeTimer);
      ro.disconnect();
      renderer.domElement.removeEventListener('mousedown', onStart);
      renderer.domElement.removeEventListener('mousemove', onMove);
      renderer.domElement.removeEventListener('mouseup', onEnd);
      renderer.domElement.removeEventListener('touchstart', onStart);
      renderer.domElement.removeEventListener('touchmove', onMove);
      renderer.domElement.removeEventListener('touchend', onEnd);
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);


  function handlePlacementClick(e) {
    const canvas = rendererRef.current?.domElement;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!canvas || !camera || !scene || !meshesRef.current.length) return;
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    scene.updateMatrixWorld(true);
    const rc = new THREE.Raycaster();
    rc.setFromCamera(ndc, camera);
    const hits = rc.intersectObjects(meshesRef.current, false);
    if (!hits.length) return;
    const hit = hits[0];
    savedHitRef.current = {
      mesh: hit.object,
      point: hit.point.clone(),
      normal: hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize(),
    };
    buildDecal();
    exitPlacementMode();
  }

  function exitPlacementMode() {
    placingRef.current = false;
    if (mountRef.current) mountRef.current.style.cursor = '';
    if (onPlacingChange) onPlacingChange(false);
  }

  function autoPlaceDecal() {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!scene || !camera || !meshesRef.current.length) return false;
    scene.updateMatrixWorld(true);
    const rc = new THREE.Raycaster();
    for (const yOff of [0.15, 0.1, 0.2, 0.0, 0.25, -0.05]) {
      rc.setFromCamera(new THREE.Vector2(0, yOff), camera);
      const hits = rc.intersectObjects(meshesRef.current, false);
      if (hits.length) {
        const hit = hits[0];
        savedHitRef.current = {
          mesh: hit.object,
          point: hit.point.clone(),
          normal: hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize(),
        };
        buildDecal();
        return true;
      }
    }
    return false;
  }

  function buildDecal() {
    const scene = sceneRef.current;
    if (!scene || !savedHitRef.current || !logoTexRef.current) return;
    if (decalRef.current) {
      scene.remove(decalRef.current);
      decalRef.current.geometry?.dispose();
      decalRef.current.material?.dispose();
      decalRef.current = null;
    }
    const { mesh, point, normal } = savedHitRef.current;
    const sz = 0.22 * (logoScaleRef.current || 1);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    const euler = new THREE.Euler().setFromQuaternion(quat);
    try {
      const geo = new DecalGeometry(mesh, point, euler, new THREE.Vector3(sz, sz, sz * 3));
      const mat = new THREE.MeshStandardMaterial({
        map: logoTexRef.current, transparent: true, alphaTest: 0.05,
        depthTest: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
        roughness: 0.6, metalness: 0, side: THREE.FrontSide,
      });
      const decal = new THREE.Mesh(geo, mat);
      decal.renderOrder = 1;
      scene.add(decal);
      decalRef.current = decal;
      requestRender();
    } catch (err) { console.warn('[Viewer3D] DecalGeometry failed:', err.message); }
  }

  useEffect(() => {
    if (!glbUrl || !sceneRef.current) return;
    const scene = sceneRef.current;

    if (modelRef.current) {
      scene.remove(modelRef.current);
      disposeObject(modelRef.current);
      modelRef.current = null;
    }
    if (decalRef.current) {
      scene.remove(decalRef.current);
      if (decalRef.current.geometry) decalRef.current.geometry.dispose();
      if (decalRef.current.material) {
        if (decalRef.current.material.map) decalRef.current.material.map.dispose();
        decalRef.current.material.dispose();
      }
      decalRef.current = null;
    }
    meshesRef.current = [];
    meshDataRef.current = new Map();
    savedHitRef.current = null;

    const resolvedUrl = glbUrl.startsWith('/api/') ? `${BASE_URL}${glbUrl}` : glbUrl;

    new GLTFLoader().load(resolvedUrl, (gltf) => {
      const model = gltf.scene;

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const scale = 2.8 / Math.max(size.x, size.y, size.z);
      model.scale.setScalar(scale);
      model.position.copy(center.multiplyScalar(-scale));
      model.position.y += 0.05;

      const meshes = [];
      const initialColor = (color && color !== ORIGINAL_COLOR) ? color : '#808080';

      colorMatsRef.current.clear();
      originalMatsRef.current.clear();

      const materialPool = new Map();
      const originalMaterialPool = new Map();

      model.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true; child.receiveShadow = true;

        const rawMats = Array.isArray(child.material) ? child.material : [child.material];

        const originalMats = rawMats.map(m => {
          if (!originalMaterialPool.has(m.uuid)) {
            const c = m.clone();
            c.roughness = MATTE.roughness;
            c.metalness = MATTE.metalness;
            c.envMapIntensity = MATTE.envMapIntensity;
            originalMaterialPool.set(m.uuid, c);
            originalMatsRef.current.add(c);
          }
          return originalMaterialPool.get(m.uuid);
        });

        const colorMats = rawMats.map(m => {
          if (!materialPool.has(m.uuid)) {
            const c = m.clone();
            c.map = null;
            c.roughness = 0.85;
            c.metalness = 0;
            c.envMapIntensity = 0.1;
            materialPool.set(m.uuid, c);
            colorMatsRef.current.add(c);
          }
          const c = materialPool.get(m.uuid);
          c.color.set(initialColor);
          return c;
        });

        child.material = colorMats.length === 1 ? colorMats[0] : colorMats;

        meshDataRef.current.set(child.uuid, {
          colorMats,
          originalMats: originalMats.length === 1 ? originalMats[0] : originalMats,
        });
        meshes.push(child);
      });

      meshesRef.current = meshes;
      scene.add(model);
      modelRef.current = model;
      scene.updateMatrixWorld(true);

      if (color === ORIGINAL_COLOR) _showOriginal(meshes);
      else if (color) _applyColor(color, meshes);

      if (logoTexRef.current) setTimeout(() => autoPlaceDecal(), 100);
      if (onReady) onReady();
      requestRender();
    }, undefined, (err) => console.error('[Viewer3D] Load error:', err));
  }, [glbUrl]);

  function _applyColor(hexColor, meshOverride) {
    if (!meshOverride && lastColorRef.current === hexColor) return;
    lastColorRef.current = hexColor;

    const targets = meshOverride || meshesRef.current;
    if (!targets?.length) return;

    const uniqueMats = new Set();
    targets.forEach((mesh) => {
      const data = meshDataRef.current.get(mesh.uuid);
      if (!data) return;
      mesh.material = data.colorMats.length === 1 ? data.colorMats[0] : data.colorMats;
    });

    colorMatsRef.current.forEach(m => {
      m.color.set(hexColor);
    });
    requestRender();
  }

  function _showOriginal(meshOverride) {
    const targets = meshOverride || meshesRef.current;
    if (!targets?.length) return;
    targets.forEach((mesh) => {
      const data = meshDataRef.current.get(mesh.uuid);
      if (!data) return;
      mesh.material = data.originalMats;
    });
    requestRender();
  }

  const applyColor = useCallback(_applyColor, []);
  const showOriginal = useCallback(_showOriginal, []);

  useEffect(() => {
    if (!meshesRef.current.length) return;
    if (color === ORIGINAL_COLOR) showOriginal();
    else if (color) applyColor(color);
  }, [color, applyColor, showOriginal]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (logoTexRef.current) {
      logoTexRef.current.dispose();
      logoTexRef.current = null;
    }
    savedHitRef.current = null;
    if (!logoDataUrl) return;

    new THREE.TextureLoader().load(logoDataUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      logoTexRef.current = tex;
      if (meshesRef.current.length) {
        const placed = autoPlaceDecal();
        if (!placed) {
          placingRef.current = true;
          if (mountRef.current) mountRef.current.style.cursor = 'crosshair';
          if (onPlacingChange) onPlacingChange(true);
        }
      }
      requestRender();
    });
  }, [logoDataUrl, requestRender]);

  useEffect(() => {
    logoScaleRef.current = logoScale || 1;
    const timer = setTimeout(() => {
      if (savedHitRef.current && logoTexRef.current) buildDecal();
    }, 40);
    return () => clearTimeout(timer);
  }, [logoScale]);

  useEffect(() => {
    if (!savedHitRef.current || !logoTexRef.current) return;
    const timer = setTimeout(() => {
      const camera = cameraRef.current;
      if (!camera) return;
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();
      const basePoint = savedHitRef.current.point.clone();
      basePoint.addScaledVector(right, (logoPosition?.x || 0) * 0.1);
      basePoint.addScaledVector(up, (logoPosition?.y || 0) * 0.1);
      const origPoint = savedHitRef.current.point;
      savedHitRef.current.point = basePoint;
      buildDecal();
      savedHitRef.current.point = origPoint;
    }, 40);
    return () => clearTimeout(timer);
  }, [logoPosition]);

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100%', minHeight: 0, borderRadius: '12px', overflow: 'hidden' }}
    />
  );
});

export default Viewer3D;