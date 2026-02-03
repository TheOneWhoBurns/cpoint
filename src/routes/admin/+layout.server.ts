import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { operators, adminSessions } from '$lib/server/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, url, locals }) => {
	const loginPath = `${locals.adminBase}/login`;

	if (url.pathname === loginPath) {
		return { adminBase: locals.adminBase };
	}

	const token = cookies.get('adminSession');
	if (!token) {
		redirect(302, loginPath);
	}

	const [session] = await db
		.select({ operatorId: adminSessions.operatorId })
		.from(adminSessions)
		.where(and(eq(adminSessions.token, token), gt(adminSessions.expiresAt, new Date())));

	if (!session) {
		cookies.delete('adminSession', { path: '/' });
		redirect(302, loginPath);
	}

	const [admin] = await db
		.select({ id: operators.id, name: operators.name })
		.from(operators)
		.where(and(eq(operators.id, session.operatorId), eq(operators.isActive, true), eq(operators.isAdmin, true)));

	if (!admin) {
		await db.delete(adminSessions).where(eq(adminSessions.token, token));
		cookies.delete('adminSession', { path: '/' });
		redirect(302, loginPath);
	}

	return { admin, adminBase: locals.adminBase };
};
