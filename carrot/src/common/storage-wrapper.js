class StorageWrapper {
  constructor(storageName) {
    this.storageName = storageName;
  }

  async get(key, defaultValue) {
    const obj = await browser.storage[this.storageName].get(key);
    const value = obj[key];
    return value != null ? value : defaultValue;
  }

  async set(key, value) {
    return await browser.storage[this.storageName].set({ [key]: value });
  }
}

const LOCAL = new StorageWrapper('local');
const SYNC = new StorageWrapper('sync');

export { LOCAL, SYNC };
