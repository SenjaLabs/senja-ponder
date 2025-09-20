import { createConfig, factory } from "ponder";
import { parseAbiItem } from "viem";
import { LendingPoolAbi } from "./abis/LendingPoolAbi";
import { LendingPoolFactoryAbi } from "./abis/LendingPoolFactoryAbi";
import { LendingPoolRouterAbi } from "./abis/LendingPoolRouterAbi";
import { LendingPoolAbi as PositionAbi } from "./abis/PositionAbi";

// Konfigurasi database berdasarkan environment
const getDatabaseConfig = () => {
  // Ambil connection string dari environment variable
  const connectionString = process.env.DATABASE_URL;
  
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
  
  // local development using pglite
  return {
    kind: "pglite" as const,
  };
};

export default createConfig({
  database: getDatabaseConfig(),
  chains: {
    kaia: {
      id: 8217,
      rpc: "https://rpc.ankr.com/kaia",
    },
  },
  contracts: {
    // Factory contract untuk membuat pools secara dinamis
    LendingPoolFactory: {
      chain: "kaia",
      abi: LendingPoolFactoryAbi,
      address: "0xa971CD2714fbCc9A942b09BC391a724Df9338206",
      startBlock: 195725118,
      includeTransactionReceipts: true,
    },
    // Dynamic pool addresses menggunakan factory pattern - pools akan ditemukan otomatis
    LendingPool: {
      chain: "kaia",
      abi: LendingPoolAbi,
      address: factory({
        address: "0xa971CD2714fbCc9A942b09BC391a724Df9338206",
        event: parseAbiItem("event LendingPoolCreated(address indexed collateralToken, address indexed borrowToken, address indexed lendingPool, uint256 ltv)"),
        parameter: "lendingPool",
      }),
      startBlock: 195725118,
      includeTransactionReceipts: true,
    },
    // Dynamic Position addresses - menggunakan multiple pool addresses sebagai factories
    Position: {
      chain: "kaia", 
      abi: PositionAbi,
      address: factory({
        // Multiple factories: semua pool addresses yang ada bisa menjadi factory untuk Position
        address: [
          "0xf9c899692c42b2f5fc598615dd529360d533e6ce", // Pool address 1
          "0xc4a40e5c52ad84e0796367282a6cfcac36ffcda9", // Pool address 2
          // Pool addresses baru akan ditambahkan secara manual di sini setelah ditemukan
        ],
        event: parseAbiItem("event CreatePosition(address user, address positionAddress)"),
        parameter: "positionAddress",
      }),
      startBlock: 195725118,
      includeTransactionReceipts: true,
    },
    // LendingPoolRouter - router addresses yang ditemukan dari pools
    LendingPoolRouter: {
      chain: "kaia",
      abi: LendingPoolRouterAbi,
      address: [
        "0xc9E5C37a9E4F8CC3C7A48E50c4aDEe830798f0Ec", // Router untuk pool 0xf9c899692c42b2f5fc598615dd529360d533e6ce
        "0x3881F4B841160956B4e14aBfdc5e7c3403BA315F", // Router untuk pool 0xc4a40e5c52ad84e0796367282a6cfcac36ffcda9
      ],
      startBlock: 195725118,
      includeTransactionReceipts: true,
    },
  },
});