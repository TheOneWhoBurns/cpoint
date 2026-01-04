<script lang="ts">
	let { data } = $props();

	function getCategoryName(id: number) {
		return data.categories.find(c => c.id === id)?.name || 'Unknown';
	}

	const trackedCategories = $derived(data.categories.filter(c => c.trackingType === 'tracked'));
	const genericCategories = $derived(data.categories.filter(c => c.trackingType === 'generic'));
</script>

<h1>Inventory</h1>
<p>All registered equipment. Register new items in the Equipment section.</p>

<section style="margin-top: 1rem;">
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
					<td style="padding: 0.5rem; color: {item.status === 'available' ? 'green' : 'orange'};">{item.status}</td>
				</tr>
			{/each}
			{#if data.trackedItems.length === 0}
				<tr><td colspan="3" style="padding: 0.5rem;">No tracked items</td></tr>
			{/if}
		</tbody>
	</table>
</section>

<section style="margin-top: 2rem;">
	<h2>Generic Items</h2>
	<table style="width: 100%; border-collapse: collapse;">
		<thead>
			<tr>
				<th style="text-align: left; padding: 0.5rem;">Category</th>
				<th style="text-align: left; padding: 0.5rem;">Available</th>
				<th style="text-align: left; padding: 0.5rem;">Total</th>
			</tr>
		</thead>
		<tbody>
			{#each genericCategories as cat}
				<tr>
					<td style="padding: 0.5rem;">{cat.name}</td>
					<td style="padding: 0.5rem; color: {(cat.availableQuantity ?? 0) > 0 ? 'green' : 'red'};">{cat.availableQuantity}</td>
					<td style="padding: 0.5rem;">{cat.totalQuantity}</td>
				</tr>
			{/each}
			{#if genericCategories.length === 0}
				<tr><td colspan="3" style="padding: 0.5rem;">No generic categories</td></tr>
			{/if}
		</tbody>
	</table>
</section>
