import { db } from '$lib/server/db';
import { shifts, operators, adminSessions } from '$lib/server/db/schema';
import { eq, gte, lte, and, gt } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import * as XLSX from 'xlsx';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const token = cookies.get('adminSession');
	if (!token) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	const [session] = await db
		.select({ operatorId: adminSessions.operatorId })
		.from(adminSessions)
		.where(and(eq(adminSessions.token, token), gt(adminSessions.expiresAt, new Date())));

	if (!session) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	const [admin] = await db
		.select({ id: operators.id })
		.from(operators)
		.where(and(eq(operators.id, session.operatorId), eq(operators.isActive, true), eq(operators.isAdmin, true)));

	if (!admin) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

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

	function fmtHours(h: number): string {
		const hrs = Math.floor(h);
		const mins = Math.round((h - hrs) * 60);
		return `${hrs}h ${mins}m`;
	}

	function fmtDateTime(d: Date): string {
		const year = d.getUTCFullYear();
		const month = String(d.getUTCMonth() + 1).padStart(2, '0');
		const day = String(d.getUTCDate()).padStart(2, '0');
		const hours = String(d.getUTCHours()).padStart(2, '0');
		const minutes = String(d.getUTCMinutes()).padStart(2, '0');
		return `${year}-${month}-${day} ${hours}:${minutes}`;
	}

	const summaryData = Array.from(grouped.entries()).map(([_, data]) => ({
		'Operator': data.operatorName,
		'Shifts': data.totalShifts,
		'Total Hours': fmtHours(data.totalHours),
		'Hours (decimal)': Math.round(data.totalHours * 100) / 100,
		'Active Shifts': data.activeShifts,
	}));

	const grandShifts = Array.from(grouped.values()).reduce((s, d) => s + d.totalShifts, 0);
	const grandHours = Array.from(grouped.values()).reduce((s, d) => s + d.totalHours, 0);
	const grandActive = Array.from(grouped.values()).reduce((s, d) => s + d.activeShifts, 0);

	summaryData.push({
		'Operator': 'TOTALS',
		'Shifts': grandShifts,
		'Total Hours': fmtHours(grandHours),
		'Hours (decimal)': Math.round(grandHours * 100) / 100,
		'Active Shifts': grandActive,
	});

	const detailData = rows
		.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
		.map((r) => {
			const start = new Date(r.startedAt).getTime();
			const end = r.endedAt ? new Date(r.endedAt).getTime() : nowMs;
			const hours = (end - start) / 3600000;
			return {
				'Operator': r.operatorName,
				'Date': fmtDateTime(r.startedAt).split(' ')[0],
				'Start': fmtDateTime(r.startedAt),
				'End': r.endedAt ? fmtDateTime(r.endedAt) : 'In Progress',
				'Duration': fmtHours(hours),
				'Hours (decimal)': Math.round(hours * 100) / 100,
				'Status': r.endedAt ? 'Completed' : 'In Progress',
			};
		});

	const wb = XLSX.utils.book_new();

	const wsSummary = XLSX.utils.json_to_sheet(summaryData);
	XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

	const wsDetails = XLSX.utils.json_to_sheet(detailData);
	XLSX.utils.book_append_sheet(wb, wsDetails, 'Details');

	const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

	const fromStr = dateFrom.toISOString().split('T')[0];
	const toStr = dateTo.toISOString().split('T')[0];
	const filename = `operator-hours-${fromStr}-to-${toStr}.xlsx`;

	return new Response(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${filename}"`,
		},
	});
};
