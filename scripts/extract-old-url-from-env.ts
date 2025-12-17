/**
 * Extract old database URL from .env file comments
 */

import * as fs from 'fs'
import * as path from 'path'

const envPath = path.join(process.cwd(), '.env')
const OLD_DB_BACKUP_FILE = path.join(process.cwd(), '.old-database-url.txt')

if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found')
  process.exit(1)
}

const content = fs.readFileSync(envPath, 'utf-8')
const lines = content.split('\n')

// Look for commented OLD_DATABASE_URL
let oldUrl: string | null = null

for (const line of lines) {
  const trimmed = line.trim()
  // Check for commented OLD_DATABASE_URL (with or without quotes)
  if (trimmed.includes('OLD_DATABASE_URL')) {
    // Try to extract URL from various formats
    let match = trimmed.match(/OLD_DATABASE_URL=["']([^"']+)["']/)
    if (!match) {
      // Try without quotes
      match = trimmed.match(/OLD_DATABASE_URL=(.+)/)
      if (match) {
        const url = match[1].trim()
        // Remove comment if present
        const cleanUrl = url.replace(/^#\s*/, '').replace(/["']/g, '')
        if (cleanUrl.startsWith('postgresql://')) {
          oldUrl = cleanUrl
          break
        }
      }
    } else {
      oldUrl = match[1]
      break
    }
  }
}

if (oldUrl) {
  // Save to backup file
  fs.writeFileSync(OLD_DB_BACKUP_FILE, oldUrl, 'utf-8')
  console.log('✅ Found and saved old database URL!')
  console.log(`📝 Saved to: ${OLD_DB_BACKUP_FILE}`)
  console.log(`\n🔗 Old URL: ${oldUrl.substring(0, 60)}...`)
  console.log('\n✨ You can now run: npm run db:migrate')
} else {
  console.log('⚠️  Could not find OLD_DATABASE_URL in .env file')
  console.log('\nPlease make sure you have a line like:')
  console.log('  # OLD_DATABASE_URL="postgresql://..."')
  console.log('  or')
  console.log('  OLD_DATABASE_URL="postgresql://..."')
}

