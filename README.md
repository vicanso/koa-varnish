# koa-varnish

[![Build Status](https://travis-ci.org/vicanso/koa-varnish.svg?style=flat-square)](https://travis-ci.org/vicanso/koa-varnish)
[![Coverage Status](https://img.shields.io/coveralls/vicanso/koa-varnish/master.svg?style=flat)](https://coveralls.io/r/vicanso/koa-varnish?branch=master)
[![npm](http://img.shields.io/npm/v/koa-varnish.svg?style=flat-square)](https://www.npmjs.org/package/koa-varnish)
[![Github Releases](https://img.shields.io/npm/dm/koa-varnish.svg?style=flat-square)](https://github.com/vicanso/koa-varnish)

The cache middleware for koa, it can cache the data such as varnish. The cache ttl is use the value of `s-maxage` or `maxage` from response header: `Cache-Control`.

Uncacheable list:

- Method isn't 'GET' or 'HEAD'
- Function isCacheable return false
- HTTP response status is not 200, 203, 204, 300, 301, 302, 304, 307, 404, 410, 414
- Get max-age form response header `Cache-Control` isn't gt 0

## Installation

```bash
$ npm i koa-varnish
```

## API

- `hash` Get the key for the cache, default is `${ctx.method}-${ctx.url}`
- `isCacheable` Check the request is cacheable, default is all true.
- `cache` The opotions for lru-cache
- `hitForPass` The max-age for hit for pass, default is `300 * 1000`ms

```js
const cache = require('koa-varnish');
const Koa = require('koa');
const app = new Koa();

app.use(cache({
  hash: ctx => ctx.url,
  isCacheable: (ctx) => {
    if (ctx.url.indexOf('/user') === 0) {
      return false;
    }
    return true;
  },
}));

app.use(ctx => {
	if (ctx.url === '/wait') {
    return new Promise(function(resolve, reject) {
      ctx.set('Cache-Control', 'private, max-age=10');
      ctx.body = 'Wait for 1000ms';
      setTimeout(resolve, 1000);
    });
	} else {
    ctx.set('Cache-Control', 'public, max-age=10')
    ctx.body = 'Hello World';
	}
});
```

## License

MIT
