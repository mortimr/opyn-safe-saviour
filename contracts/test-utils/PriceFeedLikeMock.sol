// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

import '../interfaces/PriceFeedLike.sol';

contract PriceFeedMock is PriceFeedLike {
    address private _priceSource;

    function setPriceSource(address _psource) public {
        _priceSource = _psource;
    }

    function priceSource() public view override returns (address) {
        if (_priceSource == address(0)) {
            return address(this);
        }
        return _priceSource;
    }

    uint256 private result;
    bool private validity;

    function setResultWithValidity(uint256 _result, bool _validity) public {
        result = _result;
        validity = _validity;
    }

    function getResultWithValidity() external view override returns (uint256, bool) {
        return (result, validity);
    }
}
