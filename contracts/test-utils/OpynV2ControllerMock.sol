// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

pragma experimental ABIEncoderV2;

import '../interfaces/OpynV2OTokenLike.sol';
import '../interfaces/OpynV2ControllerLike.sol';
import './OpynV2OTokenMock.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol';

contract OpynV2ControllerMock is OpynV2ControllerLike {
    mapping(address => mapping(address => uint256)) public balances;
    mapping(address => uint256) public redeemable;

    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier ownerOnly() {
        require(owner == msg.sender, 'not owner');
        _;
    }

    modifier isRedeemable(address _otoken) {
        require(redeemable[_otoken] == 1, 'not redeemable');
        _;
    }

    function fundOtoken(
        address _otoken,
        address _collateralAsset,
        uint256 _amount
    ) external {
        ERC20Burnable(_collateralAsset).transferFrom(msg.sender, address(this), _amount);
        balances[_otoken][_collateralAsset] = balances[_otoken][_collateralAsset] + _amount;
    }

    function toggleRedeemable(address _otoken) external ownerOnly {
        redeemable[_otoken] = (redeemable[_otoken] + 1) % 2;
    }

    function operate(ActionArgs[] calldata _actions) external override {
        // check length is one and action is redeem then just send the tokens
        require(
            _actions.length == 1 && _actions[0].actionType == ActionType.Redeem,
            'mock made for single type of calls'
        );
        require(redeemable[_actions[0].asset] == 1, "not redeemable");
        OpynV2OTokenLike otoken = OpynV2OTokenLike(_actions[0].asset);

        (address collateralAsset, , , , , ) = otoken.getOtokenDetails();

        require(_actions[0].amount <= ERC20Burnable(address(otoken)).balanceOf(msg.sender), 'too much redeemed');

        uint256 amountToSend =
            (_actions[0].amount / ERC20Burnable(address(otoken)).totalSupply()) *
                (balances[address(otoken)][collateralAsset]);

        require(amountToSend <= balances[address(otoken)][collateralAsset], 'not enough collateral');

        balances[address(otoken)][collateralAsset] = balances[address(otoken)][collateralAsset] - amountToSend;

        ERC20Burnable(collateralAsset).transfer(_actions[0].secondAddress, amountToSend);

        OpynV2OTokenMock(address(otoken)).burn(msg.sender, _actions[0].amount);
    }

    function getPayout(address _otoken, uint256 _amount) public view override isRedeemable(_otoken) returns (uint256) {
        (address collateralAsset, , , , , ) = OpynV2OTokenLike(_otoken).getOtokenDetails();
        return ((_amount * balances[_otoken][collateralAsset]) / (ERC20Burnable(_otoken).totalSupply()));
    }
}
