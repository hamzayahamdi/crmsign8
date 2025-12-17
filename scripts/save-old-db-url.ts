/**
 * Script to save your old database URL before migration
 * 
 * This helps preserve your old database URL so you can migrate data later.
 */

import * as fs from 'fs'
import * as path from 'path'

const OLD_DB_BACKUP_FILE = path.join(process.cwd(), '.old-database-url.txt')

const oldUrl = process.argv[2] || process.env.OLD_DATABASE_URL

if (!oldUrl) {
  console.log('📝 Save Old Database URL\n')
  console.log('Usage:')
  console.log('  tsx scripts/save-old-db-url.ts "your-old-database-url"')
  console.log('  Or: OLD_DATABASE_URL="..." tsx scripts/save-old-db-url.ts\n')
  console.log('This will save your old database URL so you can use it for migration.')
  process.exit(1)
}

fs.writeFileSync(OLD_DB_BACKUP_FILE, oldUrl.trim(), 'utf-8')
console.log(`✅ Saved old database URL to ${OLD_DB_BACKUP_FILE}`)
console.log('\nNow you can run the migration with:')
console.log('  npm run db:migrate')

