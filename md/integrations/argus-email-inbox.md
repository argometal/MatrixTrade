# ARGUS Email Inbox

External email parsers and forwarding services send structured JSON to ARGUS. ARGUS stores the message as a pending **InboxItem** with preserved raw email metadata and file attachments. Nothing is converted to Journal automatically.

## Flow

```
Email provider / parser
        ↓
POST /api/argus/email-inbox  (Bearer token)
        ↓
Create InboxItem (source=email, status=pending)
        ↓
Save attachments → ARGUS_DATA_DIR/files/
        ↓
Link attachments (parentType=inbox, parentId=inboxItem.id)
        ↓
User reviews at /argus/inbox and classifies later
```

## Endpoint

```
POST /api/argus/email-inbox
Content-Type: application/json
Authorization: Bearer $ARGUS_INBOX_TOKEN
```

### Auth

- Requires `ARGUS_INBOX_TOKEN` in server environment (see `.env.local.example`).
- Only **Bearer** auth is accepted on this route.
- Missing or invalid token → `401 Unauthorized`.
- Token not configured on server → `503 Inbox not configured`.

## Payload

```json
{
  "from": "sender@example.com",
  "to": "argus@example.com",
  "subject": "Contract review notes",
  "text": "Plain text body",
  "html": "<p>Optional HTML body</p>",
  "receivedAt": "2026-06-29T14:30:00.000Z",
  "attachments": [
    {
      "filename": "evidence.pdf",
      "contentType": "application/pdf",
      "size": 12345,
      "contentBase64": "JVBERi0xLjQK..."
    }
  ]
}
```

### Fields

| Field | Required | Notes |
|-------|----------|-------|
| `from` | yes | Sender address |
| `to` | no | Recipient address |
| `subject` | no | Email subject |
| `text` | no* | Plain text body stored as `InboxItem.rawText` |
| `html` | no | Preserved inside normalized `rawEmail` JSON |
| `receivedAt` | no | ISO 8601; defaults to server time |
| `attachments` | no | Array of base64-encoded files |

\* At least one of `text`, `subject`, or `attachments` must be present.

### Response

**201 Created**

```json
{
  "ok": true,
  "inboxItemId": "1719676800000-abc123",
  "attachmentCount": 1
}
```

**400 Bad Request** — validation error (`{ "error": "..." }`)

**401 Unauthorized** — bad or missing Bearer token

**503 Service Unavailable** — `ARGUS_INBOX_TOKEN` not set

## Storage behavior

On valid request:

1. **InboxItem** is created first:
   - `source = "email"`
   - `status = "pending"`
   - `rawText = text` (or fallback from subject)
   - `rawEmail =` full normalized JSON (includes `html`, attachment metadata; never overwritten)
   - `subject`, `from`, `to`, `receivedAt` set from payload
2. Each attachment is decoded from base64 and written via `saveAttachment()`:
   - Binary path: `{ARGUS_DATA_DIR}/files/{attachmentId}`
   - Metadata in `journal.json` → `attachments[]`
   - `parentType = "inbox"`
   - `parentId = inboxItem.id`
3. `InboxItem.attachmentIds` is updated after each attachment.

### Evidence preservation rules

- Raw email JSON is stored once and never modified.
- HTML is never discarded (stored in `rawEmail`).
- No automatic Journal conversion.
- No entity linking or classification at intake.

## UI

Pending items appear at `/argus/inbox`.

List and detail show:

- Source: Email
- From
- Subject
- Received date
- Attachment count
- Raw text preview
- Collapsible preserved raw email JSON

Classification happens manually via existing inbox convert flow.

## Local test

1. Set env vars in `.env.local`:

```env
ARGUS_INBOX_TOKEN=dev-inbox-token
ARGUS_DATA_DIR=C:\Users\you\ArgusData
```

2. Start dev server:

```bash
npm run dev
```

3. Send test email JSON:

```bash
curl -X POST http://localhost:3000/api/argus/email-inbox \
  -H "Authorization: Bearer dev-inbox-token" \
  -H "Content-Type: application/json" \
  -d "{
    \"from\": \"witness@example.com\",
    \"to\": \"argus@example.com\",
    \"subject\": \"Field notes — site visit\",
    \"text\": \"Observed damage on north wall. Photos attached.\",
    \"html\": \"<p>Observed damage on north wall. Photos attached.</p>\",
    \"receivedAt\": \"2026-06-29T14:30:00.000Z\",
    \"attachments\": [
      {
        \"filename\": \"photo.txt\",
        \"contentType\": \"text/plain\",
        \"size\": 11,
        \"contentBase64\": \"$(printf 'sample file' | base64)\"
      }
    ]
  }"
```

On Windows PowerShell, use a pre-encoded base64 string instead of `$(base64 ...)`.

4. Open `http://localhost:3000/argus/inbox` and confirm the item appears.

### Production example

```bash
curl -X POST https://matrix-trade-theta.vercel.app/api/argus/email-inbox \
  -H "Authorization: Bearer $ARGUS_INBOX_TOKEN" \
  -H "Content-Type: application/json" \
  -d @email-payload.json
```

Set `ARGUS_INBOX_TOKEN` and `ARGUS_DATA_DIR=/tmp/argus` in Vercel for production intake (ephemeral storage on Hobby; use external volume or persistent host for long-term evidence retention).

## Limitations (current phase)

- No Gmail OAuth
- No Outlook OAuth
- No IMAP polling
- No automatic email forwarding setup
- No AI classification or entity extraction
- No OCR
- No full email client UI
- Max attachment size: **25 MB** per file (decoded)
- Attachments stored by internal ID filename; original filename kept in metadata

## Future providers

This endpoint is provider-agnostic. Expected integrations:

| Provider | Pattern |
|----------|---------|
| SendGrid Inbound Parse | Webhook → transform to JSON → POST here |
| Mailgun Routes | Same |
| Postmark Inbound | Same |
| Cloudflare Email Workers | Parse MIME → JSON → POST here |
| Custom forwarder | Cron/IMAP script on a VPS → JSON → POST here |

Each provider handles MIME parsing and DNS/routing. ARGUS only receives normalized JSON and stores evidence in Inbox.

## Related

- Generic inbox API: `POST /api/argus/inbox` (multipart or JSON; also uses `ARGUS_INBOX_TOKEN`)
- Storage layout: `md/integrations/argus-storage.md`
- Architecture: `md/integrations/argus-architecture.md`
