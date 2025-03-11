<script setup lang="ts">
import * as THREE from "three";
import { onMounted } from "vue";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import GUI from "three/examples/jsm/libs/lil-gui.module.min";

// *************** TODOs ***************
/*
TODO Websockets
TODO LAden besser hinbekommen
TODO Drag and Drop
TODO Syncen hinbekommen
TODO in vue components auslagern
TODO abgreifen der daten aus ->  <p style="user-select: none">{{currentInstruction ? currentInstruction : "No Instruction"}}</p>
TODO ist in PlaybackVisualization

 */

// *************** Global Variables ***************
let actorModel;
let actorModelName: string = "";
let currentModel = null;
const pathDefaultJSON: string = '/src/json/channelActors_.json';
let colorController;

const channels = ["Channel 0", "Channel 1", "Channel 2", "Channel 3"];
const models = ["UpperBody", "Body"];

const channelActors = {
  "Channel 0": null,
  "Channel 1": null,
  "Channel 2": null,
  "Channel 3": null,
};

const channelPositions = {
  "Channel 0": {
    x: null,
    y: null,
    z: null,
    actorModel: null,
    actorColor: null
  },
  "Channel 1": {
    x: null,
    y: null,
    z: null,
    actorModel: null,
    actorColor: null
  },
  "Channel 2": {
    x: null,
    y: null,
    z: null,
    actorModel: null,
    actorColor: null
  },
  "Channel 3": {
    x: null,
    y: null,
    z: null,
    actorModel: null,
    actorColor: null
  },
};

const actorModels = {
  Cone: "/actor/actor_cone.obj",
  Cube: "/actor/actor_cube.obj",
  Cylinder: "/actor/actor_cylinder.obj",
  Sphere: "/actor/actor_sphere.obj",
};

const modelsPath = {
  UpperBody: "/models/obj/head.obj",
  UpperBodyGLB: "/models/glb/LeePerrySmith.glb",
  Body: "/models/gltf/human/male-mannequin.obj",
}

const guiSettings = {
  selectedModel: models[0],
  selectedChannel: channels[0],
  selectedColor: "#ffffff",
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
  let meshModel: THREE.Mesh;
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
          }
        }
      }
    });

    loadModel(modelsPath.UpperBody); // default Model
    loadActor(actorModels.Cone, "Cone"); // default Actor Model
    createSettingsPanel(actorModels);


    loadActorPositions(pathDefaultJSON); // load and check in local storage JSON
  }

  // *************** Functions ***************

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

    if (currentModel != null) {
      scene.remove(currentModel);
      currentModel = null;
    }

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
        currentModel = obj;
        scene.add(obj);
        meshModel.scale.multiplyScalar(8);
      });
    } else {
      alert("Wrong format, only .obj supported");
    }
  }

  function loadActor(
      actorPath: string,
      modelName: string,
      onLoad?: (loadedObject: THREE.Object3D) => void
  ) {
    const loader = new OBJLoader();
    loader.load(
        actorPath,
        (obj) => {
          // load models at start
          actorModel = obj;
          actorModelName = modelName;

          // load models from JSON 
          if (onLoad) {
            onLoad(obj);
          }
        },
        undefined,
        (error) => {
          console.error("Error loading actor:", error);
        }
    );
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

    // Color of actor
    const actorColor = guiSettings.selectedColor;
    actorClone.traverse((child) => {
      if (child.material) {
        child.material = new THREE.MeshStandardMaterial({color: actorColor});
      }
    })

    scene.add(actorClone);
    channelActors[channel] = actorClone;

    channelPositions[channel] = {
      x: position.x,
      y: position.y,
      z: position.z,
      normals: quat,
      actorModel: actorModelName,
      actorColor: actorColor
    }
    localStorage.setItem("channelActors", JSON.stringify(channelPositions));
  }

  function removeActor(channel: string) {
    if (channelActors[channel]) {
      scene.remove(channelActors[channel]!);
      channelActors[channel] = null;

      channelPositions[channel] = {
        x: null,
        y: null,
        z: null,
        actorModel: null,
        actorColor: null
      }
      // Update local Storage
      localStorage.setItem("channelActors", JSON.stringify(channelPositions));

    }
  }

  // *********************************************************************** AB HIER GUI ***********************************************************************
  // In Zeile 191 wird createSettingsPanel aufgerufen

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

  function downloadJsonFile() {
    const data = localStorage.getItem("channelActors");

    if (!data) {
      alert("No data in localStorage!");
      return;
    }

    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "channelActors.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function createSettingsPanel(actorModels: Record<string, string>) {
    const panel = new GUI({ width: 300 });

    // **** Model Folder ****
    const modelFolder = panel.addFolder("Models");
    modelFolder.open();

    let currentModelSelected = guiSettings.selectedModel;
    let ignoreModelChange = false; // to determine if the model is getting changed
    const modelController = modelFolder
        .add(guiSettings, "selectedModel", models)
        .name("Select Model")
        .onChange((selectedModel) => {
          if (ignoreModelChange) {
            ignoreModelChange = false; // reset the helper
            return;
          }
          if (selectedModel === currentModelSelected) {
            return; // abort
          }
          const actorsPlaced = Object.values(channelActors).some(actor => actor !== null);
          if (actorsPlaced) {
            alert("Model is locked because actors are placed. Please remove actors to change the model.");
            ignoreModelChange = true;
            modelController.setValue(currentModelSelected);
            return;
          }
          currentModelSelected = selectedModel;
          loadModel(modelsPath[selectedModel]);
        });

    // **** Channel Folder ****
    const channelsFolder = panel.addFolder("Channels");
    channelsFolder.open();

    channelsFolder
        .add(guiSettings, "selectedChannel", channels)
        .name("Select Channel")
        .onChange((selectedChannel: string) => {
          const channelData = channelPositions[selectedChannel];
          console.log(localStorage.getItem("channelActors"));

          console.log(channelData);
          // Update the actor color from the loaded JSON if available
          if (channelData && channelData.actorColor) {
            guiSettings.selectedColor = channelData.actorColor;
          } else {
            guiSettings.selectedColor = "#ffffff";
          }
          colorController.updateDisplay();
          updateRemoveActorButton();
        });

    // **** Create Actor Folder ****
    const actorFolder = panel.addFolder("Actor Models");
    actorFolder.open();

    // **** Switch Actor Models ****
    const modelOptions = Object.keys(actorModels);
    const actorGUIState = { actorModel: modelOptions[0] };

    const actorModelController = actorFolder
        .add(actorGUIState, "actorModel", Object.keys(actorModels))
        .name("Select Actor Model")
        .onChange((modelName: string) => {
          const selectedPath = actorModels[modelName];
          loadActor(selectedPath, modelName);
        });

    // **** Change Color ****
    colorController = actorFolder
        .addColor(guiSettings, "selectedColor")
        .name("Select Actor Color")
        .onChange((newColor) => {
          const channel = guiSettings.selectedChannel;
          channelPositions[channel].actorColor = newColor;

          if (channelActors[channel]) {
            channelActors[channel].traverse((child) => {
              if (child.isMesh) {
                child.material.color.set(newColor);
              }
            });
          }
          localStorage.setItem("channelActors", JSON.stringify(channelPositions));
        });

    // **** Delete Placed Actor ****
    const removeActorGUI = {
      removeActor: () => {
        const channel = guiSettings.selectedChannel;
        removeActor(channel);
        updateRemoveActorButton();
      },
    };

    removeActorController = actorFolder
        .add(removeActorGUI, "removeActor")
        .name("Remove Actor");

    updateRemoveActorButton();

    // **** Load Placed Actor ****
    const loadJSON = {
      loadJson: () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";
        input.addEventListener("change", (event: Event) => {
          const target = event.target as HTMLInputElement;
          if (!target.files || target.files.length === 0) {
            return;
          }

          const file = target.files[0];
          const blobURL = URL.createObjectURL(file);
          const reader = new FileReader();
          reader.onload = function (e) {
            try {
              const contents = JSON.parse(e.target?.result as string);
              localStorage.setItem("channelActors", JSON.stringify(contents));
              loadActorPositions(blobURL); // load and place actor from json
            } catch (error) {
              alert("Wrong file!");
            }
          };
          reader.readAsText(file);
        });

        input.click();
      },
    };

    actorFolder
        .add(loadJSON, "loadJson")
        .name("Load Actor Positions");


    // **** Save Position ****
    const saveJSON = {
      downloadJson: () => {
        downloadJsonFile();
      },
    };

    actorFolder
        .add(saveJSON, "downloadJson")
        .name("Save Actor Positions");

  }

  // *********************************************************************** BIS HIER GUI ***********************************************************************





  async function loadActorPositions(path: string) {

    // delete all old actors
    Object.keys(channelActors).forEach((channel) => {
      if (channelActors[channel]) {
        removeActor(channel);
      }
    });

    try {
      const response = await fetch(path); // check if json exits
      const data = await response.json();
      localStorage.setItem("channelActors", JSON.stringify(data)); // loads the data into local storage
      placeActorFromJSON(data);

    } catch (e) {
      // create empty storage if there is no json data
      localStorage.setItem("channelActors", JSON.stringify(channelPositions));
    }
  }

  function placeActorFromJSON(data: any) {
    Object.keys(data).forEach((channel) => {
      const posData = data[channel];
      if (!posData) return; // skip if no data in JSON

        // update channelPositions with JSON
        channelPositions[channel] = {
          x: posData.x,
          y: posData.y,
          z: posData.z,
          actorModel: posData.actorModel,
          actorColor: posData.actorColor,
          normals: posData.normals
        };

      const modelPath = actorModels[posData.actorModel];
      if (!modelPath) {
        console.warn(`No OBJ path for actor model: ${posData.actorModel}`);
        return;
      }

      // load actor models
      loadActor(modelPath, posData.actorModel, (loadedObject) => {
        const actorClone = loadedObject.clone();
        actorClone.position.set(posData.x, posData.y, posData.z);

        // rotate actors on normales -> get value from JSON
        const quats = new THREE.Quaternion(
            posData.normals[0],
            posData.normals[1],
            posData.normals[2],
            posData.normals[3]
        );
        actorClone.quaternion.copy(quats);

        // scale actor
        actorClone.scale.set(1, 1, 1);

        // color actors
        const actorColor = posData.actorColor;
        actorClone.traverse((child) => {
          if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({ color: actorColor });
          }
        });

        // update color in gui
        if (channel === guiSettings.selectedChannel) {
          guiSettings.selectedColor = actorColor;
          colorController.updateDisplay();
        }

        scene.add(actorClone);
        channelActors[channel] = actorClone;

        updateRemoveActorButton();
        removeActorController.updateDisplay();
      });
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

</style>