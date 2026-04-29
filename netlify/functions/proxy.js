exports.handler = async (event) => {
  const CID = process.env.ML_CLIENT_ID;
  const CSEC = process.env.ML_CLIENT_SECRET;
  const RURI = process.env.ML_REDIRECT_URI;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const params = event.queryStringParameters || {};
  const action = params.action;

  // Devuelve solo el client_id (público) para construir el link de auth
  if (action === 'config') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ clientId: CID })
    };
  }

  // Intercambio de código por token
  if (action === 'token') {
    const code = params.code;
    if (!code) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta code' }) };

    const body = `grant_type=authorization_code&client_id=${CID}&client_secret=${CSEC}&code=${code}&redirect_uri=${encodeURIComponent(RURI)}`;
    const resp = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const data = await resp.json();
    return { statusCode: resp.status, headers, body: JSON.stringify(data) };
  }

  // Renovación de token
  if (action === 'refresh') {
    const refresh_token = params.refresh_token;
    if (!refresh_token) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta refresh_token' }) };

    const body = `grant_type=refresh_token&client_id=${CID}&client_secret=${CSEC}&refresh_token=${refresh_token}`;
    const resp = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const data = await resp.json();
    return { statusCode: resp.status, headers, body: JSON.stringify(data) };
  }

  // Proxy genérico para llamadas a la API de ML
  const url = params.url;
  if (!url) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta url o action' }) };

  const mlHeaders = {};
  if (event.headers && event.headers.authorization) {
    mlHeaders['Authorization'] = event.headers.authorization;
  }

  const resp = await fetch(url, { headers: mlHeaders });
  const data = await resp.json();
  return { statusCode: resp.status, headers, body: JSON.stringify(data) };
};
