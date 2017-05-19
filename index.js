const Stream = require('stream');
const LRU = require('lru-cache');
const Cache = require('./lib/cache');
const fetching = require('./lib/fetching');


/**
 * Get the max age from cache control
 * @param {String} cacheControl The response Cache-Control header
 * @returns {Number} The seconds of cache
 */
function getMaxAge(cacheControl) {
  // no cache control
  if (!cacheControl) {
    return -1;
  }
  // is private
  if (cacheControl.indexOf('private') !== -1) {
    return -1;
  }
  const reg = /(s-maxage=(\d+))|(max-age=(\d+))/gi;
  const result = reg.exec(cacheControl);
  const maxAge = result && (result[2] || result[4]);
  // no s-maxage or max-age
  if (!maxAge) {
    return -1;
  }
  return parseInt(maxAge, 10);
}

/**
 * Get the ttl of cache
 * @param {Context} ctx The context of koa
 * @returns {Number} The seconds of cache
 */
function getTTL(ctx) {
  let ttl = -1;
  const status = ctx.status;
  switch (status) {
    case 200: /* OK */
    case 203: /* Non-Authoritative Information */
    case 204: /* No Content */
    case 300: /* Multiple Choices */
    case 301: /* Moved Permanently */
    case 302: /* Moved Temporarily */
    case 304: /* Not Modified - handled like 200 */
    case 307: /* Temporary Redirect */
    case 404: /* Not Found */
    case 410: /* Gone */
    case 414: /* Request-URI Too Large */
      ttl = getMaxAge(ctx.response.headers['cache-control']);
      break;
    default:
      ttl = -1;
      break;
  }
  return ttl;
}

/**
 * Get the middleware for koa
 * @param {Object} options The options of middleware
 * @returns {Function}
 */
function cache(options = {}) {
  const cacheClient = new Cache(options.cache);
  const hash = options.hash || (ctx => `${ctx.method}-${ctx.url}`);
  const isCacheable = options.isCacheable || (() => true);
  const hitForPass = new LRU({
    maxAge: options.hitForPass || 300 * 1000,
    max: 1000,
  });
  return (ctx, next) => {
    const method = ctx.method;
    // pass the cache handle for other request method
    if (method !== 'GET' && method !== 'HEAD') {
      return next();
    }
    // return false will not cache this reqeust
    if (!isCacheable(ctx)) {
      return next();
    }
    const key = hash(ctx);
    if (hitForPass.has(key)) {
      return next();
    }
    return cacheClient.get(key).then((data) => {
      // 取到数据，对queue做处理
      if (data) {
        ctx.set(data.headers);
        /* eslint no-param-reassign:0 */
        ctx.body = data.body;
        ctx.status = data.status;
        return Promise.resolve();
      }
      // the request is fetcing
      if (fetching.has(key)) {
        return new Promise((resolve, reject) => {
          // add the request to wait for fetcing result
          fetching.queue(key, {
            ctx,
            resolve,
            reject,
            next,
          });
        });
      }
      fetching.add(key);
      return next().then(() => {
        const headers = ctx.response.headers;
        const body = ctx.body;
        const status = ctx.status;
        const ttl = getTTL(ctx);
        if (ttl > 0 && !(body instanceof Stream)) {
          cacheClient.set(key, {
            headers,
            body,
            status,
          }, ttl * 1000);
          fetching.resolve(key, {
            headers,
            body,
            status,
          });
        } else {
          fetching.resolve(key, null);
          hitForPass.set(key, true);
        }
      }, (err) => {
        fetching.resolve(key, null);
        hitForPass.set(key, true);
        throw err;
      });
    });
  };
}

module.exports = cache;
