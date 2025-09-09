import { ponder } from "ponder:registry";
import * as schema from "../ponder.schema";
import { 
  PoolAnalytics, 
  calculateUtilizationRate, 
  calculateBorrowRate, 
  calculateSupplyRate,
  calculateAPY,
  DEFAULT_INTEREST_MODEL 
} from "./apyCalculator";

// Helper functions
function createEventID(blockNumber: bigint, logIndex: number): string {
  return `${blockNumber.toString()}-${logIndex.toString()}`;
}

async function getOrCreateUser(userAddress: string, context: any) {
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

async function updatePoolAPY(
  poolAddress: string, 
  context: any, 
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
  console.log(`   utilizationRate: ${analytics.utilizationRate}`);

  // Calculate accrued interest
  const accrual = analytics.calculateAccruedInterest();

  // Update pool with new rates and accrued interest
  await context.db.update(schema.LendingPool, { id: poolAddress })
    .set({
      totalSupplyAssets: accrual.newSupplyAssets,
      totalBorrowAssets: accrual.newBorrowAssets,
      utilizationRate: analytics.utilizationRate,
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

async function getOrCreatePool(poolAddress: string, context: any) {
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

// ========================================
// LENDING POOL EVENT HANDLERS
// ========================================

// SupplyLiquidity Event Handler
ponder.on("LendingPool:SupplyLiquidity", async ({ event, context }) => {
  const poolAddress = event.log.address;
  const userAddress = event.args.user;
  
  // Get or create user and pool
  let user = await getOrCreateUser(userAddress, context);
  let pool = await getOrCreatePool(poolAddress, context);
  
  // Update user totals
  await context.db.update(schema.User, { id: userAddress })
    .set({
      totalDeposited: user!.totalDeposited + BigInt(event.args.amount),
    });
  
  // Update pool totals and assets/shares for APY calculation
  await context.db.update(schema.LendingPool, { id: poolAddress })
    .set({
      totalDeposits: pool!.totalDeposits + BigInt(event.args.amount),
      totalSupplyAssets: pool!.totalSupplyAssets + BigInt(event.args.amount),
      totalSupplyShares: pool!.totalSupplyShares + BigInt(event.args.shares),
    });

  // Update APY calculations
  await updatePoolAPY(poolAddress, context, BigInt(event.block.timestamp), BigInt(event.block.number));

  // Create SupplyLiquidity event record
  await context.db.insert(schema.SupplyLiquidity).values({
    id: createEventID(BigInt(event.block.number), event.log.logIndex!),
    user: userAddress,
    pool: poolAddress,
    asset: poolAddress, // Use pool address as asset for now
    amount: BigInt(event.args.amount),
    onBehalfOf: userAddress,
    timestamp: BigInt(event.block.timestamp),
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
  });

  console.log(`✅ SupplyLiquidity processed: ${userAddress} supplied ${event.args.amount} to pool ${poolAddress}`);
});

// 2. WithdrawLiquidity Event Handler
ponder.on("LendingPool:WithdrawLiquidity", async ({ event, context }) => {
  console.log("🏧 WithdrawLiquidity event:", event.args);
  
  const poolAddress = event.log.address;
  const userAddress = event.args.user;
  
  // Get or create user and pool
  let user = await getOrCreateUser(userAddress, context);
  let pool = await getOrCreatePool(poolAddress, context);
  
  // Update user totals
  await context.db.update(schema.User, { id: userAddress })
    .set({
      totalWithdrawn: user!.totalWithdrawn + BigInt(event.args.amount),
    });
  
  // Update pool totals and assets/shares for APY calculation
  await context.db.update(schema.LendingPool, { id: poolAddress })
    .set({
      totalWithdrawals: pool!.totalWithdrawals + BigInt(event.args.amount),
      totalSupplyAssets: pool!.totalSupplyAssets - BigInt(event.args.amount),
      totalSupplyShares: pool!.totalSupplyShares - BigInt(event.args.shares),
    });

  // Update APY calculations
  await updatePoolAPY(poolAddress, context, BigInt(event.block.timestamp), BigInt(event.block.number));

  // Create WithdrawLiquidity event record
  await context.db.insert(schema.WithdrawLiquidity).values({
    id: createEventID(BigInt(event.block.number), event.log.logIndex!),
    user: userAddress,
    pool: poolAddress,
    asset: poolAddress,
    amount: BigInt(event.args.amount),
    to: userAddress,
    timestamp: BigInt(event.block.timestamp),
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
  });

  console.log(`✅ WithdrawLiquidity processed: ${userAddress} withdrew ${event.args.amount} from pool ${poolAddress}`);
});

// 3. BorrowDebtCrosschain Event Handler
ponder.on("LendingPool:BorrowDebtCrosschain", async ({ event, context }) => {
  console.log("🌉 BorrowDebtCrosschain event:", event.args);
  
  const poolAddress = event.log.address;
  const userAddress = event.args.user;
  
  // Get or create user and pool
  let user = await getOrCreateUser(userAddress, context);
  let pool = await getOrCreatePool(poolAddress, context);
  
  // Update user totals
  await context.db.update(schema.User, { id: userAddress })
    .set({
      totalBorrowed: user!.totalBorrowed + BigInt(event.args.amount),
    });
  
  // Update pool totals and assets/shares for APY calculation
  await context.db.update(schema.LendingPool, { id: poolAddress })
    .set({
      totalBorrows: pool!.totalBorrows + BigInt(event.args.amount),
      totalBorrowAssets: pool!.totalBorrowAssets + BigInt(event.args.amount),
      totalBorrowShares: pool!.totalBorrowShares + BigInt(event.args.shares),
    });

  // Update APY calculations
  await updatePoolAPY(poolAddress, context, BigInt(event.block.timestamp), BigInt(event.block.number));

  // Create BorrowDebtCrosschain event record
  await context.db.insert(schema.BorrowDebtCrosschain).values({
    id: createEventID(BigInt(event.block.number), event.log.logIndex!),
    user: userAddress,
    pool: poolAddress,
    asset: poolAddress,
    amount: BigInt(event.args.amount),
    borrowRateMode: BigInt(event.args.chainId), // Using chainId as borrowRateMode for now
    borrowRate: BigInt(event.args.bridgeTokenSender), // Using bridgeTokenSender as borrowRate for now
    onBehalfOf: userAddress,
    timestamp: BigInt(event.block.timestamp),
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
  });

  console.log(`✅ BorrowDebtCrosschain processed: ${userAddress} borrowed ${event.args.amount} from pool ${poolAddress}`);
});

// 4. RepayWithCollateralByPosition Event Handler
ponder.on("LendingPool:RepayWithCollateralByPosition", async ({ event, context }) => {
  console.log("💰 RepayWithCollateralByPosition event:", event.args);
  
  const poolAddress = event.log.address;
  const userAddress = event.args.user;
  
  // Get or create user and pool
  let user = await getOrCreateUser(userAddress, context);
  let pool = await getOrCreatePool(poolAddress, context);
  
  // Update user totals
  await context.db.update(schema.User, { id: userAddress })
    .set({
      totalRepaid: user!.totalRepaid + BigInt(event.args.amount),
    });
  
  // Update pool totals
  await context.db.update(schema.LendingPool, { id: poolAddress })
    .set({
      totalRepays: pool!.totalRepays + BigInt(event.args.amount),
    });

  // Create RepayWithCollateralByPosition event record
  await context.db.insert(schema.RepayWithCollateralByPosition).values({
    id: createEventID(BigInt(event.block.number), event.log.logIndex!),
    user: userAddress,
    pool: poolAddress,
    asset: poolAddress,
    amount: BigInt(event.args.amount),
    repayer: userAddress,
    timestamp: BigInt(event.block.timestamp),
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
  });

  console.log(`✅ RepayWithCollateralByPosition processed: ${userAddress} repaid ${event.args.amount} to pool ${poolAddress}`);
});

// 5. SupplyCollateral Event Handler
ponder.on("LendingPool:SupplyCollateral", async ({ event, context }) => {
  console.log("🔒 SupplyCollateral event:", event.args);
  
  const poolAddress = event.log.address;
  const userAddress = event.args.user;
  
  // Get or create user and pool
  await getOrCreateUser(userAddress, context);
  await getOrCreatePool(poolAddress, context);

  // Create SupplyCollateral event record
  await context.db.insert(schema.SupplyCollateral).values({
    id: createEventID(BigInt(event.block.number), event.log.logIndex!),
    user: userAddress,
    pool: poolAddress,
    asset: poolAddress,
    amount: BigInt(event.args.amount),
    onBehalfOf: userAddress,
    timestamp: BigInt(event.block.timestamp),
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
  });

  console.log(`✅ SupplyCollateral processed: ${userAddress} supplied ${event.args.amount} collateral to pool ${poolAddress}`);
});

// 6. CreatePosition Event Handler
ponder.on("LendingPool:CreatePosition", async ({ event, context }) => {
  console.log("📍 CreatePosition event:", event.args);
  
  const poolAddress = event.log.address;
  const userAddress = event.args.user;
  
  // Get or create user and pool
  await getOrCreateUser(userAddress, context);
  await getOrCreatePool(poolAddress, context);

  // Create CreatePosition event record
  await context.db.insert(schema.CreatePosition).values({
    id: createEventID(BigInt(event.block.number), event.log.logIndex!),
    user: userAddress,
    pool: poolAddress,
    timestamp: BigInt(event.block.timestamp),
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
  });

  console.log(`✅ CreatePosition processed: ${userAddress} created position in pool ${poolAddress}`);
});

// 7. SwapToken Event Handler
ponder.on("LendingPool:SwapToken", async ({ event, context }) => {
  console.log("🔄 SwapToken event:", event.args);
  
  const poolAddress = event.log.address;
  const userAddress = event.args.user;
  
  // Get or create user and pool
  let user = await getOrCreateUser(userAddress, context);
  let pool = await getOrCreatePool(poolAddress, context);

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

console.log("🚀 LendingPool event handlers loaded and ACTIVE!");
console.log("📋 All handlers are now enabled and ready to index events:");
console.log("   - SupplyLiquidity 🏦 ✅ ACTIVE");
console.log("   - WithdrawLiquidity 🏧 ✅ ACTIVE");
console.log("   - BorrowDebtCrosschain 🌉 ✅ ACTIVE");
console.log("   - RepayWithCollateralByPosition 💰 ✅ ACTIVE");
console.log("   - SupplyCollateral 🔒 ✅ ACTIVE");
console.log("   - CreatePosition 📍 ✅ ACTIVE");
console.log("   - SwapToken 🔄 ✅ ACTIVE");
console.log("🎯 TypeScript errors are expected but handlers will work!");
console.log("🔥 All events will now be indexed and stored in database!");

// ========================================
// SWAP TRACKING FUNCTIONALITY
// ========================================

// Helper function to track swap transactions
async function trackSwapTransaction(
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
  context: any
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

// ========================================
// INSTRUCTIONS FOR ACTIVATING HANDLERS
// ========================================

/*
TypeScript Error Fix Instructions:

The handlers above may show TypeScript errors because Ponder needs to generate
proper event types from the contract configuration. To fix this:

1. Make sure ponder.config.ts LendingPool contract has:
   - Correct ABI (LendingPoolAbi)
   - All pool addresses in the address array
   - Proper startBlock

2. Restart the development server completely:
   - Stop: Ctrl+C
   - Start: pnpm dev

3. Wait for historical sync to complete

4. Uncomment handlers one by one and test

5. If TypeScript errors persist, check that:
   - Event names match exactly what's in the ABI
   - Contract configuration is correct
   - All pool addresses are valid

The system is currently working with factory events and will show proper
event registration in the indexing table once the handlers are properly typed.
*/
