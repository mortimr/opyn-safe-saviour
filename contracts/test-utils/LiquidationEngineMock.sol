// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

import '../interfaces/LiquidationEngineLike.sol';

contract LiquidationEngineMock is LiquidationEngineLike {
    mapping(address => uint256) public _safeSaviours;

    function toggleSafeSaviour(address saviour) public {
        _safeSaviours[saviour] = (_safeSaviours[saviour] + 1) % 2;
    }

    function safeSaviours(address safe) public view override returns (uint256) {
        return _safeSaviours[safe];
    }
}
