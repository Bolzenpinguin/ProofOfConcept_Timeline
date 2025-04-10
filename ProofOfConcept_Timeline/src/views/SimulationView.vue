<script setup lang="ts">
import * as THREE from "three";
import {onMounted, defineProps, watch} from "vue";
import {OBJLoader} from "three/addons/loaders/OBJLoader.js";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import {CSS2DRenderer, CSS2DObject} from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import {io} from "socket.io-client"

// *************** Code ***************

const clock = new THREE.Clock();

const props = defineProps<{
  currentInstruction: any;
  currentTime: number;
  totalDuration: number;
}>();


watch(() => props.currentInstruction, (newInstruction) => {
  const watchedChannel = newInstruction.setParameter.channels[0];
  const watchedIntensity = newInstruction.setParameter.intensity;
  const actor = channels[watchedChannel];

  animateActor(actor, watchedIntensity);
});

let idOfFrame: number;

function animateActor(actor: string, intensity: number) {
  if (!actor) return;
  if (!channelActors[actor]) return;

  const amplitudeFactor = guiSettings.animationAmplitude;
  const frequenzFactor = guiSettings.animationFrequenz;
  const actorObject = channelActors[actor];

  function animate() {

    if (intensity > 0) {
      // + 1 to push sinus in  => 1,5
      let time = clock.getElapsedTime();
      const normalizedSinus = (Math.sin(time * frequenzFactor) + 1) / 2; // [-1| 1] convert to [0|1]
      let scale = 1 + normalizedSinus * (intensity * amplitudeFactor);
      actorObject.scale.set(scale, scale, scale);
      idOfFrame = requestAnimationFrame(animate);
      console.log(scale)
    } else {
      actorObject.scale.set(1, 1, 1);
      cancelAnimationFrame(idOfFrame);
      actorObject.scale.set(1, 1, 1);
    }
  }
  animate();
}

// *************** Global Variables & Objects ***************
let actorModel: object;
let actorModelName: string;
let currentModel: object;
const pathDefaultJSON: string = '/src/json/channelActors_.json';

let colorController: any;
let removeActorController: any;
let channelFolderController: any;

let channelChangeForWebsocket = false;
let colorChangeForWebsocket = false;


// Drag & Drop
let isDragging = false;
let draggedActor: THREE.Object3D | null = null;
let dragOffset = new THREE.Vector3();

let guiState = {viewingMode: false};

const channels = ["Channel 0", "Channel 1", "Channel 2", "Channel 3"];
const models = ["Neutral_A_Pose", "Neutral_T_Pose", "Female_A_Pose", "Female_T_Pose", "Male_A_Pose", "Male_T_Pose", "Male_Old_A_Pose", "Male_Old_T_Pose"];

const channelActors = {
  "Channel 0": null,
  "Channel 1": null,
  "Channel 2": null,
  "Channel 3": null,
};

// First part is for typescript to know the structure of the object, second part is the object itself
const channelPositions: Record<string, {
  x: number | null;
  y: number | null;
  z: number | null;
  actorModel: string | null;
  actorColor: string | null;
  normals: null,
}> = {
  "Channel 0": {
    x: null,
    y: null,
    z: null,
    actorModel: null,
    actorColor: null,
    normals: null,
  },
  "Channel 1": {
    x: null,
    y: null,
    z: null,
    actorModel: null,
    actorColor: null,
    normals: null,
  },
  "Channel 2": {
    x: null,
    y: null,
    z: null,
    actorModel: null,
    actorColor: null,
    normals: null,
  },
  "Channel 3": {
    x: null,
    y: null,
    z: null,
    actorModel: null,
    actorColor: null,
    normals: null,
  },
};

const actorModels = {
  ERM: "/actor/ERM_scaled.obj",
  LRA: "/actor/LRA_scaled.obj",
};

const modelsPath = {
  Neutral_A_Pose: "/models/obj/mh-neutral-a_pose.obj",
  Neutral_T_Pose: "/models/obj/mh-neutral-t_pose.obj",
  Female_A_Pose: "/models/obj/mh-female-a_pose.obj",
  Female_T_Pose: "/models/obj/mh-female-t_pose.obj",
  Male_A_Pose: "/models/obj/mh-male-a_pose.obj",
  Male_T_Pose: "/models/obj/mh-male-t_pose.obj",
  Male_Old_A_Pose: "/models/obj/mh-male_old-a_pose.obj",
  Male_Old_T_Pose: "/models/obj/mh-male_old-t_pose.obj",
}

const guiSettings = {
  selectedModel: models[0],
  selectedChannel: channels[0],
  selectedColor: "#ff0000",
  animationAmplitude: 1,
  animationFrequenz: 1,
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

  // *************** Label for actor ***************

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth * (1 / 3), window.innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';


  const mouse = new THREE.Vector2();
  const intersects: THREE.Intersection[] = [];

  let mouseHelper: THREE.Mesh;
  const position = new THREE.Vector3();


  // *************** Drag & Drop ***************
  window.addEventListener('pointerdown', (event: MouseEvent) => {

    if (guiState.viewingMode) return;

    const currentChannel = guiSettings.selectedChannel;
    const currentActor = channelActors[currentChannel];
    if (!currentActor) return;

    const mousePos = new THREE.Vector2();
    const rect = container.getBoundingClientRect();
    mousePos.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mousePos.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mousePos, camera);
    const intersectsActors = raycaster.intersectObject(currentActor, true);

    if (intersectsActors.length > 0) {
      controls.enabled = false;
      draggedActor = intersectsActors[0].object.parent || intersectsActors[0].object;
      dragOffset.copy(draggedActor.position).sub(intersectsActors[0].point);
      isDragging = true;
    }
  });

  window.addEventListener('pointermove', (event: MouseEvent) => {
    if (!isDragging || !draggedActor) return;

    const mousePos = new THREE.Vector2();
    const rect = container.getBoundingClientRect();
    mousePos.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mousePos.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mousePos, camera);
    const intersectsMesh = raycaster.intersectObject(meshModel, true);
    if (intersectsMesh.length > 0) {
      const intersect = intersectsMesh[0];
      const offset = new THREE.Vector3(0, 1, 0);
      const newPosition = intersect.point.clone().add(dragOffset).add(offset);
      draggedActor.position.copy(newPosition);

      if (intersect.face) {
        const faceNormal = intersect.face.normal.clone();
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(meshModel.matrixWorld);
        faceNormal.applyMatrix3(normalMatrix).normalize();

        const upVector = new THREE.Vector3(0, 1, 0);
        const quat = new THREE.Quaternion().setFromUnitVectors(upVector, faceNormal);
        draggedActor.quaternion.copy(quat);
      }

      // prepared and send data then actor is placed for the first time
      const channel = guiSettings.selectedChannel;
      const updateData = {
        channel: channel,
        position: {
          x: draggedActor.position.x,
          y: draggedActor.position.y,
          z: draggedActor.position.z,
        },
        normals: [
          draggedActor.quaternion.x,
          draggedActor.quaternion.y,
          draggedActor.quaternion.z,
          draggedActor.quaternion.w,
        ],
        actorModel: actorModelName,
        actorColor: guiSettings.selectedColor,
      };
      socket.emit("send-actor-placement", JSON.stringify(updateData));
    }
  });

  window.addEventListener('pointerup', (event: MouseEvent) => {
    if (isDragging && draggedActor) {
      isDragging = false;
      const channel = guiSettings.selectedChannel;
      const updateData = {
        channel: channel,
        position: {
          x: draggedActor.position.x,
          y: draggedActor.position.y,
          z: draggedActor.position.z,
        },
        normals: [
          draggedActor.quaternion.x,
          draggedActor.quaternion.y,
          draggedActor.quaternion.z,
          draggedActor.quaternion.w
        ],
        actorModel: actorModelName,
        actorColor: guiSettings.selectedColor
      };

      // Update channelPositions local storage
      channelPositions[channel] = updateData;
      localStorage.setItem('channelActors', JSON.stringify(channelPositions));

      // send updatet data if actor is moved 
      socket.emit('send-actor-placement', JSON.stringify(updateData));

      draggedActor = null;
      controls.enabled = true;
    }
  });

  // *************** Render & Setup ***************
  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth * (1 / 3), window.innerHeight);
  renderer.setAnimationLoop(render);
  // label stuff
  container.appendChild(renderer.domElement);
  labelRenderer.domElement.style.zIndex = '1';
  container.appendChild(labelRenderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, (window.innerWidth) / (window.innerHeight), 1, 1000);
  camera.position.z = 300;

  scene.add(new THREE.AmbientLight(0xffffff));

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 3);
  dirLight1.position.set(1, 0.75, 0.5);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 3);
  dirLight2.position.set(-1, 0.75, -0.5);
  scene.add(dirLight2);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 2;
  controls.maxDistance = 400;

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
  window.addEventListener("pointerup", (event: MouseEvent) => {
    if (isDragging && draggedActor) {
      isDragging = false;
      const channel = guiSettings.selectedChannel;
      const updateData = {
        channel: channel,
        position: {
          x: draggedActor.position.x,
          y: draggedActor.position.y,
          z: draggedActor.position.z,
        },
        normals: [
          draggedActor.quaternion.x,
          draggedActor.quaternion.y,
          draggedActor.quaternion.z,
          draggedActor.quaternion.w
        ],
        actorModel: actorModelName,
        actorColor: guiSettings.selectedColor
      };

      // Update channelPositions in localStorage
      channelPositions[channel] = updateData;
      localStorage.setItem("channelActors", JSON.stringify(channelPositions));
      socket.emit("send-actor-placement", JSON.stringify(updateData));

      // Reset Drag & Drop
      draggedActor = null;
      controls.enabled = true;
    }

    if (!guiState.viewingMode && !moved) {
      checkIntersection(event.clientX, event.clientY);
      const channel = guiSettings.selectedChannel;
      if (intersection.intersects  && !channelActors[channel]) {
        placeActor(channel);
        updateRemoveActorButton();
      }
    }
  });

  loadModel(modelsPath.Neutral_A_Pose); // default Model
  loadActor(actorModels.ERM, "ERM"); // default Actor Model
  createSettingsPanel(actorModels);

  loadActorPositions(pathDefaultJSON); // load and check in local storage JSON
  onWindowResize();


  // *************** Server Websocket ***************

  const socket = io("http://localhost:3000");
  socket.on("connect", () => {
    //console.log(`You connected with ID: ${socket.id}`)
  })

  socket.on("channel-change", (data) => {
    //console.log(data.channel);
    channelChangeForWebsocket = true;
    guiSettings.selectedChannel = data.channel;
    channelFolderController.setValue(data.channel);
    channelFolderController.updateDisplay();
    //console.log(data.channel);
  });

  socket.on("color-change", (data) => {
    //console.log(data);
    colorChangeForWebsocket = true;
    guiSettings.selectedColor = data.color;
    colorController.setValue(data.color);
    channelFolderController.updateDisplay();
  })

  // receive and place the actor from different clients
  socket.on("receive-actor-placement", (jsondata) => {
    const data = JSON.parse(jsondata);
    const channel = data.channel;
    // if actor already placed -> sent to new postion
    if (channelActors[channel]) {
      channelActors[channel].position.set(
          data.position.x,
          data.position.y,
          data.position.z
      );
      channelActors[channel].quaternion.set(
          data.normals[0],
          data.normals[1],
          data.normals[2],
          data.normals[3]
      );
    } else {
      placeActorFromJSON(data);
    }
  });

  socket.on("receive-actor-remove", (jsondata) => {
    const data = JSON.parse(jsondata);

    scene.children.slice().forEach(child => {
      if (child.name && child.name.includes(data.channel)) {
        child.traverse(obj => {
          if (obj instanceof CSS2DObject) {
            obj.element.remove();
            obj.removeFromParent();
          }
          if (obj.geometry) {
            obj.geometry.dispose();
          }
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach(material => material.dispose());
            } else {
              obj.material.dispose();
            }
          }
        });
        scene.remove(child);
      }
    });

    channelActors[data.channel] = null;
    channelPositions[data.channel] = {
      x: null,
      y: null,
      z: null,
      actorModel: null,
      actorColor: null,
      normals: null,
    };

    localStorage.setItem("channelActors", JSON.stringify(channelPositions));

  });

  // *************** Functions ***************

  function onWindowResize() {
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    camera.aspect = containerWidth / containerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(containerWidth, containerHeight);
  }

  function onPointerMove(event: MouseEvent) {
    checkIntersection(event.clientX, event.clientY);
  }

  function checkIntersection(x: number, y: number) {
    if (!meshModel) return;

    const rect = container.getBoundingClientRect();
    mouse.x = ((x - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((y - rect.top) / rect.height) * 2 + 1;
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
        meshModel.scale.multiplyScalar(10);
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
    actorClone.name = `${channel}`;
    actorClone.position.copy(position);

    console.log(actorClone);

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
    });

    const labelDiv = document.createElement('div');
    labelDiv.className = 'actor-label';
    labelDiv.textContent = channel.split(" ")[1]; // Label shows channel number
    const labelObject = new CSS2DObject(labelDiv);
    labelObject.position.set(0, 7, 0); //offset
    actorClone.add(labelObject);

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

    // send it to server
    socket.emit("send-actor-placement", JSON.stringify(channelPositions));
  }

  function removeActor(channel: string) {
    const actor = channelActors[channel];
    // remove the label
    if (actor) {

      console.log(channel);

      scene.children.slice().forEach(child => {
        if (child.name && child.name.includes(channel)) {
          child.traverse(obj => {
            if (obj instanceof CSS2DObject) {
              obj.element.remove();
              obj.removeFromParent();
            }
            if (obj.geometry) {
              obj.geometry.dispose();
            }
            if (obj.material) {
              if (Array.isArray(obj.material)) {
                obj.material.forEach(material => material.dispose());
              } else {
                obj.material.dispose();
              }
            }
          });
          scene.remove(child);
        }
      });
      
      scene.remove(actor);
      channelActors[channel] = null;

      channelPositions[channel] = {
        x: null,
        y: null,
        z: null,
        actorModel: null,
        actorColor: null,
        normals: null,
      };
      // Update local Storage
      localStorage.setItem("channelActors", JSON.stringify(channelPositions));
      // send it to server
      socket.emit("send-actor-remove", JSON.stringify({channel: channel}));
      updateRemoveActorButton();
    }
  }

  // ******************** AB HIER GUI ********************
  // In Zeile 191 wird createSettingsPanel aufgerufen

  function updateRemoveActorButton() {
    if (!removeActorController) return;
    const channel = guiSettings.selectedChannel;
    const hasActor = !!channelActors[channel];

    if (hasActor && !guiState.viewingMode) {
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

    const blob = new Blob([data], {type: "application/json"});
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
    const simuID = document.getElementById("simuGUI");
    const panel = new GUI({container: simuID, width: 450});

    // *** Mode Folder ***
    const modeFolder = panel.addFolder("Mode");
    modeFolder.close();
    modeFolder
        .add(guiState, "viewingMode")
        .name("Toggle Viewing Modus")
        .onChange((isViewing) => {
          guiState.viewingMode = isViewing;
          updateViewingMode(isViewing);
        });
    // **** Model Folder ****
    const modelFolder = panel.addFolder("Models");
    modelFolder.close();

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
            return;
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
    channelsFolder.close();

    channelFolderController = channelsFolder
        .add(guiSettings, "selectedChannel", channels)
        .name("Select Channel")
        .onChange((selectedChannel: string) => {
          const channelData = channelPositions[selectedChannel];

          // Update the actor color from the loaded JSON if available
          if (channelData && channelData.actorColor) {
            guiSettings.selectedColor = channelData.actorColor;
          } else {
            guiSettings.selectedColor = "#ff0000";
          }
          colorController.updateDisplay();
          updateRemoveActorButton();
          //console.log(selectedChannel);
          if (!channelChangeForWebsocket) {
            socket.emit("channel-change", {channel: selectedChannel});
          } else {
            channelChangeForWebsocket = false;
          }
        });

    // **** Create Actor Folder ****
    const actorFolder = panel.addFolder("Actor Models");
    actorFolder.close();

    // **** Switch Actor Models ****
    const modelOptions = Object.keys(actorModels);
    const actorGUIState = {actorModel: modelOptions[0]};

    const actorModelController = actorFolder
        .add(actorGUIState, "actorModel", Object.keys(actorModels))
        .name("Select Actor Model")
        .onChange((modelName: string) => {
          const selectedPath = actorModels[modelName];
          loadActor(selectedPath, modelName);
        });

    // *** Amplitude Strength ***
    const animationAmplitudeController = actorFolder
        .add(guiSettings, "animationAmplitude", 1, 20, 1)
        .name("Select Animation Amplitude Multipler")
        .onChange((multipler: number) => {
          console.log(multipler);
        });

    // *** Frequenz Strength ***
    const animationFrequenzController = actorFolder
        .add(guiSettings, "animationFrequenz", 1, 20, 1)
        .name("Select Animation Frequenz Multipler")
        .onChange((multipler: number) => {
          console.log(multipler);
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
                if (!colorChangeForWebsocket) {
                  socket.emit('color-change', { color: newColor });
                } else {
                  colorChangeForWebsocket = false;
                }
              }
            });
          }
          localStorage.setItem("channelActors", JSON.stringify(channelPositions));
        });

    // **** Delete Placed Actor ****
    const removeActorGUI = {
      removeActor: () => {
        const channel = guiSettings.selectedChannel;
        console.log(channel);
        console.log(typeof(channel))
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

    const loadActorController = actorFolder
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

    function updateViewingMode(isViewing: boolean) {
      modelController.disable(isViewing);
      actorModelController.disable(isViewing);
      colorController.disable(isViewing);
      removeActorController.disable(isViewing);
      loadActorController.disable(isViewing);
      channelFolderController.disable(isViewing);
      animationAmplitudeController.disable(isViewing);
      animationFrequenzController.disable(isViewing);

      if (isViewing) {
        container.style.pointerEvents = "auto";
      }
    }

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
      const response = await fetch(path);
      const data = await response.json();
      localStorage.setItem("channelActors", JSON.stringify(data));
      placeActorFromJSON(data);
      // send locations of actor to other clienst
      socket.emit("send-actor-placement", JSON.stringify(data));
    } catch (e) {
      localStorage.setItem("channelActors", JSON.stringify(channelPositions));
    }
  }

  function placeActorFromJSON(data: any) {
    Object.keys(data).forEach((channel) => {
      const posData = data[channel];
      if (!posData) return;

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
      if (!modelPath) return;

      // load actor models
      loadActor(modelPath, posData.actorModel, (loadedObject) => {
        const actorClone = loadedObject.clone();
        actorClone.name = `${channel}`;
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
            child.material = new THREE.MeshStandardMaterial({color: actorColor});
          }
        });

        const labelDiv = document.createElement('div');
        labelDiv.className = 'actor-label';
        labelDiv.textContent = channel.split(" ")[1]; // Label shows channel number
        const labelObject = new CSS2DObject(labelDiv);
        labelObject.position.set(0, 7, 0); //offset
        actorClone.add(labelObject);

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
    labelRenderer.render(scene, camera);
  }

});

</script>

<template>
  <div id="three-container"></div>
</template>

<style scoped>

:deep(.actor-label) {
  color: black;
  font-size: 16px;
  background-color: white;
  padding: 2px 4px;
  border: 1px solid white;
  border-radius: 4px;
}

</style>