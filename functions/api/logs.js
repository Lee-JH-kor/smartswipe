// POST /api/logs
// Body: { password: string }
// Returns { records: [...] } if the password matches the ADMIN_PASSWORD
// environment variable configured in the Cloudflare Pages project settings.
// The password check happens here on the server, so it is never exposed
// in the page's client-side JavaScript.

export async function onRequestPost(context) {
  try {
    const { env, request } = context;

    if (!env.SCORE_KV) {
      return json({ error: 'KV binding SCORE_KV is not configured' }, 500);
    }
    if (!env.ADMIN_PASSWORD) {
      return json({ error: 'ADMIN_PASSWORD environment variable is not configured' }, 500);
    }

    const body = await request.json().catch(() => null);
    const password = body && typeof body.password === 'string' ? body.password : '';

    if (password !== env.ADMIN_PASSWORD) {
      return json({ error: 'unauthorized' }, 401);
    }

    const records = [];
    let cursor = undefined;
    do {
      const listResult = await env.SCORE_KV.list({ prefix: 'session-', cursor });
      for (const k of listResult.keys) {
        const raw = await env.SCORE_KV.get(k.name);
        if (raw) {
          try { records.push(JSON.parse(raw)); } catch (e) { /* skip malformed entries */ }
        }
      }
      cursor = listResult.list_complete ? undefined : listResult.cursor;
    } while (cursor);

    return json({ records });
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
