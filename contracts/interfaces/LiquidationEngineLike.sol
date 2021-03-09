// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

abstract contract LiquidationEngineLike {
    function safeSaviours(address) public view virtual returns (uint256);
}
