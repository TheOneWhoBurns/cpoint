import { apiPost } from './api';

export async function verifyGuidePin(guideId: number, passcode: string): Promise<boolean> {
	try {
		await apiPost('/api/guides/verify', { guideId, passcode });
		return true;
	} catch {
		return false;
	}
}
