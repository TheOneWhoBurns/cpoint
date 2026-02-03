import { isGoogleConnected, getGoogleCredentials } from '$lib/server/google-sheets';
import { db } from '$lib/server/db';
import { appSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const googleConnected = await isGoogleConnected();
	const creds = await getGoogleCredentials();
	const googleConfigured = !!creds;

	const [shareSetting] = await db
		.select()
		.from(appSettings)
		.where(eq(appSettings.key, 'google_share_email'));

	const [credsSetting] = await db
		.select()
		.from(appSettings)
		.where(eq(appSettings.key, 'google_oauth_credentials'));

	const savedCreds = credsSetting?.value as { clientId?: string; clientSecret?: string; origin?: string } | null;

	return {
		googleConnected,
		googleConfigured,
		shareEmail: (shareSetting?.value as string) || '',
		savedCredentials: savedCreds ? {
			clientId: savedCreds.clientId || '',
			clientSecret: savedCreds.clientSecret ? '••••••••' : '',
			origin: savedCreds.origin || '',
			hasSecret: !!savedCreds.clientSecret
		} : null
	};
};
