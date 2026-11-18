// Sends one sample quote request through the real Gmail login, to prove the app password works.
// Usage:  GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx" node scripts/send-test.js
const { sendContact } = require("../api/contact");

sendContact(
  {
    name: "Test Visitor",
    email: "visitor@example.com",
    phone: "+1 555 000 0000",
    type: "Website",
    budget: "$5,000 - $10,000",
    requirements: "This is a test message from scripts/send-test.js. If you can read it, the service works.",
  },
  process.env
).then((result) => {
  console.log(result.status, JSON.stringify(result.payload));
  if (result.payload.code === "auth") {
    console.log("Gmail rejected the login: check the app password and that 2-Step Verification is on.");
  }
  process.exit(result.status === 200 ? 0 : 1);
});
