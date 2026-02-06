import { json } from '@sveltejs/kit';
import { getVerifiedOperatorId, deleteOperatorSessions } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	const operatorId = await getVerifiedOperatorId(cookies);
	if (operatorId) {
		await deleteOperatorSessions(operatorId);
	}
	cookies.delete('operatorSession', { path: '/' });
	return json({ success: true });
};
