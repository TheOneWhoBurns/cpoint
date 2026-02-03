import { db } from '$lib/server/db';
import { appSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { email } = await request.json();

	if (email) {
		await db
			.insert(appSettings)
			.values({ key: 'google_share_email', value: email, updatedAt: new Date() })
			.onConflictDoUpdate({
				target: appSettings.key,
				set: { value: email, updatedAt: new Date() }
			});
	} else {
		await db
			.delete(appSettings)
			.where(eq(appSettings.key, 'google_share_email'));
	}

	return new Response(JSON.stringify({ success: true }), {
		headers: { 'Content-Type': 'application/json' }
	});
};
