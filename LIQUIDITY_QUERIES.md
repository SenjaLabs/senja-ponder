# Liquidity Queries Guide

## Total Liquidity Overview

### 1. Pool-Level Total Liquidity
```graphql
query GetPoolLiquidity {
  lendingPools(
    orderBy: "totalSupplyAssets", 
    orderDirection: "desc",
    limit: 10
  ) {
    items {
      id
      address
      totalDeposits
      totalWithdrawals
      totalSupplyAssets
      totalSupplyShares
      totalBorrows
      totalRepays
      utilizationRate
      supplyRate
      borrowRate
      lastAccrued
      created
    }
  }
}
```

### 2. Real-time Total Liquidity Calculation
```graphql
query GetTotalLiquidityAcrossAllPools {
  lendingPools {
    items {
      address
      totalSupplyAssets
      totalBorrows
      utilizationRate
    }
  }
}
```

### 3. Recent Liquidity Events
```graphql
query GetRecentLiquidityEvents {
  supplyLiquiditys(
    orderBy: "blockNumber", 
    orderDirection: "desc", 
    limit: 20
  ) {
    items {
      id
      user
      pool
      asset
      amount
      shares
      blockNumber
      timestamp
      transactionHash
    }
  }
}
```

### 4. Pool Liquidity with APY Data
```graphql
query GetPoolLiquidityWithAPY {
  lendingPools {
    items {
      address
      totalSupplyAssets
      totalBorrows
      utilizationRate
      supplyRate
      borrowRate
    }
  }
  poolAPYSnapshots(
    orderBy: "timestamp", 
    orderDirection: "desc", 
    limit: 10
  ) {
    items {
      pool
      supplyAPY
      borrowAPY
      utilizationRate
      totalSupplyAssets
      totalBorrowAssets
      timestamp
    }
  }
}
```

### 5. User-Specific Liquidity Positions
```graphql
query GetUserLiquidityPositions($userAddress: String!) {
  supplyLiquiditys(
    where: { user: $userAddress },
    orderBy: "timestamp",
    orderDirection: "desc"
  ) {
    items {
      pool
      amount
      shares
      timestamp
    }
  }
  withdrawLiquiditys(
    where: { user: $userAddress },
    orderBy: "timestamp", 
    orderDirection: "desc"
  ) {
    items {
      pool
      amount
      shares
      timestamp
    }
  }
}
```

## JavaScript/TypeScript Functions

### Total Liquidity Calculator
```typescript
interface PoolLiquidity {
  address: string;
  totalSupplyAssets: string;
  totalBorrows: string;
  utilizationRate: number;
}

async function getTotalLiquidity(): Promise<{
  totalSupplied: bigint;
  totalBorrowed: bigint;
  totalAvailable: bigint;
  avgUtilization: number;
}> {
  const query = `
    query {
      lendingPools {
        items {
          address
          totalSupplyAssets
          totalBorrows
          utilizationRate
        }
      }
    }
  `;
  
  const response = await fetch('http://localhost:42069/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  
  const data = await response.json();
  const pools = data.data.lendingPools.items;
  
  let totalSupplied = 0n;
  let totalBorrowed = 0n;
  let totalUtilization = 0;
  
  for (const pool of pools) {
    totalSupplied += BigInt(pool.totalSupplyAssets);
    totalBorrowed += BigInt(pool.totalBorrows);
    totalUtilization += pool.utilizationRate;
  }
  
  const avgUtilization = pools.length > 0 ? totalUtilization / pools.length : 0;
  const totalAvailable = totalSupplied - totalBorrowed;
  
  return {
    totalSupplied,
    totalBorrowed,
    totalAvailable,
    avgUtilization
  };
}
```

### Pool-Specific Liquidity
```typescript
async function getPoolLiquidity(poolAddress: string) {
  const query = `
    query GetPoolLiquidity($poolAddress: String!) {
      lendingPools(where: { address: $poolAddress }) {
        items {
          address
          totalSupplyAssets
          totalSupplyShares
          totalBorrows
          totalBorrowAssets
          utilizationRate
          supplyRate
          borrowRate
          lastAccrued
        }
      }
    }
  `;
  
  const response = await fetch('http://localhost:42069/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      query,
      variables: { poolAddress }
    })
  });
  
  const data = await response.json();
  return data.data.lendingPools.items[0];
}
```

### Real-time Liquidity Updates
```typescript
async function getRealtimeLiquidityUpdates(fromTimestamp?: number) {
  const whereClause = fromTimestamp 
    ? `where: { timestamp_gte: "${fromTimestamp}" }` 
    : '';
    
  const query = `
    query GetRecentLiquidityUpdates {
      supplyLiquiditys(
        ${whereClause}
        orderBy: "timestamp", 
        orderDirection: "desc", 
        limit: 100
      ) {
        items {
          pool
          amount
          shares
          timestamp
          blockNumber
        }
      }
      withdrawLiquiditys(
        ${whereClause}
        orderBy: "timestamp", 
        orderDirection: "desc", 
        limit: 100
      ) {
        items {
          pool
          amount
          shares
          timestamp
          blockNumber
        }
      }
    }
  `;
  
  const response = await fetch('http://localhost:42069/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  
  return response.json();
}
```

## Command Line Examples

### Quick Total Liquidity Check
```bash
curl -X POST http://localhost:42069/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { lendingPools { items { totalSupplyAssets totalBorrows utilizationRate } } }"
  }' | jq '.data.lendingPools.items[] | {totalSupplyAssets, totalBorrows, utilizationRate}'
```

### Recent Liquidity Events
```bash
curl -X POST http://localhost:42069/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { supplyLiquiditys(orderBy: \"timestamp\", orderDirection: \"desc\", limit: 5) { items { user pool amount shares timestamp } } }"
  }'
```