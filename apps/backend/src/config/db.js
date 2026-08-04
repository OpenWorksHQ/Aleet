// config/db.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Must match the file server.js loads. This used to point at `.env.local`,
// which does not exist in any deployment — connectDB only worked because
// server.js had already loaded `.env` first (dotenv does not overwrite vars
// that are already set). Anything importing this module directly got an
// undefined MONGODB_URI.
dotenv.config({ path: require('path').resolve(__dirname, '../../.env') });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
