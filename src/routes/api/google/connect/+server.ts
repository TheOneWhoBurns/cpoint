import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import crypto from 'node:crypto';
import { getAuthUrl } from '$lib/server/google-sheets';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
		redirect(302, '/admin/settings?error=not_configured');
	}

	const state = crypto.randomBytes(32).toString('hex');
	cookies.set('google_oauth_state', state, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: 600
	});

	const url = getAuthUrl(state);
	redirect(302, url);
};
