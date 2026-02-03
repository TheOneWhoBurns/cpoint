<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import '@material/web/iconbutton/icon-button.js';
	import '@material/web/switch/switch.js';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';

	let { data } = $props();

	let itemLabel = $state('');
	let loading = $state(false);
	let error = $state('');

	let confirmDeleteItem = $state(false);
	let pendingDeleteItemId = $state<number | null>(null);

	let editingId = $state<number | null>(null);
	let editingLabel = $state('');

	async function createItem() {
		if (!itemLabel.trim()) {
			error = 'Item label required';
			return;
		}

		loading = true;
		error = '';

		const res = await fetch('/api/closing-checklist', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ label: itemLabel })
		});

		if (res.ok) {
			itemLabel = '';
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed to create item';
		}
		loading = false;
	}

	async function toggleActive(id: number, isActive: boolean) {
		loading = true;
		const res = await fetch('/api/closing-checklist', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, isActive: !isActive })
		});
		if (res.ok) await invalidateAll();
		loading = false;
	}

	async function moveItem(id: number, direction: 'up' | 'down') {
		const items = data.checklistItems;
		const idx = items.findIndex(i => i.id === id);
		if (idx < 0) return;
		const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
		if (swapIdx < 0 || swapIdx >= items.length) return;

		loading = true;
		// Swap sort orders
		await fetch('/api/closing-checklist', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: items[idx].id, sortOrder: items[swapIdx].sortOrder })
		});
		await fetch('/api/closing-checklist', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: items[swapIdx].id, sortOrder: items[idx].sortOrder })
		});
		await invalidateAll();
		loading = false;
	}

	function startEditing(id: number, label: string) {
		editingId = id;
		editingLabel = label;
	}

	async function saveEdit() {
		if (!editingId || !editingLabel.trim()) return;
		loading = true;
		const res = await fetch('/api/closing-checklist', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: editingId, label: editingLabel.trim() })
		});
		if (res.ok) {
			editingId = null;
			editingLabel = '';
			await invalidateAll();
		}
		loading = false;
	}

	function cancelEdit() {
		editingId = null;
		editingLabel = '';
	}

	function promptDelete(id: number) {
		pendingDeleteItemId = id;
		confirmDeleteItem = true;
	}

	async function executeDelete() {
		if (!pendingDeleteItemId) return;
		loading = true;
		error = '';

		const res = await fetch('/api/closing-checklist', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: pendingDeleteItemId })
		});

		if (res.ok) {
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed to delete';
		}
		loading = false;
		pendingDeleteItemId = null;
	}
</script>

<div class="checklist-page">
	<!-- Add Item Card -->
	<section class="card">
		<div class="card-header">
			<span class="material-symbols-rounded">playlist_add</span>
			<h2 class="md-title-large">Add Checklist Item</h2>
		</div>
		<div class="card-content">
			<div class="form-row">
				<md-outlined-text-field
					label="Checklist item"
					placeholder="e.g., Cash drawer counted and verified"
					value={itemLabel}
					oninput={(e: Event) => itemLabel = (e.target as HTMLInputElement).value}
					disabled={loading}
					onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') createItem(); }}
				>
					<span class="material-symbols-rounded" slot="leading-icon">check_box</span>
				</md-outlined-text-field>
				<md-filled-button onclick={createItem} disabled={loading || !itemLabel.trim()}>
					<span class="material-symbols-rounded" slot="icon">add</span>
					Add
				</md-filled-button>
			</div>

			{#if error}
				<div class="error-message">
					<span class="material-symbols-rounded">error</span>
					<span class="md-body-medium">{error}</span>
				</div>
			{/if}
		</div>
	</section>

	<!-- Checklist Items -->
	<section class="card">
		<div class="card-header">
			<span class="material-symbols-rounded">checklist</span>
			<h2 class="md-title-large">Closing Checklist Items</h2>
			<span class="badge md-label-medium">{data.checklistItems.length}</span>
		</div>

		{#if data.checklistItems.length === 0}
			<div class="empty-state">
				<span class="material-symbols-rounded">checklist</span>
				<p class="md-body-medium">No checklist items yet</p>
				<p class="md-body-small">Add items above that clerks must check off before closing a shift</p>
			</div>
		{:else}
			<div class="items-list">
				{#each data.checklistItems as item, idx}
					<div class="checklist-row" class:inactive={!item.isActive}>
						<div class="reorder-buttons">
							<md-icon-button
								onclick={() => moveItem(item.id, 'up')}
								disabled={loading || idx === 0}
								aria-label="Move up"
							>
								<span class="material-symbols-rounded">arrow_upward</span>
							</md-icon-button>
							<md-icon-button
								onclick={() => moveItem(item.id, 'down')}
								disabled={loading || idx === data.checklistItems.length - 1}
								aria-label="Move down"
							>
								<span class="material-symbols-rounded">arrow_downward</span>
							</md-icon-button>
						</div>

						<div class="item-content">
							{#if editingId === item.id}
								<div class="edit-row">
									<md-outlined-text-field
										label="Label"
										value={editingLabel}
										oninput={(e: Event) => editingLabel = (e.target as HTMLInputElement).value}
										disabled={loading}
										onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
									></md-outlined-text-field>
									<md-icon-button onclick={saveEdit} disabled={loading} aria-label="Save">
										<span class="material-symbols-rounded">check</span>
									</md-icon-button>
									<md-icon-button onclick={cancelEdit} aria-label="Cancel">
										<span class="material-symbols-rounded">close</span>
									</md-icon-button>
								</div>
							{:else}
								<span class="material-symbols-rounded item-icon">check_box_outline_blank</span>
								<span class="md-body-large item-label">{item.label}</span>
							{/if}
						</div>

						<div class="item-actions">
							{#if editingId !== item.id}
								<md-icon-button
									onclick={() => startEditing(item.id, item.label)}
									disabled={loading}
									aria-label="Edit item"
								>
									<span class="material-symbols-rounded">edit</span>
								</md-icon-button>
							{/if}
							<label class="switch-label">
								<md-switch
									selected={item.isActive}
									onchange={() => toggleActive(item.id, item.isActive ?? true)}
									disabled={loading}
									aria-label="Toggle item active"
								></md-switch>
							</label>
							<md-icon-button
								onclick={() => promptDelete(item.id)}
								disabled={loading}
								aria-label="Delete item"
							>
								<span class="material-symbols-rounded delete-icon">delete</span>
							</md-icon-button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>

<ConfirmModal
	bind:open={confirmDeleteItem}
	title="Delete Checklist Item"
	message="Are you sure you want to delete this checklist item? This action cannot be undone."
	confirmText="Delete"
	cancelText="Cancel"
	variant="danger"
	onConfirm={executeDelete}
/>

<style>
	.checklist-page {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-lg);
		max-width: 800px;
	}

	/* Card Styles */
	.card {
		background: var(--md-sys-color-surface);
		border-radius: var(--md-sys-shape-corner-large);
		border: 1px solid var(--md-sys-color-outline-variant);
		overflow: hidden;
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-lg);
		border-bottom: 1px solid var(--md-sys-color-outline-variant);
		background: var(--md-sys-color-surface-container-low);
	}

	.card-header .material-symbols-rounded {
		color: var(--md-sys-color-primary);
		font-size: 24px;
	}

	.card-header h2 {
		flex: 1;
		margin: 0;
		color: var(--md-sys-color-on-surface);
	}

	.card-content {
		padding: var(--md-sys-spacing-lg);
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-md);
	}

	.badge {
		background: var(--md-sys-color-secondary-container);
		color: var(--md-sys-color-on-secondary-container);
		padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm);
		border-radius: var(--md-sys-shape-corner-full);
	}

	/* Form */
	.form-row {
		display: flex;
		gap: var(--md-sys-spacing-md);
		align-items: flex-start;
	}

	.form-row md-outlined-text-field {
		flex: 1;
	}

	.form-row md-filled-button {
		margin-top: 8px;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
		border-radius: var(--md-sys-shape-corner-small);
	}

	.error-message .material-symbols-rounded {
		font-size: 20px;
	}

	/* Items List */
	.items-list {
		display: flex;
		flex-direction: column;
	}

	.checklist-row {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-lg);
		border-bottom: 1px solid var(--md-sys-color-outline-variant);
		transition: background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
	}

	.checklist-row:last-child {
		border-bottom: none;
	}

	.checklist-row:hover {
		background: var(--md-sys-color-surface-container);
	}

	.checklist-row.inactive {
		opacity: 0.6;
	}

	.reorder-buttons {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.reorder-buttons md-icon-button {
		--md-icon-button-icon-size: 18px;
	}

	.item-content {
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		min-width: 0;
	}

	.item-icon {
		font-size: 20px;
		color: var(--md-sys-color-on-surface-variant);
		flex-shrink: 0;
	}

	.item-label {
		color: var(--md-sys-color-on-surface);
	}

	.edit-row {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		flex: 1;
	}

	.edit-row md-outlined-text-field {
		flex: 1;
	}

	.item-actions {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-xs);
		flex-shrink: 0;
	}

	.delete-icon {
		color: var(--md-sys-color-error);
	}

	/* Empty State */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
		padding: var(--md-sys-spacing-xxl);
		color: var(--md-sys-color-on-surface-variant);
	}

	.empty-state .material-symbols-rounded {
		font-size: 48px;
		opacity: 0.5;
	}
</style>
