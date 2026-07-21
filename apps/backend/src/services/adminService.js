const bcrypt = require('bcryptjs');
const User = require('../models/User');

const VALID_PERMISSIONS = ['super-admin', 'manage-users', 'view-reports', 'manage-bookings'];

class AdminServiceError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.name = 'AdminServiceError';
        this.statusCode = statusCode;
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const validatePermissions = (permissions) => {
    if (!Array.isArray(permissions) || permissions.length === 0) {
        throw new AdminServiceError('At least one permission is required', 400);
    }
    const invalid = permissions.filter((p) => !VALID_PERMISSIONS.includes(p));
    if (invalid.length > 0) {
        throw new AdminServiceError(
            `Invalid permissions: ${invalid.join(', ')}. Valid: ${VALID_PERMISSIONS.join(', ')}`,
            400
        );
    }
};

const formatAdmin = (admin) => ({
    id: admin._id,
    name: admin.name,
    email: admin.email,
    phone: admin.phone,
    active: admin.active,
    permissions: admin.admin?.permissions ?? [],
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
});

// ── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/admins
 * Returns all admins (paginated).
 */
const getAllAdmins = async ({ page = 1, limit = 20 } = {}) => {
    const skip = (page - 1) * limit;

    // Only list active admins — deleted/inactive ones must not appear or block re-create.
    const filter = { role: 'admin', active: true };

    const [admins, total] = await Promise.all([
        User.find(filter)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        User.countDocuments(filter),
    ]);

    return {
        admins: admins.map(formatAdmin),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};

/**
 * GET /api/admin/admins/:id
 * Returns a single admin by ID.
 */
const getAdminById = async (id) => {
    const admin = await User.findOne({ _id: id, role: 'admin' }).select('-password');
    if (!admin) throw new AdminServiceError('Admin not found', 404);
    return formatAdmin(admin);
};

/**
 * POST /api/admin/admins
 * Creates a new admin user.
 */
const createAdmin = async ({ name, email, phone, password, permissions }) => {
    if (!name || !email || !phone || !password) {
        throw new AdminServiceError('name, email, phone and password are required', 400);
    }

    validatePermissions(permissions);

    // Only active admins block re-create. Soft-deleted (inactive) admins can be reactivated.
    const activeConflict = await User.findOne({
        role: 'admin',
        active: true,
        $or: [{ email }, { phone }],
    });
    if (activeConflict) {
        const field = activeConflict.email === email ? 'email' : 'phone';
        throw new AdminServiceError(`User with this ${field} already exists`, 409);
    }

    const inactiveAdmin = await User.findOne({
        role: 'admin',
        active: false,
        $or: [{ email }, { phone }],
    });
    if (inactiveAdmin) {
        inactiveAdmin.name = name;
        inactiveAdmin.email = email;
        inactiveAdmin.phone = phone;
        inactiveAdmin.password = password;
        inactiveAdmin.active = true;
        inactiveAdmin.admin = { permissions };
        await inactiveAdmin.save();
        return formatAdmin(inactiveAdmin);
    }

    const admin = await User.create({
        name,
        email,
        phone,
        password,
        role: 'admin',
        active: true,
        admin: { permissions },
    });

    return formatAdmin(admin);
};

/**
 * PUT /api/admin/admins/:id
 * Updates name, email, phone, permissions and/or active status.
 */
const updateAdmin = async (id, { name, email, phone, permissions, active, password }) => {
    const admin = await User.findOne({ _id: id, role: 'admin' });
    if (!admin) throw new AdminServiceError('Admin not found', 404);

    if (permissions !== undefined) validatePermissions(permissions);

    // Only conflict with other *active* admins (exclude self)
    if (email && email !== admin.email) {
        const conflict = await User.findOne({
            role: 'admin',
            active: true,
            email,
            _id: { $ne: id },
        });
        if (conflict) throw new AdminServiceError('Email is already taken', 409);
        admin.email = email;
    }

    if (phone && phone !== admin.phone) {
        const conflict = await User.findOne({
            role: 'admin',
            active: true,
            phone,
            _id: { $ne: id },
        });
        if (conflict) throw new AdminServiceError('Phone is already taken', 409);
        admin.phone = phone;
    }

    if (name !== undefined) admin.name = name;
    if (permissions !== undefined) admin.admin.permissions = permissions;
    if (typeof active === 'boolean') admin.active = active;
    if (password) admin.password = password; // pre-save hook will hash it

    await admin.save();
    return formatAdmin(admin);
};

/**
 * DELETE /api/admin/admins/:id
 * Soft-deletes an admin (active: false) so the same email/phone can be re-added later.
 * Cannot delete yourself.
 */
const deleteAdmin = async (id, requesterId) => {
    if (id === requesterId) {
        throw new AdminServiceError('You cannot delete your own account', 400);
    }

    const admin = await User.findOneAndUpdate(
        { _id: id, role: 'admin', active: true },
        { $set: { active: false } },
        { new: true },
    );
    if (!admin) throw new AdminServiceError('Admin not found', 404);

    return { deletedId: id };
};

module.exports = {
    getAllAdmins,
    getAdminById,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    VALID_PERMISSIONS,
    AdminServiceError,
};
