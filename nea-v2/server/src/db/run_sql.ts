import { db } from './index';
import { profiles, roles } from './schema';
import { sql } from 'drizzle-orm';

async function run() {
  console.log('Running SQL updates and inserts...');
  try {
    // 1. Alter profiles table to add missing columns if they don't exist
    const alterTable = sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='avatar_url') THEN
          ALTER TABLE "profiles" ADD COLUMN "avatar_url" text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='phone_number') THEN
          ALTER TABLE "profiles" ADD COLUMN "phone_number" text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='date_of_birth') THEN
          ALTER TABLE "profiles" ADD COLUMN "date_of_birth" text;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='updated_at') THEN
          ALTER TABLE "profiles" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();
        END IF;
      END $$;
    `;
    await db.execute(alterTable);
    console.log('Table structure ensured.');

    // 2. Run the Inserts
    const query = sql`
      INSERT INTO "profiles" ("id", "first_name", "last_name", "avatar_url", "updated_at", "phone_number", "date_of_birth", "username", "email", "role_id", "status", "password_hash") 
      VALUES 
      ('0242ff55-cebc-4a41-9e42-32be3a998646', 'Vonesya', 'Francis', null, now(), null, null, 'vfrancis', 'vfrancis@necta.go.tz', 'f177cd2e-c3af-4d4d-889b-e63b9530e26a', 'active', 'PLACEHOLDER'), 
      ('733c6c7a-ad14-4c0d-b7ce-b9f45c2ea090', 'Danford', 'Mtivike', null, now(), null, null, 'dmtivike', 'dmtivike@necta.go.tz', 'f177cd2e-c3af-4d4d-889b-e63b9530e26a', 'active', 'PLACEHOLDER'), 
      ('923548d7-60ba-4e9a-bbcc-b93dac497e81', 'Kelvin', 'Masolwa', 'https://lvekluteykquxyuyetdj.supabase.co/storage/v1/object/public/avatars/923548d7-60ba-4e9a-bbcc-b93dac497e81/9c478dbc-d3a2-473a-b9a2-2a3e71ba6dc5.png', now(), '+255772315927', '2025-12-03', 'kmasolwa', 'kmasolwa@necta.go.tz', '70cb518f-e230-4ce2-9dc0-5b75cf83f83a', 'active', 'PLACEHOLDER'), 
      ('bd556019-30e7-4f51-ae3a-9e549fbe87b2', 'Shaban', 'Onga', null, now(), null, null, 'songa', 'songa@necta.go.tz', 'c62a7a90-3f4c-418e-8b8e-5ab083550a8f', 'active', 'PLACEHOLDER')
      ON CONFLICT (id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        avatar_url = EXCLUDED.avatar_url,
        phone_number = EXCLUDED.phone_number,
        date_of_birth = EXCLUDED.date_of_birth,
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        role_id = EXCLUDED.role_id,
        status = EXCLUDED.status,
        updated_at = now();
    `;
    
    await db.execute(query);
    console.log('Successfully inserted/updated profiles.');
    process.exit(0);
  } catch (err) {
    console.error('Error running SQL:', err);
    process.exit(1);
  }
}

run();
