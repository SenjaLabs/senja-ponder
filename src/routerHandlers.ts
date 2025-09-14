import { ponder } from "ponder:registry";
import * as schema from "../ponder.schema";

// Helper functions
function createEventID(blockNumber: bigint, logIndex: number): string {
  return `${blockNumber.toString()}-${logIndex.toString()}`;
}

// ========================================
// LENDING POOL ROUTER EVENT HANDLERS
// ========================================

// EmergencyPositionReset Event Handler
ponder.on("LendingPoolRouter:EmergencyPositionReset", async ({ event, context }) => {
  console.log("🚨 EmergencyPositionReset event:", event.args);
  
  const routerAddress = event.log.address;
  const userAddress = event.args.user;
  const timestamp = BigInt(event.block.timestamp);
  
  // Create emergency position reset event record
  await context.db.insert(schema.EmergencyPositionReset).values({
    id: createEventID(BigInt(event.block.number), event.log.logIndex!),
    user: userAddress,
    router: routerAddress,
    timestamp: timestamp,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
  });

  console.log(`✅ EmergencyPositionReset processed: ${userAddress} position reset via router ${routerAddress}`);
});

// PositionLiquidated Event Handler  
ponder.on("LendingPoolRouter:PositionLiquidated", async ({ event, context }) => {
  console.log("💥 PositionLiquidated event:", event.args);
  
  const routerAddress = event.log.address;
  const userAddress = event.args.user;
  const sharesRemoved = BigInt(event.args.sharesRemoved);
  const debtRepaid = BigInt(event.args.debtRepaid);
  const timestamp = BigInt(event.block.timestamp);
  
  // Create position liquidated event record
  await context.db.insert(schema.PositionLiquidated).values({
    id: createEventID(BigInt(event.block.number), event.log.logIndex!),
    user: userAddress,
    router: routerAddress,
    sharesRemoved: sharesRemoved,
    debtRepaid: debtRepaid,
    timestamp: timestamp,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
  });

  console.log(`✅ PositionLiquidated processed: ${userAddress} liquidated ${sharesRemoved.toString()} shares, ${debtRepaid.toString()} debt repaid via router ${routerAddress}`);
});