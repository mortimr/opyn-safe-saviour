// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

abstract contract OpynV2WhitelistLike {
    function isWhitelistedOtoken(address _otoken) external view virtual returns (bool);
}
