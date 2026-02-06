<script lang="ts">
	import ReservationCard from '$lib/components/ReservationCard.svelte';
	import CreateReservationModal from '$lib/components/CreateReservationModal.svelte';
	import EditReservationModal from '$lib/components/EditReservationModal.svelte';
	import { createReservation, editReservation, mapReservationToPrefill } from '$lib/services/reservation.service';
	import { verifyGuidePin } from '$lib/services/guide.service';
	import { toastStore } from '$lib/stores/toast';

	let {
		reservations,
		products,
		trackedItems,
		categories,
		guides,
		onDataChanged,
		onPromptDelete,
		onStartRentalFromReservation
	}: {
		reservations: any[];
		products: any[];
		trackedItems: any[];
		categories: any[];
		guides: any[];
		onDataChanged: () => void;
		onPromptDelete: (type: string, id: number, label: string) => void;
		onStartRentalFromReservation: (reservationId: number, prefill: any) => void;
	} = $props();

	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let createLoading = $state(false);
	let editLoading = $state(false);
	let selectedReservation = $state<any>(null);

	async function handleCreate(data: any) {
		createLoading = true;
		try {
			await createReservation(data);
			showCreateModal = false;
			toastStore.success('Reservation created');
			onDataChanged();
		} catch (err: any) {
			toastStore.error(err.message || 'Failed to create reservation');
		} finally {
			createLoading = false;
		}
	}

	async function handleEdit(id: number, data: any) {
		editLoading = true;
		try {
			await editReservation(id, data);
			showEditModal = false;
			toastStore.success('Reservation updated');
			onDataChanged();
		} catch (err: any) {
			toastStore.error(err.message || 'Failed to update reservation');
		} finally {
			editLoading = false;
		}
	}

	function openEdit(reservation: any) {
		selectedReservation = reservation;
		showEditModal = true;
	}

	function handleStartRental(reservation: any) {
		const prefill = mapReservationToPrefill(reservation, products);
		onStartRentalFromReservation(reservation.id, prefill);
	}

	export function openCreateModal() {
		showCreateModal = true;
	}
</script>

{#if reservations.length === 0}
	<div class="empty-state">
		<span class="material-symbols-rounded empty-icon">event</span>
		<p class="md-body-large">No active reservations</p>
	</div>
{:else}
	<div class="card-grid">
		{#each reservations as reservation (reservation.id)}
			<ReservationCard
				{reservation}
				onEdit={openEdit}
				onDelete={(id, label) => onPromptDelete('reservation', id, label)}
				onStartRental={handleStartRental}
			/>
		{/each}
	</div>
{/if}

<CreateReservationModal
	bind:open={showCreateModal}
	{products}
	{trackedItems}
	{categories}
	{guides}
	bind:loading={createLoading}
	onSubmit={handleCreate}
	onVerifyPin={verifyGuidePin}
/>

<EditReservationModal
	bind:open={showEditModal}
	reservation={selectedReservation}
	loading={editLoading}
	onSave={handleEdit}
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
