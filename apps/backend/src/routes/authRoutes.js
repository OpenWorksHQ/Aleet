const express = require("express");
const {
  signupStart,
  signupVerify,
  signupPasscode,
  signupComplete,
  forgotPassword,
  resetPassword,
  loginUser,
  checkUser,
} = require("../controllers/userController");
const {
  driverSignupStart,
  driverSignupDocuments,
  driverSignupComplete,
} = require("../controllers/driverAuthController");
const {
  uploadDriverDocuments,
  uploadDriverComplete,
  handleUploadError,
} = require("../utils/multer");
const { smsLimiter } = require("../middleware/rateLimiters");
const { validate } = require("../middleware/validate");
const {
  signupStartBody,
  signupVerifyBody,
  signupPasscodeBody,
  signupCompleteBody,
  driverSignupStartBody,
  driverSignupDocumentsBody,
  driverSignupCompleteBody,
  loginBody,
  checkUserBody,
  forgotPasswordBody,
  resetPasswordBody,
} = require("../validators/authValidators");

const router = express.Router();

// NOTE: the whole /api/auth mount also sits behind `authLimiter` (server.js).
// `smsLimiter` is the tighter cap applied only to endpoints that spend money
// or send mail on every call.
//
// NOTE: on the multipart routes below, `validate` MUST be mounted AFTER multer —
// req.body does not exist until multer has parsed the form.

// ── Customer signup flow ──────────────────────────────────────────────────────
router.post("/signup/start", smsLimiter, validate({ body: signupStartBody }), signupStart); // 1. Enter phone/email → send OTP (billable Twilio SMS)
router.post("/signup/verify", validate({ body: signupVerifyBody }), signupVerify); // 2. Enter OTP code → get signupToken (or driverToken)
router.post("/signup/passcode", validate({ body: signupPasscodeBody }), signupPasscode); // 3. Set password → get tempToken
router.post(
  "/signup/complete",
  uploadDriverDocuments,
  handleUploadError,
  validate({ body: signupCompleteBody }),
  signupComplete,
); // 4. Name + email → JWT

// ── Driver signup flow (no SMS/OTP — verification is via documents + Checkr) ──
router.post(
  "/driver/signup/start",
  validate({ body: driverSignupStartBody }),
  driverSignupStart,
); // 1. name + phone + email + password → driverToken
router.post(
  "/driver/signup/documents",
  uploadDriverDocuments,
  handleUploadError,
  validate({ body: driverSignupDocumentsBody }),
  driverSignupDocuments,
); // 2. ssn + vehicleTypes + images → docsToken
router.post(
  "/driver/signup/complete",
  uploadDriverComplete,
  handleUploadError,
  validate({ body: driverSignupCompleteBody }),
  driverSignupComplete,
); // 3. license consent → JWT

// ── Common ────────────────────────────────────────────────────────────────────
router.post(
  "/password/forgot",
  smsLimiter,
  validate({ body: forgotPasswordBody }),
  forgotPassword,
); // sends OTP/email — billable
router.post("/password/reset", validate({ body: resetPasswordBody }), resetPassword);
router.post("/login", validate({ body: loginBody }), loginUser);
router.post("/check-user", validate({ body: checkUserBody }), checkUser);

module.exports = router;
