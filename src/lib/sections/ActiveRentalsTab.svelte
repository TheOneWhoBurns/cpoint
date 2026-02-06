<script lang="ts">
	import RentalCard from '$lib/components/RentalCard.svelte';
	import CreateRentalModal from '$lib/components/CreateRentalModal.svelte';
	import EditRentalModal from '$lib/components/EditRentalModal.svelte';
	import CloseRentalModal from '$lib/components/CloseRentalModal.svelte';
	import ConflictOverrideModal from '$lib/components/ConflictOverrideModal.svelte';
	import {
		createRental,
		createRentalWithOverride,
		closeRental,
		editRental
	} from '$lib/services/rental.service';
	import { verifyGuidePin } from '$lib/services/guide.service';
	import { toastStore } from '$lib/stores/toast';

	let {
		rentals,
		products,
		trackedItems,
		categories,
		guides,
		shiftId,
		operatorId,
		prefillFromReservation = null,
		fromReservationId = null,
		onDataChanged,
		onPromptDelete,
		onClearPrefill
	}: {
		rentals: any[];
		products: any[];
		trackedItems: any[];
		categories: any[];
		guides: any[];
		shiftId: number;
		operatorId: number;
		prefillFromReservation?: any;
		fromReservationId?: number | null;
		onDataChanged: () => void;
		onPromptDelete: (type: string, id: number, label: string) => void;
		onClearPrefill: () => void;
	} = $props();

	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let showCloseModal = $state(false);
	let showConflictModal = $state(false);
	let createLoading = $state(false);
	let conflictLoading = $state(false);
	let selectedRental = $state<any>(null);
	let conflictData = $state<any[]>([]);
	let pendingPayload = $state<any>(null);
	let createFromReservationId = $state<number | null>(null);

	$effect(() => {
		if (prefillFromReservation) {
			createFromReservationId = fromReservationId;
			showCreateModal = true;
		}
	});

	async function handleCreate(payload: any) {
		createLoading = true;
		try {
			await createRental(payload);
			showCreateModal = false;
			createFromReservationId = null;
			onClearPrefill();
			toastStore.success('Rental created');
			onDataChanged();
		} catch (err: any) {
			if (err.conflicts) {
				conflictData = err.conflicts;
				pendingPayload = payload;
				showConflictModal = true;
			} else {
				toastStore.error(err.message || 'Failed to create rental');
			}
		} finally {
			createLoading = false;
		}
	}

	async function handleConflictOverride(passcode: string) {
		if (!pendingPayload) return;
		conflictLoading = true;
		try {
			const overrideIds = conflictData.map((c: any) => c.id);
			await createRentalWithOverride(pendingPayload, overrideIds, passcode, operatorId);
			showConflictModal = false;
			showCreateModal = false;
			conflictData = [];
			pendingPayload = null;
			createFromReservationId = null;
			onClearPrefill();
			toastStore.success('Rental created (reservation override)');
			onDataChanged();
		} catch (err: any) {
			toastStore.error(err.message || 'Override failed');
		} finally {
			conflictLoading = false;
		}
	}

	async function handleEdit(data: any) {
		if (!selectedRental) return;
		try {
			await editRental(selectedRental.id, data);
			showEditModal = false;
			toastStore.success('Rental updated');
			onDataChanged();
		} catch (err: any) {
			toastStore.error(err.message || 'Failed to update rental');
		}
	}

	async function handleClose(returnData: any) {
		if (!selectedRental) return;
		try {
			await closeRental(selectedRental.id, returnData, shiftId);
			showCloseModal = false;
			toastStore.success('Rental closed');
			onDataChanged();
		} catch (err: any) {
			toastStore.error(err.message || 'Failed to close rental');
		}
	}

	function openEdit(id: number) {
		selectedRental = rentals.find(r => r.id === id);
		if (selectedRental) showEditModal = true;
	}

	function openClose(id: number) {
		selectedRental = rentals.find(r => r.id === id);
		if (selectedRental) showCloseModal = true;
	}

	export function openCreateModal() {
		createFromReservationId = null;
		showCreateModal = true;
	}
</script>

{#if rentals.length === 0}
	<div class="empty-state">
		<span class="material-symbols-rounded empty-icon">pedal_bike</span>
		<p class="md-body-large">No active rentals</p>
	</div>
{:else}
	<div class="card-grid">
		{#each rentals as rental (rental.id)}
			<RentalCard
				{rental}
				onEdit={openEdit}
				onDelete={(id, label) => onPromptDelete('rental', id, label)}
				onClose={openClose}
			/>
		{/each}
	</div>
{/if}

<CreateRentalModal
	bind:open={showCreateModal}
	{products}
	{trackedItems}
	{categories}
	{guides}
	bind:fromReservationId={createFromReservationId}
	prefillData={prefillFromReservation}
	bind:loading={createLoading}
	onSubmit={handleCreate}
	onVerifyPin={verifyGuidePin}
/>

{#if selectedRental}
	<EditRentalModal
		bind:open={showEditModal}
		rental={selectedRental}
		{trackedItems}
		{categories}
		{guides}
		onSave={handleEdit}
		onCancel={() => showEditModal = false}
		onVerifyPin={verifyGuidePin}
	/>

	<CloseRentalModal
		bind:open={showCloseModal}
		rental={selectedRental}
		{operatorId}
		onClose={handleClose}
		onCancel={() => showCloseModal = false}
	/>
{/if}

<ConflictOverrideModal
	bind:open={showConflictModal}
	{conflictData}
	loading={conflictLoading}
	onOverride={handleConflictOverride}
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
