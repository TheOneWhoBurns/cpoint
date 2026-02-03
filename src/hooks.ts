import type { Reroute } from '@sveltejs/kit';

function isAdminSubdomain(hostname: string): boolean {
	return hostname.startsWith('admin.');
}

export const reroute: Reroute = ({ url }) => {
	if (isAdminSubdomain(url.hostname)) {
		const { pathname } = url;
		// Don't reroute API paths or paths already under /admin
		if (!pathname.startsWith('/api') && !pathname.startsWith('/admin')) {
			return '/admin' + pathname;
		}
	}
};
