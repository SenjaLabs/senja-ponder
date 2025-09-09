/**
 * APY Test Script
 * Test the APY calculation functions to ensure they work correctly
 */

import { 
  calculateUtilizationRate,
  calculateBorrowRate,
  calculateSupplyRate,
  calculateAPY,
  calculateCompoundInterest,
  PoolAnalytics,
  DEFAULT_INTEREST_MODEL,
  formatRate
} from "../src/apyCalculator";

// Test data
const testScenarios = [
  {
    name: "Low Utilization (20%)",
    totalSupplyAssets: 1000000n * 10n**18n, // 1M tokens
    totalBorrowAssets: 200000n * 10n**18n,  // 200k tokens (20% utilization)
    totalSupplyShares: 1000000n * 10n**18n,
    totalBorrowShares: 200000n * 10n**18n,
  },
  {
    name: "Optimal Utilization (80%)",
    totalSupplyAssets: 1000000n * 10n**18n, // 1M tokens
    totalBorrowAssets: 800000n * 10n**18n,  // 800k tokens (80% utilization)
    totalSupplyShares: 1000000n * 10n**18n,
    totalBorrowShares: 800000n * 10n**18n,
  },
  {
    name: "High Utilization (95%)",
    totalSupplyAssets: 1000000n * 10n**18n, // 1M tokens
    totalBorrowAssets: 950000n * 10n**18n,  // 950k tokens (95% utilization)
    totalSupplyShares: 1000000n * 10n**18n,
    totalBorrowShares: 950000n * 10n**18n,
  },
];

function runAPYTests() {
  console.log("🧪 Running APY Calculation Tests");
  console.log("=".repeat(50));

  // Test individual functions
  console.log("\n📊 Testing Individual Functions:");
  
  // Test utilization rate calculation
  const utilization20 = calculateUtilizationRate(200000n * 10n**18n, 1000000n * 10n**18n);
  const utilization80 = calculateUtilizationRate(800000n * 10n**18n, 1000000n * 10n**18n);
  const utilization95 = calculateUtilizationRate(950000n * 10n**18n, 1000000n * 10n**18n);
  
  console.log(`Utilization 20%: ${formatRate(utilization20)} (expected: ~20%)`);
  console.log(`Utilization 80%: ${formatRate(utilization80)} (expected: ~80%)`);
  console.log(`Utilization 95%: ${formatRate(utilization95)} (expected: ~95%)`);

  // Test borrow rate calculation
  const borrowRate20 = calculateBorrowRate(utilization20);
  const borrowRate80 = calculateBorrowRate(utilization80);
  const borrowRate95 = calculateBorrowRate(utilization95);
  
  console.log(`Borrow Rate 20%: ${formatRate(borrowRate20)}`);
  console.log(`Borrow Rate 80%: ${formatRate(borrowRate80)}`);
  console.log(`Borrow Rate 95%: ${formatRate(borrowRate95)} (should be higher due to jump rate)`);

  // Test supply rate calculation
  const supplyRate20 = calculateSupplyRate(borrowRate20, utilization20);
  const supplyRate80 = calculateSupplyRate(borrowRate80, utilization80);
  const supplyRate95 = calculateSupplyRate(borrowRate95, utilization95);
  
  console.log(`Supply Rate 20%: ${formatRate(supplyRate20)}`);
  console.log(`Supply Rate 80%: ${formatRate(supplyRate80)}`);
  console.log(`Supply Rate 95%: ${formatRate(supplyRate95)}`);

  // Test APY conversion
  const supplyAPY20 = calculateAPY(supplyRate20);
  const supplyAPY80 = calculateAPY(supplyRate80);
  const supplyAPY95 = calculateAPY(supplyRate95);
  
  console.log(`Supply APY 20%: ${formatRate(supplyAPY20)}`);
  console.log(`Supply APY 80%: ${formatRate(supplyAPY80)}`);
  console.log(`Supply APY 95%: ${formatRate(supplyAPY95)}`);

  console.log("\n🏦 Testing Pool Analytics:");
  
  // Test scenarios with PoolAnalytics
  testScenarios.forEach((scenario, index) => {
    console.log(`\n${index + 1}. ${scenario.name}`);
    console.log("-".repeat(30));
    
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const lastAccrued = currentTime - 86400n; // 24 hours ago
    
    const analytics = new PoolAnalytics(
      scenario.totalSupplyAssets,
      scenario.totalSupplyShares,
      scenario.totalBorrowAssets,
      scenario.totalBorrowShares,
      lastAccrued,
      currentTime,
      DEFAULT_INTEREST_MODEL
    );

    console.log(`Utilization Rate: ${formatRate(analytics.utilizationRate)}`);
    console.log(`Borrow Rate: ${formatRate(analytics.borrowRate)}`);
    console.log(`Supply Rate: ${formatRate(analytics.supplyRate)}`);
    console.log(`Borrow APY: ${formatRate(analytics.borrowAPY)}`);
    console.log(`Supply APY: ${formatRate(analytics.supplyAPY)}`);

    // Test interest accrual over 24 hours
    const accrual = analytics.calculateAccruedInterest();
    console.log(`Interest Earned (24h): ${accrual.interestEarned.toString()}`);
    console.log(`New Supply Assets: ${accrual.newSupplyAssets.toString()}`);
    console.log(`New Borrow Assets: ${accrual.newBorrowAssets.toString()}`);
  });

  console.log("\n⏰ Testing Compound Interest:");
  
  // Test compound interest calculation
  const principal = 1000n * 10n**18n; // 1000 tokens
  const rate = 500; // 5% in basis points
  const timeOneDay = 86400n; // 1 day in seconds
  const timeOneWeek = 604800n; // 1 week in seconds
  const timeOneMonth = 2592000n; // 30 days in seconds
  
  const interestOneDay = calculateCompoundInterest(principal, rate, timeOneDay);
  const interestOneWeek = calculateCompoundInterest(principal, rate, timeOneWeek);
  const interestOneMonth = calculateCompoundInterest(principal, rate, timeOneMonth);
  
  console.log(`Principal: ${principal.toString()}`);
  console.log(`After 1 day: ${interestOneDay.toString()}`);
  console.log(`After 1 week: ${interestOneWeek.toString()}`);
  console.log(`After 1 month: ${interestOneMonth.toString()}`);

  console.log("\n✅ APY Tests Completed!");
  console.log("=".repeat(50));
}

// Export test function
export { runAPYTests };

// Run tests
runAPYTests();
