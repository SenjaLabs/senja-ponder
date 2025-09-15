# Query APY untuk Setiap Pool

Berikut adalah kumpulan query GraphQL untuk menampilkan APY di setiap pool dalam sistem lending protocol.

## 🔥 Query Paling Sering Digunakan

### Query: Simple APY Display
```graphql
query SimpleAPYDisplay {
  lendingPools {
    items {
      address
      token0
      token1
      supplyAPY
      borrowAPY
      utilizationRate
    }
  }
}
```

### Query: Best APY Opportunities
```graphql
query BestAPYOpportunities {
  lendingPools(
    where: { 
      supplyAPY: { gt: 0 } 
    }
    orderBy: "supplyAPY"
    orderDirection: "desc"
    limit: 5
  ) {
    items {
      address
      token0
      token1
      supplyAPY
      borrowAPY
      utilizationRate
      totalSupplyAssets
      totalBorrowAssets
    }
  }
}
```

## 1. Query Semua Pool dengan APY Saat Ini

### Query: Get All Pools with Current APY
```graphql
query GetAllPoolsWithAPY {
  lendingPools {
    items {
      id
      address
      token0
      token1
      totalSupplyAssets
      totalBorrowAssets
      totalLiquidity
      utilizationRate
      supplyAPY
      borrowAPY
      supplyRate
      borrowRate
      lastAccrued
      created
    }
  }
}
```

**Keterangan:**
- `utilizationRate`: Tingkat pemanfaatan pool (dalam basis points, 100% = 10000)
- `supplyAPY`: APY untuk supplier (dalam basis points, 1% = 100) - **Field Baru!**
- `borrowAPY`: APY untuk borrower (dalam basis points, 1% = 100) - **Field Baru!**
- `supplyRate`: Tingkat bunga untuk supplier (basis points per tahun)
- `borrowRate`: Tingkat bunga untuk borrower (basis points per tahun)
- `totalSupplyAssets`: Total asset yang disupply
- `totalBorrowAssets`: Total asset yang dipinjam
- `totalLiquidity`: Likuiditas tersedia (totalSupplyAssets - totalBorrowAssets)

## 2. Query Pool Specific dengan Detail APY

### Query: Get Specific Pool APY Details
```graphql
query GetPoolAPYDetails($poolId: String!) {
  lendingPool(id: $poolId) {
    id
    address
    token0
    token1
    totalSupplyAssets
    totalBorrowAssets
    totalLiquidity
    utilizationRate
    supplyAPY
    borrowAPY
    supplyRate
    borrowRate
    lastAccrued
    totalDeposits
    totalWithdrawals
    totalBorrows
    totalRepays
    created
  }
}
```

**Variables Example:**
```json
{
  "poolId": "0x1234567890abcdef1234567890abcdef12345678"
}
```

## 3. Query Historical APY (Snapshots)

### Query: Get APY History untuk Pool Tertentu
```graphql
query GetPoolAPYHistory($poolAddress: String!, $since: BigInt!) {
  poolAPYSnapshots(
    where: { 
      pool: $poolAddress, 
      timestamp: { gte: $since } 
    }
    orderBy: "timestamp"
    orderDirection: "desc"
    limit: 100
  ) {
    items {
      id
      pool
      supplyAPY
      borrowAPY
      utilizationRate
      totalSupplyAssets
      totalBorrowAssets
      timestamp
      blockNumber
    }
  }
}
```

**Variables Example:**
```json
{
  "poolAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "since": "1694776800"
}
```

## 4. Query APY untuk Multiple Pools

### Query: Get APY untuk Beberapa Pool Sekaligus
```graphql
query GetMultiplePoolsAPY($poolAddresses: [String!]!) {
  lendingPools(
    where: { 
      address: { in: $poolAddresses } 
    }
  ) {
    items {
      id
      address
      token0
      token1
      utilizationRate
      supplyAPY
      borrowAPY
      supplyRate
      borrowRate
      totalSupplyAssets
      totalBorrowAssets
      totalLiquidity
      lastAccrued
    }
  }
}
```

**Variables Example:**
```json
{
  "poolAddresses": [
    "0x1234567890abcdef1234567890abcdef12345678",
    "0xabcdef1234567890abcdef1234567890abcdef12"
  ]
}
```

## 5. Query Top Pools by APY

### Query: Get Pools dengan Supply APY Tertinggi
```graphql
query GetTopSupplyAPYPools($limit: Int = 10) {
  lendingPools(
    orderBy: "supplyAPY"
    orderDirection: "desc"
    limit: $limit
  ) {
    items {
      id
      address
      token0
      token1
      supplyAPY
      borrowAPY
      supplyRate
      borrowRate
      utilizationRate
      totalSupplyAssets
      totalBorrowAssets
      totalLiquidity
    }
  }
}
```

### Query: Get Pools dengan Borrow APY Terendah
```graphql
query GetLowestBorrowAPYPools($limit: Int = 10) {
  lendingPools(
    orderBy: "borrowAPY"
    orderDirection: "asc"
    limit: $limit
  ) {
    items {
      id
      address
      token0
      token1
      supplyAPY
      borrowAPY
      supplyRate
      borrowRate
      utilizationRate
      totalSupplyAssets
      totalBorrowAssets
      totalLiquidity
    }
  }
}
```

## 6. Query APY dengan Filter Utilization Rate

### Query: Get Pools dengan Utilization Rate Tertentu
```graphql
query GetPoolsByUtilizationRate($minUtilization: Int!, $maxUtilization: Int!) {
  lendingPools(
    where: { 
      utilizationRate: { 
        gte: $minUtilization, 
        lte: $maxUtilization 
      } 
    }
    orderBy: "supplyAPY"
    orderDirection: "desc"
  ) {
    items {
      id
      address
      token0
      token1
      utilizationRate
      supplyAPY
      borrowAPY
      supplyRate
      borrowRate
      totalSupplyAssets
      totalBorrowAssets
      totalLiquidity
    }
  }
}
```

**Variables Example (untuk pools dengan utilization 50-80%):**
```json
{
  "minUtilization": 5000,
  "maxUtilization": 8000
}
```

## 7. Query Interest Accrual Events

### Query: Get Interest Accrual untuk Pool
```graphql
query GetInterestAccruals($poolAddress: String!, $limit: Int = 50) {
  interestAccruals(
    where: { pool: $poolAddress }
    orderBy: "timestamp"
    orderDirection: "desc"
    limit: $limit
  ) {
    items {
      id
      pool
      previousSupplyAssets
      newSupplyAssets
      previousBorrowAssets
      newBorrowAssets
      interestEarned
      timestamp
      blockNumber
      transactionHash
    }
  }
}
```

## 8. Query Combined Pool + Recent APY Snapshots

### Query: Get Pool with Recent APY Snapshots
```graphql
query GetPoolWithAPYSnapshots($poolId: String!) {
  lendingPool(id: $poolId) {
    id
    address
    token0
    token1
    utilizationRate
    supplyAPY
    borrowAPY
    supplyRate
    borrowRate
    totalSupplyAssets
    totalBorrowAssets
    totalLiquidity
  }
  
  poolAPYSnapshots(
    where: { pool: $poolId }
    orderBy: "timestamp"
    orderDirection: "desc"
    limit: 24
  ) {
    items {
      supplyAPY
      borrowAPY
      utilizationRate
      timestamp
      blockNumber
    }
  }
}
```

## 9. Query APY Summary Statistics

### Query: Get APY Summary untuk Semua Pools
```graphql
query GetAPYSummary {
  lendingPools {
    items {
      address
      token0
      token1
      supplyAPY
      borrowAPY
      supplyRate
      borrowRate
      utilizationRate
      totalSupplyAssets
      totalBorrowAssets
    }
  }
}
```

## Cara Menggunakan Query

### 1. Via GraphQL Playground
Akses endpoint GraphQL di:
```
http://localhost:42069/graphql
```

### 2. Via HTTP Request
```javascript
const query = `
  query GetAllPoolsWithAPY {
    lendingPools {
      items {
        address
        token0
        token1
        supplyRate
        borrowRate
        utilizationRate
      }
    }
  }
`;

const response = await fetch('http://localhost:42069/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query })
});

const data = await response.json();
console.log(data);
```

### 3. Via curl
```bash
# Simple APY query
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"query SimpleAPYDisplay { lendingPools { items { address token0 token1 supplyAPY borrowAPY utilizationRate } } }"}' \
  http://localhost:42069/graphql

# Best APY opportunities
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"query BestAPYOpportunities { lendingPools(where: { supplyAPY: { gt: 0 } } orderBy: \"supplyAPY\" orderDirection: \"desc\" limit: 5) { items { address token0 token1 supplyAPY borrowAPY utilizationRate } } }"}' \
  http://localhost:42069/graphql
```

## Konversi Basis Points ke Persen

APY rates disimpan dalam basis points (1% = 100 basis points):

```javascript
function basisPointsToPercent(basisPoints) {
  return basisPoints / 100;
}

// Example: 500 basis points = 5%
const supplyAPY = basisPointsToPercent(500); // 5%
```

## Perbedaan Rate vs APY

- **supplyRate/borrowRate**: Tingkat bunga tahunan sederhana (simple interest)
- **supplyAPY/borrowAPY**: Tingkat bunga tahunan compound (compound interest)

APY selalu lebih tinggi dari Rate karena memperhitungkan efek compounding:

```javascript
// Contoh perbandingan:
// Rate: 1000 basis points = 10%
// APY: 1047 basis points = 10.47% (dengan daily compounding)
```

## Tips Penggunaan

1. **Real-time APY**: Gunakan query `lendingPools` untuk data APY terkini
2. **Historical Analysis**: Gunakan `poolAPYSnapshots` untuk trend analysis
3. **Performance**: Batasi hasil dengan `limit` untuk query yang besar
4. **Filtering**: Gunakan `where` clause untuk filter berdasarkan kriteria tertentu
5. **Sorting**: Gunakan `orderBy` dan `orderDirection` untuk mengurutkan hasil
