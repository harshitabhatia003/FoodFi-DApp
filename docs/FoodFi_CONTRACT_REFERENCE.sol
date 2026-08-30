// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FoodFi
 * @dev Decentralized food-waste reduction and rewards platform
 * 
 * Functionality:
 * - Record food savings by participants
 * - Track participant statistics (food saved, rewards earned, participation count)
 * - Manage reward rates
 * - Handle token-based rewards (FOODToken)
 * 
 * For Use In: College Practical Record
 * Subject: Blockchain Development
 * Experiment: Integrating MetaMask and WalletConnect in DApps
 */

// Standard ERC20 interface for FOODToken interaction
interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract FoodFi {
    // ============================================
    // STATE VARIABLES
    // ============================================

    // Reference to FOODToken contract
    IERC20 public foodToken;

    // Reward rate: FOOD tokens per kg of food saved
    uint256 public rewardRate = 1;

    // Participant statistics structure
    struct ParticipantStats {
        uint256 foodSavedKg;           // Total kg of food saved
        uint256 rewardsEarned;         // Total rewards earned in FOOD tokens
        uint256 participationCount;    // Number of times participated
    }

    // Mapping: Address → Participant Statistics
    mapping(address => ParticipantStats) public participantStats;

    // ============================================
    // EVENTS
    // ============================================

    /**
     * @dev Emitted when food saving is recorded
     * @param participant Address of participant
     * @param foodSavedKg Amount of food saved in kg
     * @param rewardsEarned Rewards calculated for this action
     */
    event FoodSavingRecorded(
        address indexed participant,
        uint256 foodSavedKg,
        uint256 rewardsEarned
    );

    /**
     * @dev Emitted when reward rate is updated
     * @param newRate New reward rate
     */
    event RewardRateUpdated(uint256 newRate);

    /**
     * @dev Emitted when rewards are deposited
     * @param depositor Address depositing rewards
     * @param amount Amount of tokens deposited
     */
    event RewardsDeposited(address indexed depositor, uint256 amount);

    // ============================================
    // CONSTRUCTOR
    // ============================================

    /**
     * @dev Initialize FoodFi contract with FOODToken address
     * @param _foodTokenAddress Address of deployed FOODToken contract
     * 
     * Usage:
     * 1. Deploy FOODToken first
     * 2. Copy its address
     * 3. Deploy FoodFi with FOODToken address as parameter
     * 4. Example: FoodFi(0x59557588fFaF93caDdb5AaEDD754dDfbfB6Bf1CA)
     */
    constructor(address _foodTokenAddress) {
        require(
            _foodTokenAddress != address(0),
            "Invalid FOODToken address"
        );
        foodToken = IERC20(_foodTokenAddress);
    }

    // ============================================
    // CORE FUNCTIONS
    // ============================================

    /**
     * @dev Record food saving for a participant
     * 
     * This function:
     * 1. Validates input (must save > 0 kg)
     * 2. Updates participant statistics
     * 3. Calculates and adds rewards
     * 4. Increments participation count
     * 5. Emits event for logging
     *
     * Called By: React DApp via Ethers.js
     * Requires: Participant address and food amount in kg
     * Gas Cost: ~50,000 gas
     * 
     * @param participant Address of participant
     * @param foodSavedKg Amount of food saved (in kg)
     * 
     * Example:
     * recordFoodSaving(0xUserAddress, 5)  // User saved 5 kg
     * 
     * Expected Behavior:
     * - foodSavedKg: 5 (added to total)
     * - rewardsEarned: 5 FOOD (1 FOOD per kg * 5)
     * - participationCount: 1 (first time)
     */
    function recordFoodSaving(address participant, uint256 foodSavedKg) external {
        require(
            participant != address(0),
            "Invalid participant address"
        );
        require(
            foodSavedKg > 0,
            "Must save at least 1 kg"
        );

        // Calculate rewards
        uint256 rewardsToAdd = foodSavedKg * rewardRate;

        // Update participant statistics
        participantStats[participant].foodSavedKg += foodSavedKg;
        participantStats[participant].rewardsEarned += rewardsToAdd;
        participantStats[participant].participationCount += 1;

        // Emit event for blockchain logging
        emit FoodSavingRecorded(participant, foodSavedKg, rewardsToAdd);
    }

    // ============================================
    // READ FUNCTIONS (View/Pure - No Gas Cost)
    // ============================================

    /**
     * @dev Get participant statistics
     * 
     * Called By: React DApp to display user stats
     * Gas Cost: Free (view function)
     * 
     * @param participant Address to query
     * @return ParticipantStats struct containing:
     *   - foodSavedKg: Total kg saved
     *   - rewardsEarned: Total rewards earned
     *   - participationCount: Times participated
     * 
     * Example:
     * (uint256 foodKg, uint256 rewards, uint256 count) = 
     *     getParticipantStats(0xUserAddress)
     * // Returns: (5, 5000000000000000000, 1)
     * // After parsing: (5, 5, 1)
     */
    function getParticipantStats(address participant)
        external
        view
        returns (ParticipantStats memory)
    {
        return participantStats[participant];
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @dev Set new reward rate
     * 
     * Reward Rate Meaning:
     * - Rate = 1 → 1 FOOD per kg saved
     * - Rate = 2 → 2 FOOD per kg saved
     * - Rate = 10 → 10 FOOD per kg saved
     * 
     * Called By: Contract owner/admin
     * Note: In production, should have access control (onlyOwner)
     * 
     * @param _rate New reward rate (FOOD tokens per kg)
     * 
     * Example:
     * setRewardRate(2)  // Increase to 2 FOOD per kg
     */
    function setRewardRate(uint256 _rate) external {
        require(_rate > 0, "Reward rate must be positive");
        rewardRate = _rate;
        emit RewardRateUpdated(_rate);
    }

    /**
     * @dev Deposit rewards into contract
     * 
     * Prerequisite:
     * 1. Caller must approve FOODToken transfer: 
     *    foodToken.approve(foodFiAddress, amount)
     * 2. Caller must have sufficient FOOD tokens
     * 
     * Called By: Admin depositing reward pool
     * 
     * @param amount Amount of FOOD tokens to deposit (in wei)
     * 
     * Example:
     * // First approve in Remix:
     * // FOODToken → approve(FoodFiAddress, 1000000000000000000)
     * 
     * // Then deposit:
     * depositRewards(1000000000000000000)  // 1 FOOD token
     */
    function depositRewards(uint256 amount) external {
        require(amount > 0, "Deposit amount must be positive");

        // Transfer tokens from caller to contract
        bool success = foodToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Token transfer failed");

        emit RewardsDeposited(msg.sender, amount);
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    /**
     * @dev Get contract's FOODToken balance
     * Shows how many tokens are available for rewards
     */
    function getContractTokenBalance() external view returns (uint256) {
        return foodToken.balanceOf(address(this));
    }
}

/**
 * ============================================
 * DEPLOYMENT STEPS FOR REMIX
 * ============================================
 * 
 * 1. Open Remix: https://remix.ethereum.org/
 * 
 * 2. Create new file "FoodFi.sol"
 * 
 * 3. Paste this entire contract code
 * 
 * 4. Compiler Settings:
 *    - Language: Solidity
 *    - Version: 0.8.20+commit...
 *    - EVM Version: Leave default
 * 
 * 5. Click "Compile FoodFi.sol"
 *    - Should succeed (blue button)
 * 
 * 6. Deploy & Run Transactions:
 *    - Environment: "Injected Provider - MetaMask"
 *    - MetaMask: "Connect" when prompted
 *    - Contract: "FoodFi"
 *    - Constructor parameter: [FOODToken Address]
 *      Example: 0x59557588fFaF93caDdb5AaEDD754dDfbfB6Bf1CA
 *    - Click "Deploy"
 * 
 * 7. MetaMask confirms transaction
 * 
 * 8. Deployed contract appears in "Deployed Contracts"
 *    - Copy the FoodFi address
 *    - Paste into src/config/contracts.js
 * 
 * ============================================
 * VERIFICATION STEPS IN REMIX
 * ============================================
 * 
 * After deployment, test functions:
 * 
 * 1. recordFoodSaving(0xUserAddress, 5)
 *    - This should succeed
 *    - Check "Logs" for FoodSavingRecorded event
 * 
 * 2. getParticipantStats(0xUserAddress)
 *    - Call (blue button = view function)
 *    - Should return: (5, 5, 1)
 *    - Means: 5kg saved, 5 rewards, 1 participation
 * 
 * 3. setRewardRate(2)
 *    - This should succeed
 *    - Next recordFoodSaving will earn 2x rewards
 * 
 * ============================================
 * KEY POINTS FOR LAB RECORD
 * ============================================
 * 
 * ✅ Contract is stateful (stores data on blockchain)
 * ✅ recordFoodSaving is a transaction (costs gas)
 * ✅ getParticipantStats is a view function (free, no gas)
 * ✅ Events emit for transaction logging
 * ✅ Requires proper initialization with FOODToken address
 * ✅ Rewards calculated on-chain (transparent)
 * ✅ All data immutable (blockchain ensures authenticity)
 * 
 * ============================================
 */
