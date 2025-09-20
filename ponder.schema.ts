import { onchainTable } from "ponder";

export const LendingPool = onchainTable("LendingPool", (t) => ({
  id: t.text().primaryKey(),
  address: t.text().notNull(),
  factory: t.text().notNull(),
  token0: t.text().notNull(),
  token1: t.text().notNull(),
  totalDeposits: t.bigint().notNull().default(0n),
  totalWithdrawals: t.bigint().notNull().default(0n),
  totalBorrows: t.bigint().notNull().default(0n),
  totalRepays: t.bigint().notNull().default(0n),
  totalSwaps: t.bigint().notNull().default(0n),
  // APY tracking fields
  totalSupplyAssets: t.bigint().notNull().default(0n),
  totalSupplyShares: t.bigint().notNull().default(0n),
  totalLiquidity: t.bigint().notNull().default(0n), // Available liquidity (totalSupplyAssets - totalBorrowAssets)
  totalBorrowAssets: t.bigint().notNull().default(0n),
  totalBorrowShares: t.bigint().notNull().default(0n),
  utilizationRate: t.integer().notNull().default(0), // in basis points (0-10000)
  supplyAPY: t.integer().notNull().default(0), // in basis points (1% = 100)
  borrowAPY: t.integer().notNull().default(0), // in basis points (1% = 100)
  supplyRate: t.integer().notNull().default(0), // in basis points per year
  borrowRate: t.integer().notNull().default(0), // in basis points per year
  lastAccrued: t.bigint().notNull().default(0n),
  created: t.bigint().notNull(),
}));

export const User = onchainTable("User", (t) => ({
  id: t.text().primaryKey(),
  address: t.text().notNull(),
  totalDeposited: t.bigint().notNull().default(0n),
  totalWithdrawn: t.bigint().notNull().default(0n),
  totalBorrowed: t.bigint().notNull().default(0n),
  totalRepaid: t.bigint().notNull().default(0n),
  totalSwapped: t.bigint().notNull().default(0n),
}));

export const LendingPoolFactory = onchainTable("LendingPoolFactory", (t) => ({
  id: t.text().primaryKey(),
  address: t.text().notNull(),
  totalPoolsCreated: t.bigint().notNull().default(0n),
  created: t.bigint().notNull(),
}));

export const LendingPoolCreated = onchainTable("LendingPoolCreated", (t) => ({
  id: t.text().primaryKey(),
  lendingPool: t.text().notNull(),
  collateralToken: t.text().notNull(),
  borrowToken: t.text().notNull(),
  ltv: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
}));

export const SupplyLiquidity = onchainTable("SupplyLiquidity", (t) => ({
  id: t.text().primaryKey(),
  user: t.text().notNull(),
  pool: t.text().notNull(),
  asset: t.text().notNull(),
  amount: t.bigint().notNull(),
  shares: t.bigint().notNull(), // Added shares field to match ABI
  onBehalfOf: t.text().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
}));

export const WithdrawLiquidity = onchainTable("WithdrawLiquidity", (t) => ({
  id: t.text().primaryKey(),
  user: t.text().notNull(),
  pool: t.text().notNull(),
  asset: t.text().notNull(),
  amount: t.bigint().notNull(),
  shares: t.bigint().notNull(), // Added shares field to match ABI
  to: t.text().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
}));

export const BorrowDebtCrosschain = onchainTable("BorrowDebtCrosschain", (t) => ({
  id: t.text().primaryKey(),
  user: t.text().notNull(),
  pool: t.text().notNull(),
  asset: t.text().notNull(),
  amount: t.bigint().notNull(),
  shares: t.bigint().notNull(), // Added shares field to match ABI
  chainId: t.bigint().notNull(), // Renamed from borrowRateMode for clarity
  addExecutorLzReceiveOption: t.bigint().notNull(), // Renamed from borrowRate for clarity
  onBehalfOf: t.text().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
}));

export const RepayWithCollateralByPosition = onchainTable("RepayWithCollateralByPosition", (t) => ({
  id: t.text().primaryKey(),
  user: t.text().notNull(),
  pool: t.text().notNull(),
  asset: t.text().notNull(),
  amount: t.bigint().notNull(),
  shares: t.bigint().notNull(), // Added shares field to match ABI
  repayer: t.text().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
}));

export const SupplyCollateral = onchainTable("SupplyCollateral", (t) => ({
  id: t.text().primaryKey(),
  user: t.text().notNull(),
  pool: t.text().notNull(),
  asset: t.text().notNull(),
  amount: t.bigint().notNull(),
  onBehalfOf: t.text().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
}));

export const WithdrawCollateral = onchainTable("WithdrawCollateral", (t) => ({
  id: t.text().primaryKey(),
  user: t.text().notNull(),
  pool: t.text().notNull(),
  asset: t.text().notNull(),
  amount: t.bigint().notNull(),
  to: t.text().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
}));

export const CreatePosition = onchainTable("CreatePosition", (t) => ({
  id: t.text().primaryKey(),
  user: t.text().notNull(),
  pool: t.text().notNull(),
  positionAddress: t.text().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
}));

export const SwapToken = onchainTable("SwapToken", (t) => ({
  id: t.text().primaryKey(),
  user: t.text().notNull(),
  pool: t.text().notNull(),
  tokenFrom: t.text().notNull(),
  tokenTo: t.text().notNull(),
  amountIn: t.bigint().notNull(),
  amountOut: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
}));

// User Position tracking - maps users to their position addresses in each pool
export const UserPosition = onchainTable("UserPosition", (t) => ({
  id: t.text().primaryKey(), // user-pool
  user: t.text().notNull(),
  pool: t.text().notNull(),
  positionAddress: t.text().notNull(),
  isActive: t.boolean().notNull().default(true),
  createdAt: t.bigint().notNull(),
  lastUpdated: t.bigint().notNull(),
}));

// Position Events - Events dari Position contract
export const PositionWithdrawCollateral = onchainTable("PositionWithdrawCollateral", (t) => ({
  id: t.text().primaryKey(),
  user: t.text().notNull(),
  positionAddress: t.text().notNull(),
  pool: t.text().notNull(), // Pool address yang terkait dengan position
  amount: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
}));

export const PositionSwapToken = onchainTable("PositionSwapToken", (t) => ({
  id: t.text().primaryKey(),
  user: t.text().notNull(),
  positionAddress: t.text().notNull(),
  pool: t.text().notNull(), // Pool address yang terkait dengan position
  token: t.text().notNull(),
  amount: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
}));

export const PositionSwapTokenByPosition = onchainTable("PositionSwapTokenByPosition", (t) => ({
  id: t.text().primaryKey(),
  user: t.text().notNull(),
  positionAddress: t.text().notNull(),
  pool: t.text().notNull(), // Pool address yang terkait dengan position
  tokenIn: t.text().notNull(),
  tokenOut: t.text().notNull(),
  amountIn: t.bigint().notNull(),
  amountOut: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
}));

// APY and Interest Rate tracking
export const PoolAPYSnapshot = onchainTable("PoolAPYSnapshot", (t) => ({
  id: t.text().primaryKey(), // poolAddress-timestamp
  pool: t.text().notNull(),
  supplyAPY: t.integer().notNull(), // in basis points (1% = 100)
  borrowAPY: t.integer().notNull(), // in basis points (1% = 100)
  utilizationRate: t.integer().notNull(), // in basis points (100% = 10000)
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

// User Collateral Position in a Pool
export const UserCollateral = onchainTable("UserCollateral", (t) => ({
  id: t.text().primaryKey(), // user-pool-asset
  user: t.text().notNull(),
  pool: t.text().notNull(),
  asset: t.text().notNull(),
  totalCollateralAmount: t.bigint().notNull().default(0n),
  totalCollateralValue: t.bigint().notNull().default(0n), // in USD or base currency
  collateralFactor: t.integer().notNull().default(0), // LTV ratio in basis points
  isActive: t.boolean().notNull().default(true),
  lastUpdated: t.bigint().notNull(),
  createdAt: t.bigint().notNull(),
}));

// User Borrow Position in a Pool
export const UserBorrow = onchainTable("UserBorrow", (t) => ({
  id: t.text().primaryKey(), // user-pool-asset
  user: t.text().notNull(),
  pool: t.text().notNull(),
  asset: t.text().notNull(),
  totalBorrowedAmount: t.bigint().notNull().default(0n),
  totalBorrowedValue: t.bigint().notNull().default(0n), // in USD or base currency
  accruedInterest: t.bigint().notNull().default(0n),
  borrowRate: t.integer().notNull().default(0), // current borrow rate in basis points
  borrowRateMode: t.bigint().notNull().default(1n), // 1 for stable, 2 for variable
  healthFactor: t.bigint().notNull().default(0n), // health factor (scaled by 1e18)
  isActive: t.boolean().notNull().default(true),
  lastAccrued: t.bigint().notNull(),
  lastUpdated: t.bigint().notNull(),
  createdAt: t.bigint().notNull(),
}));

// ========================================
// ROUTER EVENT TABLES
// ========================================

// Pool to Router Mapping untuk dynamic discovery
export const PoolRouter = onchainTable("PoolRouter", (t) => ({
  id: t.text().primaryKey(), // poolAddress
  poolAddress: t.text().notNull(),
  routerAddress: t.text().notNull(),
  isActive: t.boolean().notNull().default(true),
  discoveredAt: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
}));

// Emergency Position Reset Event
export const EmergencyPositionReset = onchainTable("EmergencyPositionReset", (t) => ({
  id: t.text().primaryKey(),
  user: t.text().notNull(),
  router: t.text().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
}));

// Position Liquidated Event
export const PositionLiquidated = onchainTable("PositionLiquidated", (t) => ({
  id: t.text().primaryKey(),
  user: t.text().notNull(),
  router: t.text().notNull(),
  sharesRemoved: t.bigint().notNull(),
  debtRepaid: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
}));
