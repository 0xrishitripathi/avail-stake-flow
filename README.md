# Avail-Stake-Flow 
Automate claiming staking reward payouts for Validators and Nomination Pools on Avail DA Network.

This tool is for:
1. Validators who want to automate claiming their pending rewards for previous and upcoming eras.
2. Nomination Pool Operators who want to automate compounding rewards of their Pool Members who have unclaimed pending rewards above a set amount. 

&nbsp;
&nbsp;
&nbsp;
&nbsp;
## Getting Started

1. Clone the Repo
```
git clone https://github.com/0xrishitripathi/avail-stake-flow.git && cd avail-stake-flow
```

2. Make sure you have Node.js v16 or above installed. 
```bash
node -v
# check current Node.js version on your system. To install latest version follow below steps
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
# Download and setup the NodeSource repository
sudo apt-get install -y nodejs
# Install Node.js
```
3. Proceed to install all required dependencies, including [avail-js-sdk](https://www.npmjs.com/package/avail-js-sdk), using the following npm command:
```
npm install
```

4. NOTE: Before running the script, please go though the configuration file [config.ts](https://github.com/0xrishitripathi/avail-stake-flow/blob/main/config.ts) to understand the settings and make neccesary changes for successful operation of the tool.

<img width="1177" alt="image" src="https://github.com/user-attachments/assets/b519f5c7-f72b-488f-8cb0-3a4f8234a07b">

&nbsp;

5. Give Permission to the bash script
```
chmod +x staking-payout.sh
```

6. Run the bash script
```
./staking-payout.sh
```
<img width="319" alt="Screenshot 2024-09-09 at 1 46 24 AM" src="https://github.com/user-attachments/assets/68d2fe98-e634-4db9-9fd8-2d15bae6d2a5">



--------------------------------------------------------------------------------------------------------------------------------------

## Set Alerts for your Validator Address as soon as the staking rewards are claimed:

https://web3alert.io/link/7HDdRR9SXLiKF48bqsqSz

<img width="1250" alt="image" src="https://github.com/user-attachments/assets/499db008-e394-495b-8aad-de54e0a8a8fa">




--------------------------------------------------------------------------------------------------------------------------------------
