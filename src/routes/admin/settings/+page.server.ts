import { isGoogleConnected } from '$lib/server/google-sheets';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const googleConnected = await isGoogleConnected();
	const googleConfigured = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
	return { googleConnected, googleConfigured };
};
