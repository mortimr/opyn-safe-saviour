// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

abstract contract ERC20Like {
    uint256 public totalSupply;

    function balanceOf(address guy) public virtual returns (uint256);

    function approve(address guy, uint256 wad) public virtual returns (bool);

    function transfer(address dst, uint256 wad) public virtual returns (bool);

    function transferFrom(
        address src,
        address dst,
        uint256 wad
    ) public virtual returns (bool);
}
