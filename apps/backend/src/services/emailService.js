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

const EMAIL_BUTTON_STYLE =
  'display:inline-block;padding:14px 28px;background-color:#c5a386;color:#000000;font-weight:600;text-decoration:none;border-radius:8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.2;';

function buildEmailButton(href, label) {
  return `<a href="${href}" style="${EMAIL_BUTTON_STYLE}">${label}</a>`;
}

function buildEmailShell({ preheader, bodyHtml }) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#1a1510;line-height:1.6;max-width:560px;">
      ${preheader ? `<p style="margin:0 0 16px;color:#666;font-size:14px;">${preheader}</p>` : ''}
      ${bodyHtml}
    </div>
  `;
}

const sendPasswordResetEmail = async (email, resetLink, options = {}) => {
  const mailer = getTransporter();
  const buttonLabel = options.buttonLabel || 'Reset your password';
  const subject = options.subject || 'Reset your Aleet password';
  const intro =
    options.intro ||
    'Use the button below to reset your Aleet password. This link expires in 30 minutes.';

  const result = await mailer.sendMail({
    from: getMailFrom(),
    to: email,
    subject,
    text: `${intro}\n\n${resetLink}\n\nThis link expires in 30 minutes.`,
    html: buildEmailShell({
      preheader: intro,
      bodyHtml: `
        <p style="margin:0 0 20px;">${intro}</p>
        <p style="margin:0 0 24px;">${buildEmailButton(resetLink, buttonLabel)}</p>
        <p style="margin:0;color:#666;font-size:13px;">If you did not request this, you can ignore this email.</p>
      `,
    }),
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

const sendPartnerPortalInviteEmail = async (email, inviteLink, dashboardLink) => {
  const mailer = getTransporter();
  const intro =
    'Welcome to the Aleet partner program. Set your password to activate your partner portal account.';
  const dashboardIntro =
    'After activation, you can sign in anytime to view bookings, earnings, and your partner QR code.';

  const result = await mailer.sendMail({
    from: getMailFrom(),
    to: email,
    subject: 'Activate your Aleet partner portal',
    text: `${intro}\n\nActivate your account: ${inviteLink}\n\nPartner dashboard: ${dashboardLink}\n\nThe activation link expires in 72 hours.`,
    html: buildEmailShell({
      preheader: intro,
      bodyHtml: `
        <p style="margin:0 0 20px;">${intro}</p>
        <p style="margin:0 0 24px;">${buildEmailButton(inviteLink, 'Activate partner portal')}</p>
        <p style="margin:0 0 20px;">${dashboardIntro}</p>
        <p style="margin:0 0 24px;">${buildEmailButton(dashboardLink, 'Go to partner dashboard')}</p>
        <p style="margin:0;color:#666;font-size:13px;">The activation link expires in 72 hours. Do not share these links with anyone.</p>
      `,
    }),
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
  sendPartnerPortalInviteEmail,
  sendInvestorSubmissionEmail,
  logEmailConfig,
};
