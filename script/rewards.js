import {Chains, Session} from "@wharfkit/session";
import {WalletPluginPrivateKey} from "@wharfkit/wallet-plugin-privatekey";
import fetch from "node-fetch";
import {config} from "dotenv";

console.log(new Date(), 'start');
config();
const [actor, permission] = process.env.ACTOR.split("@");
const session = new Session({
  chain: Chains.WAX,
  actor, permission,
  walletPlugin: new WalletPluginPrivateKey(process.env.PRIVATE_KEYS)
}, {fetch})

const actions = [];
const ranks = [350, 175, 100];
for (let level = 0;level <= 4;level++) {
  for (let rank = 0; rank < 3;rank++) {
    let raw_amount = ranks[rank] + (25 * level);
    if (rank == 2 && level >= 3) raw_amount += 25;
    let amount = raw_amount.toFixed(4) + " DUST";
    actions.push({
      account: "niftyracecom",
      name: "setreward",
      authorization: [session.permissionLevel],
      data: {
        type: "horse",
        order: rank+1,
        level,
        amount
      }
    })
  }
}

for (let level = 0;level <= 4;level++) {
  let raw_amount_t = 350 + (10 * level);
  if (level == 0) raw_amount_t -= 25;

  let raw_amount_w = 155 + (5 * level);
  if (level == 0) raw_amount_w += 2;
  actions.push({
    account: "niftyracecom",
    name: "setreward",
    authorization: [session.permissionLevel],
    data: {
      type: "trifecta",
      order: 1,
      level,
      amount: raw_amount_t.toFixed(4) + " DUST"
    }
  })
  actions.push({
    account: "niftyracecom",
    name: "setreward",
    authorization: [session.permissionLevel],
    data: {
      type: "ticket",
      order: 1,
      level,
      amount: raw_amount_w.toFixed(4) + " DUST"
    }
  })
}

const r = await session.transact({actions})