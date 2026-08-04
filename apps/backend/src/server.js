const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
const helmet = require('helmet');
const connectDB = require('./config/db'); // 🟢 DB connection
const initSockets = require('./sockets');

// Load environment variables
dotenv.config({ path: require('path').resolve(__dirname, '../.env') });

// Connect to MongoDB 🟡
connectDB();

const app = express();

const { errorHandler, notFound } = require('./middleware/errorHandler');
const { corsMiddleware } = require('./middleware/cors');
const { requireUploadAuth } = require('./middleware/protectedUploads');
const { generalLimiter, authLimiter } = require('./middleware/rateLimiters');
const { uploadsDir } = require('./utils/multer');
const { startBackgroundJobs } = require('./utils/backgroundJobs');
const { hasKey: hasSsnEncryptionKey } = require('./utils/ssnCrypto');

// Fail the DEPLOY, not the first driver signup. Without SSN_ENCRYPTION_KEY the
// crypto layer throws in production — but lazily, on the first SSN read/write,
// which means a broken config surfaces as a failed registration hours later
// (and an admin driver list that shows "no SSN on file"). Check it at boot so a
// misconfigured release never accepts traffic.
// Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
if (process.env.NODE_ENV === 'production' && !hasSsnEncryptionKey()) {
  console.error(
    'FATAL: SSN_ENCRYPTION_KEY is not set (or is malformed). Driver SSNs cannot ' +
    'be encrypted at rest. Refusing to start.',
  );
  process.exit(1);
}

// Trust the first proxy hop (ngrok / Railway / nginx) so req.ip is the real
// client address — without this every request looks like it came from the proxy
// and one client would exhaust the shared rate-limit bucket. Keep this at the
// exact number of proxies in front of the app: a too-permissive value lets a
// client spoof X-Forwarded-For and bypass the limiter entirely.
const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS, 10);
app.set('trust proxy', Number.isFinite(trustProxyHops) && trustProxyHops >= 0 ? trustProxyHops : 1);

// Security headers. crossOriginResourcePolicy is relaxed because the Next.js
// frontends load /uploads images from this origin, and HSTS is left to the
// edge proxy that terminates TLS.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // API only serves JSON + files; the frontends set their own CSP
  }),
);

// CORS next — required for Vercel → ngrok/local API and browser preflight.
app.use(corsMiddleware);

app.get('/health', (req, res) => res.status(200).json({ status: 'Aleet Backend is running' }));

// Import routes
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const vehicleTypeRoutes = require('./routes/vehicleTypeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminManagementRoutes = require('./routes/adminManagementRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const addOnRoutes = require('./routes/addOnRoutes');
const checkrRoutes = require('./routes/checkrRoutes');
const bankAccountRoutes = require('./routes/bankAccountRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes.js');
const dashboardRoutes = require('./routes/dashboardRoutes');
const paymentsRoutes = require('./routes/payments.routes');
const payoutRoutes = require('./routes/payoutRoutes');
const regionRoutes = require('./routes/regionRoutes');
const teamsRoutes = require('./routes/teamsRoutes');
const investorDocumentRoutes = require('./routes/investorDocumentRoutes');
const partnerRoutes = require('./routes/partnerRoutes');
const adminPartnerRoutes = require('./routes/adminPartnerRoutes');
const mapsRoutes = require('./routes/mapsRoutes');
const PaymentsController = require('./controllers/payments.controller');
const { logEmailConfig } = require('./services/emailService');

// Raw-body routes MUST come before express.json() so the body stream is not consumed
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), PaymentsController.webhook);
app.post('/checkr/webhooks/checkr', express.raw({ type: '*/*' }), require('./controllers/checkrController').webhook);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files — EVERYTHING under uploads/ is PII (driver's license photos,
// vehicle photos, investor data-room documents), so it is behind an auth gate:
// any valid JWT for general files, admin only for /uploads/investor/*.
// See middleware/protectedUploads.js (incl. why ?token= is accepted here).
// `uploadsDir` honours UPLOAD_DIR so files survive a redeploy.
app.use('/uploads', requireUploadAuth, express.static(uploadsDir));

// Rate limiting — mounted AFTER the raw-body webhook handlers above (those
// routes have already matched and responded, so Stripe/Checkr retry bursts are
// never throttled; the limiters additionally skip any /webhook path).
app.use('/api', generalLimiter);

// Routes
app.use('/api/users', userRoutes);
// Strict limiter on the auth surface: credential stuffing, password-reset spam,
// and signup/start which sends a billable Twilio SMS (further limited inside
// authRoutes by smsLimiter).
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/vehicle-types', vehicleTypeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/admins', adminManagementRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/addons', addOnRoutes);
app.use('/checkr', checkrRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/payout', payoutRoutes);
app.use('/api/regions', regionRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/admin/investor-documents', investorDocumentRoutes);
app.use('/api/admin/partners', adminPartnerRoutes);
app.use('/api/maps', mapsRoutes);

// Error handlers
app.use(notFound);
app.use(errorHandler);

// Start server — wrap in http.createServer so Socket.IO can attach to the
// same port. AQD presence (driver online/offline) runs over the /drivers
// namespace; see src/sockets/.
const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);
initSockets(httpServer);

// Recurring sweeps (dispatch escalation, presence sync, membership renewal,
// stale booking cancellation). Only ONE process may run these — see
// utils/backgroundJobs.js for the RUN_CRON_JOBS / NODE_APP_INSTANCE gate.
startBackgroundJobs();

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  logEmailConfig();
});
