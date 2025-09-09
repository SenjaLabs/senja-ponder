/**
 * APY API Endpoints
 * 
 * This module provides utility functions for accessing APY data,
 * pool analytics, and interest rate information.
 */

import { PoolAnalytics, formatRate } from "../apyCalculator";

/**
 * Get current APY data for a pool
 */
export async function getCurrentAPY(poolAddress: string, db: any) {
  try {
    // Get pool data from database
    const pool = await db.find("LendingPool", { id: poolAddress });
    
    if (!pool) {
      throw new Error("Pool not found");
    }

    // Create analytics instance
    const analytics = new PoolAnalytics(
      BigInt(pool.totalSupplyAssets),
      BigInt(pool.totalSupplyShares),
      BigInt(pool.totalBorrowAssets),
      BigInt(pool.totalBorrowShares),
      BigInt(pool.lastAccrued),
      BigInt(Date.now() / 1000) // Current timestamp
    );

    return {
      pool: poolAddress,
      supplyAPY: formatRate(analytics.supplyAPY),
      borrowAPY: formatRate(analytics.borrowAPY),
      utilizationRate: formatRate(analytics.utilizationRate),
      supplyRate: formatRate(analytics.supplyRate),
      borrowRate: formatRate(analytics.borrowRate),
      totalSupplyAssets: pool.totalSupplyAssets.toString(),
      totalBorrowAssets: pool.totalBorrowAssets.toString(),
      lastUpdated: new Date(Number(pool.lastAccrued) * 1000).toISOString(),
      analytics: analytics.getFormattedAnalytics()
    };
  } catch (error) {
    console.error("Error fetching APY data:", error);
    throw error;
  }
}

/**
 * Get APY history for a pool
 */
export async function getAPYHistory(poolAddress: string, timeframe: string = "24h", db: any) {
  try {
    // Calculate timestamp based on timeframe
    const now = Math.floor(Date.now() / 1000);
    let startTime: number;
    
    switch (timeframe) {
      case "1h":
        startTime = now - 3600;
        break;
      case "24h":
        startTime = now - 86400;
        break;
      case "7d":
        startTime = now - 604800;
        break;
      case "30d":
        startTime = now - 2592000;
        break;
      default:
        startTime = now - 86400; // Default to 24h
    }

    // Get APY snapshots from database
    const snapshots = await db.findMany("PoolAPYSnapshot", {
      where: {
        pool: poolAddress,
        timestamp: { gte: BigInt(startTime) }
      },
      orderBy: { timestamp: "asc" }
    });

    const formattedSnapshots = snapshots.map((snapshot: any) => ({
      timestamp: new Date(Number(snapshot.timestamp) * 1000).toISOString(),
      supplyAPY: formatRate(snapshot.supplyAPY),
      borrowAPY: formatRate(snapshot.borrowAPY),
      utilizationRate: formatRate(snapshot.utilizationRate),
      totalSupplyAssets: snapshot.totalSupplyAssets.toString(),
      totalBorrowAssets: snapshot.totalBorrowAssets.toString(),
    }));

    return {
      pool: poolAddress,
      timeframe,
      snapshots: formattedSnapshots,
      count: formattedSnapshots.length
    };
  } catch (error) {
    console.error("Error fetching APY history:", error);
    throw error;
  }
}

/**
 * Get all pools with current APY
 */
export async function getAllPoolsAPY(db: any) {
  try {
    const pools = await db.findMany("LendingPool", {
      orderBy: { totalSupplyAssets: "desc" }
    });

    const poolsWithAPY = pools.map((pool: any) => {
      const analytics = new PoolAnalytics(
        BigInt(pool.totalSupplyAssets),
        BigInt(pool.totalSupplyShares),
        BigInt(pool.totalBorrowAssets),
        BigInt(pool.totalBorrowShares),
        BigInt(pool.lastAccrued),
        BigInt(Date.now() / 1000)
      );

      return {
        address: pool.address,
        supplyAPY: formatRate(analytics.supplyAPY),
        borrowAPY: formatRate(analytics.borrowAPY),
        utilizationRate: formatRate(analytics.utilizationRate),
        totalSupplyAssets: pool.totalSupplyAssets.toString(),
        totalBorrowAssets: pool.totalBorrowAssets.toString(),
        token0: pool.token0,
        token1: pool.token1,
      };
    });

    return {
      pools: poolsWithAPY,
      count: poolsWithAPY.length
    };
  } catch (error) {
    console.error("Error fetching pools APY:", error);
    throw error;
  }
}

/**
 * Get interest accrual events
 */
export async function getInterestAccruals(poolAddress?: string, limit: number = 50, db?: any) {
  try {
    const where = poolAddress ? { pool: poolAddress } : {};
    
    const accruals = await db.findMany("InterestAccrual", {
      where,
      orderBy: { timestamp: "desc" },
      limit: limit
    });

    const formattedAccruals = accruals.map((accrual: any) => ({
      id: accrual.id,
      pool: accrual.pool,
      interestEarned: accrual.interestEarned.toString(),
      previousSupplyAssets: accrual.previousSupplyAssets.toString(),
      newSupplyAssets: accrual.newSupplyAssets.toString(),
      previousBorrowAssets: accrual.previousBorrowAssets.toString(),
      newBorrowAssets: accrual.newBorrowAssets.toString(),
      timestamp: new Date(Number(accrual.timestamp) * 1000).toISOString(),
      blockNumber: accrual.blockNumber.toString(),
    }));

    return {
      accruals: formattedAccruals,
      count: formattedAccruals.length
    };
  } catch (error) {
    console.error("Error fetching accruals:", error);
    throw error;
  }
}

console.log("📊 APY API utilities loaded:");
console.log("   getCurrentAPY(poolAddress, db) - Current APY for pool");
console.log("   getAPYHistory(poolAddress, timeframe, db) - APY history");
console.log("   getAllPoolsAPY(db) - All pools with current APY");
console.log("   getInterestAccruals(poolAddress, limit, db) - Interest accrual events");
