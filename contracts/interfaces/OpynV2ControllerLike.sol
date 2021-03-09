// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

pragma experimental ABIEncoderV2;

enum ActionType {
    OpenVault,
    MintShortOption,
    BurnShortOption,
    DepositLongOption,
    WithdrawLongOption,
    DepositCollateral,
    WithdrawCollateral,
    SettleVault,
    Redeem,
    Call
}

struct ActionArgs {
    ActionType actionType;
    address owner;
    address secondAddress;
    address asset;
    uint256 vaultId;
    uint256 amount;
    uint256 index;
    bytes data;
}

abstract contract OpynV2ControllerLike {
    function operate(ActionArgs[] calldata _actions) external virtual;

    function getPayout(address _otoken, uint256 _amount) public view virtual returns (uint256);
}
