/**
 * Configuration for Avail Stake Flow
 * 
 * This file contains all the necessary settings for the staking and nomination pool operations.
 * Please modify the values according to your requirements.
 */

export default {
  // Network Configuration
  endpoint: "wss://turing-rpc.avail.so/ws",  // RPC endpoint URL (use Turing or Mainnet as needed)

  // Account Configuration
  seed: "bottom drive obey lake curtain smoke basket hold race lonely fit walk",  // Replace it with seed phrase of your address for performing transactions.
  
  // Validator Staking Configuration
  validatorStashes: ['5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'],  // Replace it with stash/address of the Validator for which you want to claim rewards.

  // Nomination Pool Configuration
  poolID: 0,  // Set PoolID of the nomination pool you want to interact and claim rewards for.
  amount: 5,  // Set minimum threshold amount (Default is '5') to compound rewards only for pool members with pending rewards exceeding this value.

  // (NO NEED TO CHANGE)
  appId: 0,
  sessionKeys: "0xcce44c3da975792242a278a90e1557ee2059ae14a6c6104a50045e13afdaea490028ae395391cba3e7aa5219802a04a0c1833b0814ed5bfae7e5b9c453a69bbedc69835386108accc1f191b82b40d92568b5e0863243cbe0351d36d5fc823b09187d3992202265cdce9d1b95481a402c9ca39fb041615ca71992d92066841534",
}
