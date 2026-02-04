use super::client::{ClientError, DropboxClient, WriteMode};
use crate::models::event::{HsaEvent, HsaMetadata};
use crate::models::Rev;
use std::collections::HashMap;
use uuid::Uuid;

const METADATA_PATH: &str = "/Apps/HSAHelper/metadata.json";
const RECEIPTS_PATH: &str = "/Apps/HSAHelper/receipts";

pub struct DropboxSync {
    client: DropboxClient,
}

impl DropboxSync {
    pub fn new(client: DropboxClient) -> Self {
        Self { client }
    }

    pub async fn ensure_folders(&self) -> Result<(), ClientError> {
        self.client.create_folder("/Apps").await.ok();
        self.client.create_folder("/Apps/HSAHelper").await.ok();
        self.client.create_folder(RECEIPTS_PATH).await.ok();
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
        let data = serde_json::to_vec_pretty(metadata)?;

        let mode = match rev {
            Some(r) => WriteMode::Update(r),
            None => WriteMode::Add,
        };

        match self.client.upload_file(METADATA_PATH, &data, mode).await {
            Ok(file_meta) => {
                let mut updated = metadata.clone();
                updated.last_modified = jiff::Timestamp::now().to_string();
                Ok((updated, file_meta.rev))
            }
            Err(ClientError::Conflict(_)) => {
                // Conflict! Need to reconcile
                let (remote, remote_rev) = self.fetch_metadata().await?;
                let reconciled = self.reconcile(metadata, &remote);
                // Try again with the reconciled data and new rev
                let data = serde_json::to_vec_pretty(&reconciled)?;
                let mode = match remote_rev {
                    Some(r) => WriteMode::Update(r),
                    None => WriteMode::Overwrite,
                };
                let file_meta = self.client.upload_file(METADATA_PATH, &data, mode).await?;
                Ok((reconciled, file_meta.rev))
            }
            Err(e) => Err(e),
        }
    }

    fn reconcile(&self, local: &HsaMetadata, remote: &HsaMetadata) -> HsaMetadata {
        // Merge events by ID, keeping the most recently updated version
        let mut events_map: HashMap<Uuid, HsaEvent> = HashMap::new();

        // Add all remote events
        for event in &remote.events {
            events_map.insert(event.id(), event.clone());
        }

        // Merge local events, preferring newer updates
        for event in &local.events {
            let id = event.id();
            if let Some(existing) = events_map.get(&id) {
                // Keep the one with the newer updated_at
                let local_updated = get_updated_at(event);
                let remote_updated = get_updated_at(existing);
                if local_updated > remote_updated {
                    events_map.insert(id, event.clone());
                }
            } else {
                events_map.insert(id, event.clone());
            }
        }

        let mut events: Vec<HsaEvent> = events_map.into_values().collect();
        events.sort_by(|a, b| get_date(a).cmp(get_date(b)));

        HsaMetadata {
            version: local.version.max(remote.version),
            last_modified: jiff::Timestamp::now().to_string(),
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

fn get_updated_at(event: &HsaEvent) -> &str {
    match event {
        HsaEvent::Expense { updated_at, .. } => updated_at,
        HsaEvent::Withdrawal { updated_at, .. } => updated_at,
        HsaEvent::Deposit { updated_at, .. } => updated_at,
    }
}

fn get_date(event: &HsaEvent) -> &str {
    match event {
        HsaEvent::Expense { date, .. } => date,
        HsaEvent::Withdrawal { date, .. } => date,
        HsaEvent::Deposit { date, .. } => date,
    }
}
