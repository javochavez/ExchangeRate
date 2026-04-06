export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { fecha, token } = req.query;
  if (!fecha || !token)
    return res.status(400).json({ error: 'Parámetros requeridos: fecha y token' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha))
    return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' });

  const url = `https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718,SF60653/datos/${fecha}/${fecha}`;
  try {
    const r = await fetch(url, {
      headers: { 'Bmx-Token': token, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    const text = await r.text();
    res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
  } catch (err) {
    const status = err.name === 'TimeoutError' ? 504 : 502;
    res.status(status).json({ error: err.message });
  }
}
