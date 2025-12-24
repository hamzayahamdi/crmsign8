/**
 * Script to update destination database URLs in .env file
 * 
 * This script updates your .env file with the new destination database URLs.
 * 
 * Usage:
 *   tsx scripts/update-destination-database.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const ENV_FILE = path.join(process.cwd(), '.env')
const ENV_EXAMPLE_FILE = path.join(process.cwd(), '.env.example')

// New destination database URLs
const NEW_DATABASE_URL = "postgresql://postgres.yukakumsjthbqnfotclx:Fqbtk3wRpBedQODh@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
const NEW_DIRECT_URL = "postgresql://postgres.yukakumsjthbqnfotclx:Fqbtk3wRpBedQODh@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

function updateEnvFile() {
  console.log('🔧 Updating .env file with new destination database URLs...\n')
  
  let envContent = ''
  
  // Read existing .env file if it exists
  if (fs.existsSync(ENV_FILE)) {
    envContent = fs.readFileSync(ENV_FILE, 'utf-8')
    console.log('📂 Found existing .env file')
  } else {
    // Try to read from .env.example
    if (fs.existsSync(ENV_EXAMPLE_FILE)) {
      envContent = fs.readFileSync(ENV_EXAMPLE_FILE, 'utf-8')
      console.log('📂 Found .env.example file, using as template')
    } else {
      console.log('📂 Creating new .env file')
    }
  }
  
  // Update or add DATABASE_URL
  if (envContent.includes('DATABASE_URL=')) {
    envContent = envContent.replace(
      /DATABASE_URL=.*/g,
      `DATABASE_URL="${NEW_DATABASE_URL}"`
    )
    console.log('   ✅ Updated DATABASE_URL')
  } else {
    envContent += `\nDATABASE_URL="${NEW_DATABASE_URL}"\n`
    console.log('   ✅ Added DATABASE_URL')
  }
  
  // Update or add DIRECT_URL
  if (envContent.includes('DIRECT_URL=')) {
    envContent = envContent.replace(
      /DIRECT_URL=.*/g,
      `DIRECT_URL="${NEW_DIRECT_URL}"`
    )
    console.log('   ✅ Updated DIRECT_URL')
  } else {
    envContent += `DIRECT_URL="${NEW_DIRECT_URL}"\n`
    console.log('   ✅ Added DIRECT_URL')
  }
  
  // Save the updated .env file
  fs.writeFileSync(ENV_FILE, envContent, 'utf-8')
  
  console.log('\n✅ .env file updated successfully!')
  console.log('\n📋 Next steps:')
  console.log('   1. Configure your source database URLs:')
  console.log('      npm run db:configure-sources')
  console.log('   2. Run the safe migration:')
  console.log('      npm run db:migrate:safe')
}

updateEnvFile()

