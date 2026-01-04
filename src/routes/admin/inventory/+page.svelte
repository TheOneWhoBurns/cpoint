<script lang="ts">
	let { data } = $props();

	function getTypeName(id: number) {
		return data.types.find(t => t.id === id)?.name || 'Unknown';
	}
</script>

<h1>Inventory</h1>
<p>All registered equipment. Register new items in the Equipment section.</p>

<section style="margin-top: 1rem;">
	<h2>Tracked Items</h2>
	<table style="width: 100%; border-collapse: collapse;">
		<thead>
			<tr>
				<th style="text-align: left; padding: 0.5rem;">Type</th>
				<th style="text-align: left; padding: 0.5rem;">Code</th>
				<th style="text-align: left; padding: 0.5rem;">Status</th>
			</tr>
		</thead>
		<tbody>
			{#each data.trackedItems as item}
				<tr>
					<td style="padding: 0.5rem;">{getTypeName(item.productTypeId ?? 0)}</td>
					<td style="padding: 0.5rem;">{item.code}</td>
					<td style="padding: 0.5rem;">{item.status}</td>
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
				<th style="text-align: left; padding: 0.5rem;">Type</th>
				<th style="text-align: left; padding: 0.5rem;">Name</th>
				<th style="text-align: left; padding: 0.5rem;">Total</th>
				<th style="text-align: left; padding: 0.5rem;">Available</th>
			</tr>
		</thead>
		<tbody>
			{#each data.genericItems as item}
				<tr>
					<td style="padding: 0.5rem;">{getTypeName(item.productTypeId ?? 0)}</td>
					<td style="padding: 0.5rem;">{item.name}</td>
					<td style="padding: 0.5rem;">{item.totalQuantity}</td>
					<td style="padding: 0.5rem;">{item.availableQuantity}</td>
				</tr>
			{/each}
			{#if data.genericItems.length === 0}
				<tr><td colspan="4" style="padding: 0.5rem;">No generic items</td></tr>
			{/if}
		</tbody>
	</table>
</section>
