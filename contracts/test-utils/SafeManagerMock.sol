// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

import '../interfaces/GebSafeManagerLike.sol';

contract SafeManagerMock is GebSafeManagerLike {
    mapping(uint256 => address) private _safes;
    mapping(uint256 => address) private _owners;

    function setSafe(
        uint256 _id,
        address _handler,
        address _owner
    ) public {
        _safes[_id] = _handler;
        _owners[_id] = _owner;
    }

    function safes(uint256 id) public view override returns (address) {
        return _safes[id];
    }

    function ownsSAFE(uint256 id) public view override returns (address) {
        return _owners[id];
    }

    mapping(address => mapping(uint256 => mapping(address => uint256))) private _safeCan;

    function toggleSafeCan(
        address owner,
        uint256 id,
        address allowed
    ) public {
        _safeCan[owner][id][allowed] = (_safeCan[owner][id][allowed] + 1) % 2;
    }

    function safeCan(
        address owner,
        uint256 id,
        address allowed
    ) public view override returns (uint256) {
        return _safeCan[owner][id][allowed];
    }
}
