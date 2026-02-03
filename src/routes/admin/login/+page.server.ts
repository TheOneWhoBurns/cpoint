import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { operators, adminSessions } from '$lib/server/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('adminSession');
	if (token) {
		const [session] = await db
			.select({ operatorId: adminSessions.operatorId })
			.from(adminSessions)
			.where(and(eq(adminSessions.token, token), gt(adminSessions.expiresAt, new Date())));

		if (session) {
			const [admin] = await db
				.select({ id: operators.id })
				.from(operators)
				.where(and(eq(operators.id, session.operatorId), eq(operators.isActive, true), eq(operators.isAdmin, true)));
			if (admin) {
				redirect(302, '/admin');
			}
		}
		cookies.delete('adminSession', { path: '/' });
	}

	const adminOperators = await db
		.select({ id: operators.id, name: operators.name })
		.from(operators)
		.where(and(eq(operators.isActive, true), eq(operators.isAdmin, true)));

	return { adminOperators };
};
