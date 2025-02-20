<script setup lang="ts">
import * as THREE from "three";
import { onMounted } from "vue";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Initialize Actor Models
let actorModel;
const actors = [];

// for the amount of actors placed
let clickCount = 0;
const maxClicks = 4;


const clock = new THREE.Clock();
let time = 0;

onMounted(() => {
  const container = document.getElementById("three-container");

  if (!container) {
    console.error("Container element not found!");
    return;
  }

  let renderer;
  let scene;
  let camera;
  let mesh;
  let raycaster;
  let line;


  const intersection = {
    intersects: false,
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(),
  };

  const mouse = new THREE.Vector2();
  const intersects: THREE.Intersection[] = [];

  const decals = [];
  let mouseHelper: THREE.MOUSE;
  const position = new THREE.Vector3();

  init();

  function init() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(render);
    container.appendChild(renderer.domElement);

    // ********* Model ******** //
    /// TODO: Make file loading better
    const modelPathHeadGLB = "/models/glb/LeePerrySmith.glb";
    const modelPathHeadOBJ = "/models/obj/head.obj"; /// dimensionen noch verbessern

    /*
    * Problem: Wie macht man das mit der Skalierung der Modele, sodass die Actoren dann nicht zu riesig sind?
    * Erstmal weiter mit glb von Bib arbeiten, den rest dann später machen
    * */

    loadModel(modelPathHeadGLB);

    // ********* Actor ******** //

    const actorPath = "/actor/actor.obj"

    loadActor(actorPath);


    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        1,
        1000
    );
    camera.position.z = 120;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 2;
    controls.maxDistance = Infinity;

    scene.add(new THREE.AmbientLight(0x666666));

    const dirLight1 = new THREE.DirectionalLight(0xffddcc, 3);
    dirLight1.position.set(1, 0.75, 0.5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xccccff, 3);
    dirLight2.position.set(-1, 0.75, -0.5);
    scene.add(dirLight2);

    const geometry = new THREE.BufferGeometry();
    geometry.setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);

    line = new THREE.Line(geometry, new THREE.LineBasicMaterial());
    scene.add(line);


    raycaster = new THREE.Raycaster();

    mouseHelper = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 10),
        new THREE.MeshNormalMaterial()
    );
    mouseHelper.visible = false;
    scene.add(mouseHelper);

    window.addEventListener("resize", onWindowResize);

    let moved = false;

    controls.addEventListener("change", () => {
      moved = true;
    });

    window.addEventListener("pointerdown", () => {
      moved = false;
    });

    // Place down actors
    window.addEventListener("pointerup", (event) => {
      if (!moved && clickCount < maxClicks) {
        checkIntersection(event.clientX, event.clientY);

        if (intersection.intersects) {
          shoot();
          clickCount++;
        }

        if (clickCount >= maxClicks) {
          console.log("Max clicks reached!");
        }
      }
    });

    window.addEventListener("pointermove", onPointerMove);


  }

  function loadModel( modelPath) {
    const extension = modelPath.split('.').pop().toLowerCase();

    if (extension === "glb" || extension === "gltf") {
      const loader = new GLTFLoader();
      loader.load(
          modelPath,
          (gltf) => {
            const root = gltf.scene;
            mesh = root.getObjectByProperty("type", "Mesh");
            if (!mesh) {
              console.error("No Mesh found in the loaded GLTF model!");
              return;
            }
            scene.add(root);
            mesh.scale.multiplyScalar(8);
          },
          undefined,
          (error) => {
            console.error("Error loading GLTF model:", error);
          }
      );
    } else if (extension === "obj") {
      const loader = new OBJLoader();
      loader.load(
          modelPath,
          (obj) => {
            obj.traverse((child) => {
              if (child.isMesh) {
                mesh = child;
              }
            });

            if (!mesh) {
              console.error("No Mesh found in the loaded OBJ model!");
              return;
            }
            scene.add(obj);
            mesh.scale.multiplyScalar(1);
          },
          undefined,
          (error) => {
            console.error("Error loading OBJ model:", error);
          }
      );
    } else {
      console.error("Unsupported file format:", extension);
    }
  }

  function loadActor(actorPath) {
    const extension = actorPath.split('.').pop().toLowerCase();

    if (extension === "glb" || extension === "gltf") {
      const loader = new GLTFLoader();
      loader.load(
          actorPath,
          (gltf) => {
            actorModel = gltf.scene.clone();
            actorModel.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });
            console.log("Actor loaded successfully:", actorModel);
          },
          undefined,
          (error) => {
            console.error("Error loading GLTF actor:", error);
          }
      );
    } else if (extension === "obj") {
      const loader = new OBJLoader();
      loader.load(
          actorPath,
          (obj) => {
            actorModel = obj.clone();
            console.log("OBJ actor loaded successfully:", actorModel);
          },
          undefined,
          (error) => {
            console.error("Error loading OBJ actor:", error);
          }
      );
    } else {
      console.log("Unsupported actor format:", extension);
    }
  }

  function onPointerMove(event) {
    checkIntersection(event.clientX, event.clientY);
  }

  function checkIntersection(x, y) {
    if (!mesh) return;

    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = -(y / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    raycaster.intersectObject(mesh, false, intersects);

    if (intersects.length > 0) {
      const p = intersects[0].point;
      mouseHelper.position.copy(p);
      intersection.point.copy(p);

      const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
      const n = intersects[0].face.normal.clone();
      n.applyNormalMatrix(normalMatrix);
      n.multiplyScalar(10);
      n.add(intersects[0].point);

      intersection.normal.copy(intersects[0].face.normal);
      mouseHelper.lookAt(n);

      const positions = line.geometry.attributes.position;
      positions.setXYZ(0, p.x, p.y, p.z);
      positions.setXYZ(1, n.x, n.y, n.z);
      positions.needsUpdate = true;

      intersection.intersects = true;
      intersects.length = 0;
    } else {
      intersection.intersects = false;
    }
  }

  function shoot() {
    if (!mesh || !actorModel) {
      console.error("Actor model not loaded yet!");
      return;
    }
    position.copy(intersection.point);

    // Offset position above mesh
    position.addScaledVector(intersection.normal, 1);

    const actorClone = actorModel.clone();
    actorClone.position.copy(position);
    actorClone.rotation.copy(mouseHelper.rotation); // TODO: Fix Rotation

    actorClone.scale.set(1, 1, 1); // Skalieren der Actoren
    scene.add(actorClone);
    actors.push(actorClone);

    // TODO: -> Speichern der Position in einer Log File
    console.log("Actor placed at:", position);
  }


  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }


  function render() {
   const deltaTime = clock.getDelta();
    time += deltaTime;

    if (mesh) {
      const positionAttribute = mesh.geometry.attributes.position;
      const normalAttribute = mesh.geometry.attributes.normal;
      const vertexArray = positionAttribute.array;
      const normalArray = normalAttribute.array;

      const frequency = 0.01; // Wave frequency
      const amplitude = 0.1; // Wave intensity
      const targetX = 0; // Set your specific coordinate (adjust as needed)
      const targetY = 0;
      const targetZ = 0;
      const radius = 5; // Area of effect (distance threshold)

      for (let i = 0; i < vertexArray.length; i += 3) {
        const x = vertexArray[i];   // X coordinate
        const y = vertexArray[i + 1]; // Y coordinate (height)
        const z = vertexArray[i + 2]; // Z coordinate

        // Calculate distance from the target coordinate
        const distance = Math.sqrt(
            Math.pow(x - targetX, 2) +
            Math.pow(y - targetY, 2) +
            Math.pow(z - targetZ, 2)
        );

        // Apply wave effect only within a specified radius
        if (distance < radius) {
          const waveFactor = amplitude * Math.sin(x * frequency + time) * Math.cos(z * frequency + time);

          // Move the vertex **along its normal direction**
          vertexArray[i] += normalArray[i] * waveFactor * 0.2;
          vertexArray[i + 1] += normalArray[i + 1] * waveFactor;
          vertexArray[i + 2] += normalArray[i + 2] * waveFactor * 0.2;
        }
      }

      mesh.geometry.computeVertexNormals();
      positionAttribute.needsUpdate = true;
    }



    renderer.render(scene, camera);
  }
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