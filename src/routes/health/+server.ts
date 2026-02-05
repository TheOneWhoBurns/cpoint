import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	let dbStatus = 'ok';
	try {
		await db.execute(sql`SELECT 1`);
	} catch {
		dbStatus = 'error';
	}

	const status = dbStatus === 'ok' ? 'ok' : 'degraded';
	const statusCode = status === 'ok' ? 200 : 503;

	return json({
		status,
		timestamp: new Date().toISOString(),
		db: dbStatus,
		uptime: Math.round(process.uptime())
	}, { status: statusCode });
};
