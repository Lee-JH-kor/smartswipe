// POST /api/submit
// Body: { key: string, record: object }
// Stores (or overwrites) one session record in the SCORE_KV namespace.
// Overwriting by the same key is how we "attach" a name later without duplicating rows.

export async function onRequestPost(context) {
  try {
    const { env, request } = context;

    if (!env.SCORE_KV) {
      return json({ error: 'KV binding SCORE_KV is not configured' }, 500);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.key !== 'string' || !body.record || typeof body.record !== 'object') {
      return json({ error: 'invalid payload' }, 400);
    }

    // Basic guardrails: bound key length and record size to avoid abuse.
    const key = body.key.slice(0, 200);
    const value = JSON.stringify(body.record);
    if (value.length > 20000) {
      return json({ error: 'record too large' }, 400);
    }

    await env.SCORE_KV.put(key, value);

    return json({ ok: true });
  } catch (err) {
    return json({ error: 'server error', message: String(err) }, 500);
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
