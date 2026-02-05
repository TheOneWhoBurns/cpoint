interface ReservationItem {
	type: string;
	itemId?: number;
	categoryId?: number;
	name: string;
	quantity?: number;
}

interface ActiveReservation {
	id: number;
	items: ReservationItem[];
	customer: { name?: string } | null;
	reason: string | null;
	reservedFrom: Date | string;
	reservedUntil: Date | string;
}

interface ConflictResult {
	id: number;
	customer: { name?: string } | null;
	reason: string | null;
	reservedFrom: Date | string;
	reservedUntil: Date | string;
	items: ReservationItem[];
}

export function findRentalReservationConflicts(params: {
	rentalTrackedIds: number[];
	activeReservations: ActiveReservation[];
	now: Date;
	overrideReservationIds?: number[];
}): ConflictResult[] {
	const conflicts: ConflictResult[] = [];

	for (const res of params.activeReservations) {
		const resUntil = new Date(res.reservedUntil);
		const resFrom = new Date(res.reservedFrom);

		if (params.now < resUntil && resFrom <= resUntil) {
			const resTrackedIds = res.items
				.filter(i => i.type === 'tracked' && i.itemId)
				.map(i => i.itemId!);

			const overlappingIds = params.rentalTrackedIds.filter(id => resTrackedIds.includes(id));
			if (overlappingIds.length > 0) {
				if (!params.overrideReservationIds || !params.overrideReservationIds.includes(res.id)) {
					conflicts.push({
						id: res.id,
						customer: res.customer,
						reason: res.reason,
						reservedFrom: res.reservedFrom,
						reservedUntil: res.reservedUntil,
						items: res.items.filter(i => i.itemId && overlappingIds.includes(i.itemId))
					});
				}
			}
		}
	}

	return conflicts;
}

export function findReservationTimeConflicts(params: {
	requestedFrom: Date;
	requestedUntil: Date;
	requestedTrackedIds: number[];
	existingReservations: ActiveReservation[];
}): { conflicting: ActiveReservation; overlappingItemIds: number[] } | null {
	for (const existing of params.existingReservations) {
		const existingFrom = new Date(existing.reservedFrom);
		const existingUntil = new Date(existing.reservedUntil);

		if (params.requestedFrom < existingUntil && params.requestedUntil > existingFrom) {
			const existingTrackedIds = existing.items
				.filter(i => i.type === 'tracked' && i.itemId)
				.map(i => i.itemId!);

			const overlap = params.requestedTrackedIds.filter(id => existingTrackedIds.includes(id));
			if (overlap.length > 0) {
				return { conflicting: existing, overlappingItemIds: overlap };
			}
		}
	}

	return null;
}
