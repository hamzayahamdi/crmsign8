/**
 * Helper script to run database migration
 * 
 * This script helps you migrate data from your old database to the new database.
 * It will prompt you for the old database URL if not provided.
 */

import * as fs from 'fs'
import * as path from 'path'

const OLD_DB_BACKUP_FILE = path.join(process.cwd(), '.old-database-url.txt')

// Get URLs from environment or backup file
let OLD_DATABASE_URL = process.env.OLD_DATABASE_URL
const NEW_DATABASE_URL = process.env.DATABASE_URL || process.env.NEW_DATABASE_URL

// Try to read old URL from backup file
if (!OLD_DATABASE_URL && fs.existsSync(OLD_DB_BACKUP_FILE)) {
  OLD_DATABASE_URL = fs.readFileSync(OLD_DB_BACKUP_FILE, 'utf-8').trim()
  console.log(`📂 Found old database URL in backup file\n`)
}

if (!OLD_DATABASE_URL) {
  console.log('❌ OLD_DATABASE_URL is required to migrate data')
  console.log('\nPlease provide your OLD database URL.')
  console.log('You can:')
  console.log('  1. Set it as environment variable: OLD_DATABASE_URL="..." npm run db:migrate')
  console.log('  2. Save it to .old-database-url.txt file')
  console.log('  3. Or provide it when prompted\n')
  
  // Try to get it from user input (if running interactively)
  if (process.stdin.isTTY) {
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    rl.question('Enter your OLD database URL (or press Enter to exit): ', (answer: string) => {
      if (answer.trim()) {
        // Save to backup file for future use
        fs.writeFileSync(OLD_DB_BACKUP_FILE, answer.trim(), 'utf-8')
        console.log(`\n✅ Saved old database URL to ${OLD_DB_BACKUP_FILE}`)
        console.log('\nNow run the migration:')
        console.log(`OLD_DATABASE_URL="${answer.trim}" NEW_DATABASE_URL="${NEW_DATABASE_URL}" npm run db:migrate`)
      }
      rl.close()
    })
  } else {
    process.exit(1)
  }
} else {
  // Save old URL to backup file
  if (!fs.existsSync(OLD_DB_BACKUP_FILE)) {
    fs.writeFileSync(OLD_DB_BACKUP_FILE, OLD_DATABASE_URL, 'utf-8')
    console.log(`✅ Saved old database URL to backup file\n`)
  }
  
  if (!NEW_DATABASE_URL) {
    console.error('❌ NEW_DATABASE_URL or DATABASE_URL must be set')
    console.error('   Make sure your .env file has the new DATABASE_URL')
    process.exit(1)
  }
  
  console.log('🚀 Starting migration...\n')
  console.log(`📊 Old Database: ${OLD_DATABASE_URL.substring(0, 50)}...`)
  console.log(`📊 New Database: ${NEW_DATABASE_URL.substring(0, 50)}...\n`)
  
  // Import and run the migration
  import('./migrate-database')
}

