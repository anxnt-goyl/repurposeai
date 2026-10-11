import fs from 'fs';
import path from 'path';
import { MongoClient, Db, Filter } from 'mongodb';
import {
  DBUser,
  DBEpisode,
  DBTranscriptSegment,
  DBMoment,
  DBContentAsset,
  DBChatConversation,
  DBChatMessage,
  DBUserPreferences,
} from './types';

const DB_DIR = path.resolve(process.cwd(), 'data', 'db');

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let useMongo = false;

export async function connectMongoDB(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!uri || uri === 'mongodb+srv://user:pass@cluster.mongodb.net/dbname') {
    if (isProduction) {
      console.error('[DB] CRITICAL: MONGODB_URI is not set or invalid in production.');
      process.exit(1);
    }
    console.log('[DB] Running in DEVELOPMENT mode using LOCAL DISK store.');
    useMongo = false;
    return false;
  }

  try {
    mongoClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    await mongoClient.connect();
    const dbName = process.env.MONGODB_DB_NAME || 'repurposeai';
    mongoDb = mongoClient.db(dbName);
    useMongo = true;
    console.log(`[DB] Connected to MongoDB Atlas (Database: ${dbName}) - PRIMARY PERSISTENCE ACTIVE`);

    await ensureIndexes();
    return true;
  } catch (err: any) {
    if (isProduction) {
      console.error(`[DB] CRITICAL: Failed to connect to MongoDB in production. Error: ${err.message}`);
      process.exit(1);
    } else {
      console.warn(`[DB] Could not connect to MongoDB Atlas (${err.message}). Using persistent disk store.`);
      useMongo = false;
      return false;
    }
  }
}

async function ensureIndexes() {
  if (!mongoDb) return;
  try {
    await mongoDb.collection('users').createIndex({ email: 1 }, { unique: true });
    await mongoDb.collection('episodes').createIndex({ userId: 1, createdAt: -1 });
    await mongoDb.collection('episodes').createIndex({ status: 1 });
    await mongoDb.collection('transcripts').createIndex({ episodeId: 1, timestampSeconds: 1 });
    await mongoDb.collection('moments').createIndex({ episodeId: 1, score: -1 });
    await mongoDb.collection('assets').createIndex({ episodeId: 1, platform: 1 });
    await mongoDb.collection('assets').createIndex({ userId: 1, status: 1 });
    await mongoDb.collection('chats').createIndex({ userId: 1, updatedAt: -1 });
    await mongoDb.collection('messages').createIndex({ conversationId: 1, createdAt: 1 });
    await mongoDb.collection('preferences').createIndex({ userId: 1 }, { unique: true });
    console.log('[DB] MongoDB production indexes ensured.');
  } catch (indexErr: any) {
    console.warn('[DB] Error establishing indexes:', indexErr.message);
  }
}

export class Collection<T extends { id: string }> {
  private filePath: string;
  private items: Map<string, T> = new Map();
  public name: string;

  constructor(collectionName: string) {
    this.name = collectionName;
    ensureDir(DB_DIR);
    this.filePath = path.join(DB_DIR, `${collectionName}.json`);
    // Preload for disk mode
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    if (useMongo) return;
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          this.items.clear();
          for (const item of data) {
            if (item && item.id) {
              this.items.set(item.id, item);
            }
          }
        }
      }
    } catch (err) {
      console.error(`[DB] Error loading collection ${this.name}:`, err);
    }
  }

  private async persistToDisk(): Promise<void> {
    if (useMongo) return;
    try {
      ensureDir(DB_DIR);
      const data = Array.from(this.items.values());
      const tempPath = `${this.filePath}.tmp`;
      await fs.promises.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      await fs.promises.rename(tempPath, this.filePath);
    } catch (err) {
      console.error(`[DB] Error saving collection ${this.name}:`, err);
      throw err;
    }
  }

  // --- Async Methods ---

  public async find(filter?: Partial<T> | ((item: T) => boolean)): Promise<T[]> {
    if (useMongo && mongoDb) {
      const query: any = typeof filter === 'function' ? {} : (filter || {});
      const docs = await mongoDb.collection(this.name).find(query).toArray();
      const mapped = docs.map((doc) => {
        const { _id, ...rest } = doc;
        return rest as unknown as T;
      });
      if (typeof filter === 'function') {
        return mapped.filter(filter);
      }
      return mapped;
    } else {
      const all = Array.from(this.items.values());
      if (!filter) return all;
      if (typeof filter === 'function') return all.filter(filter);
      return all.filter((item) => {
        for (const key of Object.keys(filter) as Array<keyof T>) {
          if (filter[key] !== undefined && item[key] !== filter[key]) return false;
        }
        return true;
      });
    }
  }

  public async findById(id: string): Promise<T | null> {
    if (useMongo && mongoDb) {
      const doc = await mongoDb.collection(this.name).findOne({ id } as Filter<any>);
      if (!doc) return null;
      const { _id, ...rest } = doc;
      return rest as unknown as T;
    } else {
      return this.items.get(id) || null;
    }
  }

  public async findOne(filter: Partial<T> | ((item: T) => boolean)): Promise<T | null> {
    if (useMongo && mongoDb) {
      if (typeof filter === 'function') {
        const all = await this.find();
        return all.find(filter) || null;
      }
      const doc = await mongoDb.collection(this.name).findOne(filter as Filter<any>);
      if (!doc) return null;
      const { _id, ...rest } = doc;
      return rest as unknown as T;
    } else {
      const results = await this.find(filter);
      return results.length > 0 ? results[0] : null;
    }
  }

  public async create(item: T): Promise<T> {
    if (useMongo && mongoDb) {
      const doc = { ...item, _id: item.id };
      await mongoDb.collection(this.name).insertOne(doc as any);
      return item;
    } else {
      this.items.set(item.id, item);
      await this.persistToDisk();
      return item;
    }
  }

  public async createMany(newItems: T[]): Promise<T[]> {
    if (newItems.length === 0) return [];
    if (useMongo && mongoDb) {
      const docs = newItems.map((item) => ({ ...item, _id: item.id }));
      await mongoDb.collection(this.name).insertMany(docs as any);
      return newItems;
    } else {
      for (const item of newItems) {
        this.items.set(item.id, item);
      }
      await this.persistToDisk();
      return newItems;
    }
  }

  public async update(id: string, updates: Partial<T>): Promise<T | null> {
    if (useMongo && mongoDb) {
      const result = await mongoDb.collection(this.name).findOneAndUpdate(
        { id } as Filter<any>,
        { $set: updates },
        { returnDocument: 'after' }
      );
      if (!result) return null;
      const { _id, ...rest } = result;
      return rest as unknown as T;
    } else {
      const existing = this.items.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...updates };
      this.items.set(id, updated);
      await this.persistToDisk();
      return updated;
    }
  }

  public async delete(id: string): Promise<boolean> {
    if (useMongo && mongoDb) {
      const result = await mongoDb.collection(this.name).deleteOne({ id } as Filter<any>);
      return result.deletedCount > 0;
    } else {
      const deleted = this.items.delete(id);
      if (deleted) {
        await this.persistToDisk();
      }
      return deleted;
    }
  }

  public async deleteMany(filter: Partial<T> | ((item: T) => boolean)): Promise<number> {
    if (useMongo && mongoDb) {
      if (typeof filter === 'function') {
        const toDelete = await this.find(filter);
        if (toDelete.length === 0) return 0;
        const ids = toDelete.map((i) => i.id);
        const result = await mongoDb.collection(this.name).deleteMany({ id: { $in: ids } } as Filter<any>);
        return result.deletedCount;
      } else {
        const result = await mongoDb.collection(this.name).deleteMany(filter as Filter<any>);
        return result.deletedCount;
      }
    } else {
      const matching = await this.find(filter);
      let count = 0;
      for (const item of matching) {
        if (this.items.delete(item.id)) count++;
      }
      if (count > 0) {
        await this.persistToDisk();
      }
      return count;
    }
  }

  public async count(filter?: Partial<T> | ((item: T) => boolean)): Promise<number> {
    if (useMongo && mongoDb) {
      if (typeof filter === 'function') {
        const items = await this.find(filter);
        return items.length;
      }
      return await mongoDb.collection(this.name).countDocuments(filter as Filter<any> || {});
    } else {
      const items = await this.find(filter);
      return items.length;
    }
  }
}

export const db = {
  users: new Collection<DBUser>('users'),
  episodes: new Collection<DBEpisode>('episodes'),
  transcripts: new Collection<DBTranscriptSegment>('transcripts'),
  moments: new Collection<DBMoment>('moments'),
  assets: new Collection<DBContentAsset>('assets'),
  chats: new Collection<DBChatConversation>('chats'),
  messages: new Collection<DBChatMessage>('messages'),
  preferences: new Collection<DBUserPreferences>('preferences'),

  isMongo(): boolean {
    return useMongo;
  },
};
