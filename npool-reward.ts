import { ISubmittableResult } from "@polkadot/types/types";
import { H256 } from "@polkadot/types/interfaces/runtime";
import { getKeyringFromSeed, initialize, disconnect } from "avail-js-sdk";
import { SubmittableExtrinsic } from '@polkadot/api/types';
import config from "./config";
import readline from "readline";
import { BN } from "@polkadot/util";
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
  
  // Create account from seed
  const account: KeyringPair = getKeyringFromSeed(config.seed);

  // Define options for transaction
  const options = { nonce: -1 };

  if (config.poolID === 0) {
    console.log("No pending claims found for pool members.");
  } else {
    const poolMembers = await api.query.nominationPools.poolMembers.entries();
    const poolMembersFiltered = poolMembers.filter(([k, v]) => (v as any).toJSON().poolId == config.poolID);

    const entries = await Promise.all(poolMembersFiltered.map(async ([key, value]) => {
      const address = key.args[0].toHuman();
      const permission = (await api.query.nominationPools.claimPermissions(key.args[0])).toHuman();
      
      if (["PermissionlessCompound", "PermissionlessAll"].includes(permission as string)) {
        const pendingRewards = await api.call.nominationPoolsApi.pendingRewards(key.args[0]);
        if (!BN.isBN(pendingRewards)) {
          return null;
        }
        const pendingRewardsBn: BN = pendingRewards as unknown as BN;
        const pendingRewardsNumber = pendingRewardsBn.div(new BN(10).pow(new BN(18))).toNumber();
        
        if (pendingRewardsNumber > config.amount) {
          return { address, pendingRewards: pendingRewardsNumber };
        }
      }
      return null;
    }));

    const validEntries = entries.filter(entry => entry !== null);

    console.log(`Pool ID ${config.poolID} has ${validEntries.length} pool members with pending rewards.`);

    if (validEntries.length > 0) {
      const userConfirmation = "yes";
      if (true) {
        console.log(`Claiming Rewards of Pool ID ${config.poolID} members:`);
        validEntries.forEach(entry => {
          if (entry) {
            console.log(entry.address);
          }
        });

        // Actual claiming logic
        const poolTransactions = validEntries.map((entry) => {
          if (entry) {
            return api.tx.nominationPools.bondExtraOther(entry.address, 1);
          }
          return null;
        }).filter(tx => tx !== null);

        const allTransactions: SubmittableExtrinsic<"promise", ISubmittableResult>[] = poolTransactions.filter((tx): tx is SubmittableExtrinsic<"promise", ISubmittableResult> => tx !== null);

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
    }
  }

  await disconnect();
  process.exit(0);
};

main().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
