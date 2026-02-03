import { handleCallback } from '$lib/server/google-sheets';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const code = url.searchParams.get('code');

	if (!code) {
		return new Response(null, {
			status: 302,
			headers: { Location: '/admin/settings?error=no_code' }
		});
	}

	try {
		await handleCallback(code);
		return new Response(null, {
			status: 302,
			headers: { Location: '/admin/settings?success=connected' }
		});
	} catch (e) {
		console.error('Google OAuth callback error:', e);
		return new Response(null, {
			status: 302,
			headers: { Location: '/admin/settings?error=auth_failed' }
		});
	}
};
