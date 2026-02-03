import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { operators } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	// Don't guard the login page itself
	if (url.pathname === '/admin/login') {
		return {};
	}

	const adminIdStr = cookies.get('adminId');
	if (!adminIdStr) {
		redirect(302, '/admin/login');
	}

	const adminId = parseInt(adminIdStr);
	if (isNaN(adminId)) {
		cookies.delete('adminId', { path: '/' });
		redirect(302, '/admin/login');
	}

	const [admin] = await db
		.select({ id: operators.id, name: operators.name })
		.from(operators)
		.where(and(eq(operators.id, adminId), eq(operators.isActive, true), eq(operators.isAdmin, true)));

	if (!admin) {
		cookies.delete('adminId', { path: '/' });
		redirect(302, '/admin/login');
	}

	return { admin };
};
