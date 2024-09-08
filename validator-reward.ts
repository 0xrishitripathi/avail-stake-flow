import { ISubmittableResult } from "@polkadot/types/types";
import { H256 } from "@polkadot/types/interfaces/runtime";
import { getKeyringFromSeed, initialize, disconnect } from "avail-js-sdk";
import { SubmittableExtrinsic } from '@polkadot/api/types';
import config from "./config";
import readline from "readline";
import { KeyringPair } from "@polkadot/keyring/types";

const promptUser = (query: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => rl.question(query, (ans) => {
    rl.close();
    resolve(ans);
  }));
};

const main = async () => {
    const api = await initialize(config.endpoint);
    const validatorStashes: string[] = config.validatorStashes;
    
    // Create account from seed
    const account: KeyringPair = getKeyringFromSeed(config.seed);
  
    // Define options for transaction
    const options = { nonce: -1 };
  
    // Helper function to check if validatorStashes is effectively empty
    const isValidatorStashesEmpty = () => 
      validatorStashes.length === 0 || (validatorStashes.length === 1 && validatorStashes[0] === '');
  
    // Check if validator stashes are empty (or contain only an empty string)
    if (isValidatorStashesEmpty()) {
      console.log("No validators specified in the configuration.");
      await disconnect();
      process.exit(0);
    }
  
    const activeEra = (await api.query.staking.currentEra()).toJSON() as number;
    const startEra = Math.max(0, activeEra - 84);
    const endEra = activeEra;
  
    let toClaim: { era: number; validator: string }[] = [];
    let pendingClaimsCount: { [validator: string]: number } = {};
  
    // Check for validator pending claims
    for (let i = startEra; i < endEra; i++) {
      const eraRewardPoints = (await api.query.staking.erasRewardPoints(i)).toJSON() as {
        total: number;
        individual: { [address: string]: number };
      };
      const eraRewardPointsValidatorList = Object.keys(eraRewardPoints.individual);
      const claimedRewards = (await api.query.staking.claimedRewards.entries(i)).map(
        (x) => (x[0].toHuman() as string[])[1]
      );
  
      let validatorsWithPendingClaim = eraRewardPointsValidatorList.filter((x) => !claimedRewards.includes(x));
      validatorsWithPendingClaim = validatorsWithPendingClaim.filter(
          x => eraRewardPoints.individual[x] > 0 
      );
  
      validatorsWithPendingClaim = validatorsWithPendingClaim.filter((x) => validatorStashes.includes(x));
  
      if (validatorsWithPendingClaim.length > 0) {
        console.log(`Pending claims for Era ${i}`);
      }
  
      for (const validator of validatorsWithPendingClaim) {
        toClaim.push({ era: i, validator });
        pendingClaimsCount[validator] = (pendingClaimsCount[validator] || 0) + 1;
      }
    }
  
    // Display validator pending claims or no pending claims message
    if (Object.keys(pendingClaimsCount).length > 0) {
      for (const validator in pendingClaimsCount) {
        const count = pendingClaimsCount[validator] || 0;
        console.log(`Validator *${validator}* has unclaimed rewards for ${count} Eras`);
      }
  
      const userConfirmation = "yes";
      if (true) {
        console.log("Claiming Rewards:");
        
        const validatorTransactions = await Promise.all(
          [...new Set(toClaim.map(x => x.validator))].map(validator => {
            console.log(`Validator: ${validator}`);
            return toClaim
              .filter(claim => claim.validator === validator)
              .map(claim => api.tx.staking.payoutStakers(claim.validator, claim.era));
          })
        );
  
        const allTransactions: SubmittableExtrinsic<"promise", ISubmittableResult>[] = validatorTransactions.flat();
  
        const chunks: SubmittableExtrinsic<"promise", ISubmittableResult>[][] = [];
        const chunkSize = 5;
        for (let i = 0; i < allTransactions.length; i += chunkSize) {
          const chunk = allTransactions.slice(i, i + chunkSize);
          chunks.push(chunk);
        }
  
        const batches = chunks.map((x) => api.tx.utility.batchAll(x));
        for (const [i, tx] of batches.entries()) {
          console.log(`Sending batch transaction ${i + 1} of ${batches.length}`);
  
          const txResult = await new Promise<ISubmittableResult>((res) => {
            tx.signAndSend(account, options, (result: ISubmittableResult) => {
              if (result.isInBlock || result.isError) {
                res(result);
              }
            });
          });
  
          if (!txResult.isError) {
            console.log(`Tx Hash: ${txResult.txHash as H256}, Block Hash: ${txResult.status.asInBlock as H256}`);
          } else {
            console.log(`Transaction was not executed for batch transaction ${i + 1} of ${batches.length}`);
          }
        }
      } else {
        console.log("Rewards claiming cancelled.");
      }
    } else {
      // Output for each validator when there are no pending claims
      for (const validator of validatorStashes) {
        console.log(`No pending claims found for validator: ${validator}`);
      }
    }
  
    await disconnect();
    process.exit(0);
  };
  
  main();
