use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use rand::Rng;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;
use thiserror::Error;

const DROPBOX_APP_KEY: &str = "8pibzyy4kg696lb";

fn get_config_dir() -> Result<PathBuf, AuthError> {
    let config_dir = dirs::config_dir()
        .ok_or_else(|| AuthError::Storage("Could not find config directory".into()))?
        .join("hsa-helper");

    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)
            .map_err(|e| AuthError::Storage(format!("Failed to create config dir: {}", e)))?;
    }

    Ok(config_dir)
}

fn get_tokens_path() -> Result<PathBuf, AuthError> {
    Ok(get_config_dir()?.join("tokens.json"))
}

#[derive(Debug, Error)]
pub enum AuthError {
    #[error("Not authenticated")]
    NotAuthenticated,
    #[error("Storage error: {0}")]
    Storage(String),
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Token exchange failed: {0}")]
    TokenExchange(String),
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TokenInfo {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_at: Option<i64>,
}

pub struct DropboxAuth;

impl DropboxAuth {
    pub fn new() -> Self {
        Self
    }

    pub fn get_app_key() -> String {
        DROPBOX_APP_KEY.to_string()
    }

    fn get_client_id(&self) -> String {
        Self::get_app_key()
    }

    /// Generate an OAuth authorization URL and return it along with the PKCE verifier.
    /// The verifier must be passed to `exchange_code` later.
    pub fn generate_auth_url_with_verifier(&self, redirect_uri: &str) -> (String, String) {
        let client_id = self.get_client_id();
        let code_verifier = generate_code_verifier();
        let code_challenge = generate_code_challenge(&code_verifier);

        // Request scopes needed for file operations
        let scopes =
            "files.content.write files.content.read files.metadata.write files.metadata.read";

        let url = format!(
            "https://www.dropbox.com/oauth2/authorize?\
            client_id={}&\
            response_type=code&\
            code_challenge={}&\
            code_challenge_method=S256&\
            redirect_uri={}&\
            token_access_type=offline&\
            scope={}",
            client_id,
            code_challenge,
            urlencoding::encode(redirect_uri),
            urlencoding::encode(scopes)
        );

        (url, code_verifier)
    }

    pub async fn exchange_code(
        &self,
        code: &str,
        redirect_uri: &str,
        verifier: &str,
    ) -> Result<TokenInfo, AuthError> {
        let client_id = self.get_client_id();

        let client = reqwest::Client::new();
        let response = client
            .post("https://api.dropboxapi.com/oauth2/token")
            .form(&[
                ("code", code),
                ("grant_type", "authorization_code"),
                ("client_id", &client_id),
                ("code_verifier", verifier),
                ("redirect_uri", redirect_uri),
            ])
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(AuthError::TokenExchange(error_text));
        }

        let token_response: serde_json::Value = response.json().await?;

        let access_token = token_response["access_token"]
            .as_str()
            .ok_or_else(|| AuthError::TokenExchange("Missing access_token".into()))?
            .to_string();

        let refresh_token = token_response["refresh_token"].as_str().map(String::from);

        let expires_in = token_response["expires_in"].as_i64();
        let expires_at = expires_in.map(|secs| chrono::Utc::now().timestamp() + secs);

        let token_info = TokenInfo {
            access_token,
            refresh_token,
            expires_at,
        };

        self.save_tokens(&token_info)?;

        Ok(token_info)
    }

    pub async fn refresh_token(&self) -> Result<TokenInfo, AuthError> {
        let client_id = self.get_client_id();
        let current = self.load_tokens()?;
        let refresh_token = current.refresh_token.ok_or(AuthError::NotAuthenticated)?;

        let client = reqwest::Client::new();
        let response = client
            .post("https://api.dropboxapi.com/oauth2/token")
            .form(&[
                ("grant_type", "refresh_token"),
                ("refresh_token", &refresh_token),
                ("client_id", &client_id),
            ])
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            return Err(AuthError::TokenExchange(error_text));
        }

        let token_response: serde_json::Value = response.json().await?;

        let access_token = token_response["access_token"]
            .as_str()
            .ok_or_else(|| AuthError::TokenExchange("Missing access_token".into()))?
            .to_string();

        let new_refresh = token_response["refresh_token"]
            .as_str()
            .map(String::from)
            .or(Some(refresh_token));

        let expires_in = token_response["expires_in"].as_i64();
        let expires_at = expires_in.map(|secs| chrono::Utc::now().timestamp() + secs);

        let token_info = TokenInfo {
            access_token,
            refresh_token: new_refresh,
            expires_at,
        };

        self.save_tokens(&token_info)?;

        Ok(token_info)
    }

    pub fn load_tokens(&self) -> Result<TokenInfo, AuthError> {
        let path = get_tokens_path()?;
        let contents = fs::read_to_string(&path).map_err(|_| AuthError::NotAuthenticated)?;
        serde_json::from_str(&contents).map_err(AuthError::Json)
    }

    pub fn save_tokens(&self, tokens: &TokenInfo) -> Result<(), AuthError> {
        let path = get_tokens_path()?;
        let json = serde_json::to_string_pretty(tokens)?;
        fs::write(&path, &json)
            .map_err(|e| AuthError::Storage(format!("Failed to save tokens: {}", e)))?;

        // Verify the tokens were actually saved
        let verify = fs::read_to_string(&path)
            .map_err(|e| AuthError::Storage(format!("Token verification read failed: {}", e)))?;
        if verify != json {
            return Err(AuthError::Storage(
                "Token verification failed: stored data doesn't match".into(),
            ));
        }

        Ok(())
    }

    pub fn clear_tokens(&self) -> Result<(), AuthError> {
        let path = get_tokens_path()?;
        if path.exists() {
            fs::remove_file(&path)
                .map_err(|e| AuthError::Storage(format!("Failed to clear tokens: {}", e)))?;
        }
        Ok(())
    }

    pub fn is_authenticated(&self) -> bool {
        self.load_tokens().is_ok()
    }

    pub async fn get_valid_token(&self) -> Result<String, AuthError> {
        let tokens = self.load_tokens()?;

        // Check if token is expired (with 5 minute buffer)
        if let Some(expires_at) = tokens.expires_at {
            let now = chrono::Utc::now().timestamp();
            if now >= expires_at - 300 {
                // Refresh if expiring within 5 minutes
                let refreshed = self.refresh_token().await?;
                return Ok(refreshed.access_token);
            }
        }

        Ok(tokens.access_token)
    }
}

fn generate_code_verifier() -> String {
    let mut rng = rand::rng();
    let bytes: [u8; 32] = rng.random();
    URL_SAFE_NO_PAD.encode(bytes)
}

fn generate_code_challenge(verifier: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    let hash = hasher.finalize();
    URL_SAFE_NO_PAD.encode(hash)
}

mod urlencoding {
    pub fn encode(s: &str) -> String {
        url::form_urlencoded::byte_serialize(s.as_bytes()).collect()
    }
}
