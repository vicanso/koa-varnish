const map = new Map();

exports.has = key => map.has(key);

exports.add = key => map.set(key, []);

exports.queue = (key, options) => {
  const arr = map.get(key);
  arr.push(options);
};

exports.resolve = (key, data) => {
  const arr = map.get(key);
  arr.forEach((item) => {
    const {
      ctx,
      resolve,
      next,
    } = item;
    if (!data) {
      resolve(next());
      return;
    }
    ctx.set(data.headers);
    ctx.body = data.body;
    ctx.status = data.status;
    resolve();
  });
  map.delete(key);
};
