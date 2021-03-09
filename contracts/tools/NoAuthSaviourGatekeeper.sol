// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

abstract contract LiquidationEngineLike {
    function connectSAFESaviour(address) external virtual;

    function disconnectSAFESaviour(address) external virtual;
}

abstract contract SAFESaviourRegistryLike {
    function toggleSaviour(address) external virtual;
}

contract NoAuthSaviourGateKeeper {
    LiquidationEngineLike public liquidationEngine;
    SAFESaviourRegistryLike public registry;

    constructor(address liquidationEngine_, address registry_) {
        require(liquidationEngine_ != address(0), 'NoAuthSaviourGateKeeper/null-liquidation-engine');
        require(registry_ != address(0), 'NoAuthSaviourGateKeeper/null-registry');
        liquidationEngine = LiquidationEngineLike(liquidationEngine_);
        registry = SAFESaviourRegistryLike(registry_);
    }

    // --- Liquidation Engine Auth ---
    function connectSAFESaviour(address saviour) external {
        liquidationEngine.connectSAFESaviour(saviour);
    }

    function disconnectSAFESaviour(address saviour) external {
        liquidationEngine.disconnectSAFESaviour(saviour);
    }

    // --- Saviour Registry Auth ---
    function toggleSaviour(address saviour) external {
        registry.toggleSaviour(saviour);
    }
}
