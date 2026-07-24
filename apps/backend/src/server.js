const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db'); // 🟢 DB connection
const initSockets = require('./sockets');

// Load environment variables
dotenv.config({ path: require('path').resolve(__dirname, '../.env') });

// Connect to MongoDB 🟡
connectDB();

const app = express();

const { errorHandler, notFound } = require('./middleware/errorHandler');
const { corsMiddleware } = require('./middleware/cors');

// CORS first — required for Vercel → ngrok/local API and browser preflight.
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

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
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

// Dispatch escalation sweep — every minute, escalate unanswered stage-1 trip
// offers (advance bookings) to stage 2 (Pro + Diamond). Same-day offers have a
// single stage so they aren't touched here.
const { escalateExpiredOffers } = require('./services/dispatchService');
setInterval(() => {
  escalateExpiredOffers().catch((e) => {
    console.error('Escalation sweep error:', e?.message || e);
  });
}, 60 * 1000);

// Start server — wrap in http.createServer so Socket.IO can attach to the
// same port. AQD presence (driver online/offline) runs over the /drivers
// namespace; see src/sockets/.
const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);
initSockets(httpServer);

// Presence sync — refreshes isOnline for admin UI; does not clear availability intent.
const { runPresenceSweep } = require('./cron/presenceSweeper');
setInterval(() => {
  runPresenceSweep().catch((e) => {
    console.error('Availability sync error:', e?.message || e);
  });
}, 5 * 60 * 1000);

// Membership auto-renewal — charges saved cards for members whose quarterly
// (or monthly/annually) nextBillingDate has passed. Checked hourly; each
// member is only actually charged once since nextBillingDate advances after
// a successful charge.
const { runMembershipRenewalSweep } = require('./cron/membershipRenewalJob');
setInterval(() => {
  runMembershipRenewalSweep().catch((e) => {
    console.error('Membership renewal sweep error:', e?.message || e);
  });
}, 60 * 60 * 1000);

// Auto-cancel past Pending/Confirmed trips that never completed — keeps
// customer trip history accurate (Active / Completed / Cancelled).
const { runStaleBookingCancelSweep } = require('./cron/staleBookingCancelJob');
setInterval(() => {
  runStaleBookingCancelSweep().catch((e) => {
    console.error('Stale booking cancel sweep error:', e?.message || e);
  });
}, 15 * 60 * 1000);
// Run once shortly after boot so orphans clear without waiting for first interval.
setTimeout(() => {
  runStaleBookingCancelSweep().catch((e) => {
    console.error('Stale booking cancel sweep (boot) error:', e?.message || e);
  });
}, 20 * 1000);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  logEmailConfig();
});
