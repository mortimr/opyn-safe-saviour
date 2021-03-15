// Plugins
import '@nomiclabs/hardhat-waffle';
import 'hardhat-contract-sizer';
import 'solidity-coverage';
import 'hardhat-gas-reporter';
import 'hardhat-tracer';
import '@nomiclabs/hardhat-solhint';
import 'hardhat-prettier';
import 'hardhat-docgen';
import 'hardhat-deploy';
import '@nomiclabs/hardhat-etherscan';

import { HardhatUserConfig } from 'hardhat/config';


/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: '0.7.6',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    kovan: {
      url: process.env.KOVAN_ETHEREUM_RPC_URL,
      chainId: 42,
      from: process.env.KOVAN_DEPLOYER_ACCOUNT,
      gas: 'auto',
      gasPrice: 'auto',
      accounts: {
        mnemonic: process.env.KOVAN_DEPLOYER_ACCOUNT_MNEMONIC,
      },
      live: true,
      saveDeployments: true,
      tags: ['test']
    }
  },
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: true,
  }
} as HardhatUserConfig;
