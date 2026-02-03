import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { shifts, operators } from '$lib/server/db/schema';
import { eq, gte, lte, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ url }) => {
	const now = new Date();
	const firstOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

	const fromParam = url.searchParams.get('from');
	const toParam = url.searchParams.get('to');

	const dateFrom = fromParam ? new Date(fromParam + 'T00:00:00Z') : firstOfMonth;
	const dateTo = toParam ? new Date(toParam + 'T23:59:59.999Z') : now;

	const rows = await db
		.select({
			id: shifts.id,
			operatorId: shifts.operatorId,
			operatorName: operators.name,
			startedAt: shifts.startedAt,
			endedAt: shifts.endedAt,
		})
		.from(shifts)
		.innerJoin(operators, eq(shifts.operatorId, operators.id))
		.where(and(gte(shifts.startedAt, dateFrom), lte(shifts.startedAt, dateTo)));

	const nowMs = now.getTime();

	const shiftDetails = rows
		.map((r) => {
			const start = new Date(r.startedAt).getTime();
			const end = r.endedAt ? new Date(r.endedAt).getTime() : nowMs;
			const durationHours = (end - start) / 3600000;
			return {
				id: r.id,
				operatorName: r.operatorName,
				startedAt: r.startedAt.toISOString(),
				endedAt: r.endedAt?.toISOString() ?? null,
				durationHours: Math.round(durationHours * 100) / 100,
				isActive: !r.endedAt,
			};
		})
		.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

	const grouped = new Map<number, { operatorName: string; totalShifts: number; totalHours: number; activeShifts: number }>();
	for (const r of rows) {
		const start = new Date(r.startedAt).getTime();
		const end = r.endedAt ? new Date(r.endedAt).getTime() : nowMs;
		const hours = (end - start) / 3600000;
		const existing = grouped.get(r.operatorId!);
		if (existing) {
			existing.totalShifts++;
			existing.totalHours += hours;
			if (!r.endedAt) existing.activeShifts++;
		} else {
			grouped.set(r.operatorId!, {
				operatorName: r.operatorName,
				totalShifts: 1,
				totalHours: hours,
				activeShifts: r.endedAt ? 0 : 1,
			});
		}
	}

	const summary = Array.from(grouped.entries()).map(([operatorId, data]) => ({
		operatorId,
		operatorName: data.operatorName,
		totalShifts: data.totalShifts,
		totalHours: Math.round(data.totalHours * 100) / 100,
		activeShifts: data.activeShifts,
	}));

	const dateFromStr = fromParam || firstOfMonth.toISOString().split('T')[0];
	const dateToStr = toParam || now.toISOString().split('T')[0];

	return { summary, shifts: shiftDetails, dateFrom: dateFromStr, dateTo: dateToStr };
};
