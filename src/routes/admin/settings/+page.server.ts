import { isGoogleConnected } from '$lib/server/google-sheets';
import { db } from '$lib/server/db';
import { appSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const googleConnected = await isGoogleConnected();
	const googleConfigured = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

	const [shareSetting] = await db
		.select()
		.from(appSettings)
		.where(eq(appSettings.key, 'google_share_email'));

	return {
		googleConnected,
		googleConfigured,
		shareEmail: (shareSetting?.value as string) || ''
	};
};
