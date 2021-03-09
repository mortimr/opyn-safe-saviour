import * as chai from 'chai'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = chai.expect;

import { Signer, Contract, ContractFactory, BigNumber } from 'ethers';
import { ethers } from 'hardhat';

interface Context {
  signers: Signer[]
  mocks: {
    OpynV2Controller: Contract;
    OpynV2Whitelist: Contract;
    UniswapV2Router02: Contract;
    SaviourRegistry: Contract;
  }
  mockFactories: {
    OpynV2OToken: ContractFactory;
    ERC20: ContractFactory;
  }
  contracts: {
    OpynSafeSaviourOperator: Contract
  }
}

describe('OSSO - Opyn Safe Saviour Operator', function () {

  const ctx: Context = {
    signers: null,
    mocks: {
      OpynV2Controller: null,
      OpynV2Whitelist: null,
      UniswapV2Router02: null,
      SaviourRegistry: null
    },
    mockFactories: {
      OpynV2OToken: null,
      ERC20: null
    },
    contracts: {
      OpynSafeSaviourOperator: null
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

  });

  describe('constructor', function () {

    it('should prevent an operator to be built with null opyn controller address', async function () {

      const OpynSafeSaviourOperatorFactory = await ethers.getContractFactory('OpynSafeSaviourOperator');
      await expect(OpynSafeSaviourOperatorFactory.deploy(
        '0x0000000000000000000000000000000000000000',
        ctx.mocks.OpynV2Whitelist.address,
        ctx.mocks.UniswapV2Router02.address,
        ctx.mocks.SaviourRegistry.address
      )).to.eventually.be.rejectedWith('OpynSafeSaviour/null-opyn-v2-controller');

    });

    it('should prevent an operator to be built with null opyn whitelist address', async function () {

      const OpynSafeSaviourOperatorFactory = await ethers.getContractFactory('OpynSafeSaviourOperator');
      await expect(OpynSafeSaviourOperatorFactory.deploy(
        ctx.mocks.OpynV2Controller.address,
        '0x0000000000000000000000000000000000000000',
        ctx.mocks.UniswapV2Router02.address,
        ctx.mocks.SaviourRegistry.address
      )).to.eventually.be.rejectedWith('OpynSafeSaviour/null-opyn-v2-whitelist');

    });

    it('should prevent an operator to be built with null uniswap router address', async function () {

      const OpynSafeSaviourOperatorFactory = await ethers.getContractFactory('OpynSafeSaviourOperator');
      await expect(OpynSafeSaviourOperatorFactory.deploy(
        ctx.mocks.OpynV2Controller.address,
        ctx.mocks.OpynV2Whitelist.address,
        '0x0000000000000000000000000000000000000000',
        ctx.mocks.SaviourRegistry.address
      )).to.eventually.be.rejectedWith('OpynSafeSaviour/null-uniswap-v2-router02');

    });

    it('should prevent an operator to be built with null saviour registry address', async function () {

      const OpynSafeSaviourOperatorFactory = await ethers.getContractFactory('OpynSafeSaviourOperator');
      await expect(OpynSafeSaviourOperatorFactory.deploy(
        ctx.mocks.OpynV2Controller.address,
        ctx.mocks.OpynV2Whitelist.address,
        ctx.mocks.UniswapV2Router02.address,
        '0x0000000000000000000000000000000000000000',
      )).to.eventually.be.rejectedWith('OpynSafeSaviour/null-saviour-registry');

    });

  });

  describe('isOTokenPutOption', function () {

    it('should return true for put option', async function () {

      const Gold = await ctx.mockFactories.ERC20.deploy('Gold', 'GLD');
      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');

      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const isPut = true;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        Gold.address,
        Gold.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      expect(await ctx.contracts.OpynSafeSaviourOperator.functions.isOTokenPutOption(oToken.address)).to.deep.equal([isPut])

    });

    it('should return false for call option', async function () {

      const Gold = await ctx.mockFactories.ERC20.deploy('Gold', 'GLD');
      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');

      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const isPut = false;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        Gold.address,
        Gold.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      expect(await ctx.contracts.OpynSafeSaviourOperator.functions.isOTokenPutOption(oToken.address)).to.deep.equal([isPut])

    });


  });

  describe('getOpynPayout', function () {

    it('should retrieve payout amount from controller', async function () {

      const Gold = await ctx.mockFactories.ERC20.deploy('Gold', 'GLD');
      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');

      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const owner = await ctx.signers[0].getAddress();

      const isPut = true;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        Gold.address,
        Gold.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      await Gold.functions.mint(owner, 1000);
      await oToken.functions.mint(owner, 100);

      await Gold.functions.approve(ctx.mocks.OpynV2Controller.address, 1000);
      await ctx.mocks.OpynV2Controller.functions.fundOtoken(oToken.address, Gold.address, 1000);
      await ctx.mocks.OpynV2Controller.functions.toggleRedeemable(oToken.address);

      expect((await ctx.contracts.OpynSafeSaviourOperator.functions.getOpynPayout(oToken.address, 1))[0].toString()).to.equal('10');
      expect((await ctx.contracts.OpynSafeSaviourOperator.functions.getOpynPayout(oToken.address, 10))[0].toString()).to.equal('100');
      expect((await ctx.contracts.OpynSafeSaviourOperator.functions.getOpynPayout(oToken.address, 50))[0].toString()).to.equal('500');
      expect((await ctx.contracts.OpynSafeSaviourOperator.functions.getOpynPayout(oToken.address, 100))[0].toString()).to.equal('1000');

    })

  });

  describe('toggleOToken', function () {

    it('should properly whitelist oToken for saviour usage', async function () {

      const Gold = await ctx.mockFactories.ERC20.deploy('Gold', 'GLD');
      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');

      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const isPut = true;

      const owner = await ctx.signers[0].getAddress();

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        Gold.address,
        Gold.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(oToken.address);

      expect((await ctx.contracts.OpynSafeSaviourOperator.functions.oTokenWhitelist(oToken.address))[0].toString()).to.deep.equal('0');

      await ctx.mocks.SaviourRegistry.functions.authorizeAccount(owner, 1);

      await ctx.contracts.OpynSafeSaviourOperator.functions.toggleOToken(oToken.address)
      await ctx.contracts.OpynSafeSaviourOperator.functions.toggleOToken(oToken.address)
      await ctx.contracts.OpynSafeSaviourOperator.functions.toggleOToken(oToken.address)

      expect((await ctx.contracts.OpynSafeSaviourOperator.functions.oTokenWhitelist(oToken.address))[0].toString()).to.deep.equal('1');
    });

    it('should for unauthorized account', async function () {

      const Gold = await ctx.mockFactories.ERC20.deploy('Gold', 'GLD');
      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');

      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const isPut = true;

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        Gold.address,
        Gold.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      await expect(ctx.contracts.OpynSafeSaviourOperator.functions.toggleOToken(oToken.address)).to.eventually.be.rejectedWith('OpynSafeSaviour/account-not-authorized');
    });

    it('should fail for not whitelisted otoken', async function () {

      const Gold = await ctx.mockFactories.ERC20.deploy('Gold', 'GLD');
      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');

      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const isPut = true;

      const owner = await ctx.signers[0].getAddress();

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        Gold.address,
        Gold.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      expect((await ctx.contracts.OpynSafeSaviourOperator.functions.oTokenWhitelist(oToken.address))[0].toString()).to.deep.equal('0');

      await ctx.mocks.SaviourRegistry.functions.authorizeAccount(owner, 1);

      await expect(ctx.contracts.OpynSafeSaviourOperator.functions.toggleOToken(oToken.address)).to.eventually.be.rejectedWith('OpynSafeSaviour/otoken-not-whitelisted');
    });

    it('should fail for not call option otoken', async function () {

      const Gold = await ctx.mockFactories.ERC20.deploy('Gold', 'GLD');
      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');

      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const isPut = false;

      const owner = await ctx.signers[0].getAddress();

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        Gold.address,
        Gold.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      await ctx.mocks.OpynV2Whitelist.functions.toggleWhitelist(oToken.address);

      expect((await ctx.contracts.OpynSafeSaviourOperator.functions.oTokenWhitelist(oToken.address))[0].toString()).to.deep.equal('0');

      await ctx.mocks.SaviourRegistry.functions.authorizeAccount(owner, 1);

      await expect(ctx.contracts.OpynSafeSaviourOperator.functions.toggleOToken(oToken.address)).to.eventually.be.rejectedWith('OpynSafeSaviour/option-not-put');

    });

  });

  describe('getOTokenAmountToApprove', function () {

    it('should compute the amount of oToken to approve to the operator for the requested output safe collateral amount to be fetched', async function () {

      const Gold = await ctx.mockFactories.ERC20.deploy('Gold', 'GLD');
      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');

      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const isPut = false;

      const owner = await ctx.signers[0].getAddress();

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        Gold.address,
        Gold.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      await oToken.functions.mint(owner, 1000);
      await Gold.functions.mint(owner, 10000);
      await Gold.approve(ctx.mocks.OpynV2Controller.address, 10000);

      await ctx.mocks.OpynV2Controller.functions.fundOtoken(oToken.address, Gold.address, 10000);
      await ctx.mocks.OpynV2Controller.functions.toggleRedeemable(oToken.address);

      expect((await ctx.contracts.OpynSafeSaviourOperator.functions.getOTokenAmountToApprove(
        oToken.address,
        1000,
        Gold.address
      )).toString()).to.equal('100');

      expect((await ctx.contracts.OpynSafeSaviourOperator.functions.getOTokenAmountToApprove(
        oToken.address,
        151,
        Gold.address
      )).toString()).to.equal('16');

      expect((await ctx.contracts.OpynSafeSaviourOperator.functions.getOTokenAmountToApprove(
        oToken.address,
        159,
        Gold.address
      )).toString()).to.equal('16');

    });

    it('should fail if not redeemable', async function () {

      const Gold = await ctx.mockFactories.ERC20.deploy('Gold', 'GLD');
      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');

      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const isPut = false;

      const owner = await ctx.signers[0].getAddress();

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        Gold.address,
        Gold.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      await oToken.functions.mint(owner, 1000);
      await Gold.functions.mint(owner, 10000);
      await Gold.approve(ctx.mocks.OpynV2Controller.address, 10000);

      await ctx.mocks.OpynV2Controller.functions.fundOtoken(oToken.address, Gold.address, 10000);

      await expect(ctx.contracts.OpynSafeSaviourOperator.functions.getOTokenAmountToApprove(
        oToken.address,
        1000,
        Gold.address
      )).to.eventually.be.rejectedWith('not redeemable');

    });

    it('should fail if no collateral to redeem', async function () {

      const Gold = await ctx.mockFactories.ERC20.deploy('Gold', 'GLD');
      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');

      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const isPut = false;

      const owner = await ctx.signers[0].getAddress();

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        Gold.address,
        Gold.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      await oToken.functions.mint(owner, 1000);
      await ctx.mocks.OpynV2Controller.functions.toggleRedeemable(oToken.address);

      await expect(ctx.contracts.OpynSafeSaviourOperator.functions.getOTokenAmountToApprove(
        oToken.address,
        1000,
        Gold.address
      )).to.eventually.be.rejectedWith('OpynSafeSaviour/no-collateral-to-redeem');

    });

  });

  describe('redeemAndSwapOTokens', function () {

    it('should properly redeem oToken collateral from opyn and proceed to a swap on uniswap', async function () {

      const Gold = await ctx.mockFactories.ERC20.deploy('Gold', 'GLD');
      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');

      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const isPut = false;

      const owner = await ctx.signers[0].getAddress();

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        USD.address,
        Gold.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      await oToken.functions.mint(owner, 1000);
      await USD.functions.mint(owner, 10000);
      await USD.approve(ctx.mocks.OpynV2Controller.address, 10000);

      await Gold.functions.mint(owner, 1000);
      await Gold.transfer(ctx.mocks.UniswapV2Router02.address, 1000);

      await ctx.mocks.OpynV2Controller.functions.fundOtoken(oToken.address, USD.address, 10000);
      await ctx.mocks.OpynV2Controller.functions.toggleRedeemable(oToken.address);

      const requiredOutputAmount = 1000;

      const amountToRedeem = (await ctx.contracts.OpynSafeSaviourOperator.functions.getOTokenAmountToApprove(
        oToken.address,
        requiredOutputAmount,
        Gold.address
      ))[0];

      await oToken.approve(ctx.contracts.OpynSafeSaviourOperator.address, amountToRedeem);

      expect((await Gold.balanceOf(owner)).toString()).to.equal('0');
      expect((await oToken.balanceOf(owner)).toString()).to.equal('1000');

      await ctx.contracts.OpynSafeSaviourOperator.redeemAndSwapOTokens(
        oToken.address,
        amountToRedeem,
        requiredOutputAmount,
        Gold.address
      );

      expect((await Gold.balanceOf(owner)).toString()).to.equal('1000');
      expect((await oToken.balanceOf(owner)).toString()).to.equal('900');

    });

    it('should fail on allowance too low', async function () {

      const Gold = await ctx.mockFactories.ERC20.deploy('Gold', 'GLD');
      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');

      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const isPut = false;

      const owner = await ctx.signers[0].getAddress();

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        USD.address,
        Gold.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      await oToken.functions.mint(owner, 1000);
      await USD.functions.mint(owner, 10000);
      await USD.approve(ctx.mocks.OpynV2Controller.address, 10000);

      await Gold.functions.mint(owner, 1000);
      await Gold.transfer(ctx.mocks.UniswapV2Router02.address, 1000);

      await ctx.mocks.OpynV2Controller.functions.fundOtoken(oToken.address, USD.address, 10000);
      await ctx.mocks.OpynV2Controller.functions.toggleRedeemable(oToken.address);

      const requiredOutputAmount = 1000;

      const amountToRedeem = (await ctx.contracts.OpynSafeSaviourOperator.functions.getOTokenAmountToApprove(
        oToken.address,
        requiredOutputAmount,
        Gold.address
      ))[0];

      await expect(ctx.contracts.OpynSafeSaviourOperator.redeemAndSwapOTokens(
        oToken.address,
        amountToRedeem,
        requiredOutputAmount,
        Gold.address
      )).to.eventually.be.rejectedWith('transfer amount exceeds allowance');

    });

    it('should fail on oToken not redeemable', async function () {

      const Gold = await ctx.mockFactories.ERC20.deploy('Gold', 'GLD');
      const USD = await ctx.mockFactories.ERC20.deploy('United State Dollar', 'USD');

      const inOneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const isPut = false;

      const owner = await ctx.signers[0].getAddress();

      const oToken = await ctx.mockFactories.OpynV2OToken.deploy(
        USD.address,
        Gold.address,
        USD.address,
        BigNumber.from(1200).mul('1000000000000000000'),
        inOneMonth,
        isPut
      );

      await oToken.functions.mint(owner, 1000);
      await USD.functions.mint(owner, 10000);
      await USD.approve(ctx.mocks.OpynV2Controller.address, 10000);

      await Gold.functions.mint(owner, 1000);
      await Gold.transfer(ctx.mocks.UniswapV2Router02.address, 1000);

      await ctx.mocks.OpynV2Controller.functions.fundOtoken(oToken.address, USD.address, 10000);
      await ctx.mocks.OpynV2Controller.functions.toggleRedeemable(oToken.address);

      const requiredOutputAmount = 1000;

      const amountToRedeem = (await ctx.contracts.OpynSafeSaviourOperator.functions.getOTokenAmountToApprove(
        oToken.address,
        requiredOutputAmount,
        Gold.address
      ))[0];

      await ctx.mocks.OpynV2Controller.functions.toggleRedeemable(oToken.address);
      await oToken.approve(ctx.contracts.OpynSafeSaviourOperator.address, amountToRedeem);

      await expect(ctx.contracts.OpynSafeSaviourOperator.redeemAndSwapOTokens(
        oToken.address,
        amountToRedeem,
        requiredOutputAmount,
        Gold.address
      )).to.eventually.be.rejectedWith('not redeemable');

    });

  });

});