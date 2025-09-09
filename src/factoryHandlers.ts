import { ponder } from "ponder:registry";
import * as schema from "../ponder.schema";

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
    created: BigInt(event.block.timestamp),
  }).onConflictDoNothing(); // Jika sudah ada, jangan insert lagi

  // Catat event creation menggunakan schema yang ada
  const eventId = createEventID(BigInt(event.block.number), event.log.logIndex);
  
  await context.db.insert(schema.LendingPoolCreated).values({
    id: eventId,
    lendingPool: poolAddress,
    collateralToken: collateralToken,
    borrowToken: borrowToken,
    ltv: ltv,
    timestamp: BigInt(event.block.timestamp),
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
  });

  // Update atau create factory record
  const factory = await context.db.find(schema.LendingPoolFactory, { id: factoryAddress });
  
  if (!factory) {
    await context.db.insert(schema.LendingPoolFactory).values({
      id: factoryAddress,
      address: factoryAddress,
      totalPoolsCreated: 1n,
      created: BigInt(event.block.timestamp),
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
