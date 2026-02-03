<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import '@material/web/button/filled-button.js';
	import '@material/web/button/filled-tonal-button.js';

	let { data } = $props();

	let from = $state(data.dateFrom);
	let to = $state(data.dateTo);

	function filter() {
		const params = new URLSearchParams();
		if (from) params.set('from', from);
		if (to) params.set('to', to);
		goto(`?${params.toString()}`);
	}

	function formatHours(h: number): string {
		const hrs = Math.floor(h);
		const mins = Math.round((h - hrs) * 60);
		return `${hrs}h ${mins}m`;
	}

	function formatDate(iso: string): string {
		const d = new Date(iso);
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function formatTime(iso: string): string {
		const d = new Date(iso);
		return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
	}

	const grandTotalShifts = $derived(data.summary.reduce((s: number, r: typeof data.summary[0]) => s + r.totalShifts, 0));
	const grandTotalHours = $derived(data.summary.reduce((s: number, r: typeof data.summary[0]) => s + r.totalHours, 0));
	const grandTotalActive = $derived(data.summary.reduce((s: number, r: typeof data.summary[0]) => s + r.activeShifts, 0));

	function exportUrl(): string {
		const params = new URLSearchParams();
		if (from) params.set('from', from);
		if (to) params.set('to', to);
		const adminBase = data.adminBase ?? '/admin';
		return `/api/admin/hours/export?${params.toString()}`;
	}
</script>

<div class="hours-page">
	<section class="card">
		<div class="card-header">
			<span class="material-symbols-rounded">filter_list</span>
			<h2 class="md-title-large">Date Range</h2>
		</div>
		<div class="card-content">
			<div class="filter-row">
				<label class="date-field">
					<span class="md-body-small">From</span>
					<input type="date" bind:value={from} />
				</label>
				<label class="date-field">
					<span class="md-body-small">To</span>
					<input type="date" bind:value={to} />
				</label>
				<md-filled-button onclick={filter}>
					<span class="material-symbols-rounded" slot="icon">search</span>
					Filter
				</md-filled-button>
				<md-filled-tonal-button onclick={() => window.open(exportUrl(), '_blank')}>
					<span class="material-symbols-rounded" slot="icon">download</span>
					Export Excel
				</md-filled-tonal-button>
			</div>
		</div>
	</section>

	<section class="card">
		<div class="card-header">
			<span class="material-symbols-rounded">summarize</span>
			<h2 class="md-title-large">Summary</h2>
			<span class="badge md-label-medium">{data.summary.length} operators</span>
		</div>
		{#if data.summary.length === 0}
			<div class="empty-state">
				<span class="material-symbols-rounded">hourglass_empty</span>
				<p class="md-body-medium">No shifts in this date range</p>
			</div>
		{:else}
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th class="md-title-small">Operator</th>
							<th class="md-title-small num">Shifts</th>
							<th class="md-title-small num">Total Hours</th>
							<th class="md-title-small num">Active</th>
						</tr>
					</thead>
					<tbody>
						{#each data.summary as row}
							<tr>
								<td class="md-body-medium">{row.operatorName}</td>
								<td class="md-body-medium num">{row.totalShifts}</td>
								<td class="md-body-medium num">{formatHours(row.totalHours)}</td>
								<td class="md-body-medium num">{row.activeShifts || '-'}</td>
							</tr>
						{/each}
					</tbody>
					<tfoot>
						<tr>
							<td class="md-title-small">Total</td>
							<td class="md-title-small num">{grandTotalShifts}</td>
							<td class="md-title-small num">{formatHours(grandTotalHours)}</td>
							<td class="md-title-small num">{grandTotalActive || '-'}</td>
						</tr>
					</tfoot>
				</table>
			</div>
		{/if}
	</section>

	<section class="card">
		<div class="card-header">
			<span class="material-symbols-rounded">list</span>
			<h2 class="md-title-large">Shift Details</h2>
			<span class="badge md-label-medium">{data.shifts.length} shifts</span>
		</div>
		{#if data.shifts.length === 0}
			<div class="empty-state">
				<span class="material-symbols-rounded">event_busy</span>
				<p class="md-body-medium">No shifts found</p>
			</div>
		{:else}
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th class="md-title-small">Operator</th>
							<th class="md-title-small">Date</th>
							<th class="md-title-small">Start</th>
							<th class="md-title-small">End</th>
							<th class="md-title-small num">Duration</th>
							<th class="md-title-small">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each data.shifts as shift}
							<tr>
								<td class="md-body-medium">{shift.operatorName}</td>
								<td class="md-body-medium">{formatDate(shift.startedAt)}</td>
								<td class="md-body-medium">{formatTime(shift.startedAt)}</td>
								<td class="md-body-medium">{shift.endedAt ? formatTime(shift.endedAt) : '-'}</td>
								<td class="md-body-medium num">{formatHours(shift.durationHours)}</td>
								<td>
									{#if shift.isActive}
										<span class="status-badge active">In Progress</span>
									{:else}
										<span class="status-badge completed">Completed</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>

<style>
	.hours-page {
		display: flex;
		flex-direction: column;
		gap: var(--md-sys-spacing-lg);
		max-width: 900px;
	}

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
	}

	.badge {
		background: var(--md-sys-color-secondary-container);
		color: var(--md-sys-color-on-secondary-container);
		padding: 4px 12px;
		border-radius: var(--md-sys-shape-corner-full);
	}

	.filter-row {
		display: flex;
		align-items: flex-end;
		gap: var(--md-sys-spacing-md);
		flex-wrap: wrap;
	}

	.date-field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.date-field .md-body-small {
		color: var(--md-sys-color-on-surface-variant);
	}

	.date-field input {
		padding: 10px 12px;
		border: 1px solid var(--md-sys-color-outline);
		border-radius: var(--md-sys-shape-corner-small);
		background: var(--md-sys-color-surface);
		color: var(--md-sys-color-on-surface);
		font: var(--md-sys-typescale-body-medium);
	}

	.table-wrap {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th, td {
		padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
		text-align: left;
		border-bottom: 1px solid var(--md-sys-color-outline-variant);
	}

	th {
		color: var(--md-sys-color-on-surface-variant);
	}

	td {
		color: var(--md-sys-color-on-surface);
	}

	.num {
		text-align: right;
	}

	tfoot td {
		border-top: 2px solid var(--md-sys-color-outline);
		border-bottom: none;
		font-weight: 500;
	}

	.status-badge {
		display: inline-block;
		padding: 2px 10px;
		border-radius: var(--md-sys-shape-corner-full);
		font: var(--md-sys-typescale-label-small);
	}

	.status-badge.active {
		background: var(--md-sys-color-tertiary-container);
		color: var(--md-sys-color-on-tertiary-container);
	}

	.status-badge.completed {
		background: var(--md-sys-color-success-container);
		color: var(--md-sys-color-on-success-container);
	}

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

	@media (max-width: 480px) {
		.filter-row {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
