<script setup lang="ts">
import Timeline from "@/components/Timeline.vue";
import {useRouter} from "vue-router";


// open Simulation
const router = useRouter();
const openSimulation = () => {
  const newRoute = router.resolve({ name: 'simulation' });
  const newWindowUrl = `${window.location.origin}${newRoute.href}`;
  window.open(newWindowUrl, '_blank', 'width=500,height=500,resizable=yes,scrollbars=yes');
};

</script>

<template>
  <Timeline></Timeline>


  <div class="btnsim-container" >
    <button class="simbtn" @click="openSimulation">
      <font-awesome-icon :icon="['fas', 'caret-down']" />
      Open Simulation
      <font-awesome-icon :icon="['fas', 'caret-down']" />
    </button>
  </div>

</template>

<style scoped>
.simbtn {
  margin: 16px;
  justify-content: center;
  align-content: center;
  background: #EC660C;
  color: white;
  border-radius: 10px;
  border-style: none;
  font-weight: 600;
  font-size: 16px;
  transform-origin: center;
  display: inline-block;
  position: fixed;
  right: 0;
  top: 50%;
  transform: translate(50%, -50%) rotate(90deg);
  padding: 15px 20px;
  cursor: pointer;
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2);
}
</style>
