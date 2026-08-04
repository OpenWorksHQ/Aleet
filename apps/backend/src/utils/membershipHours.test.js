const test = require('node:test');
const assert = require('node:assert/strict');

const {
  yearMonthKey,
  quarterYearMonths,
  getMonthlyUsedHours,
  getQuarterlyUsedHours,
  computeFreeHoursLeft,
  getMembershipHourBalance,
} = require('./membershipHours');

// The module reads local calendar fields (getFullYear/getMonth), so tests build
// dates with the local-time constructor to stay timezone-independent.
const localDate = (y, m, d = 15) => new Date(y, m - 1, d, 12, 0, 0);

// ---------------------------------------------------------------------------
// A stand-in for the MonthlyHours mongoose model. The module takes the model as
// a parameter, so no database is needed — just something with .findOne/.find.
// ---------------------------------------------------------------------------
function fakeMonthlyHours(rows = []) {
  const calls = { findOne: [], find: [] };
  return {
    calls,
    findOne(query) {
      calls.findOne.push(query);
      const hit = rows.find(
        (r) => String(r.user) === String(query.user) && r.yearMonth === query.yearMonth,
      );
      return { lean: async () => hit || null };
    },
    async find(query) {
      calls.find.push(query);
      const months = query.yearMonth?.$in || [];
      return rows.filter(
        (r) => String(r.user) === String(query.user) && months.includes(r.yearMonth),
      );
    },
  };
}

// ---------------------------------------------------------------------------
// yearMonthKey
// ---------------------------------------------------------------------------

test('yearMonthKey formats as YYYY-MM with a zero-padded month', () => {
  assert.equal(yearMonthKey(localDate(2025, 1)), '2025-01');
  assert.equal(yearMonthKey(localDate(2025, 9)), '2025-09');
  assert.equal(yearMonthKey(localDate(2025, 10)), '2025-10');
  assert.equal(yearMonthKey(localDate(2025, 12)), '2025-12');
});

test('yearMonthKey accepts a date-like string and defaults to now', () => {
  const now = new Date();
  const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  assert.equal(yearMonthKey(), expected);
  assert.equal(yearMonthKey(localDate(2024, 2, 29).toISOString()), yearMonthKey(localDate(2024, 2, 29)));
});

// ---------------------------------------------------------------------------
// quarterYearMonths
// ---------------------------------------------------------------------------

test('quarterYearMonths returns the reference month plus the two before it', () => {
  assert.deepEqual(quarterYearMonths(localDate(2025, 3)), ['2025-03', '2025-02', '2025-01']);
  assert.deepEqual(quarterYearMonths(localDate(2025, 7)), ['2025-07', '2025-06', '2025-05']);
});

test('quarterYearMonths rolls back across a year boundary', () => {
  assert.deepEqual(quarterYearMonths(localDate(2025, 1)), ['2025-01', '2024-12', '2024-11']);
  assert.deepEqual(quarterYearMonths(localDate(2025, 2)), ['2025-02', '2025-01', '2024-12']);
});

test('quarterYearMonths starts with the same key yearMonthKey would produce', () => {
  const ref = localDate(2025, 8);
  assert.equal(quarterYearMonths(ref)[0], yearMonthKey(ref));
});

test('quarterYearMonths is unaffected by a day-of-month past the shorter months', () => {
  // Day 31 in the reference date must not overflow when stepping back to a
  // 30-day month — the helper normalises to day 1.
  assert.deepEqual(quarterYearMonths(localDate(2025, 3, 31)), ['2025-03', '2025-02', '2025-01']);
  assert.deepEqual(quarterYearMonths(localDate(2025, 5, 31)), ['2025-05', '2025-04', '2025-03']);
});

// ---------------------------------------------------------------------------
// computeFreeHoursLeft
// ---------------------------------------------------------------------------

test('computeFreeHoursLeft defaults to the full 5-hour monthly allotment', () => {
  assert.equal(computeFreeHoursLeft(), 5);
  assert.equal(computeFreeHoursLeft({}), 5);
});

test('computeFreeHoursLeft subtracts monthly usage', () => {
  assert.equal(computeFreeHoursLeft({ monthlyUsed: 2 }), 3);
  assert.equal(computeFreeHoursLeft({ monthlyUsed: 5 }), 0);
});

test('the quarterly ceiling wins when it is lower than the monthly remainder', () => {
  // 13 of 15 quarterly hours burned → only 2 left even though the month is fresh.
  assert.equal(computeFreeHoursLeft({ monthlyUsed: 0, quarterlyUsed: 13 }), 2);
  assert.equal(computeFreeHoursLeft({ monthlyUsed: 0, quarterlyUsed: 15 }), 0);
});

test('the monthly cap wins when it is lower — next month cannot be spent early', () => {
  assert.equal(computeFreeHoursLeft({ monthlyUsed: 4, quarterlyUsed: 4 }), 1);
});

test('computeFreeHoursLeft never returns a negative number', () => {
  assert.equal(computeFreeHoursLeft({ monthlyUsed: 99 }), 0);
  assert.equal(computeFreeHoursLeft({ quarterlyUsed: 99 }), 0);
  assert.equal(computeFreeHoursLeft({ monthlyUsed: 99, quarterlyUsed: 99 }), 0);
});

test('computeFreeHoursLeft treats null/undefined usage as zero', () => {
  assert.equal(computeFreeHoursLeft({ monthlyUsed: null, quarterlyUsed: undefined }), 5);
});

test('computeFreeHoursLeft honours custom allotments', () => {
  assert.equal(computeFreeHoursLeft({ monthlyIncluded: 10, quarterlyIncluded: 30 }), 10);
  assert.equal(
    computeFreeHoursLeft({ monthlyUsed: 1, quarterlyUsed: 28, monthlyIncluded: 10, quarterlyIncluded: 30 }),
    2,
  );
});

test('computeFreeHoursLeft handles fractional hours', () => {
  assert.equal(computeFreeHoursLeft({ monthlyUsed: 2.75 }), 2.25);
});

// ---------------------------------------------------------------------------
// getMonthlyUsedHours / getQuarterlyUsedHours
// ---------------------------------------------------------------------------

test('getMonthlyUsedHours queries the reference month and returns its total', async () => {
  const model = fakeMonthlyHours([{ user: 'u1', yearMonth: '2025-03', totalHoursUsed: 3.5 }]);
  assert.equal(await getMonthlyUsedHours(model, 'u1', localDate(2025, 3)), 3.5);
  assert.deepEqual(model.calls.findOne[0], { user: 'u1', yearMonth: '2025-03' });
});

test('getMonthlyUsedHours returns 0 when no record exists for that month', async () => {
  const model = fakeMonthlyHours([{ user: 'u1', yearMonth: '2025-02', totalHoursUsed: 3.5 }]);
  assert.equal(await getMonthlyUsedHours(model, 'u1', localDate(2025, 3)), 0);
});

test('getMonthlyUsedHours coerces a missing or null total to 0', async () => {
  const model = fakeMonthlyHours([{ user: 'u1', yearMonth: '2025-03', totalHoursUsed: null }]);
  assert.equal(await getMonthlyUsedHours(model, 'u1', localDate(2025, 3)), 0);
});

test('getQuarterlyUsedHours sums every month in the quarter window', async () => {
  const model = fakeMonthlyHours([
    { user: 'u1', yearMonth: '2025-03', totalHoursUsed: 2 },
    { user: 'u1', yearMonth: '2025-02', totalHoursUsed: 3 },
    { user: 'u1', yearMonth: '2025-01', totalHoursUsed: 1.5 },
    { user: 'u1', yearMonth: '2024-12', totalHoursUsed: 100 }, // outside the window
  ]);
  assert.equal(await getQuarterlyUsedHours(model, 'u1', localDate(2025, 3)), 6.5);
  assert.deepEqual(model.calls.find[0].yearMonth.$in, ['2025-03', '2025-02', '2025-01']);
});

test('getQuarterlyUsedHours returns 0 when the member has no records', async () => {
  assert.equal(await getQuarterlyUsedHours(fakeMonthlyHours([]), 'u1', localDate(2025, 3)), 0);
});

test('getQuarterlyUsedHours ignores another users rows', async () => {
  const model = fakeMonthlyHours([
    { user: 'u2', yearMonth: '2025-03', totalHoursUsed: 9 },
    { user: 'u1', yearMonth: '2025-03', totalHoursUsed: 1 },
  ]);
  assert.equal(await getQuarterlyUsedHours(model, 'u1', localDate(2025, 3)), 1);
});

// ---------------------------------------------------------------------------
// getMembershipHourBalance
// ---------------------------------------------------------------------------

test('getMembershipHourBalance defaults to 5/month and 15/quarter', async () => {
  const model = fakeMonthlyHours([]);
  const balance = await getMembershipHourBalance(model, 'u1', null, localDate(2025, 3));
  assert.deepEqual(balance, {
    monthlyIncluded: 5,
    quarterlyIncluded: 15,
    monthlyUsed: 0,
    quarterlyUsed: 0,
    monthlyRemaining: 5,
    quarterlyRemaining: 15,
    freeHoursLeft: 5,
  });
});

test('getMembershipHourBalance derives the quarter from the settings monthly value', async () => {
  const model = fakeMonthlyHours([]);
  const balance = await getMembershipHourBalance(model, 'u1', { membershipMonthlyHours: 8 }, localDate(2025, 3));
  assert.equal(balance.monthlyIncluded, 8);
  assert.equal(balance.quarterlyIncluded, 24);
  assert.equal(balance.freeHoursLeft, 8);
});

test('getMembershipHourBalance reflects real usage across the quarter', async () => {
  const model = fakeMonthlyHours([
    { user: 'u1', yearMonth: '2025-03', totalHoursUsed: 2 },
    { user: 'u1', yearMonth: '2025-02', totalHoursUsed: 5 },
    { user: 'u1', yearMonth: '2025-01', totalHoursUsed: 5 },
  ]);
  const balance = await getMembershipHourBalance(model, 'u1', null, localDate(2025, 3));
  assert.equal(balance.monthlyUsed, 2);
  assert.equal(balance.quarterlyUsed, 12);
  assert.equal(balance.monthlyRemaining, 3);
  assert.equal(balance.quarterlyRemaining, 3);
  // Monthly remainder (3) and quarterly remainder (3) tie.
  assert.equal(balance.freeHoursLeft, 3);
});

test('getMembershipHourBalance clamps the quarterly ceiling below the monthly one', async () => {
  const model = fakeMonthlyHours([
    { user: 'u1', yearMonth: '2025-03', totalHoursUsed: 0 },
    { user: 'u1', yearMonth: '2025-02', totalHoursUsed: 7 },
    { user: 'u1', yearMonth: '2025-01', totalHoursUsed: 7 },
  ]);
  const balance = await getMembershipHourBalance(model, 'u1', null, localDate(2025, 3));
  assert.equal(balance.monthlyRemaining, 5);
  assert.equal(balance.quarterlyRemaining, 1);
  assert.equal(balance.freeHoursLeft, 1);
});

test('getMembershipHourBalance never reports negative remaining hours', async () => {
  const model = fakeMonthlyHours([
    { user: 'u1', yearMonth: '2025-03', totalHoursUsed: 20 },
  ]);
  const balance = await getMembershipHourBalance(model, 'u1', null, localDate(2025, 3));
  assert.equal(balance.monthlyRemaining, 0);
  assert.equal(balance.quarterlyRemaining, 0);
  assert.equal(balance.freeHoursLeft, 0);
});

test('getMembershipHourBalance rounds fractional hours to 4 decimal places', async () => {
  const model = fakeMonthlyHours([
    { user: 'u1', yearMonth: '2025-03', totalHoursUsed: 1 / 3 },
  ]);
  const balance = await getMembershipHourBalance(model, 'u1', null, localDate(2025, 3));
  assert.equal(balance.monthlyUsed, 0.3333);
  assert.equal(balance.monthlyRemaining, 4.6667);
  assert.equal(balance.freeHoursLeft, 4.6667);
});

test('getMembershipHourBalance falls back to 5 when settings carry a zero or junk value', async () => {
  const model = fakeMonthlyHours([]);
  for (const settings of [{ membershipMonthlyHours: 0 }, { membershipMonthlyHours: null }, { membershipMonthlyHours: 'abc' }]) {
    const balance = await getMembershipHourBalance(model, 'u1', settings, localDate(2025, 3));
    assert.equal(balance.monthlyIncluded, 5, `unexpected fallback for ${JSON.stringify(settings)}`);
  }
});
