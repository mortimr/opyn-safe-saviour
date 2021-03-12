// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

import '../interfaces/SAFESaviourRegistryLike.sol';

contract SaviourRegistryMock is SAFESaviourRegistryLike {
    function markSave(bytes32, address) external override {
        // do nothing
    }

    function authorizeAccount(address _account, uint256 value) external {
        authorizedAccounts[_account] = value % 2;
    }
}
