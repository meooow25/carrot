/**
 * Convenience wrapper around browser.storage.
 */
class StorageWrapper {
  constructor(storageName) {
    this.storageName = storageName;
  }

  async get(key, defaultValue) {
    const obj = await browser.storage[this.storageName].get(key);
    const value = obj[key];
    return value !== undefined ? value : defaultValue;
  }

  async set(key, value) {
    return await browser.storage[this.storageName].set({ [key]: value });
  }
}

export const LOCAL = new StorageWrapper('local');
export const SYNC = new StorageWrapper('sync');
