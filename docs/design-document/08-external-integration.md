# 8. External System Integration (LINE Messaging API)

LEBIS connects to one external system: the **LINE Messaging API**. It is used for a
single purpose — to send the shop owner one message every morning listing what has
to come back. This section describes the integration in full. The main flows are
also summarised in Section 4.3; this section adds the endpoints, the failure
handling, the security checks and the configuration.

## 8.1 External System Description

### Why LINE

The owner's second problem in Section 1.2 is that nobody remembers who took what,
and late items are noticed by accident. A reminder only helps if the owner actually
reads it before the shop opens. Thai shop owners already read LINE all day, so the
reminder goes where they look, instead of into an email inbox or a page they have
to remember to open.

The message goes to the **shop owner**, not to the customer who rented the item.
The owner knows the customer and decides how to follow up. Messaging customers is
out of scope (Section 1.5).

### What the owner can do

| Step | What the owner does | What LEBIS does |
|---|---|---|
| 1. Link | Opens Settings, presses **Request code**, sends the 8-character code to the LEBIS LINE account, then presses **Check status** | Ties that LINE account to the shop |
| 2. Test | Presses **Send test alert** in Settings | Sends one test message to the linked account |
| 3. Daily summary | Nothing — it is automatic | Every day at 08:00 Bangkok time, sends one summary of overdue items, items due today and items due tomorrow |

**This is a Pro feature.** Free accounts see "Upgrade to Pro to enable LINE reminders"
and a **View pricing** button in Settings instead of the linking controls. Hiding the controls is only for the user's convenience;
the server rejects the request itself (Section 8.3).

## 8.2 API Design

The integration has two sides: the LINE platform endpoints that LEBIS calls (and the
one call LINE makes to LEBIS), and the LEBIS endpoints that the Settings page calls.

### LINE platform endpoints used by LEBIS

All three are implemented in `backend-api/services/line_notify.py` and
`backend-api/routes/line.py`.

| Endpoint | Direction | Purpose | Counts against the quota |
|---|---|---|---|
| `POST https://api.line.me/v2/bot/message/push` | LEBIS → LINE | Send a message to one LINE user at any time: the daily summary and the test message | Yes (Section 8.8) |
| `POST https://api.line.me/v2/bot/message/reply` | LEBIS → LINE | Answer a message the owner has just sent: the welcome message and the linking replies | No |
| `POST /api/line/webhook` | LINE → LEBIS | LINE forwards events from the LEBIS LINE account: a new friend (`follow`) or a text message | — |

**Data sent to LINE (JSON).** Both outgoing calls send a single text message.

```
POST /v2/bot/message/push
Authorization: Bearer <channel access token>
X-Line-Retry-Key: <UUID>
Content-Type: application/json

{"to": "<LINE user ID>", "messages": [{"type": "text", "text": "..."}]}
```

```
POST /v2/bot/message/reply
Authorization: Bearer <channel access token>
Content-Type: application/json

{"replyToken": "<token from the webhook event>", "messages": [{"type": "text", "text": "..."}]}
```

**Data LEBIS expects back.** LEBIS reads only the HTTP status, not the response body:
200 means sent; 409 on a push with a retry key means the same push was already
delivered; on a push, a 5xx answer or a timeout (10 seconds) is retried once — a
reply is never retried; any other answer is a failure (Section 8.6).

**Data received from LINE (JSON).** LINE sends a list of events. LEBIS reads only the
fields below and ignores the rest.

```
POST /api/line/webhook
x-line-signature: <Base64 HMAC-SHA256 of the raw body>

{"events": [{"type": "message",
             "replyToken": "...",
             "source": {"type": "user", "userId": "U..."},
             "message": {"type": "text", "text": "ABCD2345"}}]}
```

LEBIS answers `200 {"ok": true}`. When the **Verify** button in the LINE Developers
Console is pressed, LINE sends an empty `events` list, which also receives 200.

**Authentication and security.**

| Call | How it is authenticated |
|---|---|
| LEBIS → LINE (push and reply) | `Authorization: Bearer` with the long-lived channel access token, read from `LINE_CHANNEL_ACCESS_TOKEN`. The token is never sent to the browser and never committed |
| LINE → LEBIS (webhook) | No user token exists, so the `x-line-signature` header takes its place: an HMAC-SHA256 of the raw body keyed with `LINE_CHANNEL_SECRET`. A request that does not match receives 403 `bad_signature` (Section 8.7) |
| Repeated pushes | Every push carries `X-Line-Retry-Key`, so a retry after a timeout cannot deliver the same message twice (Section 8.6) |

### LEBIS endpoints for LINE

These are the endpoints the Settings page calls. All paths are under `/api/line`.

| Method and path | Who may call it | Purpose | Responses other than success |
|---|---|---|---|
| `GET /status` | Any signed-in user | Returns `linked`, `tier_ok` and `configured` so the Settings page knows what to show | 401 without a valid token |
| `POST /link-code` | Pro or admin | Issues a one-time 8-character code, valid for 10 minutes | **403** `tier_required` · 503 `line_not_configured` |
| `POST /test` | Pro or admin | Sends a test message to the linked account | **403** `tier_required` · 409 `line_not_linked` · 503 `line_not_configured` · 502 `line_send_failed` |
| `POST /digest` | Pro or admin | Sends today's summary now, without waiting for 08:00 | same as `/test` |
| `POST /webhook` | The LINE platform only | Receives messages sent to the LEBIS LINE account | **403** `bad_signature` · 503 `line_not_configured` |

`/digest` exists for demonstrations and for re-sending a summary. It is called
through the API; the Settings page does not have a button for it.

`/status` is open to every plan on purpose. It sends nothing, and the Settings page
needs it to decide whether to show the linking controls or the upgrade prompt.

## 8.3 Pro only — how Free accounts are blocked

Every endpoint that sends a message or links an account is declared with
`Depends(require_tier("pro"))` in `routes/line.py`. The check runs on the server
before the route body, so it applies equally to the website, to a script and to
the interactive API page at `/docs`. A Free account receives:

```
403 Forbidden
{"detail": {"code": "tier_required", "message": "...", "required": "pro"}}
```

The daily job is the one path that does not go through a web request, so it repeats
the check itself. Before sending to a shop it confirms the shop is still Pro, and it
first downgrades any Pro subscription that has passed its expiry date. Without this,
a shop whose Pro expired but which never opened the website again would keep
receiving messages for free.

Three of the live-test cases in Section 9.2 check this boundary: a Free account asking
for a link code, sending a test message and sending a summary must all receive 403.

## 8.4 Linking an account

The owner never types a LINE user ID. Linking proves that the same person holds both
the LEBIS account (to get the code) and the LINE account (to send it).

1. The owner presses **Request code** in Settings. `POST /link-code` stores an 8-character
   code and an expiry time 10 minutes ahead on the user's row.
2. The owner adds the LEBIS LINE Official Account as a friend. LINE sends a `follow`
   event to the webhook, and LEBIS replies with a welcome message that explains
   what to send.
3. The owner sends the code in the chat. LINE forwards it to `POST /webhook`.
4. The backend verifies the signature (Section 8.7), then normalises the text —
   upper-case, spaces and dashes removed — so `abcd-2345` and `ABCD 2345` both work.
5. One SQL statement checks that the code exists and has not expired, stores the
   LINE user ID and clears the code:

   ```sql
   UPDATE users
   SET line_user_id = :line_user_id, line_link_code = NULL, line_link_expires = NULL
   WHERE line_link_code = :code AND line_link_expires > NOW()
   RETURNING email, shop_name
   ```

   Because checking and clearing happen in one statement, a code can be used only
   once, even if two people send it at the same moment.
6. LEBIS replies "linked to shop …". A wrong or expired code gets a reply saying
   so, and any text that is not 8 characters gets a reply explaining what to send.
7. Back in Settings, the owner presses **Check status**. The page calls
   `GET /status` again and shows **Linked**.

The code alphabet leaves out `0`, `O`, `1` and `I`, which are easy to misread when
copying from a phone screen.

Messages from group chats, and events LEBIS cannot reply to, are ignored.

## 8.5 The daily summary

**When.** A background task started with the backend sleeps until 08:00 Bangkok time,
sends the summaries, and sleeps until the next 08:00. If the backend starts between
08:00 and 20:00 — for example after a deployment — it sends straight away instead of
waiting until the next day.

**Who.** Every shop that is Pro (or admin) and has a linked LINE account.

**What.** Rentals that are overdue, due today or due tomorrow. They are found with
`find_due_before()`, the binary search from the algorithms module, on rentals that
were sorted by due date with the merge sort from the same module. A shop with
nothing due receives no message.

**How it reads.**

```
LEBIS · ของต้องคืน 15 ต.ค.
ร้าน <shop name>

เลยกำหนดคืนแล้ว 2 รายการ
• CAM-0012 <item name> — <customer> (ครบ 13 ต.ค.)
...
ครบกำหนดวันนี้ 1 รายการ
...
ครบกำหนดพรุ่งนี้ 3 รายการ
...

ดูทั้งหมด: https://lebis-project.vercel.app/workspace
```

In English, the headings read: *"LEBIS · items due back, 15 Oct" · "Shop …" ·
"Overdue — 2 items" · "Due today — 1 item" · "Due tomorrow — 3 items" ·
"See everything: …"*. Each line gives the item code, item name, customer and due date.

At most 15 rentals are listed. Anything beyond that is shown as a count, with the
link to the Workspace page for the full list. The message is written in Thai.

**Record.** Every attempt writes one row per rental to the `notifications` table
with the status `sent` or `failed`.

## 8.6 Reliability

The design goal is that a shop receives **exactly one** summary per day, even when
the network fails or the backend restarts.

| Situation | What happens |
|---|---|
| The backend restarts after 08:00 | The job runs again, but skips every shop that already has a `sent` row for today |
| The same request reaches LINE twice | Each scheduled push carries an `X-Line-Retry-Key` derived from the shop and the date. LINE discards a second request with the same key for 24 hours |
| LINE returns 5xx, or the connection times out | The push is retried once with the same retry key |
| LINE answers 409 to a retry | The first attempt was delivered. LEBIS counts it as sent, not as a failure |
| LINE returns 4xx | Not retried — the request itself is wrong and would fail again. Recorded as `failed` |
| One shop's send fails | Only that shop is affected; the job continues with the next shop |
| The whole job raises an error | The error is written to the log and the task waits for the next 08:00 instead of stopping |

The manual `POST /digest` deliberately skips the "already sent today" check and uses
a new random retry key each time instead of the daily one, so the owner can ask for a
second copy. The test message works the same way.

Setting `LINE_DAILY_JOB=off` stops the background task. It is used when running
tests, so they cannot send real messages.

## 8.7 Security

| Risk | Protection |
|---|---|
| Someone forges a webhook call to link their LINE account to another shop | Every webhook request must carry `x-line-signature`: an HMAC-SHA256 of the **raw** request body, keyed with the channel secret and Base64-encoded. The backend computes the same value and compares the two with `hmac.compare_digest`, so the comparison time does not reveal how many characters matched. A request that does not match receives 403 |
| A signature is checked against re-encoded JSON | The signature is computed on the body exactly as received, before it is parsed. Parsing and re-serialising would change spacing or key order and break the check |
| A link code is guessed or reused | 32-character alphabet, 8 characters, valid 10 minutes, usable once (Section 8.4) |
| The channel token or secret leaks | Both are read from environment variables only. Neither appears in the repository |
| A Free account sends messages by calling the API directly | `require_tier("pro")` on the server (Section 8.3) |

The webhook is the only LINE route without `require_tier`. LINE, not the user,
calls it, so there is no user token to check; the signature takes its place.

## 8.8 Message quota

A free LINE Official Account in Thailand can **push** 300 messages a month. **Replies**
do not count against the quota (source: lineforbusiness.com/th, checked
25 September 2026 — the plans can change).

| Approach | Messages per shop per month | Shops one free account supports |
|---|---|---|
| One summary per day (what LEBIS does) | about 30 | about 10 |
| One message per rental | one per rental | a single shop renting 10 items a day uses the whole quota |

Linking uses replies only, so it costs nothing. This is why the summary is one
message per shop per day rather than one message per rental (Section 4.4).

## 8.9 Configuration

| Variable | Required | Purpose |
|---|---|---|
| `LINE_CHANNEL_ACCESS_TOKEN` | to send | Long-lived channel access token used for every push and reply |
| `LINE_CHANNEL_SECRET` | to link | Verifies webhook signatures |
| `LINE_ADD_FRIEND_URL` | no | When set, Settings shows an **Add LINE friend** button |
| `APP_URL` | no | The Workspace link at the end of each summary. Defaults to the live site |
| `LINE_DAILY_JOB` | no | `off` disables the 08:00 task |

The webhook URL registered in the LINE Developers Console is
`https://lebis-project-production.up.railway.app/api/line/webhook`. The step-by-step
setup is in `docs/deployment.md`, step 5.

**Without these values LEBIS still runs.** Every other feature works; the LINE
endpoints answer 503 `line_not_configured`, and the daily task writes one line to
the log and skips the run.

## 8.10 Limitations

These are things the integration does not do today.

- **No unlink button.** A shop cannot remove its LINE account from the website. To
  move the summary to a different LINE account, the owner requests a new code and
  sends it from that account, which replaces the old one. *(planned)*
- **The summary is in Thai only.** It does not follow the language chosen on the
  website.
- **The send time is fixed at 08:00** for every shop and cannot be changed per shop.
- **Only the shop owner is notified.** Customers do not receive messages (out of
  scope, Section 1.5).
