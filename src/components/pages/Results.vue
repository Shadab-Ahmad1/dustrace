<script setup lang="ts">
import { inject, onMounted, reactive, Ref, ref,watchEffect } from "vue";
import { APIClient } from "@wharfkit/antelope";
import { Types, HyperionAPIClient } from "@wharfkit/hyperion";
import { Modal } from "bootstrap";
import { Checksum256 } from "@wharfkit/session";
import { LogDataAction } from "../interfaces";
import RankCard from "../parts/RankCard.vue";
import Animation from "../parts/Animation.vue";
import { Session, SessionKit } from "@wharfkit/session";
import router from "../router";

const selectedTransaction = ref<string>("");


interface TransactionDetail {
  trx_id: String,
  level: number,
  loading: boolean,
  horse_logs: LogDataAction[],
  trifecta_logs: LogDataAction[],
  winning_logs: LogDataAction[],
}

const activeTab = ref<String>("horse");
const e_modal = ref<Element>();
const chainClient = inject<APIClient>('chainClient')!;
const hyperion = new HyperionAPIClient(chainClient);
const histories = ref(null) as Ref<Types.v2.Action[] | null>;
const detail = reactive<TransactionDetail>({
  trx_id: "",
  level: 0,
  loading: false,
  horse_logs: [],
  trifecta_logs: [],
  winning_logs: [],
});

function timestampToString(time: number) {
  let tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let timeString = new Date(time).toLocaleString('ja-JP');
  return `[${tz}] ${timeString}`;
}

async function openDetail(transaction_id: string) {
  activeTab.value = 'horse';
  const detail_modal = new Modal(e_modal.value!);
  detail_modal.show();

  detail.loading = true;
  detail.trx_id = transaction_id.toString();
  let f: Types.v2.GetTransactionResponse;
  let trxCache = localStorage["tx_" + transaction_id.toString()];
  if (trxCache == undefined) {
    f = await hyperion.v2.history.get_transaction(transaction_id) as Types.v2.GetTransactionResponse;
    localStorage["tx_" + transaction_id.toString()] = JSON.stringify(f);
  } else {
    f = JSON.parse(trxCache) as Types.v2.GetTransactionResponse;
  }

  for (let a of f.actions) {
    let act_name = a.act.name.toString();
    if (act_name == "lograce") {
      detail.level = a.act.data.level || 0;
      detail.horse_logs = a.act.data.log;
    }
    if (!["loghorsewin", "logticketwin"].includes(act_name)) continue;
    let log_regex = /Win(ning)? (horse race|on pick (?<mode>horse|trifecta)) (on rank (?<rank>[0-9]) )?at (?<session>\w+)/mg;
    let founding = log_regex.exec(a.act.data.memo);
    if (founding == null) continue;

    let group = founding.groups!;
    a.act.data.rank = group.rank;
    if (group.mode == undefined) {
      detail.horse_logs.push(a.act.data);
    } else if (group.mode == "horse") {
      detail.winning_logs.push(a.act.data);
    } else if (group.mode == "trifecta") {
      detail.trifecta_logs.push(a.act.data);
    }
  }

  detail.loading = false;
}

onMounted(async () => {
  const historyFetch = await hyperion.v2.history.get_actions('niftyracecom', {
    filter: "niftyracecom:finishrace",
    limit: 25,
  }) as Types.v2.GetActionsResponse;
  histories.value = historyFetch.actions;

  e_modal.value!.addEventListener('hidden.bs.modal', () => {
    detail.trx_id = "";
    detail.level = 0;
    detail.horse_logs = [];
    detail.trifecta_logs = [];
    detail.winning_logs = [];
  });
});

const session = inject<Ref<Session | undefined>>("session")!;
const sessionKit = inject<SessionKit>("sessionKit")!;

async function login() {
  const response = await sessionKit.login()
  session.value = response.session
}

async function logout() {
  await sessionKit.logout(session.value)
  session.value = undefined;
  await router.push({name: "home"});
}

watchEffect(() => {
  if (selectedTransaction.value) {
    openDetail(selectedTransaction.value);
  }
});

const resetSelectedTransaction = () => {
    selectedTransaction.value = ""; // or null, depending on your preference
};
</script>

<template>
  <section class="resultpage">
    <div class="container headerspecial">
      <div class="row d-flex justify-content-end">
        <div class="col-md-3 horse-logo-column">
          <div class="d-flex justify-content-start">
            <img src="/src/assets/horse.png" width="200px">
          </div>
        </div>
        <div class="col-md-6 d-flex justify-content-end">
          <a class="navbar-brand desktop-navbar" href="#">
            <img src="/src/assets/niftylogo.png" alt="Company Logo">
          </a>
          <div class="mobile-view-navbar">
        <a href="">
        <img src="/src/assets/nifty.png" style="width:200px; height: 40px" alt="nifty" >
        <img src="/src/assets/niftyhomelogo.png" style="width: 135px; height: 121px; margin-top: -30px;" alt="home" >
        <img src="/src/assets/race.png" style="width: 200px; margin-top: -30px; height: 40px" alt="home" >
      </a>
      </div>
        </div>
        <div class="col-md-3 login-button">
          <div class="d-flex justify-content-end">
            <button v-if="session == undefined" key="btnAuth" class="btn" @click="login">
              <img src="/src/assets/login.png">
            </button>
            <div class="input-group" v-else key="btnAuthElse">
              <input type="text" class="input-auth-wallet" readonly :value="session.actor">
              <button class="btn" type="button" @click="logout">LogOut</button>
            </div>
          </div>
        </div>
      </div>

      <nav class="navbar navbar-expand-lg navbar-dark bg-none rounded px-3 text-white">
        <div class="container-fluid">
          <!-- <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarMainMenu"
            aria-controls="navbarMainMenu" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button> -->

          <div class="navbar-collapse" id="navbarMainMenu">
            <ul class="navbar-nav mx-auto mb-2 mb-lg-0 d-flex align-items-center justify-content-center text-center">
              <li class="nav-item">
                <RouterLink to="/" class="nav-link"><img src="/src/assets/home.png" width="100%"></RouterLink>
              </li>
              <li class="nav-item ">
                <RouterLink to="/stable" class="nav-link"><img src="/src/assets/menustable.png"></RouterLink>
              </li>
              <li class="nav-item">
                <RouterLink to="/race" class="nav-link"><img src="/src/assets/tickets.png"></RouterLink>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </div>
    <div class="history-results">
    <div class="alert alert-info" v-if="histories == null">Fetching the histories...</div>
    <div class="alert-warning alert" v-else-if="histories!.length == 0">Cannot find any histories...</div>
    <div class="row d-flex justify-content-center align-items-center p-2 py-4">
      <div class="col-md-6 board d-flex justify-content-center align-items-center text-center ">
        <div class="mb-3">
      <label for="transactionSelect" class="form-label"><h2 style="color: aliceblue;">Race History Dropdown</h2></label>
      <select class="form-select" v-model="selectedTransaction" id="transactionSelect" style="width: 100%;">
        <option value="">Select a transaction...</option>
        <option v-for="hist in histories" :value="hist.trx_id">{{ hist.trx_id.toString().substring(0, 20) + "..." }}</option>
      </select>
    </div>
      </div>
    </div>
  
  </div>
  </section>
  <div class="modal fade" ref="e_modal" id="history-detail" tabindex="-1">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h1 class="modal-title fs-5" id="exampleModalLabel">
            Detail {{detail.trx_id.toString().substring(0, 20)}}...
          </h1>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" @click="resetSelectedTransaction"></button>
        </div>
        <div class="modal-body" v-if="detail.loading">
          <div class="alert alert-info mb-0">
            Fetching detail...
          </div>
        </div>
        <div v-else>
          <ul class="nav nav-pills nav-fill border-bottom">
            <li class="nav-item specialbutton" style="font-size: 1.5em; color: black;">
              <a href="#horse" class="nav-link rounded-0 me-1" :class="{active: activeTab == 'horse'}"
                @click="activeTab = 'horse'">
                Horse
              </a>
            </li>
            <li class="nav-item specialbutton" style="font-size: 1.5em; color: black;">
              <a href="#ticket" class="nav-link rounded-0 me-1" :class="{active: activeTab == 'ticket'}"
                @click="activeTab = 'ticket'">
                Results
              </a>
            </li>
          </ul>
          <div class="modal-body p-0" v-show="activeTab == 'horse'">
            <Animation :log="detail.horse_logs as LogDataAction[]" :level="detail.level" :key="`anim_${detail.trx_id}`"/>
          </div>
          <div v-show="activeTab == 'ticket'" class="modal-body mb-n3">
            <RankCard title="Horse" :logs="detail.horse_logs as LogDataAction[]"/>
            <RankCard title="Trifecta" :logs="detail.trifecta_logs as LogDataAction[]"/>
            <RankCard title="Win" :logs="detail.winning_logs as LogDataAction[]"/>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>

.mb-n3 {
  margin-bottom: -1rem !important;
}
.modal-body canvas {
  margin-bottom: -6px;
}

.history{
    background-color: rgb(238, 238, 238);
    padding: 1rem;
    margin: 1rem;
    border-radius: 5px;
    color:black;
    box-shadow: 1px 2px 5px 1px rgba(0,0,0,0.75);

}
.history-results{
    background-image: url('/src/assets/background-horizontal.png');
    background-size: cover; /* or background-size: contain; */
  background-position: top;
  background-repeat: no-repeat;

}

.board{
  background-image: url('/src/assets/resultboard.png');
  background-size: cover;
  background-position: center;
  height: 12rem;
  margin: auto;
  padding: 1em;
}


.checkrecord{
    background-color: rgb(83, 206, 255);
    color: white;
    margin-top: 1rem;
    box-shadow: 1px 2px 5px 1px rgba(0,0,0,0.25);

}



.headerspecial{
  background-image: url('/src/assets/wood.png');
  background-size: cover; /* or background-size: contain; */
  background-position: center;
  background-repeat: no-repeat;
}
.navbar{
  background-color: none;

}
.navbar-brand {
  display: flex;
  align-items: center; /* Vertically center the logo */
}

.navbar-brand img{
  width: 600px;
}




@media (min-width: 992px) {
  .navbar-nav {
    margin-top: 20px; /* Adjust the spacing between the logo and menu items */
  }
}

.nav-item{
  font-size: 3em;
  font-weight: 800;
}

.nav-item{
  font-size: 3em;
  font-weight: 800;
}


.btn{
  font-size: 2em;
  font-weight: 800;
  color: white;
}


.nav-link{
  color: #ffffff;
  font-weight: 600;
}
.me-1{
  font-size: 1em;
  font-weight: 600;
  background-color: #c7bbb7;
  border-color:#c7bbb7;
}

.nav-pills .nav-link.active, .nav-pills .show>.nav-link {
    color: white;
    background-color: #808080;
}

.rightcol{
  float: right;
  margin-left: auto;
  
}


.loginrow{
  display: flex;
  justify-content: flex-end !important;
  margin-left: auto;
}
.mobile-view-navbar{
  display: none;
}

@media screen and (max-width: 720px) {
  .login-button{
    position: absolute;
    top: 0;
  }
  .horse-logo-column{
    justify-content: center;
    display: flex;
    transform: rotateY(180deg);
  }
  .horse-logo-column img{
    width: 150px;
  }
  .desktop-navbar{
    display: none
  }
  
.mobile-view-navbar{
    display: block;
    width: 100%;
    margin-bottom: 1.5rem;
}
.mobile-view-navbar a{
    display: flex;
    flex-direction: column;
    width: 100%;
    justify-content: center;
    align-items: center;
}
.headerspecial{
  width: 100%;
  background-size: 100%;
  background-repeat: repeat;
}


.navbar-brand{
  max-width: 100% !important;
}
.navbar-brand img{
  width: 100%;
}
.first{
  max-width: 100% !important;
  margin: auto;
  
}

.second{
  max-width: 100% !important;
  margin: 10px !important;
  
}


.first img{
  width: 100% !important;
  max-width: 100% !important;
}

.second img{
  width: 100% !important;
  max-width: 100% !important;
}

.third img{
  width: 100% !important;
  max-width: 100% !important;
}

.navbar-nav .nav-item{
  margin: 0rem 0rem !important;
  font-size: 1em;
}
.nav-item img {
    width: 50% !important;
}

}

.textwhite{
  color: white;
  font-size: larger;
  font-weight: 500;
}


.navbar-nav .nav-item{
margin-right: 0px !important;
margin: 0rem 2rem;
display: flex;
align-items: center;
justify-content: center;
}


.nav-item img{
  width: 60%;
}

input .input-auth-wallet {
    background: transparent !important;
    color: white;
    border: none;
}
</style>