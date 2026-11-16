const nodemailer = require("nodemailer");

const INBOX = "athardxb14@gmail.com";

const TYPES = new Set([
  "Website",
  "E-commerce Website",
  "Mobile App",
  "CRM",
  "ERP",
  "Custom Software",
  "Social Media",
  "Personal Branding",
  "Business Social Presence",
  "Social Media Content Planning",
  "Others",
]);

const BUDGETS = new Set([
  "$5,000 - $10,000",
  "$10,000 - $25,000",
  "$25,000 - $50,000",
  "$50,000 - $100,000",
  "$100,000+",
]);

function field(value, max) {
  return String(value == null ? "" : value).replace(/[\u0000-\u001F\u007F]+/g, " ").trim().slice(0, max);
}

function emailOk(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sendContact(body, env) {
  if (field(body.company, 200)) return { status: 200, payload: { ok: true } };

  const name = field(body.name, 120);
  const email = field(body.email, 200);
  const phone = field(body.phone, 40);
  const type = field(body.type, 80);
  const requirements = String(body.requirements == null ? "" : body.requirements).replace(/\u0000/g, "").trim().slice(0, 5000);
  const budget = field(body.budget, 40);

  if (!name || !emailOk(email) || !phone || !TYPES.has(type) || !requirements || !BUDGETS.has(budget)) {
    return { status: 400, payload: { error: "Check the form and try again." } };
  }

  const pass = String(env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
  if (!pass) return { status: 500, payload: { error: "Could not send the message." } };

  const message = {
    from: "Jetspot <" + INBOX + ">",
    to: INBOX,
    replyTo: email,
    subject: "Quote request from " + name,
    text: [
      "Name: " + name,
      "Email: " + email,
      "Phone: " + phone,
      "Project type: " + type,
      "Budget: " + budget,
      "",
      requirements,
    ].join("\n"),
  };

  const attempts = [
    { port: 465, secure: true },
    { port: 587, secure: false, requireTLS: true },
  ];
  const failures = [];
  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: attempt.port,
        secure: attempt.secure,
        requireTLS: !!attempt.requireTLS,
        family: 4,
        auth: { user: INBOX, pass },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 12000,
      });
      await transporter.sendMail(message);
      return { status: 200, payload: { ok: true } };
    } catch (err) {
      console.error(attempt.port, err && err.code, err && err.responseCode, err && err.response);
      failures.push({
        port: attempt.port,
        code: (err && err.code) || "send",
        responseCode: (err && err.responseCode) || null,
      });
    }
  }
  return { status: 502, payload: { error: "Could not send the message.", failures: failures } };
}

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function reply(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(body);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return reply(res, 405, { error: "Method not allowed" });
  }
  try {
    const body = await readJson(req);
    const result = await sendContact(body || {}, process.env);
    return reply(res, result.status, result.payload);
  } catch (err) {
    console.error(err);
    return reply(res, 400, { error: "Check the form and try again." });
  }
};

module.exports.sendContact = sendContact;
