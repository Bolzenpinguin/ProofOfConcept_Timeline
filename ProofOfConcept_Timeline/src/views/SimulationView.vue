<script setup lang="ts">
import * as THREE from 'three';
import { onMounted } from 'vue';

onMounted(() => {
  // Create a Three.js scene
  const scene = new THREE.Scene();

  // Create a camera
  const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
  );
  camera.position.z = 5;

  // Create a WebGL renderer
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Append renderer to the DOM
  document.getElementById('three-container')?.appendChild(renderer.domElement);

  // Create a cube
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  // Animation loop
  const animate = () => {
    requestAnimationFrame(animate);
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
  };

  animate();
});
</script>

<template>
  <div id="three-container"></div>
</template>

<style scoped>
#three-container {
  width: 100%;
  height: 100vh;
}
</style>