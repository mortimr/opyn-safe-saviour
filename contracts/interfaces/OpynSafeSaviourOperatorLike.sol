// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

abstract contract OpynSafeSaviourOperatorLike {
    function isWhitelistedOtoken(address _otoken) external view virtual returns (bool);

    function isOTokenPutOption(address _otoken) external view virtual returns (bool);

    function getOpynPayout(address _otoken, uint256 _amount) public view virtual returns (uint256);

    function getOTokenAmountToApprove(
        address oToken,
        uint256 requiredOutputAmount,
        address safeCollateralAddress
    ) external view virtual returns (uint256);
}
