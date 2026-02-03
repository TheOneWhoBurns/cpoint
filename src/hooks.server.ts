import { db } from '$lib/server/db';
import { operators } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { Handle } from '@sveltejs/kit';

// API routes that require admin authentication
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

// API routes that are explicitly NOT admin-protected
// (operator-facing or public)
const PUBLIC_API_PREFIXES = [
	'/api/shifts',
	'/api/rentals',
	'/api/store-sales',
	'/api/tour-bookings',
	'/api/guides/verify',
	'/api/google/callback',
	'/api/admin/login',
	'/api/admin/logout'
];

function isAdminApiRoute(pathname: string): boolean {
	// /api/guides/verify is operator-facing, not admin
	if (pathname.startsWith('/api/guides/verify')) {
		return false;
	}
	return ADMIN_API_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	// Protect admin API routes
	if (isAdminApiRoute(pathname)) {
		const adminIdStr = event.cookies.get('adminId');
		if (!adminIdStr) {
			return new Response(JSON.stringify({ error: 'Admin authentication required' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const adminId = parseInt(adminIdStr);
		if (isNaN(adminId)) {
			event.cookies.delete('adminId', { path: '/' });
			return new Response(JSON.stringify({ error: 'Invalid admin session' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const [admin] = await db
			.select({ id: operators.id })
			.from(operators)
			.where(and(eq(operators.id, adminId), eq(operators.isActive, true), eq(operators.isAdmin, true)));

		if (!admin) {
			event.cookies.delete('adminId', { path: '/' });
			return new Response(JSON.stringify({ error: 'Admin access denied' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' }
			});
		}
	}

	return resolve(event);
};
