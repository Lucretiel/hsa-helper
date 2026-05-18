import { invoke } from "@tauri-apps/api/core";
import type { HsaEvent, HsaMetadata, NewEvent } from "./types";

export async function getEvents(): Promise<HsaEvent[]> {
	return invoke<HsaEvent[]>("get_events");
}

export async function addEvent(event: NewEvent): Promise<HsaEvent> {
	return invoke<HsaEvent>("add_event", { event });
}

export async function deleteEvent(id: string): Promise<void> {
	return invoke("delete_event", { id });
}

export async function hasAppKey(): Promise<boolean> {
	return invoke<boolean>("has_app_key");
}

export async function setAppKey(appKey: string): Promise<void> {
	return invoke("set_app_key", { appKey });
}

export async function getAuthUrl(redirectUri: string): Promise<string> {
	return invoke<string>("get_auth_url", { redirectUri });
}

export async function exchangeAuthCode(
	code: string,
	redirectUri: string,
): Promise<void> {
	return invoke("exchange_auth_code", { code, redirectUri });
}

export async function logout(): Promise<void> {
	return invoke("logout");
}

export async function syncMetadata(): Promise<HsaMetadata> {
	return invoke<HsaMetadata>("sync_metadata");
}

export async function saveMetadata(
	metadata: HsaMetadata,
): Promise<HsaMetadata> {
	return invoke<HsaMetadata>("save_metadata", { metadata });
}

export async function uploadReceipt(
	receiptId: string,
	data: Uint8Array,
): Promise<void> {
	return invoke("upload_receipt", { receiptId, data: Array.from(data) });
}

export async function downloadReceipt(receiptId: string): Promise<Uint8Array> {
	const data = await invoke<number[]>("download_receipt", { receiptId });
	return new Uint8Array(data);
}
