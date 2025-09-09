# Swap Indexing Guide

## Overview
This guide explains how swap functionality has been integrated into the Senja lending protocol indexing system.

## Changes Made

### 1. Database Schema Updates
- **User Schema**: Added `totalSwapped` field to track total swap volume per user
- **LendingPool Schema**: Added `totalSwaps` field to track total swap volume per pool
- **SwapToken Schema**: New table to store individual swap transactions

### 2. ABI Updates
Added `SwapToken` event to `LendingPoolAbi.ts`:
```typescript
{
  inputs: [
    { name: "user", internalType: "address", type: "address" },
    { name: "tokenFrom", internalType: "address", type: "address" },
    { name: "tokenTo", internalType: "address", type: "address" },
    { name: "amountIn", internalType: "uint256", type: "uint256" },
    { name: "amountOut", internalType: "uint256", type: "uint256" },
  ],
  name: "SwapToken",
  anonymous: false,
  type: "event",
}
```

### 3. Event Handler
Added `SwapToken` event handler in `lendingPoolHandlers.ts`:
- Tracks individual swap transactions
- Updates user swap statistics
- Updates pool swap statistics
- Stores detailed swap information

## Database Tables

### SwapToken Table
Stores individual swap transactions with the following fields:
- `id`: Unique identifier (blockNumber-logIndex)
- `user`: Address of the user performing the swap
- `pool`: Address of the lending pool
- `tokenFrom`: Address of the input token
- `tokenTo`: Address of the output token
- `amountIn`: Amount of input tokens
- `amountOut`: Amount of output tokens received
- `timestamp`: Block timestamp
- `blockNumber`: Block number
- `transactionHash`: Transaction hash

### Updated User Table
- Added `totalSwapped`: Total amount of tokens swapped by user

### Updated LendingPool Table
- Added `totalSwaps`: Total amount of tokens swapped in pool

## GraphQL Queries

You can now query swap data using GraphQL:

```graphql
# Get all swaps
query GetSwaps {
  swapTokens {
    id
    user
    pool
    tokenFrom
    tokenTo
    amountIn
    amountOut
    timestamp
    blockNumber
    transactionHash
  }
}

# Get user with swap statistics
query GetUserWithSwaps($userId: String!) {
  user(id: $userId) {
    id
    address
    totalSwapped
    totalDeposited
    totalWithdrawn
    totalBorrowed
    totalRepaid
  }
}

# Get pool with swap statistics
query GetPoolWithSwaps($poolId: String!) {
  lendingPool(id: $poolId) {
    id
    address
    totalSwaps
    totalDeposits
    totalWithdrawals
    totalBorrows
    totalRepays
  }
}
```

## Implementation Notes

### Smart Contract Requirement
For this indexing to work, the smart contract must emit the `SwapToken` event when the `swapTokenByPosition` function is called. If the current contract doesn't emit this event, you'll need to:

1. Update the smart contract to emit the event
2. Redeploy the contract
3. Update the contract addresses in `ponder.config.ts`

### Alternative Approaches
If you cannot update the smart contract, consider these alternatives:

1. **Track ERC20 Transfer events**: Monitor token transfers that might indicate swaps
2. **Transaction analysis**: Analyze transaction input data to detect swap function calls
3. **Off-chain tracking**: Use external APIs or services to track swap activities

## Testing

To test the swap indexing:

1. Ensure your smart contract emits the `SwapToken` event
2. Restart the Ponder development server:
   ```bash
   pnpm dev
   ```
3. Perform swap transactions on your contract
4. Check the indexing logs for swap event processing
5. Query the database to verify swap data is being stored

## Monitoring

The system will log swap events with:
```
🔄 SwapToken event: [event data]
✅ SwapToken processed: [user] swapped [amount] [tokenFrom] for [amount] [tokenTo] in pool [pool]
```

Active handlers now include:
- SupplyLiquidity 🏦 ✅ ACTIVE
- WithdrawLiquidity 🏧 ✅ ACTIVE  
- BorrowDebtCrosschain 🌉 ✅ ACTIVE
- RepayWithCollateralByPosition 💰 ✅ ACTIVE
- SupplyCollateral 🔒 ✅ ACTIVE
- CreatePosition 📍 ✅ ACTIVE
- **SwapToken 🔄 ✅ ACTIVE** (NEW)
