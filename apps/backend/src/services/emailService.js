const nodemailer = require('nodemailer');

let transporter = null;

const ROLE_LABELS = {
  investor: 'Investor',
  operator: 'Operator / Expansion',
  legal: 'Legal / Leadership',
  other: 'Other',
};

function getGmailCredentials() {
  const user = process.env.GMAIL_USER?.trim();
  // Google app passwords are 16 chars — strip accidental spaces from copy/paste
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '') || '';

  if (!user || !pass) {
    throw new Error('Missing GMAIL_USER or GMAIL_APP_PASSWORD');
  }

  return { user, pass };
}

function getMailFrom() {
  const fromEmail =
    process.env.GMAIL_FROM_EMAIL?.trim() ||
    getGmailCredentials().user;
  return `Aleet <${fromEmail}>`;
}

function getInvestorInbox() {
  return (
    process.env.INVESTOR_INBOX_EMAIL?.trim() ||
    process.env.COMPANY_EMAIL?.trim() ||
    process.env.GMAIL_USER?.trim() ||
    ''
  );
}

const getTransporter = () => {
  if (transporter) return transporter;

  const { user, pass } = getGmailCredentials();

  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  return transporter;
};

/** Clear cached SMTP connection (call after credential changes or auth errors). */
const resetTransporter = () => {
  transporter = null;
};

const sendPasswordResetEmail = async (email, resetLink) => {
  const mailer = getTransporter();

  const result = await mailer.sendMail({
    from: getMailFrom(),
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

  const result = await mailer.sendMail({
    from: getMailFrom(),
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
 * Recipient: INVESTOR_INBOX_EMAIL → COMPANY_EMAIL → GMAIL_USER.
 *
 * @param {Object} submission - { fullName, role, linkedinOrWebsite, background, email, phoneOrCalendly }
 * @returns {Promise<{ success: boolean, messageId?: string }>}
 */
const sendInvestorSubmissionEmail = async (submission) => {
  const to = getInvestorInbox();

  if (!to) {
    throw new Error('No company inbox configured (set INVESTOR_INBOX_EMAIL)');
  }

  const from = getMailFrom();

  const {
    fullName = '',
    role = '',
    linkedinOrWebsite = '',
    background = '',
    email = '',
    phoneOrCalendly = '',
  } = submission || {};

  const safe = (v) => (v && String(v).trim() ? String(v).trim() : '—');
  const roleLabel = ROLE_LABELS[role] || safe(role);

  const rows = [
    ['Full Name', safe(fullName)],
    ['Role', roleLabel],
    ['LinkedIn / Website', safe(linkedinOrWebsite)],
    ['Background / Experience', safe(background)],
    ['Email', safe(email)],
    ['Phone / Calendly', safe(phoneOrCalendly)],
  ];

  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
  const htmlRows = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px;font-weight:bold;background:#f5f5f5;vertical-align:top;">${k}</td><td style="padding:6px 12px;white-space:pre-wrap;">${v}</td></tr>`
    )
    .join('');

  try {
    const mailer = getTransporter();
    const result = await mailer.sendMail({
      from,
      to,
      replyTo: email || undefined,
      subject: `Early Builder Circle — ${safe(fullName)} (${roleLabel})`,
      text: `New submission from the Aleet /teams page (Join Early Builder Circle):\n\n${text}`,
      html: `
      <h2>Join Aleet's Early Builder Circle</h2>
      <p>A new submission was received from <strong>aleet.app/teams</strong>:</p>
      <table style="border-collapse:collapse;border:1px solid #ddd;max-width:640px;">${htmlRows}</table>
      <p style="margin-top:16px;color:#666;font-size:13px;">Reply directly to this email to reach the submitter.</p>
    `,
    });

    console.log(`📧 Investor submission email sent → ${to} (from ${from}, id: ${result.messageId})`);
    return { success: true, messageId: result.messageId };
  } catch (err) {
    resetTransporter();
    throw err;
  }
};

/** Log configured mail targets at startup (no secrets). */
const logEmailConfig = () => {
  try {
    const { user } = getGmailCredentials();
    const from = getMailFrom();
    const inbox = getInvestorInbox();
    console.log(`📧 Email ready — SMTP: ${user} | From: ${from} | Inbox: ${inbox}`);
  } catch (err) {
    console.warn(`📧 Email not configured: ${err.message}`);
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendVerificationCodeEmail,
  sendInvestorSubmissionEmail,
  logEmailConfig,
};
