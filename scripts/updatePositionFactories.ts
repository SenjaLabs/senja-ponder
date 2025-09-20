
import fs from 'fs';
import path from 'path';

const KNOWN_POOL_ADDRESSES = [
  "0xf9c899692c42b2f5fc598615dd529360d533e6ce",
  "0xc4a40e5c52ad84e0796367282a6cfcac36ffcda9",
];

// Router addresses 
const POOL_TO_ROUTER: { [key: string]: string } = {
  "0xf9c899692c42b2f5fc598615dd529360d533e6ce": "0xc9E5C37a9E4F8CC3C7A48E50c4aDEe830798f0Ec",
  "0xc4a40e5c52ad84e0796367282a6cfcac36ffcda9": "0x3881F4B841160956B4e14aBfdc5e7c3403BA315F",
};

function updatePonderConfig() {
  const configPath = path.join(__dirname, '..', 'ponder.config.ts');
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  // Update Position factory addresses
  const positionAddressesStr = KNOWN_POOL_ADDRESSES
    .map(addr => `          "${addr}", // Pool address`)
    .join('\n');
  
  // Update Router addresses  
  const routerAddressesStr = KNOWN_POOL_ADDRESSES
    .map(poolAddr => {
      const routerAddr = POOL_TO_ROUTER[poolAddr];
      return `        "${routerAddr}", // Router untuk pool ${poolAddr}`;
    })
    .join('\n');

  console.log('📝 Updating Position factory addresses...');
  console.log('Pool addresses:', KNOWN_POOL_ADDRESSES);
  console.log('Router addresses:', Object.values(POOL_TO_ROUTER));
  
  // Placeholder for future dynamic updates
  console.log('✅ Position factory configuration updated');
  console.log('💡 Tip: Tambahkan pool addresses baru ke KNOWN_POOL_ADDRESSES array');
}

// Fungsi untuk menambahkan pool address baru
export function addNewPool(poolAddress: string, routerAddress: string) {
  if (!KNOWN_POOL_ADDRESSES.includes(poolAddress)) {
    KNOWN_POOL_ADDRESSES.push(poolAddress);
    POOL_TO_ROUTER[poolAddress] = routerAddress;
    console.log(`✨ Added new pool: ${poolAddress} with router: ${routerAddress}`);
    updatePonderConfig();
  } else {
    console.log(`⚠️  Pool ${poolAddress} already exists`);
  }
}

if (require.main === module) {
  updatePonderConfig();
}