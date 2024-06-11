import {createApp, Ref} from 'vue'
import { ref } from 'vue';
import { Chains, Session, SessionKit } from '@wharfkit/session'
import { WalletPluginAnchor } from '@wharfkit/wallet-plugin-anchor'
import { WalletPluginCloudWallet } from '@wharfkit/wallet-plugin-cloudwallet'
import WebRenderer from '@wharfkit/web-renderer'

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import './style.css'

import App from './App.vue'
import router from "./components/router";
import {APIClient, FetchProvider} from "@wharfkit/antelope";
import Notifications from "@kyvg/vue3-notification";
import {getAtomicEP, getChainEP} from "./components/helpers";

const app = createApp(App);
const atomicClient = new APIClient({
  provider: new FetchProvider(getAtomicEP())
});
const chainClient = new APIClient({
  provider: new FetchProvider(getChainEP())
});
const sessionKit = new SessionKit({
  appName: 'Dust Horse',
  chains: [Chains.WAX],
  ui: new WebRenderer(),
  walletPlugins: [
    new WalletPluginAnchor(),
    new WalletPluginCloudWallet(),
  ],
})

let session = ref(undefined) as Ref<Session | undefined>

sessionKit.restore().then(s => {
  session.value = s
})

app.provide('atomicClient', atomicClient);
app.provide('chainClient', chainClient);
app.provide('session', session);
app.provide('sessionKit', sessionKit)
app.use(Notifications)
app.use(router);
app.mount('#app')
