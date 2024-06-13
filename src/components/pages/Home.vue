<script setup lang="ts">
import {inject, onMounted, reactive, Ref, ref} from "vue";
import {APIClient} from "@wharfkit/antelope";
import {Types, HyperionAPIClient} from "@wharfkit/hyperion";
import {Modal} from "bootstrap";
import {Checksum256} from "@wharfkit/session";
import {LogDataAction} from "../interfaces";
import RankCard from "../parts/RankCard.vue";
import Animation from "../parts/Animation.vue";
import {Session, SessionKit} from "@wharfkit/session";
import router from "../router"


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

async function openDetail(transaction_id: Checksum256) {
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
})

const showText2 = ref(false);
const showText1 = ref(false);
const showText = ref(false);

function toggleTextVisibility(show: boolean) {
  showText1.value = show;

}

function toggleLastTextVisibility(show:boolean) {
  showText2.value = show;
  
}

function liveText(show: boolean) {

  showText.value = show;

}
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



</script>

<template>
  <notifications classes="mt-3 me-3 vue-notification"/>
  <div class="container headerspecial">
    <div class="row d-flex justify-content-end">
      <div class="col-md-3 horse-logo-column">
        <div class="d-flex justify-content-start">
          <img src="/src/assets/horse.png" width="200px">

      </div>
      </div>
      <div class="col-md-6 d-flex justify-content-center">
        <a class="navbar-brand desktop-navbar" href="#">
        <img src="/src/assets/niftylogo.png" alt="Company Logo" >
      </a>
      <div class="mobile-view-navbar">
        <a href="">
        <img src="/src/assets/nifty.png" style="width:200px; height: 40px" alt="nifty" >
        <img class="shelterImage" src="/src/assets/niftyhomelogo.png" style="width: 135px; height: 121px; margin-top: -30px;" alt="home" >
        <img class="race" src="/src/assets/race.png" style="width: 200px; margin-top: -30px; height: 40px" alt="home" >
      </a>
      </div>
      </div>
      <div class="col-md-3 login-button">
        <div class="d-flex justify-content-end">
        <button v-if="session == undefined" key="btnAuth" class="btn" @click="login"><img src="/src/assets/login.png"></button>
        <div class="input-group userName" v-else key="btnAuthElse">
          <input type="text" class="form-control input-auth-wallet" readonly :value="session.actor">
          <button class="btn" type="button" @click="logout">LogOut</button>
        </div>
      </div>
      </div>
    </div>
   
  <nav class="navbar navbar-expand-lg navbar-dark bg-none rounded px-3 text-white">
  <div class="container-fluid">
    <!-- Logo in the middle at the top -->
  
    
    <!-- Toggler button for small screens -->
    <!-- <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarMainMenu" aria-controls="navbarMainMenu" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button> -->

    <!-- Menu items -->
    <div class="navbar-collapse" id="">
      <ul class="navbar-nav mx-auto mb-2 mb-lg-0 d-flex align-items-center justify-content-center text-center">
        <li class="nav-item ">
          <RouterLink to="/stable" class="nav-link"><img src="/src/assets/menustable.png"></RouterLink>
        </li>
        <li class="nav-item">
          <RouterLink to="/race" class="nav-link"><img src="/src/assets/tickets.png"></RouterLink>
        </li>
        <li class="nav-item">
          <RouterLink to="/results" class="nav-link"><img src="/src/assets/RESULTS.png"></RouterLink>
        </li>
      </ul>

    </div>
  </div>
</nav>

  </div>



  <section class="py-5 text-center container home">
    <div class="row py-lg-5 mx-auto">
      <div class="col-lg-6 col-md-8 mx-auto hid">
      </div>

    </div>
    <div class="row py-lg-5 align-content-center justify-content-center mx-auto">
      <div class="col-lg-6 col-md-8 first">
      <a href="/stable"  @mouseover="liveText(true)" @mouseout="liveText(false)"><img src="/src/assets/stable.png" ></a> 
      </div>
      <div class="col-lg-6 col-md-8 align-content-center justify-content-center mx-auto">
        <p class="textwhite" id="hiddenText" v-show="showText">
          Dive into the thrilling world of horse racing within NiftyRace! Purchase your favorite horse and stable it to get on step closer to entering the race!
  </p>      </div>
    </div>

    <div class="row  align-content-center justify-content-center mx-auto">
<div class="col-lg-6 col-md-8 align-content-center justify-content-center mx-auto">
  <p class="textwhite" id="hiddenText1" v-show="showText1">
    Welcome to the NiftyRace Ticket Booth! Get your tickets to the thrilling horse races. Purchase now and secure your spot in the races for incredible rewards. Don't miss out on the excitement - Get your ticket today!
  </p>
</div>
      <div class="col-lg-6 col-md-8 second">
        <a href="/race"  @mouseover="toggleTextVisibility(true)" @mouseout="toggleTextVisibility(false)">
        <img src="/src/assets/bet2.png"></a>

    </div>
    </div>
    <div class="row  align-content-center justify-content-center mx-auto">
    <div class="col-lg-6 col-md-8 third">
      <a href="/results" @mouseover="toggleLastTextVisibility(true)" @mouseout="toggleLastTextVisibility(false)">
      <img src="/src/assets/winnerse2.png"></a>
    </div>
    <div class="col-lg-6 col-md-8 align-content-center justify-content-center mx-auto">
      <p class="textwhite" id="hiddenText1" v-show="showText2">
        Welcome to the Nifty Race Results Page! Check out the latest race outcomes and see how your favorite ponies performed on the track. See how the action unfolded, positions for both racers and spectators and DUST prizes. Whether you're celebrating victory or analyzing past performances, this is your go-to destination for all things Nifty Race!
  </p>
    </div>
    </div>
  </section>
</template>

<style scoped>
.home {
  background-image: url('./static/BG1_meadows.png');
  background-size: cover;
  background-position: center;
  min-height: 75vh;
  padding-bottom: 4rem !important;
}

.mb-n3 {
  margin-bottom: -1rem !important;
}
.modal-body canvas {
  margin-bottom: -6px;
}
.hid {
  margin-bottom: 10%;
}
.first img{
  max-width: 40%;
  width: 40%;

}
.second img{
  max-width: 50%;
  width: 50%;
 
}
.third img{
  max-width: 40%;
  width: 40%;
  margin-bottom: 10px;
}

.first{
  margin-right: auto;
}

.second{
  margin-right: auto;
  float: left;

}

.third{
  margin-right: auto;

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
  color: white;
  font-weight: 600;
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
  background-size: 102%;
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
  margin: 0rem 0rem;
  display: flex;
  align-items: center;
  justify-content: center;
}


.nav-item img{
  width: 60%;
}

.settingbutton img{
  width: 40%;
}

input .input-auth-wallet {
    background: transparent !important;
    color: white;
    border: none;
}

</style>