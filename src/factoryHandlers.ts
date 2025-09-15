import { ponder } from "ponder:registry";
import * as schema from "../ponder.schema";
import { createPublicClient, http } from 'viem';
import { LendingPoolAbi } from '../abis/LendingPoolAbi';

// Setup client untuk query router address
const client = createPublicClient({
  transport: http('https://rpc.ankr.com/kaia')
});

// Helper function untuk membuat event ID
function createEventID(blockNumber: bigint, logIndex: number): string {
  return `${blockNumber.toString()}-${logIndex.toString()}`;
}

// Handler untuk LendingPoolCreated event dari Factory
ponder.on("LendingPoolFactory:LendingPoolCreated", async ({ event, context }) => {
  console.log(`🏭 New Lending Pool Created: ${event.args.lendingPool}`);
  
  const poolAddress = event.args.lendingPool;
  const collateralToken = event.args.collateralToken;
  const borrowToken = event.args.borrowToken;
  const ltv = event.args.ltv;
  const factoryAddress = event.log.address;
  const timestamp = BigInt(event.block.timestamp);
  const blockNumber = BigInt(event.block.number);
  
  // Query router address dari pool yang baru dibuat
  let routerAddress: string | null = null;
  try {
    routerAddress = await client.readContract({
      address: poolAddress as `0x${string}`,
      abi: LendingPoolAbi,
      functionName: 'router',
    }) as string;
    
    console.log(`🤖 Router discovered for pool ${poolAddress}: ${routerAddress}`);
  } catch (error) {
    console.error(`❌ Failed to get router for pool ${poolAddress}:`, error);
  }

  // Create atau update pool di database
  await context.db.insert(schema.LendingPool).values({
    id: poolAddress,
    address: poolAddress,
    factory: factoryAddress, // Factory address
    token0: collateralToken,
    token1: borrowToken,
    totalDeposits: 0n,
    totalWithdrawals: 0n,
    totalBorrows: 0n,
    totalRepays: 0n,
    totalSwaps: 0n,
    // APY tracking fields
    totalSupplyAssets: 0n,
    totalSupplyShares: 0n,
    totalLiquidity: 0n,
    totalBorrowAssets: 0n,
    totalBorrowShares: 0n,
    utilizationRate: 0,
    supplyAPY: 0,
    borrowAPY: 0,
    supplyRate: 0,
    borrowRate: 0,
    lastAccrued: timestamp,
    created: timestamp,
  }).onConflictDoNothing(); // Jika sudah ada, jangan insert lagi

  // Simpan mapping pool-to-router jika berhasil mendapatkan router
  if (routerAddress) {
    await context.db.insert(schema.PoolRouter).values({
      id: poolAddress,
      poolAddress: poolAddress,
      routerAddress: routerAddress,
      isActive: true,
      discoveredAt: timestamp,
      blockNumber: blockNumber,
    }).onConflictDoNothing(); // Jika sudah ada, jangan replace
    
    console.log(`📝 Pool-Router mapping saved: ${poolAddress} -> ${routerAddress}`);
  }

  // Catat event creation menggunakan schema yang ada
  const eventId = createEventID(blockNumber, event.log.logIndex);
  
  await context.db.insert(schema.LendingPoolCreated).values({
    id: eventId,
    lendingPool: poolAddress,
    collateralToken: collateralToken,
    borrowToken: borrowToken,
    ltv: ltv,
    timestamp: timestamp,
    blockNumber: blockNumber,
    transactionHash: event.transaction.hash,
  });

  // Update atau create factory record
  const factory = await context.db.find(schema.LendingPoolFactory, { id: factoryAddress });
  
  if (!factory) {
    await context.db.insert(schema.LendingPoolFactory).values({
      id: factoryAddress,
      address: factoryAddress,
      totalPoolsCreated: 1n,
      created: timestamp,
    });
  } else {
    await context.db.update(schema.LendingPoolFactory, { id: factoryAddress })
      .set({
        totalPoolsCreated: factory.totalPoolsCreated + 1n,
      });
  }

  console.log(`✅ Pool ${poolAddress} telah dicatat dengan tokens: ${collateralToken}/${borrowToken}`);
  console.log(`📊 Factory ${factoryAddress} sekarang memiliki ${factory ? factory.totalPoolsCreated + 1n : 1n} pools`);
});
