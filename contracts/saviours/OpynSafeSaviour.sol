// Copyright (C) 2020 Reflexer Labs, INC

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

// SPDX-License-Identifier: MIT
pragma solidity >=0.6.7 <=0.8.2;

import '../interfaces/SafeSaviourLike.sol';
import './OpynSafeSaviourOperator.sol';
import '../math/SafeMath.sol';

contract OpynSafeSaviour is SafeMath, SafeSaviourLike {
    // --- Variables ---
    // Amount of collateral deposited to cover each SAFE
    mapping(address => uint256) public oTokenCover;
    // oToken type selected by each SAFE
    mapping(address => address) public oTokenSelection;
    // The collateral join contract for adding collateral in the system
    CollateralJoinLike public collateralJoin;
    // The collateral token
    ERC20Like public collateralToken;
    // Operator handling all the Opyn logic
    OpynSafeSaviourOperator public opynSafeSaviourOperator;

    // Checks whether a saviour contract has been approved by governance in the LiquidationEngine
    modifier liquidationEngineApproved(address saviour) {
        require(liquidationEngine.safeSaviours(saviour) == 1, 'SafeSaviour/not-approved-in-liquidation-engine');
        _;
    }
    // Checks whether someone controls a safe handler inside the GebSafeManager
    modifier controlsSAFE(address owner, uint256 safeID) {
        require(owner != address(0), 'SafeSaviour/null-owner');
        require(
            either(
                owner == safeManager.ownsSAFE(safeID),
                safeManager.safeCan(safeManager.ownsSAFE(safeID), safeID, owner) == 1
            ),
            'SafeSaviour/not-owning-safe'
        );

        _;
    }

    // --- Events ---
    event Deposit(address indexed caller, address indexed safeHandler, uint256 amount);
    event Withdraw(address indexed caller, uint256 indexed safeID, address indexed safeHandler, uint256 amount);

    constructor(
        address _collateralJoin,
        address _liquidationEngine,
        address _oracleRelayer,
        address _safeManager,
        address _saviourRegistry,
        address _opynSafeSaviourOperator,
        uint256 _keeperPayout,
        uint256 _minKeeperPayoutValue,
        uint256 _payoutToSAFESize,
        uint256 _defaultDesiredCollateralizationRatio
    ) {
        require(_collateralJoin != address(0), 'OpynSafeSaviour/null-collateral-join');
        require(_liquidationEngine != address(0), 'OpynSafeSaviour/null-liquidation-engine');
        require(_oracleRelayer != address(0), 'OpynSafeSaviour/null-oracle-relayer');
        require(_safeManager != address(0), 'OpynSafeSaviour/null-safe-manager');
        require(_saviourRegistry != address(0), 'OpynSafeSaviour/null-saviour-registry');
        require(_opynSafeSaviourOperator != address(0), 'OpynSafeSaviour/null-opyn-safe-saviour-operator');
        require(_keeperPayout > 0, 'OpynSafeSaviour/invalid-keeper-payout');
        require(_minKeeperPayoutValue > 0, 'OpynSafeSaviour/invalid-min-payout-value');
        require(_payoutToSAFESize > 1, 'OpynSafeSaviour/invalid-payout-to-safe-size');
        require(_defaultDesiredCollateralizationRatio > 0, 'OpynSafeSaviour/null-default-cratio');

        keeperPayout = _keeperPayout;
        payoutToSAFESize = _payoutToSAFESize;
        minKeeperPayoutValue = _minKeeperPayoutValue;

        liquidationEngine = LiquidationEngineLike(_liquidationEngine);
        collateralJoin = CollateralJoinLike(_collateralJoin);
        oracleRelayer = OracleRelayerLike(_oracleRelayer);
        safeEngine = SAFEEngineLike(collateralJoin.safeEngine());
        safeManager = GebSafeManagerLike(_safeManager);
        saviourRegistry = SAFESaviourRegistryLike(_saviourRegistry);
        collateralToken = ERC20Like(collateralJoin.collateral());
        opynSafeSaviourOperator = OpynSafeSaviourOperator(_opynSafeSaviourOperator);

        require(address(safeEngine) != address(0), 'OpynSafeSaviour/null-safe-engine');

        uint256 scaledLiquidationRatio =
            oracleRelayer.liquidationCRatio(collateralJoin.collateralType()) / CRATIO_SCALE_DOWN;
        require(scaledLiquidationRatio > 0, 'OpynSafeSaviour/invalid-scaled-liq-ratio');
        require(
            both(
                _defaultDesiredCollateralizationRatio > scaledLiquidationRatio,
                _defaultDesiredCollateralizationRatio <= MAX_CRATIO
            ),
            'OpynSafeSaviour/invalid-default-desired-cratio'
        );

        require(collateralJoin.decimals() == 18, 'OpynSafeSaviour/invalid-join-decimals');
        require(collateralJoin.contractEnabled() == 1, 'OpynSafeSaviour/join-disabled');

        defaultDesiredCollateralizationRatio = _defaultDesiredCollateralizationRatio;
    }

    // --- Adding/Withdrawing Cover ---
    /*
     * @notice Deposit oToken in the contract in order to provide cover for a specific SAFE controlled by the SAFE Manager
     * @param safeID The ID of the SAFE to protect. This ID should be registered inside GebSafeManager
     * @param oTokenAmount The amount of oToken to deposit
     * @param oTokenType the address of the erc20 contract controlling the oTokens
     */
    function deposit(
        uint256 _safeID,
        uint256 _oTokenAmount,
        address _oTokenType
    ) external liquidationEngineApproved(address(this)) controlsSAFE(msg.sender, _safeID) nonReentrant {
        require(_oTokenAmount > 0, 'OpynSafeSaviour/null-oToken-amount');
        // Check that oToken has been whitelisted by a SaviourRegistry authorized account
        require(opynSafeSaviourOperator.oTokenWhitelist(_oTokenType) == true, 'OpynSafeSaviour/forbidden-otoken');

        // Check that the SAFE exists inside GebSafeManager
        address safeHandler = safeManager.safes(_safeID);
        require(safeHandler != address(0), 'OpynSafeSaviour/null-handler');

        // Check that safe is either protected by provided oToken type or no type at all
        require(
            either(oTokenSelection[safeHandler] == _oTokenType, oTokenSelection[safeHandler] == address(0)),
            'OpynSafeSaviour/safe-otoken-incompatibility'
        );

        // Check that the SAFE has debt
        (, uint256 safeDebt) =
            SAFEEngineLike(collateralJoin.safeEngine()).safes(collateralJoin.collateralType(), safeHandler);
        require(safeDebt > 0, 'OpynSafeSaviour/safe-does-not-have-debt');

        // Trigger transfer from oToken contract
        require(
            ERC20Like(_oTokenType).transferFrom(msg.sender, address(this), _oTokenAmount),
            'OpynSafeSaviour/could-not-transfer-collateralToken'
        );
        // Update the collateralToken balance used to cover the SAFE and transfer collateralToken to this contract
        oTokenCover[safeHandler] = add(oTokenCover[safeHandler], _oTokenAmount);

        // Check if SAFE oToken selection should be changed
        if (oTokenSelection[safeHandler] == address(0)) {
            oTokenSelection[safeHandler] = _oTokenType;
        }

        emit Deposit(msg.sender, safeHandler, _oTokenAmount);
    }

    /*
     * @notice Withdraw oToken from the contract and provide less cover for a SAFE
     * @dev Only an address that controls the SAFE inside GebSafeManager can call this
     * @param safeID The ID of the SAFE to remove cover from. This ID should be registered inside GebSafeManager
     * @param oTokenAmount The amount of oToken to withdraw
     */
    function withdraw(uint256 _safeID, uint256 _oTokenAmount) external controlsSAFE(msg.sender, _safeID) nonReentrant {
        require(_oTokenAmount > 0, 'OpynSafeSaviour/null-collateralToken-amount');

        // Fetch the handler from the SAFE manager
        address safeHandler = safeManager.safes(_safeID);
        require(oTokenCover[safeHandler] >= _oTokenAmount, 'OpynSafeSaviour/not-enough-to-withdraw');

        // Withdraw cover and transfer collateralToken to the caller
        oTokenCover[safeHandler] = sub(oTokenCover[safeHandler], _oTokenAmount);
        ERC20Like(oTokenSelection[safeHandler]).transfer(msg.sender, _oTokenAmount);

        // Check if balance of selected token
        if (oTokenCover[safeHandler] == 0) {
            oTokenSelection[safeHandler] = address(0);
        }

        emit Withdraw(msg.sender, _safeID, safeHandler, _oTokenAmount);
    }

    // --- Adjust Cover Preferences ---
    /*
     * @notice Sets the collateralization ratio that a SAFE should have after it's saved
     * @dev Only an address that controls the SAFE inside GebSafeManager can call this
     * @param safeID The ID of the SAFE to set the desired CRatio for. This ID should be registered inside GebSafeManager
     * @param cRatio The collateralization ratio to set
     */
    function setDesiredCollateralizationRatio(uint256 _safeID, uint256 _cRatio)
        external
        controlsSAFE(msg.sender, _safeID)
    {
        uint256 scaledLiquidationRatio =
            oracleRelayer.liquidationCRatio(collateralJoin.collateralType()) / CRATIO_SCALE_DOWN;
        address safeHandler = safeManager.safes(_safeID);

        require(scaledLiquidationRatio > 0, 'OpynSafeSaviour/invalid-scaled-liq-ratio');
        require(scaledLiquidationRatio < _cRatio, 'OpynSafeSaviour/invalid-desired-cratio');
        require(_cRatio <= MAX_CRATIO, 'OpynSafeSaviour/exceeds-max-cratio');

        desiredCollateralizationRatios[collateralJoin.collateralType()][safeHandler] = _cRatio;

        emit SetDesiredCollateralizationRatio(msg.sender, _safeID, safeHandler, _cRatio);
    }

    // --- Saving Logic ---
    /*
     * @notice Saves a SAFE by adding more collateralToken into it
     * @dev Only the LiquidationEngine can call this
     * @param keeper The keeper that called LiquidationEngine.liquidateSAFE and that should be rewarded for spending gas to save a SAFE
     * @param collateralType The collateral type backing the SAFE that's being liquidated
     * @param safeHandler The handler of the SAFE that's being saved
     * @return Whether the SAFE has been saved, the amount of collateralToken added in the SAFE as well as the amount of
     *         collateralToken sent to the keeper as their payment
     */
    function saveSAFE(
        address _keeper,
        bytes32 _collateralType,
        address _safeHandler
    )
        external
        override
        returns (
            bool,
            uint256,
            uint256
        )
    {
        require(address(liquidationEngine) == msg.sender, 'OpynSafeSaviour/caller-not-liquidation-engine');
        require(_keeper != address(0), 'OpynSafeSaviour/null-keeper-address');

        if (both(both(_collateralType == '', _safeHandler == address(0)), _keeper == address(liquidationEngine))) {
            return (true, MAX_UINT, MAX_UINT);
        }

        require(_collateralType == collateralJoin.collateralType(), 'OpynSafeSaviour/invalid-collateral-type');
        require(oTokenSelection[_safeHandler] != address(0), 'OpynSafeSaviour/no-selected-otoken');

        // Check that the fiat value of the keeper payout is high enough
        require(keeperPayoutExceedsMinValue(), 'OpynSafeSaviour/small-keeper-payout-value');

        // Compute the amount of collateral that should be added to bring the safe to desired collateral ratio
        uint256 tokenAmountUsed = tokenAmountUsedToSave(_safeHandler);

        {
            // Stack too deep guard

            // Check that the amount of collateral locked in the safe is bigger than the keeper's payout
            (uint256 safeLockedCollateral, ) =
                SAFEEngineLike(collateralJoin.safeEngine()).safes(collateralJoin.collateralType(), _safeHandler);
            require(safeLockedCollateral >= mul(keeperPayout, payoutToSAFESize), 'OpynSafeSaviour/tiny-safe');
        }

        // Compute and check the validity of the amount of collateralToken used to save the SAFE
        require(both(tokenAmountUsed != MAX_UINT, tokenAmountUsed != 0), 'OpynSafeSaviour/invalid-tokens-used-to-save');

        // The actual required collateral to provide is the sum of what is needed to bring the safe to its desired collateral ratio + the keeper reward
        uint256 requiredTokenAmount = add(keeperPayout, tokenAmountUsed);

        uint256 oTokenToApprove =
            opynSafeSaviourOperator.getOTokenAmountToApprove(
                oTokenSelection[_safeHandler],
                requiredTokenAmount,
                address(collateralToken)
            );

        require(oTokenCover[_safeHandler] >= oTokenToApprove, 'OpynSafeSaviour/otoken-balance-too-low');

        ERC20Like(oTokenSelection[_safeHandler]).approve(address(opynSafeSaviourOperator), oTokenToApprove);

        uint256 initialAmount = collateralToken.balanceOf(address(this));

        opynSafeSaviourOperator.redeemAndSwapOTokens(
            oTokenSelection[_safeHandler],
            oTokenToApprove,
            requiredTokenAmount,
            address(collateralToken)
        );

        uint256 receivedCollateralAmount = sub(collateralToken.balanceOf(address(this)), initialAmount);
        oTokenCover[_safeHandler] = sub(oTokenCover[_safeHandler], oTokenToApprove);

        // Check that balance has increased of at least required amount
        // This should never get triggered but is the ultimate check to ensure that the Safe Saviour Operator did its job properly
        require(
            receivedCollateralAmount >= requiredTokenAmount,
            'OpynSafeSaviour/not-enough-otoken-collateral-swapped'
        );

        saviourRegistry.markSave(_collateralType, _safeHandler);

        // Approve collateralToken to the collateral join contract
        collateralToken.approve(address(collateralJoin), 0);
        collateralToken.approve(address(collateralJoin), tokenAmountUsed);

        // Join collateralToken in the system and add it in the saved SAFE
        collateralJoin.join(address(this), tokenAmountUsed);
        safeEngine.modifySAFECollateralization(
            collateralJoin.collateralType(),
            _safeHandler,
            address(this),
            address(0),
            int256(tokenAmountUsed),
            int256(0)
        );

        // Send the fee to the keeper, the prize is recomputed to prevent dust
        collateralToken.transfer(_keeper, sub(receivedCollateralAmount, tokenAmountUsed));

        // Emit an event
        emit SaveSAFE(_keeper, _collateralType, _safeHandler, tokenAmountUsed);

        return (true, tokenAmountUsed, keeperPayout);
    }

    // --- Getters ---
    /*
     * @notice Compute whether the value of keeperPayout collateralToken is higher than or equal to minKeeperPayoutValue
     * @dev Used to determine whether it's worth it for the keeper to save the SAFE in exchange for keeperPayout collateralToken
     * @return A bool representing whether the value of keeperPayout collateralToken is >= minKeeperPayoutValue
     */
    function keeperPayoutExceedsMinValue() public view override returns (bool) {
        (address ethFSM, , ) = oracleRelayer.collateralTypes(collateralJoin.collateralType());
        (uint256 priceFeedValue, bool hasValidValue) =
            PriceFeedLike(PriceFeedLike(ethFSM).priceSource()).getResultWithValidity();

        if (either(!hasValidValue, priceFeedValue == 0)) {
            return false;
        }

        return (minKeeperPayoutValue <= mul(keeperPayout, priceFeedValue) / WAD);
    }

    /*
     * @notice Return the current value of the keeper payout
     */
    function getKeeperPayoutValue() public view override returns (uint256) {
        (address ethFSM, , ) = oracleRelayer.collateralTypes(collateralJoin.collateralType());
        (uint256 priceFeedValue, bool hasValidValue) =
            PriceFeedLike(PriceFeedLike(ethFSM).priceSource()).getResultWithValidity();

        if (either(!hasValidValue, priceFeedValue == 0)) {
            return 0;
        }

        return mul(keeperPayout, priceFeedValue) / WAD;
    }

    /*
     * @notice Determine whether a SAFE can be saved with the current amount of collateralToken deposited as cover for it
     * @param safeHandler The handler of the SAFE which the function takes into account
     * @return Whether the SAFE can be saved or not
     */
    function canSave(address _safeHandler) external override returns (bool) {
        uint256 tokenAmountUsed = tokenAmountUsedToSave(_safeHandler);

        if (tokenAmountUsed == MAX_UINT) {
            return false;
        }

        // Check if oToken balance is not empty
        if (oTokenCover[_safeHandler] == 0) {
            return false;
        }

        // Check that the fiat value of the keeper payout is high enough
        if (keeperPayoutExceedsMinValue() == false) {
            return false;
        }

        // check if safe too small to be saved
        (uint256 safeLockedCollateral, ) =
            SAFEEngineLike(collateralJoin.safeEngine()).safes(collateralJoin.collateralType(), _safeHandler);
        if (safeLockedCollateral < mul(keeperPayout, payoutToSAFESize)) {
            return false;
        }

        uint256 oTokenToApprove =
            opynSafeSaviourOperator.getOTokenAmountToApprove(
                oTokenSelection[_safeHandler],
                add(tokenAmountUsed, keeperPayout),
                address(collateralToken)
            );

        // Check that owned oTokens are able to redeem enough collateral to save SAFE
        return (oTokenToApprove <= oTokenCover[_safeHandler]);
    }

    /*
     * @notice Calculate the amount of collateralToken used to save a SAFE and bring its CRatio to the desired level
     * @param safeHandler The handler of the SAFE which the function takes into account
     * @return The amount of collateralToken used to save the SAFE and bring its CRatio to the desired level
     */
    function tokenAmountUsedToSave(address _safeHandler) public override returns (uint256 tokenAmountUsed) {
        (uint256 depositedcollateralToken, uint256 safeDebt) =
            SAFEEngineLike(collateralJoin.safeEngine()).safes(collateralJoin.collateralType(), _safeHandler);
        (address ethFSM, , ) = oracleRelayer.collateralTypes(collateralJoin.collateralType());
        (uint256 priceFeedValue, bool hasValidValue) = PriceFeedLike(ethFSM).getResultWithValidity();

        // If the SAFE doesn't have debt or if the price feed is faulty, abort
        if (either(safeDebt == 0, either(priceFeedValue == 0, !hasValidValue))) {
            tokenAmountUsed = MAX_UINT;
            return tokenAmountUsed;
        }

        // Calculate the value of the debt equivalent to the value of the collateralToken that would need to be in the SAFE after it's saved
        uint256 targetCRatio =
            (desiredCollateralizationRatios[collateralJoin.collateralType()][_safeHandler] == 0)
                ? defaultDesiredCollateralizationRatio
                : desiredCollateralizationRatios[collateralJoin.collateralType()][_safeHandler];
        uint256 scaledDownDebtValue =
            mul(add(mul(oracleRelayer.redemptionPrice(), safeDebt) / RAY, ONE), targetCRatio) / HUNDRED;

        // Compute the amount of collateralToken the SAFE needs to get to the desired CRatio
        uint256 collateralTokenAmountNeeded = mul(scaledDownDebtValue, WAD) / priceFeedValue;

        // If the amount of collateralToken needed is lower than the amount that's currently in the SAFE, return 0
        if (collateralTokenAmountNeeded <= depositedcollateralToken) {
            return 0;
        } else {
            // Otherwise return the delta
            return sub(collateralTokenAmountNeeded, depositedcollateralToken);
        }
    }
}
