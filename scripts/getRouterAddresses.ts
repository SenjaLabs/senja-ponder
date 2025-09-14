import { createPublicClient, http } from 'viem';
import { LendingPoolAbi } from '../abis/LendingPoolAbi';

// Setup client untuk Kaia
const client = createPublicClient({
  transport: http('https://rpc.ankr.com/kaia')
});

// Pool addresses yang sudah terdeteksi
const POOLS = [
  '0xf9c899692c42b2f5fc598615dd529360d533e6ce',
  '0xc4a40e5c52ad84e0796367282a6cfcac36ffcda9'
];

async function getRouterAddresses() {
  console.log('🔍 Reading router addresses from lending pools...\n');
  
  const routers: string[] = [];
  
  for (const poolAddress of POOLS) {
    try {
      console.log(`📋 Pool: ${poolAddress}`);
      
      // Read router address from pool
      const routerAddress = await client.readContract({
        address: poolAddress as `0x${string}`,
        abi: LendingPoolAbi,
        functionName: 'router',
      }) as string;
      
      console.log(`🤖 Router: ${routerAddress}`);
      routers.push(routerAddress);
      console.log('─'.repeat(80));
      
    } catch (error) {
      console.error(`❌ Error reading from pool ${poolAddress}:`, error);
    }
  }
  
  console.log('\n🎯 Summary:');
  console.log('Router addresses found:');
  routers.forEach((router, index) => {
    console.log(`  ${index + 1}. ${router}`);
  });
  
  console.log('\n� For Ponder config:');
  console.log('address: [');
  routers.forEach(router => {
    console.log(`  "${router}",`);
  });
  console.log(']');
}

// Run the script
getRouterAddresses().catch(console.error);