<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Modal } from "bootstrap";
defineProps({
  title: {
    type: String,
    default: "<<Title goes here>>",
  },
  size: {
    type: String,
    default: "md"
  },
  footerClass: {
    type: Array<String>,
    default: []
  }
});
let modalEle = ref<Element>();
let thisModalObj: Modal | null = null;

onMounted(() => {
  thisModalObj = new Modal(modalEle.value!);
});
function _show() {
  thisModalObj!.show();
}
function _hide() {
  thisModalObj!.hide();
}
function _onHide(fn: EventListenerOrEventListenerObject) {
  modalEle.value!.addEventListener('hidden.bs.modal', fn);
}
defineExpose({ show: _show, hide: _hide, onHide: _onHide });
</script>

<template>
  <div class="modal fade" id="exampleModal" tabindex="-1" aria-labelledby="" aria-hidden="true" ref="modalEle">
    <div class="modal-dialog" :class="['modal-' + size]">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="exampleModalLabel">{{ title }}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <slot name="body" />
        </div>
        <div class="modal-footer" :class="footerClass">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </div>
</template>