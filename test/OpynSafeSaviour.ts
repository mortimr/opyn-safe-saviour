import * as chai from 'chai'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = chai.expect;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ethers } = require('hardhat');
import { Signer, Contract, ContractFactory, BigNumber } from 'ethers';

interface Context {
  signers: Signer[]
  mocks: {
    OpynV2Controller: Contract;
    OpynV2Whitelist: Contract;
    UniswapV2Router02: Contract;
    SaviourRegistry: Contract;

    Collateral: Contract;
    CollateralJoin: Contract;
    SafeEngine: Contract;
    LiquidationEngine: Contract;
    OracleRelayer: Contract;
    SafeManager: Contract;
  }
  mockFactories: {
    OpynV2OToken: ContractFactory;
    ERC20: ContractFactory;
  }
  contracts: {
    OpynSafeSaviourOperator: Contract;
    OpynSafeSaviour: Contract;
  }
}

const collateralType = '0x676f6c6400000000000000000000000000000000000000000000000000000000';

describe('OSS - Opyn Safe Saviour', function () {

  const ctx: Context = {
    signers: null,
    mocks: {
      OpynV2Controller: null,
      OpynV2Whitelist: null,
      UniswapV2Router02: null,
      SaviourRegistry: null,

      Collateral: null,
      CollateralJoin: null,
      SafeEngine: null,
      LiquidationEngine: null,
      OracleRelayer: null,
      SafeManager: null
    },
    mockFactories: {
      OpynV2OToken: null,
      ERC20: null
    },
    contracts: {
      OpynSafeSaviourOperator: null,
      OpynSafeSaviour: null
    }
  }

  beforeEach(async function () {
    ctx.signers = await ethers.getSigners();

    const OpynV2ControllerFactory = await ethers.getContractFactory('OpynV2ControllerMock');
    ctx.mocks.OpynV2Controller = await OpynV2ControllerFactory.deploy();

    const OpynV2WhitelistFactory = await ethers.getContractFactory('OpynV2WhitelistMock');
    ctx.mocks.OpynV2Whitelist = await OpynV2WhitelistFactory.deploy();

    const UniswapV2Router02Factory = await ethers.getContractFactory('UniswapV2Router02Mock');
    ctx.mocks.UniswapV2Router02 = await UniswapV2Router02Factory.deploy();

    const SaviourRegistryFactory = await ethers.getContractFactory('SaviourRegistryMock');
    ctx.mocks.SaviourRegistry = await SaviourRegistryFactory.deploy();

    ctx.mockFactories.OpynV2OToken = await ethers.getContractFactory('OpynV2OTokenMock');
    ctx.mockFactories.ERC20 = await ethers.getContractFactory('ERC20Mock');

    const OpynSafeSaviourOperatorFactory = await ethers.getContractFactory('OpynSafeSaviourOperator');
    ctx.contracts.OpynSafeSaviourOperator = await OpynSafeSaviourOperatorFactory.deploy(
      ctx.mocks.OpynV2Controller.address,
      ctx.mocks.OpynV2Whitelist.address,
      ctx.mocks.UniswapV2Router02.address,
      ctx.mocks.SaviourRegistry.address
    );

    // Opyn Safe Saviour

    ctx.mocks.Collateral = await ctx.mockFactories.ERC20.deploy('Gold', 'GLD');

    const SafeEngineFactory = await ethers.getContractFactory('SafeEngineMock');
    ctx.mocks.SafeEngine = await SafeEngineFactory.deploy();

    const CollateralJoinFactory = await ethers.getContractFactory('CollateralJoinMock');
    ctx.mocks.CollateralJoin = await CollateralJoinFactory.deploy(
      ctx.mocks.SafeEngine.address,
      collateralType,
      ctx.mocks.Collateral.address,
      18,
      1
    );

    const LiquidationEngineFactory = await ethers.getContractFactory('LiquidationEngineMock');
    ctx.mocks.LiquidationEngine = await LiquidationEngineFactory.deploy();

    const OracleRelayerFactory = await ethers.getContractFactory('OracleRelayerMock');
    ctx.mocks.OracleRelayer = await OracleRelayerFactory.deploy();

    const SafeManagerFactory = await ethers.getContractFactory('SafeManagerMock');
    ctx.mocks.SafeManager = await SafeManagerFactory.deploy();

      await ctx.mocks.OracleRelayer.setCollateralType(collateralType, '0x0000000000000000000000000000000000000001', '1450000000000000000000000000', '1450000000000000000000000000');

    const OpynSafeSaviourFactory = await ethers.getContractFactory('OpynSafeSaviour');
    ctx.contracts.OpynSafeSaviour = await OpynSafeSaviourFactory.deploy(
      ctx.mocks.CollateralJoin.address,
      ctx.mocks.LiquidationEngine.address,
      ctx.mocks.OracleRelayer.address,
      ctx.mocks.SafeManager.address,
      ctx.mocks.SaviourRegistry.address,
      ctx.contracts.OpynSafeSaviourOperator.address,
      1000,
      1000,
      1000,
      170
    );

  });

  describe('constructor', function () {

    it('does nothing', async function () {
      console.log('nothing');
    });

  });

});

