<script lang="ts">
import {defineComponent, h, onMounted, ref} from 'vue'
import * as Pixi from "pixi.js";
import {useStore} from "vuex";
import pixiApp from "@/pixi/pixiApp";
import {InstructionParser, type TactonRectangle, Instruction} from "@/parser/instructionParser";
import Track from "@/components/Track.vue";
import Grid from "@/components/Grid.vue";
import PlaybackIndicator from "@/components/PlaybackIndicator.vue";

import config from "@/config";
import JsonData from '../json/2024-06-20_Team1_session1.json';
import PlaybackVisualization from "@/components/PlaybackVisualization.vue";
import Slider from "@/components/Slider.vue";

export default defineComponent({
  name: "Timeline",
  data() {
    return {
      instructions: [] as Instruction[],
      currentInstructionIndex: 0,
      currentInstruction: ref<Instruction | null>(null),
      tactons: {} as { [trackId: number]: TactonRectangle[] },
      trackCount: 0,
      currentTime: 0,
      totalDuration: 0,
      isPlaying: false,
      playbackTimer: null as Pixi.Ticker | null,
      loadedJson: null as any,
      selectedJson: null as any,
      jsonData: JsonData,
      store: useStore()
    };
  },
  created() {
    this.selectedJson = JsonData[0];
    this.loadFile();
  },
  methods: {
    loadJson() {
      console.debug("loading: ", this.loadedJson);
      const parser = new InstructionParser(this.loadedJson);      
      this.tactons = parser.parseInstructionsToRectangles();
      this.trackCount = Object.keys(this.tactons).reduce((a, b) => Math.max(a, parseInt(b)), -Infinity) + 1;
      
      let accumulatedTime = 0;
      this.instructions = this.loadedJson.instructions.map((instruction: any) => {
        if (instruction.wait) {
          accumulatedTime += instruction.wait.miliseconds;
        }
        if (instruction.setParameter) {
          instruction.setParameter.startTime = accumulatedTime;
        }
        return new Instruction(instruction);
      });
      
      this.totalDuration = accumulatedTime;
      this.calculateInitialZoom();
      
      console.debug("totalDuration: ", this.totalDuration, " ms");
      console.debug("maxTrackNum: ", this.trackCount);
      console.debug("Instructions: ", this.instructions);
      console.debug("tactons: ", this.tactons);      
    },
    calculateInitialZoom() {
      const viewportWidth = pixiApp.canvas.width - 48;
      const padding = config.pixelsPerSecond;
      const durationInSeconds = this.totalDuration/1000;
      const durationInPixels = (durationInSeconds * config.pixelsPerSecond) + padding;
      const zoom = viewportWidth / (durationInPixels);

      console.debug("viewportWidth", viewportWidth);
      console.debug("totalDuration:", durationInSeconds.toFixed(2),"s");
      console.debug("durationInPixels", durationInPixels);
      console.debug("zoom: ", zoom);
      
      this.store.dispatch('updateInitialVirtualViewportWidth', durationInPixels);
      this.store.dispatch('updateCurrentVirtualViewportWidth', durationInPixels);
      this.store.dispatch('updateZoomLevel', zoom);
    },
    startPlayback() {
      if (this.isPlaying) return;
      
      this.isPlaying = true;
      this.currentTime = 0;
      this.currentInstructionIndex = 0;
      this.playbackTimer = pixiApp.ticker.add(this.updatePlayback)
    },
    stopPlayback() {
      if (!this.isPlaying) return;

      this.isPlaying = false;
      pixiApp.ticker.remove(this.updatePlayback);
      this.currentTime = 0;
      this.currentInstructionIndex = 0;
      this.currentInstruction = null;
    },
    updatePlayback(ticker: any) {
      if (!this.isPlaying) return;
      this.currentTime += ticker.deltaTime * config.millisecondsPerTick;
      
      const instruction = this.instructions[this.currentInstructionIndex];

      if (instruction && instruction.wait && this.currentTime >= instruction.wait.miliseconds) {
        this.currentInstructionIndex++;
      }

      if (instruction && instruction.setParameter && this.currentTime >= instruction.setParameter.startTime) {
        this.currentInstruction = instruction;
        this.currentInstructionIndex++;
      }

      if (this.currentTime >= this.totalDuration) {
        this.stopPlayback();
      }
    },
    loadFile() {
      if (this.loadedJson == this.selectedJson) return;
      this.loadedJson = this.selectedJson;
      
      console.clear();     
      this.loadJson();
    }
  },
  components: {
    Slider,
    PlaybackVisualization,
    PlaybackIndicator,
    Grid,
    Track
  }
})
</script>

<template>
  <div class="playbackContainer">
    <button :disabled="isPlaying" @click="startPlayback">Play</button>
    <button @click="stopPlayback">Stop</button>
    <button :disabled="selectedJson == loadedJson" @click="loadFile">Load File</button>
    <select id="fileSelect" v-model="selectedJson">      
        <option v-for="(file, index) in jsonData" :key="index" :value="file">{{file.metadata.name}}</option>      
    </select>
  </div>
  <PlaybackVisualization :current-instruction="currentInstruction"></PlaybackVisualization>
  <Slider></Slider>
  <Grid :track-count="trackCount"></Grid>
  <div v-for="trackId in Array.from({ length: trackCount }, (_, i) => i)" :key="trackId">
    <Track :track-id="trackId" :tactons="tactons[trackId] || []" :track-count="trackCount - 1"/>
  </div>
  <PlaybackIndicator :current-time="currentTime" :total-duration="totalDuration" :track-count="trackCount"></PlaybackIndicator>
  
</template>

<style>

</style>