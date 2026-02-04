use super::auth::{AuthError, DropboxAuth};
use crate::models::Rev;
use serde::{Deserialize, Serialize};
use thiserror::Error;

const DROPBOX_API_BASE: &str = "https://api.dropboxapi.com/2";
const DROPBOX_CONTENT_BASE: &str = "https://content.dropboxapi.com/2";

#[derive(Debug, Error)]
pub enum ClientError {
    #[error("Auth error: {0}")]
    Auth(#[from] AuthError),
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Dropbox API error: {0}")]
    Api(String),
    #[error("File not found")]
    NotFound,
    #[error("Conflict: {0}")]
    Conflict(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub name: String,
    pub path_display: String,
    pub rev: Rev,
    pub size: u64,
}

pub struct DropboxClient {
    auth: DropboxAuth,
    http: reqwest::Client,
}

impl DropboxClient {
    pub fn new(auth: DropboxAuth) -> Self {
        Self {
            auth,
            http: reqwest::Client::new(),
        }
    }

    async fn get_token(&self) -> Result<String, ClientError> {
        Ok(self.auth.get_valid_token().await?)
    }

    pub async fn download_file(&self, path: &str) -> Result<(Vec<u8>, FileMetadata), ClientError> {
        let token = self.get_token().await?;

        let arg = serde_json::json!({ "path": path });

        let response = self
            .http
            .post(format!("{}/files/download", DROPBOX_CONTENT_BASE))
            .header("Authorization", format!("Bearer {}", token))
            .header("Dropbox-API-Arg", arg.to_string())
            .send()
            .await?;

        if response.status().as_u16() == 409 {
            // Check if it's a not_found error
            let error_text = response.text().await?;
            if error_text.contains("not_found") {
                return Err(ClientError::NotFound);
            }
            return Err(ClientError::Api(error_text));
        }

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(ClientError::Api(error_text));
        }

        let metadata_header = response
            .headers()
            .get("dropbox-api-result")
            .and_then(|v| v.to_str().ok())
            .ok_or_else(|| ClientError::Api("Missing metadata header".into()))?;

        let metadata: FileMetadata = serde_json::from_str(metadata_header)?;
        let bytes = response.bytes().await?.to_vec();

        Ok((bytes, metadata))
    }

    pub async fn upload_file(
        &self,
        path: &str,
        data: &[u8],
        mode: WriteMode,
    ) -> Result<FileMetadata, ClientError> {
        let token = self.get_token().await?;

        let mode_json = match mode {
            WriteMode::Add => serde_json::json!({ ".tag": "add" }),
            WriteMode::Update(rev) => serde_json::json!({ ".tag": "update", "update": rev.0 }),
        };

        let arg = serde_json::json!({
            "path": path,
            "mode": mode_json,
            "autorename": false,
            "mute": false,
            "strict_conflict": true,
        });

        let response = self
            .http
            .post(format!("{}/files/upload", DROPBOX_CONTENT_BASE))
            .header("Authorization", format!("Bearer {}", token))
            .header("Dropbox-API-Arg", arg.to_string())
            .header("Content-Type", "application/octet-stream")
            .body(data.to_vec())
            .send()
            .await?;

        if response.status().as_u16() == 409 {
            let error_text = response.text().await?;
            if error_text.contains("conflict") {
                return Err(ClientError::Conflict(error_text));
            }
            return Err(ClientError::Api(error_text));
        }

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(ClientError::Api(error_text));
        }

        let metadata: FileMetadata = response.json().await?;
        Ok(metadata)
    }

    pub async fn create_folder(&self, path: &str) -> Result<(), ClientError> {
        let token = self.get_token().await?;

        let response = self
            .http
            .post(format!("{}/files/create_folder_v2", DROPBOX_API_BASE))
            .header("Authorization", format!("Bearer {}", token))
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "path": path,
                "autorename": false,
            }))
            .send()
            .await?;

        if response.status().as_u16() == 409 {
            // Folder may already exist, that's OK
            return Ok(());
        }

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(ClientError::Api(error_text));
        }

        Ok(())
    }
}

#[derive(Debug, Clone)]
pub enum WriteMode {
    Add,
    Update(Rev),
}
