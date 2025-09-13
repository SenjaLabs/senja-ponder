export interface DynamicPoolConfig {
  address: string;
  collateralToken: string;
  borrowToken: string;
  ltv: bigint;
  created: bigint;
}

// Registry untuk menyimpan pool addresses yang dideteksi
export const dynamicPools: Map<string, DynamicPoolConfig> = new Map();

// Function untuk menambah pool baru ke registry
export function addDynamicPool(config: DynamicPoolConfig) {
  dynamicPools.set(config.address, config);
  console.log(`📝 Added pool ${config.address} to dynamic registry`);
}

// Function untuk mendapatkan semua pool addresses
export function getAllPoolAddresses(): string[] {
  return Array.from(dynamicPools.keys());
}

// Function untuk mendapatkan config pool
export function getPoolConfig(address: string): DynamicPoolConfig | undefined {
  return dynamicPools.get(address);
}
