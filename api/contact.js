// Vercel serverless function: project inquiry form handler.
// Sends the inquiry to both studio inboxes via Resend.
// Env: RESEND_API_KEY (Resend API key)

const RESEND_API_URL = "https://api.resend.com/emails";
const NOTIFY_TO = ["pixelpeak.mi@gmail.com", "info@pixelpeak.studio"];

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(500).json({ ok: false, error: "Email service not configured" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  const name = String(body.name || "").trim().slice(0, 120);
  const email = String(body.email || "").trim().slice(0, 160);
  const phone = String(body.phone || "").trim().slice(0, 40);
  const projectType = String(body.projectType || "").trim().slice(0, 80);
  const details = String(body.details || "").trim().slice(0, 2000);

  if (!name || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !details) {
    res.status(400).json({ ok: false, error: "Please fill in your name, a valid email, and project details." });
    return;
  }

  const subject = `New project inquiry from ${name} (${projectType || "General"})`;
  const html = `
    <h2>New project inquiry — pixelpeak.studio</h2>
    <p><strong>Name:</strong> ${esc(name)}</p>
    <p><strong>Email:</strong> ${esc(email)}</p>
    <p><strong>Phone:</strong> ${esc(phone || "Not provided")}</p>
    <p><strong>Project type:</strong> ${esc(projectType || "Not specified")}</p>
    <p><strong>Details:</strong></p>
    <p>${esc(details).replace(/\n/g, "<br>")}</p>
  `;

  const resp = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Pixel Peak Studio <onboarding@resend.dev>",
      to: NOTIFY_TO,
      reply_to: email,
      subject,
      html,
    }),
  });

  if (!resp.ok) {
    console.error("Resend error:", await resp.text());
    res.status(502).json({ ok: false, error: "Could not send your request. Please email info@pixelpeak.studio directly." });
    return;
  }

  res.status(200).json({ ok: true });
};
