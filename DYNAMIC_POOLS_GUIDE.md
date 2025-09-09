# Implementasi Lending Pool Dinamis dengan Ponder

## Bagaimana Sistem Bekerja

Sistem lending pool dinamis ini bekerja dengan cara:

### 1. **Factory Event Handler**
- Monitor event `LendingPoolCreated` dari `LendingPoolFactory`
- Setiap kali ada pool baru yang dibuat, event akan dicatat di database
- Pool baru akan masuk ke dalam tracking system secara otomatis

### 2. **Dynamic Pool Discovery**
- Factory handler mencatat semua pool yang dibuat dalam tabel `LendingPool`
- Pool addresses disimpan dengan metadata (collateral token, borrow token, LTV)
- API bisa query pool addresses yang tersedia secara dinamis

### 3. **Event Tracking untuk Pool Individual**
- Jika perlu track events dari pool tertentu, dapat ditambahkan ke konfigurasi
- Atau menggunakan approach hybrid dengan periodic sync

## Struktur Database

```sql
-- Tabel Factory untuk tracking factory
LendingPoolFactory {
  id: string (factory address)
  address: string
  totalPoolsCreated: bigint
  created: bigint
}

-- Tabel untuk setiap pool yang dibuat
LendingPool {
  id: string (pool address)
  address: string
  factory: string (factory address)
  token0: string (collateral token)
  token1: string (borrow token)
  totalDeposits: bigint
  totalWithdrawals: bigint
  totalBorrows: bigint
  totalRepays: bigint
  created: bigint
}

-- Event creation record
LendingPoolCreated {
  id: string
  lendingPool: string
  collateralToken: string
  borrowToken: string
  ltv: bigint
  timestamp: bigint
  blockNumber: bigint
  transactionHash: string
}
```

## API Endpoints

### 1. Get All Pools
```typescript
// GET /pools
// Returns: Array of all lending pools
```

### 2. Get Pool by Address
```typescript
// GET /pools/:address
// Returns: Pool details with statistics
```

### 3. Get Pools by Token Pair
```typescript
// GET /pools/pair/:token0/:token1
// Returns: Pools for specific token pair
```

### 4. Get Factory Stats
```typescript
// GET /factory/:address
// Returns: Factory statistics and created pools
```

## Real-time Updates

Ketika pool baru dibuat:
1. Event `LendingPoolCreated` dipicu di blockchain
2. Ponder mendeteksi event dan menjalankan factory handler
3. Pool baru dicatat di database dengan semua metadata
4. API langsung bisa return pool yang baru dibuat
5. Front-end bisa polling atau menggunakan subscriptions untuk updates

## Cara Testing

1. Deploy contract baru dengan factory
2. Call function `createPool` di factory
3. Monitor logs Ponder untuk melihat event detection
4. Query API untuk melihat pool yang baru dibuat

## Kelebihan Approach Ini

✅ **Real-time**: Pool baru langsung terdeteksi
✅ **Scalable**: Tidak perlu hardcode pool addresses
✅ **Complete metadata**: Semua info pool tersimpan
✅ **Event history**: Tracking lengkap kapan pool dibuat
✅ **API ready**: Langsung bisa digunakan oleh frontend

## Cara Implementation

Sistem sudah disetup dengan:
- `factoryHandlers.ts` - Handle event pool creation
- `lendingPoolHandlers.ts` - Handle pool events (jika address diketahui)
- Schema database yang sesuai
- API structure untuk query pools

Untuk production, tinggal:
1. Pastikan RPC endpoint reliable
2. Run `pnpm dev` untuk start indexing
3. Monitor logs untuk memastikan events terdeteksi
4. Build frontend yang consume API
