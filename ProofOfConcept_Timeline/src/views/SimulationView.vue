<script setup lang="ts">
import * as THREE from "three";
import { onMounted } from "vue";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import GUI from "three/examples/jsm/libs/lil-gui.module.min";

// *************** Global Variables ***************
let actorModel: THREE.Group | undefined;
const channels = ["Channel 1", "Channel 2", "Channel 3", "Channel 4"];
const channelActors: Record<string, THREE.Object3D | null> = {
  "Channel 1": null,
  "Channel 2": null,
  "Channel 3": null,
  "Channel 4": null,
};

const guiSettings = {
  selectedChannel: channels[0],
};

// *************** Main Code ***************
onMounted(() => {
  const container = document.getElementById("three-container");
  if (!container) {
    console.error("Container element not found!");
    return;
  }

  let renderer: THREE.WebGLRenderer;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let meshModel: THREE.Mesh | undefined;
  let raycaster: THREE.Raycaster;
  let line: THREE.Line;

  const intersection = {
    intersects: false,
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(),
  };

  const mouse = new THREE.Vector2();
  const intersects: THREE.Intersection[] = [];

  let mouseHelper: THREE.Mesh;
  const position = new THREE.Vector3();

  let removeActorController: any;

  init();

  function init() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(render);
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 120;
    scene.add(new THREE.AmbientLight(0x666666));

    const dirLight1 = new THREE.DirectionalLight(0xffddcc, 3);
    dirLight1.position.set(1, 0.75, 0.5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xccccff, 3);
    dirLight2.position.set(-1, 0.75, -0.5);
    scene.add(dirLight2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 2;
    controls.maxDistance = Infinity;

    let moved = false;
    controls.addEventListener("change", () => (moved = true));
    window.addEventListener("pointerdown", () => (moved = false));

    raycaster = new THREE.Raycaster();

    mouseHelper = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 10), new THREE.MeshNormalMaterial());
    mouseHelper.visible = false;
    scene.add(mouseHelper);

    const geometry = new THREE.BufferGeometry();
    geometry.setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    line = new THREE.Line(geometry, new THREE.LineBasicMaterial());
    scene.add(line);

    window.addEventListener("resize", onWindowResize);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", (event) => {
      if (!moved) {
        checkIntersection(event.clientX, event.clientY);
        if (intersection.intersects) {
          const channel = guiSettings.selectedChannel;
          if (!channelActors[channel]) {
            placeActor(channel);
            updateRemoveActorButton();
          } else {
            console.log(`Actor already in ${channel}.`);
          }
        }
      }
    });

    loadModel("/models/obj/head.obj");

    const actorModels = {
      Cone: "/actor/actor_cone.obj",
      Cube: "/actor/actor_cube.obj",
      Cylinder: "/actor/actor_cylinder.obj",
      Sphere: "/actor/actor_sphere.obj",
    };

    loadActor(actorModels.Cone); // default Actor Model

    createSettingsPanel(actorModels);
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function onPointerMove(event: MouseEvent) {
    checkIntersection(event.clientX, event.clientY);
  }

  function checkIntersection(x: number, y: number) {
    if (!meshModel) return;

    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = -(y / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    raycaster.intersectObject(meshModel, false, intersects);
    if (intersects.length > 0) {
      const p = intersects[0].point;
      mouseHelper.position.copy(p);
      intersection.point.copy(p);

      const normalMatrix = new THREE.Matrix3().getNormalMatrix(meshModel.matrixWorld);
      const n = intersects[0].face!.normal.clone();
      n.applyNormalMatrix(normalMatrix);
      n.multiplyScalar(10);
      n.add(intersects[0].point);

      intersection.normal.copy(intersects[0].face!.normal);
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

  function loadModel(modelPath: string) {
    const extension = modelPath.split('.').pop()?.toLowerCase();
    if (!extension) return;

    if (extension === "obj") {
      const loader = new OBJLoader();
      loader.load(modelPath, (obj) => {
        obj.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            meshModel = child as THREE.Mesh;
          }
        });
        if (!meshModel) {
          alert("No Mesh found in the loaded OBJ model!");
          return;
        }
        scene.add(obj);
        meshModel.scale.multiplyScalar(8);
      });
    } else {
      alert("Wrong format, only .obj supported");
    }
  }

  function loadActor(actorPath: string) {
    const extension = actorPath.split('.').pop()?.toLowerCase();
    if (!extension) return;

    if (extension === "obj") {
      const loader = new OBJLoader();
      loader.load(actorPath, (obj) => {
        actorModel = obj.clone();
      });
    } else {
      alert("Wrong Format, only .obj supported.");
    }
  }

  function placeActor(channel: string) {
    if (!actorModel) {
      alert("Actor model not loaded yet!");
      return;
    }
    position.copy(intersection.point);

    // Offset position above mesh
    position.addScaledVector(intersection.normal, 0);

    const actorClone = actorModel.clone();
    actorClone.position.copy(position);

    // rotate actors on normales
    const upVector = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(upVector, intersection.normal);
    actorClone.quaternion.copy(quat);

    actorClone.scale.set(1, 1, 1); // scale the actors
    scene.add(actorClone);
    channelActors[channel] = actorClone;
    // TODO Speichern der Positionen der Actors
    console.log(`Actor placed at ${channel} on position:`, position);
  }

  function removeActor(channel: string) {
    if (channelActors[channel]) {
      scene.remove(channelActors[channel]!);
      channelActors[channel] = null;
      // TODO Löschen der Positionen der Actors
      console.log(`Actor removed from ${channel}`);
    }
  }

  function updateRemoveActorButton() {
    if (!removeActorController) return;
    const channel = guiSettings.selectedChannel;
    const hasActor = !!channelActors[channel];
    if (hasActor) {
      removeActorController.enable();
    } else {
      removeActorController.disable();
    }
  }

  function createSettingsPanel(actorModels: Record<string, string>) {
    const panel = new GUI({ width: 310 });

    const channelsFolder = panel.addFolder("Channels");
    channelsFolder.open();

    channelsFolder
        .add(guiSettings, "selectedChannel", channels)
        .name("Select Channel")
        .onChange(() => {
          updateRemoveActorButton();
        });

    const removeActorGUI = {
      removeActor: () => {
        const channel = guiSettings.selectedChannel;
        removeActor(channel);
        updateRemoveActorButton();
      },
    };

    removeActorController = channelsFolder
        .add(removeActorGUI, "removeActor")
        .name("Remove Actor");

    updateRemoveActorButton();

    const actorFolder = panel.addFolder("Actor Models");
    actorFolder.open();

    const modelOptions = Object.keys(actorModels);
    const actorGUIState = { actorModel: modelOptions[0] };

    actorFolder
        .add(actorGUIState, "actorModel", modelOptions)
        .name("Select Actor Model")
        .onChange((modelName: string) => {
          const selectedPath = actorModels[modelName];
          loadActor(selectedPath);
        });
  }

  function render() {
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