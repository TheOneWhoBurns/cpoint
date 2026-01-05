<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import '@material/web/button/filled-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';

	let { data } = $props();

	let categoryName = $state('');
	let trackingType = $state('tracked');
	let selectedCategoryId = $state(0);
	let itemCode = $state('');
	let genericQuantity = $state('1');
	let loading = $state(false);
	let error = $state('');

	let confirmDeleteCategory = $state(false);
	let pendingDeleteCategoryId = $state<number | null>(null);
	let confirmDeleteItem = $state(false);
	let pendingDeleteItemId = $state<number | null>(null);

	$effect(() => {
		if (data.categories.length > 0 && !selectedCategoryId) {
			selectedCategoryId = data.categories[0].id;
		}
	});

	function getSelectedCategory() {
		return data.categories.find(c => c.id === selectedCategoryId);
	}

	async function createCategory() {
		if (!categoryName) {
			error = 'Name required';
			return;
		}
		loading = true;
		error = '';

		const res = await fetch('/api/equipment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'createCategory', name: categoryName, trackingType })
		});

		if (res.ok) {
			categoryName = '';
			trackingType = 'tracked';
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed';
		}
		loading = false;
	}

	async function addEquipment() {
		const cat = getSelectedCategory();
		if (!cat) {
			error = 'Select a category';
			return;
		}

		loading = true;
		error = '';

		let body: Record<string, unknown>;
		if (cat.trackingType === 'tracked') {
			if (!itemCode) {
				error = 'Code required';
				loading = false;
				return;
			}
			body = { action: 'addTrackedItem', categoryId: selectedCategoryId, code: itemCode };
		} else {
			const qty = parseInt(genericQuantity) || 1;
			if (qty < 1) {
				error = 'Quantity must be at least 1';
				loading = false;
				return;
			}
			body = { action: 'addGenericQuantity', categoryId: selectedCategoryId, quantity: qty };
		}

		const res = await fetch('/api/equipment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});

		if (res.ok) {
			itemCode = '';
			genericQuantity = '1';
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed';
		}
		loading = false;
	}

	function getCategoryName(id: number) {
		return data.categories.find(c => c.id === id)?.name || 'Unknown';
	}

	function promptDeleteCategory(id: number) {
		pendingDeleteCategoryId = id;
		confirmDeleteCategory = true;
	}

	async function executeDeleteCategory() {
		if (!pendingDeleteCategoryId) return;
		loading = true;
		error = '';

		const res = await fetch('/api/equipment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'deleteCategory', categoryId: pendingDeleteCategoryId })
		});

		if (res.ok) {
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed to delete';
		}
		loading = false;
		pendingDeleteCategoryId = null;
	}

	function promptDeleteItem(id: number) {
		pendingDeleteItemId = id;
		confirmDeleteItem = true;
	}

	async function executeDeleteItem() {
		if (!pendingDeleteItemId) return;
		loading = true;
		error = '';

		const res = await fetch('/api/equipment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'deleteTrackedItem', itemId: pendingDeleteItemId })
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

	async function updateGenericQuantity(id: number, newAvailable: number) {
		loading = true;
		error = '';

		const res = await fetch('/api/equipment', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, availableQuantity: newAvailable })
		});

		if (res.ok) {
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed to update';
		}
		loading = false;
	}
</script>

<h1>Equipment</h1>

<section>
	<h2>Create Category</h2>
	<div style="display: flex; flex-direction: column; gap: 1rem; max-width: 400px;">
		<md-outlined-text-field
			label="Category Name (e.g., Surfboards, Leashes)"
			value={categoryName}
			oninput={(e: Event) => categoryName = (e.target as HTMLInputElement).value}
		></md-outlined-text-field>

		<div>
			<label>
				<input type="radio" bind:group={trackingType} value="tracked" /> Tracked (unique items, register one by one)
			</label>
			<br/>
			<label>
				<input type="radio" bind:group={trackingType} value="generic" /> Generic (quantity-based, add multiple at once)
			</label>
		</div>

		<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
		<md-filled-button onclick={createCategory} disabled={loading}>
			Create Category
		</md-filled-button>
	</div>
</section>

<section style="margin-top: 2rem;">
	<h2>Categories</h2>
	<table style="width: 100%; border-collapse: collapse;">
		<thead>
			<tr>
				<th style="text-align: left; padding: 0.5rem;">Name</th>
				<th style="text-align: left; padding: 0.5rem;">Type</th>
				<th style="text-align: left; padding: 0.5rem;">Quantity</th>
				<th style="text-align: left; padding: 0.5rem;">Status</th>
				<th style="text-align: left; padding: 0.5rem;">Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each data.categories as cat}
				<tr>
					<td style="padding: 0.5rem;">{cat.name}</td>
					<td style="padding: 0.5rem;">{cat.trackingType}</td>
					<td style="padding: 0.5rem;">
						{#if cat.trackingType === 'generic'}
							<div style="display: flex; gap: 0.5rem; align-items: center;">
								<input
									type="number"
									min="0"
									value={cat.availableQuantity ?? 0}
									onchange={(e: Event) => updateGenericQuantity(cat.id, parseInt((e.target as HTMLInputElement).value) || 0)}
									style="width: 80px;"
								/>
								<span>/{cat.totalQuantity}</span>
							</div>
						{:else}
							{data.trackedItems.filter(t => t.productTypeId === cat.id).length} items
						{/if}
					</td>
					<td style="padding: 0.5rem;">{cat.isActive ? 'Active' : 'Inactive'}</td>
					<td style="padding: 0.5rem;">
						<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
						<button onclick={() => promptDeleteCategory(cat.id)} style="color: var(--md-sys-color-error);">
							Delete
						</button>
					</td>
				</tr>
			{/each}
			{#if data.categories.length === 0}
				<tr><td colspan="5" style="padding: 0.5rem;">No categories yet</td></tr>
			{/if}
		</tbody>
	</table>
	{#if error}<p style="color: var(--md-sys-color-error); margin-top: 1rem;">{error}</p>{/if}
</section>

<section style="margin-top: 2rem;">
	<h2>Register Equipment</h2>
	{#if data.categories.length === 0}
		<p>Create a category first.</p>
	{:else}
		<div style="display: flex; flex-direction: column; gap: 1rem; max-width: 400px;">
			<select bind:value={selectedCategoryId}>
				{#each data.categories as cat}
					<option value={cat.id}>{cat.name} ({cat.trackingType})</option>
				{/each}
			</select>

			{#if getSelectedCategory()?.trackingType === 'tracked'}
				<md-outlined-text-field
					label="Item Code (e.g., SURF-001)"
					value={itemCode}
					oninput={(e: Event) => itemCode = (e.target as HTMLInputElement).value}
				></md-outlined-text-field>
				<p style="font-size: 0.875rem; color: var(--md-sys-color-on-surface-variant);">
					Register items one by one. Each needs a unique code.
				</p>
			{:else}
				<md-outlined-text-field
					label="Quantity to add"
					type="number"
					min="1"
					value={genericQuantity}
					oninput={(e: Event) => genericQuantity = (e.target as HTMLInputElement).value}
				></md-outlined-text-field>
				<p style="font-size: 0.875rem; color: var(--md-sys-color-on-surface-variant);">
					Add multiple items at once. Current: {getSelectedCategory()?.totalQuantity ?? 0} total.
				</p>
			{/if}

			<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
			<md-filled-button onclick={addEquipment} disabled={loading}>
				{getSelectedCategory()?.trackingType === 'tracked' ? 'Register Item' : 'Add Quantity'}
			</md-filled-button>
		</div>
		{#if error}<p style="color: var(--md-sys-color-error);">{error}</p>{/if}
	{/if}
</section>

<section style="margin-top: 2rem;">
	<h2>Tracked Items</h2>
	<table style="width: 100%; border-collapse: collapse;">
		<thead>
			<tr>
				<th style="text-align: left; padding: 0.5rem;">Category</th>
				<th style="text-align: left; padding: 0.5rem;">Code</th>
				<th style="text-align: left; padding: 0.5rem;">Status</th>
				<th style="text-align: left; padding: 0.5rem;">Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each data.trackedItems as item}
				<tr>
					<td style="padding: 0.5rem;">{getCategoryName(item.productTypeId ?? 0)}</td>
					<td style="padding: 0.5rem;">{item.code}</td>
					<td style="padding: 0.5rem;">{item.status}</td>
					<td style="padding: 0.5rem;">
						<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
						<button onclick={() => promptDeleteItem(item.id)} style="color: var(--md-sys-color-error);">
							Delete
						</button>
					</td>
				</tr>
			{/each}
			{#if data.trackedItems.length === 0}
				<tr><td colspan="4" style="padding: 0.5rem;">No tracked items registered</td></tr>
			{/if}
		</tbody>
	</table>
</section>

<ConfirmModal
	bind:open={confirmDeleteCategory}
	title="Delete Category"
	message="Are you sure you want to delete this category? This action cannot be undone."
	confirmText="Delete"
	cancelText="Cancel"
	variant="danger"
	onConfirm={executeDeleteCategory}
/>

<ConfirmModal
	bind:open={confirmDeleteItem}
	title="Delete Item"
	message="Are you sure you want to delete this tracked item? This action cannot be undone."
	confirmText="Delete"
	cancelText="Cancel"
	variant="danger"
	onConfirm={executeDeleteItem}
/>
