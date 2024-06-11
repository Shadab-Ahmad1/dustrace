<script setup lang="ts">

import {onMounted, ref} from "vue";

let runner: number | undefined;
const cooldown = 3 * 3600 * 1000;
const timer = ref<String>("00:00:00");
onMounted(() => {
  runner = setInterval(() => {
    let now = (new Date()).getTime();
    let cleanNow = (now % cooldown) - 300000;
    let remain = Math.floor((cooldown - cleanNow) / 1000);
    if (cleanNow < 0) {
      remain = Math.floor(-1 * cleanNow / 1000);
    }

    let hour = String(Math.floor(remain / 3600)).padStart(2, '0');
    let minute = String(Math.floor(remain % 3600 / 60)).padStart(2, '0');
    let second = String(remain % 60).padStart(2, '0');

    if (remain == 0) {
      clearInterval(runner);
      setTimeout(() => window.location.reload(), 5000)
      runner = undefined;
    }
    timer.value = `${hour}:${minute}:${second}`;
  }, 800)
});
</script>

<template>
<span class="cooldown">
  {{timer}}
</span>
</template>

<style scoped>

</style>