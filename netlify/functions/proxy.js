exports.handler = async (event) => {
  const CID = process.env.ML_CLIENT_ID;
  const CSEC = process.env.ML_CLIENT_SECRET;
  const RURI = process.env.ML_REDIRECT_URI;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const params = event.queryStringParameters || {};
  const action = params.action;

  // Config para el frontend
  if (action === 'config') {
    return { statusCode: 200, headers, body: JSON.stringify({ clientId: CID, redirectUri: RURI }) };
  }

  // Intercambio código → token
  if (action === 'token') {
    const code = params.code;
    if (!code) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta code' }) };
    const resp = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=authorization_code&client_id=${CID}&client_secret=${CSEC}&code=${code}&redirect_uri=${encodeURIComponent(RURI)}`
    });
    return { statusCode: resp.status, headers, body: JSON.stringify(await resp.json()) };
  }

  // Renovar token
  if (action === 'refresh') {
    const rt = params.refresh_token;
    if (!rt) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta refresh_token' }) };
    const resp = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&client_id=${CID}&client_secret=${CSEC}&refresh_token=${encodeURIComponent(rt)}`
    });
    return { statusCode: resp.status, headers, body: JSON.stringify(await resp.json()) };
  }

  // Proxy GET a ML API
  if (action === 'api') {
    const url = params.url;
    if (!url) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta url' }) };
    const auth = event.headers['authorization'] || event.headers['Authorization'] || '';
    const resp = await fetch(url, { headers: { 'Authorization': auth } });
    return { statusCode: resp.status, headers, body: JSON.stringify(await resp.json()) };
  }

  // ── BASE DE DATOS con Netlify Blobs ──
  const { getStore } = require('@netlify/blobs');

  // Guardar ventas del mes en nube
  if (action === 'guardar_ventas') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { clave, ventas } = body;
      if (!clave || !ventas) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Faltan datos' }) };
      const store = getStore('facturador');
      await store.setJSON(clave, ventas);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    } catch(e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  // Obtener ventas guardadas de una clave (mes o fecha)
  if (action === 'obtener_ventas') {
    try {
      const clave = params.clave;
      if (!clave) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta clave' }) };
      const store = getStore('facturador');
      const data = await store.get(clave, { type: 'json' });
      return { statusCode: 200, headers, body: JSON.stringify(data || []) };
    } catch(e) {
      return { statusCode: 200, headers, body: JSON.stringify([]) };
    }
  }

  // Guardar facturadas en nube
  if (action === 'guardar_facturadas') {
    try {
      const body = JSON.parse(event.body || '{}');
      const store = getStore('facturador');
      await store.setJSON('facturadas', body);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    } catch(e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  // Obtener facturadas desde nube
  if (action === 'obtener_facturadas') {
    try {
      const store = getStore('facturador');
      const data = await store.get('facturadas', { type: 'json' });
      return { statusCode: 200, headers, body: JSON.stringify(data || {}) };
    } catch(e) {
      return { statusCode: 200, headers, body: JSON.stringify({}) };
    }
  }

  // Guardar clientes +20000 en nube
  if (action === 'guardar_cliente') {
    try {
      const body = JSON.parse(event.body || '{}');
      const store = getStore('facturador');
      const existing = await store.get('clientes', { type: 'json' }).catch(() => []);
      const clientes = existing || [];
      // No duplicar por ID de orden
      const idx = clientes.findIndex(c => c.orden_id === body.orden_id);
      if (idx >= 0) clientes[idx] = body; else clientes.push(body);
      await store.setJSON('clientes', clientes);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    } catch(e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  // Obtener todos los clientes
  if (action === 'obtener_clientes') {
    try {
      const store = getStore('facturador');
      const data = await store.get('clientes', { type: 'json' });
      return { statusCode: 200, headers, body: JSON.stringify(data || []) };
    } catch(e) {
      return { statusCode: 200, headers, body: JSON.stringify([]) };
    }
  }

  return { statusCode: 400, headers, body: JSON.stringify({ error: 'Acción no reconocida' }) };
};
