# Database Configuration Guide

## Setup

### 1. Local Development (PGlite)
```bash
# Menggunakan database lokal (PGlite)
pnpm dev
```

### 2. Production dengan Cloud Database
```bash
# Edit .env.production dengan connection string database cloud Anda
DATABASE_URL=postgresql://username:password@host:port/database_name

# Jalankan dengan cloud database
pnpm start
```

## Environment Scripts

- `pnpm dev` - Development dengan local PGlite database
- `pnpm start` - Production dengan cloud PostgreSQL database  
- `pnpm start:local` - Production mode dengan local database
- `pnpm start:cloud` - Production dengan cloud database (sama dengan start)
- `pnpm db:migrate` - Migrate database untuk production

## Cloud Database Providers

### Neon
```
DATABASE_URL=postgresql://username:password@ep-xxx.neon.tech/database_name
```

### Supabase
```
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
```

### Railway
```
DATABASE_URL=postgresql://postgres:password@xxx.railway.app:5432/railway
```

### Vercel Postgres
```
DATABASE_URL=postgresql://username:password@xxx.vercel-storage.com:5432/database_name
```

## Configuration Logic

- **Development (`pnpm dev`)**: Otomatis menggunakan PGlite (local)
- **Production (`pnpm start`)**: Menggunakan DATABASE_URL dari .env.production
- **Fallback**: Jika tidak ada DATABASE_URL, tetap menggunakan PGlite

## File Structure

- `.env` - Development environment variables
- `.env.production` - Production environment variables  
- `.env.example` - Template untuk environment variables
- `ponder.config.ts` - Auto-detects database berdasarkan environment
