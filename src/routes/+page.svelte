<script lang="ts">
	import { shiftStore } from '$lib/stores/shift';
	import { invalidateAll } from '$app/navigation';
	import '@material/web/button/filled-button.js';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import CloseRentalModal from '$lib/components/CloseRentalModal.svelte';
	import EditRentalModal from '$lib/components/EditRentalModal.svelte';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import ActionBar from '$lib/components/ActionBar.svelte';
	import TabStrip from '$lib/components/TabStrip.svelte';
	import RentalCard from '$lib/components/RentalCard.svelte';
	import ReservationCard from '$lib/components/ReservationCard.svelte';
	import TourBookingCard from '$lib/components/TourBookingCard.svelte';
	import PreviousRentalCard from '$lib/components/PreviousRentalCard.svelte';
	import CreateRentalModal from '$lib/components/CreateRentalModal.svelte';
	import StoreSaleModal from '$lib/components/StoreSaleModal.svelte';
	import TourBookingModal from '$lib/components/TourBookingModal.svelte';
	import CloseTourBookingModal from '$lib/components/CloseTourBookingModal.svelte';
	import CreateReservationModal from '$lib/components/CreateReservationModal.svelte';
	import ConflictOverrideModal from '$lib/components/ConflictOverrideModal.svelte';
	import ShiftSummaryModal from '$lib/components/ShiftSummaryModal.svelte';

	type EquipmentItem = { type: string; itemId?: number; categoryId?: number; name: string; quantity?: number };

	let { data } = $props();

	let loading = $state(false);
	let error = $state('');
	let activeTab = $state('active');

	let showRentalModal = $state(false);
	let showReservationModal = $state(false);
	let showStoreSaleModal = $state(false);
	let showTourBookingModal = $state(false);
	let showShiftSummary = $state(false);
	let shiftSummary = $state<any>(null);
	let shiftSummaryRef: ShiftSummaryModal;

	let closeRentalModalOpen = $state(false);
	let selectedRentalToClose = $state<any>(null);
	let editRentalModalOpen = $state(false);
	let selectedRentalToEdit = $state<any>(null);

	let showCloseTourModal = $state(false);
	let selectedTourBookingToClose = $state<any>(null);
	let confirmDeleteTourBooking = $state(false);
	let pendingDeleteTourBookingId = $state<number | null>(null);
	let confirmEndShift = $state(false);

	let showConflictModal = $state(false);
	let conflictData = $state<any[]>([]);
	let pendingRentalPayload = $state<any>(null);

	let fromReservationId = $state<number | null>(null);
	let rentalPrefillData = $state<any>(null);

	const tabs = $derived([
		{ id: 'active', label: 'Active', icon: 'schedule', count: data.rentals.length, alwaysShow: true },
		{ id: 'reservations', label: 'Reservations', icon: 'event', count: data.reservations.length, alwaysShow: false },
		{ id: 'tours', label: 'Tours', icon: 'tour', count: data.tourBookings.length, alwaysShow: false },
		{ id: 'tourinfo', label: 'Tour Info', icon: 'info', count: data.tourProducts.length, alwaysShow: false },
		{ id: 'history', label: 'History', icon: 'history', count: data.previousShiftRentals.length, alwaysShow: true }
	]);

	async function verifyGuidePin(guideId: number, pin: string): Promise<boolean> {
		try {
			const res = await fetch('/api/guides/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ guideId, passcode: pin })
			});
			return res.ok;
		} catch { return false; }
	}

	async function handleCreateRental(payload: any) {
		loading = true;
		error = '';
		const res = await fetch('/api/rentals', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ...payload, shiftId: $shiftStore.shift?.id })
		});
		if (res.ok) {
			fromReservationId = null;
			rentalPrefillData = null;
			showRentalModal = false;
			await invalidateAll();
		} else if (res.status === 409) {
			const d = await res.json();
			if (d.error === 'reservation_conflict') {
				conflictData = d.conflicts;
				pendingRentalPayload = { ...payload, shiftId: $shiftStore.shift?.id };
				showConflictModal = true;
			} else {
				error = d.error || 'Conflict error';
			}
		} else {
			const d = await res.json();
			error = d.error || 'Failed to create rental';
		}
		loading = false;
	}

	async function handleConflictOverride(passcode: string) {
		loading = true;
		const payload = {
			...pendingRentalPayload,
			overrideReservationIds: conflictData.map((c: any) => c.id),
			operatorPasscode: passcode
		};
		const res = await fetch('/api/rentals', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		if (res.ok) {
			showConflictModal = false;
			fromReservationId = null;
			rentalPrefillData = null;
			showRentalModal = false;
			await invalidateAll();
		} else if (res.status === 403) {
			loading = false;
			throw new Error('invalid_passcode');
		} else {
			const d = await res.json();
			error = d.error || 'Failed to create rental';
			showConflictModal = false;
		}
		loading = false;
	}

	async function handleCreateReservation(reservationData: any) {
		loading = true;
		const res = await fetch('/api/reservations', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ...reservationData, shiftId: $shiftStore.shift?.id })
		});
		if (res.ok) {
			await invalidateAll();
		} else {
			const d = await res.json();
			loading = false;
			throw new Error(d.error || 'Failed to create reservation');
		}
		loading = false;
	}

	async function cancelReservation(id: number) {
		loading = true;
		const res = await fetch('/api/reservations', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, action: 'cancel' })
		});
		if (res.ok) await invalidateAll();
		loading = false;
	}

	function startRentalFromReservation(reservation: any) {
		const resItems = reservation.items as EquipmentItem[];
		const resCustomer = reservation.customer as { name?: string; hotel?: string; phone?: string } | null;

		fromReservationId = reservation.id;

		let matchedProductId: number | null = null;
		const prefillTracked: Record<number, number[]> = {};
		const prefillGeneric: Record<number, boolean> = {};

		for (const product of data.products) {
			const productEquip = product.equipment as EquipmentItem[];
			if (!productEquip) continue;
			const productCategoryIds = productEquip.map(e => e.categoryId).filter(Boolean).sort();
			const resCategoryIds = [...new Set(resItems.map(i => i.categoryId).filter(Boolean))].sort();
			if (JSON.stringify(productCategoryIds) === JSON.stringify(resCategoryIds)) {
				matchedProductId = product.id;
				for (const item of resItems) {
					if (item.type === 'tracked' && item.itemId) {
						const catId = item.categoryId ?? 0;
						if (!prefillTracked[catId]) prefillTracked[catId] = [];
						prefillTracked[catId] = [...prefillTracked[catId], item.itemId];
					} else if (item.type === 'generic') {
						prefillGeneric[item.categoryId ?? 0] = true;
					}
				}
				break;
			}
		}

		rentalPrefillData = {
			productId: matchedProductId,
			customerName: resCustomer?.name || '',
			customerHotel: resCustomer?.hotel || '',
			customerPhone: resCustomer?.phone || '',
			guideId: reservation.guideId || null,
			trackedItems: prefillTracked,
			genericItems: prefillGeneric
		};
		showRentalModal = true;
	}

	async function handleStoreSale(productId: number, quantity: number) {
		loading = true;
		const res = await fetch('/api/store-sales', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ shiftId: $shiftStore.shift?.id, productId, quantity })
		});
		if (res.ok) {
			await invalidateAll();
		} else {
			const d = await res.json();
			loading = false;
			throw new Error(d.error || 'Failed to create sale');
		}
		loading = false;
	}

	async function handleCreateTourBooking(tourData: { tourProductId: number; pax: number; activityDate: string; guideId: number | null }) {
		loading = true;
		const res = await fetch('/api/tour-bookings', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ shiftId: $shiftStore.shift?.id, ...tourData, bookedAt: new Date().toISOString() })
		});
		if (res.ok) {
			await invalidateAll();
		} else {
			const d = await res.json();
			loading = false;
			throw new Error(d.error || 'Failed to create booking');
		}
		loading = false;
	}

	function promptCloseTourBooking(booking: any) {
		selectedTourBookingToClose = booking;
		showCloseTourModal = true;
	}

	async function handleCloseTourBooking(id: number, cost: number) {
		loading = true;
		const res = await fetch('/api/tour-bookings', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, action: 'close', cost })
		});
		if (res.ok) {
			await invalidateAll();
		} else {
			const d = await res.json();
			loading = false;
			throw new Error(d.error || 'Failed to close booking');
		}
		loading = false;
	}

	function promptDeleteTourBooking(id: number) {
		pendingDeleteTourBookingId = id;
		confirmDeleteTourBooking = true;
	}

	async function executeDeleteTourBooking() {
		if (!pendingDeleteTourBookingId) return;
		loading = true;
		const res = await fetch('/api/tour-bookings', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: pendingDeleteTourBookingId })
		});
		if (res.ok) await invalidateAll();
		loading = false;
		pendingDeleteTourBookingId = null;
	}

	function promptCloseRental(id: number) {
		selectedRentalToClose = data.rentals.find((r: any) => r.id === id);
		closeRentalModalOpen = true;
	}

	function promptEditRental(id: number) {
		selectedRentalToEdit = data.rentals.find((r: any) => r.id === id);
		editRentalModalOpen = true;
	}

	async function executeEditRental(updateData: { customer: object; rentalType: string; notes: string; items?: any[]; guideId?: number | null }) {
		if (!selectedRentalToEdit) return;
		loading = true;
		try {
			const res = await fetch('/api/rentals', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: selectedRentalToEdit.id, action: 'edit', ...updateData })
			});
			if (res.ok) {
				await invalidateAll();
			} else {
				const d = await res.json();
				throw new Error(d.error || 'Failed to update rental');
			}
		} catch (e) {
			if (e instanceof Error) throw e;
			throw new Error('Network error updating rental');
		} finally {
			loading = false;
			selectedRentalToEdit = null;
		}
	}

	async function executeCloseRental(returnData: any) {
		if (!selectedRentalToClose) return;
		loading = true;
		const res = await fetch('/api/rentals', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: selectedRentalToClose.id, action: 'close', returnData, currentShiftId: $shiftStore.shift?.id })
		});
		if (res.ok) await invalidateAll();
		loading = false;
		selectedRentalToClose = null;
	}

	async function handleEndShift() {
		error = '';
		if (!$shiftStore.shift?.id) { error = 'No active shift found'; return; }
		loading = true;
		try {
			const res = await fetch(`/api/shifts/summary?shiftId=${$shiftStore.shift.id}`);
			if (res.ok) {
				shiftSummary = await res.json();
				let checklist: Array<{ id: number; label: string }> = [];
				try {
					const clRes = await fetch('/api/closing-checklist');
					if (clRes.ok) {
						const allItems = await clRes.json();
						checklist = allItems.filter((i: any) => i.isActive);
					}
				} catch {}
				showShiftSummary = true;
				setTimeout(() => shiftSummaryRef?.setChecklist(checklist), 0);
			} else {
				const d = await res.json();
				error = d.error || 'Failed to load shift summary';
			}
		} catch {
			error = 'Network error loading shift summary';
		}
		loading = false;
	}

	async function executeEndShift() {
		loading = true;
		try {
			const res = await fetch('/api/shifts/close', { method: 'POST' });
			if (res.ok) {
				const contentType = res.headers.get('Content-Type') || '';
				if (contentType.includes('application/json')) {
					const d = await res.json();
					if (d.url) window.open(d.url, '_blank');
					else error = 'Google Sheets export succeeded but no URL was returned';
				} else {
					const blob = await res.blob();
					const url = window.URL.createObjectURL(blob);
					const a = document.createElement('a');
					a.href = url;
					a.download = `shift-report-${new Date().toISOString().split('T')[0]}.xlsx`;
					a.click();
					window.URL.revokeObjectURL(url);
				}
				shiftStore.clearSession();
				await invalidateAll();
			} else {
				error = 'Failed to close shift';
			}
		} catch {
			error = 'Failed to close shift';
		}
		loading = false;
	}
</script>

{#if $shiftStore.isLoggedIn}
	<div class="app-shell">
		<AppHeader
			operatorName={$shiftStore.operator?.name ?? ''}
			shiftStartedAt={$shiftStore.shift?.startedAt?.toString() ?? ''}
			{error}
			{loading}
			onEndShift={handleEndShift}
			onDismissError={() => error = ''}
		/>

		<main class="app-main">
			<ActionBar
				hasStoreProducts={data.storeProducts.length > 0}
				hasTourProducts={data.tourProducts.length > 0}
				onNewRental={() => { showRentalModal = true; error = ''; fromReservationId = null; rentalPrefillData = null; }}
				onNewReservation={() => { showReservationModal = true; }}
				onStoreSale={() => { showStoreSaleModal = true; }}
				onTourBooking={() => { showTourBookingModal = true; }}
			/>

			<TabStrip {tabs} bind:activeTab />

			<div class="tab-content">
				{#if activeTab === 'active'}
					{#if data.rentals.length === 0}
						<div class="empty-state">
							<span class="material-symbols-rounded empty-icon">event_available</span>
							<p class="md-title-medium">No active rentals</p>
							<p class="md-body-medium">Click "New Rental" to get started</p>
							<md-filled-button onclick={() => { showRentalModal = true; error = ''; }}>
								<span class="material-symbols-rounded" slot="icon">add</span>
								New Rental
							</md-filled-button>
						</div>
					{:else}
						<div class="cards-grid">
							{#each data.rentals as rental (rental.id)}
								<RentalCard {rental} {loading} onEdit={promptEditRental} onClose={promptCloseRental} />
							{/each}
						</div>
					{/if}
				{:else if activeTab === 'reservations'}
					{#if data.reservations.length === 0}
						<div class="empty-state">
							<span class="material-symbols-rounded empty-icon">event</span>
							<p class="md-title-medium">No reservations</p>
							<p class="md-body-medium">Create a reservation to hold equipment</p>
							<md-filled-button onclick={() => { showReservationModal = true; }}>
								<span class="material-symbols-rounded" slot="icon">add</span>
								New Reservation
							</md-filled-button>
						</div>
					{:else}
						<div class="cards-grid">
							{#each data.reservations as reservation (reservation.id)}
								<ReservationCard {reservation} {loading} onCancel={cancelReservation} onStartRental={startRentalFromReservation} />
							{/each}
						</div>
					{/if}
				{:else if activeTab === 'tours'}
					{#if data.tourBookings.length === 0}
						<div class="empty-state">
							<span class="material-symbols-rounded empty-icon">tour</span>
							<p class="md-title-medium">No tour bookings</p>
							<p class="md-body-medium">Create a tour booking to track tours</p>
							{#if data.tourProducts.length > 0}
								<md-filled-button onclick={() => { showTourBookingModal = true; }}>
									<span class="material-symbols-rounded" slot="icon">add</span>
									Tour Booking
								</md-filled-button>
							{/if}
						</div>
					{:else}
						<div class="cards-grid">
							{#each data.tourBookings as booking (booking.id)}
								<TourBookingCard {booking} {loading} onDelete={promptDeleteTourBooking} onClose={promptCloseTourBooking} />
							{/each}
						</div>
					{/if}
				{:else if activeTab === 'tourinfo'}
					{#if data.tourProducts.length === 0}
						<div class="empty-state">
							<span class="material-symbols-rounded empty-icon">info</span>
							<p class="md-title-medium">No tours available</p>
							<p class="md-body-medium">Add tours in the admin panel</p>
						</div>
					{:else}
						<div class="cards-grid tour-info-grid">
							{#each data.tourProducts as tour (tour.id)}
								<div class="tour-info-card">
									<div class="tour-info-header">
										<span class="material-symbols-rounded tour-icon">tour</span>
										<h3 class="md-title-medium">{tour.name}</h3>
										<span class="tour-price">${(tour.price / 100).toFixed(2)}/person</span>
									</div>
									{#if tour.info}
										<p class="tour-description md-body-medium">{tour.info}</p>
									{/if}
									{#if tour.multimediaLinks && tour.multimediaLinks.length > 0}
										<div class="tour-media-links">
											{#each tour.multimediaLinks as link}
												<a href={link} target="_blank" rel="noopener noreferrer" class="media-link-btn">
													<span class="material-symbols-rounded">{link.includes('instagram') ? 'photo_camera' : 'link'}</span>
													<span>{link.includes('instagram') ? 'View on Instagram' : 'Open Link'}</span>
													<span class="material-symbols-rounded">open_in_new</span>
												</a>
											{/each}
										</div>
									{/if}
									{#if tour.requiresGuide}
										<div class="tour-badge">
											<span class="material-symbols-rounded">hiking</span>
											Guide Required
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				{:else if activeTab === 'history'}
					{#if data.previousShiftRentals.length === 0}
						<div class="empty-state compact">
							<span class="material-symbols-rounded empty-icon">folder_off</span>
							<p class="md-body-medium">No previous rentals</p>
						</div>
					{:else}
						<div class="cards-grid previous">
							{#each data.previousShiftRentals as rental (rental.id)}
								<PreviousRentalCard {rental} />
							{/each}
						</div>
					{/if}
				{/if}
			</div>
		</main>
	</div>
{:else}
	<div class="login-prompt">
		<div class="login-card">
			<div class="login-icon">
				<span class="material-symbols-rounded">point_of_sale</span>
			</div>
			<h1 class="md-headline-medium">Rental Manager</h1>
			<p class="md-body-large">Select your profile to start a shift</p>
			<a href="/login">
				<md-filled-button>
					<span class="material-symbols-rounded" slot="icon">login</span>
					Start Shift
				</md-filled-button>
			</a>
		</div>
	</div>
{/if}

<CreateRentalModal
	bind:open={showRentalModal}
	products={data.products}
	trackedItems={data.trackedItems}
	categories={data.categories}
	guides={data.guides}
	bind:fromReservationId
	prefillData={rentalPrefillData}
	bind:loading
	onSubmit={handleCreateRental}
	onVerifyPin={verifyGuidePin}
/>

<CreateReservationModal
	bind:open={showReservationModal}
	products={data.products}
	trackedItems={data.trackedItems}
	categories={data.categories}
	guides={data.guides}
	bind:loading
	onSubmit={handleCreateReservation}
	onVerifyPin={verifyGuidePin}
/>

<StoreSaleModal
	bind:open={showStoreSaleModal}
	storeProducts={data.storeProducts}
	bind:loading
	onSubmit={handleStoreSale}
/>

<TourBookingModal
	bind:open={showTourBookingModal}
	tourProducts={data.tourProducts}
	guides={data.guides}
	bind:loading
	onSubmit={handleCreateTourBooking}
	onVerifyPin={verifyGuidePin}
/>

<CloseTourBookingModal
	bind:open={showCloseTourModal}
	booking={selectedTourBookingToClose}
	bind:loading
	onSubmit={handleCloseTourBooking}
/>

<ConflictOverrideModal
	bind:open={showConflictModal}
	{conflictData}
	{loading}
	onOverride={handleConflictOverride}
/>

<ShiftSummaryModal
	bind:open={showShiftSummary}
	bind:this={shiftSummaryRef}
	{shiftSummary}
	{loading}
	onEndShift={executeEndShift}
/>

<ConfirmModal
	bind:open={confirmDeleteTourBooking}
	title="Delete Tour Booking"
	message="Are you sure you want to delete this tour booking? This action cannot be undone."
	confirmText="Delete"
	cancelText="Cancel"
	variant="danger"
	onConfirm={executeDeleteTourBooking}
/>

<ConfirmModal
	bind:open={confirmEndShift}
	title="End Shift"
	message="Are you sure you want to end your shift? Make sure all rentals are closed."
	confirmText="End Shift"
	cancelText="Cancel"
	variant="warning"
	onConfirm={executeEndShift}
/>

<CloseRentalModal
	bind:open={closeRentalModalOpen}
	rental={selectedRentalToClose}
	operatorId={$shiftStore.operator?.id || 0}
	onClose={executeCloseRental}
	onCancel={() => { closeRentalModalOpen = false; }}
/>

<EditRentalModal
	bind:open={editRentalModalOpen}
	rental={selectedRentalToEdit}
	trackedItems={data.trackedItems}
	categories={data.categories}
	guides={data.guides}
	onSave={executeEditRental}
	onCancel={() => { editRentalModalOpen = false; }}
	onVerifyPin={verifyGuidePin}
/>

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: var(--md-sys-color-surface-container-lowest);
	}

	.app-main {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	.tab-content {
		flex: 1;
		padding: var(--md-sys-spacing-lg);
	}

	.cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: var(--md-sys-spacing-md);
	}

	.cards-grid.previous {
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--md-sys-spacing-md);
		padding: var(--md-sys-spacing-xxl) var(--md-sys-spacing-lg);
		color: var(--md-sys-color-on-surface-variant);
		text-align: center;
	}

	.empty-state.compact {
		padding: var(--md-sys-spacing-xl);
	}

	.empty-icon {
		font-size: 64px;
		opacity: 0.4;
	}

	.empty-state p {
		margin: 0;
	}

	.login-prompt {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		background: linear-gradient(135deg, var(--md-sys-color-primary-container) 0%, var(--md-sys-color-surface) 100%);
		padding: var(--md-sys-spacing-lg);
	}

	.login-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--md-sys-spacing-lg);
		padding: var(--md-sys-spacing-xxl);
		background: var(--md-sys-color-surface);
		border-radius: var(--md-sys-shape-corner-extra-large);
		box-shadow: var(--md-sys-elevation-level3);
		text-align: center;
		animation: scale-in 0.3s var(--md-sys-motion-easing-emphasized);
	}

	.login-icon {
		width: 80px;
		height: 80px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--md-sys-color-primary-container);
		border-radius: var(--md-sys-shape-corner-full);
	}

	.login-icon .material-symbols-rounded {
		font-size: 40px;
		color: var(--md-sys-color-on-primary-container);
	}

	.login-card h1 { margin: 0; color: var(--md-sys-color-on-surface); }
	.login-card p { margin: 0; color: var(--md-sys-color-on-surface-variant); }
	.login-card a { text-decoration: none; }

	@keyframes scale-in {
		from { opacity: 0; transform: scale(0.95); }
		to { opacity: 1; transform: scale(1); }
	}

	/* Tour Info Cards */
	.tour-info-grid {
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
	}

	.tour-info-card {
		background: var(--md-sys-color-surface);
		border-radius: var(--md-sys-shape-corner-large);
		border: 1px solid var(--md-sys-color-outline-variant);
		padding: var(--md-sys-spacing-lg);
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-md);
	}

	.tour-info-header {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		flex-wrap: wrap;
	}

	.tour-icon {
		font-size: 28px;
		color: var(--md-sys-color-primary);
	}

	.tour-info-header h3 {
		flex: 1;
		margin: 0;
		color: var(--md-sys-color-on-surface);
	}

	.tour-price {
		font: var(--md-sys-typescale-title-medium);
		color: var(--md-sys-color-primary);
		background: var(--md-sys-color-primary-container);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		border-radius: var(--md-sys-shape-corner-small);
	}

	.tour-description {
		color: var(--md-sys-color-on-surface-variant);
		margin: 0;
		white-space: pre-wrap;
		line-height: 1.5;
	}

	.tour-media-links {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-sm);
	}

	.media-link-btn {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
		background: var(--md-sys-color-secondary-container);
		color: var(--md-sys-color-on-secondary-container);
		border-radius: var(--md-sys-shape-corner-medium);
		text-decoration: none;
		font: var(--md-sys-typescale-label-large);
		transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.media-link-btn:hover {
		background: var(--md-sys-color-secondary);
		color: var(--md-sys-color-on-secondary);
		transform: translateY(-2px);
		box-shadow: var(--md-sys-elevation-level2);
	}

	.media-link-btn .material-symbols-rounded:first-child {
		font-size: 24px;
	}

	.media-link-btn span:nth-child(2) {
		flex: 1;
	}

	.media-link-btn .material-symbols-rounded:last-child {
		font-size: 18px;
		opacity: 0.7;
	}

	.tour-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
		border-radius: var(--md-sys-shape-corner-small);
		font: var(--md-sys-typescale-label-medium);
		width: fit-content;
	}

	.tour-badge .material-symbols-rounded {
		font-size: 18px;
	}

	@media (max-width: 768px) {
		.cards-grid { grid-template-columns: 1fr; }
		.tab-content { padding: var(--md-sys-spacing-md); }
	}
</style>
