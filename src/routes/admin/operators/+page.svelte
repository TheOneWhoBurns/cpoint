<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/textfield/outlined-text-field.js';

	let { data } = $props();

	let name = $state('');
	let passcode = $state('');
	let loading = $state(false);
	let error = $state('');

	async function createOperator() {
		if (!name || passcode.length !== 4) {
			error = 'Name required, passcode must be 4 digits';
			return;
		}
		loading = true;
		error = '';

		const res = await fetch('/api/operators', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name, passcode })
		});

		if (res.ok) {
			name = '';
			passcode = '';
			location.reload();
		} else {
			const d = await res.json();
			error = d.error || 'Failed';
		}
		loading = false;
	}

	async function toggleOperator(id: string, isActive: boolean) {
		await fetch('/api/operators', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, isActive: !isActive })
		});
		location.reload();
	}
</script>

<h1>Operators</h1>

<section>
	<h2>Add Operator</h2>
	<div style="display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap;">
		<md-outlined-text-field
			label="Name"
			value={name}
			oninput={(e: Event) => name = (e.target as HTMLInputElement).value}
		></md-outlined-text-field>
		<md-outlined-text-field
			label="Passcode (4 digits)"
			type="password"
			maxlength="4"
			value={passcode}
			oninput={(e: Event) => passcode = (e.target as HTMLInputElement).value}
		></md-outlined-text-field>
		<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
		<md-filled-button onclick={createOperator} disabled={loading}>
			Add Operator
		</md-filled-button>
	</div>
	{#if error}<p style="color: var(--md-sys-color-error);">{error}</p>{/if}
</section>

<section style="margin-top: 2rem;">
	<h2>All Operators</h2>
	<table style="width: 100%; border-collapse: collapse;">
		<thead>
			<tr>
				<th style="text-align: left; padding: 0.5rem;">Name</th>
				<th style="text-align: left; padding: 0.5rem;">Status</th>
				<th style="text-align: left; padding: 0.5rem;">Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each data.operators as op}
				<tr>
					<td style="padding: 0.5rem;">{op.name}</td>
					<td style="padding: 0.5rem;">{op.isActive ? 'Active' : 'Inactive'}</td>
					<td style="padding: 0.5rem;">
						<button onclick={() => toggleOperator(op.id, op.isActive)}>
							{op.isActive ? 'Deactivate' : 'Activate'}
						</button>
					</td>
				</tr>
			{/each}
			{#if data.operators.length === 0}
				<tr><td colspan="3" style="padding: 0.5rem;">No operators yet</td></tr>
			{/if}
		</tbody>
	</table>
</section>
