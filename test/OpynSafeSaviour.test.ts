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
    PriceFeed: Contract;
    Asserter: Contract;
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
const notCollateralType = '0x676f6c6500000000000000000000000000000000000000000000000000000000';

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
      SafeManager: null,
      PriceFeed: null,
      Asserter: null
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

    const PriceFeedFactory = await ethers.getContractFactory('PriceFeedMock');
    ctx.mocks.PriceFeed = await PriceFeedFactory.deploy();

    await ctx.mocks.OracleRelayer.setCollateralType(collateralType, ctx.mocks.PriceFeed.address, '1450000000000000000000000000', '1450000000000000000000000000');

    const OpynSafeSaviourFactory = await ethers.getContractFactory('OpynSafeSaviour');
    ctx.contracts.OpynSafeSaviour = await OpynSafeSaviourFactory.deploy(
      ctx.mocks.CollateralJoin.address,
      ctx.mocks.LiquidationEngine.address,
      ctx.mocks.OracleRelayer.address,
      ctx.mocks.SafeManager.address,
      ctx.mocks.SaviourRegistry.address,
      ctx.contracts.OpynSafeSaviourOperator.address,
      '100000000000000000', // amount of eth for keeper => 0.1 Colalteral
      '2500000000000000000', // how much it should be worth in euro => 2.5 $
      '20', // keeper * safe to size >= safe size
      170
    );

    const AsserterFactory = await ethers.getContractFactory('Asserter');
    ctx.mocks.Asserter = await AsserterFactory.deploy();

  });

  describe('constructor', function () {

    it('should fail on null addresses and invalid parameter values', async function () {

      const OpynSafeSaviourFactory = await ethers.getContractFactory('OpynSafeSaviour');
      await expect(OpynSafeSaviourFactory.deploy(
        '0x0000000000000000000000000000000000000000',
        ctx.mocks.LiquidationEngine.address,
        ctx.mocks.OracleRelayer.address,
        ctx.mocks.SafeManager.address,
        ctx.mocks.SaviourRegistry.address,
        ctx.contracts.OpynSafeSaviourOperator.address,
        '100000000000000000',
        '90000000000000000000',
        '20',
        170
      )).to.eventually.be.rejectedWith('OpynSafeSaviour/null-collateral-join');

      await expect(OpynSafeSaviourFactory.deploy(
        ctx.mocks.CollateralJoin.address,
        '0x0000000000000000000000000000000000000000',
        ctx.mocks.OracleRelayer.address,
        ctx.mocks.SafeManager.address,
        ctx.mocks.SaviourRegistry.address,
        ctx.contracts.OpynSafeSaviourOperator.address,
        '100000000000000000',
        '90000000000000000000',
        '20',
        170
      )).to.eventually.be.rejectedWith('OpynSafeSaviour/null-liquidation-engine');

      await expect(OpynSafeSaviourFactory.deploy(
        ctx.mocks.CollateralJoin.address,
        ctx.mocks.LiquidationEngine.address,
        '0x0000000000000000000000000000000000000000',
        ctx.mocks.SafeManager.address,
        ctx.mocks.SaviourRegistry.address,
        ctx.contracts.OpynSafeSaviourOperator.address,
        '100000000000000000',
        '90000000000000000000',
        '20',
        170
      )).to.eventually.be.rejectedWith('OpynSafeSaviour/null-oracle-relayer');

      await expect(OpynSafeSaviourFactory.deploy(
        ctx.mocks.CollateralJoin.address,
        ctx.mocks.LiquidationEngine.address,
        ctx.mocks.OracleRelayer.address,
        '0x0000000000000000000000000000000000000000',
        ctx.mocks.SaviourRegistry.address,
        ctx.contracts.OpynSafeSaviourOperator.address,
        '100000000000000000',
        '90000000000000000000',
        '20',
        170
      )).to.eventually.be.rejectedWith('OpynSafeSaviour/null-safe-manager');

      await expect(OpynSafeSaviourFactory.deploy(
        ctx.mocks.CollateralJoin.address,
        ctx.mocks.LiquidationEngine.address,
        ctx.mocks.OracleRelayer.address,
        ctx.mocks.SafeManager.address,
        '0x0000000000000000000000000000000000000000',
        ctx.contracts.OpynSafeSaviourOperator.address,
        '100000000000000000',
        '90000000000000000000',
        '20',
        170
      )).to.eventually.be.rejectedWith('OpynSafeSaviour/null-saviour-registry');

      await expect(OpynSafeSaviourFactory.deploy(
        ctx.mocks.CollateralJoin.address,
        ctx.mocks.LiquidationEngine.address,
        ctx.mocks.OracleRelayer.address,
        ctx.mocks.SafeManager.address,
        ctx.mocks.SaviourRegistry.address,
        '0x0000000000000000000000000000000000000000',
        '100000000000000000',
        '90000000000000000000',
        '20',
        170
      )).to.eventually.be.rejectedWith('OpynSafeSaviour/null-opyn-safe-saviour-operator');

      await expect(OpynSafeSaviourFactory.deploy(
        ctx.mocks.CollateralJoin.address,
        ctx.mocks.LiquidationEngine.address,
        ctx.mocks.OracleRelayer.address,
        ctx.mocks.SafeManager.address,
        ctx.mocks.SaviourRegistry.address,
        ctx.contracts.OpynSafeSaviourOperator.address,
        0,
        '90000000000000000000',
        '20',
        170
      )).to.eventually.be.rejectedWith('OpynSafeSaviour/invalid-keeper-payout');

      await expect(OpynSafeSaviourFactory.deploy(
        ctx.mocks.CollateralJoin.address,
        ctx.mocks.LiquidationEngine.address,
        ctx.mocks.OracleRelayer.address,
        ctx.mocks.SafeManager.address,
        ctx.mocks.SaviourRegistry.address,
        ctx.contracts.OpynSafeSaviourOperator.address,
        '100000000000000000',
        0,
        '20',
        170
      )).to.eventually.be.rejectedWith('OpynSafeSaviour/invalid-min-payout-value');

      await expect(OpynSafeSaviourFactory.deploy(
        ctx.mocks.CollateralJoin.address,
        ctx.mocks.LiquidationEngine.address,
        ctx.mocks.OracleRelayer.address,
        ctx.mocks.SafeManager.address,
        ctx.mocks.SaviourRegistry.address,
        ctx.contracts.OpynSafeSaviourOperator.address,
        '100000000000000000',
        '90000000000000000000',
        0,
        170
      )).to.eventually.be.rejectedWith('OpynSafeSaviour/invalid-payout-to-safe-size');

      await expect(OpynSafeSaviourFactory.deploy(
        ctx.mocks.CollateralJoin.address,
        ctx.mocks.LiquidationEngine.address,
        ctx.mocks.OracleRelayer.address,
        ctx.mocks.SafeManager.address,
        ctx.mocks.SaviourRegistry.address,
        ctx.contracts.OpynSafeSaviourOperator.address,
        '100000000000000000',
        '90000000000000000000',
        '20',
        0
      )).to.eventually.be.rejectedWith('OpynSafeSaviour/null-default-cratio');

    });

    it('should properly build OpenSafeSaviour', async function () {

      const OpynV2ControllerFactory = await ethers.getContractFactory('OpynV2ControllerMock');
      const OpynV2Controller = await OpynV2ControllerFactory.deploy();

      const OpynV2WhitelistFactory = await ethers.getContractFactory('OpynV2WhitelistMock');
      const OpynV2Whitelist = await OpynV2WhitelistFactory.deploy();

      const UniswapV2Router02Factory = await ethers.getContractFactory('UniswapV2Router02Mock');
      const UniswapV2Router02 = await UniswapV2Router02Factory.deploy();

      const SaviourRegistryFactory = await ethers.getContractFactory('SaviourRegistryMock');
      const SaviourRegistry = await SaviourRegistryFactory.deploy();

      const OpynSafeSaviourOperatorFactory = await ethers.getContractFactory('OpynSafeSaviourOperator');
      const OpynSafeSaviourOperator = await OpynSafeSaviourOperatorFactory.deploy(
        OpynV2Controller.address,
        OpynV2Whitelist.address,
        UniswapV2Router02.address,
        SaviourRegistry.address
      );
      const Collateral = await ctx.mockFactories.ERC20.deploy('Gold', 'GLD');

      const SafeEngineFactory = await ethers.getContractFactory('SafeEngineMock');
      const SafeEngine = await SafeEngineFactory.deploy();

      const CollateralJoinFactory = await ethers.getContractFactory('CollateralJoinMock');
      const CollateralJoin = await CollateralJoinFactory.deploy(
        SafeEngine.address,
        collateralType,
        Collateral.address,
        18,
        1
      );

      const LiquidationEngineFactory = await ethers.getContractFactory('LiquidationEngineMock');
      const LiquidationEngine = await LiquidationEngineFactory.deploy();

      const OracleRelayerFactory = await ethers.getContractFactory('OracleRelayerMock');
      const OracleRelayer = await OracleRelayerFactory.deploy();

      const SafeManagerFactory = await ethers.getContractFactory('SafeManagerMock');
      const SafeManager = await SafeManagerFactory.deploy();

      await OracleRelayer.setCollateralType(collateralType, '0x0000000000000000000000000000000000000001', '1450000000000000000000000000', '1450000000000000000000000000');

      const OpynSafeSaviourFactory = await ethers.getContractFactory('OpynSafeSaviour');
      const OpynSafeSaviour = await OpynSafeSaviourFactory.deploy(
        CollateralJoin.address,
        LiquidationEngine.address,
        OracleRelayer.address,
        SafeManager.address,
        SaviourRegistry.address,
        OpynSafeSaviourOperator.address,
        1000,
        1000,
        1000,
        170
      );

      expect(OpynSafeSaviour).to.not.be.undefined;

    });

    it('should fail on invalid liquidation ratio provided by the oracle relayer', async function () {

      const OpynV2ControllerFactory = await ethers.getContractFactory('OpynV2ControllerMock');
      const OpynV2Controller = await OpynV2ControllerFactory.deploy();

      const OpynV2WhitelistFactory = await ethers.getContractFactory('OpynV2WhitelistMock');
      const OpynV2Whitelist = await OpynV2WhitelistFactory.deploy();

      const UniswapV2Router02Factory = await ethers.getContractFactory('UniswapV2Router02Mock');
      const UniswapV2Router02 = await UniswapV2Router02Factory.deploy();

      const SaviourRegistryFactory = await ethers.getContractFactory('SaviourRegistryMock');
      const SaviourRegistry = await SaviourRegistryFactory.deploy();

      const OpynSafeSaviourOperatorFactory = await ethers.getContractFactory('OpynSafeSaviourOperator');
      const OpynSafeSaviourOperator = await OpynSafeSaviourOperatorFactory.deploy(
        OpynV2Controller.address,
        OpynV2Whitelist.address,
        UniswapV2Router02.address,
        SaviourRegistry.address
      );
      const Collateral = await ctx.mockFactories.ERC20.deploy('Gold', 'GLD');

      const SafeEngineFactory = await ethers.getContractFactory('SafeEngineMock');
      const SafeEngine = await SafeEngineFactory.deploy();

      const CollateralJoinFactory = await ethers.getContractFactory('CollateralJoinMock');
      const CollateralJoin = await CollateralJoinFactory.deploy(
        SafeEngine.address,
        collateralType,
        Collateral.address,
        18,
        1
      );

      const LiquidationEngineFactory = await ethers.getContractFactory('LiquidationEngineMock');
      const LiquidationEngine = await LiquidationEngineFactory.deploy();

      const OracleRelayerFactory = await ethers.getContractFactory('OracleRelayerMock');
      const OracleRelayer = await OracleRelayerFactory.deploy();

      const SafeManagerFactory = await ethers.getContractFactory('SafeManagerMock');
      const SafeManager = await SafeManagerFactory.deploy();

      const OpynSafeSaviourFactory = await ethers.getContractFactory('OpynSafeSaviour');
      await expect(OpynSafeSaviourFactory.deploy(
        CollateralJoin.address,
        LiquidationEngine.address,
        OracleRelayer.address,
        SafeManager.address,
        SaviourRegistry.address,
        OpynSafeSaviourOperator.address,
        1000,
        1000,
        1000,
        144
      )).to.eventually.be.rejectedWith('OpynSafeSaviour/invalid-scaled-liq-ratio');

    });

    it('should fail on invalid default collateral ratio', async function () {

      const OpynV2ControllerFactory = await ethers.getContractFactory('OpynV2ControllerMock');
      const OpynV2Controller = await OpynV2ControllerFactory.deploy();

      const OpynV2WhitelistFactory = await ethers.getContractFactory('OpynV2WhitelistMock');
      const OpynV2Whitelist = await OpynV2WhitelistFactory.deploy();

      const UniswapV2Router02Factory = await ethers.getContractFactory('UniswapV2Router02Mock');
      const UniswapV2Router02 = await UniswapV2Router02Factory.deploy();

      const SaviourRegistryFactory = await ethers.getContractFactory('SaviourRegistryMock');
      const SaviourRegistry = await SaviourRegistryFactory.deploy();

      const OpynSafeSaviourOperatorFactory = await ethers.getContractFactory('OpynSafeSaviourOperator');
      const OpynSafeSaviourOperator = await OpynSafeSaviourOperatorFactory.deploy(
        OpynV2Controller.address,
        OpynV2Whitelist.address,
        UniswapV2Router02.address,
        SaviourRegistry.address
      );
      const Collateral = await ctx.mockFactories.ERC20.deploy('Gold', 'GLD');

      const SafeEngineFactory = await ethers.getContractFactory('SafeEngineMock');
      const SafeEngine = await SafeEngineFactory.deploy();

      const CollateralJoinFactory = await ethers.getContractFactory('CollateralJoinMock');
      const CollateralJoin = await CollateralJoinFactory.deploy(
        SafeEngine.address,
        collateralType,
        Collateral.address,
        18,
        1
      );

      const LiquidationEngineFactory = await ethers.getContractFactory('LiquidationEngineMock');
      const LiquidationEngine = await LiquidationEngineFactory.deploy();

      const OracleRelayerFactory = await ethers.getContractFactory('OracleRelayerMock');
      const OracleRelayer = await OracleRelayerFactory.deploy();

      const SafeManagerFactory = await ethers.getContractFactory('SafeManagerMock');
      const SafeManager = await SafeManagerFactory.deploy();

      await OracleRelayer.setCollateralType(collateralType, '0x0000000000000000000000000000000000000001', '1450000000000000000000000000', '1450000000000000000000000000');

      const OpynSafeSaviourFactory = await ethers.getContractFactory('OpynSafeSaviour');
      await expect(OpynSafeSaviourFactory.deploy(
        CollateralJoin.address,
        LiquidationEngine.address,
        OracleRelayer.address,
        SafeManager.address,
        SaviourRegistry.address,
        OpynSafeSaviourOperator.address,
        1000,
        1000,
        1000,
        144
      )).to.eventually.be.rejectedWith('OpynSafeSaviour/invalid-default-desired-cratio');

    });

    it('should fail on invalid collateral decimal count', async function () {

      const OpynV2ControllerFactory = await ethers.getContractFactory('OpynV2ControllerMock');
      const OpynV2Controller = await OpynV2ControllerFactory.deploy();

      const OpynV2WhitelistFactory = await ethers.getContractFactory('OpynV2WhitelistMock');
      const OpynV2Whitelist = await OpynV2WhitelistFactory.deploy();

      const UniswapV2Router02Factory = await ethers.getContractFactory('UniswapV2Router02Mock');
      const UniswapV2Router02 = await UniswapV2Router02Factory.deploy();

      const SaviourRegistryFactory = await ethers.getContractFactory('SaviourRegistryMock');
      const SaviourRegistry = await SaviourRegistryFactory.deploy();

      const OpynSafeSaviourOperatorFactory = await ethers.getContractFactory('OpynSafeSaviourOperator');
      const OpynSafeSaviourOperator = await OpynSafeSaviourOperatorFactory.deploy(
        OpynV2Controller.address,
        OpynV2Whitelist.address,
        UniswapV2Router02.address,
        SaviourRegistry.address
      );
      const Collateral = await ctx.mockFactories.ERC20.deploy('Gold', 'GLD');

      const SafeEngineFactory = await ethers.getContractFactory('SafeEngineMock');
      const SafeEngine = await SafeEngineFactory.deploy();

      const CollateralJoinFactory = await ethers.getContractFactory('CollateralJoinMock');
      const CollateralJoin = await CollateralJoinFactory.deploy(
        SafeEngine.address,
        collateralType,
        Collateral.address,
        17,
        1
      );

      const LiquidationEngineFactory = await ethers.getContractFactory('LiquidationEngineMock');
      const LiquidationEngine = await LiquidationEngineFactory.deploy();

      const OracleRelayerFactory = await ethers.getContractFactory('OracleRelayerMock');
      const OracleRelayer = await OracleRelayerFactory.deploy();

      const SafeManagerFactory = await ethers.getContractFactory('SafeManagerMock');
      const SafeManager = await SafeManagerFactory.deploy();

      await OracleRelayer.setCollateralType(collateralType, '0x0000000000000000000000000000000000000001', '1450000000000000000000000000', '1450000000000000000000000000');

      const OpynSafeSaviourFactory = await ethers.getContractFactory('OpynSafeSaviour');
      await expect(OpynSafeSaviourFactory.deploy(
        CollateralJoin.address,
        LiquidationEngine.address,
        OracleRelayer.address,
        SafeManager.address,
        SaviourRegistry.address,
        OpynSafeSaviourOperator.address,
        1000,
        1000,
        1000,
        180
      )).to.eventually.be.rejectedWith('OpynSafeSaviour/invalid-join-decimals');

    });

    it('should fail on invalid collateral disabled', async function () {

      const OpynV2ControllerFactory = await ethers.getContractFactory('OpynV2ControllerMock');
      const OpynV2Controller = await OpynV2ControllerFactory.deploy();

      const OpynV2WhitelistFactory = await ethers.getContractFactory('OpynV2WhitelistMock');
      const OpynV2Whitelist = await OpynV2WhitelistFactory.deploy();

      const UniswapV2Router02Factory = await ethers.getContractFactory('UniswapV2Router02Mock');
      const UniswapV2Router02 = await UniswapV2Router02Factory.deploy();

      const SaviourRegistryFactory = await ethers.getContractFactory('SaviourRegistryMock');
      const SaviourRegistry = await SaviourRegistryFactory.deploy();

      const OpynSafeSaviourOperatorFactory = await ethers.getContractFactory('OpynSafeSaviourOperator');
      const OpynSafeSaviourOperator = await OpynSafeSaviourOperatorFactory.deploy(
        OpynV2Controller.address,
        OpynV2Whitelist.address,
        UniswapV2Router02.address,
        SaviourRegistry.address
      );
      const Collateral = await ctx.mockFactories.ERC20.deploy('Gold', 'GLD');

      const SafeEngineFactory = await ethers.getContractFactory('SafeEngineMock');
      const SafeEngine = await SafeEngineFactory.deploy();

      const CollateralJoinFactory = await ethers.getContractFactory('CollateralJoinMock');
      const CollateralJoin = await CollateralJoinFactory.deploy(
        SafeEngine.address,
        collateralType,
        Collateral.address,
        18,
        0
      );

      const LiquidationEngineFactory = await ethers.getContractFactory('LiquidationEngineMock');
      const LiquidationEngine = await LiquidationEngineFactory.deploy();

      const OracleRelayerFactory = await ethers.getContractFactory('OracleRelayerMock');
      const OracleRelayer = await OracleRelayerFactory.deploy();

      const SafeManagerFactory = await ethers.getContractFactory('SafeManagerMock');
      const SafeManager = await SafeManagerFactory.deploy();

      await OracleRelayer.setCollateralType(collateralType, '0x0000000000000000000000000000000000000001', '1450000000000000000000000000', '1450000000000000000000000000');

      const OpynSafeSaviourFactory = await ethers.getContractFactory('OpynSafeSaviour');
      await expect(OpynSafeSaviourFactory.deploy(
        CollateralJoin.address,
        LiquidationEngine.address,
        OracleRelayer.address,
        SafeManager.address,
        SaviourRegistry.address,
        OpynSafeSaviourOperator.address,
        1000,
        1000,
        1000,
        180
      )).to.eventually.be.rejectedWith('OpynSafeSaviour/join-disabled');

    });

  });

  describe('deposit', function () {

    it('should properly deposit oTokens to save a safe', async function () {

      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');
      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const isPut = true;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        ctx.mocks.Collateral.address,
        ctx.mocks.Collateral.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );
      const owner = await ctx.signers[0].getAddress();
      const user = await ctx.signers[1].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      await oToken.mint(owner, 1000);
      await oToken.approve(ctx.contracts.OpynSafeSaviour.address, 1000);

      await oToken.mint(user, 1000);
      await oToken.connect(ctx.signers[1]).approve(ctx.contracts.OpynSafeSaviour.address, 1000);

      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(oToken.address);


      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(4).mul('1000000000000000000'), BigNumber.from(2000).mul('1000000000000000000'));
      await ctx.mocks.SafeManager.toggleSafeCan(owner, safeId, user);

      await ctx.contracts.OpynSafeSaviour.deposit(safeId, 1000, oToken.address);
      await ctx.contracts.OpynSafeSaviour.connect(ctx.signers[1]).deposit(safeId, 1000, oToken.address);
    });

    it('should fail if not safe owner or authorized', async function () {

      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');
      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const isPut = true;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        ctx.mocks.Collateral.address,
        ctx.mocks.Collateral.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );
      const owner = await ctx.signers[0].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      await oToken.mint(owner, 1000);
      await oToken.approve(ctx.contracts.OpynSafeSaviour.address, 1000);

      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(oToken.address);


      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(4).mul('1000000000000000000'), BigNumber.from(2000).mul('1000000000000000000'));

      await expect(ctx.contracts.OpynSafeSaviour.connect(ctx.signers[1]).deposit(safeId, 1000, oToken.address)).to.eventually.be.rejectedWith('SafeSaviour/not-owning-safe');

    });

    it('should fail if not registered in liquidation engine', async function () {

      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');
      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const isPut = true;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        ctx.mocks.Collateral.address,
        ctx.mocks.Collateral.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );
      const owner = await ctx.signers[0].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      await oToken.mint(owner, 1000);
      await oToken.approve(ctx.contracts.OpynSafeSaviour.address, 1000);

      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(oToken.address);

      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(4).mul('1000000000000000000'), BigNumber.from(2000).mul('1000000000000000000'));

      await expect(ctx.contracts.OpynSafeSaviour.connect(ctx.signers[1]).deposit(safeId, 1000, oToken.address)).to.eventually.be.rejectedWith('SafeSaviour/not-approved-in-liquidation-engine');

    });

    it('should fail on null deposit amount', async function () {

      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');
      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const isPut = true;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        ctx.mocks.Collateral.address,
        ctx.mocks.Collateral.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );
      const owner = await ctx.signers[0].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      await oToken.mint(owner, 1000);
      await oToken.approve(ctx.contracts.OpynSafeSaviour.address, 1000);

      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(oToken.address);

      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(4).mul('1000000000000000000'), BigNumber.from(2000).mul('1000000000000000000'));

      await expect(ctx.contracts.OpynSafeSaviour.deposit(safeId, 0, oToken.address)).to.eventually.be.rejectedWith('OpynSafeSaviour/null-oToken-amount');

    });

    it('should fail on invalid token address', async function () {

      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');
      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const isPut = true;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        ctx.mocks.Collateral.address,
        ctx.mocks.Collateral.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );
      const owner = await ctx.signers[0].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      await oToken.mint(owner, 1000);
      await oToken.approve(ctx.contracts.OpynSafeSaviour.address, 1000);

      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(oToken.address);

      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(4).mul('1000000000000000000'), BigNumber.from(2000).mul('1000000000000000000'));

      await expect(ctx.contracts.OpynSafeSaviour.deposit(safeId, 1000, owner)).to.eventually.be.rejectedWith('OpynSafeSaviour/forbidden-otoken');

    });

    it('should fail on invalid safe id', async function () {

      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');
      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const isPut = true;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        ctx.mocks.Collateral.address,
        ctx.mocks.Collateral.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );
      const otherOToken = await ctx.mockFactories.OpynV2OToken.deploy(
        ctx.mocks.Collateral.address,
        ctx.mocks.Collateral.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      const owner = await ctx.signers[0].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      await oToken.mint(owner, 1000);
      await oToken.approve(ctx.contracts.OpynSafeSaviour.address, 1000);
      await otherOToken.mint(owner, 1000);
      await otherOToken.approve(ctx.contracts.OpynSafeSaviour.address, 1000);

      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(oToken.address);
      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(otherOToken.address);

      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(4).mul('1000000000000000000'), BigNumber.from(2000).mul('1000000000000000000'));

      ctx.contracts.OpynSafeSaviour.deposit(safeId, 500, oToken.address);
      ctx.contracts.OpynSafeSaviour.deposit(safeId, 500, oToken.address);
      await expect(ctx.contracts.OpynSafeSaviour.deposit(safeId, 1000, otherOToken.address)).to.eventually.be.rejectedWith('OpynSafeSaviour/safe-otoken-incompatibility');

    });

    it('should fail if safe has no debt', async function () {

      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');
      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const isPut = true;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        ctx.mocks.Collateral.address,
        ctx.mocks.Collateral.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      const owner = await ctx.signers[0].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      await oToken.mint(owner, 1000);
      await oToken.approve(ctx.contracts.OpynSafeSaviour.address, 1000);

      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(oToken.address);

      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(4).mul('1000000000000000000'), BigNumber.from(2000).mul('0'));

      await expect(ctx.contracts.OpynSafeSaviour.deposit(safeId, 1000, oToken.address)).to.eventually.be.rejectedWith('OpynSafeSaviour/safe-does-not-have-debt');

    });

  });

  describe('withdraw', function () {

    it('should properly withdraw oTokens', async function () {

      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');
      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const isPut = true;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        ctx.mocks.Collateral.address,
        ctx.mocks.Collateral.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );
      const owner = await ctx.signers[0].getAddress();
      const user = await ctx.signers[1].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      await oToken.mint(owner, 1000);
      await oToken.approve(ctx.contracts.OpynSafeSaviour.address, 1000);

      await oToken.mint(user, 1000);
      await oToken.connect(ctx.signers[1]).approve(ctx.contracts.OpynSafeSaviour.address, 1000);

      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(oToken.address);


      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(4).mul('1000000000000000000'), BigNumber.from(2000).mul('1000000000000000000'));
      await ctx.mocks.SafeManager.toggleSafeCan(owner, safeId, user);

      await expect(ctx.contracts.OpynSafeSaviour.oTokenSelection(safeHandler)).to.eventually.deep.equal('0x0000000000000000000000000000000000000000');
      await ctx.contracts.OpynSafeSaviour.deposit(safeId, 1000, oToken.address);
      await ctx.contracts.OpynSafeSaviour.connect(ctx.signers[1]).deposit(safeId, 1000, oToken.address);
      await expect(ctx.contracts.OpynSafeSaviour.oTokenSelection(safeHandler)).to.eventually.deep.equal(oToken.address);

      await ctx.contracts.OpynSafeSaviour.withdraw(safeId, 1000);
      await expect(ctx.contracts.OpynSafeSaviour.oTokenSelection(safeHandler)).to.eventually.deep.equal(oToken.address);
      await ctx.contracts.OpynSafeSaviour.connect(ctx.signers[1]).withdraw(safeId, 1000);
      await expect(ctx.contracts.OpynSafeSaviour.oTokenSelection(safeHandler)).to.eventually.deep.equal('0x0000000000000000000000000000000000000000');

    });

    it('should fail withdrawing if not owner', async function () {

      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');
      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const isPut = true;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        ctx.mocks.Collateral.address,
        ctx.mocks.Collateral.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );
      const owner = await ctx.signers[0].getAddress();
      const user = await ctx.signers[1].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      await oToken.mint(owner, 1000);
      await oToken.approve(ctx.contracts.OpynSafeSaviour.address, 1000);

      await oToken.mint(user, 1000);
      await oToken.connect(ctx.signers[1]).approve(ctx.contracts.OpynSafeSaviour.address, 1000);

      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(oToken.address);


      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(4).mul('1000000000000000000'), BigNumber.from(2000).mul('1000000000000000000'));

      await expect(ctx.contracts.OpynSafeSaviour.oTokenSelection(safeHandler)).to.eventually.deep.equal('0x0000000000000000000000000000000000000000');
      await ctx.contracts.OpynSafeSaviour.deposit(safeId, 1000, oToken.address);
      await expect(ctx.contracts.OpynSafeSaviour.oTokenSelection(safeHandler)).to.eventually.deep.equal(oToken.address);

      await expect(ctx.contracts.OpynSafeSaviour.connect(ctx.signers[1]).withdraw(safeId, 1000)).to.eventually.be.rejectedWith('SafeSaviour/not-owning-safe');

    });


    it('should fail withdrawing if amount is 0', async function () {

      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');
      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const isPut = true;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        ctx.mocks.Collateral.address,
        ctx.mocks.Collateral.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );
      const owner = await ctx.signers[0].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(oToken.address);

      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(4).mul('1000000000000000000'), BigNumber.from(2000).mul('1000000000000000000'));

      await expect(ctx.contracts.OpynSafeSaviour.withdraw(safeId, 0)).to.eventually.be.rejectedWith('OpynSafeSaviour/null-collateralToken-amount');

    });

    it('should fail if withdrawing too much', async function () {

      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');
      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      const isPut = true;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        ctx.mocks.Collateral.address,
        ctx.mocks.Collateral.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );
      const owner = await ctx.signers[0].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      await oToken.mint(owner, 1000);
      await oToken.approve(ctx.contracts.OpynSafeSaviour.address, 1000);

      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(oToken.address);

      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(4).mul('1000000000000000000'), BigNumber.from(2000).mul('1000000000000000000'));

      await expect(ctx.contracts.OpynSafeSaviour.oTokenSelection(safeHandler)).to.eventually.deep.equal('0x0000000000000000000000000000000000000000');
      await ctx.contracts.OpynSafeSaviour.deposit(safeId, 1000, oToken.address);
      await expect(ctx.contracts.OpynSafeSaviour.oTokenSelection(safeHandler)).to.eventually.deep.equal(oToken.address);

      await expect(ctx.contracts.OpynSafeSaviour.withdraw(safeId, 1001)).to.eventually.be.rejectedWith('OpynSafeSaviour/not-enough-to-withdraw');

    });

  });

  describe('setDesiredCollateralizationRatio', async function () {

    it('should properly set a custom collateralization ratio', async function () {

      const owner = await ctx.signers[0].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(4).mul('1000000000000000000'), BigNumber.from(2000).mul('1000000000000000000'));

      expect((await ctx.contracts.OpynSafeSaviour.desiredCollateralizationRatios(collateralType, safeHandler)).toString()).to.equal('0');
      await ctx.contracts.OpynSafeSaviour.setDesiredCollateralizationRatio(safeId, 150);
      expect((await ctx.contracts.OpynSafeSaviour.desiredCollateralizationRatios(collateralType, safeHandler)).toString()).to.equal('150');

    });

    it('should fail on invalid cratio from oracle relayer', async function () {

      const owner = await ctx.signers[0].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(4).mul('1000000000000000000'), BigNumber.from(2000).mul('1000000000000000000'));

      await ctx.mocks.OracleRelayer.setCollateralType(collateralType, '0x0000000000000000000000000000000000000001', '1450000000000000000000000', '1450000000000000000000000');

      await expect(ctx.contracts.OpynSafeSaviour.setDesiredCollateralizationRatio(safeId, 150)).to.eventually.be.rejectedWith('OpynSafeSaviour/invalid-scaled-liq-ratio');

    });

    it('should fail on custom collateralization ratio too low', async function () {

      const owner = await ctx.signers[0].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(4).mul('1000000000000000000'), BigNumber.from(2000).mul('1000000000000000000'));

      await expect(ctx.contracts.OpynSafeSaviour.setDesiredCollateralizationRatio(safeId, 144)).to.eventually.be.rejectedWith('OpynSafeSaviour/invalid-desired-cratio');

    });

    it('should fail on custom collateralization ratio too high', async function () {

      const owner = await ctx.signers[0].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(4).mul('1000000000000000000'), BigNumber.from(2000).mul('1000000000000000000'));

      await expect(ctx.contracts.OpynSafeSaviour.setDesiredCollateralizationRatio(safeId, 1001)).to.eventually.be.rejectedWith('OpynSafeSaviour/exceeds-max-cratio');

    });

  });

  describe('saveSAFE', async function () {

    it('should properly save safe', async function () {

      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');

      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const isPut = false;

      const owner = await ctx.signers[0].getAddress();
      const keeper = await ctx.signers[1].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        USD.address,
        ctx.mocks.Collateral.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      await oToken.functions.mint(owner, BigNumber.from(1).mul('1000000000000000000'));
      await USD.functions.mint(owner, BigNumber.from(4).mul('1000000000000000000'));
      await USD.approve(ctx.mocks.OpynV2Controller.address, BigNumber.from(4).mul('1000000000000000000'));

      await ctx.mocks.Collateral.functions.mint(owner, BigNumber.from(4).mul('1000000000000000000'));
      await ctx.mocks.Collateral.transfer(ctx.mocks.UniswapV2Router02.address, BigNumber.from(4).mul('1000000000000000000'));

      // Add collateral to otoken
      await ctx.mocks.OpynV2Controller.functions.fundOtoken(oToken.address, USD.address, BigNumber.from(4).mul('1000000000000000000'));
      // Make token redeemable
      await ctx.mocks.OpynV2Controller.functions.toggleRedeemable(oToken.address);
      // Whitelist oToken
      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(oToken.address);
      // Register safe in safe manager
      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      // Register save saviour in liquidation engine
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      // Set safe collateral and debt in safe engine
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(14).mul('1000000000000000000'), BigNumber.from(100).mul('1000000000000000000'));
      await ctx.mocks.OracleRelayer.setRedemptionPrice('3000000000000000000000000000'); // 3$ but it's 27 decimals
      await ctx.mocks.PriceFeed.setResultWithValidity('30000000000000000000', true);
      // Deposit oTokens in saviour
      await oToken.approve(ctx.contracts.OpynSafeSaviour.address, BigNumber.from(1).mul('1000000000000000000'));
      await ctx.contracts.OpynSafeSaviour.deposit(safeId, BigNumber.from(1).mul('1000000000000000000'), oToken.address);

      await ctx.mocks.LiquidationEngine.fakeLiquidateSAFE(keeper, collateralType, safeHandler, ctx.contracts.OpynSafeSaviour.address);

      expect((await ctx.contracts.OpynSafeSaviour.oTokenCover(safeHandler)).toString()).to.equal('225000000000000000');
    });

    it('should fail if not called by liquidation engine', async function () {
      const keeper = await ctx.signers[1].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();

      await expect(ctx.contracts.OpynSafeSaviour.saveSAFE(keeper, collateralType, safeHandler)).to.eventually.be.rejectedWith('OpynSafeSaviour/caller-not-liquidation-engine');

    });

    it('should fail on null keeper address', async function () {
      const keeper = '0x0000000000000000000000000000000000000000';
      const safeHandler = await ctx.signers[1].getAddress();

      await expect(ctx.mocks.LiquidationEngine.fakeLiquidateSAFE(keeper, collateralType, safeHandler, ctx.contracts.OpynSafeSaviour.address)).to.eventually.be.rejectedWith('OpynSafeSaviour/null-keeper-address');

    });

    it('should fail on saviour init call', async function () {

      await ctx.mocks.LiquidationEngine.fakeInitCall(ctx.contracts.OpynSafeSaviour.address);

    });

    it('should fail if invalid collateral type', async function () {
      const keeper = await ctx.signers[1].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();

      await expect(ctx.mocks.LiquidationEngine.fakeLiquidateSAFE(keeper, notCollateralType, safeHandler, ctx.contracts.OpynSafeSaviour.address)).to.eventually.be.rejectedWith('OpynSafeSaviour/invalid-collateral-type');

    });

    it('should fail if safe has no oToken selected', async function () {
      const keeper = await ctx.signers[1].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();

      await expect(ctx.mocks.LiquidationEngine.fakeLiquidateSAFE(keeper, collateralType, safeHandler, ctx.contracts.OpynSafeSaviour.address)).to.eventually.be.rejectedWith('OpynSafeSaviour/no-selected-otoken');

    });

    it('should fail on payout too small', async function () {

      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');

      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const isPut = false;

      const owner = await ctx.signers[0].getAddress();
      const keeper = await ctx.signers[1].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        USD.address,
        ctx.mocks.Collateral.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      await oToken.functions.mint(owner, BigNumber.from(1).mul('1000000000000000000'));
      await USD.functions.mint(owner, BigNumber.from(4).mul('1000000000000000000'));
      await USD.approve(ctx.mocks.OpynV2Controller.address, BigNumber.from(4).mul('1000000000000000000'));

      await ctx.mocks.Collateral.functions.mint(owner, BigNumber.from(4).mul('1000000000000000000'));
      await ctx.mocks.Collateral.transfer(ctx.mocks.UniswapV2Router02.address, BigNumber.from(4).mul('1000000000000000000'));

      // Add collateral to otoken
      await ctx.mocks.OpynV2Controller.functions.fundOtoken(oToken.address, USD.address, BigNumber.from(4).mul('1000000000000000000'));
      // Make token redeemable
      await ctx.mocks.OpynV2Controller.functions.toggleRedeemable(oToken.address);
      // Whitelist oToken
      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(oToken.address);
      // Register safe in safe manager
      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      // Register save saviour in liquidation engine
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      // Set safe collateral and debt in safe engine
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(14).mul('1000000000000000000'), BigNumber.from(100).mul('1000000000000000000'));
      await ctx.mocks.OracleRelayer.setRedemptionPrice('3000000000000000000000000000'); // 3$ but it's 27 decimals
      await ctx.mocks.PriceFeed.setResultWithValidity('3000000000000000000', true); // set small collateral price
      // Deposit oTokens in saviour
      await oToken.approve(ctx.contracts.OpynSafeSaviour.address, BigNumber.from(1).mul('1000000000000000000'));
      await ctx.contracts.OpynSafeSaviour.deposit(safeId, BigNumber.from(1).mul('1000000000000000000'), oToken.address);

      await expect(ctx.mocks.LiquidationEngine.fakeLiquidateSAFE(keeper, collateralType, safeHandler, ctx.contracts.OpynSafeSaviour.address)).to.eventually.be.rejectedWith('OpynSafeSaviour/small-keeper-payout-value');
    });

    it('should fail on tiny safes', async function () {

      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');

      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const isPut = false;

      const owner = await ctx.signers[0].getAddress();
      const keeper = await ctx.signers[1].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        USD.address,
        ctx.mocks.Collateral.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      await oToken.functions.mint(owner, BigNumber.from(1).mul('1000000000000000000'));
      await USD.functions.mint(owner, BigNumber.from(4).mul('1000000000000000000'));
      await USD.approve(ctx.mocks.OpynV2Controller.address, BigNumber.from(4).mul('1000000000000000000'));

      await ctx.mocks.Collateral.functions.mint(owner, BigNumber.from(4).mul('1000000000000000000'));
      await ctx.mocks.Collateral.transfer(ctx.mocks.UniswapV2Router02.address, BigNumber.from(4).mul('1000000000000000000'));

      // Add collateral to otoken
      await ctx.mocks.OpynV2Controller.functions.fundOtoken(oToken.address, USD.address, BigNumber.from(4).mul('1000000000000000000'));
      // Make token redeemable
      await ctx.mocks.OpynV2Controller.functions.toggleRedeemable(oToken.address);
      // Whitelist oToken
      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(oToken.address);
      // Register safe in safe manager
      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      // Register save saviour in liquidation engine
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      // Set safe collateral and debt in safe engine to very small values
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(14).mul('10000000000000000'), BigNumber.from(100).mul('10000000000000000'));
      await ctx.mocks.OracleRelayer.setRedemptionPrice('3000000000000000000000000000'); // 3$ but it's 27 decimals
      await ctx.mocks.PriceFeed.setResultWithValidity('30000000000000000000', true);
      // Deposit oTokens in saviour
      await oToken.approve(ctx.contracts.OpynSafeSaviour.address, BigNumber.from(1).mul('1000000000000000000'));
      await ctx.contracts.OpynSafeSaviour.deposit(safeId, BigNumber.from(1).mul('1000000000000000000'), oToken.address);

      await expect(ctx.mocks.LiquidationEngine.fakeLiquidateSAFE(keeper, collateralType, safeHandler, ctx.contracts.OpynSafeSaviour.address)).to.eventually.be.rejectedWith('OpynSafeSaviour/tiny-safe');
    });

    it('should fail if computed required amount of tokens is invalid', async function () {

      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');

      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const isPut = false;

      const owner = await ctx.signers[0].getAddress();
      const keeper = await ctx.signers[1].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        USD.address,
        ctx.mocks.Collateral.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      await oToken.functions.mint(owner, BigNumber.from(1).mul('1000000000000000000'));
      await USD.functions.mint(owner, BigNumber.from(4).mul('1000000000000000000'));
      await USD.approve(ctx.mocks.OpynV2Controller.address, BigNumber.from(4).mul('1000000000000000000'));

      await ctx.mocks.Collateral.functions.mint(owner, BigNumber.from(4).mul('1000000000000000000'));
      await ctx.mocks.Collateral.transfer(ctx.mocks.UniswapV2Router02.address, BigNumber.from(4).mul('1000000000000000000'));

      // Add collateral to otoken
      await ctx.mocks.OpynV2Controller.functions.fundOtoken(oToken.address, USD.address, BigNumber.from(4).mul('1000000000000000000'));
      // Make token redeemable
      await ctx.mocks.OpynV2Controller.functions.toggleRedeemable(oToken.address);
      // Whitelist oToken
      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(oToken.address);
      // Register safe in safe manager
      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      // Register save saviour in liquidation engine
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      // Set safe collateral and debt in safe engine
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(14).mul('1000000000000000000'), BigNumber.from(100).mul('1000000000000000000'));
      await ctx.mocks.OracleRelayer.setRedemptionPrice('30000000000000000000000'); // 3$ but it's 27 decimals (it's small on purpose for this test)
      await ctx.mocks.PriceFeed.setResultWithValidity('30000000000000000000', true);
      // Deposit oTokens in saviour
      await oToken.approve(ctx.contracts.OpynSafeSaviour.address, BigNumber.from(1).mul('1000000000000000000'));
      await ctx.contracts.OpynSafeSaviour.deposit(safeId, BigNumber.from(1).mul('1000000000000000000'), oToken.address);

      await expect(ctx.mocks.LiquidationEngine.fakeLiquidateSAFE(keeper, collateralType, safeHandler, ctx.contracts.OpynSafeSaviour.address)).to.eventually.be.rejectedWith('OpynSafeSaviour/invalid-tokens-used-to-save');

    });

    it('should fail if saviour oToken balance is smaller than required amount of oTokens', async function () {

      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');

      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const isPut = false;

      const owner = await ctx.signers[0].getAddress();
      const keeper = await ctx.signers[1].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        USD.address,
        ctx.mocks.Collateral.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      await oToken.functions.mint(owner, BigNumber.from(1).mul('1000000000000000000'));
      await USD.functions.mint(owner, BigNumber.from(4).mul('1000000000000000000'));
      await USD.approve(ctx.mocks.OpynV2Controller.address, BigNumber.from(4).mul('1000000000000000000'));

      await ctx.mocks.Collateral.functions.mint(owner, BigNumber.from(4).mul('1000000000000000000'));
      await ctx.mocks.Collateral.transfer(ctx.mocks.UniswapV2Router02.address, BigNumber.from(4).mul('1000000000000000000'));

      // Add collateral to otoken
      await ctx.mocks.OpynV2Controller.functions.fundOtoken(oToken.address, USD.address, BigNumber.from(4).mul('1000000000000000000'));
      // Make token redeemable
      await ctx.mocks.OpynV2Controller.functions.toggleRedeemable(oToken.address);
      // Whitelist oToken
      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(oToken.address);
      // Register safe in safe manager
      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      // Register save saviour in liquidation engine
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      // Set safe collateral and debt in safe engine
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(14).mul('1000000000000000000'), BigNumber.from(100).mul('1000000000000000000'));
      await ctx.mocks.OracleRelayer.setRedemptionPrice('3000000000000000000000000000'); // 3$ but it's 27 decimals
      await ctx.mocks.PriceFeed.setResultWithValidity('30000000000000000000', true);
      // Deposit oTokens in saviour
      await oToken.approve(ctx.contracts.OpynSafeSaviour.address, BigNumber.from(1).mul('100000000000000000')); // 0.1 here
      await ctx.contracts.OpynSafeSaviour.deposit(safeId, BigNumber.from(1).mul('100000000000000000'), oToken.address);

      await expect(ctx.mocks.LiquidationEngine.fakeLiquidateSAFE(keeper, collateralType, safeHandler, ctx.contracts.OpynSafeSaviour.address)).to.eventually.be.rejectedWith('OpynSafeSaviour/otoken-balance-too-low');

    });

  });

  describe('keeperPayoutExceedsMinValue', function () {

    it('should properly check that payout is interesting enough for the keeper', async function () {

      await ctx.mocks.OracleRelayer.setRedemptionPrice('3000000000000000000000000000'); // 3$ but it's 27 decimals
      await ctx.mocks.PriceFeed.setResultWithValidity('30000000000000000000', true);

      await expect(ctx.contracts.OpynSafeSaviour.keeperPayoutExceedsMinValue()).to.eventually.equal(true);

    });

    it('should properly check that payout is not interesting enough for the keeper', async function () {

      await ctx.mocks.OracleRelayer.setRedemptionPrice('3000000000000000000000000000'); // 3$ but it's 27 decimals
      await ctx.mocks.PriceFeed.setResultWithValidity('3000000000000000000', true); // 10x cheaper than test above

      await expect(ctx.contracts.OpynSafeSaviour.keeperPayoutExceedsMinValue()).to.eventually.equal(false);

    });

    it('should properly check that oracle has valid value', async function () {

      await ctx.mocks.OracleRelayer.setRedemptionPrice('3000000000000000000000000000'); // 3$ but it's 27 decimals
      await ctx.mocks.PriceFeed.setResultWithValidity('30000000000000000000', false); // 10x cheaper than test above

      await expect(ctx.contracts.OpynSafeSaviour.keeperPayoutExceedsMinValue()).to.eventually.equal(false);

    });

    it('should properly check that oracle value is not null', async function () {

      await ctx.mocks.OracleRelayer.setRedemptionPrice('3000000000000000000000000000'); // 3$ but it's 27 decimals
      await ctx.mocks.PriceFeed.setResultWithValidity('0', true); // 10x cheaper than test above

      await expect(ctx.contracts.OpynSafeSaviour.keeperPayoutExceedsMinValue()).to.eventually.equal(false);

    });

  });

  describe('getKeeperPayoutValue', function () {

    it('should properly check that payout is interesting enough for the keeper', async function () {

      await ctx.mocks.OracleRelayer.setRedemptionPrice('3000000000000000000000000000'); // 3$ but it's 27 decimals
      await ctx.mocks.PriceFeed.setResultWithValidity('30000000000000000000', true);

      expect((await ctx.contracts.OpynSafeSaviour.getKeeperPayoutValue()).toString()).to.equal('3000000000000000000'); // 0.1 * 30$ => 3$

    });

    it('should properly check that oracle has valid value and return 0', async function () {

      await ctx.mocks.OracleRelayer.setRedemptionPrice('3000000000000000000000000000'); // 3$ but it's 27 decimals
      await ctx.mocks.PriceFeed.setResultWithValidity('30000000000000000000', false); // 10x cheaper than test above

      expect((await ctx.contracts.OpynSafeSaviour.getKeeperPayoutValue()).toString()).to.equal('0');

    });

    it('should properly check that oracle value is not null and return 0', async function () {

      await ctx.mocks.OracleRelayer.setRedemptionPrice('3000000000000000000000000000'); // 3$ but it's 27 decimals
      await ctx.mocks.PriceFeed.setResultWithValidity('0', true); // 10x cheaper than test above

      expect((await ctx.contracts.OpynSafeSaviour.getKeeperPayoutValue()).toString()).to.equal('0');

    });

  });

  describe('canSave', function () {

    it('should properly tell that safe can be saved', async function () {

      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');

      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const isPut = false;

      const owner = await ctx.signers[0].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        USD.address,
        ctx.mocks.Collateral.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      await oToken.functions.mint(owner, BigNumber.from(1).mul('1000000000000000000'));
      await USD.functions.mint(owner, BigNumber.from(4).mul('1000000000000000000'));
      await USD.approve(ctx.mocks.OpynV2Controller.address, BigNumber.from(4).mul('1000000000000000000'));

      await ctx.mocks.Collateral.functions.mint(owner, BigNumber.from(4).mul('1000000000000000000'));
      await ctx.mocks.Collateral.transfer(ctx.mocks.UniswapV2Router02.address, BigNumber.from(4).mul('1000000000000000000'));

      // Add collateral to otoken
      await ctx.mocks.OpynV2Controller.functions.fundOtoken(oToken.address, USD.address, BigNumber.from(4).mul('1000000000000000000'));
      // Make token redeemable
      await ctx.mocks.OpynV2Controller.functions.toggleRedeemable(oToken.address);
      // Whitelist oToken
      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(oToken.address);
      // Register safe in safe manager
      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      // Register save saviour in liquidation engine
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      // Set safe collateral and debt in safe engine
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(14).mul('1000000000000000000'), BigNumber.from(100).mul('1000000000000000000'));
      await ctx.mocks.OracleRelayer.setRedemptionPrice('3000000000000000000000000000'); // 3$ but it's 27 decimals
      await ctx.mocks.PriceFeed.setResultWithValidity('30000000000000000000', true);
      // Deposit oTokens in saviour
      await oToken.approve(ctx.contracts.OpynSafeSaviour.address, BigNumber.from(1).mul('1000000000000000000'));
      await ctx.contracts.OpynSafeSaviour.deposit(safeId, BigNumber.from(1).mul('1000000000000000000'), oToken.address);

      await ctx.mocks.Asserter.testCanSave(ctx.contracts.OpynSafeSaviour.address, safeHandler, true);

    });

    it('should return false if amount to add to collateral is invalid', async function () {

      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');

      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const isPut = false;

      const owner = await ctx.signers[0].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        USD.address,
        ctx.mocks.Collateral.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      await oToken.functions.mint(owner, BigNumber.from(1).mul('1000000000000000000'));
      await USD.functions.mint(owner, BigNumber.from(4).mul('1000000000000000000'));
      await USD.approve(ctx.mocks.OpynV2Controller.address, BigNumber.from(4).mul('1000000000000000000'));

      await ctx.mocks.Collateral.functions.mint(owner, BigNumber.from(4).mul('1000000000000000000'));
      await ctx.mocks.Collateral.transfer(ctx.mocks.UniswapV2Router02.address, BigNumber.from(4).mul('1000000000000000000'));

      // Add collateral to otoken
      await ctx.mocks.OpynV2Controller.functions.fundOtoken(oToken.address, USD.address, BigNumber.from(4).mul('1000000000000000000'));
      // Make token redeemable
      await ctx.mocks.OpynV2Controller.functions.toggleRedeemable(oToken.address);
      // Whitelist oToken
      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(oToken.address);
      // Register safe in safe manager
      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      // Register save saviour in liquidation engine
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      // Set safe collateral and debt in safe engine
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(14).mul('1000000000000000000'), BigNumber.from(100).mul('1000000000000000000'));
      await ctx.mocks.OracleRelayer.setRedemptionPrice('3000000000000000000000000000'); // 3$ but it's 27 decimals
      await ctx.mocks.PriceFeed.setResultWithValidity('30000000000000000000', true);
      // Deposit oTokens in saviour
      await oToken.approve(ctx.contracts.OpynSafeSaviour.address, BigNumber.from(1).mul('1000000000000000000'));
      await ctx.contracts.OpynSafeSaviour.deposit(safeId, BigNumber.from(1).mul('1000000000000000000'), oToken.address);
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(14).mul('1000000000000000000'), BigNumber.from(0));

      await ctx.mocks.Asserter.testCanSave(ctx.contracts.OpynSafeSaviour.address, safeHandler, false);

    });

    it('should return false if no oTokens deposited', async function () {

      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');

      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const isPut = false;

      const owner = await ctx.signers[0].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        USD.address,
        ctx.mocks.Collateral.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      await USD.functions.mint(owner, BigNumber.from(4).mul('1000000000000000000'));
      await USD.approve(ctx.mocks.OpynV2Controller.address, BigNumber.from(4).mul('1000000000000000000'));

      await ctx.mocks.Collateral.functions.mint(owner, BigNumber.from(4).mul('1000000000000000000'));
      await ctx.mocks.Collateral.transfer(ctx.mocks.UniswapV2Router02.address, BigNumber.from(4).mul('1000000000000000000'));

      // Add collateral to otoken
      await ctx.mocks.OpynV2Controller.functions.fundOtoken(oToken.address, USD.address, BigNumber.from(4).mul('1000000000000000000'));
      // Make token redeemable
      await ctx.mocks.OpynV2Controller.functions.toggleRedeemable(oToken.address);
      // Whitelist oToken
      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(oToken.address);
      // Register safe in safe manager
      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      // Register save saviour in liquidation engine
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      // Set safe collateral and debt in safe engine
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(14).mul('1000000000000000000'), BigNumber.from(100).mul('1000000000000000000'));
      await ctx.mocks.OracleRelayer.setRedemptionPrice('3000000000000000000000000000'); // 3$ but it's 27 decimals
      await ctx.mocks.PriceFeed.setResultWithValidity('30000000000000000000', true);

      await ctx.mocks.Asserter.testCanSave(ctx.contracts.OpynSafeSaviour.address, safeHandler, false);

    });

    it('should fail if payout is smaller than minimum payout in $', async function () {

      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');

      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const isPut = false;

      const owner = await ctx.signers[0].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        USD.address,
        ctx.mocks.Collateral.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      await oToken.functions.mint(owner, BigNumber.from(1).mul('1000000000000000000'));
      await USD.functions.mint(owner, BigNumber.from(4).mul('1000000000000000000'));
      await USD.approve(ctx.mocks.OpynV2Controller.address, BigNumber.from(4).mul('1000000000000000000'));

      await ctx.mocks.Collateral.functions.mint(owner, BigNumber.from(4).mul('1000000000000000000'));
      await ctx.mocks.Collateral.transfer(ctx.mocks.UniswapV2Router02.address, BigNumber.from(4).mul('1000000000000000000'));

      // Add collateral to otoken
      await ctx.mocks.OpynV2Controller.functions.fundOtoken(oToken.address, USD.address, BigNumber.from(4).mul('1000000000000000000'));
      // Make token redeemable
      await ctx.mocks.OpynV2Controller.functions.toggleRedeemable(oToken.address);
      // Whitelist oToken
      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(oToken.address);
      // Register safe in safe manager
      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      // Register save saviour in liquidation engine
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      // Set safe collateral and debt in safe engine
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(14).mul('1000000000000000000'), BigNumber.from(100).mul('1000000000000000000'));
      await ctx.mocks.OracleRelayer.setRedemptionPrice('3000000000000000000000000000'); // 3$ but it's 27 decimals
      await ctx.mocks.PriceFeed.setResultWithValidity('3000000000000000000', true); // 3$
      // Deposit oTokens in saviour
      await oToken.approve(ctx.contracts.OpynSafeSaviour.address, BigNumber.from(1).mul('1000000000000000000'));
      await ctx.contracts.OpynSafeSaviour.deposit(safeId, BigNumber.from(1).mul('1000000000000000000'), oToken.address);

      await ctx.mocks.Asserter.testCanSave(ctx.contracts.OpynSafeSaviour.address, safeHandler, false);

    });

    it('should return false if safe is holding less funds than keeperPayout * payoutToSAFESize', async function () {

      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');

      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const isPut = false;

      const owner = await ctx.signers[0].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        USD.address,
        ctx.mocks.Collateral.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      await oToken.functions.mint(owner, BigNumber.from(1).mul('1000000000000000000'));
      await USD.functions.mint(owner, BigNumber.from(4).mul('1000000000000000000'));
      await USD.approve(ctx.mocks.OpynV2Controller.address, BigNumber.from(4).mul('1000000000000000000'));

      await ctx.mocks.Collateral.functions.mint(owner, BigNumber.from(4).mul('1000000000000000000'));
      await ctx.mocks.Collateral.transfer(ctx.mocks.UniswapV2Router02.address, BigNumber.from(4).mul('1000000000000000000'));

      // Add collateral to otoken
      await ctx.mocks.OpynV2Controller.functions.fundOtoken(oToken.address, USD.address, BigNumber.from(4).mul('1000000000000000000'));
      // Make token redeemable
      await ctx.mocks.OpynV2Controller.functions.toggleRedeemable(oToken.address);
      // Whitelist oToken
      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(oToken.address);
      // Register safe in safe manager
      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      // Register save saviour in liquidation engine
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      // Set safe collateral and debt in safe engine
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(14).mul('10000000000000000'), BigNumber.from(100).mul('10000000000000000'));
      await ctx.mocks.OracleRelayer.setRedemptionPrice('3000000000000000000000000000'); // 3$ but it's 27 decimals
      await ctx.mocks.PriceFeed.setResultWithValidity('30000000000000000000', true);
      // Deposit oTokens in saviour
      await oToken.approve(ctx.contracts.OpynSafeSaviour.address, BigNumber.from(1).mul('1000000000000000000'));
      await ctx.contracts.OpynSafeSaviour.deposit(safeId, BigNumber.from(1).mul('1000000000000000000'), oToken.address);

      await ctx.mocks.Asserter.testCanSave(ctx.contracts.OpynSafeSaviour.address, safeHandler, false);

    });

    it('should return false if amount of oToken is smaller than required to save the safe and pay the keeper', async function () {

      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');

      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const isPut = false;

      const owner = await ctx.signers[0].getAddress();
      const safeHandler = await ctx.signers[1].getAddress();
      const safeId = 2702;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        USD.address,
        ctx.mocks.Collateral.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      await oToken.functions.mint(owner, BigNumber.from(1).mul('1000000000000000000'));
      await USD.functions.mint(owner, BigNumber.from(4).mul('1000000000000000000'));
      await USD.approve(ctx.mocks.OpynV2Controller.address, BigNumber.from(4).mul('1000000000000000000'));

      await ctx.mocks.Collateral.functions.mint(owner, BigNumber.from(4).mul('1000000000000000000'));
      await ctx.mocks.Collateral.transfer(ctx.mocks.UniswapV2Router02.address, BigNumber.from(4).mul('1000000000000000000'));

      // Add collateral to otoken
      await ctx.mocks.OpynV2Controller.functions.fundOtoken(oToken.address, USD.address, BigNumber.from(4).mul('1000000000000000000'));
      // Make token redeemable
      await ctx.mocks.OpynV2Controller.functions.toggleRedeemable(oToken.address);
      // Whitelist oToken
      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(oToken.address);
      // Register safe in safe manager
      await ctx.mocks.SafeManager.setSafe(2702, safeHandler, owner);
      // Register save saviour in liquidation engine
      await ctx.mocks.LiquidationEngine.toggleSafeSaviour(ctx.contracts.OpynSafeSaviour.address);
      // Set safe collateral and debt in safe engine
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(14).mul('1000000000000000000'), BigNumber.from(100).mul('1000000000000000000'));
      await ctx.mocks.OracleRelayer.setRedemptionPrice('3000000000000000000000000000'); // 3$ but it's 27 decimals
      await ctx.mocks.PriceFeed.setResultWithValidity('30000000000000000000', true);
      // Deposit oTokens in saviour
      await oToken.approve(ctx.contracts.OpynSafeSaviour.address, BigNumber.from(1).mul('100000000000000000')); // 0.1
      await ctx.contracts.OpynSafeSaviour.deposit(safeId, BigNumber.from(1).mul('100000000000000000'), oToken.address); // 0.1

      await ctx.mocks.Asserter.testCanSave(ctx.contracts.OpynSafeSaviour.address, safeHandler, false);

    });
  });

  describe('tokenAmountUsedToSave', function() {

    it('should properly compute how much oTokens are required to end up with enough collateral to save safe', async function() {
      const safeHandler = await ctx.signers[1].getAddress();

      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(14).mul('1000000000000000000'), BigNumber.from(100).mul('1000000000000000000'));
      await ctx.mocks.OracleRelayer.setRedemptionPrice('3000000000000000000000000000'); // 3$ but it's 27 decimals
      await ctx.mocks.PriceFeed.setResultWithValidity('30000000000000000000', true);

      await ctx.mocks.Asserter.testTokenAmountUsedToSave(ctx.contracts.OpynSafeSaviour.address, safeHandler, BigNumber.from('3000000000000000000')); // Bring it from 14 to 17 for 145 collateralization

    })

    it('should properly compute how much oTokens are required with a custom collateralization ratio', async function() {
      const safeHandler = await ctx.signers[1].getAddress();
      const owner = await ctx.signers[0].getAddress();
      const safeId = 2702;

      await ctx.mocks.SafeManager.setSafe(safeId, safeHandler, owner);
      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(14).mul('1000000000000000000'), BigNumber.from(100).mul('1000000000000000000'));
      await ctx.mocks.OracleRelayer.setRedemptionPrice('3000000000000000000000000000'); // 3$ but it's 27 decimals
      await ctx.mocks.PriceFeed.setResultWithValidity('30000000000000000000', true);

      await ctx.contracts.OpynSafeSaviour.setDesiredCollateralizationRatio(safeId, 300);
      await ctx.mocks.Asserter.testTokenAmountUsedToSave(ctx.contracts.OpynSafeSaviour.address, safeHandler, BigNumber.from('16000000000000000000')); // Bring it from 14 to 17 for 300 collateralization

    })

    it('should properly tell that safe is already above desired collateralization ratio', async function() {
      const safeHandler = await ctx.signers[1].getAddress();

      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(18).mul('1000000000000000000'), BigNumber.from(100).mul('1000000000000000000'));
      await ctx.mocks.OracleRelayer.setRedemptionPrice('3000000000000000000000000000'); // 3$ but it's 27 decimals
      await ctx.mocks.PriceFeed.setResultWithValidity('30000000000000000000', true);

      await ctx.mocks.Asserter.testTokenAmountUsedToSave(ctx.contracts.OpynSafeSaviour.address, safeHandler, BigNumber.from('0')); // Bring it from 14 to 17 for 145 collateralization

    })

    it('should properly return max uint if safe has no debt', async function() {
      const safeHandler = await ctx.signers[1].getAddress();

      await ctx.mocks.SafeEngine.setSafe(collateralType, safeHandler, BigNumber.from(14).mul('1000000000000000000'), BigNumber.from(0));
      await ctx.mocks.OracleRelayer.setRedemptionPrice('3000000000000000000000000000'); // 3$ but it's 27 decimals
      await ctx.mocks.PriceFeed.setResultWithValidity('30000000000000000000', true);

      await ctx.mocks.Asserter.testTokenAmountUsedToSave(ctx.contracts.OpynSafeSaviour.address, safeHandler, BigNumber.from('115792089237316195423570985008687907853269984665640564039457584007913129639935')); // Bring it from 14 to 17 for 145 collateralization

    })
  });

});

