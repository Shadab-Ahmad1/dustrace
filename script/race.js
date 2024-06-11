import {Chains, Session} from "@wharfkit/session";
import {WalletPluginPrivateKey} from "@wharfkit/wallet-plugin-privatekey";
import {config} from "dotenv";
import fetch from 'node-fetch';
import {APIClient, FetchProvider} from "@wharfkit/antelope";
import {ContractKit} from "@wharfkit/contract";
import crypto from 'crypto';

function getRandomNumber(min, max) {
  const range = max - min + 1;
  const randomBytes = crypto.randomBytes(4);
  const randomNumber = randomBytes.readUInt32LE(0);
  return min + Math.floor(randomNumber / (0xffffffff / range));
}

function getRandomId() {
  let result = '';
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  for (let x of Array(12)) {
    result += alphabet[getRandomNumber(0, alphabet.length - 1)]
  }

  return result;
}

function randomRanks() {
  let ranks = [1,2,3,4,5,6];
  for (let i in ranks) {
    let r = getRandomNumber(0, 5);
    [ranks[i], ranks[r]] = [ranks[r], ranks[i]];
  }

  return ranks;
}

console.log(new Date(), 'start race cron');
config();
const [actor, permission] = process.env.ACTOR.split("@");
const session = new Session({
  chain: Chains.WAX,
  actor, permission,
  walletPlugin: new WalletPluginPrivateKey(process.env.PRIVATE_KEYS)
}, {fetch})

const cKit = new ContractKit({
  client: new APIClient({
    provider: new FetchProvider('https://wax.blokcrafters.io', {fetch})
  })
});

const contract = await cKit.load("niftyracecom");
const existingSession = await contract.table("sessions", "niftyracecom").all();
for (let s of existingSession) {
  // check anyone stakes
  let finishRace = false;
  let cRaces = await contract.table("races", s.session_id).all();
  for (let race of cRaces) {
    if (race.owner.toString() !== "niftyracecom") {
      console.log(new Date(), "Horse exist in ", s.session_id.toString())
      finishRace = true;
      break;
    }
  }

  if (!finishRace) {
    let cPicks = await contract.table("horsepicks", s.session_id).all({maxRows: 2});
    if (cPicks.length > 0) {
      console.log(new Date(), "Ticket exist in ", s.session_id.toString())
      finishRace = true;
    }
  }

  if (finishRace) {
    const r = await session.transact({
      action: {
        account: "niftyracecom",
        name: "finishrace",
        authorization: [session.permissionLevel],
        data: {
          id: s.session_id.toString(),
          ranks: randomRanks()
        }
      }
    })

    console.log(new Date(), 'finishRace', s.session_id.toString(), r.response.transaction_id);
  } else {
    const r = await session.transact({
      action: {
        account: "niftyracecom",
        name: "removerace",
        authorization: [session.permissionLevel],
        data: {
          id: s.session_id.toString()
        }
      }
    })

    console.log(new Date(), 'removeRace', s.session_id.toString(), r.response.transaction_id);
  }
}

let startedLevel = [];
let totalHorses = 0
const existingHorses = await contract.table("horses", "niftyracecom").all();
const ownerHorses = [];
for (let h of existingHorses) {
  if (!h.is_ready || h.active_session.toString() != "") continue;
  if (ownerHorses[h.level] === undefined) ownerHorses[h.level] = {};
  if (ownerHorses[h.level][h.owner] === undefined) ownerHorses[h.level][h.owner] = [];
  ownerHorses[h.level][h.owner].push(h.asset_id.toString());
  totalHorses++;
}

const startRaceAction = [];
while (totalHorses > 0) {
  for(let [level, owners] of Object.entries(ownerHorses)) {
    let horses_ids = [];
    for (let [owner, asset_ids] of Object.entries(owners)) {
      if (asset_ids.length === 0) continue;
      let selected_horse = asset_ids[0];
      ownerHorses[level][owner].splice(0, 1);

      if (horses_ids.length === 6) {
        startedLevel.push(level)
        startRaceAction.push({
          account: "niftyracecom",
          name: "startrace",
          authorization: [session.permissionLevel],
          data: {
            id: getRandomId(),
            level: level,
            horses_asset_id: horses_ids
          }
        });
        horses_ids = [];
      }

      horses_ids.push(selected_horse);
      totalHorses--;
    }

    if (horses_ids.length > 0) {
      startedLevel.push(level)
      startRaceAction.push({
        account: "niftyracecom",
        name: "startrace",
        authorization: [session.permissionLevel],
        data: {
          id: getRandomId(),
          level: level,
          horses_asset_id: horses_ids
        }
      });
    }
  }
}

if (startRaceAction.length === 0 || !startedLevel.includes("0")) {
  startRaceAction.push({
    account: "niftyracecom",
    name: "startrace",
    authorization: [session.permissionLevel],
    data: {
      id: getRandomId(),
      level: 0,
      horses_asset_id: []
    }
  })
}

const r = await session.transact({actions: startRaceAction})
console.log(new Date(), 'start all races', r.response.transaction_id)
