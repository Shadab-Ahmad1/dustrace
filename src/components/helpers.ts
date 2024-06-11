export function getAtomicEP() {
  return localStorage['atomic_api'] || 'https://wax.api.atomicassets.io/';
}

export function getChainEP() {
  return localStorage['chain_api'] || 'https://wax.blokcrafters.io';
}
