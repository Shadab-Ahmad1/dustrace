<script setup lang="ts">
import {computed, inject, onMounted, type Ref, ref} from "vue";
import ContractKit from "@wharfkit/contract";
import {Session, SessionKit, TimePoint} from "@wharfkit/session";
import {APIClient} from "@wharfkit/antelope";
import {HorsePicksTable, RacesTable, SessionsTable, TicketsTable} from "../interfaces";
import {notify} from "@kyvg/vue3-notification";
import Countdown from "../parts/Countdown.vue";
import router from "../router"



const session = inject<Ref<Session | undefined>>("session")!;
const chainClient = inject<APIClient>('chainClient')!;

interface raceDetail {
  activeSession: String,
  availableTicket: TicketsTable[],
  usedTicket: TicketsTable | null,
  horses: RacesTable[]
}

const cKit = new ContractKit({client: chainClient});
const races = ref(null) as Ref<SessionsTable[] | null>;
const activeRace = ref(null) as Ref<raceDetail | null>;
const isLoading = ref(false);

const ticket_id = ref<String>("");
const trifecta = ref<String[]>([]);
const winning = ref<String>("0");

const printUsedTicket = computed(() => {
  if (activeRace.value?.usedTicket == null) {
    return "";
  }

  let ticket = activeRace.value!.usedTicket!;
  return `[Level: ${ticket.level}] ${ticket.asset_id.toString()}`
})

async function loadRaceSessions() {
  let contract = await cKit.load('niftyracecom');
  races.value = await contract.table("sessions", "niftyracecom").all();
}

async function loadRaceDetail(activeSession: SessionsTable) {
  if (activeRace.value?.activeSession == activeSession.session_id.toString()) return;
  isLoading.value = true;
  let contract = await cKit.load('niftyracecom');
  let horses: RacesTable[] = await contract.table("races", activeSession.session_id.toString()).all();
  let tickets: TicketsTable[] = await contract.table("tickets", "niftyracecom").all({
    from: session.value!.actor,
    to: session.value!.actor,
    index_position: "2",
    key_type: "name",
    json: true
  });
  let availableTicket: TicketsTable[] = [];
  let usedTicket: TicketsTable | null = null;

  for (let ticket of tickets) {
    if (ticket.active_session.toString() == activeSession.session_id.toString()) {
      usedTicket = ticket;
    } else if (ticket.active_session.toString() == "" && ticket.level >= activeSession.level) {
      availableTicket.push(ticket);
    }
  }

  if (availableTicket.length > 0) ticket_id.value = availableTicket[0].asset_id.toString();
  winning.value = "0";
  trifecta.value = [];
  if (usedTicket != null) {
    let picks: HorsePicksTable[] = await contract.table("horsepicks", activeSession.session_id.toString()).all({
      from: usedTicket.asset_id.toNumber(),
      to: usedTicket.asset_id.toNumber(),
      json: true
    });

    winning.value = picks[0].horse_id.toString();
    for (let t of picks[0].trifecta) {
      trifecta.value.push(t.toString());
    }
  }

  isLoading.value = false;
  activeRace.value = {
    activeSession: activeSession.session_id.toString(),
    horses,
    availableTicket,
    usedTicket,
  };
}

async function pickHorse() {
  if (ticket_id.value == "") {
    return notify({
      title: "Error",
      text: "Please select a ticket",
      type: "error",
    });
  }

  if (trifecta.value.length > 0 && trifecta.value.length != 3) {
    return notify({
      title: "Error",
      text: "You must pick 3 ponies for a trifecta",
      type: "error",
    });
  }

  let usedTicket: number | null = null;
  let pick = activeRace.value!;
  for (let [i, t] of Object.entries(pick.availableTicket)) {
    if (t.asset_id.toString() == ticket_id.value) {
      usedTicket = Number(i);
      break;
    }
  }

  if (usedTicket === null) {
    return notify({
      title: "Error",
      text: "Cannot find selected ticket",
      type: "error",
    });
  }

  let s = session.value!;
  await s.transact({
    actions: [{
      account: "niftyracecom",
      name: "pickhorse",
      authorization: [s.permissionLevel],
      data: {
        owner: session.value!.actor,
        ticket_id: ticket_id.value,
        session_id: pick.activeSession,
        trifecta: trifecta.value,
        horse_asset_id: winning.value
      }
    }]
  });

  pick.usedTicket = pick.availableTicket[usedTicket];
  pick.availableTicket.splice(usedTicket, 1);
  activeRace.value = pick;
  ticket_id.value = "";
  return notify({
    title: "Success",
    text: "Successfully pick horse",
    type: "success",
  });
}

function formatTime(timestamp: TimePoint) {
  let d = new Date(timestamp.toMilliseconds());
  let fs = d.getFullYear() + "-";
  fs += String(d.getMonth() + 1).padStart(2, '0') + "-"
  fs += String(d.getDay()).padStart(2, '0') + ' '
  fs += String(d.getHours()).padStart(2, '0') + ":";
  fs += String(d.getMinutes()).padStart(2, '0');
  return fs;
}

async function cancelPickHorse() {
  let pick = activeRace.value!;
  if (pick.usedTicket == null) {
    return alert("You don't have used ticket");
  }

  let s = session.value!;
  await s.transact({
    actions: [{
      account: "niftyracecom",
      name: "cancelpick",
      authorization: [s.permissionLevel],
      data: {
        owner: session.value!.actor,
        ticket_id: pick.usedTicket!.asset_id
      }
    }]
  });

  pick.availableTicket.push(pick.usedTicket!);
  pick.usedTicket = null;
  activeRace.value = pick;
  ticket_id.value = "";
  trifecta.value = [];
  winning.value = "0";

  return notify({
    title: "Success",
    text: "Successfully cancel pick horse",
    type: "success",
  });
}

onMounted(() => {
  loadRaceSessions();
});

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
          <input type="text" class="input-auth-wallet" readonly :value="session.actor">
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
    <div class=" navbar-collapse" id="navbarMainMenu">
      <ul class="navbar-nav mx-auto mb-2 mb-lg-0 d-flex align-items-center justify-content-center text-center">
        <li class="nav-item">
          <RouterLink to="/" class="nav-link"><img src="/src/assets/home.png" width="100%"></RouterLink>
        </li>
        <li class="nav-item ">
          <RouterLink to="/stable" class="nav-link"><img src="/src/assets/menustable.png"></RouterLink>
        </li>

        <li class="nav-item">
          <RouterLink to="/results" class="nav-link"><img src="/src/assets/RESULTS.png"></RouterLink>
        </li>
      </ul>

    </div>
  </div>
</nav>

  </div>

<section class="mainbody">
  <div class="row mb-5" >
    <div class="col-sm-12 text-center">
      <div>Next Race In</div>
      <Countdown />
    </div>
  </div>
  <div class="row" v-if="races == null">
    <div class="col-md-12">
      <div class="alert alert-info">
        Fetching race session
      </div>
    </div>
  </div>
  <div class="row" v-else-if="races.length == 0">
    <div class="col-md-12">
      <div class="alert alert-info">
        No Race Session Active
      </div>
    </div>
  </div>
  <div class="row" v-else>
    <div class="col-md-4">
      <div class="card mb-3">
        <div class="card-header color-light-gray">
          Race Session
        </div>
        <div class="list-group list-group-flush">
          <a href="#" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center color-light-gray"
             :class="{active: activeRace != null && activeRace.activeSession == race.session_id.toString()}"
             v-for="[idx, race] of Object.entries(races)" :key="`race_${race.session_id}`" @click="loadRaceDetail(race)">
            <div>
              Race {{Number(idx) + 1}}
              <div class="time-block">
                {{formatTime(race.time)}}
              </div>
            </div>
            <span class="badge text-bg-primary rounded-pill">
              level: {{race.level}}
            </span>
          </a>
        </div>
      </div>
    </div>
    <div class="col-md-8">
      <div class="alert alert-info" v-if="isLoading">
        Fetching race detail...
      </div>
      <div class="alert alert-info" v-else-if="activeRace == null">
        Please select session
      </div>
      <div class="card" v-else>
        <div class="card-header color-light-gray">
          Race Detail
        </div>
        <div class="card-body color-light-gray">
          <div class="row">
            <div class="col-md-12" v-if="activeRace.usedTicket == null">
              <div class="form-group mb-3">
                <label for="available" class="control-label">Your Available Ticket</label>
                <select class="form-control color-dark-gray" style="border-color: rgb(159, 159, 159);"  v-model="ticket_id" v-if="activeRace.availableTicket.length > 0">
                  <option :value="ticket.asset_id.toString()" v-for="ticket of activeRace.availableTicket">
                    [Level: {{ticket.level}}] {{ticket.asset_id}}
                  </option>
                </select>
                <input type="text" readonly class="form-control color-dark-gray" style="border-color: rgb(159, 159, 159);" value="No Available Ticket" v-else>
              </div>
            </div>
            <div class="col-md-12" v-else>
              <div class="form-group mb-3">
                <label for="used" class="control-label">Used Ticket ID</label>
                <input type="text" class="form-control" readonly :value="printUsedTicket">
              </div>
            </div>
          </div>
          <div class="mb-1">Horse Selection</div>
          <div class="row mb-3">
            <div class="col-md-6 mb-3">
              <div class="card">
                <div class="card-header d-flex justify-content-between color-dark-gray">
                  <span>Trifecta</span>
                  <button class="btn btn-xs btn-primary me-1 px-4" @click="trifecta = []">
                    Clear
                  </button>
                </div>
                <div class="list-group list-group-flush">
                  <div class="list-group-item d-flex justify-content-between align-items-center color-dark-gray" v-for="horse of activeRace!.horses" :key="`tr_${horse.asset_id}`">
                    <div>
                      <input type="checkbox" class="form-check-input me-2 color-dark-gray" :id="`ck_${horse.asset_id}`"
                             :value="horse.asset_id.toString()" v-model="trifecta" :checked="trifecta.includes(horse.asset_id.toString())"
                             :disabled="activeRace.usedTicket != null">
                      <label :for="`ck_${horse.asset_id}`" class="form-check-label">
                        {{ horse.asset_id }}
                        <span v-if="trifecta.includes(horse.asset_id.toString())" class="badge text-bg-success">
                          {{trifecta.indexOf(horse.asset_id.toString()) + 1}}
                        </span>
                      </label>
                    </div>
                    <span class="badge text-bg-primary rounded-pill">
                      {{horse.owner.toString() == "niftyracecom"?"horse droid" : horse.owner}}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-6 mb-3">
              <div class="card">
                <div class="card-header d-flex justify-content-between color-dark-gray">
                  <span>Win</span>
                  <button class="btn btn-xs btn-primary me-1 px-4" @click="winning = '0'">
                    Clear
                  </button>
                </div>
                <div class="list-group list-group-flush">
                  <div class="list-group-item d-flex justify-content-between align-items-center color-dark-gray" v-for="horse of activeRace!.horses" :key="`wn_${horse.asset_id}`">
                    <div> 
                      <input type="radio" class="form-check-input me-2 color-dark-gray" :id="`opt_${horse.asset_id}`" :disabled="activeRace!.usedTicket != null"
                             :value="horse.asset_id.toString()" v-model="winning" :checked="horse.asset_id.toString() == winning">
                      <label :for="`opt_${horse.asset_id}`" class="form-check-label">
                        {{ horse.asset_id }}
                      </label>
                    </div>
                    <span class="badge text-bg-primary rounded-pill">
                      {{horse.owner.toString() == "niftyracecom" ? "horse droid" : horse.owner}}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-12">
              <div class="alert alert-warning warning-background-color">
                In order to select both options you must stake 100,000 DUST to niftyracecom  at <a href="https://dustismagic.com" target="stake">dustismagic.com</a>
              </div>
            </div>
          </div>
          <button class="btn btn-primary me-1" type="button" @click="pickHorse" v-if="activeRace!.usedTicket == null">
            Pick Horse
          </button>
          <button class="btn btn-primary me-1" type="button" @click="cancelPickHorse" v-else>
            Cancel Pick
          </button>
        </div>
      </div>
    </div>
  </div>
</section>
</template>

<style scoped>
.btn-xs {
  --bs-btn-padding-y: .05rem;
  --bs-btn-padding-x: .5rem;
  --bs-btn-font-size: 0.75rem;
}
div.time-block {
  font-size: 0.7em;
  font-style: italic;
}
.active .text-bg-primary {
  background-color: white !important;
  color: #0d6efd !important;
}
.cooldown {
  font-size: 60px;
  font-weight: bold;
  line-height: 50px;
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

.mainbody{

  background-image: url('/src/assets/background-horizontal.png');
  background-size: 100% 100%; /* or background-size: contain; */
  background-position: center;
  background-repeat: no-repeat;
  min-height: 50rem;
    padding-bottom: 4rem;
}

.me-1{
  font-size: 1em !important;
  font-weight: 700 !important;
  color:#080808 !important;
  background-color:#3d8bb9;
    border-color:#3d8bb9;
    padding: 8px 5px;
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