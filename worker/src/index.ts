/**
 * Printora Cloudflare Worker
 * - POST /api/upload: receive image body, write to R2 via binding, return public URL (avoids browser PUT to R2/SSL issues)
 * - POST /shopify/webhook: receive order webhook, send email to merchant
 */

const MERCHANT_EMAIL = "contact@printora.co.nz";

export interface Env {
  BUCKET: R2Bucket;
  PUBLIC_BASE_URL: string;
  SHOPIFY_WEBHOOK_SECRET: string;
  RESEND_API_KEY: string;
  MERCHANT_EMAIL?: string;
}

function corsHeaders(origin: string | null) {
  const allow = origin || "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    try {
      if (url.pathname === "/api/upload" && request.method === "POST") {
        return await handleUpload(request, env, origin);
      }
      if (url.pathname === "/shopify/webhook" && request.method === "POST") {
        return await handleShopifyWebhook(request, env);
      }
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    } catch (e) {
      console.error("Worker error:", e);
      return new Response(
        JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders(origin ?? null) } }
      );
    }
  },
};

/** POST /api/upload: body = raw image bytes. Query: ?prefix=originals|previews, ?name=custom-name (optional, for identifiable filename). Worker writes to R2 and returns publicUrl. */
async function handleUpload(request: Request, env: Env, origin: string | null): Promise<Response> {
  console.log("[R2] POST /api/upload received, Origin:", origin ?? "(none)");

  if (!env.BUCKET) {
    console.error("[R2] Missing BUCKET binding");
    return new Response(
      JSON.stringify({ error: "Server misconfigured: R2 bucket binding missing" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
    );
  }
  if (!env.PUBLIC_BASE_URL) {
    console.error("[R2] Missing PUBLIC_BASE_URL");
    return new Response(
      JSON.stringify({ error: "Server misconfigured: PUBLIC_BASE_URL missing" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
    );
  }

  const url = new URL(request.url);
  const prefix = url.searchParams.get("prefix") || "designs";
  const nameParam = url.searchParams.get("name");
  const sanitizedName = nameParam
    ? nameParam.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 80)
    : "";
  const key = sanitizedName
    ? `${prefix}/${sanitizedName}-${Date.now()}.png`
    : `${prefix}/${Date.now()}-${randomId()}.png`;
  const contentType = request.headers.get("Content-Type") || "image/png";

  const body = await request.arrayBuffer();
  if (!body || body.byteLength === 0) {
    console.error("[R2] Empty body");
    return new Response(
      JSON.stringify({ error: "Empty body" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
    );
  }
  console.log("[R2] Uploading key:", key, "size:", body.byteLength);

  try {
    await env.BUCKET.put(key, body, {
      httpMetadata: { contentType },
    });
    const publicUrl = env.PUBLIC_BASE_URL.endsWith("/") ? env.PUBLIC_BASE_URL + key : env.PUBLIC_BASE_URL + "/" + key;
    console.log("[R2] Upload success:", publicUrl);
    return new Response(
      JSON.stringify({ publicUrl, key }),
      { headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
    );
  } catch (e) {
    console.error("[R2] Upload failed:", e);
    return new Response(
      JSON.stringify({ error: "Upload failed", detail: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
    );
  }
}

function randomId(): string {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function handleShopifyWebhook(request: Request, env: Env): Promise<Response> {
  const rawBody = await request.arrayBuffer();
  const hmac = request.headers.get("X-Shopify-Hmac-SHA256");
  if (!hmac || !env.SHOPIFY_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  const valid = await verifyShopifyHmac(rawBody, env.SHOPIFY_WEBHOOK_SECRET, hmac);
  if (!valid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(new TextDecoder().decode(rawBody)) as ShopifyOrderPayload;
  const merchantEmail = env.MERCHANT_EMAIL || MERCHANT_EMAIL;

  const html = buildOrderEmailHtml(payload);
  const sent = await sendEmail(env.RESEND_API_KEY, {
    from: "Printora Orders <onboarding@resend.dev>",
    to: merchantEmail,
    subject: `New Order #${payload.order_number ?? payload.id} - PrintOra`,
    html,
  });

  if (!sent) {
    return new Response("Email send failed", { status: 500 });
  }
  return new Response("OK", { status: 200 });
}

async function verifyShopifyHmac(body: ArrayBuffer, secret: string, hmacHeader: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, body);
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return computed === hmacHeader;
}

interface ShopifyOrderPayload {
  id?: number;
  order_number?: number;
  email?: string;
  total_price?: string;
  financial_status?: string;
  shipping_address?: {
    first_name?: string;
    last_name?: string;
    address1?: string;
    city?: string;
    province?: string;
    zip?: string;
    country?: string;
    phone?: string;
  };
  line_items?: Array<{
    title?: string;
    quantity?: number;
    price?: string;
    properties?: Array<{ name: string; value: string }>;
  }>;
  note?: string;
  note_attributes?: Array<{ name: string; value: string }>;
}

function getProperty(props: Array<{ name: string; value: string }> | undefined, name: string): string {
  if (!props) return "";
  const p = props.find((x) => x.name === name);
  return p ? p.value : "";
}

function getNoteAttr(attrs: Array<{ name: string; value: string }>, name: string): string {
  const a = attrs.find((x) => x.name === name);
  return a ? a.value : "";
}

function buildOrderEmailHtml(payload: ShopifyOrderPayload): string {
  const addr = payload.shipping_address;
  const addrLine = addr
    ? [addr.address1, addr.city, addr.province, addr.zip, addr.country].filter(Boolean).join(", ")
    : "";
  const firstItem = payload.line_items?.[0];
  const props = firstItem?.properties ?? [];
  const previewUrl = getProperty(props, "Preview URL");
  const originalUrl = getProperty(props, "Original URL");
  const size = getProperty(props, "Size") || "-";
  const type = getProperty(props, "Type") || "-";
  const tshirtColor = getProperty(props, "T-Shirt Color") || "-";
  const printSize = getProperty(props, "Print Size") || "-";

  const noteAttr = payload.note_attributes ?? [];
  const noteVal = payload.note || getNoteAttr(noteAttr, "Notes") || getNoteAttr(noteAttr, "note") || "";

  let body = `
    <h2>Order #${payload.order_number ?? payload.id}</h2>
    <p><strong>Customer:</strong> ${payload.email ?? "-"}</p>
    <p><strong>Shipping:</strong> ${addr?.first_name ?? ""} ${addr?.last_name ?? ""} | ${addrLine}</p>
    <p><strong>Phone:</strong> ${addr?.phone ?? "-"}</p>
    <p><strong>Total:</strong> ${payload.total_price ?? "-"} ${payload.financial_status ?? ""}</p>
    <hr/>
    <h3>Design details</h3>
    <p><strong>Size:</strong> ${size} | <strong>Type:</strong> ${type}</p>
    <p><strong>T-Shirt Color:</strong> ${tshirtColor} | <strong>Print Size:</strong> ${printSize}</p>
  `;
  if (previewUrl) {
    body += `<p><strong>Preview:</strong> <a href="${previewUrl}">View preview</a></p>`;
    body += `<p><img src="${previewUrl}" alt="Preview" style="max-width:400px;height:auto;border:1px solid #ddd;" /></p>`;
  }
  if (originalUrl) {
    body += `<p><strong>Original design:</strong> <a href="${originalUrl}">View original</a></p>`;
  }
  if (noteVal) {
    body += `<p><strong>Notes:</strong> ${noteVal}</p>`;
  }
  body += "<hr/><p>This email was sent by Printora order webhook.</p>";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>${body}</body></html>`;
}

async function sendEmail(apiKey: string, opts: { from: string; to: string; subject: string; html: string }): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(opts),
  });
  return res.ok;
}
