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

  <button class="simbtn" @click="openSimulation">Open Simulation</button>

</template>
