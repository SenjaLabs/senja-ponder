# User Position Tracking Queries

This document shows how to query individual user positions using the new UserCollateral and UserBorrow tables.

## GraphQL Queries

### 1. Get All User Borrow Positions

```graphql
query GetUserBorrowPositions($userAddress: String!) {
  userBorrows(where: { user: $userAddress, isActive: true }) {
    id
    user
    pool
    asset
    totalBorrowedAmount
    totalBorrowedValue
    accruedInterest
    borrowRate
    borrowRateMode
    healthFactor
    isActive
    lastAccrued
    lastUpdated
    createdAt
  }
}
```

### 2. Get User Collateral Positions

```graphql
query GetUserCollateralPositions($userAddress: String!) {
  userCollaterals(where: { user: $userAddress, isActive: true }) {
    id
    user
    pool
    asset
    totalCollateralAmount
    totalCollateralValue
    collateralFactor
    isActive
    lastUpdated
    createdAt
  }
}
```

### 3. Get User Positions in Specific Pool

```graphql
query GetUserPoolPositions($userAddress: String!, $poolAddress: String!) {
  userBorrows(where: { user: $userAddress, pool: $poolAddress, isActive: true }) {
    id
    totalBorrowedAmount
    accruedInterest
    borrowRate
    healthFactor
    lastAccrued
  }
  
  userCollaterals(where: { user: $userAddress, pool: $poolAddress, isActive: true }) {
    id
    totalCollateralAmount
    collateralFactor
    lastUpdated
  }
}
```

### 4. Get All Active Borrow Positions Across All Users

```graphql
query GetAllActiveBorrowPositions {
  userBorrows(where: { isActive: true }, orderBy: { totalBorrowedAmount: "desc" }) {
    id
    user
    pool
    asset
    totalBorrowedAmount
    accruedInterest
    borrowRate
    healthFactor
    lastAccrued
  }
}
```

### 5. Get Users with Low Health Factors

```graphql
query GetUsersWithLowHealthFactor($threshold: String!) {
  userBorrows(
    where: { 
      isActive: true, 
      healthFactor: { lt: $threshold } 
    },
    orderBy: { healthFactor: "asc" }
  ) {
    id
    user
    pool
    totalBorrowedAmount
    healthFactor
    lastAccrued
  }
}
```

### 6. Get User's Total Debt Across All Pools

```graphql
query GetUserTotalDebt($userAddress: String!) {
  userBorrows(where: { user: $userAddress, isActive: true }) {
    pool
    asset
    totalBorrowedAmount
    accruedInterest
    borrowRate
  }
}
```

## Usage Examples

### Check if user has borrowed in a specific pool

```typescript
// Query to check user's current debt
const userDebt = await ponder.db
  .select()
  .from(UserBorrow)
  .where(
    and(
      eq(UserBorrow.user, userAddress),
      eq(UserBorrow.pool, poolAddress),
      eq(UserBorrow.isActive, true)
    )
  );

if (userDebt.length > 0) {
  console.log(`User owes: ${userDebt[0].totalBorrowedAmount.toString()}`);
}
```

### Monitor users with risky positions

```typescript
// Find users with health factor < 1.2 (risky)
const riskyPositions = await ponder.db
  .select()
  .from(UserBorrow)
  .where(
    and(
      eq(UserBorrow.isActive, true),
      lt(UserBorrow.healthFactor, 1200000000000000000n) // 1.2 * 1e18
    )
  );
```

## Key Fields Explained

### UserBorrow Table
- `totalBorrowedAmount`: Current amount owed (principal + accrued interest)
- `accruedInterest`: Total interest accumulated over time
- `borrowRate`: Current interest rate in basis points
- `healthFactor`: Position health (scaled by 1e18, >1e18 is healthy)
- `lastAccrued`: Last time interest was calculated

### UserCollateral Table  
- `totalCollateralAmount`: Amount of collateral deposited
- `collateralFactor`: LTV ratio in basis points (7500 = 75%)
- `totalCollateralValue`: USD value of collateral (if price feed available)

## Real-time Updates

The positions are updated automatically when:
- User borrows more debt (BorrowDebtCrosschain event)
- User repays debt (RepayWithCollateralByPosition event)  
- User supplies collateral (SupplyCollateral event)
- Interest accrues over time

## Asset Addresses

Currently the `asset` field uses the pool address as a placeholder. In production, this should be:
- For collateral: the collateral token contract address
- For borrows: the debt token contract address

This allows tracking multiple assets within the same pool.
