const Partner = require('../models/Partner');
const Region = require('../models/Region');
const VehicleType = require('../models/Vehicle');
const TierSettings = require('../models/TierSettings');
const {
  applyPartnerSlugFields,
  repairPartnerSlugFields,
  syncPartnerSlugIndexes,
} = require('../services/partnerService');

const DEMO_PARTNERS = [
  {
    partnerCode: 'WELCOME',
    partnerName: 'Welcome Campaign',
    partnerType: 'marketer',
    bookingMode: 'standard',
    trackingSlug: 'welcome',
    commissionPct: 8,
  },
  {
    partnerCode: 'BUSINESS',
    partnerName: 'Business Travel',
    partnerType: 'affiliate',
    bookingMode: 'standard',
    trackingSlug: 'business',
    commissionPct: 10,
  },
  {
    partnerCode: 'LOUNGE',
    partnerName: 'Lounge Partners',
    partnerType: 'affiliate',
    bookingMode: 'standard',
    trackingSlug: 'lounge',
    commissionPct: 12,
  },
  {
    partnerCode: 'RSVP',
    partnerName: 'RSVP Events',
    partnerType: 'marketer',
    bookingMode: 'standard',
    trackingSlug: 'rsvp',
    commissionPct: 10,
  },
  {
    partnerCode: 'MGMGRAND',
    partnerName: 'MGM Grand',
    partnerType: 'venue',
    bookingMode: 'venue_access',
    venueSlug: 'mgm-grand',
    pickupLocation: {
      text: 'MGM Grand, 3799 S Las Vegas Blvd, Las Vegas, NV 89109',
      placeId: '',
    },
    pickupLocked: true,
    regionName: 'Las Vegas',
    vehicleName: 'Luxury Sedan',
    discountPct: 5,
    commissionPct: 12,
    pricingNote: '5% partner discount applied automatically',
  },
  {
    partnerCode: 'ARIA',
    partnerName: 'Aria Resort & Casino',
    partnerType: 'venue',
    bookingMode: 'venue_access',
    venueSlug: 'aria-resort',
    pickupLocation: {
      text: 'Aria Resort & Casino, 3730 S Las Vegas Blvd, Las Vegas, NV 89158',
      placeId: '',
    },
    pickupLocked: true,
    regionName: 'Las Vegas',
    vehicleName: 'SUV',
    discountPct: 5,
    commissionPct: 12,
  },
  {
    partnerCode: 'HYATTMID',
    partnerName: 'Grand Hyatt New York',
    partnerType: 'venue',
    bookingMode: 'venue_access',
    venueSlug: 'hyatt-midtown',
    pickupLocation: {
      text: 'Grand Hyatt New York, 109 E 42nd St, New York, NY 10017',
      placeId: '',
    },
    pickupLocked: false,
    regionName: 'New York',
    vehicleName: 'Luxury Sedan',
    commissionPct: 10,
  },
];

async function seedPartners() {
  console.log('🤝 Starting partner seeding...');

  await repairPartnerSlugFields();
  await syncPartnerSlugIndexes();

  const settings = await TierSettings.findOne();
  if (settings) {
    if (!settings.venueCommissionPct) settings.venueCommissionPct = 12;
    if (!settings.affiliateCommissionPct) settings.affiliateCommissionPct = 10;
    await settings.save();
  }

  let created = 0;
  for (const item of DEMO_PARTNERS) {
    const existing = await Partner.findOne({
      $or: [
        { partnerCode: item.partnerCode },
        ...(item.trackingSlug ? [{ trackingSlug: item.trackingSlug }] : []),
        ...(item.venueSlug ? [{ venueSlug: item.venueSlug }] : []),
      ],
    });
    if (existing) {
      console.log(`⚠️  Partner "${item.partnerName}" already exists. Skipping...`);
      continue;
    }

    let region = null;
    if (item.regionName) {
      region = await Region.findOne({ name: new RegExp(`^${item.regionName}$`, 'i') });
    }

    let defaultVehicleType = null;
    if (item.vehicleName) {
      defaultVehicleType = await VehicleType.findOne({ name: new RegExp(`^${item.vehicleName}$`, 'i') });
    }

    const payload = {
      partnerCode: item.partnerCode,
      partnerName: item.partnerName,
      partnerType: item.partnerType,
      bookingMode: item.bookingMode,
      pickupLocation: item.pickupLocation || null,
      pickupLocked: item.pickupLocked ?? item.partnerType === 'venue',
      discountPct: item.discountPct ?? 0,
      commissionPct: item.commissionPct ?? null,
      pricingNote: item.pricingNote || null,
      region: region?._id || null,
      defaultVehicleType: defaultVehicleType?._id || null,
      businessName: item.partnerName,
    };

    applyPartnerSlugFields(payload, {
      trackingSlug: item.trackingSlug,
      venueSlug: item.venueSlug,
    });

    await Partner.create(payload);

    created += 1;
    console.log(`✅ Created partner: ${item.partnerName} (${item.partnerCode})`);
  }

  console.log(created > 0
    ? `\n🎉 Successfully created ${created} partner(s)!`
    : 'ℹ️  No new partners were created.');
  return created;
}

module.exports = { seedPartners, repairPartnerSlugFields, syncPartnerSlugIndexes };
