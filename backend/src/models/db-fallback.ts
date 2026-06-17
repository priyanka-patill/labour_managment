import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export class JsonCollection<T extends { id?: string; _id?: string; [key: string]: any }> {
  private filepath: string;

  constructor(collectionName: string) {
    this.filepath = path.join(DATA_DIR, `${collectionName}.json`);
    if (!fs.existsSync(this.filepath)) {
      fs.writeFileSync(this.filepath, JSON.stringify([], null, 2));
    }
  }

  private read(): T[] {
    try {
      const content = fs.readFileSync(this.filepath, 'utf8');
      return JSON.parse(content) as T[];
    } catch (error) {
      console.error(`Error reading database file ${this.filepath}:`, error);
      return [];
    }
  }

  private write(data: T[]): void {
    try {
      fs.writeFileSync(this.filepath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error writing database file ${this.filepath}:`, error);
    }
  }

  private matchesFilter(item: T, filter: any): boolean {
    if (!filter) return true;
    return Object.keys(filter).every(key => {
      const filterVal = filter[key];
      const itemVal = item[key];

      // Handle direct matches
      if (filterVal === itemVal) return true;

      // Handle simple $in arrays
      if (filterVal && typeof filterVal === 'object' && '$in' in filterVal) {
        return Array.isArray(filterVal.$in) && filterVal.$in.includes(itemVal);
      }

      // Handle nested properties or regex-like matches
      if (filterVal && typeof filterVal === 'object' && '$regex' in filterVal) {
        const regex = new RegExp(filterVal.$regex, filterVal.$options || '');
        return regex.test(String(itemVal || ''));
      }

      // Handle custom query operators ($gt, $lt, etc.)
      if (filterVal && typeof filterVal === 'object') {
        let match = true;
        if ('$gt' in filterVal) match = match && itemVal > filterVal.$gt;
        if ('$lt' in filterVal) match = match && itemVal < filterVal.$lt;
        if ('$gte' in filterVal) match = match && itemVal >= filterVal.$gte;
        if ('$lte' in filterVal) match = match && itemVal <= filterVal.$lte;
        if ('$ne' in filterVal) match = match && itemVal !== filterVal.$ne;
        return match;
      }

      return false;
    });
  }

  public async find(filter?: any): Promise<T[]> {
    const items = this.read();
    if (!filter) return items;
    return items.filter(item => this.matchesFilter(item, filter));
  }

  public async findOne(filter: any): Promise<T | null> {
    const items = this.read();
    const found = items.find(item => this.matchesFilter(item, filter));
    return found || null;
  }

  public async findById(id: string): Promise<T | null> {
    const items = this.read();
    const found = items.find(item => (item.id === id || item._id === id));
    return found || null;
  }

  public async create(data: Partial<T>): Promise<T> {
    const items = this.read();
    const id = Math.random().toString(36).substring(2, 11);
    const newDoc = {
      ...data,
      id,
      _id: id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as unknown as T;

    items.push(newDoc);
    this.write(items);
    return newDoc;
  }

  public async findByIdAndUpdate(id: string, update: any, options: { new?: boolean } = { new: true }): Promise<T | null> {
    const items = this.read();
    const index = items.findIndex(item => (item.id === id || item._id === id));
    if (index === -1) return null;

    const currentItem = items[index];
    
    // Apply updates (supports nested objects or flat replacement)
    const updatedItem = {
      ...currentItem,
      ...update,
      updatedAt: new Date().toISOString()
    };

    // If update contains $inc or similar mongo modifiers
    if (update.$inc) {
      for (const field of Object.keys(update.$inc)) {
        updatedItem[field] = (Number(currentItem[field]) || 0) + Number(update.$inc[field]);
      }
      delete updatedItem.$inc;
    }
    
    if (update.$push) {
      for (const field of Object.keys(update.$push)) {
        if (!Array.isArray(updatedItem[field])) {
          updatedItem[field] = [];
        }
        updatedItem[field].push(update.$push[field]);
      }
      delete updatedItem.$push;
    }

    items[index] = updatedItem as T;
    this.write(items);
    return updatedItem as T;
  }

  public async findByIdAndDelete(id: string): Promise<T | null> {
    const items = this.read();
    const index = items.findIndex(item => (item.id === id || item._id === id));
    if (index === -1) return null;

    const removed = items.splice(index, 1)[0];
    this.write(items);
    return removed;
  }

  public async deleteMany(filter?: any): Promise<{ deletedCount: number }> {
    if (!filter) {
      const count = this.read().length;
      this.write([]);
      return { deletedCount: count };
    }
    const items = this.read();
    const remaining = items.filter(item => !this.matchesFilter(item, filter));
    const deletedCount = items.length - remaining.length;
    this.write(remaining);
    return { deletedCount };
  }
}

// Instantiate fallback tables
export const dbFallback = {
  users: new JsonCollection<any>('users'),
  jobs: new JsonCollection<any>('jobs'),
  applications: new JsonCollection<any>('applications'),
  chats: new JsonCollection<any>('chats'),
  messages: new JsonCollection<any>('messages'),
  attendance: new JsonCollection<any>('attendance'),
  wallets: new JsonCollection<any>('wallets'),
  payments: new JsonCollection<any>('payments'),
  reviews: new JsonCollection<any>('reviews'),
  complaints: new JsonCollection<any>('complaints'),
  notifications: new JsonCollection<any>('notifications'),
};
