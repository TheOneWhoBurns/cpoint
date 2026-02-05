<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/iconbutton/icon-button.js';

	let {
		open = $bindable(false),
		conflictData = [] as any[],
		loading = false,
		onOverride
	}: {
		open: boolean;
		conflictData: any[];
		loading?: boolean;
		onOverride: (passcode: string) => Promise<void>;
	} = $props();

	let conflictPasscode = $state('');
	let conflictPasscodeError = $state('');

	function formatDate(date: string | Date): string {
		return new Date(date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function close() {
		open = false;
		conflictPasscode = '';
		conflictPasscodeError = '';
	}

	async function handleOverride() {
		if (!conflictPasscode || conflictPasscode.length !== 4) {
			conflictPasscodeError = 'Enter 4-digit passcode';
			return;
		}
		conflictPasscodeError = '';
		try {
			await onOverride(conflictPasscode);
			close();
		} catch (e: any) {
			if (e.message === 'invalid_passcode') {
				conflictPasscodeError = 'Invalid passcode';
			} else {
				close();
			}
		}
	}
</script>

{#if open}
	<div class="modal-overlay" onclick={close} onkeydown={(e) => { if (e.key === 'Escape') close(); }} style="z-index: 300;">
		<div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="conflict-override-title" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<div class="modal-title">
					<span class="material-symbols-rounded" style="color: var(--md-sys-color-error);">warning</span>
					<h2 id="conflict-override-title" class="md-headline-small">Reservation Conflict</h2>
				</div>
				<md-icon-button onclick={close} aria-label="Close">
					<span class="material-symbols-rounded">close</span>
				</md-icon-button>
			</div>
			<div class="modal-body">
				<div class="conflict-warning">
					<p class="md-body-medium">The selected equipment conflicts with the following reservation(s). Proceeding will override these holds.</p>
				</div>
				{#each conflictData as conflict}
					{@const conflictCustomer = conflict.customer as {name?: string} | null}
					<div class="conflict-card">
						<div class="conflict-header">
							<span class="material-symbols-rounded">event</span>
							<span class="md-title-medium">{conflictCustomer?.name || conflict.reason || `Reservation #${conflict.id}`}</span>
						</div>
						{#if conflict.reason && conflictCustomer?.name}
							<p class="md-body-small" style="margin: 0; color: var(--md-sys-color-on-surface-variant);">{conflict.reason}</p>
						{/if}
						<div class="conflict-dates">
							<span class="md-body-small">{formatDate(conflict.reservedFrom)} — {formatDate(conflict.reservedUntil)}</span>
						</div>
						<div class="rental-items-list">
							{#each conflict.items as item}
								<div class="item-chip">
									<span class="material-symbols-rounded icon-sm">qr_code_2</span>
									<span class="md-body-small">{item.name}{item.code ? ` (${item.code})` : ''}</span>
								</div>
							{/each}
						</div>
					</div>
				{/each}
				<div class="form-section">
					<label class="form-label">
						<span class="material-symbols-rounded">lock</span>
						<span class="md-title-small">Enter passcode to override</span>
					</label>
					<div class="passcode-input-row">
						<input type="password" maxlength="4" placeholder="4-digit passcode" bind:value={conflictPasscode} class="passcode-input" />
					</div>
					{#if conflictPasscodeError}
						<div class="error-banner">
							<span class="material-symbols-rounded">error</span>
							<span class="md-body-medium">{conflictPasscodeError}</span>
						</div>
					{/if}
				</div>
			</div>
			<div class="modal-footer">
				<md-outlined-button onclick={close} disabled={loading}>Cancel</md-outlined-button>
				<md-filled-button class="danger-btn" onclick={handleOverride} disabled={loading || conflictPasscode.length !== 4}>
					<span class="material-symbols-rounded" slot="icon">warning</span>
					Override & Create Rental
				</md-filled-button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 300; padding: var(--md-sys-spacing-md); animation: fade-in 0.2s var(--md-sys-motion-easing-standard); }
	.modal-content { background: var(--md-sys-color-surface); border-radius: var(--md-sys-shape-corner-extra-large); max-width: 500px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; animation: scale-in 0.3s var(--md-sys-motion-easing-emphasized); }
	.modal-header { display: flex; justify-content: space-between; align-items: center; padding: var(--md-sys-spacing-lg); border-bottom: 1px solid var(--md-sys-color-outline-variant); flex-shrink: 0; }
	.modal-title { display: flex; align-items: center; gap: var(--md-sys-spacing-md); }
	.modal-title h2 { margin: 0; color: var(--md-sys-color-on-surface); }
	.modal-body { padding: var(--md-sys-spacing-lg); display: flex; flex-direction: column; gap: var(--md-sys-spacing-xl); overflow-y: auto; flex: 1; min-height: 0; }
	.modal-footer { display: flex; justify-content: flex-end; gap: var(--md-sys-spacing-lg); padding: var(--md-sys-spacing-md) var(--md-sys-spacing-lg) var(--md-sys-spacing-lg); border-top: 1px solid var(--md-sys-color-outline-variant); flex-shrink: 0; }
	.conflict-warning { background: var(--md-sys-color-error-container); color: var(--md-sys-color-on-error-container); padding: var(--md-sys-spacing-md); border-radius: var(--md-sys-shape-corner-medium); }
	.conflict-warning p { margin: 0; }
	.conflict-card { background: var(--md-sys-color-surface-container-low); border: 1px solid var(--md-sys-color-outline-variant); border-radius: var(--md-sys-shape-corner-medium); padding: var(--md-sys-spacing-md); display: flex; flex-direction: column; gap: var(--md-sys-spacing-sm); }
	.conflict-header { display: flex; align-items: center; gap: var(--md-sys-spacing-sm); }
	.conflict-header .material-symbols-rounded { font-size: 24px; color: var(--md-sys-color-error); }
	.conflict-dates { color: var(--md-sys-color-on-surface-variant); }
	.rental-items-list { display: flex; flex-wrap: wrap; gap: var(--md-sys-spacing-xs); }
	.item-chip { display: flex; align-items: center; gap: var(--md-sys-spacing-xs); padding: var(--md-sys-spacing-xs) var(--md-sys-spacing-sm); background: var(--md-sys-color-surface-container-high); border-radius: var(--md-sys-shape-corner-small); }
	.form-section { display: flex; flex-direction: column; gap: var(--md-sys-spacing-md); }
	.form-label { display: flex; align-items: center; gap: var(--md-sys-spacing-sm); color: var(--md-sys-color-on-surface); font: var(--md-sys-typescale-title-small); }
	.form-label .material-symbols-rounded { font-size: 24px; color: var(--md-sys-color-primary); }
	.passcode-input-row { display: flex; gap: var(--md-sys-spacing-sm); align-items: center; }
	.passcode-input { flex: 1; padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md); border: 1px solid var(--md-sys-color-outline); border-radius: var(--md-sys-shape-corner-small); font: var(--md-sys-typescale-body-large); background: var(--md-sys-color-surface); color: var(--md-sys-color-on-surface); }
	.passcode-input:focus { outline: none; border-color: var(--md-sys-color-primary); }
	.error-banner { display: flex; align-items: center; gap: var(--md-sys-spacing-sm); padding: var(--md-sys-spacing-md); background: var(--md-sys-color-error-container); color: var(--md-sys-color-on-error-container); border-radius: var(--md-sys-shape-corner-small); }
	.error-banner .material-symbols-rounded { font-size: 20px; }
	.danger-btn { --md-filled-button-container-color: var(--md-sys-color-error); --md-filled-button-label-text-color: var(--md-sys-color-on-error); }
	.icon-sm { font-size: 18px; }
	@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
	@keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
</style>
