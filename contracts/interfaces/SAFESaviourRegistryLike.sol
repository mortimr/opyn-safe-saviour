// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

abstract contract SAFESaviourRegistryLike {
    mapping(address => uint256) public authorizedAccounts;

    function markSave(bytes32 collateralType, address safeHandler) external virtual;
}
