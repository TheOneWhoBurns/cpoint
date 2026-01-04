<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/textfield/outlined-text-field.js';

	let { data } = $props();

	let categoryName = $state('');
	let trackingType = $state('tracked');
	let selectedCategoryId = $state(0);
	let itemCode = $state('');
	let genericQuantity = $state('1');
	let loading = $state(false);
	let error = $state('');

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
			location.reload();
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
			location.reload();
		} else {
			const d = await res.json();
			error = d.error || 'Failed';
		}
		loading = false;
	}

	function getCategoryName(id: number) {
		return data.categories.find(c => c.id === id)?.name || 'Unknown';
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
			</tr>
		</thead>
		<tbody>
			{#each data.categories as cat}
				<tr>
					<td style="padding: 0.5rem;">{cat.name}</td>
					<td style="padding: 0.5rem;">{cat.trackingType}</td>
					<td style="padding: 0.5rem;">
						{#if cat.trackingType === 'generic'}
							{cat.availableQuantity}/{cat.totalQuantity}
						{:else}
							{data.trackedItems.filter(t => t.productTypeId === cat.id).length} items
						{/if}
					</td>
					<td style="padding: 0.5rem;">{cat.isActive ? 'Active' : 'Inactive'}</td>
				</tr>
			{/each}
			{#if data.categories.length === 0}
				<tr><td colspan="4" style="padding: 0.5rem;">No categories yet</td></tr>
			{/if}
		</tbody>
	</table>
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
			</tr>
		</thead>
		<tbody>
			{#each data.trackedItems as item}
				<tr>
					<td style="padding: 0.5rem;">{getCategoryName(item.productTypeId ?? 0)}</td>
					<td style="padding: 0.5rem;">{item.code}</td>
					<td style="padding: 0.5rem;">{item.status}</td>
				</tr>
			{/each}
			{#if data.trackedItems.length === 0}
				<tr><td colspan="3" style="padding: 0.5rem;">No tracked items registered</td></tr>
			{/if}
		</tbody>
	</table>
</section>
