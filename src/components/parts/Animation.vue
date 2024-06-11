<script setup lang="ts">
import {onMounted, PropType, ref} from "vue";
import {LogDataAction} from "../interfaces";

const props = defineProps({
  level: {
    required: true,
    type: Number
  },
  log: {
    required: true,
    type: Array as PropType<LogDataAction[]>
  }
})

interface GifObject {
  source: HTMLImageElement,
  current: number,
  total_frames: number,
  width: number,
  height: number
}

interface HorseState extends LogDataAction {
  horse: GifObject,
  x: number,
  y: number
}

const canvas = ref<HTMLCanvasElement>(document.createElement("canvas"));

const states: HorseState[] = [];
const horses = [
  gifObject(`/images/horses/sprite_1.png`),
  gifObject(`/images/horses/sprite_2.png`),
  gifObject(`/images/horses/sprite_3.png`),
  gifObject(`/images/horses/sprite_4.png`),
  gifObject(`/images/horses/sprite_5.png`),
  gifObject(`/images/horses/sprite_6.png`),
];
const backgrounds = [
  loadImage("/images/arenas/level0.png?v1"),
  loadImage("/images/arenas/level1.png?v1"),
];
const ranks = [
  loadImage("/images/ranks/black.png"),
  loadImage("/images/ranks/gold.png"),
  loadImage("/images/ranks/silver.png"),
  loadImage("/images/ranks/bronze.png"),
]

function initHorseStates() {
  let index = 0;
  for (let h of props.log) {
    let tmp: HorseState = Object.assign(h);
    tmp.horse = horses[index]
    tmp.x = -70;
    tmp.y = 160 + (55 * index);
    states.push(tmp)
    index++;
  }
}

function loadImage(file: string): HTMLImageElement {
  const img_loader = new Image();
  img_loader.src = file;

  return img_loader
}

function gifObject(path: string): GifObject {
  let o: GifObject = {
    source: loadImage(path),
    current: 0,
    total_frames: 8,
    width: 92,
    height: 56
  };

  o.source.onload = () => {
    o.width = o.source.width / 8;
  }

  return o;
}

function drawGif(ctx: CanvasRenderingContext2D, x: number, y: number, obj: GifObject) {
  ctx.drawImage(obj.source, obj.current * obj.width, 0,
                obj.width, obj.height, x, y, obj.width, obj.height);

  obj.current = (obj.current + 1) % obj.total_frames;
}

function drawWin(ctx: CanvasRenderingContext2D, x: number, y: number, rank: number, winner: string) {
  let rank_image = ranks[rank] || ranks[0];
  ctx.drawImage(rank_image, x, y, 180, 40);
  ctx.fillText(`${rank}. ${winner}`, x + 10, y + 37);
}

onMounted(() => {
  initHorseStates();

  let cv = canvas.value!;
  let context = cv.getContext("2d")!;
  let bg_image: HTMLImageElement = backgrounds[props.level] ?? backgrounds[0];

  context.font = "16px Minecraftia";
  context.drawImage(bg_image, 0, 0, cv.width, cv.height);
  context.drawImage(ranks[1], 290, 230, 180, 40);
  context.fillText(`CLICK TO START`, 308, 267);
  for (let d of states) {
    context.drawImage(ranks[0], 25, d.y + 15, 160, 40);
    context.fillText(d.owner.toString(), 35, d.y + 52);
    drawGif(context, d.x, d.y, d.horse)
  }

  const startRace = () => {
    cv.removeEventListener('click', startRace, false);
    let runner = setInterval(() => {
      context.drawImage(bg_image, 0, 0, cv.width, cv.height)
      let is_finish_all = true;
      for (let d of states) {
        if (d.x < 760) {
          is_finish_all = false;
          d.x += 7 + (3 - (d.rank * 0.5));
        } else {
          drawWin(context, 25, d.y + 15, d.rank, d.owner.toString())
        }

        drawGif(context, d.x, d.y, d.horse);
      }

      if (is_finish_all) {
        clearInterval(runner);
      }
    }, 95)
  }

  cv.addEventListener('click', startRace, false)

})
</script>
<template>
  <canvas ref="canvas" width="760" height="500"></canvas>
</template>

<style scoped>
@font-face {
  font-family: Minecraftia;
  src: url("/fonts/Minecraftia-Regular.ttf");
}
canvas {
  width: 100%;
  border-radius: 0 0 5px 5px;
}
</style>