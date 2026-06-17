"use client";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

const data = [
    { month: "Jan", earnings: 4200 },
    { month: "Feb", earnings: 3100 },
    { month: "Mar", earnings: 4800 },
    { month: "Apr", earnings: 4500 },
    { month: "May", earnings: 6100 },
    { month: "Jun", earnings: 5800 },
];

type Props = {
    data?: Array<{ month: string; earnings: number }>;
};

export function DriverEarningsChart({ data: chartData }: Props) {
    // If parent passed data (including empty array), trust it and do not fallback to mock.
    const dataToRender = chartData ?? data;
    const hasData = dataToRender.length > 0;
    return (
        <div className="rounded-2xl border border-border bg-card-bg p-5 sm:p-6">
            <div className="mb-1 flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gold">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                </svg>
                <h2 className="text-base font-semibold text-text">Earnings Overview</h2>
            </div>
            <p className="mb-5 text-xs text-muted">Your earnings over the last 6 months</p>
            {hasData ? (
                <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={dataToRender} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#c9a84c" stopOpacity={0.25} />
                                <stop offset="100%" stopColor="#c9a84c" stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--border-color, #1e2b2a)" strokeDasharray="4 4" vertical={false} />
                        <XAxis
                            dataKey="month"
                            tick={{ fill: "var(--muted, #4a5c4b)", fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fill: "var(--muted, #4a5c4b)", fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                background: "var(--card-bg, #0d1a19)",
                                border: "1px solid var(--border-color, #1e2b2a)",
                                borderRadius: "10px",
                                color: "var(--text, #e8e8e8)",
                                fontSize: "13px",
                            }}
                            formatter={(value) => [`$${Number(value).toLocaleString("en-US")}`, "Earnings"] as [string, string]}
                        />
                        <Area
                            type="monotone"
                            dataKey="earnings"
                            stroke="#c9a84c"
                            strokeWidth={2}
                            fill="url(#earningsGrad)"
                            dot={{ fill: "#c9a84c", r: 4, strokeWidth: 0 }}
                            activeDot={{ r: 5, fill: "#c9a84c" }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex h-[260px] items-center justify-center rounded-xl border border-border/60 bg-page-bg/35 text-sm text-muted">
                    No earnings data yet.
                </div>
            )}
        </div>
    );
}
