// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

abstract contract CollateralJoinLike {
    function safeEngine() public view virtual returns (address);

    function collateralType() public view virtual returns (bytes32);

    function collateral() public view virtual returns (address);

    function decimals() public view virtual returns (uint256);

    function contractEnabled() public view virtual returns (uint256);

    function join(address, uint256) external virtual;
}
