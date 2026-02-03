import { google } from 'googleapis';
import { db } from '$lib/server/db';
import { appSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

const SCOPES = [
	'https://www.googleapis.com/auth/spreadsheets',
	'https://www.googleapis.com/auth/drive.file'
];

interface GoogleOAuthCredentials {
	clientId: string;
	clientSecret: string;
	origin: string;
}

/**
 * Reads Google OAuth credentials from DB first, then falls back to env vars.
 */
export async function getGoogleCredentials(): Promise<GoogleOAuthCredentials | null> {
	const [setting] = await db
		.select()
		.from(appSettings)
		.where(eq(appSettings.key, 'google_oauth_credentials'));

	if (setting?.value) {
		const creds = setting.value as GoogleOAuthCredentials;
		if (creds.clientId && creds.clientSecret) {
			return {
				clientId: creds.clientId,
				clientSecret: creds.clientSecret,
				origin: creds.origin || env.ORIGIN || ''
			};
		}
	}

	// Fallback to environment variables
	if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
		return {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
			origin: env.ORIGIN || ''
		};
	}

	return null;
}

export async function getOAuth2Client() {
	const creds = await getGoogleCredentials();
	if (!creds) {
		throw new Error('Google OAuth credentials not configured.');
	}
	return new google.auth.OAuth2(
		creds.clientId,
		creds.clientSecret,
		`${creds.origin}/api/google/callback`
	);
}

export async function getAuthUrl(state: string): Promise<string> {
	const client = await getOAuth2Client();
	return client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES,
		prompt: 'consent',
		state
	});
}

export async function handleCallback(code: string) {
	const client = await getOAuth2Client();
	const { tokens } = await client.getToken(code);

	await db
		.insert(appSettings)
		.values({
			key: 'google_tokens',
			value: tokens,
			updatedAt: new Date()
		})
		.onConflictDoUpdate({
			target: appSettings.key,
			set: { value: tokens, updatedAt: new Date() }
		});

	return tokens;
}

const CLIENT_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let cachedClient: InstanceType<typeof google.auth.OAuth2> | null = null;
let cachedAt = 0;

async function getAuthenticatedClient() {
	if (cachedClient && Date.now() - cachedAt < CLIENT_CACHE_TTL_MS) {
		return cachedClient;
	}

	// Clear stale client so listeners don't linger
	cachedClient = null;

	const [setting] = await db
		.select()
		.from(appSettings)
		.where(eq(appSettings.key, 'google_tokens'));

	if (!setting?.value) {
		throw new Error('Google account not connected. Please connect via Admin > Settings.');
	}

	const client = getOAuth2Client();
	client.setCredentials(setting.value as Record<string, unknown>);

	client.on('tokens', async (newTokens) => {
		// Read current tokens from DB to avoid merging with stale closure data
		const [current] = await db
			.select()
			.from(appSettings)
			.where(eq(appSettings.key, 'google_tokens'));
		const existing = (current?.value as Record<string, unknown>) || {};
		const merged = { ...existing, ...newTokens };
		await db
			.update(appSettings)
			.set({ value: merged, updatedAt: new Date() })
			.where(eq(appSettings.key, 'google_tokens'));
	});

	cachedClient = client;
	cachedAt = Date.now();
	return client;
}

export async function isGoogleConnected(): Promise<boolean> {
	const creds = await getGoogleCredentials();
	if (!creds) {
		return false;
	}
	const [setting] = await db
		.select()
		.from(appSettings)
		.where(eq(appSettings.key, 'google_tokens'));
	return !!setting?.value;
}

export function clearOAuthCache() {
	cachedClient = null;
	cachedAt = 0;
}

export async function disconnectGoogle() {
	cachedClient = null;
	cachedAt = 0;
	await db
		.delete(appSettings)
		.where(eq(appSettings.key, 'google_tokens'));
}

interface SheetData {
	name: string;
	headers: string[];
	rows: (string | number)[][];
}

export async function createSpreadsheet(title: string, sheets: SheetData[]): Promise<string> {
	const auth = await getAuthenticatedClient();
	const sheetsApi = google.sheets({ version: 'v4', auth });

	const spreadsheet = await sheetsApi.spreadsheets.create({
		requestBody: {
			properties: { title },
			sheets: sheets.map((s) => ({
				properties: { title: s.name }
			}))
		}
	});

	const spreadsheetId = spreadsheet.data.spreadsheetId;
	if (!spreadsheetId) {
		throw new Error('Google Sheets API did not return a spreadsheet ID');
	}

	const data = sheets.map((s) => ({
		range: `'${s.name}'!A1`,
		values: [s.headers, ...s.rows]
	}));

	await sheetsApi.spreadsheets.values.batchUpdate({
		spreadsheetId,
		requestBody: {
			valueInputOption: 'RAW',
			data
		}
	});

	// Auto-resize columns and bold headers
	const requests = sheets.map((s, i) => {
		const sheetId = spreadsheet.data.sheets![i].properties!.sheetId!;
		return [
			{
				repeatCell: {
					range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
					cell: {
						userEnteredFormat: { textFormat: { bold: true } }
					},
					fields: 'userEnteredFormat.textFormat.bold'
				}
			},
			{
				autoResizeDimensions: {
					dimensions: {
						sheetId,
						dimension: 'COLUMNS',
						startIndex: 0,
						endIndex: s.headers.length
					}
				}
			}
		];
	}).flat();

	await sheetsApi.spreadsheets.batchUpdate({
		spreadsheetId,
		requestBody: { requests }
	});

	// Share with configured email if set
	const [shareSetting] = await db
		.select()
		.from(appSettings)
		.where(eq(appSettings.key, 'google_share_email'));

	if (shareSetting?.value) {
		const drive = google.drive({ version: 'v3', auth });
		await drive.permissions.create({
			fileId: spreadsheetId,
			requestBody: {
				type: 'user',
				role: 'writer',
				emailAddress: shareSetting.value as string
			}
		});
	}

	return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}
