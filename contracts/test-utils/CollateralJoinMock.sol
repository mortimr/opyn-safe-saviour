// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

import '../interfaces/CollateralJoinLike.sol';

contract CollateralJoinMock is CollateralJoinLike {
    address private _safeEngine;
    bytes32 private _collateralType;
    address private _collateral;
    uint256 private _decimals;
    uint256 private _contractEnabled;

    constructor(
        address __safeEngine,
        bytes32 __collateralType,
        address __collateral,
        uint256 __decimals,
        uint256 __contractEnabled
    ) {
        _safeEngine = __safeEngine;
        _collateralType = __collateralType;
        _collateral = __collateral;
        _decimals = __decimals;
        _contractEnabled = __contractEnabled;
    }

    function safeEngine() public view override returns (address) {
        return _safeEngine;
    }

    function collateralType() public view override returns (bytes32) {
        return _collateralType;
    }

    function collateral() public view override returns (address) {
        return _collateral;
    }

    function decimals() public view override returns (uint256) {
        return _decimals;
    }

    function contractEnabled() public view override returns (uint256) {
        return _contractEnabled;
    }

    function join(address owner, uint256 amount) external override {
        // well guess it does nothing special during tests
    }
}
