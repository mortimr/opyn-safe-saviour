// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract ERC20Mock is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    function mint(address acc, uint256 am) public {
        ERC20._mint(acc, am);
    }

    function burn(address acc, uint256 am) public {
        ERC20._burn(acc, am);
    }
}
