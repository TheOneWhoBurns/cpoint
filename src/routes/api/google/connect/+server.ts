import { redirect } from '@sveltejs/kit';
import crypto from 'node:crypto';
import { getAuthUrl, getGoogleCredentials } from '$lib/server/google-sheets';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	const creds = await getGoogleCredentials();
	if (!creds) {
		redirect(302, '/admin/settings?error=not_configured');
	}

	const state = crypto.randomBytes(32).toString('hex');
	cookies.set('google_oauth_state', state, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 600
	});

	const url = await getAuthUrl(state);
	redirect(302, url);
};
