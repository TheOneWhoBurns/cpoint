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
	'/api/google/share-email',
	'/api/google/credentials'
];

function isAdminApiRoute(pathname: string): boolean {
	if (pathname.startsWith('/api/guides/verify')) {
		return false;
	}
	return ADMIN_API_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

function isAdminSubdomain(hostname: string): boolean {
	return hostname.startsWith('admin.');
}

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const onAdminSubdomain = isAdminSubdomain(event.url.hostname);
	event.locals.adminBase = onAdminSubdomain ? '' : '/admin';

	// On admin subdomain, redirect /admin/* paths to strip the prefix
	// so users see clean URLs (e.g. /admin/operators → /operators)
	if (onAdminSubdomain && pathname.startsWith('/admin')) {
		const newPath = pathname.slice('/admin'.length) || '/';
		const search = event.url.search;
		return new Response(null, {
			status: 302,
			headers: { Location: newPath + search }
		});
	}

	if (isAdminApiRoute(pathname)) {
		// Bootstrap mode: allow creating the first admin operator when none exist
		if (pathname === '/api/operators' && event.request.method === 'POST') {
			const adminCount = await db
				.select({ id: operators.id })
				.from(operators)
				.where(and(eq(operators.isAdmin, true), eq(operators.isActive, true)));
			if (adminCount.length === 0) {
				return resolve(event);
			}
		}

		const token = event.cookies.get('adminSession');
		if (!token) {
			return new Response(JSON.stringify({ error: 'Admin authentication required' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Single JOIN query: validate session + check admin status in one round-trip
		const [validAdmin] = await db
			.select({ operatorId: adminSessions.operatorId })
			.from(adminSessions)
			.innerJoin(operators, and(
				eq(operators.id, adminSessions.operatorId),
				eq(operators.isActive, true),
				eq(operators.isAdmin, true)
			))
			.where(and(eq(adminSessions.token, token), gt(adminSessions.expiresAt, new Date())));

		if (!validAdmin) {
			await db.delete(adminSessions).where(eq(adminSessions.token, token));
			event.cookies.delete('adminSession', { path: '/' });
			return new Response(JSON.stringify({ error: 'Admin authentication required' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}
	}

	return resolve(event);
};
