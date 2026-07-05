// Netlify Function: sends the "Ava from Pirate Sublease" email verification email
// via Resend. The RESEND_API_KEY lives in Netlify's environment variables.

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { to_email, to_name, verify_link } = body;

  if (!to_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to_email)) {
    return new Response(JSON.stringify({ error: "Bad recipient" }), { status: 400 });
  }
  if (!verify_link || !/^https?:\/\//.test(verify_link)) {
    return new Response(JSON.stringify({ error: "Bad link" }), { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500 });
  }

  const esc = (s) => String(s || "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const first = esc((to_name || "there").split(" ")[0]);
  const link = esc(verify_link);

  const html = `
    <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#17251F;">
      <div style="text-align:center;margin-bottom:20px;">
        <img src="https://piratesublease.com/logo.png" alt="Pirate Sublease" width="56" height="56" style="display:inline-block;vertical-align:middle;"/>
        <div style="font-weight:800;font-size:18px;color:#592A8A;margin-top:6px;">Pirate Sublease</div>
      </div>
      <p style="font-size:15px;line-height:1.6;">Hi ${first}, I'm Ava from Pirate Sublease 👋</p>
      <p style="font-size:15px;line-height:1.6;">Welcome aboard! Just one quick step — tap the button below to verify your email. Once you're verified, you can post listings and message other students.</p>
      <div style="text-align:center;margin:26px 0;">
        <a href="${link}" style="display:inline-block;background:#592A8A;color:#fff;text-decoration:none;padding:14px 30px;border-radius:10px;font-weight:700;font-size:15px;">Verify my email</a>
      </div>
      <p style="font-size:13px;line-height:1.6;color:#5A6560;">If the button doesn't work, copy and paste this link into your browser:<br/><a href="${link}" style="color:#592A8A;word-break:break-all;">${link}</a></p>
      <p style="font-size:13px;line-height:1.6;color:#5A6560;">This link works for 3 days. If you didn't sign up for Pirate Sublease, you can safely ignore this email.</p>
      <p style="font-size:14px;line-height:1.6;margin-top:24px;">— Ava<br/><span style="color:#9AA6A0;font-size:12px;">Pirate Sublease · Greenville's student sublease board</span></p>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Ava from Pirate Sublease <ava@piratesublease.com>",
        to: [to_email],
        subject: "Verify your email — Pirate Sublease",
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
