/**
 * controllers/admin/adminDriverController.js
 * ---------------------------------------------------------------------------
 * Admin actions on a driver record: status/tier changes, the management list,
 * approval, revision requests, Aleet-license upload, service regions, the
 * licensing report, and soft deletion. Moved verbatim out of the original
 * controllers/adminController.js.
 *
 * `formatDriverForAdmin` masks the SSN through utils/maskSSN.js — that import
 * is load-bearing and must stay.
 * ---------------------------------------------------------------------------
 */

const User = require('../../models/User');
const {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
} = require('../../utils/responseHelper');
const { fileUrl } = require('../../utils/multer');
const { resolveDriverTier } = require('../../services/driverTierService');

// Admin function to activate/deactivate a driver
const toggleDriverStatus = async (req, res) => {
  try {
    const { driverId, status, driverStatus, backgroundCheck, tier, availabilityStatus } = req.body;
    // status        → boolean (true = active, false = deactivated) — legacy field
    // driverStatus  → 'pending_review' | 'active' | 'suspended'
    // backgroundCheck → boolean

    if (!driverId) {
      return sendValidationError(res, 'Driver ID is required');
    }

    let driver = await User.findById(driverId);
    if (!driver || driver.role !== 'driver') {
      return sendNotFound(res, 'Driver not found');
    }

    // Update driver.status enum
    const allowedStatuses = ['draft', 'submitted', 'background_pending', 'background_completed', 'approved', 'rejected', 'needs_revision', 'revision_complete'];
    if (driverStatus && allowedStatuses.includes(driverStatus)) {
      driver.driver.status = driverStatus;
      // Clear revision notes when moving away from needs_revision
      if (driverStatus !== 'needs_revision') {
        driver.driver.revisionNotes = null;
      }
    } else if (typeof status === 'boolean') {
      // Legacy boolean support
      driver.driver.status = status ? 'approved' : 'rejected';
      driver.driver.revisionNotes = null;
    }

    // If the driver is no longer approved, immediately drop them from AQD
    // by flipping the presence flag. The cron sweeper would catch this
    // eventually, but suspending an active driver should be instant.
    if (driver.driver.status !== 'approved') {
      driver.driver.isOnline = false;
      driver.driver.availabilityStatus = 'off';
      driver.driver.lastHeartbeatAt = null;
    }

    // Update background check if provided
    if (typeof backgroundCheck === 'boolean') {
      driver.driver.backgroundCheck = backgroundCheck;
    }

    const allowedTiers = ['S-Level', 'Pro', 'Diamond'];
    if (tier && allowedTiers.includes(tier)) {
      driver.driver.tier = tier;
    }

    await driver.save();

    const { ALL_STATUSES, setAvailability } = require('../../services/driverAvailabilityService');
    if (availabilityStatus && ALL_STATUSES.includes(availabilityStatus)) {
      if (driver.driver.status === 'approved' || availabilityStatus === 'off') {
        await setAvailability(driverId, availabilityStatus);
      }
    }

    const fresh = await User.findById(driverId);

    return sendSuccess(res, 200, 'Driver status updated successfully', formatDriverForAdmin(fresh));
  } catch (error) {
    console.error('Toggle Driver Status Error:', error);
    return sendError(res, 500, error.message || 'Failed to update driver status');
  }
};

const { isAqdEligible } = require('../../services/driverAvailabilityService');
const { maskSSN } = require('../../utils/maskSSN');

const formatDriverForAdmin = (driver) => ({
  _id: driver._id,
  name: driver.name,
  email: driver.email,
  phone: driver.phone,
  avatar: driver.avatar || null,
  createdAt: driver.createdAt,
  driver: {
    tier: driver.driver?.tier,
    status: driver.driver?.status,
    backgroundCheck: driver.driver?.backgroundCheck,
    hasForHireLicense: driver.driver?.hasForHireLicense,
    hasOwnVehicle: driver.driver?.hasOwnVehicle,
    vehicleTypes: driver.driver?.vehicleTypes,
    licenseImage: driver.driver?.licenseImage,
    vehicleImage: driver.driver?.vehicleImage,
    forHireLicenseImage: driver.driver?.forHireLicenseImage,
    driverRating: driver.driver?.driverRating,
    ssn: maskSSN(driver.driver?.ssn),
    regions: Array.isArray(driver.driver?.regions) ? driver.driver.regions : [],
    serveAllRegions: driver.driver?.serveAllRegions !== false,
    revisionNotes: driver.driver?.revisionNotes || null,
    isOnline: isAqdEligible(driver),
    availabilityStatus: driver.driver?.availabilityStatus || 'off',
    lastHeartbeatAt: driver.driver?.lastHeartbeatAt || null,
    lastSeenAt: driver.driver?.lastSeenAt || null,
    checkr: driver.driver?.checkr
      ? {
        status: driver.driver.checkr.status,
        result: driver.driver.checkr.result,
        assessment: driver.driver.checkr.assessment,
        lastEvent: driver.driver.checkr.lastEvent,
        lastEventAt: driver.driver.checkr.lastEventAt,
        dashboardUrl: driver.driver.checkr.dashboardUrl,
      }
      : null,
  },
});

const getAllDrivers = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    // Soft-deleted drivers (active: false) are hidden from the management list.
    const filter = { role: 'driver', active: { $ne: false } };
    const allowedStatuses = ['draft', 'submitted', 'background_pending', 'background_completed', 'approved', 'rejected', 'needs_revision', 'revision_complete'];
    if (status && allowedStatuses.includes(status)) {
      filter['driver.status'] = status;
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [drivers, total, approvedCount, rejectedCount, pendingCount] = await Promise.all([
      User.find(filter)
        .select('-password +driver.ssn')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      User.countDocuments(filter),
      User.countDocuments({ role: 'driver', 'driver.status': 'approved' }),
      User.countDocuments({ role: 'driver', 'driver.status': 'rejected' }),
      User.countDocuments({ role: 'driver', 'driver.status': { $in: ['submitted', 'background_pending', 'background_completed', 'needs_revision', 'revision_complete'] } }),
    ]);

    return sendSuccess(res, 200, 'Drivers retrieved successfully', drivers.map(formatDriverForAdmin), {
      stats: {
        total: approvedCount + rejectedCount + pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        pending: pendingCount,
      },
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Get All Drivers Error:', error);
    return sendError(res, 500, error.message || 'Failed to retrieve drivers');
  }
};

const approveDriver = async (req, res) => {
  try {
    const { driverId } = req.body;
    if (!driverId) return sendValidationError(res, 'driverId is required');

    const driver = await User.findOne({ _id: driverId, role: 'driver' });
    if (!driver) return sendNotFound(res, 'Driver not found');

    if (driver.driver.status === 'approved') {
      return sendValidationError(res, 'Driver is already active');
    }

    driver.driver.status = 'approved';
    await driver.save();

    return sendSuccess(res, 200, 'Driver approved successfully', formatDriverForAdmin(driver));
  } catch (error) {
    console.error('Approve Driver Error:', error);
    return sendError(res, 500, error.message || 'Failed to approve driver');
  }
};

const requestRevision = async (req, res) => {
  try {
    const { driverId, notes } = req.body;
    if (!driverId) return sendValidationError(res, 'driverId is required');
    if (!notes || !String(notes).trim()) return sendValidationError(res, 'notes are required');

    const driver = await User.findOne({ _id: driverId, role: 'driver' });
    if (!driver) return sendNotFound(res, 'Driver not found');

    driver.driver.status = 'needs_revision';
    driver.driver.revisionNotes = String(notes).trim();
    await driver.save();

    return sendSuccess(res, 200, 'Driver sent for revision', formatDriverForAdmin(driver));
  } catch (error) {
    console.error('Request Revision Error:', error);
    return sendError(res, 500, error.message || 'Failed to request revision');
  }
};

const uploadAleetLicense = async (req, res) => {
  try {
    const { id } = req.params;

    const driver = await User.findOne({ _id: id, role: 'driver' });
    if (!driver) return sendNotFound(res, 'Driver not found');

    if (driver.driver.hasForHireLicense) {
      return sendValidationError(res, 'Driver already has a for-hire license');
    }

    if (!req.file) {
      return sendValidationError(res, 'forHireLicenseImage file is required');
    }

    driver.driver.forHireLicenseImage = fileUrl(req.file.filename);
    driver.driver.hasForHireLicense = true;
    driver.driver.tier = resolveDriverTier({
      hasOwnVehicle: driver.driver.hasOwnVehicle,
      hasForHireLicense: true,
    });

    await driver.save();

    return sendSuccess(res, 200, 'Aleet license uploaded and tier recalculated', formatDriverForAdmin(driver));
  } catch (error) {
    console.error('Upload Aleet License Error:', error);
    return sendError(res, 500, error.message || 'Failed to upload license');
  }
};

// ── Admin: update a driver's service regions ──────────────────────────────
const mongooseLib = require('mongoose');
const updateDriverRegions = async (req, res) => {
  try {
    const { id } = req.params;
    const { regions, serveAllRegions } = req.body;
    if (!Array.isArray(regions)) {
      return sendValidationError(res, '`regions` must be an array of region IDs');
    }
    const cleanIds = regions.filter((r) => mongooseLib.Types.ObjectId.isValid(r));
    const allFlag = serveAllRegions === undefined ? cleanIds.length === 0 : !!serveAllRegions;

    const driver = await User.findOne({ _id: id, role: 'driver' });
    if (!driver) return sendNotFound(res, 'Driver not found');

    driver.driver = driver.driver || {};
    driver.driver.regions = cleanIds;
    driver.driver.serveAllRegions = allFlag;
    await driver.save();

    return sendSuccess(res, 200, 'Driver regions updated', formatDriverForAdmin(driver));
  } catch (error) {
    console.error('Update Driver Regions Error:', error);
    return sendError(res, 500, error.message || 'Failed to update regions');
  }
};

/**
 * GET /api/admin/drivers/licensing
 * Returns drivers list with licensing & background fields for the admin Licensing page.
 * Stats: verified (backgroundCheck=true), pending, total.
 */
const getDriverLicensing = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const filter = { role: 'driver' };
    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [
        { name: re },
        { email: re },
        { phone: re },
        { 'driver.licenseNumber': re }
      ];
    }

    const [drivers, total, verifiedCount, pendingCount] = await Promise.all([
      User.find(filter)
        .select('name email phone createdAt driver.tier driver.status driver.backgroundCheck driver.licenseNumber driver.licenseExpiry driver.checkr driver.hasForHireLicense')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      User.countDocuments(filter),
      User.countDocuments({ role: 'driver', 'driver.backgroundCheck': true }),
      User.countDocuments({ role: 'driver', 'driver.backgroundCheck': false }),
    ]);

    const formatted = drivers.map(d => ({
      _id: d._id,
      name: d.name,
      email: d.email,
      phone: d.phone,
      registeredAt: d.createdAt,
      license: {
        number: d.driver?.licenseNumber || null,
        expiry: d.driver?.licenseExpiry || null,
        status: d.driver?.status === 'approved' ? 'Approved' : 'Pending',
        hasForHireLicense: d.driver?.hasForHireLicense || false
      },
      background: {
        verified: d.driver?.backgroundCheck || false,
        status: d.driver?.backgroundCheck ? 'Verified' : 'Pending',
        checkrStatus: d.driver?.checkr?.status || null
      },
      tier: d.driver?.tier || null
    }));

    return sendSuccess(res, 200, 'Driver licensing data retrieved', formatted, {
      stats: {
        verified: verifiedCount,
        pending: pendingCount,
        total
      },
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('Get Driver Licensing Error:', error);
    return sendError(res, 500, error.message || 'Failed to retrieve licensing data');
  }
};

/**
 * DELETE /api/admin/drivers/:id
 * Soft-delete a driver (active: false). Removed from management lists; login blocked.
 */
const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return sendValidationError(res, 'Driver ID is required');

    const driver = await User.findOne({ _id: id, role: 'driver', active: { $ne: false } });
    if (!driver) return sendNotFound(res, 'Driver not found');

    driver.active = false;
    if (driver.driver) {
      driver.driver.isOnline = false;
    }
    await driver.save();

    return sendSuccess(res, 200, 'Driver removed', { deletedId: id });
  } catch (error) {
    console.error('deleteDriver Error:', error);
    return sendError(res, 500, error.message || 'Failed to delete driver');
  }
};

module.exports = {
  formatDriverForAdmin,
  toggleDriverStatus,
  getAllDrivers,
  approveDriver,
  requestRevision,
  uploadAleetLicense,
  updateDriverRegions,
  getDriverLicensing,
  deleteDriver,
};
