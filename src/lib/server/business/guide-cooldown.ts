export function checkGuideCooldown(params: {
	lastReturnedAt: Date | string | null;
	cooldownMinutes: number;
	now: Date;
}): { onCooldown: boolean; minutesLeft: number } {
	if (!params.lastReturnedAt) {
		return { onCooldown: false, minutesLeft: 0 };
	}

	const returnTime = new Date(params.lastReturnedAt).getTime();
	const cooldownMs = params.cooldownMinutes * 60 * 1000;
	const nowMs = params.now.getTime();

	if (nowMs < returnTime + cooldownMs) {
		const minutesLeft = Math.ceil((returnTime + cooldownMs - nowMs) / 60000);
		return { onCooldown: true, minutesLeft };
	}

	return { onCooldown: false, minutesLeft: 0 };
}
