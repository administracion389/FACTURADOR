exports.handler = async (event) => {
  const url = event.queryStringParameters?.url;
  const auth = event.headers?.authorization || event.headers?.Authorization;

  if (!url) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing url parameter' }) };
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) headers['Authorization'] = auth;

    const isPost = event.httpMethod === 'POST';
    const response = await fetch(url, {
      method: isPost ? 'POST' : 'GET',
      headers: isPost ? { 'Content-Type': 'application/x-www-form-urlencoded' } : headers,
      body: isPost ? event.body : undefined,
    });

    const data = await response.text();
    return {
      statusCode: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Content-Type': 'application/json',
      },
      body: data,
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
