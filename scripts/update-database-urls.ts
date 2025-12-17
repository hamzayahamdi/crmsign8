/**
 * Script to update database URLs in .env file
 * 
 * This script helps update your .env file with the new database URLs.
 * 
 * Usage:
 *   tsx scripts/update-database-urls.ts
 * 
 * Or set environment variables:
 *   NEW_DATABASE_URL="..." NEW_DIRECT_URL="..." tsx scripts/update-database-urls.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const NEW_DATABASE_URL = process.env.NEW_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres.yukakumsjthbqnfotclx:Fqbtk3wRpBedQODh@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
const NEW_DIRECT_URL = process.env.NEW_DIRECT_URL || process.env.DIRECT_URL || 'postgresql://postgres.yukakumsjthbqnfotclx:Fqbtk3wRpBedQODh@aws-1-us-east-1.pooler.supabase.com:5432/postgres'

const envPath = path.join(process.cwd(), '.env')
const envLocalPath = path.join(process.cwd(), '.env.local')

function updateEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File ${filePath} does not exist, creating it...`)
    fs.writeFileSync(filePath, '')
  }

  let content = fs.readFileSync(filePath, 'utf-8')
  let updated = false

  // Update or add DATABASE_URL
  if (content.includes('DATABASE_URL=')) {
    const regex = /DATABASE_URL=.*/g
    if (content.match(regex)?.[0] !== `DATABASE_URL="${NEW_DATABASE_URL}"`) {
      content = content.replace(regex, `DATABASE_URL="${NEW_DATABASE_URL}"`)
      updated = true
      console.log(`✅ Updated DATABASE_URL in ${filePath}`)
    } else {
      console.log(`✓ DATABASE_URL already correct in ${filePath}`)
    }
  } else {
    content += `\nDATABASE_URL="${NEW_DATABASE_URL}"\n`
    updated = true
    console.log(`✅ Added DATABASE_URL to ${filePath}`)
  }

  // Update or add DIRECT_URL
  if (content.includes('DIRECT_URL=')) {
    const regex = /DIRECT_URL=.*/g
    if (content.match(regex)?.[0] !== `DIRECT_URL="${NEW_DIRECT_URL}"`) {
      content = content.replace(regex, `DIRECT_URL="${NEW_DIRECT_URL}"`)
      updated = true
      console.log(`✅ Updated DIRECT_URL in ${filePath}`)
    } else {
      console.log(`✓ DIRECT_URL already correct in ${filePath}`)
    }
  } else {
    content += `DIRECT_URL="${NEW_DIRECT_URL}"\n`
    updated = true
    console.log(`✅ Added DIRECT_URL to ${filePath}`)
  }

  if (updated) {
    fs.writeFileSync(filePath, content, 'utf-8')
  }

  return updated
}

async function main() {
  console.log('🔄 Updating database URLs...\n')
  console.log(`New DATABASE_URL: ${NEW_DATABASE_URL.substring(0, 60)}...`)
  console.log(`New DIRECT_URL: ${NEW_DIRECT_URL.substring(0, 60)}...\n`)

  let envUpdated = false
  let envLocalUpdated = false

  // Update .env
  if (fs.existsSync(envPath)) {
    envUpdated = updateEnvFile(envPath)
  } else {
    console.log(`⚠️  .env file not found at ${envPath}`)
  }

  // Update .env.local
  if (fs.existsSync(envLocalPath)) {
    envLocalUpdated = updateEnvFile(envLocalPath)
  } else {
    console.log(`⚠️  .env.local file not found at ${envLocalPath}`)
  }

  if (!envUpdated && !envLocalUpdated) {
    console.log('\n⚠️  No files were updated. URLs may already be correct.')
  } else {
    console.log('\n✨ Database URLs updated successfully!')
    console.log('\n📝 Next steps:')
    console.log('   1. Review the updated .env file(s)')
    console.log('   2. Run: npx prisma generate')
    console.log('   3. Run: npx prisma db push (to create schema in new database)')
    console.log('   4. Run: NEW_DATABASE_URL="..." OLD_DATABASE_URL="..." tsx scripts/migrate-database.ts')
  }
}

main().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})

