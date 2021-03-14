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
      '100000000000000000', // amount of eth for keeper => 0.1 ETH
      '90000000000000000000', // how much it should be worth in euro => 90 $
      '20', // keeper * safe to size >= safe size
      170
    );

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

});

