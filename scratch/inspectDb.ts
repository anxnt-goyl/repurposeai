import { connectMongoDB, db } from '../server/db/store.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await connectMongoDB();
  const episodes = await db.episodes.find({});
  console.log(`Found ${episodes.length} episodes in MongoDB:`);
  for (const ep of episodes) {
    const assets = await db.assets.find({ episodeId: ep.id });
    const approved = assets.filter((a) => a.status === 'approved').length;
    console.log(`- Ep: "${ep.title}" (${ep.id}), userId: ${ep.userId}, total assets: ${assets.length}, approved: ${approved}`);
    for (const a of assets) {
      console.log(`   * ${a.platform} (${a.id}): status=${a.status}`);
    }
  }
  process.exit(0);
}

check().catch(console.error);
