// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

abstract contract OpynV2OTokenLike {
    function getOtokenDetails()
        external
        view
        virtual
        returns (
            address,
            address,
            address,
            uint256,
            uint256,
            bool
        );
}
