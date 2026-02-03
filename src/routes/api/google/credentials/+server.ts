import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { appSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const payload = await request.json();
	const clientId = typeof payload.clientId === 'string' ? payload.clientId.trim() : '';
	const clientSecret = typeof payload.clientSecret === 'string' ? payload.clientSecret.trim() : '';
	const origin = typeof payload.origin === 'string' ? payload.origin.trim() : '';

	if (!clientId) {
		return json({ error: 'Client ID is required.' }, { status: 400 });
	}

	let resolvedSecret = clientSecret;
	if (!resolvedSecret) {
		const [existing] = await db
			.select()
			.from(appSettings)
			.where(eq(appSettings.key, 'google_oauth_credentials'));
		const existingCreds = existing?.value as { clientSecret?: string } | null;
		resolvedSecret = typeof existingCreds?.clientSecret === 'string' ? existingCreds.clientSecret : '';
	}

	if (!resolvedSecret) {
		return json({ error: 'Client Secret is required.' }, { status: 400 });
	}

	const credentials = {
		clientId,
		clientSecret: resolvedSecret,
		origin
	};

	await db
		.insert(appSettings)
		.values({
			key: 'google_oauth_credentials',
			value: credentials,
			updatedAt: new Date()
		})
		.onConflictDoUpdate({
			target: appSettings.key,
			set: { value: credentials, updatedAt: new Date() }
		});

	const { clearOAuthCache } = await import('$lib/server/google-sheets');
	clearOAuthCache();

	return json({ success: true });
};
