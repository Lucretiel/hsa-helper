pub mod event;

use serde::{Deserialize, Serialize};

/// Dropbox file revision identifier
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Rev(pub String);
