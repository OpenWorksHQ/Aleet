"use client";

import { useState } from "react";
import { useTheme } from "@/app/components/theme-provider";

interface ToggleProps {
    checked: boolean;
    onChange: (v: boolean) => void;
}

function Toggle({ checked, onChange }: ToggleProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${checked ? "bg-gold" : "bg-border"
                }`}
        >
            <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${checked ? "translate-x-5" : "translate-x-0"
                    }`}
            />
        </button>
    );
}

interface SettingRowProps {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}

function ToggleRow({ label, description, checked, onChange }: SettingRowProps) {
    return (
        <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border last:border-0">
            <div>
                <p className="text-sm font-medium text-text">{label}</p>
                {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
            </div>
            <Toggle checked={checked} onChange={onChange} />
        </div>
    );
}

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-border bg-card-bg px-5 py-4">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-gold">{icon}</span>
                <h2 className="text-base font-bold text-text">{title}</h2>
            </div>
            {children}
        </div>
    );
}

export function SettingsForm() {
    const { theme, setTheme } = useTheme();

    // Notifications
    const [emailNotif, setEmailNotif] = useState(true);
    const [smsNotif, setSmsNotif] = useState(false);
    const [pushNotif, setPushNotif] = useState(true);
    const [driverAlerts, setDriverAlerts] = useState(true);
    // const [riderAlerts, setRiderAlerts] = useState(true);
    // const [payoutAlerts, setPayoutAlerts] = useState(false);

    // General (commented out — not shown in UI yet)
    // const [maintenanceMode, setMaintenanceMode] = useState(false);
    // const [registrationOpen, setRegistrationOpen] = useState(true);
    // const [autoApproveDrivers, setAutoApproveDrivers] = useState(false);
    // const [twoFactorAuth, setTwoFactorAuth] = useState(true);

    // Booking (commented out — not shown in UI yet)
    // const [scheduledRides, setScheduledRides] = useState(true);
    // const [surgeEnabled, setSurgeEnabled] = useState(true);
    // const [cancellationFees, setCancellationFees] = useState(true);
    // const [rideSharing, setRideSharing] = useState(false);

    // Payment (commented out — not shown in UI yet)
    // const [autoPayouts, setAutoPayouts] = useState(true);
    // const [stripeEnabled, setStripeEnabled] = useState(true);
    // const [cashPayments, setCashPayments] = useState(false);
    // const [walletEnabled, setWalletEnabled] = useState(true);

    function handleSave() {
        // TODO: persist to API
        alert("Settings saved!");
    }

    const BellIcon = (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
    );

    const AppearanceIcon = (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
    );

    return (
        <div className="flex flex-col gap-4">
            {/* Heading + Save */}
            <div className="rounded-2xl border border-border bg-card-bg px-5 py-4 flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-text sm:text-2xl">Settings</h1>
                    <p className="text-sm text-muted">Configure platform settings and preferences</p>
                </div>
                <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/20 shrink-0"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                    </svg>
                    Save Changes
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Appearance */}
                <SectionCard icon={AppearanceIcon} title="Appearance">
                    <div className="flex items-center justify-between gap-4 py-3.5">
                        <div>
                            <p className="text-sm font-medium text-text">Theme</p>
                            <p className="text-xs text-muted mt-0.5">Choose between dark and light mode</p>
                        </div>
                        <div className="flex items-center gap-1 rounded-xl border border-border bg-page-bg p-1">
                            <button
                                onClick={() => setTheme("dark")}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${theme === "dark"
                                        ? "bg-gold/10 border border-gold/40 text-gold"
                                        : "text-muted hover:text-text"
                                    }`}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                                </svg>
                                Dark
                            </button>
                            <button
                                onClick={() => setTheme("light")}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${theme === "light"
                                        ? "bg-gold/10 border border-gold/40 text-gold"
                                        : "text-muted hover:text-text"
                                    }`}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                    <circle cx="12" cy="12" r="5" />
                                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                                </svg>
                                Light
                            </button>
                        </div>
                    </div>
                </SectionCard>

                {/* Notifications */}
                <SectionCard icon={BellIcon} title="Notifications">
                    <ToggleRow label="Email Notifications" description="Send email alerts for key events" checked={emailNotif} onChange={setEmailNotif} />
                    <ToggleRow label="SMS Notifications" description="Send SMS alerts to admins" checked={smsNotif} onChange={setSmsNotif} />
                    <ToggleRow label="Push Notifications" description="Browser push notifications" checked={pushNotif} onChange={setPushNotif} />
                    <ToggleRow label="Driver Alerts" description="Notify on driver status changes" checked={driverAlerts} onChange={setDriverAlerts} />
                    {/* <ToggleRow label="Rider Alerts" description="Notify on rider account events" checked={riderAlerts} onChange={setRiderAlerts} /> */}
                    {/* <ToggleRow label="Payout Alerts" description="Notify when payouts are processed" checked={payoutAlerts} onChange={setPayoutAlerts} /> */}
                </SectionCard>

                {/* General (commented out — not shown in UI yet) */}
                {/* <SectionCard icon={GearIcon} title="General">
                    <ToggleRow label="Maintenance Mode" description="Disable app access for all users" checked={maintenanceMode} onChange={setMaintenanceMode} />
                    <ToggleRow label="Open Registration" description="Allow new riders to register" checked={registrationOpen} onChange={setRegistrationOpen} />
                    <ToggleRow label="Auto-Approve Drivers" description="Skip manual review for new drivers" checked={autoApproveDrivers} onChange={setAutoApproveDrivers} />
                    <ToggleRow label="Two-Factor Auth" description="Require 2FA for admin accounts" checked={twoFactorAuth} onChange={setTwoFactorAuth} />
                </SectionCard> */}

                {/* Booking (commented out — not shown in UI yet) */}
                {/* <SectionCard icon={CarIcon} title="Booking">
                    <ToggleRow label="Scheduled Rides" description="Allow riders to book in advance" checked={scheduledRides} onChange={setScheduledRides} />
                    <ToggleRow label="Surge Pricing" description="Enable dynamic fare multipliers" checked={surgeEnabled} onChange={setSurgeEnabled} />
                    <ToggleRow label="Cancellation Fees" description="Charge fees for late cancellations" checked={cancellationFees} onChange={setCancellationFees} />
                    <ToggleRow label="Ride Sharing" description="Allow multiple riders per trip" checked={rideSharing} onChange={setRideSharing} />
                </SectionCard> */}

                {/* Payment (commented out — not shown in UI yet) */}
                {/* <SectionCard icon={CardIcon} title="Payment">
                    <ToggleRow label="Auto Payouts" description="Automatically pay drivers weekly" checked={autoPayouts} onChange={setAutoPayouts} />
                    <ToggleRow label="Stripe Payments" description="Accept card payments via Stripe" checked={stripeEnabled} onChange={setStripeEnabled} />
                    <ToggleRow label="Cash Payments" description="Allow riders to pay with cash" checked={cashPayments} onChange={setCashPayments} />
                    <ToggleRow label="In-App Wallet" description="Enable wallet top-up and spending" checked={walletEnabled} onChange={setWalletEnabled} />
                </SectionCard> */}
            </div>
        </div>
    );
}
