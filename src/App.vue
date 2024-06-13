<script setup lang="ts">
import { inject, ref, type Ref } from "vue";
import { Session, SessionKit } from "@wharfkit/session";
import router from "./components/router";
import { Notifications } from "@kyvg/vue3-notification";
import Modal from "./components/parts/Modal.vue";
import { getAtomicEP, getChainEP } from "./components/helpers";

const atomic_list = ref<String[]>([
  'https://atomic-wax.tacocrypto.io',
  'https://aa-wax-public1.neftyblocks.com',
  'https://wax-atomic.alcor.exchange',
  'https://wax.api.atomicassets.io',
])

const chain_list = ref<String[]>([
  'https://wax.blokcrafters.io',
  'https://wax.greymass.com',
  'https://api.waxsweden.org',
  'https://wax.eosusa.io',
])

const modal = ref();
const atomic_api = ref<String>(getAtomicEP());
const chain_api = ref<String>(getChainEP());
const session = inject<Ref<Session | undefined>>("session")!;
const sessionKit = inject<SessionKit>("sessionKit")!;

function saveApi() {
  localStorage['atomic_api'] = atomic_api.value;
  localStorage['chain_api'] = chain_api.value;
  window.location.reload();
}

async function login() {
  const response = await sessionKit.login()
  session.value = response.session
}

async function logout() {
  await sessionKit.logout(session.value)
  session.value = undefined;
  await router.push({ name: "home" });
}



</script>

<template>



  <RouterView />
  <footer class="text-muted py-3">
    <div class="row bg-none rounded py-3 px-4 text-white justify-content-between d-flex align-items-center main-footer">
      <div class="row justify-content-between d-flex align-items-center">
        <div class="col-md-5 justify-content-between d-flex align-items-center">
          <a href="/" class="desktop-view-footer"><img src="./assets/niftylogo.png" width="300px"></a>
          <div class="mobile-view-footer">
            <a href="">
              <img src="/src/assets/nifty.png" style="width:200px; height: 40px" alt="nifty">
              <img class="shelterImage" src="/src/assets/niftyhomelogo.png" style="width: 135px; height: 121px; margin-top: -30px;"
                alt="home">
              <img class="race" src="/src/assets/race.png" style="width: 200px; margin-top: -30px; height: 40px" alt="home">
            </a>
          </div>
        </div>
        <div class="col-md-7 justify-content-between d-flex align-items-center socials-section">
          <div class="social-icons-whole-container">
            <div class="social-icons-container">
              <a href=""><img src="/src/assets/twitter.svg" width="60px" class="socialicon"></a>
              <a href=""><img src="/src/assets/telegram.svg" width="60px" class="socialicon"></a>
              <a href=""><img src="/src/assets/youtube.svg" width="60px" class="socialicon"></a>

            </div>
          </div>
          <button class="btn btn-outline-light btn-sm settingbutton" @click="modal.show()">
            <img src="/src/assets/settings.png">
          </button>
        </div>
      </div>
    </div>
  </footer>
  <Modal title="Setting" ref="modal">
    <template #body>
      <div class="form-group">
        <label for="atomic_api" class="control-label">AtomicAsset API</label>
        <select id="atomic_api" v-model="atomic_api" class="form-control">
          <option v-for="aa of atomic_list" :value="aa" :selected="atomic_api == aa">{{ aa }}</option>
        </select>
      </div>
      <div class="form-group">
        <label for="chain_api" class="control-label">Chain API</label>
        <select id="chain_api" v-model="chain_api" class="form-control">
          <option v-for="aa of chain_list" :value="aa" :selected="chain_api == aa">{{ aa }}</option>
        </select>
      </div>
    </template>
    <template #footer>
      <button class="btn btn-primary" @click="saveApi">Save</button>
    </template>
  </Modal>
</template>

<style scoped>
.input-auth-wallet {
  width: 140px;
}

footer {
  background-image: url('/src/assets/wood2.png');
  background-size: cover;
  background-position: center;


}

.settingbutton {
  background: none;
  outline: none;
  font-size: 2em;
  font-weight: bold;
  border: none;
}


.headerspecial {
  background-image: url('./assets/wood2.png');
}

.navbar {
  background-color: none;

}

.navbar-brand {
  display: flex;
  align-items: center;
  /* Vertically center the logo */
}

@media (min-width: 992px) {
  .navbar-nav {
    margin-top: 20px;
    /* Adjust the spacing between the logo and menu items */
  }
}

.nav-item {
  font-size: 3em;
  font-weight: 800;
}

.nav-item {
  font-size: 3em;
  font-weight: 800;
}

.btn {
  font-size: 2em;
  font-weight: 800;
  color: white;
}

.socialicon {
  margin: 5px;
}

.settingbutton img {
  width: 70%;
}

.mobile-view-footer {
  display: none;
}

@media screen and (max-width: 720px) {

  .desktop-view-footer {
    display: none;
  }

  .mobile-view-footer {
    display: block;
    width: 100%;
    margin-bottom: 1.5rem;
  }

  .mobile-view-footer a {
    display: flex;
    flex-direction: column;
    width: 100%;
    justify-content: center;
    align-items: center;
  }

  .socials-section{
    flex-direction: column;
    margin-top: 1rem;
  }
  footer {
    background-image: url('./assets/wood.png');
    background-size: 102% 66%;
    background-position: center;
}

.social-icons-whole-container{
  width: 100%;
}
.social-icons-container{
display: flex;
justify-content: space-evenly;
}
.main-footer{
  justify-content: center !important;
}
.mobile-view-footer .shelterImage{
  margin-top: -20px !important;
  width: 110px !important;
}
.mobile-view-footer .race{
  margin-top: -18px !important;
}
}
</style>
