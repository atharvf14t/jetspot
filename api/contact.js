const nodemailer = require("nodemailer");

// The mailbox that both signs in to Gmail and receives the notifications.
const INBOX = "atharvdxb14@gmail.com";

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

// Single-line fields: strip control characters so nothing can inject mail headers.
function line(value, max) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .trim()
    .slice(0, max);
}

function emailOk(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validate(body) {
  // Honeypot: real visitors never see or fill this field. Pretend success to bots.
  if (line(body.company, 200)) return { bot: true };

  const data = {
    name: line(body.name, 120),
    email: line(body.email, 200),
    phone: line(body.phone, 40),
    type: line(body.type, 80),
    budget: line(body.budget, 40),
    requirements: String(body.requirements == null ? "" : body.requirements)
      .replace(/\u0000/g, "")
      .trim()
      .slice(0, 5000),
  };

  const ok =
    data.name &&
    emailOk(data.email) &&
    data.phone &&
    TYPES.has(data.type) &&
    BUDGETS.has(data.budget) &&
    data.requirements;

  return ok ? { data } : { invalid: true };
}

function buildMessage(d) {
  const received = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
  return {
    from: "Jetspot Website <" + INBOX + ">",
    to: INBOX,
    replyTo: d.name.replace(/[<>",]/g, "") + " <" + d.email + ">",
    subject: "New quote request: " + d.name + " (" + d.type + ")",
    text: [
      "New quote request from the Jetspot contact form",
      "",
      "Name: " + d.name,
      "Email: " + d.email,
      "Phone: " + d.phone,
      "Project type: " + d.type,
      "Budget: " + d.budget,
      "Received: " + received + " IST",
      "",
      "Project requirements:",
      d.requirements,
      "",
      "Hit Reply to answer " + d.name + " directly.",
    ].join("\n"),
  };
}

// Gmail accepts SMTP on 465 (SSL) and 587 (STARTTLS); try both in case one is blocked.
const ATTEMPTS = [
  { port: 465, secure: true },
  { port: 587, secure: false, requireTLS: true },
];

async function deliver(message, pass) {
  const failures = [];
  for (const attempt of ATTEMPTS) {
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
      return { ok: true };
    } catch (err) {
      // Never log the password or the message body, only the failure reason.
      console.error("smtp", attempt.port, err && err.code, err && err.responseCode, err && err.response);
      failures.push((err && err.responseCode) || 0);
    }
  }
  return { ok: false, authFailed: failures.indexOf(535) !== -1 };
}

async function sendContact(body, env) {
  const result = validate(body || {});
  if (result.bot) return { status: 200, payload: { ok: true } };
  if (result.invalid) return { status: 400, payload: { error: "Check the form and try again." } };

  const pass = String(env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
  if (!pass) {
    console.error("GMAIL_APP_PASSWORD is not set");
    return { status: 500, payload: { error: "Could not send the message.", code: "config" } };
  }

  const sent = await deliver(buildMessage(result.data), pass);
  if (sent.ok) return { status: 200, payload: { ok: true } };
  return {
    status: 502,
    payload: { error: "Could not send the message.", code: sent.authFailed ? "auth" : "send" },
  };
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
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return reply(res, 405, { error: "Method not allowed" });
  }
  try {
    const body = await readJson(req);
    const result = await sendContact(body, process.env);
    return reply(res, result.status, result.payload);
  } catch (err) {
    console.error(err);
    return reply(res, 400, { error: "Check the form and try again." });
  }
};

module.exports.sendContact = sendContact;
