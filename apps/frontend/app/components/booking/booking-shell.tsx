"use client";

import { BookingWizard, BookingStepIndicator } from "./booking-wizard";

export function BookingShell() {
    return (
        <BookingWizard
            renderIndicator={(step, skipFirstStep) => (
                <div className="w-full border-b border-aleet-border bg-aleet-card/80 py-5 backdrop-blur-md">
                    <div className="mx-auto max-w-5xl px-4">
                        <BookingStepIndicator step={step} skipFirstStep={skipFirstStep} />
                    </div>
                </div>
            )}
        />
    );
}
