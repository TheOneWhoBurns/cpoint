<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import '@material/web/button/filled-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';

	let { data } = $props();

	let guideName = $state('');
	let guidePasscode = $state('');
	let guideCooldown = $state('30');
	let loading = $state(false);
	let error = $state('');

	let confirmDeleteGuide = $state(false);
	let pendingDeleteGuideId = $state<number | null>(null);

	async function createGuide() {
		if (!guideName.trim()) {
			error = 'Guide name required';
			return;
		}

		if (!guidePasscode || guidePasscode.length !== 4 || !/^\d{4}$/.test(guidePasscode)) {
			error = 'Passcode must be 4 digits';
			return;
		}

		const cooldown = parseInt(guideCooldown) || 30;
		if (cooldown < 0) {
			error = 'Cooldown must be positive';
			return;
		}

		loading = true;
		error = '';

		const res = await fetch('/api/guides', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: guideName,
				passcode: guidePasscode,
				cooldownMinutes: cooldown
			})
		});

		if (res.ok) {
			guideName = '';
			guidePasscode = '';
			guideCooldown = '30';
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed to create guide';
		}
		loading = false;
	}

	async function updateCooldown(id: number, newCooldown: number) {
		loading = true;
		error = '';

		const res = await fetch('/api/guides', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, cooldownMinutes: newCooldown })
		});

		if (res.ok) {
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed to update';
		}
		loading = false;
	}

	async function toggleActive(id: number, isActive: boolean) {
		loading = true;
		error = '';

		const res = await fetch('/api/guides', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, isActive: !isActive })
		});

		if (res.ok) {
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed to update';
		}
		loading = false;
	}

	function promptDeleteGuide(id: number) {
		pendingDeleteGuideId = id;
		confirmDeleteGuide = true;
	}

	async function executeDeleteGuide() {
		if (!pendingDeleteGuideId) return;
		loading = true;
		error = '';

		const res = await fetch('/api/guides', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: pendingDeleteGuideId })
		});

		if (res.ok) {
			await invalidateAll();
		} else {
			const d = await res.json();
			error = d.error || 'Failed to delete';
		}
		loading = false;
		pendingDeleteGuideId = null;
	}
</script>

<h1>Guides</h1>

<section>
	<h2>Add Guide</h2>
	<div style="display: flex; flex-direction: column; gap: 1rem; max-width: 400px;">
		<md-outlined-text-field
			label="Guide Name *"
			value={guideName}
			oninput={(e: Event) => guideName = (e.target as HTMLInputElement).value}
			disabled={loading}
		></md-outlined-text-field>

		<md-outlined-text-field
			label="4-Digit Passcode/PIN *"
			type="password"
			maxlength="4"
			pattern="[0-9]*"
			inputmode="numeric"
			value={guidePasscode}
			oninput={(e: Event) => guidePasscode = (e.target as HTMLInputElement).value}
			disabled={loading}
		></md-outlined-text-field>

		<md-outlined-text-field
			label="Cooldown (minutes)"
			type="number"
			min="0"
			value={guideCooldown}
			oninput={(e: Event) => guideCooldown = (e.target as HTMLInputElement).value}
			disabled={loading}
		></md-outlined-text-field>

		{#if error}<p style="color: var(--md-sys-color-error);">{error}</p>{/if}

		<md-filled-button onclick={createGuide} disabled={loading}>
			Add Guide
		</md-filled-button>
	</div>
</section>

<section style="margin-top: 2rem;">
	<h2>Guides</h2>
	{#if data.guides.length === 0}
		<p>No guides added yet</p>
	{:else}
		<table style="width: 100%; border-collapse: collapse;">
			<thead>
				<tr>
					<th style="text-align: left; padding: 0.5rem;">Name</th>
					<th style="text-align: left; padding: 0.5rem;">Cooldown (min)</th>
					<th style="text-align: left; padding: 0.5rem;">Status</th>
					<th style="text-align: left; padding: 0.5rem;">Last Rental</th>
					<th style="text-align: left; padding: 0.5rem;">In Cooldown</th>
					<th style="text-align: left; padding: 0.5rem;">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each data.guides as guide}
					<tr>
						<td style="padding: 0.5rem;">{guide.name}</td>
						<td style="padding: 0.5rem;">
							<input
								type="number"
								min="0"
								value={guide.cooldownMinutes}
								onchange={(e: Event) => updateCooldown(guide.id, parseInt((e.target as HTMLInputElement).value) || 0)}
								disabled={loading}
								style="width: 80px; padding: 0.25rem;"
							/>
						</td>
						<td style="padding: 0.5rem;">{guide.isActive ? 'Active' : 'Inactive'}</td>
						<td style="padding: 0.5rem; font-size: 0.875rem;">
							{guide.lastRentalEnd ? new Date(guide.lastRentalEnd).toLocaleString() : 'Never'}
						</td>
						<td style="padding: 0.5rem; font-size: 0.875rem;">
							{#if guide.inCooldown}
								<span style="color: var(--md-sys-color-error);">Yes ({guide.minutesRemaining}min)</span>
							{:else}
								<span style="color: var(--md-sys-color-primary);">No</span>
							{/if}
						</td>
						<td style="padding: 0.5rem; display: flex; gap: 0.5rem;">
							<button
								onclick={() => toggleActive(guide.id, guide.isActive)}
								disabled={loading}
								style="font-size: 0.75rem;"
							>
								{guide.isActive ? 'Deactivate' : 'Activate'}
							</button>
							<button
								onclick={() => promptDeleteGuide(guide.id)}
								disabled={loading}
								style="color: var(--md-sys-color-error); font-size: 0.75rem;"
							>
								Delete
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

<ConfirmModal
	bind:open={confirmDeleteGuide}
	title="Delete Guide"
	message="Are you sure you want to delete this guide? This action cannot be undone."
	confirmText="Delete"
	cancelText="Cancel"
	variant="danger"
	onConfirm={executeDeleteGuide}
/>
