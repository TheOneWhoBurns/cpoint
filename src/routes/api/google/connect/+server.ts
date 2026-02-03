import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getAuthUrl } from '$lib/server/google-sheets';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
		redirect(302, '/admin/settings?error=not_configured');
	}

	const url = getAuthUrl();
	redirect(302, url);
};
