// Plugins
import '@nomiclabs/hardhat-waffle';
import 'hardhat-contract-sizer';
import 'solidity-coverage';
import 'hardhat-gas-reporter';
import 'hardhat-tracer';
import '@nomiclabs/hardhat-solhint';
import 'hardhat-prettier';
import 'hardhat-docgen';

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
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: true,
  }
};
