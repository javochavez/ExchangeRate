// Proxy serverless para la API SIE del Banco de México — Serie SF43718 (FIX)
//
// Consulta un rango de 12 días calendario terminando en la fecha solicitada.
// El frontend extrae dos valores de esa ventana:
//   FIX  → entrada cuya fecha coincide exactamente con la fecha solicitada
//   DOF  → entrada inmediatamente anterior (día hábil previo = lo publicado en DOF ese día)
//
// SF60653 NO se usa: es el rate "fecha de liquidación", distinto al publicado en DOF.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { fecha, token } = req.query;

  if (!fecha || !token)
    return res.status(400).json({ error: 'Parámetros requeridos: fecha (YYYY-MM-DD) y token' });

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha))
    return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' });

  // Rango: 12 días antes → fecha solicitada
  // 12 días cubre con holgura 2 semanas de días hábiles, suficiente para
  // saltar puentes, fines de semana y festivos bancarios mexicanos.
  const inicio = new Date(fecha + 'T12:00:00');
  inicio.setDate(inicio.getDate() - 12);
  const fechaInicio = inicio.toISOString().split('T')[0];

  const url = `https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/${fechaInicio}/${fecha}`;

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
