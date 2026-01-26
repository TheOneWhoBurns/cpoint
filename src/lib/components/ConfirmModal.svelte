<script lang="ts">
	import '@material/web/button/filled-button.js';
	import '@material/web/button/outlined-button.js';
	import '@material/web/iconbutton/icon-button.js';

	type Variant = 'default' | 'danger' | 'warning';

	let {
		open = $bindable(false),
		title = 'Confirm',
		message = '',
		confirmText = 'Confirm',
		cancelText = 'Cancel',
		onConfirm = () => {},
		onCancel = () => {},
		variant = 'default' as Variant
	} = $props();

	function handleConfirm() {
		onConfirm();
		open = false;
	}

	function handleCancel() {
		onCancel();
		open = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleCancel();
		}
	}

	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			handleCancel();
		}
	}

	const iconName = $derived(
		variant === 'danger' ? 'warning' :
		variant === 'warning' ? 'help' : 'info'
	);
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

{#if open}
	<div class="modal-overlay" onclick={handleOverlayClick}>
		<div class="modal-content" class:danger={variant === 'danger'} class:warning={variant === 'warning'}>
			<div class="modal-header">
				<div class="modal-title">
					<div class="icon-container" class:danger={variant === 'danger'} class:warning={variant === 'warning'}>
						<span class="material-symbols-rounded">{iconName}</span>
					</div>
					<h2 class="md-headline-small">{title}</h2>
				</div>
				<md-icon-button onclick={handleCancel}>
					<span class="material-symbols-rounded">close</span>
				</md-icon-button>
			</div>
			<div class="modal-body">
				<p class="md-body-large">{message}</p>
			</div>
			<div class="modal-actions">
				<md-outlined-button onclick={handleCancel}>{cancelText}</md-outlined-button>
				{#if variant === 'danger'}
					<md-filled-button class="danger-btn" onclick={handleConfirm}>
						<span class="material-symbols-rounded" slot="icon">check</span>
						{confirmText}
					</md-filled-button>
				{:else if variant === 'warning'}
					<md-filled-button class="warning-btn" onclick={handleConfirm}>
						<span class="material-symbols-rounded" slot="icon">check</span>
						{confirmText}
					</md-filled-button>
				{:else}
					<md-filled-button onclick={handleConfirm}>
						<span class="material-symbols-rounded" slot="icon">check</span>
						{confirmText}
					</md-filled-button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 200;
		padding: var(--md-sys-spacing-md);
		animation: md-animate-fade-in 0.2s var(--md-sys-motion-easing-standard);
	}

	.modal-content {
		background: var(--md-sys-color-surface);
		border-radius: var(--md-sys-shape-corner-extra-large);
		max-width: 400px;
		width: 100%;
		animation: md-animate-scale-in 0.3s var(--md-sys-motion-easing-emphasized-decelerate);
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--md-sys-spacing-lg);
		border-bottom: 1px solid var(--md-sys-color-outline-variant);
	}

	.modal-title {
		display: flex;
		align-items: center;
		gap: var(--md-sys-spacing-sm);
	}

	.icon-container {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--md-sys-shape-corner-full);
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
	}

	.icon-container.danger {
		background: var(--md-sys-color-error-container);
		color: var(--md-sys-color-on-error-container);
	}

	.icon-container.warning {
		background: var(--md-sys-color-warning-container);
		color: var(--md-sys-color-on-warning-container);
	}

	.icon-container .material-symbols-rounded {
		font-size: 24px;
	}

	.modal-title h2 {
		margin: 0;
		color: var(--md-sys-color-on-surface);
	}

	.modal-content.danger .modal-title h2 {
		color: var(--md-sys-color-error);
	}

	.modal-content.warning .modal-title h2 {
		color: var(--md-sys-color-warning);
	}

	.modal-body {
		padding: var(--md-sys-spacing-lg);
	}

	.modal-body p {
		margin: 0;
		color: var(--md-sys-color-on-surface-variant);
		line-height: 1.6;
	}

	.modal-actions {
		display: flex;
		gap: var(--md-sys-spacing-sm);
		justify-content: flex-end;
		padding: var(--md-sys-spacing-lg);
		border-top: 1px solid var(--md-sys-color-outline-variant);
		background: var(--md-sys-color-surface-container-low);
	}

	.danger-btn {
		--md-filled-button-container-color: var(--md-sys-color-error);
		--md-filled-button-label-text-color: var(--md-sys-color-on-error);
	}

	.warning-btn {
		--md-filled-button-container-color: var(--md-sys-color-warning);
		--md-filled-button-label-text-color: var(--md-sys-color-on-warning);
	}

	@keyframes md-animate-fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes md-animate-scale-in {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
