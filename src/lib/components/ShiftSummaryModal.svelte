<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/textfield/outlined-text-field.js';
	import '@material/web/iconbutton/icon-button.js';
	import '@material/web/checkbox/checkbox.js';

	let {
		open = $bindable(false),
		shiftSummary = null as any,
		loading = false,
		onEndShift
	}: {
		open: boolean;
		shiftSummary: any;
		loading?: boolean;
		onEndShift: () => Promise<void>;
	} = $props();

	let cashCounted = $state('');
	let checklistItems = $state<Array<{ id: number; label: string }>>([]);
	let closeChecklist = $state<Record<number, boolean>>({});
	let ending = $state(false);

	export function setChecklist(items: Array<{ id: number; label: string }>) {
		checklistItems = items;
		closeChecklist = {};
		for (const item of items) {
			closeChecklist[item.id] = false;
		}
	}

	function formatShiftDuration(startedAt: string): string {
		const start = new Date(startedAt);
		const now = new Date();
		const diffMs = now.getTime() - start.getTime();
		const hours = Math.floor(diffMs / 3600000);
		const minutes = Math.floor((diffMs % 3600000) / 60000);
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}

	const cashDifference = $derived(() => {
		if (!shiftSummary || cashCounted === '') return null;
		const counted = parseFloat(cashCounted);
		if (isNaN(counted)) return null;
		return counted - shiftSummary.totalCash;
	});

	const allChecklistComplete = $derived(
		checklistItems.length === 0 || Object.values(closeChecklist).every(v => v)
	);

	function close() {
		if (ending) return;
		open = false;
		cashCounted = '';
	}
</script>

{#if open && shiftSummary}
	<div class="modal-overlay" onclick={close} onkeydown={(e) => { if (e.key === 'Escape') close(); }}>
		<div class="modal-content large" role="dialog" aria-modal="true" aria-labelledby="shift-summary-title" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<div class="modal-title">
					<span class="material-symbols-rounded">fact_check</span>
					<h2 id="shift-summary-title" class="md-headline-small">Close Shift</h2>
				</div>
				<md-icon-button onclick={close} aria-label="Close">
					<span class="material-symbols-rounded">close</span>
				</md-icon-button>
			</div>
			<div class="modal-body">
				{#if shiftSummary.activeRentalsCount > 0}
					<div class="close-shift-warning">
						<span class="material-symbols-rounded">warning</span>
						<div>
							<span class="md-title-small">{shiftSummary.activeRentalsCount} active rental{shiftSummary.activeRentalsCount > 1 ? 's' : ''} still out</span>
							<span class="md-body-small">Close or return all rentals before ending your shift</span>
						</div>
					</div>
				{/if}
				<div class="close-shift-info">
					<div class="close-shift-info-item">
						<span class="material-symbols-rounded">schedule</span>
						<div>
							<span class="md-body-small">Shift Duration</span>
							<span class="md-title-small">{formatShiftDuration(shiftSummary.shiftStartedAt)}</span>
						</div>
					</div>
					<div class="close-shift-info-item">
						<span class="material-symbols-rounded">confirmation_number</span>
						<div>
							<span class="md-body-small">Total Transactions</span>
							<span class="md-title-small">{shiftSummary.rentalsCount + shiftSummary.storeSalesCount + shiftSummary.tourBookingsCount}</span>
						</div>
					</div>
					<div class="close-shift-info-item">
						<span class="material-symbols-rounded">attach_money</span>
						<div>
							<span class="md-body-small">Total Revenue</span>
							<span class="md-title-small">${shiftSummary.totalRevenue.toFixed(2)}</span>
						</div>
					</div>
				</div>
				<div class="summary-section">
					<div class="summary-header">
						<span class="material-symbols-rounded">receipt_long</span>
						<span class="md-title-medium">Revenue Breakdown</span>
					</div>
					{#if shiftSummary.rentalsCount > 0}
						<div class="summary-row">
							<span class="md-body-medium">Rentals ({shiftSummary.rentalsCount})</span>
							<span class="md-title-medium">${(shiftSummary.rentalsCash + shiftSummary.rentalsCredit).toFixed(2)}</span>
						</div>
					{/if}
					{#if shiftSummary.storeSalesCount > 0}
						<div class="summary-row">
							<span class="md-body-medium">Store Sales ({shiftSummary.storeSalesCount})</span>
							<span class="md-title-medium">${shiftSummary.storeSalesTotal.toFixed(2)}</span>
						</div>
					{/if}
					{#if shiftSummary.tourBookingsCount > 0}
						<div class="summary-row">
							<span class="md-body-medium">Tours ({shiftSummary.tourBookingsCount})</span>
							<span class="md-title-medium">${shiftSummary.tourRevenue.toFixed(2)}</span>
						</div>
						<div class="summary-row">
							<span class="md-body-medium" style="padding-left: var(--md-sys-spacing-lg)">Tour Cost</span>
							<span class="md-title-medium" style="color: var(--md-sys-color-error)">-${shiftSummary.tourCost.toFixed(2)}</span>
						</div>
					{/if}
					{#if shiftSummary.rentalsUnpaid > 0}
						<div class="summary-row" style="border-top: 1px solid var(--md-sys-color-outline-variant); padding-top: var(--md-sys-spacing-sm); margin-top: var(--md-sys-spacing-xs);">
							<span class="md-body-medium" style="color: var(--md-sys-color-error)">Unpaid</span>
							<span class="md-title-medium" style="color: var(--md-sys-color-error)">${shiftSummary.rentalsUnpaid.toFixed(2)}</span>
						</div>
					{/if}
				</div>
				<div class="summary-section totals">
					<div class="summary-header">
						<span class="material-symbols-rounded">payments</span>
						<span class="md-title-medium">Cash Reconciliation</span>
					</div>
					<div class="summary-row total">
						<span class="md-body-medium">Expected Cash</span>
						<span class="md-headline-small">${shiftSummary.totalCash.toFixed(2)}</span>
					</div>
					<div class="summary-row total">
						<span class="md-body-medium">Credit Card</span>
						<span class="md-headline-small">${shiftSummary.totalCredit.toFixed(2)}</span>
					</div>
					<div class="cash-count-input">
						<md-outlined-text-field label="Cash counted in drawer" type="number" value={cashCounted} oninput={(e: Event) => cashCounted = (e.target as HTMLInputElement).value}>
							<span class="material-symbols-rounded" slot="leading-icon">point_of_sale</span>
						</md-outlined-text-field>
						{#if cashDifference() !== null}
							{@const diff = cashDifference()}
							<div class="cash-difference" class:cash-over={diff !== null && diff > 0} class:cash-short={diff !== null && diff < 0} class:cash-match={diff !== null && diff === 0}>
								<span class="material-symbols-rounded">
									{diff !== null && diff === 0 ? 'check_circle' : diff !== null && diff > 0 ? 'arrow_upward' : 'arrow_downward'}
								</span>
								<span class="md-title-small">
									{#if diff !== null && diff === 0}Cash matches expected
									{:else if diff !== null && diff > 0}Over by ${diff.toFixed(2)}
									{:else if diff !== null}Short by ${Math.abs(diff).toFixed(2)}
									{/if}
								</span>
							</div>
						{/if}
					</div>
				</div>
				{#if checklistItems.length > 0}
					<div class="summary-section">
						<div class="summary-header">
							<span class="material-symbols-rounded">checklist</span>
							<span class="md-title-medium">Closing Checklist</span>
						</div>
						{#each checklistItems as item (item.id)}
							<label class="checklist-item">
								<md-checkbox checked={closeChecklist[item.id] ?? false} onchange={(e: Event) => closeChecklist[item.id] = (e.target as HTMLInputElement).checked}></md-checkbox>
								<div class="checklist-label">
									<span class="md-body-medium">{item.label}</span>
								</div>
							</label>
						{/each}
					</div>
				{/if}
			</div>
			<div class="modal-footer">
				<md-outlined-button onclick={close} disabled={ending}>Cancel</md-outlined-button>
				<md-filled-button class="danger-btn" onclick={async () => { ending = true; try { await onEndShift(); close(); } finally { ending = false; } }} disabled={ending}>
					<span class="material-symbols-rounded" slot="icon">assignment</span>
					{ending ? 'Ending Shift...' : 'End Shift & Export Report'}
				</md-filled-button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 100; padding: var(--md-sys-spacing-md); animation: fade-in 0.2s var(--md-sys-motion-easing-standard); }
	.modal-content { background: var(--md-sys-color-surface); border-radius: var(--md-sys-shape-corner-extra-large); max-width: 500px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; animation: scale-in 0.3s var(--md-sys-motion-easing-emphasized); }
	.modal-content.large { max-width: 700px; }
	.modal-header { display: flex; justify-content: space-between; align-items: center; padding: var(--md-sys-spacing-lg); border-bottom: 1px solid var(--md-sys-color-outline-variant); flex-shrink: 0; }
	.modal-title { display: flex; align-items: center; gap: var(--md-sys-spacing-md); }
	.modal-title .material-symbols-rounded { font-size: 32px; color: var(--md-sys-color-primary); }
	.modal-title h2 { margin: 0; color: var(--md-sys-color-on-surface); }
	.modal-body { padding: var(--md-sys-spacing-lg); display: flex; flex-direction: column; gap: var(--md-sys-spacing-xl); overflow-y: auto; flex: 1; min-height: 0; }
	.modal-footer { display: flex; justify-content: flex-end; gap: var(--md-sys-spacing-lg); padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg) var(--md-sys-spacing-lg); border-top: 1px solid var(--md-sys-color-outline-variant); flex-shrink: 0; }
	.close-shift-warning { display: flex; align-items: flex-start; gap: var(--md-sys-spacing-md); padding: var(--md-sys-spacing-md); background: var(--md-sys-color-error-container); border-radius: var(--md-sys-shape-corner-medium); border: 1px solid var(--md-sys-color-error); }
	.close-shift-warning > .material-symbols-rounded { font-size: 28px; color: var(--md-sys-color-error); flex-shrink: 0; }
	.close-shift-warning > div { display: flex; flex-direction: column; gap: var(--md-sys-spacing-xs); }
	.close-shift-warning .md-title-small { color: var(--md-sys-color-on-error-container); }
	.close-shift-warning .md-body-small { color: var(--md-sys-color-on-error-container); opacity: 0.8; }
	.close-shift-info { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--md-sys-spacing-md); }
	.close-shift-info-item { display: flex; align-items: center; gap: var(--md-sys-spacing-sm); padding: var(--md-sys-spacing-md); background: var(--md-sys-color-surface-container-low); border-radius: var(--md-sys-shape-corner-medium); }
	.close-shift-info-item > .material-symbols-rounded { font-size: 24px; color: var(--md-sys-color-primary); flex-shrink: 0; }
	.close-shift-info-item > div { display: flex; flex-direction: column; gap: 2px; }
	.close-shift-info-item .md-body-small { color: var(--md-sys-color-on-surface-variant); }
	.close-shift-info-item .md-title-small { color: var(--md-sys-color-on-surface); }
	.summary-section { background: var(--md-sys-color-surface-container-low); border-radius: var(--md-sys-shape-corner-medium); padding: var(--md-sys-spacing-md); }
	.summary-section.totals { background: var(--md-sys-color-secondary-container); border: 2px solid var(--md-sys-color-primary); }
	.summary-header { display: flex; align-items: center; gap: var(--md-sys-spacing-sm); margin-bottom: var(--md-sys-spacing-md); padding-bottom: var(--md-sys-spacing-md); border-bottom: 1px solid var(--md-sys-color-outline-variant); }
	.summary-header .material-symbols-rounded { font-size: 28px; color: var(--md-sys-color-primary); flex-shrink: 0; }
	.summary-section.totals .summary-header .material-symbols-rounded { color: var(--md-sys-color-on-secondary-container); }
	.summary-row { display: flex; justify-content: space-between; align-items: center; padding: var(--md-sys-spacing-sm) 0; }
	.summary-row .md-body-medium { color: var(--md-sys-color-on-surface-variant); }
	.summary-row .md-title-medium { color: var(--md-sys-color-primary); }
	.summary-row.total .md-headline-small { color: var(--md-sys-color-on-secondary-container); }
	.summary-section.totals .summary-row .md-body-medium { color: var(--md-sys-color-on-secondary-container); }
	.cash-count-input { margin-top: var(--md-sys-spacing-md); display: flex; flex-direction: column; gap: var(--md-sys-spacing-sm); }
	.cash-count-input md-outlined-text-field { width: 100%; }
	.cash-difference { display: flex; align-items: center; gap: var(--md-sys-spacing-sm); padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md); border-radius: var(--md-sys-shape-corner-small); }
	.cash-difference .material-symbols-rounded { font-size: 20px; }
	.cash-match { background: #e8f5e9; color: #2e7d32; }
	.cash-over { background: #fff3e0; color: #e65100; }
	.cash-short { background: var(--md-sys-color-error-container); color: var(--md-sys-color-error); }
	.checklist-item { display: flex; align-items: center; gap: var(--md-sys-spacing-md); padding: var(--md-sys-spacing-sm) 0; cursor: pointer; }
	.checklist-label { flex: 1; }
	.checklist-label .md-body-medium { color: var(--md-sys-color-on-surface); }
	.danger-btn { --md-filled-button-container-color: var(--md-sys-color-error); --md-filled-button-label-text-color: var(--md-sys-color-on-error); }
	@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
	@keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
</style>
