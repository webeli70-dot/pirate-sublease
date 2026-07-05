// Netlify Function: sends a "new message" notification email via Resend.
// The RESEND_API_KEY lives in Netlify's environment variables (never in the
// browser), so the secret key is safe. The browser calls THIS function; this
// function calls Resend.

export default async (req) => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { to_email, to_name, from_name, listing_title, message_text, site_url } = body;

  // Basic validation — don't send junk
  if (!to_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to_email)) {
    return new Response(JSON.stringify({ error: "Bad recipient" }), { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500 });
  }

  const esc = (s) => String(s || "").replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
  const first = esc((to_name || "there").split(" ")[0]);

  const html = `
    <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#17251F;">
      <div style="font-weight:800;font-size:18px;color:#592A8A;margin-bottom:16px;">Pirate Sublease</div>
      <p style="font-size:15px;line-height:1.6;">Hi ${first},</p>
      <p style="font-size:15px;line-height:1.6;"><b>${esc(from_name)}</b> just messaged you about "<b>${esc(listing_title)}</b>":</p>
      <div style="background:#F4EEFB;border-left:3px solid #592A8A;padding:12px 16px;border-radius:8px;font-size:15px;line-height:1.5;margin:14px 0;">${esc(message_text)}</div>
      <a href="${esc(site_url) || "https://piratesublease.com"}" style="display:inline-block;background:#592A8A;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;font-size:14px;margin-top:8px;">Open Pirate Sublease</a>
      <p style="font-size:12px;color:#9AA6A0;margin-top:24px;line-height:1.5;">You got this because someone messaged you on Pirate Sublease, Greenville's sublease board.</p>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Pirate Sublease <notifications@piratesublease.com>",
        to: [to_email],
        reply_to: body.reply_to || undefined,
        subject: `New message about ${listing_title || "your listing"}`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: "Send failed", detail: errText }), { status: 502 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Send error" }), { status: 500 });
  }
}; 
