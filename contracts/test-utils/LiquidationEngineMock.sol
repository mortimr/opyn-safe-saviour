// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

import '../interfaces/LiquidationEngineLike.sol';
import '../interfaces/SafeSaviourLike.sol';

contract LiquidationEngineMock is LiquidationEngineLike {
    mapping(address => uint256) public _safeSaviours;

    function toggleSafeSaviour(address saviour) public {
        _safeSaviours[saviour] = (_safeSaviours[saviour] + 1) % 2;
    }

    function safeSaviours(address safe) public view override returns (uint256) {
        return _safeSaviours[safe];
    }

    function fakeLiquidateSAFE(
        address keeper,
        bytes32 collateralType,
        address safe,
        address saviour
    )
        public
        returns (
            bool,
            uint256,
            uint256
        )
    {
        return SafeSaviourLike(saviour).saveSAFE(keeper, collateralType, safe);
    }

    function fakeInitCall(address saviour) public {
        (bool status, uint256 collateralAdded, uint256 keeperPayout) =
            SafeSaviourLike(saviour).saveSAFE(address(this), '', address(0));
        require(status == true, 'invalid status');
        require(collateralAdded == uint256(-1), 'invalid collateral added');
        require(keeperPayout == uint256(-1), 'invalid keeper payout');
    }
}
