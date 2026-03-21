import type { WrappedResult } from './types';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export class Store {
  private map = new Map<string, WrappedResult>();

  set(id: string, result: WrappedResult): void {
    this.map.set(id, result);
    this.backupToDisk(id, result);
  }

  get(id: string): WrappedResult | undefined {
    return this.map.get(id);
  }

  update(id: string, updates: Partial<WrappedResult>): void {
    const current = this.map.get(id);
    if (!current) return;

    const updated = { ...current, ...updates };
    this.map.set(id, updated);
    this.backupToDisk(id, updated);
  }

  private async backupToDisk(id: string, result: WrappedResult): Promise<void> {
    try {
      const dataDir = join(process.cwd(), 'data');
      await mkdir(dataDir, { recursive: true });
      await writeFile(
        join(dataDir, `${id}.json`),
        JSON.stringify(result, null, 2)
      );
    } catch (err) {
      console.error('Failed to backup to disk:', err);
    }
  }
}

export const store = new Store();
