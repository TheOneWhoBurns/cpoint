import { db } from '$lib/server/db';
import { operators, adminSessions } from '$lib/server/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import type { Handle } from '@sveltejs/kit';

const ADMIN_API_PREFIXES = [
	'/api/operators',
	'/api/equipment',
	'/api/guides',
	'/api/rental-products',
	'/api/store-products',
	'/api/tour-agency',
	'/api/google/connect',
	'/api/google/disconnect',
	'/api/google/share-email'
];

function isAdminApiRoute(pathname: string): boolean {
	if (pathname.startsWith('/api/guides/verify')) {
		return false;
	}
	return ADMIN_API_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	if (isAdminApiRoute(pathname)) {
		const token = event.cookies.get('adminSession');
		if (!token) {
			return new Response(JSON.stringify({ error: 'Admin authentication required' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const [session] = await db
			.select({ operatorId: adminSessions.operatorId })
			.from(adminSessions)
			.where(and(eq(adminSessions.token, token), gt(adminSessions.expiresAt, new Date())));

		if (!session) {
			event.cookies.delete('adminSession', { path: '/' });
			return new Response(JSON.stringify({ error: 'Invalid admin session' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const [admin] = await db
			.select({ id: operators.id })
			.from(operators)
			.where(and(eq(operators.id, session.operatorId), eq(operators.isActive, true), eq(operators.isAdmin, true)));

		if (!admin) {
			await db.delete(adminSessions).where(eq(adminSessions.token, token));
			event.cookies.delete('adminSession', { path: '/' });
			return new Response(JSON.stringify({ error: 'Admin access denied' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' }
			});
		}
	}

	return resolve(event);
};
