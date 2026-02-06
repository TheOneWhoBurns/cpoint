import { apiPost, apiPatch, apiDelete, type ApiError } from './api';

export async function createRental(payload: any) {
	try {
		const res = await apiPost('/api/rentals', payload);
		return res.json();
	} catch (err: any) {
		if (err.status === 409 && err.data?.error === 'reservation_conflict') {
			const conflictErr: ApiError & { conflicts: any[] } = {
				...err,
				conflicts: err.data.conflicts || []
			};
			throw conflictErr;
		}
		throw err;
	}
}

export async function createRentalWithOverride(
	payload: any,
	overrideReservationIds: number[],
	operatorPasscode: string,
	overrideOperatorId: number
) {
	const res = await apiPost('/api/rentals', {
		...payload,
		overrideReservationIds,
		operatorPasscode,
		overrideOperatorId
	});
	return res.json();
}

export async function closeRental(id: number, returnData: any, currentShiftId: number) {
	const res = await apiPatch('/api/rentals', {
		action: 'close',
		id,
		currentShiftId,
		returnData
	});
	return res.json();
}

export async function editRental(id: number, data: any) {
	const res = await apiPatch('/api/rentals', {
		action: 'edit',
		id,
		...data
	});
	return res.json();
}

export async function deleteRental(id: number, passcode: string) {
	const res = await apiDelete('/api/rentals', { id, passcode });
	return res.json();
}
