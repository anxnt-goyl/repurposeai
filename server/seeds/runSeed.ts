import dotenv from 'dotenv';
import { seedDefaultUsers } from './seed';
import { connectMongoDB } from '../db/store';

dotenv.config();

async function run() {
  if (process.env.NODE_ENV === 'production') {
    console.error('[SEED] Refusing to run seed script in production environment.');
    process.exit(1);
  }
  console.log('[SEED] Running standalone development database seed...');
  await connectMongoDB();
  await seedDefaultUsers();
  console.log('[SEED] Standalone database seeding completed.');
  process.exit(0);
}

run().catch((err) => {
  console.error('[SEED] Error running seed script:', err);
  process.exit(1);
});
