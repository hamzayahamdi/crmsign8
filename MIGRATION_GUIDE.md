# Database Migration Guide

This guide will help you migrate all your data from your old database(s) to the new Supabase database without duplications.

## Prerequisites

1. ✅ New destination database URLs (already provided):
   - `DATABASE_URL`: `postgresql://postgres.yukakumsjthbqnfotclx:Fqbtk3wRpBedQODh@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
   - `DIRECT_URL`: `postgresql://postgres.yukakumsjthbqnfotclx:Fqbtk3wRpBedQODh@aws-1-us-east-1.pooler.supabase.com:5432/postgres`

2. ✅ Source database URLs (from your old databases)

## Step-by-Step Migration Process

### Step 1: Update Destination Database URLs

Update your `.env` file with the new destination database URLs:

```bash
npm run db:update-destination
```

Or manually edit your `.env` file and set:
```env
DATABASE_URL="postgresql://postgres.yukakumsjthbqnfotclx:Fqbtk3wRpBedQODh@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.yukakumsjthbqnfotclx:Fqbtk3wRpBedQODh@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
```

### Step 2: Configure Source Database URLs

Configure your source database URLs (the old databases with your data):

```bash
npm run db:configure-sources
```

This will prompt you to enter your source database URLs. You can provide:
- One source database URL
- Two source database URLs (if you have data in multiple databases)

Alternatively, you can:
1. Set environment variables:
   ```bash
   export OLD_DATABASE_URL="your-first-source-db-url"
   export OLD_DATABASE_URL_2="your-second-source-db-url"
   ```

2. Or create files manually:
   - Create `.old-database-url.txt` with your first source database URL
   - Create `.old-database-url-2.txt` with your second source database URL (optional)

### Step 3: Verify Database Connections

Before running the migration, verify that you can connect to all databases:

```bash
npm run db:verify
```

### Step 4: Run the Safe Migration

Run the migration script that will:
- ✅ Check for existing records to prevent duplicates
- ✅ Only migrate new/missing data
- ✅ Handle multiple source databases
- ✅ Provide detailed progress logging

```bash
npm run db:migrate:safe
```

## What the Migration Script Does

The safe migration script (`migrate-database-safe.ts`) will:

1. **Connect to all databases** (source and destination)
2. **For each table** (in the correct order to respect foreign keys):
   - Collect all data from all source databases
   - Deduplicate records within source databases
   - Check which records already exist in the destination
   - Only migrate records that don't exist in the destination
   - Insert new records in batches
3. **Provide detailed logging**:
   - Progress for each table
   - Number of records found, migrated, skipped, and errors
   - Final summary report

## Migration Order

The migration follows this order to respect foreign key relationships:

1. Users
2. Leads
3. Lead Notes
4. Contacts
5. Notes
6. Clients
7. Opportunities
8. Tasks
9. Timeline
10. Contact Documents
11. Opportunity Documents
12. Documents
13. Contact Payments
14. Payments
15. Devis
16. Historique
17. Client Stage History
18. Calendar Events
19. Appointments
20. Event Reminders
21. Notification Preferences
22. Notifications

## Safety Features

✅ **Duplicate Prevention**: Checks for existing records by ID before inserting  
✅ **Multiple Source Support**: Can migrate from multiple source databases  
✅ **Incremental Migration**: Only migrates new/missing data  
✅ **Error Handling**: Continues migration even if some records fail  
✅ **Detailed Logging**: Shows progress and statistics for each table  

## Troubleshooting

### Error: "No source database URLs found"

**Solution**: Run `npm run db:configure-sources` to configure your source database URLs.

### Error: "DATABASE_URL must be set"

**Solution**: Make sure your `.env` file has the `DATABASE_URL` set. Run `npm run db:update-destination` to update it.

### Some records failed to migrate

**Solution**: Check the error messages in the console. Common issues:
- Foreign key constraints (parent record doesn't exist)
- Data type mismatches
- Invalid enum values

The script will continue migrating other records even if some fail. You can run the migration again - it will only migrate the missing records.

### Migration is slow

**Solution**: This is normal for large databases. The script processes data in batches to avoid memory issues. Be patient and let it complete.

## After Migration

1. **Verify the data**: Check that all your data is in the new database
2. **Test your application**: Make sure everything works with the new database
3. **Keep backups**: Don't delete your old databases until you're sure everything is working

## Need Help?

If you encounter any issues:
1. Check the migration logs for specific error messages
2. Verify your database URLs are correct
3. Ensure your new database schema matches the old one (run `npx prisma db push` if needed)

