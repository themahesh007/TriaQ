# TriaQ Privacy Policy & Data Governance

## 1. Data Collection

### Patient Data (Minimal Collection Principle)
We collect **only what's strictly necessary** for clinical triage and OPD queue sequencing:

| Data Element | Purpose | Stored at Rest | Encryption Standard |
|---|---|---|---|
| Contact Mobile Number | Authentication & token identification | Yes | AES-256-GCM encrypted |
| Age / Gender | Clinical triage risk calculation | Yes | Encrypted at rest |
| Chief Complaints / Symptoms | Clinical triage analysis & doctor summary | Yes | AES-256-GCM encrypted |
| Baseline Vitals (BP, SpO2, Pulse, Temp) | Deterministic safety assessment | Yes | Encrypted at rest |
| Uploaded Lab Image | OCR data extraction (Hemoglobin, Sugar, etc.) | Processed in-memory | Binary storage |

### Data NOT Collected
- Government National ID / Aadhaar numbers (never requested)
- Biometric records
- Financial, bank account, or payment details
- Social media profiles or location tracking

### Staff Data
- Official facility email + salted bcrypt password hash (never stored in plaintext)
- Professional role (DOCTOR / NURSE / HOSPITAL_ADMIN / MASTER)
- Login IP + timestamp for regulatory audit trail (retained for 90 days)

---

## 2. Data Retention Policy

### Patient Records
- **Active Outpatients**: Retained while the patient has an active queue token or registered account.
- **Automated Deletion**: If a patient account is inactive for 90 days after triage completion, personal records are scheduled for automated purge.
- **Deletion on Request**: Patients can request immediate erasure of their intake records; requests are processed within 7 business days.
- **Audit Exception**: Immutable audit log entries are preserved for regulatory compliance as per statutory guidelines.

### Staff & Credential Records
- Inactive staff accounts are archived after 12 months of inactivity.
- Password reset OTP codes expire after 5 minutes and are automatically purged from memory.

---

## 3. Data Deletion Request Process

Patients may exercise their right to erasure at any time:
- **Email**: `triaqproject@gmail.com`
- **Subject**: "Data Deletion Request - [Token ID or Phone]"
- **Verification**: Identity is verified via OTP sent to the registered phone number.
- **Execution**: Upon verification, all symptom narratives, uploaded images, and personal identifiers are permanently scrubbed from the active database.

---

## 4. Security & Encryption Standards

- **Encryption in Transit**: Strict HTTPS with TLS 1.3 encryption across all client-server communications.
- **Encryption at Rest**: High-risk PII fields are secured with AES-256-GCM cryptographic encryption.
- **Access Control**: Role-Based Access Control (RBAC) ensures nurses see masked PII while duty physicians decrypt details solely for clinical evaluation.

---

## 5. Compliance with India's DPDP Act, 2023

TriaQ is architected in accordance with India's **Digital Personal Data Protection (DPDP) Act, 2023**:
- ✓ **Affirmative Consent**: Mandatory user consent checkbox before intake submission.
- ✓ **Purpose Limitation**: Data collected is utilized exclusively for clinical prioritization and hospital queuing.
- ✓ **Data Minimization**: Non-essential personal details are completely excluded from intake workflows.
- ✓ **Right to Correction & Erasure**: Patients retain full rights to update contact details and request record deletion.

---

## 6. Responsible AI & Clinical Safety

- **Deterministic Safety Layer**: Critical conditions (e.g. chest pain, respiratory distress, acute stroke) trigger deterministic **RED** flags that cannot be downgraded by AI.
- **Human-in-the-Loop**: All automated summaries and triage recommendations must be reviewed and approved by a qualified duty doctor.
- **Non-Diagnostic**: TriaQ acts as an administrative queuing assistant and does not issue automated diagnoses or unverified prescriptions.

**Last Updated**: September 2026  
**Governing Facility**: TriaQ Clinical Triage Platform
