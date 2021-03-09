// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

abstract contract SAFEEngineLike {
    function safeRights(address, address) public view virtual returns (uint256);

    function collateralTypes(bytes32)
        public
        view
        virtual
        returns (
            uint256 debtAmount, // [wad]
            uint256 accumulatedRate, // [ray]
            uint256 safetyPrice, // [ray]
            uint256 debtCeiling, // [rad]
            uint256 debtFloor, // [rad]
            uint256 liquidationPrice // [ray]
        );

    function safes(bytes32, address)
        public
        view
        virtual
        returns (
            uint256 lockedCollateral, // [wad]
            uint256 generatedDebt // [wad]
        );

    function modifySAFECollateralization(
        bytes32 collateralType,
        address safe,
        address collateralSource,
        address debtDestination,
        int256 deltaCollateral, // [wad]
        int256 deltaDebt // [wad]
    ) external virtual;
}
