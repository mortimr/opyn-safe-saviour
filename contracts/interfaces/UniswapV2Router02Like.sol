// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

abstract contract UniswapV2Router02Like {
    function getAmountsIn(uint256 amountOut, address[] memory path)
        public
        view
        virtual
        returns (uint256[] memory amounts);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external virtual returns (uint256[] memory amounts);
}
