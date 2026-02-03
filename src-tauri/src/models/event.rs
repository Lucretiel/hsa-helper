use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum HsaEvent {
    Expense {
        id: String,
        date: String,
        #[serde(rename = "amountCents")]
        amount_cents: i64,
        #[serde(rename = "receiptId")]
        receipt_id: Option<String>,
        #[serde(rename = "createdAt")]
        created_at: String,
        #[serde(rename = "updatedAt")]
        updated_at: String,
        description: String,
    },
    Withdrawal {
        id: String,
        date: String,
        #[serde(rename = "amountCents")]
        amount_cents: i64,
        #[serde(rename = "receiptId")]
        receipt_id: Option<String>,
        #[serde(rename = "createdAt")]
        created_at: String,
        #[serde(rename = "updatedAt")]
        updated_at: String,
    },
    Deposit {
        id: String,
        date: String,
        #[serde(rename = "amountCents")]
        amount_cents: i64,
        #[serde(rename = "receiptId")]
        receipt_id: Option<String>,
        #[serde(rename = "createdAt")]
        created_at: String,
        #[serde(rename = "updatedAt")]
        updated_at: String,
    },
}

impl HsaEvent {
    pub fn id(&self) -> &str {
        match self {
            HsaEvent::Expense { id, .. } => id,
            HsaEvent::Withdrawal { id, .. } => id,
            HsaEvent::Deposit { id, .. } => id,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum NewEvent {
    Expense {
        date: String,
        #[serde(rename = "amountCents")]
        amount_cents: i64,
        description: String,
        #[serde(rename = "receiptId")]
        receipt_id: Option<String>,
    },
    Withdrawal {
        date: String,
        #[serde(rename = "amountCents")]
        amount_cents: i64,
        #[serde(rename = "receiptId")]
        receipt_id: Option<String>,
    },
    Deposit {
        date: String,
        #[serde(rename = "amountCents")]
        amount_cents: i64,
        #[serde(rename = "receiptId")]
        receipt_id: Option<String>,
    },
}

impl NewEvent {
    pub fn into_event(self) -> HsaEvent {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        match self {
            NewEvent::Expense {
                date,
                amount_cents,
                description,
                receipt_id,
            } => HsaEvent::Expense {
                id,
                date,
                amount_cents,
                receipt_id,
                created_at: now.clone(),
                updated_at: now,
                description,
            },
            NewEvent::Withdrawal {
                date,
                amount_cents,
                receipt_id,
            } => HsaEvent::Withdrawal {
                id,
                date,
                amount_cents,
                receipt_id,
                created_at: now.clone(),
                updated_at: now,
            },
            NewEvent::Deposit {
                date,
                amount_cents,
                receipt_id,
            } => HsaEvent::Deposit {
                id,
                date,
                amount_cents,
                receipt_id,
                created_at: now.clone(),
                updated_at: now,
            },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HsaMetadata {
    pub version: u32,
    #[serde(rename = "lastModified")]
    pub last_modified: String,
    #[serde(rename = "syncToken")]
    pub sync_token: Option<String>,
    pub events: Vec<HsaEvent>,
}

impl Default for HsaMetadata {
    fn default() -> Self {
        Self {
            version: 1,
            last_modified: chrono::Utc::now().to_rfc3339(),
            sync_token: None,
            events: Vec::new(),
        }
    }
}
