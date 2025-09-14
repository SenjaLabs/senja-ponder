import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

// Setup client untuk Base chain
const client = createPublicClient({
  chain: base,
  transport: http("https://api.zan.top/base-mainnet"),
});

// Factory address
const FACTORY_ADDRESS = "0x67165C24A886AAAf1bFA81934e44a2063c6B608C";
const START_BLOCK = 34979177n;

// Function untuk mengextract semua pool addresses dari events
async function extractPoolAddresses() {
  try {
    console.log("🔍 Extracting pool addresses from LendingPoolCreated events...");
    
    // Get current block untuk menghitung range
    const latestBlock = await client.getBlockNumber();
    console.log(`📊 Latest block: ${latestBlock}`);
    console.log(`📊 Start block: ${START_BLOCK}`);
    
    const BATCH_SIZE = 5000n; // RPC limit is 10,000, so we use 5,000 for safety
    const poolAddresses: string[] = [];
    const poolDetails: Array<{
      address: string;
      collateralToken: string;
      borrowToken: string;
      ltv: string;
      blockNumber: string;
    }> = [];

    // Process in batches
    for (let fromBlock = START_BLOCK; fromBlock <= latestBlock; fromBlock += BATCH_SIZE) {
      const toBlock = fromBlock + BATCH_SIZE - 1n > latestBlock ? latestBlock : fromBlock + BATCH_SIZE - 1n;
      
      console.log(`🔄 Processing blocks ${fromBlock} to ${toBlock}...`);
      
      try {
        // Get LendingPoolCreated events dari factory dalam batch
        const logs = await client.getLogs({
          address: FACTORY_ADDRESS,
          event: {
            type: 'event',
            name: 'LendingPoolCreated',
            inputs: [
              { name: 'collateralToken', type: 'address', indexed: true },
              { name: 'borrowToken', type: 'address', indexed: true },
              { name: 'lendingPool', type: 'address', indexed: true },
              { name: 'ltv', type: 'uint256', indexed: false }
            ]
          },
          fromBlock,
          toBlock
        });

        console.log(`   Found ${logs.length} events in this batch`);

        for (const log of logs) {
          if (log.args) {
            const poolAddress = log.args.lendingPool as string;
            const collateralToken = log.args.collateralToken as string;
            const borrowToken = log.args.borrowToken as string;
            const ltv = log.args.ltv?.toString() || "0";
            
            poolAddresses.push(poolAddress);
            poolDetails.push({
              address: poolAddress,
              collateralToken,
              borrowToken,
              ltv,
              blockNumber: log.blockNumber?.toString() || "0"
            });
          }
        }
        
        // Delay untuk menghindari rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (batchError) {
        console.warn(`⚠️  Error processing batch ${fromBlock}-${toBlock}:`, batchError);
        continue;
      }
    }

    console.log(`📊 Found ${poolAddresses.length} lending pools total:`);
    poolDetails.forEach((pool, index) => {
      console.log(`${index + 1}. Pool: ${pool.address}`);
      console.log(`   Collateral: ${pool.collateralToken}`);
      console.log(`   Borrow: ${pool.borrowToken}`);
      console.log(`   LTV: ${pool.ltv}`);
      console.log(`   Block: ${pool.blockNumber}`);
      console.log('');
    });

    return { poolAddresses, poolDetails };
    
  } catch (error) {
    console.error("❌ Error extracting pool addresses:", error);
    return { poolAddresses: [], poolDetails: [] };
  }
}

// Function untuk generate konfigurasi ponder dengan pool addresses
async function generatePonderConfig() {
  const { poolAddresses, poolDetails } = await extractPoolAddresses();
  
  const configString = `// Auto-generated pool addresses dari LendingPoolCreated events
// Total pools found: ${poolAddresses.length}
// Generated at: ${new Date().toISOString()}

export const DISCOVERED_POOL_ADDRESSES = [
${poolAddresses.map(addr => `  "${addr}",`).join('\n')}
];

export const POOL_DETAILS = [
${poolDetails.map(pool => `  {
    address: "${pool.address}",
    collateralToken: "${pool.collateralToken}",
    borrowToken: "${pool.borrowToken}",
    ltv: "${pool.ltv}",
    blockNumber: "${pool.blockNumber}",
  },`).join('\n')}
];`;

  return { configString, poolAddresses, poolDetails };
}

// Run script
async function main() {
  const { configString } = await generatePonderConfig();
  console.log("📝 Generated configuration:");
  console.log(configString);
}

// Run if this is the main module
main().catch(console.error);

export { extractPoolAddresses, generatePonderConfig };
