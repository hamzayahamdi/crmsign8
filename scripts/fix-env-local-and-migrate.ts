/**
 * Extract old database URLs from .env.local and run migration
 */

import * as fs from 'fs'
import * as path from 'path'

const envLocalPath = path.join(process.cwd(), '.env.local')
const OLD_DB_BACKUP_FILE = path.join(process.cwd(), '.old-database-url.txt')

if (!fs.existsSync(envLocalPath)) {
  console.error('❌ .env.local file not found')
  process.exit(1)
}

const content = fs.readFileSync(envLocalPath, 'utf-8')
const lines = content.split('\n')

let oldDatabaseUrl: string | null = null
let oldDirectUrl: string | null = null

// Extract old URLs from comments
for (const line of lines) {
  const trimmed = line.trim()
  
  // Check for OLD_DATABASE_URL in comment
  if (trimmed.startsWith('#') && trimmed.includes('OLD_DATABASE_URL=')) {
    const match = trimmed.match(/OLD_DATABASE_URL=["']([^"']+)["']/)
    if (match && match[1]) {
      oldDatabaseUrl = match[1]
    }
  }
  
  // Check for OLD_DIRECT_URL in comment
  if (trimmed.startsWith('#') && trimmed.includes('OLD_DIRECT_URL=')) {
    const match = trimmed.match(/OLD_DIRECT_URL=["']([^"']+)["']/)
    if (match && match[1]) {
      oldDirectUrl = match[1]
    }
  }
}

if (oldDatabaseUrl) {
  // Save old database URL
  fs.writeFileSync(OLD_DB_BACKUP_FILE, oldDatabaseUrl, 'utf-8')
  console.log('✅ Found and saved old database URL from .env.local')
  console.log(`📝 Old Database: ${oldDatabaseUrl.substring(0, 60)}...`)
  console.log(`\n✨ Saved to: ${OLD_DB_BACKUP_FILE}`)
  console.log('\n🚀 Ready to migrate! Run: npm run db:migrate')
} else {
  console.error('❌ Could not find OLD_DATABASE_URL in .env.local comments')
  process.exit(1)
}

