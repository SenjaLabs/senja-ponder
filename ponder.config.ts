import { createConfig, factory } from "ponder";
import { parseAbiItem } from "viem";

import { LendingPoolAbi } from "./abis/LendingPoolAbi";
import { LendingPoolFactoryAbi } from "./abis/LendingPoolFactoryAbi";

// Konfigurasi database berdasarkan environment
const getDatabaseConfig = () => {
  // Connection string direct untuk write access (tanpa pooler)
  let connectionString = "postgresql://postgres.olbsisjccrlnstwzarbr:ucQKVTaBjPC9YFOX@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres";
  
  // Untuk Railway/production, pastikan gunakan direct connection
  if (process.env.NODE_ENV === "production" || process.env.RAILWAY_ENVIRONMENT ) {
    
    return {
      kind: "postgres" as const,
      connectionString: connectionString,
      schema: process.env.DATABASE_SCHEMA || "public",
      // Tambahkan konfigurasi pool untuk write access
      poolConfig: {
        max: 10,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
      }
    };
  }
  
  // Default untuk development: gunakan PGlite (local)
  return {
    kind: "pglite" as const,
  };
};

export default createConfig({
  database: getDatabaseConfig(),
  chains: {
    base: {
      id: 8453,
      rpc: "wss://base-rpc.publicnode.com",
    },
  },
  contracts: {
    LendingPoolFactory: {
      chain: "base",
      abi: LendingPoolFactoryAbi,
      address: "0x67165C24A886AAAf1bFA81934e44a2063c6B608C",
      startBlock: 34979177,
      includeTransactionReceipts: true,
    },
    // Dynamic pool addresses menggunakan factory pattern
    LendingPool: {
      chain: "base",
      abi: LendingPoolAbi,
      address: factory({
        address: "0x67165C24A886AAAf1bFA81934e44a2063c6B608C",
        event: parseAbiItem("event LendingPoolCreated(address indexed collateralToken, address indexed borrowToken, address indexed lendingPool, uint256 ltv)"),
        parameter: "lendingPool",
      }),
      startBlock: 34979177,
      includeTransactionReceipts: true,
    },
  },
});