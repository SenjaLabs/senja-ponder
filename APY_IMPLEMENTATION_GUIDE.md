# APY Implementation Guide

## Overview
Sistem APY (Annual Percentage Yield) ini menyediakan perhitungan tingkat bunga yang akurat untuk lending protocol, termasuk supply APY, borrow APY, dan utilization rate.

## 🔧 Components

### 1. APY Calculator (`src/apyCalculator.ts`)
Utility functions untuk perhitungan APY:
- **Interest Rate Model**: Konfigurasi untuk base rate, multiplier, dan jump rate
- **Utilization Rate**: Perhitungan tingkat pemanfaatan pool
- **Borrow Rate**: Tingkat bunga pinjaman berdasarkan utilization
- **Supply Rate**: Tingkat bunga untuk supplier
- **APY Calculation**: Konversi dari annual rate ke compound APY

### 2. Database Schema
Tables baru untuk tracking APY:

```typescript
// Pool dengan field APY
export const LendingPool = onchainTable("LendingPool", (t) => ({
  // ... existing fields
  totalSupplyAssets: t.bigint().notNull().default(0n),
  totalSupplyShares: t.bigint().notNull().default(0n),
  totalBorrowAssets: t.bigint().notNull().default(0n),
  totalBorrowShares: t.bigint().notNull().default(0n),
  utilizationRate: t.integer().notNull().default(0),
  supplyRate: t.integer().notNull().default(0),
  borrowRate: t.integer().notNull().default(0),
  lastAccrued: t.bigint().notNull().default(0n),
}));

// Snapshot APY per jam
export const PoolAPYSnapshot = onchainTable("PoolAPYSnapshot", (t) => ({
  id: t.text().primaryKey(),
  pool: t.text().notNull(),
  supplyAPY: t.integer().notNull(),
  borrowAPY: t.integer().notNull(),
  utilizationRate: t.integer().notNull(),
  totalSupplyAssets: t.bigint().notNull(),
  totalBorrowAssets: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
}));

// Interest accrual events
export const InterestAccrual = onchainTable("InterestAccrual", (t) => ({
  id: t.text().primaryKey(),
  pool: t.text().notNull(),
  previousSupplyAssets: t.bigint().notNull(),
  newSupplyAssets: t.bigint().notNull(),
  previousBorrowAssets: t.bigint().notNull(),
  newBorrowAssets: t.bigint().notNull(),
  interestEarned: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
}));
```

### 3. Event Handler Integration
Setiap event handler sekarang:
- ✅ Update assets/shares untuk APY calculation
- ✅ Trigger APY recalculation
- ✅ Create hourly APY snapshots
- ✅ Record interest accrual events

## 📊 Interest Rate Model

### Default Parameters
```typescript
export const DEFAULT_INTEREST_MODEL = {
  baseRate: 200,        // 2% base rate
  multiplier: 500,      // 5% multiplier
  jumpMultiplier: 10000, // 100% jump multiplier
  optimalUtilization: 8000, // 80% optimal utilization
};
```

### Rate Calculation
```
Utilization Rate = Total Borrows / Total Supply

If utilization <= optimal:
  Borrow Rate = Base Rate + (Multiplier × Utilization / 100%)

If utilization > optimal:
  Borrow Rate = Base Rate + Multiplier + (Jump Multiplier × Excess Utilization / 100%)

Supply Rate = Borrow Rate × Utilization × (1 - Reserve Factor)
```

### APY Conversion
```
APY = (1 + Annual Rate / Compounding Periods)^Compounding Periods - 1
```

## 🔄 Automatic Updates

### Event-Driven Updates
APY diupdate otomatis pada setiap:
- ✅ Supply Liquidity
- ✅ Withdraw Liquidity  
- ✅ Borrow Debt
- ✅ Repay Debt
- ✅ Swap Token

### Hourly Snapshots
- APY snapshot dibuat setiap jam
- Menyimpan historical data untuk analytics
- Berguna untuk charting dan trend analysis

### Interest Accrual
- Compound interest dihitung berdasarkan waktu
- Interest earned ditambahkan ke supply assets
- Events dicatat untuk audit trail

## 📈 GraphQL Queries

### Get Pool APY
```graphql
query GetPoolAPY($poolId: String!) {
  lendingPool(id: $poolId) {
    id
    address
    utilizationRate
    supplyRate
    borrowRate
    totalSupplyAssets
    totalBorrowAssets
    lastAccrued
  }
}
```

### Get APY History
```graphql
query GetAPYHistory($poolId: String!, $since: BigInt!) {
  poolAPYSnapshots(
    where: { 
      pool: $poolId, 
      timestamp: { gte: $since } 
    }
    orderBy: "timestamp"
    orderDirection: "asc"
  ) {
    items {
      supplyAPY
      borrowAPY
      utilizationRate
      timestamp
      totalSupplyAssets
      totalBorrowAssets
    }
  }
}
```

### Get Interest Accruals
```graphql
query GetInterestAccruals($poolId: String!) {
  interestAccruals(
    where: { pool: $poolId }
    orderBy: "timestamp"
    orderDirection: "desc"
    limit: 50
  ) {
    items {
      interestEarned
      previousSupplyAssets
      newSupplyAssets
      timestamp
      blockNumber
    }
  }
}
```

## 🛠️ API Functions

### Get Current APY
```typescript
import { getCurrentAPY } from './src/api/apyAPI';

const apyData = await getCurrentAPY(poolAddress, db);
console.log(`Supply APY: ${apyData.supplyAPY}`);
console.log(`Borrow APY: ${apyData.borrowAPY}`);
```

### Get APY History
```typescript
import { getAPYHistory } from './src/api/apyAPI';

const history = await getAPYHistory(poolAddress, "24h", db);
console.log(`${history.snapshots.length} snapshots in 24h`);
```

### Get All Pools APY
```typescript
import { getAllPoolsAPY } from './src/api/apyAPI';

const pools = await getAllPoolsAPY(db);
pools.pools.forEach(pool => {
  console.log(`${pool.address}: ${pool.supplyAPY} supply APY`);
});
```

## 🎯 Usage Examples

### Pool Analytics Class
```typescript
import { PoolAnalytics } from './src/apyCalculator';

const analytics = new PoolAnalytics(
  totalSupplyAssets,
  totalSupplyShares,
  totalBorrowAssets,
  totalBorrowShares,
  lastAccrued,
  currentTimestamp
);

console.log("Current Rates:");
console.log(`Supply APY: ${analytics.supplyAPY / 100}%`);
console.log(`Borrow APY: ${analytics.borrowAPY / 100}%`);
console.log(`Utilization: ${analytics.utilizationRate / 100}%`);

// Calculate accrued interest
const accrual = analytics.calculateAccruedInterest();
console.log(`Interest earned: ${accrual.interestEarned}`);
```

### Custom Interest Model
```typescript
const customModel = {
  baseRate: 100,        // 1% base
  multiplier: 800,      // 8% multiplier
  jumpMultiplier: 15000, // 150% jump
  optimalUtilization: 7500, // 75% optimal
};

const analytics = new PoolAnalytics(
  // ... pool data ...
  customModel
);
```

## 📊 Frontend Integration

### Real-time APY Display
```javascript
// Fetch current APY
async function fetchPoolAPY(poolAddress) {
  const query = `
    query GetPoolAPY($poolId: String!) {
      lendingPool(id: $poolId) {
        utilizationRate
        supplyRate
        borrowRate
        totalSupplyAssets
        totalBorrowAssets
      }
    }
  `;
  
  const result = await graphql(query, { poolId: poolAddress });
  return result.lendingPool;
}

// Convert rates to APY for display
function calculateDisplayAPY(rate) {
  return ((1 + rate / 10000 / 365) ** 365 - 1) * 100;
}
```

### APY Chart Data
```javascript
// Fetch APY history for charts
async function fetchAPYChart(poolAddress, timeframe = "7d") {
  const since = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
  
  const query = `
    query GetAPYHistory($poolId: String!, $since: BigInt!) {
      poolAPYSnapshots(
        where: { pool: $poolId, timestamp: { gte: $since } }
        orderBy: "timestamp"
      ) {
        items {
          supplyAPY
          borrowAPY
          utilizationRate
          timestamp
        }
      }
    }
  `;
  
  const result = await graphql(query, { poolId: poolAddress, since });
  return result.poolAPYSnapshots.items.map(item => ({
    timestamp: new Date(Number(item.timestamp) * 1000),
    supplyAPY: item.supplyAPY / 100,
    borrowAPY: item.borrowAPY / 100,
    utilization: item.utilizationRate / 100
  }));
}
```

## 🚀 Benefits

### For Users
- ✅ **Real-time APY**: Always current interest rates
- ✅ **Historical Data**: Track APY trends over time
- ✅ **Accurate Calculations**: Compound interest with precision
- ✅ **Transparent**: All calculations are on-chain verifiable

### For Protocol
- ✅ **Dynamic Rates**: Automatic adjustment based on utilization
- ✅ **Risk Management**: Jump rate prevents excessive borrowing
- ✅ **Analytics**: Comprehensive data for decision making
- ✅ **Efficiency**: Optimized for minimal gas usage

### For Developers
- ✅ **Easy Integration**: Simple API functions
- ✅ **GraphQL Support**: Flexible query capabilities
- ✅ **TypeScript**: Full type safety
- ✅ **Customizable**: Configurable interest rate models

## 🔧 Configuration

### Environment Variables
```env
# APY calculation frequency (in seconds)
APY_UPDATE_FREQUENCY=3600

# Default reserve factor (in basis points)
DEFAULT_RESERVE_FACTOR=1000

# Interest rate model parameters
BASE_RATE=200
MULTIPLIER=500
JUMP_MULTIPLIER=10000
OPTIMAL_UTILIZATION=8000
```

### Smart Contract Requirements
Untuk APY system bekerja optimal, smart contract harus:

1. **Emit Events**: Supply, withdraw, borrow, repay events
2. **Track Shares**: Implement proper share/asset accounting
3. **Accrual Function**: Call `accrueInterest()` before operations
4. **Rate Functions**: Expose current rates for verification

## 📝 Monitoring

### Logs to Watch
```
📊 APY Updated for pool 0x123...abc:
   Supply APY: 5.25%
   Borrow APY: 8.75%
   Utilization: 60.00%
   Interest Earned: 1234567890
```

### Health Checks
- Utilization rate should be reasonable (0-100%)
- APY rates should respond to market conditions
- Interest accrual should be consistent
- Snapshot creation should be regular

## 🎯 Ready to Use

APY system sekarang fully implemented dan siap untuk:
- ✅ Real-time interest rate calculation
- ✅ Historical APY tracking
- ✅ GraphQL data access
- ✅ API function integration
- ✅ Frontend display support

Next step: Test dengan real transactions dan verify accuracy!
