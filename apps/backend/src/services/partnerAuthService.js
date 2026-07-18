const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Partner = require('../models/Partner');
const generateToken = require('../utils/generateToken');
const {
  sendPasswordResetEmail,
  sendPartnerPortalInviteEmail,
} = require('./emailService');
const { populatePartnerContext } = require('./partnerService');

class PartnerAuthError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'PartnerAuthError';
    this.statusCode = statusCode;
  }
}

const INVITE_EXPIRY_MS = 90 * 24 * 60 * 60 * 1000; // 90 days — partners were locking out after the old 14-day window
const RESET_EXPIRY_MS = 30 * 60 * 1000;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}

function buildPartnerPortalUrl(path, token) {
  const base = (
    process.env.PARTNER_PORTAL_URL
    || process.env.FRONTEND_URL
    || process.env.CUSTOMER_SITE_URL
    || 'http://localhost:3001'
  ).replace(/\/$/, '');
  const url = `${base}${path}`;
  return token ? `${url}${url.includes('?') ? '&' : '?'}token=${token}` : url;
}

/** Synthetic unique phone per partner — portal login uses email, not phone. */
function partnerPortalPhone(partnerId) {
  const id = String(partnerId).replace(/[^a-f0-9]/gi, '');
  const suffix = id.slice(-12).padStart(12, '0');
  return `+888${suffix}`;
}

function parseMongoDuplicateKeyError(err) {
  if (err?.code !== 11000 && err?.code !== '11000') return null;

  const keyValue = err.keyValue || {};
  if (keyValue.email !== undefined) {
    return 'A partner portal account with this contact email already exists.';
  }
  if (keyValue.phone !== undefined) {
    return 'Could not create portal account due to a phone number conflict. Please try again or contact support.';
  }
  return 'A partner portal account with these details already exists.';
}

function wrapMongoError(err) {
  const message = parseMongoDuplicateKeyError(err);
  if (message) {
    throw new PartnerAuthError(message, 409);
  }
  throw err;
}

async function findPartnerPortalUser(partnerId, email) {
  const byPartner = await User.findOne({
    role: 'partner',
    'partnerProfile.partnerId': partnerId,
  }).select('+partnerProfile.inviteToken');

  if (byPartner) return byPartner;

  const byEmail = await User.findOne({ email, role: 'partner' }).select('+partnerProfile.inviteToken');
  if (!byEmail) return null;

  const linkedId = byEmail.partnerProfile?.partnerId
    ? String(byEmail.partnerProfile.partnerId)
    : null;

  if (linkedId && linkedId !== String(partnerId)) {
    throw new PartnerAuthError(
      'This contact email is already linked to a different partner portal account.',
      409,
    );
  }

  return byEmail;
}

function syncPartnerUserFields(user, partner) {
  user.name = partner.contactName || partner.partnerName || user.name;
  user.email = normalizeEmail(partner.contactEmail) || user.email;
  user.phone = partnerPortalPhone(partner._id);
  user.active = true;
  user.partnerProfile = user.partnerProfile || {};
  user.partnerProfile.partnerId = partner._id;
}

/**
 * Keep portal User.email/name in sync when Partner contact fields change
 * (admin edit or approved update request). Prevents login/forgot against
 * stale emails after contactEmail is updated on the Partner doc only.
 */
async function syncPartnerPortalUserFromPartner(partnerDoc) {
  const partner = partnerDoc?.toObject ? partnerDoc.toObject() : partnerDoc;
  if (!partner?._id) return null;

  const email = normalizeEmail(partner.contactEmail);
  const user = await User.findOne({
    role: 'partner',
    'partnerProfile.partnerId': partner._id,
  });
  if (!user) return null;

  syncPartnerUserFields(user, partner);
  if (email) user.email = email;

  try {
    await user.save();
  } catch (err) {
    wrapMongoError(err);
  }
  return user;
}

/**
 * Resolve portal user by email, with fallback via Partner.contactEmail
 * when Partner doc and User.email have drifted.
 */
async function findPartnerPortalUserByLoginEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  let user = await User.findOne({ email: normalizedEmail, role: 'partner' });
  if (user) return user;

  const partner = await Partner.findOne({ contactEmail: normalizedEmail });
  if (!partner) return null;

  user = await User.findOne({
    role: 'partner',
    'partnerProfile.partnerId': partner._id,
  });
  if (!user) return null;

  // Heal drift so future login / forgot hits User.email directly.
  if (normalizeEmail(user.email) !== normalizedEmail) {
    user.email = normalizedEmail;
    try {
      await user.save();
    } catch (err) {
      wrapMongoError(err);
    }
  }
  return user;
}

async function createPartnerUserFromPartner(partnerDoc, { sendInvite = true } = {}) {
  const partner = partnerDoc.toObject ? partnerDoc.toObject() : partnerDoc;
  const email = normalizeEmail(partner.contactEmail);
  if (!email) {
    throw new PartnerAuthError('Partner contact email is required for portal access', 400);
  }

  let user = await findPartnerPortalUser(partner._id, email);

  if (user) {
    syncPartnerUserFields(user, partner);

    if (user.partnerProfile.accountStatus === 'active') {
      await user.save();
      return user;
    }

    if (sendInvite) {
      await issuePartnerInvite(user);
    } else {
      await user.save();
    }
    return user;
  }

  try {
    user = await User.create({
      name: partner.contactName || partner.partnerName,
      email,
      phone: partnerPortalPhone(partner._id),
      role: 'partner',
      active: true,
      partnerProfile: {
        partnerId: partner._id,
        accountStatus: 'pending',
      },
    });
  } catch (err) {
    wrapMongoError(err);
  }

  if (sendInvite) {
    try {
      await issuePartnerInvite(user);
    } catch (err) {
      if (err instanceof PartnerAuthError) throw err;
      throw new PartnerAuthError(
        err?.message || 'Portal account created but invite email could not be sent. Use Resend invite to try again.',
        502,
      );
    }
  }

  return user;
}

async function issuePartnerInvite(user) {
  if (!user?.email) {
    throw new PartnerAuthError('Partner portal user has no email address', 400);
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  user.partnerProfile = user.partnerProfile || {};
  user.partnerProfile.inviteToken = hashToken(rawToken);
  user.partnerProfile.inviteExpires = new Date(Date.now() + INVITE_EXPIRY_MS);
  user.partnerProfile.accountStatus = 'pending';

  try {
    await user.save();
  } catch (err) {
    wrapMongoError(err);
  }

  const inviteLink = buildPartnerPortalUrl('/partners/set-password', rawToken);
  const dashboardLink = buildPartnerPortalUrl('/partners/dashboard');

  try {
    await sendPartnerPortalInviteEmail(user.email, inviteLink, dashboardLink);
  } catch (err) {
    throw new PartnerAuthError(
      `Could not send invite email: ${err?.message || 'mail service unavailable'}. Try Resend invite later.`,
      502,
    );
  }

  return { inviteSent: true };
}

async function resendPartnerPortalInvite(partnerId) {
  const partner = await Partner.findById(partnerId);
  if (!partner) throw new PartnerAuthError('Partner not found', 404);

  if (!normalizeEmail(partner.contactEmail)) {
    throw new PartnerAuthError(
      'Partner has no contact email. Add a contact email before sending a portal invite.',
      400,
    );
  }

  const user = await createPartnerUserFromPartner(partner, { sendInvite: false });

  if (user.partnerProfile?.accountStatus === 'active') {
    return {
      email: user.email,
      accountStatus: 'active',
      alreadyActive: true,
      message: 'Portal account is already active. The partner can use Forgot password on the login page if needed.',
    };
  }

  await issuePartnerInvite(user);

  return {
    email: user.email,
    accountStatus: 'pending',
    alreadyActive: false,
    message: 'Portal invite sent.',
  };
}

async function setPasswordFromInvite({ token, password }) {
  if (!token) throw new PartnerAuthError('Invite token is required', 400);
  if (!password || String(password).length < 8) {
    throw new PartnerAuthError('Password must be at least 8 characters', 400);
  }

  const user = await User.findOne({
    role: 'partner',
    'partnerProfile.inviteToken': hashToken(token),
    'partnerProfile.inviteExpires': { $gt: new Date() },
  }).select('+partnerProfile.inviteToken');

  if (!user) throw new PartnerAuthError('Invalid or expired invite link', 401);

  user.password = password;
  user.partnerProfile.inviteToken = null;
  user.partnerProfile.inviteExpires = null;
  user.partnerProfile.accountStatus = 'active';

  try {
    await user.save();
  } catch (err) {
    wrapMongoError(err);
  }

  const partner = user.partnerProfile?.partnerId
    ? await populatePartnerContext(await Partner.findById(user.partnerProfile.partnerId))
    : null;

  return {
    token: generateToken(user._id, user.role),
    user: {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      accountStatus: user.partnerProfile.accountStatus,
    },
    partner,
  };
}

async function loginPartner({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) {
    throw new PartnerAuthError('Email and password are required', 400);
  }

  const user = await findPartnerPortalUserByLoginEmail(normalizedEmail);
  if (!user || !user.active) {
    throw new PartnerAuthError('Invalid email or password', 401);
  }

  if (user.partnerProfile?.accountStatus !== 'active' || !user.password) {
    throw new PartnerAuthError(
      'Your portal account is not activated yet. Use Forgot password on the partner sign-in page to get a new activation link.',
      403,
    );
  }

  const valid = await user.comparePassword(password);
  if (!valid) throw new PartnerAuthError('Invalid email or password', 401);

  const partner = user.partnerProfile?.partnerId
    ? await populatePartnerContext(await Partner.findById(user.partnerProfile.partnerId))
    : null;

  return {
    token: generateToken(user._id, user.role),
    user: {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      accountStatus: user.partnerProfile.accountStatus,
    },
    partner,
  };
}

async function forgotPartnerPassword({ email }) {
  const normalizedEmail = normalizeEmail(email);
  const user = await findPartnerPortalUserByLoginEmail(normalizedEmail);

  if (user) {
    // Never activated / invite expired — re-send set-password invite (not a no-op).
    if (user.partnerProfile?.accountStatus !== 'active' || !user.password) {
      try {
        await issuePartnerInvite(user);
        return {
          message:
            'If this email exists, a new activation link has been sent. Check your inbox to set your password.',
        };
      } catch (err) {
        if (err instanceof PartnerAuthError) throw err;
        throw new PartnerAuthError('Could not send activation email. Try again later.', 502);
      }
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = hashToken(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + RESET_EXPIRY_MS);
    await user.save();

    const resetLink = buildPartnerPortalUrl('/partners/reset-password', rawToken);
    try {
      await sendPasswordResetEmail(user.email, resetLink, {
        subject: 'Reset your Aleet partner portal password',
        intro: 'Use the button below to reset your partner portal password. This link expires in 30 minutes.',
        buttonLabel: 'Reset partner portal password',
      });
    } catch {
      throw new PartnerAuthError('Could not send password reset email. Try again later.', 502);
    }
  }

  return {
    message: 'If this email exists, a password reset link has been sent.',
  };
}

async function resetPartnerPassword({ token, password }) {
  if (!token) throw new PartnerAuthError('Reset token is required', 400);
  if (!password || String(password).length < 8) {
    throw new PartnerAuthError('Password must be at least 8 characters', 400);
  }

  const user = await User.findOne({
    role: 'partner',
    resetPasswordToken: hashToken(token),
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) throw new PartnerAuthError('Invalid or expired reset token', 401);

  user.password = password;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  return { message: 'Password reset successful' };
}

async function getPartnerAuthMe(userId) {
  const user = await User.findById(userId);
  if (!user || user.role !== 'partner' || !user.active) {
    throw new PartnerAuthError('Partner account not found', 404);
  }

  const partner = user.partnerProfile?.partnerId
    ? await populatePartnerContext(await Partner.findById(user.partnerProfile.partnerId))
    : null;

  return {
    user: {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      accountStatus: user.partnerProfile?.accountStatus || 'pending',
    },
    partner,
  };
}

async function getPartnerUserByPartnerId(partnerId) {
  return User.findOne({ role: 'partner', 'partnerProfile.partnerId': partnerId })
    .select('email name partnerProfile.accountStatus active');
}

module.exports = {
  PartnerAuthError,
  createPartnerUserFromPartner,
  resendPartnerPortalInvite,
  issuePartnerInvite,
  setPasswordFromInvite,
  loginPartner,
  forgotPartnerPassword,
  resetPartnerPassword,
  getPartnerAuthMe,
  getPartnerUserByPartnerId,
  syncPartnerPortalUserFromPartner,
  parseMongoDuplicateKeyError,
};
