// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

import '../interfaces/SafeSaviourLike.sol';

contract Asserter {
    function testCanSave(
        address saviour,
        address safeHandler,
        bool expectedValue
    ) public {
        require(SafeSaviourLike(saviour).canSave(safeHandler) == expectedValue, 'expected value not received');
    }

    function testTokenAmountUsedToSave(
        address saviour,
        address safeHandler,
        uint256 expectedValue
    ) public {
        require(
            SafeSaviourLike(saviour).tokenAmountUsedToSave(safeHandler) == expectedValue,
            'expected value not received'
        );
    }
}
