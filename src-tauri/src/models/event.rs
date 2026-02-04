use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum HsaEvent {
    Expense {
        id: Uuid,
        date: String,
        #[serde(rename = "amountCents")]
        amount_cents: i64,
        #[serde(rename = "receiptId")]
        receipt_id: Option<Uuid>,
        #[serde(rename = "createdAt")]
        created_at: String,
        #[serde(rename = "updatedAt")]
        updated_at: String,
        description: String,
    },
    Withdrawal {
        id: Uuid,
        date: String,
        #[serde(rename = "amountCents")]
        amount_cents: i64,
        #[serde(rename = "receiptId")]
        receipt_id: Option<Uuid>,
        #[serde(rename = "createdAt")]
        created_at: String,
        #[serde(rename = "updatedAt")]
        updated_at: String,
    },
    Deposit {
        id: Uuid,
        date: String,
        #[serde(rename = "amountCents")]
        amount_cents: i64,
        #[serde(rename = "receiptId")]
        receipt_id: Option<Uuid>,
        #[serde(rename = "createdAt")]
        created_at: String,
        #[serde(rename = "updatedAt")]
        updated_at: String,
    },
}

impl HsaEvent {
    pub fn id(&self) -> Uuid {
        match self {
            HsaEvent::Expense { id, .. } => *id,
            HsaEvent::Withdrawal { id, .. } => *id,
            HsaEvent::Deposit { id, .. } => *id,
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
        receipt_id: Option<Uuid>,
    },
    Withdrawal {
        date: String,
        #[serde(rename = "amountCents")]
        amount_cents: i64,
        #[serde(rename = "receiptId")]
        receipt_id: Option<Uuid>,
    },
    Deposit {
        date: String,
        #[serde(rename = "amountCents")]
        amount_cents: i64,
        #[serde(rename = "receiptId")]
        receipt_id: Option<Uuid>,
    },
}

impl NewEvent {
    pub fn into_event(self) -> HsaEvent {
        let id = Uuid::new_v4();
        let now = jiff::Timestamp::now().to_string();

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
    pub events: Vec<HsaEvent>,
}

impl Default for HsaMetadata {
    fn default() -> Self {
        Self {
            version: 1,
            last_modified: jiff::Timestamp::now().to_string(),
            events: Vec::new(),
        }
    }
}
