<script lang="ts">
	import '../app.css';
	import { shiftStore } from '$lib/stores/shift';
	import { themeStore } from '$lib/stores/theme';

	let { children, data } = $props();

	// Initialize theme store (triggers side effects on import)
	$effect(() => {
		// Keep subscription active so OS theme changes are reflected
		return themeStore.subscribe(() => {});
	});

	$effect(() => {
		if (data.operator && data.shift) {
			shiftStore.setSession(data.operator, data.shift);
		} else {
			shiftStore.clearSession();
		}
	});
</script>

<svelte:head>
	<title>Rental Manager</title>
</svelte:head>

{@render children()}
