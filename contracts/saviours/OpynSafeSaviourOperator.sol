// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

pragma experimental ABIEncoderV2;

import '../interfaces/OpynV2OTokenLike.sol';
import '../interfaces/OpynV2ControllerLike.sol';
import '../interfaces/OpynV2WhitelistLike.sol';
import '../interfaces/UniswapV2Router02Like.sol';
import '../interfaces/SAFESaviourRegistryLike.sol';
import '../interfaces/ERC20Like.sol';
import '../math/SafeMath.sol';

contract OpynSafeSaviourOperator is SafeMath {
    // The Opyn v2 Controller to interact with oTokens
    OpynV2ControllerLike public opynV2Controller;
    // The Opyn v2 Whitelist to check oTokens' validity
    OpynV2WhitelistLike public opynV2Whitelist;
    // The Uniswap v2 router 02 to swap collaterals
    UniswapV2Router02Like public uniswapV2Router02;
    // oToken type selected by each SAFE
    mapping(address => address) public oTokenSelection;
    // Entity whitelisting allowed saviours
    SAFESaviourRegistryLike public saviourRegistry;
    // allowed oToken contracts
    mapping(address => uint256) public oTokenWhitelist;

    // Events
    event ToggleOToken(address oToken, uint256 whitelistState);

    constructor(
        address opynV2Controller_,
        address opynV2Whitelist_,
        address uniswapV2Router02_,
        address saviourRegistry_
    ) {
        require(opynV2Controller_ != address(0), 'OpynSafeSaviour/null-opyn-v2-controller');
        require(opynV2Whitelist_ != address(0), 'OpynSafeSaviour/null-opyn-v2-whitelist');
        require(uniswapV2Router02_ != address(0), 'OpynSafeSaviour/null-uniswap-v2-router02');
        require(saviourRegistry_ != address(0), 'OpynSafeSaviour/null-saviour-registry');

        opynV2Controller = OpynV2ControllerLike(opynV2Controller_);
        opynV2Whitelist = OpynV2WhitelistLike(opynV2Whitelist_);
        uniswapV2Router02 = UniswapV2Router02Like(uniswapV2Router02_);
        saviourRegistry = SAFESaviourRegistryLike(saviourRegistry_);
    }

    function isOTokenPutOption(address _otoken) external view returns (bool) {
        (, , , , , bool isPut) = OpynV2OTokenLike(_otoken).getOtokenDetails();
        return isPut;
    }

    function getOpynPayout(address _otoken, uint256 _amount) external view returns (uint256) {
        return opynV2Controller.getPayout(_otoken, _amount);
    }

    modifier isSaviourRegistryAuthorized() {
        require(saviourRegistry.authorizedAccounts(msg.sender) == 1, 'OpynSafeSaviour/account-not-authorized');
        _;
    }

    function redeemAndSwapOTokens(
        address _otoken,
        uint256 _amountIn,
        uint256 _amountOut,
        address _safeCollateral
    ) external {
        ERC20Like(_otoken).transferFrom(msg.sender, address(this), _amountIn);

        (address oTokenCollateral, , , , , ) = OpynV2OTokenLike(_otoken).getOtokenDetails();

        uint256 redeemedOTokenCollateral;

        {
            // Opyn Redeem

            uint256 preRedeemBalance = ERC20Like(oTokenCollateral).balanceOf(address(this));

            // Build Opyn Action
            ActionArgs[] memory redeemAction = new ActionArgs[](1);
            redeemAction[0].actionType = ActionType.Redeem;
            redeemAction[0].owner = address(0);
            redeemAction[0].secondAddress = address(this);
            redeemAction[0].asset = _otoken;
            redeemAction[0].vaultId = 0;
            redeemAction[0].amount = _amountIn;

            // Trigger oToken collateral redeem
            opynV2Controller.operate(redeemAction);

            redeemedOTokenCollateral = sub(ERC20Like(oTokenCollateral).balanceOf(address(this)), preRedeemBalance);
        }

        uint256 swappedSafeCollateral;

        {
            // Uniswap swap

            // Retrieve pre-swap WETH balance
            uint256 safeCollateralBalance = ERC20Like(_safeCollateral).balanceOf(address(this));

            // Path argument for the uniswap router
            address[] memory path = new address[](2);
            path[0] = oTokenCollateral;
            path[1] = _safeCollateral;

            ERC20Like(oTokenCollateral).approve(address(uniswapV2Router02), redeemedOTokenCollateral);

            uniswapV2Router02.swapExactTokensForTokens(
                redeemedOTokenCollateral,
                _amountOut,
                path,
                address(this),
                block.timestamp
            );

            // Retrieve post-swap WETH balance. Would overflow and throw if balance decreased
            swappedSafeCollateral = sub(ERC20Like(_safeCollateral).balanceOf(address(this)), safeCollateralBalance);
        }

        ERC20Like(_safeCollateral).transfer(msg.sender, swappedSafeCollateral);
    }

    function toggleOToken(address _otoken) external isSaviourRegistryAuthorized() {
        require(opynV2Whitelist.isWhitelistedOtoken(_otoken) == true, 'OpynSafeSaviour/otoken-not-whitelisted');

        (, , , , , bool isPut) = OpynV2OTokenLike(_otoken).getOtokenDetails();

        require(isPut == true, 'OpynSafeSaviour/option-not-put');

        if (oTokenWhitelist[_otoken] == 0) {
            oTokenWhitelist[_otoken] = 1;
        } else {
            oTokenWhitelist[_otoken] = 0;
        }
        emit ToggleOToken(_otoken, oTokenWhitelist[_otoken]);
    }

    function getOTokenAmountToApprove(
        address _otoken,
        uint256 _requiredOutputAmount,
        address _safeCollateralAddress
    ) external view returns (uint256) {
        (address oTokenCollateralAddress, , , , , ) = OpynV2OTokenLike(_otoken).getOtokenDetails();

        address[] memory path = new address[](2);
        path[0] = oTokenCollateralAddress;
        path[1] = _safeCollateralAddress;

        uint256 oTokenCollateralAmountRequired = uniswapV2Router02.getAmountsIn(_requiredOutputAmount, path)[0];

        uint256 payoutPerToken = opynV2Controller.getPayout(_otoken, 1);

        require(payoutPerToken > 0, 'OpynSafeSaviour/no-collateral-to-redeem');

        uint256 amountToApprove = div(oTokenCollateralAmountRequired, payoutPerToken);

        // Integer division rounds to zero, better ensure we get at least the required amount
        if (mul(amountToApprove, payoutPerToken) < _requiredOutputAmount) {
            amountToApprove += 1;
        }

        return amountToApprove;
    }
}
