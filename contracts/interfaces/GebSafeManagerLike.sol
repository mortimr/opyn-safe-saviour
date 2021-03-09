// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

abstract contract GebSafeManagerLike {
    function safes(uint256) public view virtual returns (address);

    function ownsSAFE(uint256) public view virtual returns (address);

    function safeCan(
        address,
        uint256,
        address
    ) public view virtual returns (uint256);
}
