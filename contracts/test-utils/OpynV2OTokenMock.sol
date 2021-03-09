// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

import '../interfaces/OpynV2OTokenLike.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol';

contract OpynV2OTokenMock is OpynV2OTokenLike, ERC20Burnable {
    address public controller;
    address public collateralAsset;
    address public underlyingAsset;
    address public strikeAsset;
    uint256 public strikePrice;
    uint256 public expiryTimestamp;
    bool public isPut;
    address public owner;

    constructor(
        address _collateralAsset,
        address _underlyingAddress,
        address _strikeAsset,
        uint256 _strikePrice,
        uint256 _expiryTimestamp,
        bool _isPut
    ) ERC20('oToken-TEST', 'OTEST') {
        collateralAsset = _collateralAsset;
        underlyingAsset = _underlyingAddress;
        strikeAsset = _strikeAsset;
        strikePrice = _strikePrice;
        expiryTimestamp = _expiryTimestamp;
        isPut = _isPut;
        owner = msg.sender;
    }

    modifier ownerOnly() {
        require(owner == msg.sender, 'not owner');
        _;
    }

    function mint(address acc, uint256 am) public {
        ERC20._mint(acc, am);
    }

    function burn(address acc, uint256 am) public {
        ERC20._burn(acc, am);
    }

    function setCollateralAsset(address _collateralAsset) external ownerOnly {
        collateralAsset = _collateralAsset;
    }

    function setUnderlyingAsset(address _underlyingAsset) external ownerOnly {
        underlyingAsset = _underlyingAsset;
    }

    function setStrikeAsset(address _strikeAsset) public ownerOnly {
        strikeAsset = _strikeAsset;
    }

    function setStrikePrice(uint256 _strikePrice) public ownerOnly {
        strikePrice = _strikePrice;
    }

    function setExpiryTimestamp(uint256 _expiryTimestamp) public ownerOnly {
        expiryTimestamp = _expiryTimestamp;
    }

    function setPut(bool _isPut) public ownerOnly {
        isPut = _isPut;
    }

    function getOtokenDetails()
        external
        view
        override
        returns (
            address,
            address,
            address,
            uint256,
            uint256,
            bool
        )
    {
        return (collateralAsset, underlyingAsset, strikeAsset, strikePrice, expiryTimestamp, isPut);
    }
}
