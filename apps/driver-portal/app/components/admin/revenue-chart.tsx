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

type RevenuePoint = {
    month: string;
    revenue: number;
};

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
    return (
        <div className="rounded-2xl border border-border bg-card-bg p-5 sm:p-6">
            <h2 className="mb-6 text-base font-semibold text-text">Revenue Overview</h2>
            {data.length === 0 ? (
                <div className="flex h-[260px] items-center justify-center rounded-xl border border-border bg-page-bg/40 text-sm text-muted">
                    No revenue data yet.
                </div>
            ) : (
            <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#c9a84c" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#c9a84c" stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1e2b2a" strokeDasharray="4 4" vertical={false} />
                    <XAxis
                        dataKey="month"
                        tick={{ fill: "#4a5c4b", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fill: "#4a5c4b", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v / 1000}k`}
                    />
                    <Tooltip
                        contentStyle={{
                            background: "#0b110c",
                            border: "1px solid #1e2b2a",
                            borderRadius: "10px",
                            color: "#d4c9a8",
                            fontSize: 13,
                        }}
                        formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
                        cursor={{ stroke: "#c9a84c", strokeWidth: 1, strokeDasharray: "4 4" }}
                    />
                    <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#c9a84c"
                        strokeWidth={2}
                        fill="url(#revenueGrad)"
                        dot={{ fill: "#c9a84c", r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: "#c9a84c", strokeWidth: 0 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
            )}
        </div>
    );
}
