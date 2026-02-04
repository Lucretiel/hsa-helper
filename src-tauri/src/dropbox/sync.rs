use super::client::{ClientError, DropboxClient, WriteMode};
use crate::models::event::{HsaEvent, HsaMetadata};
use crate::models::Rev;
use jiff::Timestamp;
use std::collections::hash_map::Entry;
use std::collections::HashMap;
use uuid::Uuid;

const METADATA_PATH: &str = "/metadata.json";
const RECEIPTS_PATH: &str = "/receipts";

// Legacy paths for migration
const LEGACY_METADATA_PATH: &str = "/Apps/HSAHelper/metadata.json";
const LEGACY_RECEIPTS_PATH: &str = "/Apps/HSAHelper/receipts";

pub struct DropboxSync {
    client: DropboxClient,
}

impl DropboxSync {
    pub fn new(client: DropboxClient) -> Self {
        Self { client }
    }

    pub async fn ensure_folders(&self) -> Result<(), ClientError> {
        self.client.create_folder(RECEIPTS_PATH).await.ok();
        Ok(())
    }

    /// Migrate data from legacy /Apps/HSAHelper/ paths to root paths.
    /// This is idempotent - safe to call multiple times.
    pub async fn migrate_legacy_paths(&self) -> Result<(), ClientError> {
        // Migrate metadata file if it exists at legacy path
        let _ = self
            .client
            .move_file(LEGACY_METADATA_PATH, METADATA_PATH)
            .await;

        // Migrate receipts folder if it exists at legacy path
        let _ = self
            .client
            .move_file(LEGACY_RECEIPTS_PATH, RECEIPTS_PATH)
            .await;

        Ok(())
    }

    pub async fn fetch_metadata(&self) -> Result<(HsaMetadata, Option<Rev>), ClientError> {
        match self.client.download_file(METADATA_PATH).await {
            Ok((bytes, file_meta)) => {
                let metadata: HsaMetadata = serde_json::from_slice(&bytes)?;
                Ok((metadata, Some(file_meta.rev)))
            }
            Err(ClientError::NotFound) => {
                // No metadata file yet, return empty
                Ok((HsaMetadata::default(), None))
            }
            Err(e) => Err(e),
        }
    }

    pub async fn save_metadata(
        &self,
        metadata: &HsaMetadata,
        rev: Option<Rev>,
    ) -> Result<(HsaMetadata, Rev), ClientError> {
        let mut current = metadata.clone();
        let mut current_rev = rev;

        loop {
            let data = serde_json::to_vec(&current)?;

            let mode = match current_rev {
                Some(r) => WriteMode::Update(r),
                None => WriteMode::Add,
            };

            match self.client.upload_file(METADATA_PATH, &data, mode).await {
                Ok(file_meta) => {
                    current.last_modified = Timestamp::now();
                    return Ok((current, file_meta.rev));
                }
                Err(ClientError::Conflict(_)) => {
                    // Conflict! Fetch remote, reconcile, and retry
                    let (remote, remote_rev) = self.fetch_metadata().await?;
                    current = self.reconcile(&current, &remote);
                    current_rev = remote_rev;
                }
                Err(e) => return Err(e),
            }
        }
    }

    fn reconcile(&self, local: &HsaMetadata, remote: &HsaMetadata) -> HsaMetadata {
        // Merge events by ID, keeping the most recently updated version

        // Add all remote events
        let mut events_map: HashMap<Uuid, HsaEvent> = remote
            .events
            .iter()
            .map(|event| (event.id(), event.clone()))
            .collect();

        // Merge local events, preferring newer updates
        for event in &local.events {
            let id = event.id();
            match events_map.entry(id) {
                Entry::Vacant(slot) => {
                    slot.insert(event.clone());
                }
                Entry::Occupied(mut remote) if event.updated_at() > remote.get().updated_at() => {
                    remote.insert(event.clone());
                }
                Entry::Occupied(_) => {}
            }
        }

        let mut events: Vec<HsaEvent> = events_map.into_values().collect();
        events.sort_by_key(|e| e.date());

        HsaMetadata {
            version: local.version.max(remote.version),
            last_modified: Timestamp::now(),
            events,
        }
    }

    pub async fn upload_receipt(&self, receipt_id: Uuid, data: &[u8]) -> Result<(), ClientError> {
        let path = format!("{}/{}.pdf", RECEIPTS_PATH, receipt_id);
        self.client.upload_file(&path, data, WriteMode::Add).await?;
        Ok(())
    }

    pub async fn download_receipt(&self, receipt_id: Uuid) -> Result<Vec<u8>, ClientError> {
        let path = format!("{}/{}.pdf", RECEIPTS_PATH, receipt_id);
        let (data, _) = self.client.download_file(&path).await?;
        Ok(data)
    }
}
