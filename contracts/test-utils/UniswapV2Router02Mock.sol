// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

import '../interfaces/UniswapV2Router02Like.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol';

contract UniswapV2Router02Mock is UniswapV2Router02Like {
    function getAmountsIn(uint256 amountOut, address[] memory path)
        public
        pure
        override
        returns (uint256[] memory amounts)
    {
        uint256[] memory returnedAmounts = new uint256[](path.length);

        for (uint256 idx = 0; idx < path.length; ++idx) {
            returnedAmounts[idx] = amountOut;
        }

        return returnedAmounts;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address,
        uint256
    ) external override returns (uint256[] memory amounts) {
        uint256[] memory returnedAmounts = new uint256[](path.length);

        for (uint256 idx = 0; idx < path.length; ++idx) {
            returnedAmounts[idx] = amountOutMin;
        }

        ERC20Burnable(path[0]).transferFrom(msg.sender, address(this), amountIn);
        ERC20Burnable(path[path.length - 1]).transfer(msg.sender, amountOutMin);

        return returnedAmounts;
    }
}
