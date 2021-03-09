// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.7.6;

import './CollateralJoinLike.sol';
import './OracleRelayerLike.sol';
import './SAFEEngineLike.sol';
import './LiquidationEngineLike.sol';
import './PriceFeedLike.sol';
import './ERC20Like.sol';
import './GebSafeManagerLike.sol';
import './SAFESaviourRegistryLike.sol';

import '../utils/ReentrancyGuard.sol';

abstract contract SafeSaviourLike is ReentrancyGuard {
    // --- Variables ---
    LiquidationEngineLike public liquidationEngine;
    OracleRelayerLike public oracleRelayer;
    GebSafeManagerLike public safeManager;
    SAFEEngineLike public safeEngine;
    SAFESaviourRegistryLike public saviourRegistry;

    // --- Boolean Logic ---
    function both(bool x, bool y) internal pure returns (bool z) {
        assembly {
            z := and(x, y)
        }
    }

    function either(bool x, bool y) internal pure returns (bool z) {
        assembly {
            z := or(x, y)
        }
    }

    // The amount of tokens the keeper gets in exchange for the gas spent to save a SAFE
    uint256 public keeperPayout; // [wad]
    // The minimum fiat value that the keeper must get in exchange for saving a SAFE
    uint256 public minKeeperPayoutValue; // [wad]
    /*
      The proportion between the keeperPayout (if it's in collateral) and the amount of collateral that's in a SAFE to be saved.
      Alternatively, it can be the proportion between the fiat value of keeperPayout and the fiat value of the profit that a keeper
      could make if a SAFE is liquidated right now. It ensures there's no incentive to intentionally put a SAFE underwater and then
      save it just to make a profit that's greater than the one from participating in collateral auctions
    */
    uint256 public payoutToSAFESize;
    // The default collateralization ratio a SAFE should have after it's saved
    uint256 public defaultDesiredCollateralizationRatio; // [percentage]

    // Desired CRatios for each SAFE after they're saved
    mapping(bytes32 => mapping(address => uint256)) public desiredCollateralizationRatios;

    // --- Constants ---
    uint256 public constant ONE = 1;
    uint256 public constant HUNDRED = 100;
    uint256 public constant THOUSAND = 1000;
    uint256 public constant CRATIO_SCALE_DOWN = 10**25;
    uint256 public constant WAD_COMPLEMENT = 10**9;
    uint256 public constant WAD = 10**18;
    uint256 public constant RAY = 10**27;
    uint256 public constant MAX_CRATIO = 1000;
    uint256 public constant MAX_UINT = uint256(-1);

    // --- Events ---
    event SetDesiredCollateralizationRatio(
        address indexed caller,
        uint256 indexed safeID,
        address indexed safeHandler,
        uint256 cRatio
    );
    event SaveSAFE(
        address indexed keeper,
        bytes32 indexed collateralType,
        address indexed safeHandler,
        uint256 collateralAddedOrDebtRepaid
    );

    // --- Functions to Implement ---
    function saveSAFE(
        address,
        bytes32,
        address
    )
        external
        virtual
        returns (
            bool,
            uint256,
            uint256
        );

    function getKeeperPayoutValue() public virtual returns (uint256);

    function keeperPayoutExceedsMinValue() public virtual returns (bool);

    function canSave(address) external virtual returns (bool);

    function tokenAmountUsedToSave(address) public virtual returns (uint256);
}
