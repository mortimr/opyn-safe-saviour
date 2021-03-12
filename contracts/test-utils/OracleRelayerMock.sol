// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

import '../interfaces/OracleRelayerLike.sol';

contract OracleRelayerMock is OracleRelayerLike {
    // --- Data ---
    struct CollateralType {
        // Usually an oracle security module that enforces delays to fresh price feeds
        address orcl;
        // CRatio used to compute the 'safePrice' - the price used when generating debt in SAFEEngine
        uint256 safetyCRatio;
        // CRatio used to compute the 'liquidationPrice' - the price used when liquidating SAFEs
        uint256 liquidationCRatio;
    }

    // Data about each collateral type
    mapping(bytes32 => CollateralType) private _collateralTypes;

    uint256 private _redemptionPrice;

    function setCollateralType(
        bytes32 _collateral,
        address _orcl,
        uint256 _safetyCRatio,
        uint256 _liquidationCRatio
    ) public {
        _collateralTypes[_collateral] = CollateralType({
            orcl: _orcl,
            safetyCRatio: _safetyCRatio,
            liquidationCRatio: _liquidationCRatio
        });
    }

    function collateralTypes(bytes32 _collateral)
        public
        view
        override
        returns (
            address,
            uint256,
            uint256
        )
    {
        CollateralType memory ct = _collateralTypes[_collateral];
        return (ct.orcl, ct.safetyCRatio, ct.liquidationCRatio);
    }

    function liquidationCRatio(bytes32 collateralType) public view override returns (uint256) {
        return _collateralTypes[collateralType].liquidationCRatio;
    }

    function setRedemptionPrice(uint256 __redemptionPrice) public {
        _redemptionPrice = __redemptionPrice;
    }

    function redemptionPrice() public view override returns (uint256) {
        return _redemptionPrice;
    }
}
