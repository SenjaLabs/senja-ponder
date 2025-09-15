import { ponder } from "ponder:registry";
import * as schema from "../ponder.schema";
import { 
  PoolAnalytics, 
  DEFAULT_INTEREST_MODEL 
} from "./apyCalculator";

// Type definitions for database context and operations
interface PonderContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any; // Ponder framework requires any for database operations
}

interface UserPositionData {
  id: string;
  user: string;
  pool: string;
  positionAddress: string;
  isActive: boolean;
  createdAt: bigint;
  lastUpdated: bigint;
}

interface UserCollateralData {
  id: string;
  user: string;
  pool: string;
  asset: string;
  totalCollateralAmount: bigint;
  isActive?: boolean;
}

interface UserBorrowData {
  id: string;
  user: string;
  pool: string;
  asset: string;
  totalBorrowedAmount: bigint;
  isActive?: boolean;
}

// Helper functions
function createEventID(blockNumber: bigint, logIndex: number): string {
  return `${blockNumber.toString()}-${logIndex.toString()}`;
}

async function getOrCreateUser(userAddress: string, context: PonderContext) {
  let user = await context.db.find(schema.User, { id: userAddress });
  
  if (!user) {
    await context.db.insert(schema.User).values({
      id: userAddress,
      address: userAddress,
      totalDeposited: 0n,
      totalWithdrawn: 0n,
      totalBorrowed: 0n,
      totalRepaid: 0n,
      totalSwapped: 0n,
    });
    user = await context.db.find(schema.User, { id: userAddress });
  }
  
  return user;
}

async function getOrCreateUserCollateral(
  userAddress: string, 
  poolAddress: string, 
  assetAddress: string, 
  context: PonderContext,
  timestamp: bigint
) {
  const id = `${userAddress}-${poolAddress}-${assetAddress}`;
  let userCollateral = await context.db.find(schema.UserCollateral, { id });
  
  if (!userCollateral) {
    await context.db.insert(schema.UserCollateral).values({
      id,
      user: userAddress,
      pool: poolAddress,
      asset: assetAddress,
      totalCollateralAmount: 0n,
      totalCollateralValue: 0n,
      collateralFactor: 7500, // Default 75% LTV
      isActive: true,
      lastUpdated: timestamp,
      createdAt: timestamp,
    });
    userCollateral = await context.db.find(schema.UserCollateral, { id });
  }
  
  return userCollateral;
}

async function getOrCreateUserBorrow(
  userAddress: string, 
  poolAddress: string, 
  assetAddress: string, 
  context: PonderContext,
  timestamp: bigint
) {
  const id = `${userAddress}-${poolAddress}-${assetAddress}`;
  let userBorrow = await context.db.find(schema.UserBorrow, { id });
  
  if (!userBorrow) {
    await context.db.insert(schema.UserBorrow).values({
      id,
      user: userAddress,
      pool: poolAddress,
      asset: assetAddress,
      totalBorrowedAmount: 0n,
      totalBorrowedValue: 0n,
      accruedInterest: 0n,
      borrowRate: 0,
      borrowRateMode: 1n, // Default to stable rate
      healthFactor: 1500000000000000000n, // 1.5 scaled by 1e18
      isActive: true,
      lastAccrued: timestamp,
      lastUpdated: timestamp,
      createdAt: timestamp,
    });
    userBorrow = await context.db.find(schema.UserBorrow, { id });
  }
  
  return userBorrow;
}

// Helper function to get or create user position 
async function _getOrCreateUserPosition(
  userAddress: string,
  poolAddress: string,
  context: PonderContext,
  _timestamp: bigint
): Promise<string | null> {
  const userPositionId = `${userAddress}-${poolAddress}`;
  
  try {
    // Try to find existing position
    const userPosition = await context.db.find(schema.UserPosition, { id: userPositionId });
    
    if (userPosition && userPosition.isActive) {
      console.log(`📍 Found existing position address for ${userAddress} in pool ${poolAddress}: ${userPosition.positionAddress}`);
      return userPosition.positionAddress;
    }
    
    // If no position found, this means position might be created automatically
    // We'll return null and let the transaction create the position via CreatePosition event
    console.log(`⚠️ No position found for ${userAddress} in pool ${poolAddress}, waiting for CreatePosition event`);
    return null;
    
  } catch (error) {
    console.log(`❌ Error getting/creating position address for ${userAddress}: ${error}`);
    return null;
  }
}

// Helper function to get user position address
async function getUserPositionAddress(
  userAddress: string,
  poolAddress: string,
  context: PonderContext
): Promise<string | null> {
  const userPositionId = `${userAddress}-${poolAddress}`;
  
  try {
    const userPosition = await context.db.find(schema.UserPosition, { id: userPositionId });
    
    if (userPosition && userPosition.isActive) {
      console.log(`📍 Found position address for ${userAddress} in pool ${poolAddress}: ${userPosition.positionAddress}`);
      return userPosition.positionAddress;
    }
    
    console.log(`⚠️ No active position found for ${userAddress} in pool ${poolAddress}`);
    return null;
  } catch (error) {
    console.log(`❌ Error getting position address for ${userAddress}: ${error}`);
    return null;
  }
}

// Helper function to get all user positions
async function _getAllUserPositions(
  userAddress: string,
  context: PonderContext
): Promise<Array<{ pool: string; positionAddress: string; isActive: boolean; createdAt: bigint }>> {
  try {
    const positions = await context.db.findMany(schema.UserPosition, {
      where: { user: userAddress }
    });
    
    const result = positions.map((pos: UserPositionData) => ({
      pool: pos.pool,
      positionAddress: pos.positionAddress,
      isActive: pos.isActive,
      createdAt: pos.createdAt,
    }));
    
    console.log(`📍 Found ${result.length} positions for user ${userAddress}`);
    return result;
  } catch (error) {
    console.log(`❌ Error getting all positions for ${userAddress}: ${error}`);
    return [];
  }
}

async function updateUserCollateral(
  userAddress: string,
  poolAddress: string,
  assetAddress: string,
  amount: bigint,
  isAdd: boolean,
  context: PonderContext,
  timestamp: bigint
) {
  const userCollateral = await getOrCreateUserCollateral(userAddress, poolAddress, assetAddress, context, timestamp);
  
  const newAmount = isAdd 
    ? userCollateral!.totalCollateralAmount + amount
    : userCollateral!.totalCollateralAmount - amount;
    
  await context.db.update(schema.UserCollateral, { id: userCollateral!.id })
    .set({
      totalCollateralAmount: newAmount > 0n ? newAmount : 0n,
      isActive: newAmount > 0n,
      lastUpdated: timestamp,
    });
    
  console.log(`🔒 User collateral updated: ${userAddress} now has ${newAmount.toString()} ${assetAddress} collateral in pool ${poolAddress}`);
}

async function updateUserBorrow(
  userAddress: string,
  poolAddress: string,
  assetAddress: string,
  amount: bigint,
  isAdd: boolean,
  context: PonderContext,
  timestamp: bigint,
  borrowRate?: number
) {
  const userBorrow = await getOrCreateUserBorrow(userAddress, poolAddress, assetAddress, context, timestamp);
  
  const newAmount = isAdd 
    ? userBorrow!.totalBorrowedAmount + amount
    : userBorrow!.totalBorrowedAmount - amount;
    
  await context.db.update(schema.UserBorrow, { id: userBorrow!.id })
    .set({
      totalBorrowedAmount: newAmount > 0n ? newAmount : 0n,
      borrowRate: borrowRate || userBorrow!.borrowRate,
      isActive: newAmount > 0n,
      lastAccrued: timestamp,
      lastUpdated: timestamp,
    });
    
  console.log(`💰 User borrow updated: ${userAddress} now owes ${newAmount.toString()} ${assetAddress} in pool ${poolAddress}`);
}

async function _calculateUserHealthFactor(
  userAddress: string,
  poolAddress: string,
  context: PonderContext
): Promise<bigint> {
  // Simple health factor calculation: totalCollateralValue * collateralFactor / totalBorrowedValue
  // This is a simplified version - in production, you'd need price oracles and proper risk parameters
  
  try {
    // Get all user collateral positions for this pool
    const userCollaterals = await context.db.select({
      from: schema.UserCollateral,
      where: (userCollateral: UserCollateralData) => 
        userCollateral.user === userAddress && 
        userCollateral.pool === poolAddress && 
        userCollateral.isActive === true
    });

    // Get all user borrow positions for this pool
    const userBorrows = await context.db.select({
      from: schema.UserBorrow,
      where: (userBorrow: UserBorrowData) => 
        userBorrow.user === userAddress && 
        userBorrow.pool === poolAddress && 
        userBorrow.isActive === true
    });

    let totalCollateralValue = 0n;
    let totalBorrowValue = 0n;

    // Sum up collateral values (with LTV applied)
    for (const collateral of userCollaterals) {
      const adjustedValue = (collateral.totalCollateralValue * BigInt(collateral.collateralFactor)) / 10000n;
      totalCollateralValue += adjustedValue;
    }

    // Sum up borrow values
    for (const borrow of userBorrows) {
      totalBorrowValue += borrow.totalBorrowedValue;
    }

    // Calculate health factor: (collateralValue / borrowValue) * 1e18
    // Health factor > 1e18 means position is healthy
    if (totalBorrowValue === 0n) {
      return 2000000000000000000n; // 2.0 if no debt
    }

    const healthFactor = (totalCollateralValue * 1000000000000000000n) / totalBorrowValue;
    return healthFactor;
    
  } catch (error) {
    console.log(`⚠️ Error calculating health factor for ${userAddress}: ${error}`);
    return 1500000000000000000n; // Default 1.5
  }
}

async function _accrueUserInterest(
  userAddress: string,
  poolAddress: string,
  assetAddress: string,
  context: PonderContext,
  currentTimestamp: bigint,
  currentBorrowRate: number
) {
  const userBorrow = await getOrCreateUserBorrow(userAddress, poolAddress, assetAddress, context, currentTimestamp);
  
  if (userBorrow!.totalBorrowedAmount === 0n) {
    return; // No debt to accrue interest on
  }

  const timeDelta = currentTimestamp - userBorrow!.lastAccrued;
  if (timeDelta === 0n) {
    return; // No time has passed
  }

  // Simple interest calculation: principal * rate * time / (365 * 24 * 3600 * 10000)
  // Rate is in basis points, time is in seconds
  const secondsPerYear = 365n * 24n * 3600n;
  const basisPoints = 10000n;
  
  const interestAccrued = (userBorrow!.totalBorrowedAmount * BigInt(currentBorrowRate) * timeDelta) / (secondsPerYear * basisPoints);
  
  if (interestAccrued > 0n) {
    const newTotalBorrowed = userBorrow!.totalBorrowedAmount + interestAccrued;
    
    await context.db.update(schema.UserBorrow, { id: userBorrow!.id })
      .set({
        totalBorrowedAmount: newTotalBorrowed,
        accruedInterest: userBorrow!.accruedInterest + interestAccrued,
        borrowRate: currentBorrowRate,
        lastAccrued: currentTimestamp,
        lastUpdated: currentTimestamp,
      });
      
    console.log(`💸 Interest accrued for ${userAddress}: ${interestAccrued.toString()} (new total: ${newTotalBorrowed.toString()})`);
  }
}

// Helper function to calculate and update total liquidity
async function updatePoolLiquidity(
  poolAddress: string,
  context: PonderContext
) {
  const pool = await context.db.find(schema.LendingPool, { id: poolAddress });
  if (!pool) return;

  // Calculate available liquidity (totalSupplyAssets - totalBorrowAssets)
  const totalLiquidity = pool.totalSupplyAssets - pool.totalBorrowAssets;

  await context.db.update(schema.LendingPool, { id: poolAddress })
    .set({
      totalLiquidity: totalLiquidity > 0n ? totalLiquidity : 0n,
    });

  console.log(`📊 Pool ${poolAddress} liquidity updated:`);
  console.log(`   totalSupplyAssets: ${pool.totalSupplyAssets}`);
  console.log(`   totalBorrowAssets: ${pool.totalBorrowAssets}`);
  console.log(`   totalLiquidity: ${totalLiquidity > 0n ? totalLiquidity : 0n}`);
}

// Helper function to get pool liquidity data
async function _getPoolLiquidity(
  poolAddress: string,
  context: PonderContext
): Promise<{
  totalSupplyAssets: bigint;
  totalBorrowAssets: bigint;
  totalLiquidity: bigint;
  utilizationRate: number;
  supplyRate: number;
  borrowRate: number;
} | null> {
  const pool = await context.db.find(schema.LendingPool, { id: poolAddress });
  if (!pool) return null;

  return {
    totalSupplyAssets: pool.totalSupplyAssets,
    totalBorrowAssets: pool.totalBorrowAssets,
    totalLiquidity: pool.totalLiquidity,
    utilizationRate: pool.utilizationRate,
    supplyRate: pool.supplyRate,
    borrowRate: pool.borrowRate,
  };
}

async function updatePoolAPY(
  poolAddress: string, 
  context: PonderContext, 
  timestamp: bigint, 
  blockNumber: bigint
) {
  const pool = await context.db.find(schema.LendingPool, { id: poolAddress });
  if (!pool) return;

  // Debug logging
  console.log(`🔍 Updating APY for pool ${poolAddress}:`);
  console.log(`   totalSupplyAssets: ${pool.totalSupplyAssets}`);
  console.log(`   totalBorrowAssets: ${pool.totalBorrowAssets}`);
  console.log(`   lastAccrued: ${pool.lastAccrued}`);
  console.log(`   currentTimestamp: ${timestamp}`);

  // Create analytics instance
  const analytics = new PoolAnalytics(
    pool.totalSupplyAssets,
    pool.totalSupplyShares,
    pool.totalBorrowAssets,
    pool.totalBorrowShares,
    pool.lastAccrued,
    timestamp,
    DEFAULT_INTEREST_MODEL
  );

  console.log(`   borrowRate: ${analytics.borrowRate}`);
  console.log(`   supplyRate: ${analytics.supplyRate}`);
  console.log(`   borrowAPY: ${analytics.borrowAPY}`);
  console.log(`   supplyAPY: ${analytics.supplyAPY}`);
  console.log(`   utilizationRate: ${analytics.utilizationRate}`);

  // Calculate accrued interest
  const accrual = analytics.calculateAccruedInterest();

  // Calculate available liquidity (totalSupplyAssets - totalBorrowAssets)
  const totalLiquidity = accrual.newSupplyAssets - accrual.newBorrowAssets;

  // Update pool with new rates and accrued interest
  await context.db.update(schema.LendingPool, { id: poolAddress })
    .set({
      totalSupplyAssets: accrual.newSupplyAssets,
      totalBorrowAssets: accrual.newBorrowAssets,
      totalLiquidity: totalLiquidity > 0n ? totalLiquidity : 0n, // Ensure non-negative
      utilizationRate: analytics.utilizationRate,
      supplyAPY: analytics.supplyAPY,
      borrowAPY: analytics.borrowAPY,
      supplyRate: analytics.supplyRate,
      borrowRate: analytics.borrowRate,
      lastAccrued: timestamp,
    });

  // Create APY snapshot every hour (3600 seconds)
  const hourlyTimestamp = timestamp - (timestamp % 3600n);
  const snapshotId = `${poolAddress}-${hourlyTimestamp}`;
  
  // Check if snapshot already exists for this hour
  const existingSnapshot = await context.db.find(schema.PoolAPYSnapshot, { id: snapshotId });
  if (!existingSnapshot) {
    await context.db.insert(schema.PoolAPYSnapshot).values({
      id: snapshotId,
      pool: poolAddress,
      supplyAPY: analytics.supplyAPY,
      borrowAPY: analytics.borrowAPY,
      utilizationRate: analytics.utilizationRate,
      totalSupplyAssets: accrual.newSupplyAssets,
      totalBorrowAssets: accrual.newBorrowAssets,
      timestamp: hourlyTimestamp,
      blockNumber: blockNumber,
    });
  }

  // Record interest accrual if significant
  if (accrual.interestEarned > 0n) {
    await context.db.insert(schema.InterestAccrual).values({
      id: createEventID(blockNumber, 9999), // Use high log index for accrual events
      pool: poolAddress,
      previousSupplyAssets: pool.totalSupplyAssets,
      newSupplyAssets: accrual.newSupplyAssets,
      previousBorrowAssets: pool.totalBorrowAssets,
      newBorrowAssets: accrual.newBorrowAssets,
      interestEarned: accrual.interestEarned,
      timestamp: timestamp,
      blockNumber: blockNumber,
      transactionHash: "0x0", // No specific transaction for accrual
    });
  }

  console.log(`📊 APY Updated for pool ${poolAddress}:`);
  console.log(`   Supply APY: ${analytics.supplyAPY / 100}%`);
  console.log(`   Borrow APY: ${analytics.borrowAPY / 100}%`);
  console.log(`   Utilization: ${analytics.utilizationRate / 100}%`);
  console.log(`   Interest Earned: ${accrual.interestEarned.toString()}`);
}

async function getOrCreatePool(poolAddress: string, context: PonderContext) {
  let pool = await context.db.find(schema.LendingPool, { id: poolAddress });
  
  if (!pool) {
    await context.db.insert(schema.LendingPool).values({
      id: poolAddress,
      address: poolAddress,
      factory: "",
      token0: "",
      token1: "",
      totalDeposits: 0n,
      totalWithdrawals: 0n,
      totalBorrows: 0n,
      totalRepays: 0n,
      totalSwaps: 0n,
      // APY tracking fields
      totalSupplyAssets: 0n,
      totalSupplyShares: 0n,
      totalBorrowAssets: 0n,
      totalBorrowShares: 0n,
      utilizationRate: 0,
      supplyRate: 0,
      borrowRate: 0,
      lastAccrued: 0n,
      created: 0n,
    });
    pool = await context.db.find(schema.LendingPool, { id: poolAddress });
  }
  
  return pool;
}

async function getPoolTokens(poolAddress: string, context: PonderContext): Promise<{ collateralToken: string, borrowToken: string }> {
  // Try to get pool creation info to determine the correct tokens
  const poolCreated = await context.db.find(schema.LendingPoolCreated, { lendingPool: poolAddress });
  
  if (poolCreated) {
    return {
      collateralToken: poolCreated.collateralToken,
      borrowToken: poolCreated.borrowToken
    };
  }
  
  // Fallback: try to get from pool info if available
  const pool = await context.db.find(schema.LendingPool, { id: poolAddress });
  if (pool && pool.token0 && pool.token1) {
    // For now, assume token0 is collateral and token1 is borrow token
    // This should be determined based on your specific protocol logic
    return {
      collateralToken: pool.token0,
      borrowToken: pool.token1
    };
  }
  
  // Ultimate fallback - use pool address (current behavior)
  console.log(`⚠️ Could not determine tokens for pool ${poolAddress}, using pool address as fallback`);
  return {
    collateralToken: poolAddress,
    borrowToken: poolAddress
  };
}

// ========================================
// LENDING POOL EVENT HANDLERS
// ========================================

// SupplyLiquidity Event Handler
ponder.on("LendingPool:SupplyLiquidity", async ({ event, context }) => {
  console.log("💰 SupplyLiquidity event:", event.args);
  
  const poolAddress = event.log.address;
  const userAddress = event.args.user;
  const amount = BigInt(event.args.amount);
  const shares = BigInt(event.args.shares);
  const timestamp = BigInt(event.block.timestamp);
  
  // Get pool tokens to determine the correct asset
  const poolTokens = await getPoolTokens(poolAddress, context);
  // For supply liquidity, we typically supply the base/quote token
  // This should be determined based on your protocol logic
  const suppliedAsset = poolTokens.collateralToken; // or borrowToken depending on protocol
  
  // Get or create user and pool
  const user = await getOrCreateUser(userAddress, context);
  const pool = await getOrCreatePool(poolAddress, context);
  
  // Try to get user position (might not exist yet if position is created in same transaction)
  const positionAddress = await getUserPositionAddress(userAddress, poolAddress, context);
  
  // Update user totals
  await context.db.update(schema.User, { id: userAddress })
    .set({
      totalDeposited: user!.totalDeposited + amount,
    });
  
  // Update pool totals and assets/shares for APY calculation
  await context.db.update(schema.LendingPool, { id: poolAddress })
    .set({
      totalDeposits: pool!.totalDeposits + amount,
      totalSupplyAssets: pool!.totalSupplyAssets + amount,
      totalSupplyShares: pool!.totalSupplyShares + shares,
      lastAccrued: timestamp, // Update last accrued time
    });

  // Update APY calculations
  await updatePoolAPY(poolAddress, context, timestamp, BigInt(event.block.number));
  
  // Update pool liquidity
  await updatePoolLiquidity(poolAddress, context);

  // Create SupplyLiquidity event record
  await context.db.insert(schema.SupplyLiquidity).values({
    id: createEventID(BigInt(event.block.number), event.log.logIndex!),
    user: userAddress,
    pool: poolAddress,
    asset: suppliedAsset, // Use the actual asset token, not pool address
    amount: amount,
    shares: shares,
    onBehalfOf: userAddress,
    timestamp: timestamp,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
  });

  console.log(`✅ SupplyLiquidity processed: ${userAddress} supplied ${amount.toString()} ${suppliedAsset} (${shares.toString()} shares) to pool ${poolAddress}${positionAddress ? ` (position: ${positionAddress})` : ''}`);
});

// 2. WithdrawLiquidity Event Handler
ponder.on("LendingPool:WithdrawLiquidity", async ({ event, context }) => {
  console.log("🏧 WithdrawLiquidity event:", event.args);
  
  const poolAddress = event.log.address;
  const userAddress = event.args.user;
  const amount = BigInt(event.args.amount);
  const shares = BigInt(event.args.shares);
  const timestamp = BigInt(event.block.timestamp);
  
  // Get pool tokens to determine the correct asset
  const poolTokens = await getPoolTokens(poolAddress, context);
  const withdrawnAsset = poolTokens.collateralToken; // or borrowToken depending on protocol
  
  // Get or create user and pool
  const user = await getOrCreateUser(userAddress, context);
  const pool = await getOrCreatePool(poolAddress, context);
  
  // Try to get user position
  const positionAddress = await getUserPositionAddress(userAddress, poolAddress, context);
  
  // Update user totals
  await context.db.update(schema.User, { id: userAddress })
    .set({
      totalWithdrawn: user!.totalWithdrawn + amount,
    });
  
  // Update pool totals and assets/shares for APY calculation
  await context.db.update(schema.LendingPool, { id: poolAddress })
    .set({
      totalWithdrawals: pool!.totalWithdrawals + amount,
      totalSupplyAssets: pool!.totalSupplyAssets > amount ? pool!.totalSupplyAssets - amount : 0n,
      totalSupplyShares: pool!.totalSupplyShares > shares ? pool!.totalSupplyShares - shares : 0n,
      lastAccrued: timestamp,
    });

  // Update APY calculations
  await updatePoolAPY(poolAddress, context, timestamp, BigInt(event.block.number));
  
  // Update pool liquidity
  await updatePoolLiquidity(poolAddress, context);

  // Create WithdrawLiquidity event record
  await context.db.insert(schema.WithdrawLiquidity).values({
    id: createEventID(BigInt(event.block.number), event.log.logIndex!),
    user: userAddress,
    pool: poolAddress,
    asset: withdrawnAsset, // Use the actual asset token, not pool address
    amount: amount,
    shares: shares,
    to: userAddress,
    timestamp: timestamp,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
  });

  console.log(`✅ WithdrawLiquidity processed: ${userAddress} withdrew ${amount.toString()} ${withdrawnAsset} (${shares.toString()} shares) from pool ${poolAddress}${positionAddress ? ` (position: ${positionAddress})` : ''}`);
});

// 3. BorrowDebtCrosschain Event Handler
ponder.on("LendingPool:BorrowDebtCrosschain", async ({ event, context }) => {
  console.log("🌉 BorrowDebtCrosschain event:", event.args);
  
  const poolAddress = event.log.address;
  const userAddress = event.args.user;
  const amount = BigInt(event.args.amount);
  const timestamp = BigInt(event.block.timestamp);
  
  // Get pool tokens to determine the correct borrow token
  const poolTokens = await getPoolTokens(poolAddress, context);
  const borrowToken = poolTokens.borrowToken;
  
  // Get or create user and pool
  const user = await getOrCreateUser(userAddress, context);
  const pool = await getOrCreatePool(poolAddress, context);
  
  // Get user position address for this pool
  const positionAddress = await getUserPositionAddress(userAddress, poolAddress, context);
  
  // Update user totals
  await context.db.update(schema.User, { id: userAddress })
    .set({
      totalBorrowed: user!.totalBorrowed + amount,
    });
  
  // Update pool totals and assets/shares for APY calculation
  await context.db.update(schema.LendingPool, { id: poolAddress })
    .set({
      totalBorrows: pool!.totalBorrows + amount,
      totalBorrowAssets: pool!.totalBorrowAssets + amount,
      totalBorrowShares: pool!.totalBorrowShares + BigInt(event.args.shares),
    });

  // Update user borrow position with the correct borrow token
  await updateUserBorrow(userAddress, poolAddress, borrowToken, amount, true, context, timestamp, pool!.borrowRate);

  // Update APY calculations
  await updatePoolAPY(poolAddress, context, timestamp, BigInt(event.block.number));

  // Create BorrowDebtCrosschain event record
  await context.db.insert(schema.BorrowDebtCrosschain).values({
    id: createEventID(BigInt(event.block.number), event.log.logIndex!),
    user: userAddress,
    pool: poolAddress,
    asset: borrowToken, // Use the actual borrow token, not pool address
    amount: amount,
    shares: BigInt(event.args.shares), // Add shares field
    chainId: BigInt(event.args.chainId), // Use new field name
    addExecutorLzReceiveOption: BigInt(event.args.addExecutorLzReceiveOption), // Use new field name
    onBehalfOf: userAddress,
    timestamp: timestamp,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
  });

  console.log(`✅ BorrowDebtCrosschain processed: ${userAddress} borrowed ${amount.toString()} ${borrowToken} from pool ${poolAddress} (chainId: ${event.args.chainId}, shares: ${event.args.shares})${positionAddress ? ` (position: ${positionAddress})` : ''}`);
});

// 4. RepayByPosition Event Handler
ponder.on("LendingPool:RepayByPosition", async ({ event, context }) => {
  console.log("💰 RepayByPosition event:", event.args);
  
  const poolAddress = event.log.address;
  const userAddress = event.args.user;
  const amount = BigInt(event.args.amount);
  const shares = BigInt(event.args.shares); // Now using the shares parameter from ABI
  const timestamp = BigInt(event.block.timestamp);
  
  // Get pool tokens to determine the correct borrow token
  const poolTokens = await getPoolTokens(poolAddress, context);
  const borrowToken = poolTokens.borrowToken;
  
  // Get or create user and pool
  const user = await getOrCreateUser(userAddress, context);
  const pool = await getOrCreatePool(poolAddress, context);
  
  // Get user position address for this pool
  const positionAddress = await getUserPositionAddress(userAddress, poolAddress, context);
  
  // Update user totals
  await context.db.update(schema.User, { id: userAddress })
    .set({
      totalRepaid: user!.totalRepaid + amount,
    });
  
  // Update pool totals - also update shares
  await context.db.update(schema.LendingPool, { id: poolAddress })
    .set({
      totalRepays: pool!.totalRepays + amount,
      totalBorrowAssets: pool!.totalBorrowAssets > amount ? pool!.totalBorrowAssets - amount : 0n,
      totalBorrowShares: pool!.totalBorrowShares > shares ? pool!.totalBorrowShares - shares : 0n,
    });

  // Update user borrow position (reduce borrowed amount) with correct borrow token
  await updateUserBorrow(userAddress, poolAddress, borrowToken, amount, false, context, timestamp);

  // Update APY calculations
  await updatePoolAPY(poolAddress, context, timestamp, BigInt(event.block.number));

  // Create RepayByPosition event record
  await context.db.insert(schema.RepayWithCollateralByPosition).values({
    id: createEventID(BigInt(event.block.number), event.log.logIndex!),
    user: userAddress,
    pool: poolAddress,
    asset: borrowToken, // Use the actual borrow token, not pool address
    amount: amount,
    shares: shares, // Add shares field from event
    repayer: userAddress,
    timestamp: timestamp,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
  });

  console.log(`✅ RepayByPosition processed: ${userAddress} repaid ${amount.toString()} ${borrowToken} (${shares.toString()} shares) to pool ${poolAddress}${positionAddress ? ` (position: ${positionAddress})` : ''}`);
});

// 5. SupplyCollateral Event Handler
ponder.on("LendingPool:SupplyCollateral", async ({ event, context }) => {
  console.log("🔒 SupplyCollateral event:", event.args);
  
  const poolAddress = event.log.address;
  const userAddress = event.args.user;
  const amount = BigInt(event.args.amount);
  const timestamp = BigInt(event.block.timestamp);
  
  // Get pool tokens to determine the correct collateral token
  const poolTokens = await getPoolTokens(poolAddress, context);
  const collateralToken = poolTokens.collateralToken;
  
  // Get or create user and pool
  await getOrCreateUser(userAddress, context);
  await getOrCreatePool(poolAddress, context);

  // Get user position address for this pool
  const positionAddress = await getUserPositionAddress(userAddress, poolAddress, context);

  // Update user collateral position with the correct collateral token
  await updateUserCollateral(userAddress, poolAddress, collateralToken, amount, true, context, timestamp);

  // Create SupplyCollateral event record
  await context.db.insert(schema.SupplyCollateral).values({
    id: createEventID(BigInt(event.block.number), event.log.logIndex!),
    user: userAddress,
    pool: poolAddress,
    asset: collateralToken, // Use the actual collateral token, not pool address
    amount: amount,
    onBehalfOf: userAddress,
    timestamp: timestamp,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
  });

  console.log(`✅ SupplyCollateral processed: ${userAddress} supplied ${amount.toString()} ${collateralToken} collateral to pool ${poolAddress}${positionAddress ? ` (position: ${positionAddress})` : ''}`);
});

// 5.1. WithdrawCollateral Event Handler
// ponder.on("LendingPool:WithdrawCollateral", async ({ event, context }) => {
//   console.log("🔓 WithdrawCollateral event:", event.args);
  
//   const poolAddress = event.log.address;
//   const userAddress = event.args.user;
//   const to = event.args.to;
//   const amount = BigInt(event.args.amount);
//   const timestamp = BigInt(event.block.timestamp);
  
//   // Get pool tokens to determine the correct collateral token
//   const poolTokens = await getPoolTokens(poolAddress, context);
//   const collateralToken = poolTokens.collateralToken;
  
//   // Get or create user and pool
//   await getOrCreateUser(userAddress, context);
//   await getOrCreatePool(poolAddress, context);

//   // Get user position address for this pool
//   const positionAddress = await getUserPositionAddress(userAddress, poolAddress, context);

//   // Update user collateral position with the correct collateral token (subtract amount)
//   await updateUserCollateral(userAddress, poolAddress, collateralToken, amount, false, context, timestamp);

//   // Create WithdrawCollateral event record
//   await context.db.insert(schema.WithdrawCollateral).values({
//     id: createEventID(BigInt(event.block.number), event.log.logIndex!),
//     user: userAddress,
//     pool: poolAddress,
//     asset: collateralToken, // Use the actual collateral token, not pool address
//     amount: amount,
//     to: to,
//     timestamp: timestamp,
//     blockNumber: BigInt(event.block.number),
//     transactionHash: event.transaction.hash,
//   });

//   console.log(`✅ WithdrawCollateral processed: ${userAddress} withdrew ${amount.toString()} ${collateralToken} collateral from pool ${poolAddress} to ${to}${positionAddress ? ` (position: ${positionAddress})` : ''}`);
// });

// 6. CreatePosition Event Handler
ponder.on("LendingPool:CreatePosition", async ({ event, context }) => {
  console.log("📍 CreatePosition event:", event.args);
  
  const poolAddress = event.log.address;
  const userAddress = event.args.user;
  const positionAddress = event.args.positionAddress;
  const timestamp = BigInt(event.block.timestamp);
  
  // Get or create user and pool
  await getOrCreateUser(userAddress, context);
  await getOrCreatePool(poolAddress, context);

  // Create CreatePosition event record
  await context.db.insert(schema.CreatePosition).values({
    id: createEventID(BigInt(event.block.number), event.log.logIndex!),
    user: userAddress,
    pool: poolAddress,
    positionAddress: positionAddress,
    timestamp: timestamp,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
  });

  // Create or update UserPosition mapping
  const userPositionId = `${userAddress}-${poolAddress}`;
  const existingPosition = await context.db.find(schema.UserPosition, { id: userPositionId });
  
  if (existingPosition) {
    // Update existing position
    await context.db.update(schema.UserPosition, { id: userPositionId })
      .set({
        positionAddress: positionAddress,
        isActive: true,
        lastUpdated: timestamp,
      });
    console.log(`🔄 Updated existing position for ${userAddress} in pool ${poolAddress} with new address ${positionAddress}`);
  } else {
    // Create new position mapping
    await context.db.insert(schema.UserPosition).values({
      id: userPositionId,
      user: userAddress,
      pool: poolAddress,
      positionAddress: positionAddress,
      isActive: true,
      createdAt: timestamp,
      lastUpdated: timestamp,
    });
    console.log(`🆕 Created new position mapping for ${userAddress} in pool ${poolAddress} with address ${positionAddress}`);
  }

  console.log(`✅ CreatePosition processed: ${userAddress} created/updated position ${positionAddress} in pool ${poolAddress}`);
});

// NOTE: SwapToken event is not available in the current LendingPool ABI
// Commenting out this handler until the event is added to the contract
/*
// 7. SwapToken Event Handler
ponder.on("LendingPool:SwapToken", async ({ event, context }) => {
  console.log("🔄 SwapToken event:", event.args);
  
  const poolAddress = event.log.address;
  const userAddress = event.args.user;
  
  // Get or create user and pool
  const user = await getOrCreateUser(userAddress, context);
  const pool = await getOrCreatePool(poolAddress, context);

  // Update user totals
  await context.db.update(schema.User, { id: userAddress })
    .set({
      totalSwapped: user!.totalSwapped + BigInt(event.args.amountIn),
    });

  // Update pool totals
  await context.db.update(schema.LendingPool, { id: poolAddress })
    .set({
      totalSwaps: pool!.totalSwaps + BigInt(event.args.amountIn),
    });

  // Create SwapToken event record
  await context.db.insert(schema.SwapToken).values({
    id: createEventID(BigInt(event.block.number), event.log.logIndex!),
    user: userAddress,
    pool: poolAddress,
    tokenFrom: event.args.tokenFrom,
    tokenTo: event.args.tokenTo,
    amountIn: BigInt(event.args.amountIn),
    amountOut: BigInt(event.args.amountOut),
    timestamp: BigInt(event.block.timestamp),
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
  });

  console.log(`✅ SwapToken processed: ${userAddress} swapped ${event.args.amountIn} ${event.args.tokenFrom} for ${event.args.amountOut} ${event.args.tokenTo} in pool ${poolAddress}`);
});
*/


// ========================================
// SWAP TRACKING FUNCTIONALITY
// ========================================

// Helper function to track swap transactions
async function _trackSwapTransaction(
  userAddress: string,
  poolAddress: string,
  tokenFrom: string,
  tokenTo: string,
  amountIn: bigint,
  amountOut: bigint,
  timestamp: bigint,
  blockNumber: bigint,
  transactionHash: string,
  logIndex: number,
  context: PonderContext
) {
  // Get or create user and pool
  await getOrCreateUser(userAddress, context);
  await getOrCreatePool(poolAddress, context);

  // Create SwapToken event record
  await context.db.insert(schema.SwapToken).values({
    id: createEventID(blockNumber, logIndex),
    user: userAddress,
    pool: poolAddress,
    tokenFrom: tokenFrom,
    tokenTo: tokenTo,
    amountIn: amountIn,
    amountOut: amountOut,
    timestamp: timestamp,
    blockNumber: blockNumber,
    transactionHash: transactionHash,
  });

  console.log(`🔄 Swap tracked: ${userAddress} swapped ${amountIn.toString()} ${tokenFrom} for ${amountOut.toString()} ${tokenTo}`);
}
