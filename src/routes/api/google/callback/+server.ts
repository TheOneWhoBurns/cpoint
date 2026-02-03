import { redirect } from '@sveltejs/kit';
import { handleCallback } from '$lib/server/google-sheets';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const code = url.searchParams.get('code');

	if (!code) {
		redirect(302, '/admin/settings?error=no_code');
	}

	try {
		await handleCallback(code);
	} catch (e) {
		console.error('Google OAuth callback error:', e);
		redirect(302, '/admin/settings?error=auth_failed');
	}

	redirect(302, '/admin/settings?success=connected');
};
