# Quick Start: Database Migration

## Fast Migration Steps

### 1. Update .env file with new URLs

Run this command to automatically update your `.env` file:

```bash
npm run db:update-urls
```

Or manually update your `.env` file with:

```env
DATABASE_URL="postgresql://postgres.yukakumsjthbqnfotclxFqbtk3wRpBedQODh@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.yukakumsjthbqnfotclx:Fqbtk3wRpBedQODh@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
```

### 2. Verify new database connection

```bash
npm run db:verify
```

### 3. Create schema in new database

```bash
npx prisma generate
npx prisma db push
```

### 4. Migrate data from old database

**IMPORTANT:** You need to provide your OLD database URL. If it's currently in your `.env` file, you can:

```bash
# Save current DATABASE_URL as OLD_DATABASE_URL before updating
OLD_DATABASE_URL="your-old-database-url" NEW_DATABASE_URL="postgresql://postgres.yukakumsjthbqnfotclxFqbtk3wRpBedQODh@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true" npm run db:migrate
```

### 5. Verify migration completed

```bash
npm run db:verify
```

### 6. Test your application

```bash
npm run dev
```

## What the scripts do:

- **`db:update-urls`**: Updates your `.env` file with the new database URLs
- **`db:verify`**: Tests connection to the new database and shows table counts
- **`db:migrate`**: Migrates all data from old database to new database

## Need Help?

See `MIGRATION_GUIDE.md` for detailed instructions and troubleshooting.

