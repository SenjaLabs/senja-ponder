# Ponder Lending Protocol Schema

## Overview
Skema database yang lengkap untuk protokol lending/borrowing yang mendukung pool dinamis. Tabel-tabel ini dirancang untuk tracking semua aktivitas dalam protokol lending yang mencakup factory pattern untuk pool dinamis.

## Tables Structure

### Core Tables

#### LendingPoolFactory
Mengelola factory contract yang membuat pool-pool lending
- `id` - Address factory contract
- `owner`, `helper`, `protocol`, `isHealthy`, `lendingPoolDeployer` - Metadata factory
- `poolCount` - Jumlah total pool yang dibuat
- `createdAt`, `blockNumber` - Timestamp creation

#### LendingPool
Setiap pool lending individual yang dibuat oleh factory
- `id` - Address pool contract
- `factory` - Address factory yang membuat pool ini
- `collateralToken`, `borrowToken` - Token yang digunakan untuk collateral dan borrowing
- `ltv` - Loan-to-Value ratio
- `totalCollateral`, `totalBorrowed`, `totalLiquidity`, `totalLiquidityShares` - Pool statistics
- `isActive` - Status pool
- `createdAt`, `blockNumber` - Metadata

#### UserPosition
Posisi individual user di setiap pool
- `id` - Kombinasi user-pool sebagai unique ID
- `user` - Address user
- `pool` - Address pool
- `positionAddress` - Address position contract (jika ada)
- `collateralBalance`, `borrowBalance`, `liquidityShares`, `liquidityBalance` - Balances user
- `isActive` - Status posisi
- `createdAt`, `updatedAt`, `blockNumber` - Metadata

### Transaction Tables
Menyimpan history semua transaksi:

#### SupplyCollateralTransaction
- Track supply collateral events
- `user`, `pool`, `amount`, `timestamp`, `transactionHash`, `logIndex`

#### SupplyLiquidityTransaction  
- Track supply liquidity events
- `user`, `pool`, `amount`, `shares`, `timestamp`, dll

#### WithdrawLiquidityTransaction
- Track withdraw liquidity events
- Similar structure dengan supply

#### BorrowTransaction
- Track borrow events (termasuk cross-chain)
- `chainId`, `bridgeTokenSender` untuk cross-chain support

#### RepayTransaction
- Track repay events
- `user`, `pool`, `amount`, `shares`, dll

### Infrastructure Tables

#### TokenDataStream
Token price/data stream management
- `token`, `dataStream`, `isActive`

#### BasicTokenSender
Cross-chain token sender management
- `chainId`, `basicTokenSender`, `isActive`

### Analytics Tables

#### PoolDailyStats
Daily aggregated statistics per pool
- `pool`, `date`
- `totalCollateral`, `totalBorrowed`, `totalLiquidity`
- `utilizationRate`, volume metrics
- `uniqueSuppliers`, `uniqueBorrowers`

#### UserDailyStats  
Daily aggregated statistics per user
- `user`, `date`
- `totalCollateralUSD`, `totalBorrowedUSD`, `totalLiquidityUSD`
- `activePositions`, `healthFactor`

## Key Features

### Dynamic Pool Support
- Pool tidak hardcoded dalam config
- Factory event `LendingPoolCreated` akan otomatis membuat record pool baru
- Support unlimited pools yang dibuat melalui factory

### Cross-Chain Compatibility
- Support untuk `chainId` dan `bridgeTokenSender` dalam borrow transactions
- `BasicTokenSender` table untuk manage cross-chain token senders

### Comprehensive Analytics
- Real-time pool statistics
- Daily aggregated data untuk historical analysis
- User portfolio tracking
- Utilization rates dan volume metrics

### Event-Driven Architecture
- Semua data update berdasarkan on-chain events
- Immutable transaction history
- Consistent state management

## API Endpoints (Available in api.ts)

### Pool Management
- `GET /api/pools` - List semua pools
- `GET /api/pools/:address` - Get pool detail
- `GET /api/pools/:address/stats` - Pool statistics
- `GET /api/search/pools?token=:address` - Search pools by token

### User Management  
- `GET /api/users/:address/positions` - User positions
- `GET /api/users/:userAddress/pools/:poolAddress` - Specific position

### Factory & Infrastructure
- `GET /api/factory` - Factory statistics
- `GET /api/token-streams` - Token data streams
- `GET /api/token-senders` - Cross-chain token senders

### Transactions
- `GET /api/pools/:address/supply-transactions`
- `GET /api/pools/:address/borrow-transactions`

## Database
- PostgreSQL database hosted di Neon
- Automatic table creation melalui Ponder schema
- Connection string sudah dikonfigurasi

## Running
```bash
pnpm dev
```
Server akan berjalan di http://localhost:42069 dengan GraphQL endpoint dan REST API.

## Notes
- Pool addresses akan ditambahkan secara dinamis saat factory mengeluarkan event `LendingPoolCreated`
- Schema mendukung multi-chain architecture
- Semua amount disimpan sebagai BigInt untuk precision
- Timestamp menggunakan block timestamp untuk consistency
