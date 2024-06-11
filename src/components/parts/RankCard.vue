<script setup lang="ts">
import {LogDataAction} from "../interfaces";
import {computed, PropType} from "vue";

const props = defineProps({
  title: {
    required: true,
    type: String
  },
  logs: {
    required: true,
    type: Array as PropType<LogDataAction[]>
  }
});

function ownerName(name: string) {
  if (name === "niftyracecom") return "horse droid";
  return name;
}

const sortedLogs = computed(() => {
  let ranks = [...props.logs!];
  return ranks.sort((a,b) => {
    return a.rank - b.rank;
  })
})

function colorRank(log: LogDataAction) {
  if (log.rank == undefined) return "gold";
  if (log.rank == 1) return "gold";
  if (log.rank == 2) return "silver";
  return "bronze";
}
</script>

<template>
  <div class="mb-3">
    <h5>{{title}}</h5>
    <div v-if="logs.length > 0" class="row rank-row">
      <div class="col-md-3" v-for="log of sortedLogs">
        <div :class="`card ` + colorRank(log)">
          <div class="card-header text-center">
            <div class="rank-block">{{log.rank ?? 1}}</div>
            {{ownerName(log.owner.toString())}}
          </div>
          <div class="card-body text-center p-2">
            {{log.reward.toString()}}
          </div>
        </div>
      </div>
    </div>
    <div class="alert alert-info" v-else>
      No {{title.toLowerCase()}} were picked
    </div>
  </div>
</template>

<style scoped>
.card .card-body {
  font-size: 18px;
  font-weight: bold;
}
.card .card-header {
  position: relative;
  padding-left: 42px;
  padding-right: 10px;
}
.card .card-header .rank-block {
  position: absolute;
  left: 0;
  line-height: 41px;
  width: 35px;
  border-right: 1px solid;
  top: 0;
}
.rank-row {
  margin-bottom: -1rem;
}
.rank-row .col-md-3 {
  margin-bottom: 1rem !important;
}

.gold, .gold .card-header, .gold .card-header .rank-block {
  border-color: gold;
  background-color: rgba(255, 215, 0, 0.1);
}
.gold .card-header {
  background-color: rgba(255, 215, 0, 0.5);
}

.silver, .silver .card-header, .silver .card-header .rank-block{
  border-color: silver;
  background-color: rgba(192, 192, 192, 0.1);
}
.silver .card-header {
  background-color: rgba(192, 192, 192, 0.5);
}

.bronze, .bronze .card-header, .bronze .card-header .rank-block {
  border-color: #CD7F32;
  background-color: rgba(205, 127, 50, 0.1);
}
.bronze .card-header {
  background-color: rgba(205, 127, 50, 0.5);
}
</style>