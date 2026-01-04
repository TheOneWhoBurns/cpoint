<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/textfield/outlined-text-field.js';

	let { data } = $props();

	let typeName = $state('');
	let codePrefix = $state('');
	let trackingType = $state('tracked');

	let selectedTypeId = $state(0);
	let itemCode = $state('');
	let itemName = $state('');
	let itemQuantity = $state('1');

	let loading = $state(false);
	let error = $state('');

	$effect(() => {
		if (data.types.length > 0 && !selectedTypeId) {
			selectedTypeId = data.types[0].id;
		}
	});

	function getSelectedType() {
		return data.types.find(t => t.id === selectedTypeId);
	}

	async function createType() {
		if (!typeName || !codePrefix) {
			error = 'Name and code prefix required';
			return;
		}
		loading = true;
		error = '';

		const res = await fetch('/api/equipment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'createType', name: typeName, codePrefix, trackingType })
		});

		if (res.ok) {
			typeName = '';
			codePrefix = '';
			trackingType = 'tracked';
			location.reload();
		} else {
			const d = await res.json();
			error = d.error || 'Failed';
		}
		loading = false;
	}

	async function addItem() {
		const type = getSelectedType();
		if (!type) {
			error = 'Select an equipment type';
			return;
		}

		loading = true;
		error = '';

		let body: Record<string, unknown>;
		if (type.trackingType === 'tracked') {
			if (!itemCode) {
				error = 'Code required';
				loading = false;
				return;
			}
			body = { action: 'addTracked', productTypeId: selectedTypeId, code: itemCode };
		} else {
			if (!itemName) {
				error = 'Name required';
				loading = false;
				return;
			}
			body = { action: 'addGeneric', productTypeId: selectedTypeId, name: itemName, quantity: parseInt(itemQuantity) || 1 };
		}

		const res = await fetch('/api/equipment', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});

		if (res.ok) {
			itemCode = '';
			itemName = '';
			itemQuantity = '1';
			location.reload();
		} else {
			const d = await res.json();
			error = d.error || 'Failed';
		}
		loading = false;
	}

	async function toggleType(id: number, isActive: boolean) {
		await fetch('/api/equipment', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, isActive: !isActive })
		});
		location.reload();
	}

	function getTypeName(id: number) {
		return data.types.find(t => t.id === id)?.name || 'Unknown';
	}
</script>

<h1>Equipment</h1>

<section>
	<h2>Add Equipment Type</h2>
	<div style="display: flex; flex-direction: column; gap: 1rem; max-width: 400px;">
		<md-outlined-text-field
			label="Type Name (e.g., Surfboard)"
			value={typeName}
			oninput={(e: Event) => typeName = (e.target as HTMLInputElement).value}
		></md-outlined-text-field>

		<md-outlined-text-field
			label="Code Prefix (e.g., SURF)"
			value={codePrefix}
			oninput={(e: Event) => codePrefix = (e.target as HTMLInputElement).value}
		></md-outlined-text-field>

		<div>
			<label>
				<input type="radio" bind:group={trackingType} value="tracked" /> Tracked (unique IDs)
			</label>
			<label style="margin-left: 1rem;">
				<input type="radio" bind:group={trackingType} value="generic" /> Generic (quantity)
			</label>
		</div>

		<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
		<md-filled-button onclick={createType} disabled={loading}>
			Add Type
		</md-filled-button>
	</div>
</section>

<section style="margin-top: 2rem;">
	<h2>Equipment Types</h2>
	<table style="width: 100%; border-collapse: collapse;">
		<thead>
			<tr>
				<th style="text-align: left; padding: 0.5rem;">Name</th>
				<th style="text-align: left; padding: 0.5rem;">Prefix</th>
				<th style="text-align: left; padding: 0.5rem;">Tracking</th>
				<th style="text-align: left; padding: 0.5rem;">Status</th>
				<th style="text-align: left; padding: 0.5rem;">Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each data.types as t}
				<tr>
					<td style="padding: 0.5rem;">{t.name}</td>
					<td style="padding: 0.5rem;">{t.codePrefix}</td>
					<td style="padding: 0.5rem;">{t.trackingType}</td>
					<td style="padding: 0.5rem;">{t.isActive ? 'Active' : 'Inactive'}</td>
					<td style="padding: 0.5rem;">
						<button onclick={() => toggleType(t.id, t.isActive ?? true)}>
							{t.isActive ? 'Deactivate' : 'Activate'}
						</button>
					</td>
				</tr>
			{/each}
			{#if data.types.length === 0}
				<tr><td colspan="5" style="padding: 0.5rem;">No equipment types yet</td></tr>
			{/if}
		</tbody>
	</table>
</section>

<section style="margin-top: 2rem;">
	<h2>Register Equipment Item</h2>
	{#if data.types.length === 0}
		<p>Create an equipment type first.</p>
	{:else}
		<div style="display: flex; flex-direction: column; gap: 1rem; max-width: 400px;">
			<select bind:value={selectedTypeId}>
				{#each data.types as t}
					<option value={t.id}>{t.name} ({t.trackingType})</option>
				{/each}
			</select>

			{#if getSelectedType()?.trackingType === 'tracked'}
				<md-outlined-text-field
					label="Item Code (e.g., SURF-001)"
					value={itemCode}
					oninput={(e: Event) => itemCode = (e.target as HTMLInputElement).value}
				></md-outlined-text-field>
			{:else}
				<md-outlined-text-field
					label="Item Name (e.g., Bike Lock)"
					value={itemName}
					oninput={(e: Event) => itemName = (e.target as HTMLInputElement).value}
				></md-outlined-text-field>
				<md-outlined-text-field
					label="Quantity"
					type="number"
					value={itemQuantity}
					oninput={(e: Event) => itemQuantity = (e.target as HTMLInputElement).value}
				></md-outlined-text-field>
			{/if}

			<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
			<md-filled-button onclick={addItem} disabled={loading}>
				Register Item
			</md-filled-button>
		</div>
	{/if}
	{#if error}<p style="color: var(--md-sys-color-error);">{error}</p>{/if}
</section>
