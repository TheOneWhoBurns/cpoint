import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { rentalProducts, rentals, trackedItems, productTypes, guides, storeProducts, shifts, operators, tourAgencyProducts, tourBookings } from '$lib/server/db/schema';
import { eq, and, isNull, ne } from 'drizzle-orm';

export const load: PageServerLoad = async ({ cookies }) => {
	const products = await db.select().from(rentalProducts).where(eq(rentalProducts.isActive, true));
	const allTrackedItems = await db.select().from(trackedItems);
	const allCategories = await db.select().from(productTypes);
	const allGuides = await db.select().from(guides).where(eq(guides.isActive, true));
	const allStoreProducts = await db.select().from(storeProducts).where(eq(storeProducts.isActive, true));
	const allTourProducts = await db.select().from(tourAgencyProducts).where(eq(tourAgencyProducts.isActive, true));

	const operatorIdStr = cookies.get('operatorId');
	let activeRentals = [];
	let previousShiftRentals = [];
	let activeTourBookings: Array<Record<string, unknown>> = [];

	if (operatorIdStr) {
		const operatorId = parseInt(operatorIdStr);
		const [currentShift] = await db
			.select()
			.from(shifts)
			.where(and(eq(shifts.operatorId, operatorId), isNull(shifts.endedAt)));

		if (currentShift) {
			activeRentals = await db
				.select()
				.from(rentals)
				.where(eq(rentals.status, 'active'));

			previousShiftRentals = await db
				.select()
				.from(rentals)
				.where(and(
					ne(rentals.shiftId, currentShift.id),
					eq(rentals.status, 'completed')
				));

			activeTourBookings = await db
				.select({
					id: tourBookings.id,
					shiftId: tourBookings.shiftId,
					tourProductId: tourBookings.tourProductId,
					guideId: tourBookings.guideId,
					pax: tourBookings.pax,
					unitPrice: tourBookings.unitPrice,
					totalPrice: tourBookings.totalPrice,
					cost: tourBookings.cost,
					bookedAt: tourBookings.bookedAt,
					activityDate: tourBookings.activityDate,
					status: tourBookings.status,
					createdAt: tourBookings.createdAt,
					productName: tourAgencyProducts.name
				})
				.from(tourBookings)
				.leftJoin(tourAgencyProducts, eq(tourBookings.tourProductId, tourAgencyProducts.id))
				.where(eq(tourBookings.status, 'active'));
		}
	}

	return {
		products,
		trackedItems: allTrackedItems,
		categories: allCategories,
		rentals: activeRentals,
		previousShiftRentals,
		guides: allGuides,
		storeProducts: allStoreProducts,
		tourProducts: allTourProducts,
		tourBookings: activeTourBookings
	};
};
