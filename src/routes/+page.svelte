<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import { invalidateAll } from '$app/navigation';
	import { shiftStore } from '$lib/stores/shift';
	import { toastStore } from '$lib/stores/toast';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import TabStrip from '$lib/components/TabStrip.svelte';
	import ActionBar from '$lib/components/ActionBar.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import DeleteModal from '$lib/components/DeleteModal.svelte';
	import ShiftSummaryModal from '$lib/components/ShiftSummaryModal.svelte';
	import ActiveRentalsTab from '$lib/sections/ActiveRentalsTab.svelte';
	import ReservationsTab from '$lib/sections/ReservationsTab.svelte';
	import ToursTab from '$lib/sections/ToursTab.svelte';
	import StoreSalesTab from '$lib/sections/StoreSalesTab.svelte';
	import PreviousRentalsTab from '$lib/sections/PreviousRentalsTab.svelte';
	import { deleteRental } from '$lib/services/rental.service';
	import { cancelReservation } from '$lib/services/reservation.service';
	import { deleteTourBooking } from '$lib/services/tour.service';
	import { deleteStoreSale } from '$lib/services/store-sale.service';
	import { getShiftSummary, endShift } from '$lib/services/shift.service';

	let { data } = $props();

	let activeTab = $state('active');
	let deleteTarget = $state<{ type: string; id: number; label: string } | null>(null);
	let showDeleteModal = $state(false);
	let showShiftSummary = $state(false);
	let shiftSummary = $state<any>(null);
	let shiftLoading = $state(false);
	let headerError = $state('');

	let prefillFromReservation = $state<any>(null);
	let fromReservationId = $state<number | null>(null);

	let activeRentalsRef = $state<ActiveRentalsTab>();
	let reservationsRef = $state<ReservationsTab>();
	let toursRef = $state<ToursTab>();
	let storeSalesRef = $state<StoreSalesTab>();

	let toastState = $state<{ message: string; variant: 'success' | 'error' | 'warning' | 'info'; visible: boolean }>({ message: '', variant: 'success', visible: false });
	$effect(() => {
		return toastStore.subscribe(s => toastState = s);
	});

	let shiftState = $state<{ operator: any; shift: any; isLoggedIn: boolean }>({ operator: null, shift: null, isLoggedIn: false });
	$effect(() => {
		return shiftStore.subscribe(s => shiftState = s);
	});

	const tabs = $derived([
		{ id: 'active', label: 'Active', icon: 'pedal_bike', count: data.rentals.length, alwaysShow: true },
		{ id: 'reservations', label: 'Reservations', icon: 'event', count: data.reservations.length },
		{ id: 'tours', label: 'Tours', icon: 'tour', count: data.tourBookings.length },
		{ id: 'sales', label: 'Sales', icon: 'storefront', count: data.storeSales.length },
		{ id: 'history', label: 'History', icon: 'history', count: data.previousShiftRentals.length }
	]);

	function onDataChanged() {
		invalidateAll();
	}

	function promptDelete(type: string, id: number, label: string) {
		deleteTarget = { type, id, label };
		showDeleteModal = true;
	}

	async function handleDelete(type: string, id: number, passcode: string) {
		try {
			if (type === 'rental') await deleteRental(id, passcode);
			else if (type === 'reservation') await cancelReservation(id, passcode);
			else if (type === 'tourBooking') await deleteTourBooking(id, passcode);
			else if (type === 'storeSale') await deleteStoreSale(id, passcode);
			showDeleteModal = false;
			deleteTarget = null;
			toastStore.success(`${type === 'tourBooking' ? 'Tour booking' : type.charAt(0).toUpperCase() + type.slice(1)} deleted`);
			onDataChanged();
		} catch (err: any) {
			toastStore.error(err.message || 'Delete failed');
		}
	}

	function handleStartRentalFromReservation(reservationId: number, prefill: any) {
		prefillFromReservation = prefill;
		fromReservationId = reservationId;
		activeTab = 'active';
	}

	function clearPrefill() {
		prefillFromReservation = null;
		fromReservationId = null;
	}

	async function handleEndShift() {
		if (!shiftState?.shift) return;
		shiftLoading = true;
		try {
			const summary = await getShiftSummary(shiftState.shift.id);
			shiftSummary = summary;
			showShiftSummary = true;
		} catch (err: any) {
			headerError = err.message || 'Failed to load shift summary';
		} finally {
			shiftLoading = false;
		}
	}

	async function handleConfirmEndShift() {
		shiftLoading = true;
		try {
			await endShift();
			showShiftSummary = false;
			shiftStore.clearSession();
			toastStore.success('Shift ended');
		} catch (err: any) {
			toastStore.error(err.message || 'Failed to end shift');
		} finally {
			shiftLoading = false;
		}
	}

	function handleNewRental() { activeRentalsRef?.openCreateModal(); }
	function handleNewReservation() { reservationsRef?.openCreateModal(); }
	function handleStoreSale() { storeSalesRef?.openSaleModal(); }
	function handleTourBooking() { toursRef?.openCreateModal(); }
</script>

{#if toastState}
	<Toast
		message={toastState.message}
		variant={toastState.variant}
		bind:visible={toastState.visible}
	/>
{/if}

{#if shiftState?.isLoggedIn}
	<AppHeader
		operatorName={shiftState.operator?.name || ''}
		shiftStartedAt={shiftState.shift?.startedAt || ''}
		error={headerError}
		loading={shiftLoading}
		onEndShift={handleEndShift}
		onDismissError={() => headerError = ''}
	/>

	<ActionBar
		hasStoreProducts={data.storeProducts.length > 0}
		hasTourProducts={data.tourProducts.length > 0}
		onNewRental={handleNewRental}
		onNewReservation={handleNewReservation}
		onStoreSale={handleStoreSale}
		onTourBooking={handleTourBooking}
	/>

	<TabStrip {tabs} bind:activeTab />

	<main>
		{#if activeTab === 'active'}
			<ActiveRentalsTab
				bind:this={activeRentalsRef}
				rentals={data.rentals}
				products={data.products}
				trackedItems={data.trackedItems}
				categories={data.categories}
				guides={data.guides}
				shiftId={shiftState.shift?.id || 0}
				operatorId={shiftState.operator?.id || 0}
				{prefillFromReservation}
				{fromReservationId}
				{onDataChanged}
				onPromptDelete={promptDelete}
				onClearPrefill={clearPrefill}
			/>
		{:else if activeTab === 'reservations'}
			<ReservationsTab
				bind:this={reservationsRef}
				reservations={data.reservations}
				products={data.products}
				trackedItems={data.trackedItems}
				categories={data.categories}
				guides={data.guides}
				{onDataChanged}
				onPromptDelete={promptDelete}
				onStartRentalFromReservation={handleStartRentalFromReservation}
			/>
		{:else if activeTab === 'tours'}
			<ToursTab
				bind:this={toursRef}
				tourBookings={data.tourBookings}
				tourProducts={data.tourProducts}
				guides={data.guides}
				shiftId={shiftState.shift?.id || 0}
				{onDataChanged}
				onPromptDelete={promptDelete}
			/>
		{:else if activeTab === 'sales'}
			<StoreSalesTab
				bind:this={storeSalesRef}
				storeSales={data.storeSales}
				storeProducts={data.storeProducts}
				shiftId={shiftState.shift?.id || 0}
				{onDataChanged}
				onPromptDelete={promptDelete}
			/>
		{:else if activeTab === 'history'}
			<PreviousRentalsTab rentals={data.previousShiftRentals} />
		{/if}
	</main>

	<DeleteModal
		bind:open={showDeleteModal}
		target={deleteTarget}
		onDelete={handleDelete}
	/>

	<ShiftSummaryModal
		bind:open={showShiftSummary}
		{shiftSummary}
		loading={shiftLoading}
		onEndShift={handleConfirmEndShift}
	/>
{:else}
	<div class="login-prompt">
		<div class="login-card">
			<span class="material-symbols-rounded login-icon">point_of_sale</span>
			<h1 class="md-headline-medium">Rental Manager</h1>
			<p class="md-body-large">Log in to start your shift</p>
			<md-filled-button href="/login">
				<span class="material-symbols-rounded" slot="icon">login</span>
				Log In
			</md-filled-button>
		</div>
	</div>
{/if}

<style>
	main { flex: 1; }
	.login-prompt {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		background: var(--md-sys-color-surface);
	}
	.login-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--md-sys-spacing-lg);
		padding: var(--md-sys-spacing-xxl);
		background: var(--md-sys-color-surface-container);
		border-radius: var(--md-sys-shape-corner-extra-large);
		box-shadow: var(--md-sys-elevation-level2);
		text-align: center;
	}
	.login-icon {
		font-size: 64px;
		color: var(--md-sys-color-primary);
	}
	.login-card h1 { color: var(--md-sys-color-on-surface); margin: 0; }
	.login-card p { color: var(--md-sys-color-on-surface-variant); margin: 0; }
</style>
