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
  created: t.bigint().notNull(),
}));

export const User = onchainTable("User", (t) => ({
  id: t.text().primaryKey(),
  address: t.text().notNull(),
  totalDeposited: t.bigint().notNull().default(0n),
  totalWithdrawn: t.bigint().notNull().default(0n),
  totalBorrowed: t.bigint().notNull().default(0n),
  totalRepaid: t.bigint().notNull().default(0n),
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
  borrowRateMode: t.bigint().notNull(),
  borrowRate: t.bigint().notNull(),
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

export const CreatePosition = onchainTable("CreatePosition", (t) => ({
  id: t.text().primaryKey(),
  user: t.text().notNull(),
  pool: t.text().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.text().notNull(),
}));
