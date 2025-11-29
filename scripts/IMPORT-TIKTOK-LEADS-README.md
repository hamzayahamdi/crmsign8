# TikTok Leads Import Script - November Campaign

## Overview

This script imports new TikTok leads for the November campaign while preserving historical data (notes and calls) from existing leads.

## Features

✅ **Backup existing leads** - Creates a JSON backup of all current leads with their history  
✅ **Clear old data** - Removes old lead data to start fresh  
✅ **Import new leads** - Imports leads from `Tiktok-Leads.csv`  
✅ **Preserve history** - Restores notes and calls for leads that existed before (matched by phone number)  
✅ **Set status to Qualifié** - All imported leads have status "qualifie"  
✅ **Campaign tracking** - Sets `campaignName` to "Novembre" for all leads  
✅ **Architect assignment** - Automatically assigns leads to architects based on their city  
✅ **Data normalization** - Cleans phone numbers, normalizes cities, and property types  

## How to Use

### 1. Prepare the CSV file

Make sure `Tiktok-Leads.csv` is in the root directory of the project.

CSV format:
```
,Numero de Telephone,Ville,Type de Bien,Statut,
Name,Phone,City,Property Type,Status,Architect
```

### 2. Run the script

```bash
npx tsx scripts/import-tiktok-leads-november.ts
```

Or with ts-node:
```bash
npx ts-node scripts/import-tiktok-leads-november.ts
```

### 3. Check the results

The script will:
- Create a backup in `backups/leads-backup-[timestamp].json`
- Import all leads from the CSV
- Show a detailed summary of imported leads

## Data Processing

### Phone Number Normalization
- Removes spaces, dashes, parentheses
- Handles international formats (+212, 212, 00212)
- Ensures format starts with 0

### City Normalization
- Handles Arabic and French variations
- Maps common city names to standard format
- Examples:
  - "الدار البيضاء" → "Casablanca"
  - "مراكش" → "Marrakech"
  - "فاس" → "Fes"

### Property Type Normalization
- Maps variations to standard types:
  - Villa, Appartement, Studio, Bureau, Magasin, Riad

### Architect Assignment
All leads are assigned to **TAZI** by default, but the script supports city-based assignment.

## History Preservation

The script matches leads by phone number. If a lead with the same phone number existed before:
- All previous notes are restored
- All previous call history is preserved
- The lead gets a fresh start with new data but keeps its history

## Backup

Before clearing any data, the script creates a backup file:
```
backups/leads-backup-[timestamp].json
```

This file contains:
- All lead information
- All notes with authors and timestamps
- Status details and messages

## Output Summary

After import, the script shows:
- Total leads imported
- Breakdown by status
- Breakdown by architect
- Top 10 cities
- Campaign statistics
- Number of leads with restored history

## Error Handling

- Skips empty rows automatically
- Logs errors for problematic records
- Continues import even if some records fail
- Shows final count of imported, skipped, and failed records

## Important Notes

⚠️ **This script will DELETE all existing leads** - Make sure you have a backup!  
⚠️ **Run in production carefully** - Test on a development database first  
⚠️ **Check the CSV format** - Ensure the CSV matches the expected format  

## Troubleshooting

### CSV not found
Make sure `Tiktok-Leads.csv` is in the project root directory.

### Database connection error
Check your `.env` file has correct `DATABASE_URL` and `DIRECT_URL`.

### Import fails
Check the error message and verify:
- CSV format is correct
- Database is accessible
- No schema conflicts

## Restore from Backup

If you need to restore from backup, you can use the backup JSON file to recreate leads manually or write a restore script.

## Next Steps

After import:
1. Verify leads in the dashboard
2. Check architect assignments
3. Verify campaign name is set to "Novembre"
4. Confirm all leads have status "qualifie"
5. Check that history was preserved for existing leads
