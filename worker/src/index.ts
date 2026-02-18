/**
 * Printora Cloudflare Worker
 * - POST /api/upload-url: return presigned R2 URL for client upload
 * - POST /shopify/webhook: receive order webhook, send email to merchant
 */

import { AwsClient } from "aws4fetch";

const MERCHANT_EMAIL = "contact@printora.co.nz";

export interface Env {
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_ACCOUNT_ID: string;
  R2_BUCKET_NAME: string;
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
      if (url.pathname === "/api/upload-url" && request.method === "POST") {
        return await handleUploadUrl(request, env, origin);
      }
      if (url.pathname === "/shopify/webhook" && request.method === "POST") {
        return await handleShopifyWebhook(request, env);
      }
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    } catch (e) {
      console.error("Worker error:", e);
      return new Response(
        JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders(origin ?? null) } }
      );
    }
  },
};

async function handleUploadUrl(request: Request, env: Env, origin: string | null): Promise<Response> {
  const body = (await request.json()) as { filename?: string; contentType?: string; prefix?: string };
  const filename = body.filename || "image.png";
  const contentType = body.contentType || "image/png";
  const prefix = body.prefix || "designs";
  const ext = filename.includes(".") ? filename.split(".").pop() : "png";
  const key = `${prefix}/${Date.now()}-${randomId()}.${ext}`;

  const accountId = env.R2_ACCOUNT_ID;
  const bucket = env.R2_BUCKET_NAME;
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const objectUrl = `${endpoint}/${bucket}/${key}`;

  const aws = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });

  const putRequest = new Request(objectUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
  });
  const signed = await aws.sign(putRequest, { aws: { signQuery: true } });
  const publicUrl = env.PUBLIC_BASE_URL.endsWith("/") ? env.PUBLIC_BASE_URL + key : env.PUBLIC_BASE_URL + "/" + key;

  return new Response(
    JSON.stringify({ uploadUrl: signed.url, publicUrl, key }),
    { headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
  );
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
  const noteVal = payload.note || noteAttr.find((a) => a.name === "note")?.value || "";

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
