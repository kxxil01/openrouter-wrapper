import { sql } from '../lib/db';

export async function up() {
  await sql`
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'user'
  `;
  console.log('✓ users.user_type column ready');

  const superadminEmails = [
    'kurniadii01@gmail.com',
    'kurniadi.ilham@luxor.tech',
    'kurniadi@aag.ventures',
    'kurniadi@saakuru.com',
  ];

  for (const email of superadminEmails) {
    await sql`
      UPDATE users SET user_type = 'superadmin' WHERE LOWER(email) = LOWER(${email})
    `;
  }
  console.log('✓ superadmin users set');
}

export async function down() {
  await sql`ALTER TABLE users DROP COLUMN IF EXISTS user_type`;
}
