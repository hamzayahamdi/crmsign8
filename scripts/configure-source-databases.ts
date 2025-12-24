/**
 * Helper script to configure source database URLs for migration
 * 
 * This script helps you save your source database URLs for the migration.
 * 
 * Usage:
 *   tsx scripts/configure-source-databases.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

const OLD_DB_BACKUP_FILE = path.join(process.cwd(), '.old-database-url.txt')
const OLD_DB_BACKUP_FILE_2 = path.join(process.cwd(), '.old-database-url-2.txt')

function question(rl: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

async function configureSourceDatabases() {
  console.log('🔧 Source Database Configuration\n')
  console.log('This script will help you save your source database URLs.')
  console.log('These URLs will be used by the migration script.\n')
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  
  try {
    // Check if files already exist
    const existing1 = fs.existsSync(OLD_DB_BACKUP_FILE)
    const existing2 = fs.existsSync(OLD_DB_BACKUP_FILE_2)
    
    if (existing1 || existing2) {
      console.log('📂 Found existing source database URLs:')
      if (existing1) {
        const url1 = fs.readFileSync(OLD_DB_BACKUP_FILE, 'utf-8').trim()
        console.log(`   1. ${url1.substring(0, 60)}...`)
      }
      if (existing2) {
        const url2 = fs.readFileSync(OLD_DB_BACKUP_FILE_2, 'utf-8').trim()
        console.log(`   2. ${url2.substring(0, 60)}...`)
      }
      console.log()
      
      const overwrite = await question(rl, 'Do you want to update these? (y/n): ')
      if (overwrite.toLowerCase() !== 'y') {
        console.log('\n✅ Keeping existing configuration')
        rl.close()
        return
      }
    }
    
    // Get first source database
    console.log('\n📊 Source Database 1:')
    const url1 = await question(rl, 'Enter your first source database URL (or press Enter to skip): ')
    
    if (url1.trim()) {
      fs.writeFileSync(OLD_DB_BACKUP_FILE, url1.trim(), 'utf-8')
      console.log(`   ✅ Saved to ${OLD_DB_BACKUP_FILE}`)
    }
    
    // Get second source database
    console.log('\n📊 Source Database 2 (optional):')
    const url2 = await question(rl, 'Enter your second source database URL (or press Enter to skip): ')
    
    if (url2.trim()) {
      fs.writeFileSync(OLD_DB_BACKUP_FILE_2, url2.trim(), 'utf-8')
      console.log(`   ✅ Saved to ${OLD_DB_BACKUP_FILE_2}`)
    }
    
    console.log('\n✅ Configuration complete!')
    console.log('\nYou can now run the migration with:')
    console.log('   npm run db:migrate:safe')
    console.log('or')
    console.log('   tsx scripts/migrate-database-safe.ts')
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  } finally {
    rl.close()
  }
}

configureSourceDatabases()

