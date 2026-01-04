<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/textfield/outlined-text-field.js';

	let { data } = $props();

	let customerName = $state('');
	let customerPhone = $state('');
	let hourlyRate = $state('');
	let fullDayRate = $state('');
	let selectedItems = $state<Array<{type: string, itemId: number, code?: string, name: string, quantity?: number}>>([]);
	let loading = $state(false);
	let error = $state('');

	function getTypeName(id: number) {
		return data.types.find(t => t.id === id)?.name || 'Unknown';
	}

	function addTrackedItem(item: typeof data.trackedItems[0]) {
		if (selectedItems.some(i => i.type === 'tracked' && i.itemId === item.id)) return;
		selectedItems = [...selectedItems, {
			type: 'tracked',
			itemId: item.id,
			code: item.code,
			name: `${getTypeName(item.productTypeId ?? 0)} - ${item.code}`
		}];
	}

	function addGenericItem(item: typeof data.genericItems[0], qty: number) {
		if (qty <= 0 || qty > item.availableQuantity) return;
		const existing = selectedItems.find(i => i.type === 'generic' && i.itemId === item.id);
		if (existing) {
			selectedItems = selectedItems.map(i =>
				i.type === 'generic' && i.itemId === item.id
					? {...i, quantity: qty}
					: i
			);
		} else {
			selectedItems = [...selectedItems, {
				type: 'generic',
				itemId: item.id,
				name: `${getTypeName(item.productTypeId ?? 0)} - ${item.name}`,
				quantity: qty
			}];
		}
	}

	function removeItem(index: number) {
		selectedItems = selectedItems.filter((_, i) => i !== index);
	}

	async function createRental() {
		if (selectedItems.length === 0) {
			error = 'Add at least one item';
			return;
		}

		const hourly = parseFloat(hourlyRate) || 0;
		const fullDay = parseFloat(fullDayRate) || 0;

		if (hourly === 0 && fullDay === 0) {
			error = 'Set hourly or full day price';
			return;
		}

		loading = true;
		error = '';

		const res = await fetch('/api/rentals', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				customer: { name: customerName, phone: customerPhone },
				items: selectedItems,
				pricing: { hourly, fullDay }
			})
		});

		if (res.ok) {
			customerName = '';
			customerPhone = '';
			hourlyRate = '';
			fullDayRate = '';
			selectedItems = [];
			location.reload();
		} else {
			const d = await res.json();
			error = d.error || 'Failed';
		}
		loading = false;
	}

	async function completeRental(id: number) {
		await fetch('/api/rentals', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, action: 'complete' })
		});
		location.reload();
	}

	let genericQty: Record<number, string> = $state({});
</script>

<h1>Rentals</h1>

<section>
	<h2>Create Rental</h2>

	<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
		<div>
			<h3>Customer</h3>
			<div style="display: flex; flex-direction: column; gap: 0.5rem; max-width: 300px;">
				<md-outlined-text-field
					label="Name"
					value={customerName}
					oninput={(e: Event) => customerName = (e.target as HTMLInputElement).value}
				></md-outlined-text-field>
				<md-outlined-text-field
					label="Phone"
					value={customerPhone}
					oninput={(e: Event) => customerPhone = (e.target as HTMLInputElement).value}
				></md-outlined-text-field>
			</div>

			<h3 style="margin-top: 1rem;">Pricing</h3>
			<div style="display: flex; gap: 1rem; max-width: 300px;">
				<md-outlined-text-field
					label="Hourly ($)"
					type="number"
					step="0.01"
					value={hourlyRate}
					oninput={(e: Event) => hourlyRate = (e.target as HTMLInputElement).value}
				></md-outlined-text-field>
				<md-outlined-text-field
					label="Full Day ($)"
					type="number"
					step="0.01"
					value={fullDayRate}
					oninput={(e: Event) => fullDayRate = (e.target as HTMLInputElement).value}
				></md-outlined-text-field>
			</div>

			<h3 style="margin-top: 1rem;">Selected Items</h3>
			{#if selectedItems.length === 0}
				<p>No items selected</p>
			{:else}
				<ul>
					{#each selectedItems as item, i}
						<li>
							{item.name} {item.quantity ? `x${item.quantity}` : ''}
							<button onclick={() => removeItem(i)}>x</button>
						</li>
					{/each}
				</ul>
			{/if}

			{#if error}<p style="color: var(--md-sys-color-error);">{error}</p>{/if}

			<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
			<md-filled-button onclick={createRental} disabled={loading} style="margin-top: 1rem;">
				Create Rental
			</md-filled-button>
		</div>

		<div>
			<h3>Available Tracked Items</h3>
			{#if data.trackedItems.length === 0}
				<p>No available tracked items</p>
			{:else}
				<ul>
					{#each data.trackedItems as item}
						<li>
							{getTypeName(item.productTypeId ?? 0)} - {item.code}
							<button onclick={() => addTrackedItem(item)}>Add</button>
						</li>
					{/each}
				</ul>
			{/if}

			<h3 style="margin-top: 1rem;">Available Generic Items</h3>
			{#if data.genericItems.length === 0}
				<p>No generic items</p>
			{:else}
				<ul>
					{#each data.genericItems.filter(g => g.availableQuantity > 0) as item}
						<li>
							{getTypeName(item.productTypeId ?? 0)} - {item.name} ({item.availableQuantity} avail)
							<input
								type="number"
								min="1"
								max={item.availableQuantity}
								value={genericQty[item.id] || '1'}
								oninput={(e: Event) => genericQty[item.id] = (e.target as HTMLInputElement).value}
								style="width: 50px;"
							/>
							<button onclick={() => addGenericItem(item, parseInt(genericQty[item.id]) || 1)}>Add</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
</section>

<section style="margin-top: 2rem;">
	<h2>Active Rentals</h2>
	<table style="width: 100%; border-collapse: collapse;">
		<thead>
			<tr>
				<th style="text-align: left; padding: 0.5rem;">ID</th>
				<th style="text-align: left; padding: 0.5rem;">Customer</th>
				<th style="text-align: left; padding: 0.5rem;">Items</th>
				<th style="text-align: left; padding: 0.5rem;">Pricing</th>
				<th style="text-align: left; padding: 0.5rem;">Status</th>
				<th style="text-align: left; padding: 0.5rem;">Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each data.rentals.filter(r => r.status === 'active') as rental}
				{@const customer = rental.customer as {name?: string, phone?: string} | null}
				{@const items = rental.items as Array<{name: string, quantity?: number}>}
				{@const pricing = rental.pricing as {hourly?: number, fullDay?: number}}
				<tr>
					<td style="padding: 0.5rem;">#{rental.id}</td>
					<td style="padding: 0.5rem;">{customer?.name || 'N/A'}</td>
					<td style="padding: 0.5rem;">{items.map(i => i.name + (i.quantity ? ` x${i.quantity}` : '')).join(', ')}</td>
					<td style="padding: 0.5rem;">
						{#if pricing.hourly}${pricing.hourly}/hr{/if}
						{#if pricing.hourly && pricing.fullDay} / {/if}
						{#if pricing.fullDay}${pricing.fullDay}/day{/if}
					</td>
					<td style="padding: 0.5rem;">{rental.status}</td>
					<td style="padding: 0.5rem;">
						<button onclick={() => completeRental(rental.id)}>Complete</button>
					</td>
				</tr>
			{/each}
			{#if data.rentals.filter(r => r.status === 'active').length === 0}
				<tr><td colspan="6" style="padding: 0.5rem;">No active rentals</td></tr>
			{/if}
		</tbody>
	</table>
</section>

<section style="margin-top: 2rem;">
	<h2>Completed Rentals</h2>
	<table style="width: 100%; border-collapse: collapse;">
		<thead>
			<tr>
				<th style="text-align: left; padding: 0.5rem;">ID</th>
				<th style="text-align: left; padding: 0.5rem;">Customer</th>
				<th style="text-align: left; padding: 0.5rem;">Items</th>
				<th style="text-align: left; padding: 0.5rem;">Returned</th>
			</tr>
		</thead>
		<tbody>
			{#each data.rentals.filter(r => r.status === 'completed') as rental}
				{@const customer = rental.customer as {name?: string} | null}
				{@const items = rental.items as Array<{name: string, quantity?: number}>}
				<tr>
					<td style="padding: 0.5rem;">#{rental.id}</td>
					<td style="padding: 0.5rem;">{customer?.name || 'N/A'}</td>
					<td style="padding: 0.5rem;">{items.map(i => i.name + (i.quantity ? ` x${i.quantity}` : '')).join(', ')}</td>
					<td style="padding: 0.5rem;">{rental.returnedAt ? new Date(rental.returnedAt).toLocaleString() : 'N/A'}</td>
				</tr>
			{/each}
			{#if data.rentals.filter(r => r.status === 'completed').length === 0}
				<tr><td colspan="4" style="padding: 0.5rem;">No completed rentals</td></tr>
			{/if}
		</tbody>
	</table>
</section>
