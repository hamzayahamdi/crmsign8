/**
 * Script to fix database URL format in .env file
 * 
 * This script fixes the DATABASE_URL format by ensuring it has the correct
 * username:password format with the colon separator.
 */

import * as fs from 'fs'
import * as path from 'path'

const envPath = path.join(process.cwd(), '.env')
const envLocalPath = path.join(process.cwd(), '.env.local')

// Correct URLs with proper format
const CORRECT_DATABASE_URL = 'postgresql://postgres.yukakumsjthbqnfotclx:Fqbtk3wRpBedQODh@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
const CORRECT_DIRECT_URL = 'postgresql://postgres.yukakumsjthbqnfotclx:Fqbtk3wRpBedQODh@aws-1-us-east-1.pooler.supabase.com:5432/postgres'

function fixEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File ${filePath} does not exist, skipping...`)
    return false
  }

  let content = fs.readFileSync(filePath, 'utf-8')
  let updated = false

  // Fix DATABASE_URL - ensure it has the correct format
  if (content.includes('DATABASE_URL=')) {
    const regex = /DATABASE_URL=.*/g
    const currentMatch = content.match(regex)?.[0]
    
    // Check if URL is missing the colon separator
    if (currentMatch && !currentMatch.includes('postgres.yukakumsjthbqnfotclx:Fqbtk3wRpBedQODh')) {
      content = content.replace(regex, `DATABASE_URL="${CORRECT_DATABASE_URL}"`)
      updated = true
      console.log(`✅ Fixed DATABASE_URL in ${filePath}`)
    } else if (currentMatch?.includes(CORRECT_DATABASE_URL)) {
      console.log(`✓ DATABASE_URL already correct in ${filePath}`)
    } else {
      // Update to correct format
      content = content.replace(regex, `DATABASE_URL="${CORRECT_DATABASE_URL}"`)
      updated = true
      console.log(`✅ Updated DATABASE_URL in ${filePath}`)
    }
  } else {
    content += `\nDATABASE_URL="${CORRECT_DATABASE_URL}"\n`
    updated = true
    console.log(`✅ Added DATABASE_URL to ${filePath}`)
  }

  // Fix DIRECT_URL
  if (content.includes('DIRECT_URL=')) {
    const regex = /DIRECT_URL=.*/g
    const currentMatch = content.match(regex)?.[0]
    
    if (!currentMatch?.includes(CORRECT_DIRECT_URL)) {
      content = content.replace(regex, `DIRECT_URL="${CORRECT_DIRECT_URL}"`)
      updated = true
      console.log(`✅ Fixed DIRECT_URL in ${filePath}`)
    } else {
      console.log(`✓ DIRECT_URL already correct in ${filePath}`)
    }
  } else {
    content += `DIRECT_URL="${CORRECT_DIRECT_URL}"\n`
    updated = true
    console.log(`✅ Added DIRECT_URL to ${filePath}`)
  }

  if (updated) {
    fs.writeFileSync(filePath, content, 'utf-8')
  }

  return updated
}

async function main() {
  console.log('🔧 Fixing database URL format...\n')
  console.log('The issue is that DATABASE_URL was missing the colon (:) separator')
  console.log('between username and password.\n')

  let envUpdated = false
  let envLocalUpdated = false

  // Fix .env
  if (fs.existsSync(envPath)) {
    envUpdated = fixEnvFile(envPath)
  }

  // Fix .env.local
  if (fs.existsSync(envLocalPath)) {
    envLocalUpdated = fixEnvFile(envLocalPath)
  }

  if (envUpdated || envLocalUpdated) {
    console.log('\n✨ Database URLs fixed successfully!')
    console.log('\n📝 Next steps:')
    console.log('   1. Run: npm run db:verify (to test the connection)')
    console.log('   2. Run: npx prisma generate')
    console.log('   3. Run: npx prisma db push (to create schema in new database)')
  } else {
    console.log('\n⚠️  No files were updated. URLs may already be correct.')
  }
}

main().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})

