// api/hello.js  (Node.js serverless function on Vercel)
module.exports = (req, res) => {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.status(200).send(JSON.stringify({ ok: true, time: new Date().toISOString() }));
};

// Vercel runtime (Node.js)
module.exports.config = { runtime: 'nodejs' };
