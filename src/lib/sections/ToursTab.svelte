<script lang="ts">
	import TourBookingCard from '$lib/components/TourBookingCard.svelte';
	import TourBookingModal from '$lib/components/TourBookingModal.svelte';
	import EditTourModal from '$lib/components/EditTourModal.svelte';
	import CloseTourBookingModal from '$lib/components/CloseTourBookingModal.svelte';
	import { createTourBooking, editTourBooking, closeTourBooking } from '$lib/services/tour.service';
	import { verifyGuidePin } from '$lib/services/guide.service';
	import { toastStore } from '$lib/stores/toast';

	let {
		tourBookings,
		tourProducts,
		guides,
		shiftId,
		onDataChanged,
		onPromptDelete
	}: {
		tourBookings: any[];
		tourProducts: any[];
		guides: any[];
		shiftId: number;
		onDataChanged: () => void;
		onPromptDelete: (type: string, id: number, label: string) => void;
	} = $props();

	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let showCloseModal = $state(false);
	let createLoading = $state(false);
	let editLoading = $state(false);
	let closeLoading = $state(false);
	let selectedBooking = $state<any>(null);

	async function handleCreate(data: any) {
		createLoading = true;
		try {
			await createTourBooking({ ...data, shiftId, bookedAt: new Date().toISOString() });
			showCreateModal = false;
			toastStore.success('Tour booking created');
			onDataChanged();
		} catch (err: any) {
			toastStore.error(err.message || 'Failed to create booking');
		} finally {
			createLoading = false;
		}
	}

	async function handleEdit(id: number, data: any) {
		editLoading = true;
		try {
			await editTourBooking(id, data);
			showEditModal = false;
			toastStore.success('Tour booking updated');
			onDataChanged();
		} catch (err: any) {
			toastStore.error(err.message || 'Failed to update booking');
		} finally {
			editLoading = false;
		}
	}

	async function handleClose(id: number, cost: number) {
		closeLoading = true;
		try {
			await closeTourBooking(id, cost);
			showCloseModal = false;
			toastStore.success('Tour booking closed');
			onDataChanged();
		} catch (err: any) {
			toastStore.error(err.message || 'Failed to close booking');
		} finally {
			closeLoading = false;
		}
	}

	function openEdit(booking: any) {
		selectedBooking = booking;
		showEditModal = true;
	}

	function openClose(booking: any) {
		selectedBooking = booking;
		showCloseModal = true;
	}

	export function openCreateModal() {
		showCreateModal = true;
	}
</script>

{#if tourBookings.length === 0}
	<div class="empty-state">
		<span class="material-symbols-rounded empty-icon">tour</span>
		<p class="md-body-large">No active tour bookings</p>
	</div>
{:else}
	<div class="card-grid">
		{#each tourBookings as booking (booking.id)}
			<TourBookingCard
				{booking}
				onEdit={openEdit}
				onDelete={(id, label) => onPromptDelete('tourBooking', id, label)}
				onClose={openClose}
			/>
		{/each}
	</div>
{/if}

<TourBookingModal
	bind:open={showCreateModal}
	{tourProducts}
	{guides}
	bind:loading={createLoading}
	onSubmit={handleCreate}
	onVerifyPin={verifyGuidePin}
/>

<EditTourModal
	bind:open={showEditModal}
	booking={selectedBooking}
	{tourProducts}
	bind:loading={editLoading}
	onSave={handleEdit}
/>

<CloseTourBookingModal
	bind:open={showCloseModal}
	booking={selectedBooking}
	bind:loading={closeLoading}
	onSubmit={handleClose}
/>

<style>
	.card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: var(--md-sys-spacing-md);
		padding: var(--md-sys-spacing-lg);
	}
	.empty-state {
		display: flex; flex-direction: column; align-items: center;
		justify-content: center; padding: var(--md-sys-spacing-xxl) var(--md-sys-spacing-lg);
		color: var(--md-sys-color-on-surface-variant);
	}
	.empty-icon { font-size: 48px; opacity: 0.5; }
</style>
