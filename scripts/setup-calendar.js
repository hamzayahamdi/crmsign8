/**
 * Setup script for Calendar feature
 * Run: node scripts/setup-calendar.js
 */

const { execSync } = require('child_process');

console.log('🗓️  Setting up Calendar feature...\n');

try {
  // Step 1: Generate Prisma Client
  console.log('📦 Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma Client generated\n');

  // Step 2: Run migration
  console.log('🔄 Running database migration...');
  execSync('npx prisma migrate dev --name add_calendar_events', { stdio: 'inherit' });
  console.log('✅ Migration completed\n');

  console.log('✨ Calendar feature setup complete!\n');
  console.log('📝 Next steps:');
  console.log('   1. Start your dev server: npm run dev');
  console.log('   2. Navigate to /calendrier in your app');
  console.log('   3. Create your first event!\n');
  console.log('🔔 Smart reminders will work automatically when events are created.\n');

} catch (error) {
  console.error('❌ Error during setup:', error.message);
  process.exit(1);
}
