# TriaQ Data Retention Schedule

## Automated Data Lifecycle Schedule

| Data Category | Retention Window | Purge Trigger | Manual Override? |
|---|---|---|---|
| Outpatient Intake Drafts | 24 Hours | Cleared upon submission or local expiry | User can clear draft |
| Patient Clinical Triage Notes | 90 Days post-discharge | Automated database retention cycle | Doctor review hold |
| Password Reset OTPs | 5 Minutes | Immediate auto-expiry | N/A |
| Staff Session Tokens | 24 Hours | Automatic session revocation | User logout |
| System Access Logs | 90 Days | Rolling log rotation | Security audit hold |
| Regulatory Audit Trail | 7 Years | Statutory legal archive | No (Immutable) |

## Automated Daily Maintenance Protocol
The daily retention cleanup routine runs automatically to:
1. Purge expired OTPs and unverified registration attempts.
2. Clean up temporary OCR scratch buffers older than 24 hours.
3. Archive completed outpatient tokens to maintain high-performance database indexing.
