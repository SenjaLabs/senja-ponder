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

// Helper functions
function createEventID(blockNumber: bigint, logIndex: number): string {
  return `${blockNumber.toString()}-${logIndex.toString()}`;
}

// Helper function to get pool address from position address
async function getPoolFromPosition(positionAddress: string, context: PonderContext): Promise<string | null> {
  try {
    // Find the pool that has this position address
    const userPosition = await context.db.findFirst(schema.UserPosition, {
      where: { positionAddress: positionAddress }
    });
    
    if (userPosition) {
      console.log(`📍 Found pool ${userPosition.pool} for position ${positionAddress}`);
      return userPosition.pool;
    }
    
    console.log(`⚠️ No pool found for position ${positionAddress}`);
    return null;
  } catch (error) {
    console.log(`❌ Error getting pool for position ${positionAddress}:`, error);
    return null;
  }
}

// Helper function to update pool APY
async function updatePoolAPY(
  poolAddress: string, 
  context: PonderContext, 
  timestamp: bigint, 
  blockNumber: bigint
) {
  const pool = await context.db.find(schema.LendingPool, { id: poolAddress });
  if (!pool) return;

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

  // Calculate accrued interest
  const accrual = analytics.calculateAccruedInterest();

  // Calculate available liquidity (totalSupplyAssets - totalBorrowAssets)
  const totalLiquidity = accrual.newSupplyAssets - accrual.newBorrowAssets;

  // Update pool with new rates and accrued interest
  await context.db.update(schema.LendingPool, { id: poolAddress })
    .set({
      totalSupplyAssets: accrual.newSupplyAssets,
      totalBorrowAssets: accrual.newBorrowAssets,
      totalLiquidity: totalLiquidity > 0n ? totalLiquidity : 0n,
      utilizationRate: analytics.utilizationRate,
      supplyAPY: analytics.supplyAPY,
      borrowAPY: analytics.borrowAPY,
      supplyRate: analytics.supplyRate,
      borrowRate: analytics.borrowRate,
      lastAccrued: timestamp,
    });

  console.log(`📊 Pool APY updated for ${poolAddress}: Supply ${analytics.supplyAPY}bp, Borrow ${analytics.borrowAPY}bp`);
}

// ========================================
// POSITION EVENT HANDLERS
// ========================================

// 1. WithdrawCollateral Event Handler dari Position
ponder.on("Position:WithdrawCollateral", async ({ event, context }) => {
  console.log("🔓 Position WithdrawCollateral event:", event.args);
  
  const positionAddress = event.log.address;
  const userAddress = event.args.user;
  const amount = BigInt(event.args.amount);
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  
  // Get pool address dari position
  const poolAddress = await getPoolFromPosition(positionAddress, context);
  if (!poolAddress) {
    console.log(`❌ Cannot find pool for position ${positionAddress}`);
    return;
  }

  // Create PositionWithdrawCollateral event record
  await context.db.insert(schema.PositionWithdrawCollateral).values({
    id: createEventID(blockNumber, event.log.logIndex!),
    user: userAddress,
    positionAddress: positionAddress,
    pool: poolAddress,
    amount: amount,
    timestamp: timestamp,
    blockNumber: blockNumber,
    transactionHash: event.transaction.hash,
  });

  // Update pool APY karena ada perubahan collateral
  await updatePoolAPY(poolAddress, context, timestamp, blockNumber);

  console.log(`✅ Position WithdrawCollateral processed: ${userAddress} withdrew ${amount.toString()} collateral from position ${positionAddress} in pool ${poolAddress}`);
});

// 2. SwapToken Event Handler dari Position
ponder.on("Position:SwapToken", async ({ event, context }) => {
  console.log("🔄 Position SwapToken event:", event.args);
  
  const positionAddress = event.log.address;
  const userAddress = event.args.user;
  const token = event.args.token;
  const amount = BigInt(event.args.amount);
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  
  // Get pool address dari position
  const poolAddress = await getPoolFromPosition(positionAddress, context);
  if (!poolAddress) {
    console.log(`❌ Cannot find pool for position ${positionAddress}`);
    return;
  }

  // Create PositionSwapToken event record
  await context.db.insert(schema.PositionSwapToken).values({
    id: createEventID(blockNumber, event.log.logIndex!),
    user: userAddress,
    positionAddress: positionAddress,
    pool: poolAddress,
    token: token,
    amount: amount,
    timestamp: timestamp,
    blockNumber: blockNumber,
    transactionHash: event.transaction.hash,
  });

  // Update pool totals untuk swap
  const pool = await context.db.find(schema.LendingPool, { id: poolAddress });
  if (pool) {
    await context.db.update(schema.LendingPool, { id: poolAddress })
      .set({
        totalSwaps: pool.totalSwaps + 1n,
      });
  }

  // Update pool APY karena ada swap activity
  await updatePoolAPY(poolAddress, context, timestamp, blockNumber);

  console.log(`✅ Position SwapToken processed: ${userAddress} swapped ${amount.toString()} ${token} in position ${positionAddress} in pool ${poolAddress}`);
});

// 3. SwapTokenByPosition Event Handler dari Position
ponder.on("Position:SwapTokenByPosition", async ({ event, context }) => {
  console.log("🔄 Position SwapTokenByPosition event:", event.args);
  
  const positionAddress = event.log.address;
  const userAddress = event.args.user;
  const tokenIn = event.args.tokenIn;
  const tokenOut = event.args.tokenOut;
  const amountIn = BigInt(event.args.amountIn);
  const amountOut = BigInt(event.args.amountOut);
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  
  // Get pool address dari position
  const poolAddress = await getPoolFromPosition(positionAddress, context);
  if (!poolAddress) {
    console.log(`❌ Cannot find pool for position ${positionAddress}`);
    return;
  }

  // Create PositionSwapTokenByPosition event record
  await context.db.insert(schema.PositionSwapTokenByPosition).values({
    id: createEventID(blockNumber, event.log.logIndex!),
    user: userAddress,
    positionAddress: positionAddress,
    pool: poolAddress,
    tokenIn: tokenIn,
    tokenOut: tokenOut,
    amountIn: amountIn,
    amountOut: amountOut,
    timestamp: timestamp,
    blockNumber: blockNumber,
    transactionHash: event.transaction.hash,
  });

  // Update pool totals untuk swap
  const pool = await context.db.find(schema.LendingPool, { id: poolAddress });
  if (pool) {
    await context.db.update(schema.LendingPool, { id: poolAddress })
      .set({
        totalSwaps: pool.totalSwaps + 1n,
      });
  }

  // Update pool APY karena ada swap activity
  await updatePoolAPY(poolAddress, context, timestamp, blockNumber);

  console.log(`✅ Position SwapTokenByPosition processed: ${userAddress} swapped ${amountIn.toString()} ${tokenIn} -> ${amountOut.toString()} ${tokenOut} in position ${positionAddress} in pool ${poolAddress}`);
});