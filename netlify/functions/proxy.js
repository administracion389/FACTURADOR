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

  if (action === 'config') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ clientId: CID, redirectUri: RURI })
    };
  }

  if (action === 'token') {
    const code = params.code;
    if (!code) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta code' }) };
    const resp = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=authorization_code&client_id=${CID}&client_secret=${CSEC}&code=${code}&redirect_uri=${encodeURIComponent(RURI)}`
    });
    const data = await resp.json();
    return { statusCode: resp.status, headers, body: JSON.stringify(data) };
  }

  if (action === 'refresh') {
    const rt = params.refresh_token;
    if (!rt) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta refresh_token' }) };
    const resp = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&client_id=${CID}&client_secret=${CSEC}&refresh_token=${encodeURIComponent(rt)}`
    });
    const data = await resp.json();
    return { statusCode: resp.status, headers, body: JSON.stringify(data) };
  }

  if (action === 'api') {
    const url = params.url;
    if (!url) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta url' }) };
    const auth = event.headers['authorization'] || event.headers['Authorization'] || '';
    const resp = await fetch(url, {
      headers: { 'Authorization': auth }
    });
    const data = await resp.json();
    return { statusCode: resp.status, headers, body: JSON.stringify(data) };
  }

  return { statusCode: 400, headers, body: JSON.stringify({ error: 'Acción no reconocida' }) };
};
