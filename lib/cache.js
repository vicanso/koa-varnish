const LRU = require('lru-cache');

const clientSymbol = Symbol('client');

class Cache {
  constructor(options) {
    this[clientSymbol] = new LRU(Object.assign({
      // max age in ms
      maxAge: 30 * 60 * 1000,
      // max size
      max: 5000,
    }, options));
  }
  get client() {
    return this[clientSymbol];
  }
  /**
   * Get the cache by key
   * @param {String} key The cache key
   * @returns {Object} The cache data
   * @memberOf Cache
   */
  get(key) {
    const client = this.client;
    const data = client.get(key);
    return Promise.resolve(data);
  }
  /**
   * Set the data to cache
   * @param {String} key The key of cache
   * @param {any} data The data to cache
   * @param {Number} maxAge The max age of cache (ms)
   * @memberOf Cache
   */
  set(key, data, maxAge) {
    this.client.set(key, data, maxAge);
    return Promise.resolve();
  }
}

module.exports = Cache;
