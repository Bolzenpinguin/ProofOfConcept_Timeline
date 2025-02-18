<script setup lang="ts">
import * as THREE from "three";
import { onMounted } from "vue";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Actor variables
let actorModel;
const actors = [];
let clickCount = 0;
const maxClicks = 4;
let actorPosition = [];

// Graphics variables
const clock = new THREE.Clock();
let time = 0;


onMounted(() => {
  document.title = "4D-Simulation zur kollaborativen Gestaltung virtueller vibrotaktiler Displays";
  const container = document.getElementById("simulation-container");

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

  let mouseHelper: THREE.MOUSE;
  const position = new THREE.Vector3();

  init();

  /****************************** Functions ********************************/

  function init() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    container.appendChild(renderer.domElement);

    // ********* Model ******** //
    /// TODO: Make file loading better
    const modelPathHeadGLB = "/models/glb/LeePerrySmith.glb";
    const modelPathHeadOBJ = "/models/obj/head.obj"; /// dimensionen noch verbessern

    /*
    * Problem: Wie macht man das mit der Skalierung der Modele, sodass die Actoren dann nicht zu riesig sind?
    * Erstmal weiter mit glb von Bib arbeiten, den rest dann später machen
    * */

    loadModel(modelPathHeadOBJ);

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
          alert("Max clicks reached!");
        }
      }
    });
    window.addEventListener("pointermove", onPointerMove);
  }

  // TODO: Auslagern der Funktion in separaten Dateien zur besseren Übersicht


  function loadModel(modelPath) {
    const extension = modelPath.split('.').pop().toLowerCase();

    if (extension === "obj") {
      const loader = new OBJLoader();
      loader.load(
          modelPath,
          (obj) => {
            obj.traverse((child) => {
              if (child.isMesh) {
                mesh = child;
                mesh.geometry = new THREE.BufferGeometry().copy(child.geometry);
                mesh.geometry.attributes.position = mesh.geometry.attributes.position.clone();
              }
            });

            if (!mesh) {
              alert("No Mesh found in the loaded OBJ model!");
              return;
            }
            scene.add(mesh);
            mesh.scale.multiplyScalar(10); // TODO: Adjust dynamically
          },
          undefined,
          (error) => {
            alert("Error loading OBJ model:");
          }
      );
    } else {
      alert("Unsupported file format");
    }
  }

  function loadActor(actorPath) {
    const extension = actorPath.split('.').pop().toLowerCase();

    if (extension === "obj") {
      const loader = new OBJLoader();
      loader.load(
          actorPath,
          (obj) => {
            actorModel = obj.clone();
          },
          undefined,
          (error) => {
            alert("Error loading actor");
          }
      );
    } else {
      alert("Unsupported actor format:");
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
      alert("Actor model not loaded yet!");
      return;
    }

    position.copy(intersection.point);

    // Offset position of the actor
    position.addScaledVector(intersection.normal, 1);

    const actorClone = actorModel.clone();
    actorClone.position.copy(position);
    actorClone.rotation.copy(mouseHelper.rotation);

    actorClone.scale.set(1, 1, 1); // Scale of the actors
    scene.add(actorClone);
    actors.push(actorClone);

    actorPosition.push(position.clone());

    console.log("Actor placed at:", position);
    console.log("All stored actor positions:", actorPosition);

  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // render function
  function animate() {
    render();
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
  <div id="main-container">
    <div id="simulation-container"></div>
  </div>
</template>

<style scoped>

#main-container {
  display: -ms-flexbox;
}

#simulation-container {
  width: 100%;
  height: 100vh;
}
</style>