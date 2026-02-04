use jiff::civil::Date;
use jiff::Timestamp;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum HsaEvent {
    Expense {
        id: Uuid,
        date: Date,
        #[serde(rename = "amountCents")]
        amount_cents: i64,
        #[serde(rename = "receiptId")]
        receipt_id: Option<Uuid>,
        #[serde(rename = "createdAt")]
        created_at: Timestamp,
        #[serde(rename = "updatedAt")]
        updated_at: Timestamp,
        description: String,
    },
    Withdrawal {
        id: Uuid,
        date: Date,
        #[serde(rename = "amountCents")]
        amount_cents: i64,
        #[serde(rename = "receiptId")]
        receipt_id: Option<Uuid>,
        #[serde(rename = "createdAt")]
        created_at: Timestamp,
        #[serde(rename = "updatedAt")]
        updated_at: Timestamp,
    },
    Deposit {
        id: Uuid,
        date: Date,
        #[serde(rename = "amountCents")]
        amount_cents: i64,
        #[serde(rename = "receiptId")]
        receipt_id: Option<Uuid>,
        #[serde(rename = "createdAt")]
        created_at: Timestamp,
        #[serde(rename = "updatedAt")]
        updated_at: Timestamp,
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

    pub fn date(&self) -> Date {
        match self {
            HsaEvent::Expense { date, .. } => *date,
            HsaEvent::Withdrawal { date, .. } => *date,
            HsaEvent::Deposit { date, .. } => *date,
        }
    }

    pub fn updated_at(&self) -> Timestamp {
        match self {
            HsaEvent::Expense { updated_at, .. } => *updated_at,
            HsaEvent::Withdrawal { updated_at, .. } => *updated_at,
            HsaEvent::Deposit { updated_at, .. } => *updated_at,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum NewEvent {
    Expense {
        date: Date,
        #[serde(rename = "amountCents")]
        amount_cents: i64,
        description: String,
        #[serde(rename = "receiptId")]
        receipt_id: Option<Uuid>,
    },
    Withdrawal {
        date: Date,
        #[serde(rename = "amountCents")]
        amount_cents: i64,
        #[serde(rename = "receiptId")]
        receipt_id: Option<Uuid>,
    },
    Deposit {
        date: Date,
        #[serde(rename = "amountCents")]
        amount_cents: i64,
        #[serde(rename = "receiptId")]
        receipt_id: Option<Uuid>,
    },
}

impl NewEvent {
    pub fn into_event(self) -> HsaEvent {
        let id = Uuid::new_v4();
        let now = Timestamp::now();

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
                created_at: now,
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
                created_at: now,
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
                created_at: now,
                updated_at: now,
            },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HsaMetadata {
    pub version: u32,
    #[serde(rename = "lastModified")]
    pub last_modified: Timestamp,
    pub events: Vec<HsaEvent>,
}

impl Default for HsaMetadata {
    fn default() -> Self {
        Self {
            version: 1,
            last_modified: Timestamp::now(),
            events: Vec::new(),
        }
    }
}
