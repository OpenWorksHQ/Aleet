const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error('Missing GMAIL_USER or GMAIL_APP_PASSWORD');
  }

  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  return transporter;
};

const sendPasswordResetEmail = async (email, resetLink) => {
  const mailer = getTransporter();
  const from = "Aleet <sanistray@gmail.com>"

  const result = await mailer.sendMail({
    from,
    to: email,
    subject: 'Reset your Aleet password',
    text: `Use this link to reset your password: ${resetLink}\nThis link expires in 30 minutes.`,
    html: `
      <p>Use this link to reset your Aleet password:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>This link expires in 30 minutes.</p>
    `,
  });

  return { success: true, messageId: result.messageId };
};

const sendVerificationCodeEmail = async (email, code) => {
  const mailer = getTransporter();
  const from = 'Aleet <sanistray@gmail.com>';

  const result = await mailer.sendMail({
    from,
    to: email,
    subject: 'Your Aleet verification code',
    text: `Your verification code is: ${code}\nThis code expires in 10 minutes.`,
    html: `
      <p>Your Aleet verification code:</p>
      <h2 style="letter-spacing:4px;">${code}</h2>
      <p>This code expires in 10 minutes. Do not share it with anyone.</p>
    `,
  });

  return { success: true, messageId: result.messageId };
};

/**
 * Email the company inbox with a new investor/operator/legal submission.
 * Recipient is resolved from INVESTOR_INBOX_EMAIL → COMPANY_EMAIL → GMAIL_USER.
 *
 * @param {Object} submission - { fullName, role, linkedinOrWebsite, background, email, phoneOrCalendly }
 * @returns {Promise<{ success: boolean, messageId?: string }>}
 */
const sendInvestorSubmissionEmail = async (submission) => {
  const mailer = getTransporter();
  const from = 'Aleet <sanistray@gmail.com>';
  const to =
    process.env.INVESTOR_INBOX_EMAIL ||
    process.env.COMPANY_EMAIL ||
    process.env.GMAIL_USER;

  if (!to) {
    throw new Error('No company inbox configured (set INVESTOR_INBOX_EMAIL)');
  }

  const {
    fullName = '',
    role = '',
    linkedinOrWebsite = '',
    background = '',
    email = '',
    phoneOrCalendly = '',
  } = submission || {};

  const safe = (v) => (v && String(v).trim() ? String(v).trim() : '—');

  const rows = [
    ['Full Name', safe(fullName)],
    ['Role', safe(role)],
    ['LinkedIn / Website', safe(linkedinOrWebsite)],
    ['Background', safe(background)],
    ['Email', safe(email)],
    ['Phone / Calendly', safe(phoneOrCalendly)],
  ];

  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
  const htmlRows = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px;font-weight:bold;background:#f5f5f5;">${k}</td><td style="padding:6px 12px;">${v}</td></tr>`
    )
    .join('');

  const result = await mailer.sendMail({
    from,
    to,
    replyTo: email || undefined,
    subject: `New investor submission — ${safe(fullName)} (${safe(role)})`,
    text: `New submission from the Aleet investor page:\n\n${text}`,
    html: `
      <h2>New investor submission</h2>
      <p>A new submission was received from the Aleet investor page:</p>
      <table style="border-collapse:collapse;border:1px solid #ddd;">${htmlRows}</table>
    `,
  });

  return { success: true, messageId: result.messageId };
};

module.exports = {
  sendPasswordResetEmail,
  sendVerificationCodeEmail,
  sendInvestorSubmissionEmail,
};
