/**
 * APY Calculation Utilities for Lending Protocol
 * 
 * This module provides functions to calculate Annual Percentage Yield (APY),
 * interest rates, and utilization rates for lending pools.
 */

// Constants for calculations
export const SECONDS_PER_YEAR = 365 * 24 * 60 * 60; // 31,536,000 seconds
export const BASIS_POINTS = 10000; // 1% = 100 basis points
export const RAY = 10n ** 27n; // 1e27 for precision in calculations

/**
 * Interest Rate Model Parameters
 * These should match your smart contract's interest rate model
 */
export interface InterestRateModel {
  baseRate: number; // Base interest rate in basis points
  multiplier: number; // Interest rate multiplier in basis points
  jumpMultiplier: number; // Jump multiplier after optimal utilization
  optimalUtilization: number; // Optimal utilization rate in basis points
}

// Default interest rate model (can be customized per pool)
export const DEFAULT_INTEREST_MODEL: InterestRateModel = {
  baseRate: 200, // 2% base rate
  multiplier: 500, // 5% multiplier
  jumpMultiplier: 10000, // 100% jump multiplier
  optimalUtilization: 8000, // 80% optimal utilization
};

/**
 * Calculate utilization rate
 * @param totalBorrows Total borrowed amount
 * @param totalSupply Total supplied amount
 * @returns Utilization rate in basis points (0-10000)
 */
export function calculateUtilizationRate(
  totalBorrows: bigint,
  totalSupply: bigint
): number {
  if (totalSupply === 0n) return 0;
  
  const utilization = (totalBorrows * BigInt(BASIS_POINTS)) / totalSupply;
  return Math.min(Number(utilization), BASIS_POINTS);
}

/**
 * Calculate borrow rate based on utilization and interest rate model
 * @param utilizationRate Utilization rate in basis points
 * @param model Interest rate model parameters
 * @returns Borrow rate in basis points per year
 */
export function calculateBorrowRate(
  utilizationRate: number,
  model: InterestRateModel = DEFAULT_INTEREST_MODEL
): number {
  if (utilizationRate <= model.optimalUtilization) {
    // Below optimal utilization: linear increase
    const rate = model.baseRate + 
      Math.floor((model.multiplier * utilizationRate) / BASIS_POINTS);
    
    return Math.floor(rate);
  } else {
    // Above optimal utilization: jump rate
    const normalRate = model.baseRate + model.multiplier;
    const excessUtilization = utilizationRate - model.optimalUtilization;
    const excessRate = Math.floor((model.jumpMultiplier * excessUtilization) / BASIS_POINTS);
    
    return Math.floor(normalRate + excessRate);
  }
}

/**
 * Calculate supply rate based on borrow rate and utilization
 * @param borrowRate Borrow rate in basis points per year
 * @param utilizationRate Utilization rate in basis points
 * @param reserveFactor Reserve factor in basis points (portion kept as protocol fee)
 * @returns Supply rate in basis points per year
 */
export function calculateSupplyRate(
  borrowRate: number,
  utilizationRate: number,
  reserveFactor: number = 1000 // 10% default reserve factor
): number {
  const oneMinusReserveFactor = BASIS_POINTS - reserveFactor;
  const supplyRate = Math.floor((borrowRate * utilizationRate * oneMinusReserveFactor) / 
         (BASIS_POINTS * BASIS_POINTS));
  return supplyRate;
}

/**
 * Convert annual rate to APY (compound interest)
 * @param annualRate Annual rate in basis points
 * @param compoundingPeriods Number of compounding periods per year (default: daily)
 * @returns APY in basis points
 */
export function calculateAPY(
  annualRate: number,
  compoundingPeriods: number = 365
): number {
  const rate = annualRate / BASIS_POINTS;
  const apy = Math.pow(1 + rate / compoundingPeriods, compoundingPeriods) - 1;
  return Math.floor(apy * BASIS_POINTS);
}

/**
 * Calculate compound interest for a given period
 * @param principal Principal amount
 * @param rate Annual rate in basis points
 * @param timeInSeconds Time period in seconds
 * @returns New amount after interest accrual
 */
export function calculateCompoundInterest(
  principal: bigint,
  rate: number,
  timeInSeconds: bigint
): bigint {
  if (rate === 0 || timeInSeconds === 0n) return principal;
  
  // Ensure rate is an integer (round if needed)
  const integerRate = Math.floor(rate);
  
  // Convert to per-second rate using integer arithmetic
  // Rate per second = (rate in basis points) / (seconds per year * basis points)
  const ratePerSecond = BigInt(integerRate) * RAY / BigInt(SECONDS_PER_YEAR * BASIS_POINTS);
  
  // Simple compound interest approximation for small time periods
  // Interest = principal * rate_per_second * time_in_seconds
  const interest = (principal * ratePerSecond * timeInSeconds) / RAY;
  
  return principal + interest;
}

/**
 * Calculate share-to-asset conversion
 * @param shares Number of shares
 * @param totalShares Total shares in pool
 * @param totalAssets Total assets in pool
 * @returns Asset amount
 */
export function sharesToAssets(
  shares: bigint,
  totalShares: bigint,
  totalAssets: bigint
): bigint {
  if (totalShares === 0n) return shares;
  return (shares * totalAssets) / totalShares;
}

/**
 * Calculate asset-to-share conversion
 * @param assets Asset amount
 * @param totalShares Total shares in pool
 * @param totalAssets Total assets in pool
 * @returns Number of shares
 */
export function assetsToShares(
  assets: bigint,
  totalShares: bigint,
  totalAssets: bigint
): bigint {
  if (totalAssets === 0n) return assets;
  return (assets * totalShares) / totalAssets;
}

/**
 * Get human-readable rate string
 * @param rateInBasisPoints Rate in basis points
 * @returns Formatted percentage string
 */
export function formatRate(rateInBasisPoints: number): string {
  return (rateInBasisPoints / 100).toFixed(2) + '%';
}

/**
 * Pool statistics calculator
 */
export class PoolAnalytics {
  constructor(
    public totalSupplyAssets: bigint,
    public totalSupplyShares: bigint,
    public totalBorrowAssets: bigint,
    public totalBorrowShares: bigint,
    public lastAccrued: bigint,
    public currentTimestamp: bigint,
    public interestModel: InterestRateModel = DEFAULT_INTEREST_MODEL
  ) {}

  get utilizationRate(): number {
    return calculateUtilizationRate(this.totalBorrowAssets, this.totalSupplyAssets);
  }

  get borrowRate(): number {
    return calculateBorrowRate(this.utilizationRate, this.interestModel);
  }

  get supplyRate(): number {
    return calculateSupplyRate(this.borrowRate, this.utilizationRate);
  }

  get borrowAPY(): number {
    return calculateAPY(this.borrowRate);
  }

  get supplyAPY(): number {
    return calculateAPY(this.supplyRate);
  }

  /**
   * Calculate accrued interest since last update
   */
  calculateAccruedInterest(): {
    newSupplyAssets: bigint;
    newBorrowAssets: bigint;
    interestEarned: bigint;
  } {
    const timeDelta = this.currentTimestamp - this.lastAccrued;
    
    // Ensure we have valid values
    if (timeDelta < 0n) {
      console.warn("Invalid time delta for interest calculation:", timeDelta);
      return {
        newSupplyAssets: this.totalSupplyAssets,
        newBorrowAssets: this.totalBorrowAssets,
        interestEarned: 0n,
      };
    }

    // Ensure borrowRate is an integer
    const integerBorrowRate = Math.floor(this.borrowRate);
    
    const newBorrowAssets = calculateCompoundInterest(
      this.totalBorrowAssets,
      integerBorrowRate,
      timeDelta
    );
    
    const interestEarned = newBorrowAssets - this.totalBorrowAssets;
    const newSupplyAssets = this.totalSupplyAssets + interestEarned;

    return {
      newSupplyAssets,
      newBorrowAssets,
      interestEarned
    };
  }

  /**
   * Get formatted analytics
   */
  getFormattedAnalytics() {
    return {
      utilizationRate: formatRate(this.utilizationRate),
      borrowRate: formatRate(this.borrowRate),
      supplyRate: formatRate(this.supplyRate),
      borrowAPY: formatRate(this.borrowAPY),
      supplyAPY: formatRate(this.supplyAPY),
      totalSupply: this.totalSupplyAssets.toString(),
      totalBorrows: this.totalBorrowAssets.toString(),
    };
  }
}
