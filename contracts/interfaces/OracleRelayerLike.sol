// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

abstract contract OracleRelayerLike {
    function collateralTypes(bytes32)
        public
        view
        virtual
        returns (
            address,
            uint256,
            uint256
        );

    function liquidationCRatio(bytes32) public view virtual returns (uint256);

    function redemptionPrice() public virtual returns (uint256);
}
