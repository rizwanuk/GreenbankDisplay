export const config = { runtime: 'nodejs' };

export default function handler(req, res) {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.status(200).send(JSON.stringify({ ok: true, time: new Date().toISOString() }));
}
