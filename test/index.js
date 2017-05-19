const request = require('supertest');
const assert = require('assert');

const cache = require('..');

const Koa = require('koa');
const app = new Koa();

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

let cacheableId = 0;
let privateId = 0;
let errorId = 0;
let noCacheId = 0;

app.use((ctx, next) => {
  return next().catch((err) => {
    ctx.body = {
      message: err.message,
    };
    ctx.status = 500;
  });
})

app.use(cache({
  isCacheable: (ctx) => {
    if (ctx.url.indexOf('/user') === 0) {
      return false;
    }
    return true;
  },
}));

app.use(ctx => {
  switch (ctx.url) {
    case '/cacheable':
      return delay(1000).then(() => {
        ctx.body = {
          id: cacheableId,
        };
        cacheableId += 1;
        ctx.set('Cache-Control', 'public, max-age=60');
      });
    case '/private':
      return delay(100).then(() => {
        ctx.body = {
          id: privateId,
        };
        privateId += 1;
        ctx.set('Cache-Control', 'private, max-age=60');
      });
    case '/no-cache':
      return delay(100).then(() => {
        ctx.body = {
          id: noCacheId, 
        };
        noCacheId += 1;
        ctx.set('Cache-Control', 'no-cache');
      });
    case '/error':
      errorId += 1;
      throw new Error(`Custom Error:${errorId}`);
    default:
      break;
  }
});

const server = app.listen();

describe('koa-varnish', () => {
  it('Get cache data', (done) => {
    let finished = 0;
    const complete = () => {
      finished++;
      if (finished === 3) {
        done();
      }
    };
    const doTest = () => request(server)
      .get('/cacheable')
      .expect(200)
      .expect('Content-Type', /json/)
      .then((res) => {
        assert.equal(res.body.id, 0);
      });
    doTest().then(() => {
      complete();
      doTest().then(complete);
    });
    doTest().then(complete);
  });

  it('Get private data', (done) => {
    let finished = 0;
    const ids = [];
    const complete = () => {
      finished++;
      if (finished === 3) {
        assert.equal(ids.sort().join(','), '0,1,2')
        done();
      }
    };
    const doTest = () => request(server)
      .get('/private')
      .expect(200)
      .expect('Content-Type', /json/)
      .then((res) => {
        ids.push(res.body.id);
      });
    doTest().then(() => {
      complete();
      doTest().then(complete);
    });
    doTest().then(complete);
  });

  it('Get no cache data', (done) => {
    let finished = 0;
    const ids = [];
    const complete = () => {
      finished++;
      if (finished === 3) {
        assert.equal(ids.sort().join(','), '0,1,2');
        done();
      }
    };
    const doTest = () => request(server)
      .get('/no-cache')
      .expect(200)
      .expect('Content-Type', /json/)
      .then((res) => {
        ids.push(res.body.id);
      });
    doTest().then(() => {
      complete();
      doTest().then(complete);
    });
    doTest().then(complete);
  });

  it('Post data', (done) => {
    request(server)
      .post('/')
      .expect(404)
      .then(() => done());
  });

  it('Get uncacheable data', (done) => {
    request(server)
      .get('/user')
      .expect(404)
      .then(() => done());
  });

  it('Get error', (done) => {
    let finished = 0;
    const complete = () => {
      finished++;
      if (finished === 3) {
        done();
      }
    };
    const doTest = () => request(server)
      .get('/error')
      .expect(500)
      .expect('Content-Type', /json/)
      .then((res) => {
        assert.equal(res.body.message, `Custom Error:${finished + 1}`);
      });
    doTest().then(() => {
      complete();
      doTest().then(complete);
    });
    doTest().then(complete);
  });
});
