import { db } from '$lib/server/db';
import { appSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: RequestHandler = async ({ request }) => {
	let body;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid request body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const { email } = body;

	if (email) {
		if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
			return new Response(JSON.stringify({ error: 'Invalid email address' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		const trimmed = email.trim();
		await db
			.insert(appSettings)
			.values({ key: 'google_share_email', value: trimmed, updatedAt: new Date() })
			.onConflictDoUpdate({
				target: appSettings.key,
				set: { value: trimmed, updatedAt: new Date() }
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
