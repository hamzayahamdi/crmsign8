# 📊 Lead Duration Tracking - Implementation Guide

## 🎯 Overview

This feature automatically tracks how long each lead stays in "Lead" status before being converted to a client or marked as non-interested. It provides valuable insights for performance analysis by source, month, and commercial.

---

## ✅ What Was Implemented

### 1. **Database Changes**

#### New Field: `convertedAt`
- **Type**: `TIMESTAMPTZ` (nullable)
- **Purpose**: Records when a lead was converted or marked as non-interested
- **Location**: `leads` table

#### Automatic Trigger
A PostgreSQL trigger automatically sets `convertedAt` when:
- Lead status changes to `converti` (converted)
- Lead status changes to `non_interesse` (not interested)
- Clears `convertedAt` if status changes back to active

### 2. **Backend Updates**

#### Prisma Schema (`prisma/schema.prisma`)
```prisma
model Lead {
  // ... existing fields
  convertedAt DateTime? @map("converted_at")
  // ... rest of model
}
```

#### API Endpoints Updated

**`/api/leads/[id]/convert`** (POST)
- Automatically sets `convertedAt` when converting lead to client

**`/api/leads/[id]`** (PUT)
- Sets `convertedAt` when status changes to `converti` or `non_interesse`
- Clears `convertedAt` when status changes back to active

**`/api/leads/analytics/duration`** (GET) - NEW
- Returns comprehensive duration analytics
- Supports filtering by date range, source, and commercial
- Provides statistics by source, month, and commercial

### 3. **Frontend Updates**

#### New Utility Functions (`lib/lead-duration-utils.ts`)
- `calculateLeadDurationDays()` - Calculate duration in days
- `getLeadDuration()` - Get formatted duration with label
- `getDetailedLeadDuration()` - Get detailed duration string with dates
- `getLeadDurationColor()` - Get color class based on duration
- `getLeadDurationIcon()` - Get icon based on duration
- `calculateAverageLeadDuration()` - Calculate average from array

#### Updated Components
**`components/leads-table-improved.tsx`**
- Added "⏱️ Durée en lead" column
- Displays duration badge with color coding:
  - 🟢 Green: 0-2 days (fresh leads)
  - 🔵 Blue: 3-6 days (recent)
  - 🟡 Yellow: 7-13 days (moderate)
  - 🟠 Orange: 14-29 days (aging)
  - 🔴 Red: 30+ days (old)
  - 🔒 Gray: Converted/closed (locked)

### 4. **TypeScript Types**

Updated `types/lead.ts`:
```typescript
export interface Lead {
  // ... existing fields
  convertedAt?: string
  // ... rest of interface
}
```

---

## 🚀 Installation Steps

### Step 1: Run Database Migration

```bash
# Apply the migration SQL
psql $DATABASE_URL -f prisma/migrations/add_lead_converted_at.sql

# Or if using Supabase SQL Editor, copy and paste the contents of:
# prisma/migrations/add_lead_converted_at.sql
```

### Step 2: Generate Prisma Client

```bash
npx prisma generate
```

### Step 3: Restart Development Server

```bash
npm run dev
```

---

## 📖 Usage Examples

### Frontend: Display Lead Duration

```typescript
import { getLeadDuration, getLeadDurationColor, getLeadDurationIcon } from '@/lib/lead-duration-utils'

// In your component
const duration = getLeadDuration(lead.createdAt, lead.convertedAt)
const colorClass = getLeadDurationColor(duration.days, duration.isActive)
const icon = getLeadDurationIcon(duration.days, duration.isActive)

return (
  <Badge className={colorClass}>
    {icon} {duration.label}
  </Badge>
)
```

### Backend: Calculate Duration in SQL

```sql
-- Get all leads with their duration in days
SELECT
  id,
  nom,
  source,
  statut,
  created_at,
  converted_at,
  COALESCE(
    DATE_PART('day', converted_at - created_at),
    DATE_PART('day', NOW() - created_at)
  ) AS duration_days
FROM leads
ORDER BY duration_days DESC;
```

### API: Fetch Analytics

```typescript
// Fetch duration analytics
const response = await fetch('/api/leads/analytics/duration', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})

const analytics = await response.json()

console.log('Average conversion time:', analytics.overall.averageConversionDuration, 'days')
console.log('By source:', analytics.bySource)
console.log('By commercial:', analytics.byCommercial)
```

---

## 📊 Analytics API Response

### Endpoint: `GET /api/leads/analytics/duration`

#### Query Parameters (Optional)
- `startDate` - Filter leads created after this date (ISO string)
- `endDate` - Filter leads created before this date (ISO string)
- `source` - Filter by specific source
- `commercial` - Filter by specific commercial

#### Response Structure

```json
{
  "overall": {
    "totalLeads": 150,
    "convertedLeads": 45,
    "nonInterestedLeads": 30,
    "activeLeads": 75,
    "averageDuration": 8,
    "averageConversionDuration": 5,
    "conversionRate": 30
  },
  "bySource": [
    {
      "source": "tiktok",
      "averageDays": 3,
      "count": 50,
      "minDays": 1,
      "maxDays": 12
    },
    {
      "source": "magasin",
      "averageDays": 8,
      "count": 40,
      "minDays": 2,
      "maxDays": 25
    }
  ],
  "byMonth": [
    {
      "month": "Novembre 2025",
      "averageDays": 4,
      "count": 30
    }
  ],
  "byCommercial": [
    {
      "commercial": "Ahmed",
      "averageDays": 5,
      "count": 60,
      "conversionRate": 35
    }
  ]
}
```

---

## 🎨 UI Features

### Lead Table
- **New Column**: "⏱️ Durée en lead"
- **Color-Coded Badges**: Visual indication of lead age
- **Hover Tooltips**: Shows if lead is active or converted
- **Real-time Updates**: Duration updates automatically

### Duration Display Examples
- `🟢 Aujourd'hui` - Created today
- `🔵 3 jours` - 3 days old
- `🟡 2 semaines` - 2 weeks old
- `🟠 3 semaines` - 3 weeks old
- `🔴 2 mois` - 2 months old
- `🔒 5 jours` - Converted/closed (locked)

---

## 🧪 Testing

### Test Scenarios

1. **Create a new lead** → Should show "Aujourd'hui"
2. **Convert a lead** → Duration badge should turn gray with 🔒
3. **Mark lead as non-interested** → Duration should lock
4. **Change status back to active** → Duration should resume counting
5. **View analytics** → Should show accurate statistics

### SQL Queries for Testing

```sql
-- Check converted_at is set correctly
SELECT id, nom, statut, created_at, converted_at
FROM leads
WHERE statut IN ('converti', 'non_interesse')
LIMIT 10;

-- Check average duration by source
SELECT 
  source,
  COUNT(*) as count,
  ROUND(AVG(
    COALESCE(
      DATE_PART('day', converted_at - created_at),
      DATE_PART('day', NOW() - created_at)
    )
  )) as avg_days
FROM leads
GROUP BY source
ORDER BY avg_days;
```

---

## 🔍 Performance Insights

### What You Can Analyze

1. **By Source**
   - Which lead sources convert fastest?
   - Which sources have longest lead times?
   - Compare TikTok vs Magasin vs Facebook

2. **By Month**
   - Are leads converting faster this month?
   - Seasonal trends in conversion time
   - Campaign performance over time

3. **By Commercial**
   - Which sales reps convert leads fastest?
   - Identify top performers
   - Training opportunities for slower converters

4. **Overall Metrics**
   - Average time to conversion
   - Conversion rate
   - Active vs converted lead ratio

---

## 🛠️ Maintenance

### Backfilling Existing Data

The migration automatically backfills `converted_at` for existing converted leads using their `updated_at` timestamp as an estimate.

To manually backfill:
```sql
UPDATE leads 
SET converted_at = updated_at 
WHERE statut IN ('converti', 'non_interesse') 
AND converted_at IS NULL;
```

### Database Trigger

The trigger is automatically created by the migration. To verify:
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_lead_status_change';

-- Check trigger function
\df set_lead_converted_date
```

---

## 📝 Files Modified/Created

### Created
- `prisma/migrations/add_lead_converted_at.sql` - Database migration
- `lib/lead-duration-utils.ts` - Utility functions
- `app/api/leads/analytics/duration/route.ts` - Analytics API
- `LEAD_DURATION_TRACKING.md` - This documentation

### Modified
- `prisma/schema.prisma` - Added convertedAt field
- `types/lead.ts` - Added convertedAt to interface
- `app/api/leads/[id]/convert/route.ts` - Set convertedAt on conversion
- `app/api/leads/[id]/route.ts` - Handle convertedAt on status changes
- `components/leads-table-improved.tsx` - Display duration column

---

## 🎯 Next Steps (Optional Enhancements)

1. **Dashboard Widget**: Create a visual chart showing duration trends
2. **Alerts**: Notify when leads exceed certain age thresholds
3. **Export**: Add CSV export for analytics data
4. **Filters**: Add duration range filters to lead table
5. **Benchmarks**: Set target conversion times per source

---

## 🐛 Troubleshooting

### Issue: Duration not showing
- **Solution**: Run `npx prisma generate` and restart server

### Issue: convertedAt not being set
- **Solution**: Check if database trigger was created successfully

### Issue: TypeScript errors
- **Solution**: Regenerate Prisma client: `npx prisma generate`

### Issue: Old leads showing incorrect duration
- **Solution**: Run backfill SQL query (see Maintenance section)

---

## 📞 Support

For questions or issues:
1. Check this documentation
2. Review the code comments in `lib/lead-duration-utils.ts`
3. Test with the SQL queries provided above
4. Check Prisma logs for database errors

---

**✅ Implementation Complete!**

The lead duration tracking system is now fully operational and ready to provide valuable insights into your sales pipeline performance.
