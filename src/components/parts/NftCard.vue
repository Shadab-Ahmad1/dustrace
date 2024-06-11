<script setup lang="ts">
import {StakedDetail} from "../interfaces";
import {PropType} from "vue";
import {Types} from "@wharfkit/atomicassets";
import Countdown from "./Countdown.vue";

defineProps({
  data: {
    required: true,
    type: Object as PropType<Types.AssetObject>
  },
  selected: Boolean,
  session: Object as PropType<StakedDetail>,
  hideFooter: Boolean
});

const emits = defineEmits(['onSelect']);

function ipfsLink(ipfs: String) {
  return `https://resizer2.neftyblocks.com/?ipfs=${ipfs}&width=300&static=false`
}
</script>

<template>
  <div :class="'card mb-3 ' + (selected ? 'border-primary' : '')">
    <div class="row g-0 select-area" @click="emits('onSelect', data?.asset_id.toString())">
      <div class="col-md-5 text-center">
        <img :src="ipfsLink(data!.template.immutable_data.img)" alt="" class="img-fluid rounded-start mt-2">
      </div>
      <div class="col-md-7">
        <div class="card-body">
          <h5 class="card-title">[{{data.template_mint.toString()}}] {{data.template.immutable_data.name}}</h5>
          <p class="card-text">
            <div v-if="session && session.type == 'horse'">
              <div v-if="session.name == '' && session.ready">
                Race In: <Countdown />
              </div>
              <div v-if="session.name != ''">
                Participate In: {{session.name}}
              </div>
              <div v-if="!session.ready">
                Is Ready: No
              </div>
            </div>
            <div v-if="session && session.type == 'ticket'">
              Used In: {{ session.name == '' ? '-' : session.name }}
            </div>
            Level: {{data.mutable_data.level || "Unknown"}} <br>
            Races: {{data.mutable_data.races || "Unknown"}} <br>
            XP: {{data.mutable_data.xp || "Unknown"}}
          </p>
        </div>
      </div>
    </div>
    <div :class="'card-footer ' + (selected ? 'border-primary' : '')" v-if="hideFooter == undefined || hideFooter == false">
      <slot/>
    </div>
  </div>
</template>

<style scoped>
  .card-body {
    font-size: 12px;
  }
  .select-area {
    cursor: pointer;
  }
</style>