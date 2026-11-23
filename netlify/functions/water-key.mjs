export default async function handler() {
  var key = process.env.VAPID_PUBLIC_KEY || "";
  if (!key) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 503,
      headers: { "content-type": "application/json" }
    });
  }
  return new Response(JSON.stringify({ ok: true, publicKey: key }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}
