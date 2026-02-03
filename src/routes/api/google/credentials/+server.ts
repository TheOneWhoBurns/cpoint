import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { appSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { clientId, clientSecret, origin } = await request.json();

	if (!clientId) {
		return json({ error: 'Client ID is required.' }, { status: 400 });
	}

	// If no new secret provided, keep the existing one from DB
	let resolvedSecret = clientSecret?.trim() || '';
	if (!resolvedSecret) {
		const [existing] = await db
			.select()
			.from(appSettings)
			.where(eq(appSettings.key, 'google_oauth_credentials'));
		const existingCreds = existing?.value as { clientSecret?: string } | null;
		resolvedSecret = existingCreds?.clientSecret || '';
	}

	if (!resolvedSecret) {
		return json({ error: 'Client Secret is required.' }, { status: 400 });
	}

	const credentials = {
		clientId: clientId.trim(),
		clientSecret: resolvedSecret,
		origin: origin?.trim() || ''
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

	// Clear cached OAuth client so new credentials are picked up
	const { clearOAuthCache } = await import('$lib/server/google-sheets');
	clearOAuthCache();

	return json({ success: true });
};
