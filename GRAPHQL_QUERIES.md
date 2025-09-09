# Dynamic Lending Pools dengan GraphQL

## Sistem Dynamic Pools

Sistem ini bekerja dengan mendeteksi event `LendingPoolCreated` dari factory dan secara otomatis mencatat pool baru ke database. Data tersedia melalui GraphQL endpoint.

## GraphQL Endpoint
```
http://localhost:42069/graphql
```

## Queries untuk Dynamic Pools

### 1. Get All Lending Pools
```graphql
query GetAllPools {
  lendingPools {
    items {
      id
      address
      factory
      token0
      token1
      totalDeposits
      totalWithdrawals
      totalBorrows
      totalRepays
      created
    }
  }
}
```

### 2. Get Pool Creation Events
```graphql
query GetPoolCreationEvents {
  lendingPoolCreateds {
    items {
      id
      lendingPool
      collateralToken
      borrowToken
      ltv
      timestamp
      blockNumber
      transactionHash
    }
  }
}
```

### 3. Get Factory Statistics
```graphql
query GetFactoryStats {
  lendingPoolFactories {
    items {
      id
      address
      totalPoolsCreated
      created
    }
  }
}
```

### 4. Get Pools by Factory
```graphql
query GetPoolsByFactory($factoryAddress: String!) {
  lendingPools(where: { factory: $factoryAddress }) {
    items {
      id
      address
      token0
      token1
      totalDeposits
      totalBorrows
      created
    }
  }
}
```

### 5. Get Pool by Address
```graphql
query GetPoolByAddress($poolAddress: String!) {
  lendingPool(id: $poolAddress) {
    id
    address
    factory
    token0
    token1
    totalDeposits
    totalWithdrawals
    totalBorrows
    totalRepays
    created
  }
}
```

### 6. Get Latest Pool Creation Events
```graphql
query GetLatestPoolEvents($limit: Int!) {
  lendingPoolCreateds(
    orderBy: "blockNumber"
    orderDirection: "desc"
    limit: $limit
  ) {
    items {
      lendingPool
      collateralToken
      borrowToken
      ltv
      timestamp
    }
  }
}
```

## Real-time Subscriptions

Ponder juga mendukung subscriptions untuk real-time updates:

```graphql
subscription OnNewPoolCreated {
  lendingPoolCreated {
    id
    lendingPool
    collateralToken
    borrowToken
    ltv
    timestamp
  }
}
```

## Cara Kerja Dynamic Pools

1. **Factory Monitoring**: Ponder memantau event `LendingPoolCreated` dari address factory
2. **Auto Registration**: Ketika pool baru dibuat, akan otomatis masuk ke database
3. **GraphQL Access**: Data pool langsung tersedia melalui GraphQL queries
4. **Real-time Updates**: Frontend dapat melakukan polling atau menggunakan subscriptions

## Testing

1. Buat pool baru melalui factory contract
2. Tunggu beberapa detik untuk indexing
3. Query melalui GraphQL untuk melihat pool baru
4. Monitor logs Ponder untuk memastikan event terdeteksi
