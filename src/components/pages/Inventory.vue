<script setup lang="ts">
import {computed, inject, onMounted, reactive, type Ref, ref} from "vue";
import {Types, AtomicAssetsAPIClient} from "@wharfkit/atomicassets";
import {APIClient} from "@wharfkit/antelope";
import ContractKit from "@wharfkit/contract";
import NftCard from "../parts/NftCard.vue";
import {AccRewardsTable, HorsesTable, StakedDetail, TemplatesTable, TicketsTable} from "../interfaces";
import {notify} from "@kyvg/vue3-notification";
import Modal from "../parts/Modal.vue";
import {AnyAction, Session, SessionKit} from "@wharfkit/session";
import router from "../router"

const myInventory = ref(null) as Ref<Types.AssetObject[] | null>;
const myStaked = ref(null) as Ref<Types.AssetObject[] | null>;
const active_asset = ref(null) as Ref<Types.AssetObject | null>;
const e_modal = ref();
const activeTab = ref("inventory");
const reward = ref("-");

const session = inject<Ref<Session | undefined>>("session")!;
const chainClient = inject<APIClient>('chainClient')!;
const atomicClient = inject<APIClient>('atomicClient')!;

const upgrade_cost = 157;
interface upgradeForm {
  strength: number,
  speed: number,
  endurance: number,
  agility: number,
  method: string
}

interface activeSession {
  [key: string]: StakedDetail;
}

const cacheSession = ref({}) as Ref<activeSession>;
const cKit = new ContractKit({client: chainClient});
const formInput = reactive<upgradeForm>({
  strength: 0,
  speed: 0,
  endurance: 0,
  agility: 0,
  method: "in_game"
});

function getTotalCost() {
  let total = 0;
  for (let [k, v] of Object.entries(formInput)) {
    if (k === 'method') continue;
    total += Number(v);
  }

  return Number(total * upgrade_cost).toLocaleString('en-US', {
      minimumFractionDigits: 4
  });
}
const upgradeCost = computed(getTotalCost)

interface template {[key: number]: string}
let template_ids: template | null = null;

function getNftType(template_id: number): string {
  if (template_ids === null) return "";
  return template_ids[template_id];
}

async function getTemplateIds() {
  if (template_ids !== null) return template_ids;
  let contract = await cKit.load('niftyracecom');
  let f: TemplatesTable[] = await contract.table('templates', 'niftyracecom').all();
  template_ids = {};
  for (let t of f) {
    template_ids[t.template_id.toNumber()] = t.nft_type;
  }

  return template_ids;
}

const selectedNft = ref<Array<String>>([]);
function selectNft(asset_id: String) {
  if (selectedNft.value.includes(asset_id)) {
    selectedNft.value.splice(selectedNft.value.indexOf(asset_id), 1);
  } else {
    selectedNft.value.push(asset_id)
  }
}

const selectedStakeNft = ref<Array<String>>([]);
function selectStakeNft(asset_id: String) {
  if (selectedStakeNft.value.includes(asset_id)) {
    selectedStakeNft.value.splice(selectedStakeNft.value.indexOf(asset_id), 1);
  } else {
    selectedStakeNft.value.push(asset_id)
  }
}

async function reloadInventory() {
  myInventory.value = null;
  selectedNft.value = [];
  let t_ids = await getTemplateIds();
  let api = new AtomicAssetsAPIClient(atomicClient);
  let assets = await api.atomicassets.v1.get_assets({
    owner: [session.value!.actor.toString()],
    template_whitelist: Object.keys(t_ids)
  })

  myInventory.value = assets.data;
}

async function reloadStaked() {
  myStaked.value = null
  selectedStakeNft.value = [];
  let contract = await cKit.load('niftyracecom');
  let tickets: TicketsTable[] = await contract.table('tickets', 'niftyracecom').all({
    from: session.value!.actor,
    to: session.value!.actor,
    index_position: "2",
    key_type: "name",
    json: true
  });
  let horses: HorsesTable[] = await contract.table('horses', "niftyracecom").all({
    from: session.value!.actor,
    to: session.value!.actor,
    index_position: "2",
    key_type: "name",
    json: true
  });

  let aids = [];
  cacheSession.value = {};
  for (let h of horses) {
    aids.push(h.asset_id.toString())
    cacheSession.value[h.asset_id.toString()] = {
      ready: h.is_ready,
      name: h.active_session.toString(),
      type: "horse"
    };
  }
  for (let d of tickets) {
    aids.push(d.asset_id.toString());
    cacheSession.value[d.asset_id.toString()] = {
      ready: true,
      name: d.active_session.toString(),
      type: "ticket"
    };
  }

  let api = new AtomicAssetsAPIClient(atomicClient);
  let assets = await api.atomicassets.v1.get_assets({
    owner: ["niftyracecom"],
    ids: aids
  })

  myStaked.value = assets.data;
}

async function unstakeNfts(asset_ids: Array<String>) {
  if (asset_ids.length === 0) {
    return notify({
      title: "Error",
      text: "Please select at least 1 NFT",
      type: "error",
    });
  }

  let s = session.value!;
  await s.transact({
    actions: [{
      account: "niftyracecom",
      name: "withdrawnft",
      authorization: [s.permissionLevel],
      data: {
        owner: s.actor,
        asset_ids: asset_ids
      }
    }]
  });

  await reloadStaked();
  await reloadInventory();
  return notify({
    title: "Success",
    text: "Successfully unstake your assets",
    type: "success",
  });
}

async function stakeNfts(asset_ids: Array<String>) {
  if (asset_ids.length === 0) {
    return notify({
      title: "Error",
      text: "Please select at least 1 NFT",
      type: "error",
    });
  }

  let s = session.value!;
  await s.transact({
    actions: [{
      account: "atomicassets",
      name: "transfer",
      authorization: [s.permissionLevel],
      data: {
        from: s.actor,
        to: "niftyracecom",
        asset_ids: asset_ids,
        memo: "Stake from niftyrace.com"
      }
    }]
  });

  await reloadStaked();
  await reloadInventory();
  return notify({
    title: "Success",
    text: "Successfully stake your assets",
    type: "success",
  });
}

async function takeCareHorses(asset_ids: Array<String>) {
  if (asset_ids.length === 0) {
    return notify({
      title: "Error",
      text: "Please select at least 1 horse",
      type: "error",
    });
  }

  let s = session.value!;
  await s.transact({
    actions: [{
      account: "niftyracecom",
      name: "tkecarehorse",
      authorization: [s.permissionLevel],
      data: {
        owner: s.actor,
        asset_ids: asset_ids
      }
    }]
  });

  for (let aid of asset_ids) {
    cacheSession.value[Number(aid)].ready = true;
  }

  return notify({
    title: "Success",
    text: "Successfully tack up horse",
    type: "success",
  });
}

async function doUpgrade() {
  let s = session.value!;
  let total_upgrade = getTotalCost();
  if (total_upgrade == "0.0000 DUST") {
    return notify({
      title: "Error",
      text: "At least put 1 upgrade on attribute",
      type: "error"
    })
  }

  const actions: AnyAction[] = [
    {
      account: "niftyracecom",
      name: "horseupgrade",
      authorization: [s.permissionLevel],
      data: {
        owner: s.actor,
        asset_id: active_asset.value!.asset_id,
        strength: formInput.strength,
        speed: formInput.speed,
        endurance: formInput.endurance,
        agility: formInput.agility
      }
    }
  ];

  let total_lacked = 0;
  if (formInput.method == "wallet") {
    total_lacked = Number(total_upgrade.replace(",", ""));
  } else if (formInput.method == "both") {
    total_lacked = Number(total_upgrade.replace(",", "")) - Number(reward.value.replace(",", ""));
  }

  if (total_lacked > 0) {
    let format_dust: string = total_lacked.toFixed(4) + " DUST";
    actions.unshift({
      account: "niftywizards",
      name: "transfer",
      authorization: [s.permissionLevel],
      data: {
        from: s.actor,
        to: 'niftyracecom',
        quantity: format_dust,
        memo: "Deposit DU$T"
      }
    });
  }

  await s.transact({actions});

  for (let [k, v] of Object.entries(formInput)) {
    active_asset.value!.mutable_data[k] = Number(active_asset.value!.mutable_data[k]) + Number(v)
  }

  e_modal.value!.hide();
  return notify({
    title: "Success",
    text: "Successfully upgrade your horse",
    type: "success",
  });
}

async function doCancelPick(asset_id: string) {
  let s = session.value!;
  await s.transact({
    actions: [{
      account: "niftyracecom",
      name: "cancelpick",
      authorization: [s.permissionLevel],
      data: {
        owner: session.value!.actor,
        ticket_id: asset_id
      }
    }]
  });

  cacheSession.value[asset_id].name = '';
  return notify({
    title: "Success",
    text: "Successfully cancel pick horse",
    type: "success",
  });
}

async function doWithdraw() {
  let s = session.value!;
  await s.transact({
    actions: [{
      account: "niftyracecom",
      name: "claimtoken",
      authorization: [s.permissionLevel],
      data: {
        account: s.actor,
      }
    }]
  });

  reward.value = "0.0000";
  return notify({
    title: "Success",
    text: "Successfully withdraw",
    type: "success",
  });
}

async function loadReward() {
  let contract = await cKit.load("niftyracecom");
  let wallet: AccRewardsTable[] = await contract.table("accrewards", session.value!.actor).all();
  if (wallet.length == 0) {
    return reward.value = "0.0000"
  }

  reward.value = wallet[0].balance.value.toLocaleString('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}

function openUpgrade(asset: Types.AssetObject) {
  active_asset.value = asset;
  e_modal.value!.show();
}

function isTicketUsed(asset_id: string) {
  let tmp = cacheSession.value![asset_id];
  return tmp.type == 'ticket' && tmp.name != '';
}

const onlySelectHorse = computed(() => {
  if (template_ids === null) return false;

  let is_horse = true;
  for (let s of myStaked.value!) {
    if (selectedStakeNft.value!.includes(s.asset_id.toString())) {
      let template = template_ids[s.template.template_id.toNumber()];
      if (template !== 'horse') {
        is_horse = false;
        break;
      }

      let is_ready = cacheSession.value[s.asset_id.toString()].ready;
      if (is_ready) {
        is_horse = false;
        break;
      }
    }
  }

  return is_horse;
});

onMounted(() => {
  loadReward();
  reloadInventory();
  reloadStaked();
  e_modal.value.onHide(() => {
    active_asset.value = null;
    formInput.strength = 0;
    formInput.speed = 0;
    formInput.endurance = 0;
    formInput.agility = 0;
    formInput.method = "in_game";
  })
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
        <li class="nav-item ">
          <RouterLink to="/" class="nav-link"><img src="/src/assets/home.png" width="100%"></RouterLink>
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
  <div class="container bodycontainer">
<div class="card mb-3">
  <div class="card-body d-flex justify-content-between profile" style="background-color: #c8c8c8;">
    <div class="reward">
      Reward DU$T
      <div class="token-amount">
        {{reward}}
      </div>
    </div>
    <div>
      <button class="btn btn-primary me-1" type="button" @click="doWithdraw">
        Withdraw
      </button>
    </div>
  </div>
</div>
<div class="card" >
  <div class="card-header d-flex justify-content-between" style="background-color: #9f9f9f;margin: -1px;">
    <ul class="nav nav-pills">
      <li class="nav-item">
        <a :class="'nav-link ' + (activeTab == 'inventory' ? 'active' : '')" href="javascript://"
          @click="activeTab = 'inventory'">My Stable</a>
      </li>
      <li class="nav-item">
        <a :class="'nav-link ' + (activeTab == 'staked' ? 'active' : '')" href="javascript://"
          @click="activeTab = 'staked'">Staked</a>
      </li>
    </ul>
    <ul class="nav nav-pills" v-if="activeTab == 'inventory' && selectedNft.length > 0">
      <li class="nav-item">
        <a class="nav-link" href="javascript://" @click="stakeNfts(selectedNft)">Stake ✅</a>
      </li>
    </ul>
    <ul class="nav nav-pills justify-content-end" v-if="activeTab == 'staked' && selectedStakeNft.length > 0">
      <li class="nav-item" v-if="onlySelectHorse">
        <a class="nav-link" href="javascript://" @click="takeCareHorses(selectedStakeNft)">Tack Up ✅</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="javascript://" @click="unstakeNfts(selectedStakeNft)">Unstake ✅</a>
      </li>
    </ul>
  </div>
  <div class="card-body" style="margin-bottom: -1rem; background-color: #c8c8c8">
    <div v-if="activeTab == 'inventory'">
      <div v-if="myInventory == null" key="inventory-block" class="alert alert-info mb-3">
        Fetching your inventory...
      </div>
      <div v-else-if="myInventory.length == 0" class="alert alert-info mb-3">
        You don't have any requirement nft
      </div>
      <div v-else class="row">
        <div class="col-md-4 col-sm-6" v-for="asset of myInventory" :key="'inv'+asset.asset_id">
          <NftCard
              @onSelect="selectNft"
              :selected="selectedNft.includes(asset.asset_id.toString())"
              :data="asset">
            <button type="button" class="btn btn-primary btn-sm me-1" @click="stakeNfts([asset.asset_id.toString()])">
              Stake
            </button>
            <button type="button" class="btn btn-primary btn-sm me-1" v-if="getNftType(asset.template.template_id.toNumber()) == 'horse'"
              @click="openUpgrade(asset)">Upgrade</button>
          </NftCard>
        </div>
      </div>
    </div>
    <div v-if="activeTab == 'staked'">
      <div v-if="myStaked == null" key="staked-block" class="alert alert-info mb-3">
        Fetching your stake...
      </div>
      <div v-else-if="myStaked.length == 0" class="alert alert-info mb-3">
        You don't have any staked nft
      </div>
      <div v-else class="row">
        <div class="col-md-4 col-sm-6" style="background-color: #9f9f9f;" v-for="asset of myStaked"
             :key="'stk'+asset.asset_id">
          <NftCard
              @onSelect="selectStakeNft"
              :selected="selectedStakeNft.includes(asset.asset_id.toString())"
              :data="asset"
              :session="cacheSession[asset.asset_id.toString()]">
            <button type="button" class="btn-primary btn btn-sm me-1" v-if="isTicketUsed(asset.asset_id.toString())" @click="doCancelPick(asset.asset_id.toString())">
              Cancel Pick
            </button>
            <button type="button" class="btn btn-primary btn-sm me-1" @click="unstakeNfts([asset.asset_id.toString()])">
              Unstake
            </button>
            <button type="button" class="btn btn-primary btn-sm me-1" v-if="cacheSession[asset.asset_id.toString()].type == 'horse' && !cacheSession[asset.asset_id.toString()].ready"
              @click="takeCareHorses([asset.asset_id.toString()])">Tack Up</button>
          </NftCard>
        </div>
      </div>
    </div>
  </div>
</div>
<Modal title="Upgrade Horse" ref="e_modal" size="lg" :footer-class="['d-flex', 'justify-content-between']">
  <template #body>
    <div class="row" v-if="active_asset != null">
      <div class="col-md-12">
        <div class="form-group mb-3">
          <label for="" class="control-label">Horse ID</label>
          <input type="text" class="form-control" readonly :value="active_asset.asset_id">
        </div>
      </div>
      <div class="col-md-6">
        <div class="form-group mb-3">
          <label for="" class="control-label">Strength [{{active_asset.mutable_data.strength}}]</label>
          <input type="text" class="form-control" v-model="formInput.strength">
        </div>
      </div>
      <div class="col-md-6">
        <div class="form-group mb-3">
          <label for="" class="control-label">Agility [{{active_asset.mutable_data.agility}}]</label>
          <input type="text" class="form-control" v-model="formInput.agility">
        </div>
      </div>
      <div class="col-md-6">
        <div class="form-group mb-3">
          <label for="" class="control-label">Endurance [{{active_asset.mutable_data.endurance}}]</label>
          <input type="text" class="form-control" v-model="formInput.endurance">
        </div>
      </div>
      <div class="col-md-6">
        <div class="form-group mb-3">
          <label for="" class="control-label">Speed [{{active_asset.mutable_data.speed}}]</label>
          <input type="text" class="form-control" v-model="formInput.speed">
        </div>
      </div>
      <div class="col-md-12">
        <div class="form-group mb-3">
          <label for="" class="control-label">Payment Method</label>
          <select class="form-control" v-model="formInput.method">
            <option value="in_game">In Game Balance</option>
            <option value="wallet">Wallet</option>
            <option value="both">Both</option>
          </select>
        </div>
      </div>
    </div>
  </template>
  <template #footer>
    <span class="float-start">
      Cost: {{upgradeCost}} DU$T
    </span>
    <button type="button" @click="doUpgrade" class="btn btn-primary">Upgrade</button>
  </template>
</Modal>
</div>
</template>

<style scoped>
.profile .reward {
  font-size: 10px;
  font-weight: bold;
}
.profile .reward .token-amount {
  font-size: 24px;
  line-height: 20px;
}

.bodycontainer{
  background-image: url('/src/assets/background-horizontal.png');
  background-size: cover;
  background-position: top;
  min-height: 80vh;
  padding-bottom: 6rem;
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
  font-size: 1em;
  font-weight: 700;
}

.btn{
  font-size: 2em;
  font-weight: 800;
  color: white;
}

.me-1{
  font-size: 1em;
  font-weight: 700;
  color:#080808;
  background-color:#3d8bb9;
    border-color:#3d8bb9;
}

.nav-link{
  color: #080808;
  font-weight: 600;
}
.nav-pills .nav-link.active, .nav-pills .show>.nav-link {
    color: #080808;
    background-color: #3d8bb9;
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