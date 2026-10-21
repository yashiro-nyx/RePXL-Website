# RePXL demo recording script

Updated 2026-10-21. Record three separate videos, then join them into one
continuous presentation. Target lengths include clicks, loading, and pauses.
Keep the three originals for the individual submission links.

| Video | Required title | Suggested length | Main coverage |
|---|---|---|---|
| 1 | Website Tour (User Module) | 5-6 minutes | Brief customer website tour, then the main customer journey on mobile |
| 2 | Log-in Module | 3-4 minutes | Customer website validation/sign-in/logout, mobile sign-in, admin sign-in |
| 3 | Admin Module (Create, Read, Update, Delete) - Connected to Database | 7-8 minutes | Database-backed draft-page CRUD, admin operations, and the order from Video 1 |

The combined recording is approximately **15-18 minutes**. The narration does
not need to fill every second. Read **Say** aloud and use **Show** as directions.
Bracketed camera names and order numbers must match the actual screen.

## Submission links

- Video 1: Website Tour (User Module)
  - Link: __________
- Video 2: Log-in Module
  - Link: __________
- Video 3: Admin Module (Create, Read, Update, Delete) - Connected to Database
  - Link: __________
- Combined presentation, if requested:
  - Link: __________

These are placeholders; recording, uploading, and accessible video links remain
for the presenter to complete.

## Preparation and recording order

- Use one demo customer for the website and mobile app, plus a separate admin
  account. Keep customer/admin browser sessions in separate profiles or windows.
- Confirm all clients and the database viewer point to the same demo environment.
  Rehearse the installed app; source inspection does not verify an APK or deployment.
- Record **Video 2 first** to capture authentication cleanly, then restore the
  required signed-in sessions and record **Video 1**, then **Video 3**. Assemble
  the final presentation in the required order: **Video 1 → Video 2 → Video 3**.
- Keep sign-in instructions in Video 2. Videos 1 and 3 can start already signed in.
- Prepare an available main camera, a second comparison camera, a saved Philippine
  delivery address with demo contact information, and a clean demo cart. Prepare
  a valid voucher only if you plan to apply it.
- Use **Cash on Delivery (COD)** for the main order demonstration. Approval and
  collection are separate steps. Identify fulfillment/cash collection as demo
  activity; online payment is covered by the optional test-mode branch below.
- Keep the generated order number from Video 1 for Video 3. Use a separate draft
  page for CRUD so the purchase and CRUD demonstrations do not interfere.
- Have a database viewer ready, filtered to the demo record. Show only the needed
  fields; hide connection strings, credentials, and unrelated customer records.
- Enable Do Not Disturb, keep passwords masked, and use a consistent screen size
  and microphone level. Allow a two-second pause at the start and end of each clip.

**Important CRUD distinction:** the camera list's remove control is **Archive**;
its source changes the product status to `DISCONTINUED`. This preserves a record.
For the explicit Create/Read/Update/Delete requirement, Video 3 uses a temporary
custom draft in **Static Pages**, which has all four actions including actual
deletion. Do not describe camera archiving as permanent database deletion.

## Video 1: Website Tour (User Module)

**Target:** 5-6 minutes. Keep the customer website portion to about 60-90 seconds,
then use the mobile app for the main customer purchase, as originally planned.

### 1. Introduction and customer website | 0:00-1:15

**Show:** Website homepage → **Cameras** (`/products`) → one filter → a product
page. Point out price, condition, specifications, and reviews. Do not place a
second order on the website.

**Say:**

> Hello! This is RePXL, an e-commerce platform for vintage digital cameras.
> This first video demonstrates the customer module through a brief website
> tour and the main shopping journey in the mobile app. On the website,
> customers can browse cameras, filter the collection, and inspect product
> specifications, condition, price, and customer reviews.

**Transition:**

> I will now continue on mobile using a demo customer account. The sign-in
> process is demonstrated separately in Video 2.

### 2. Mobile discovery and product tools | 1:15-2:45

**Show:** Mobile **Home** → **Search** → search/filter → main camera. Show its
condition/specifications, tap **Wishlist**, briefly show comparison with a second
camera, then return to the main camera. Show **Try the Look** if rehearsed.

**Say:**

> The mobile app lets customers explore the collection and narrow their
> choices. Here, I am looking for [camera model or brand]. I can inspect its
> specifications and condition, save it to my wishlist, or compare it with
> another model. Try the Look offers a simulated vintage color preview to
> help explore the visual style. I will choose [camera model] for this purchase.

**Director note:** The color preview is illustrative. Comparison may display
`Not listed` for missing specifications. Do not promise an exact camera-photo
reproduction or invent missing product data.

### 3. Cart and checkout | 2:45-4:45

**Show:** Add the main camera → **Cart** → selected-item checkbox → prepared
voucher, if available → checkout. Select the address, show the address-entry
option, choose a courier and **Cash on Delivery**, review the amount, and tap
**Place Order**. Pause on the confirmation and record the order number.

**Say:**

> In the cart, I can review my items and choose which ones to purchase.
> [If applicable: I can apply this valid voucher and see the adjusted total.]
> At checkout, I select my delivery address, courier, and payment method.
> For this demonstration, I am choosing Cash on Delivery. This requires
> administrator approval before the order is officially placed and dispatched.

**After confirmation appears:**

> The COD request has been received. Its order number is [actual order number].
> We will follow this same order in the administrator module in Video 3.

**Director note:** If showing selective checkout, add two cameras but purchase
only the main one. Do not call the initial COD request paid or approved. Mobile
checkout uses its own screen; do not apply the website's four-step labels to it.

### 4. Account, tracking, and support | 4:45-5:45

**Show:** **Account** → briefly show **Addresses**, **My Wishlist**, and **My
Purchases** → open the new order. If time permits, show **Customer Support &
FAQs** or ask one rehearsed question in **AI Vintage Camera Concierge**.

**Say:**

> The Account area brings together customer addresses, wishlist items,
> purchases, reviews, and notifications. My Purchases lets me reopen this
> order and check its current progress. FAQs and the automated concierge
> provide help with common shopping and store-policy questions.

**Closing:**

> That completes the customer-module tour. The next video demonstrates
> customer and administrator sign-in.

**Director note:** The concierge is a local rule-based responder. Avoid claims
of unrestricted AI answers, live human chat, or shared website/mobile chat history.

## Video 2: Log-in Module

**Target:** 3-4 minutes. Start with signed-out customer and admin browser sessions.
Use demo credentials and keep passwords masked. Registration, Google sign-in,
password recovery, and MFA can be brief optional additions if required and rehearsed.

### 1. Introduction and form validation | 0:00-0:45

**Show:** Customer website `/login`. Submit once with empty fields to show the
required-field messages. If desired, use one incorrect password with the demo
account to show a failed attempt, then correct it.

**Say:**

> This video demonstrates the RePXL log-in module. Customers enter their email
> address and password to access their account. The form identifies missing
> details, and a failed sign-in lets the customer correct their credentials
> before trying again.

**Director note:** Describe only the messages actually displayed. Avoid repeated
failed attempts and do not read technical failure text aloud as a product claim.

### 2. Successful customer website login and logout | 0:45-1:45

**Show:** Enter valid demo credentials → **Log In** → authenticated account.
Refresh the page to show the session remains available. Use **Logout**, confirm
when prompted, then revisit the account area to show the sign-in prompt or
redirect actually displayed.

**Say:**

> With valid credentials, the customer can access their account and shopping
> information. Refreshing the page keeps this active session available.
> Logging out ends access to the signed-in account, and the customer must
> authenticate again to continue using its protected features.

### 3. Mobile customer login | 1:45-2:45

**Show:** Mobile sign-in screen → same demo customer credentials → **Sign In** →
**Account**. If the account has MFA, show its authenticator challenge and complete
it without exposing a recovery code or setup secret.

**Say:**

> The customer can also sign in through the mobile app using the same account.
> After a successful sign-in, the app opens the customer account area.
> [Only if shown: This account also requires its authenticator code before
> access is granted.]

### 4. Administrator login and transition | 2:45-3:45

**Show:** Separate admin browser profile → `/admin/login` → valid administrator
credentials → **Sign In to Dashboard** → dashboard. Leave this session ready
for Video 3.

**Say:**

> Administrators use a separate sign-in page to access store-management tools.
> After signing in with an administrator account, the dashboard becomes
> available. The next video demonstrates administration and database-backed
> Create, Read, Update, and Delete operations.

**Optional additions:** Show the registration/password-recovery entry points
without claiming an email arrived unless it did. Demonstrate Google sign-in or
MFA only after rehearsing the configured journey. Do not enable or reset MFA
solely to fill recording time.

## Video 3: Admin Module (Create, Read, Update, Delete) - Connected to Database

**Target:** 7-8 minutes. Use **Static Pages** for one complete CRUD cycle and
**Cameras/Orders** for the store-management context. Show database evidence during
the operations, rather than relying only on a success message or an open form.

### Demo record and database evidence

Use this temporary **custom** page, keeping it in **Draft (Admin Only)** status:

| Field | Create value | Update value |
|---|---|---|
| Title | RePXL Demo CRUD | RePXL Demo CRUD Updated |
| URL slug | `repxl-demo-crud` | Keep the same slug |
| Body Content | `Temporary draft created for the admin demonstration.` | `Temporary draft updated during the admin demonstration.` |
| Status | Draft (Admin Only) | Keep Draft (Admin Only) |

Use a fresh suffix if the slug already exists and use that exact slug in every
lookup. Avoid the existing About, Terms, Privacy, or other core pages.

In the database viewer, filter **`static_pages`** to this slug. A read-only query
for a viewer with an SQL editor is:

```sql
SELECT id, slug, title, body, status, updated_at
FROM static_pages
WHERE slug = 'repxl-demo-crud';
```

Rerun/refresh the filtered result after each action. Expected evidence:

| Stage | Database result to show |
|---|---|
| Before Create | No matching row |
| After Create / Read | One row with the entered content and `DRAFT` status |
| After Update | The same row ID and slug with the changed title/body |
| After Delete | No matching row |

These are the intended recording checkpoints, not database results already
verified by this documentation task. If the database viewer is unavailable,
record server reloads and the audit entries, and identify direct database-viewer
proof as outstanding. A visible form or success toast alone does not demonstrate
all four persisted outcomes.

### 1. Dashboard and scope | 0:00-0:30

**Show:** `/admin` dashboard. Briefly point out camera, stock, order, revenue,
and inventory-alert figures using the values displayed.

**Say:**

> This is the RePXL administrator module. It provides an overview of inventory
> and orders. I will demonstrate a complete Create, Read, Update, and Delete
> cycle using a temporary draft page, with the database record visible after
> each operation. I will then process the customer's order from Video 1.

### 2. Create | 0:30-1:45

**Show:** Database filtered lookup with no matching row → **Static Pages**
(`/admin/cms/pages`) → **+ New Page** → enter the demo values → explicitly select
**Draft (Admin Only)** → **Create Page**. Wait for success. Refresh the database
result and show the new row and its ID.

**Say:**

> First is Create. I will add a temporary custom page and keep it as a draft.
> After saving, I will check the database. The new row contains the title,
> slug, content, and draft status I entered.

**Director note:** The UI's new-page form initially defaults to Published, so
select Draft explicitly before saving. Do not publish the demo page.

### 3. Read | 1:45-2:30

**Show:** Reload `/admin/cms/pages`, search for `repxl-demo-crud`, and click
**Edit** to retrieve the saved values. Point to the matching database row ID.

**Say:**

> Next is Read. After reloading the page, I can retrieve the record and reopen
> its saved details. The matching database row confirms which record this
> screen is displaying.

### 4. Update | 2:30-3:30

**Show:** Change the title and body to the update values. Keep the slug and
Draft status. Click **Update Page**. Reload and reopen the record, then refresh
the database lookup to show the same ID with changed content.

**Say:**

> For Update, I will change the draft's title and content and save it.
> Reopening the record shows the saved changes. In the database, the same row
> ID now contains the updated values.

### 5. Delete | 3:30-4:30

**Show:** Close the edit form using its cancel control, find only the temporary
custom page, click **Delete**, and confirm. Reload the list and search again.
Refresh the database filter to show no matching row.

**Say:**

> Finally, Delete removes this temporary draft page. After confirmation, I
> will reload the list and check the database again. The record is no longer
> present. This completes the four database-backed CRUD operations.

**Director note:** Delete only the draft created for this demonstration. An
archived camera remains a stored product; do not substitute its archive action
for the actual deletion just demonstrated.

### 6. Activity log and inventory context | 4:30-5:15

**Show:** **Activity Logs** (`/admin/logs`) and the draft's creation/update/deletion
entries. Briefly show **Cameras** (`/admin/cameras`) and a camera edit form's
condition, price, serial number, and stock fields. Close without changing a
real listing.

**Say:**

> The activity log records these administrative changes. For store inventory,
> administrators can also maintain camera details, condition grades, pricing,
> serial numbers, and stock. Camera archiving removes a listing from customer
> browsing while preserving its stored record.

### 7. Process the Video 1 order | 5:15-6:45

**Show:** **Orders** (`/admin/orders`) → search the actual order number from
Video 1 → open its details → **Approve COD** and confirm → advance **In Transit**,
**Out for Delivery**, then **Delivered**. After simulated cash collection on this
demo order, use **Mark Payment Completed**. Pause after each successful change.

**Say:**

> This is the same order placed through the mobile app in Video 1. I can
> review its items, delivery details, total, and payment method. I will
> approve the Cash on Delivery request, then simulate its delivery stages.
> After simulated cash collection, I can record its payment as completed.
> Delivery progress and payment status are tracked separately.

**Director note:** The delivery map is a simulation, not verified courier GPS.
Do not use manual payment completion to imitate a confirmed PayMongo payment.
The administrator does not set the final customer-confirmed Completed state.

### 8. Customer confirmation and combined closing | 6:45-7:45

**Show:** Return to mobile → relevant notification, if available, or **My
Purchases** → same order → refresh → **Delivered** → **Confirm Delivery Received**
→ **Yes, Confirm Received** → **Completed**. If time permits, show the same order
on the customer website at `/account/orders`, signed in with the same customer.

**Say:**

> Returning to the mobile app, the customer can see the updated order
> progress. Once it is delivered, the customer confirms receipt and the
> order becomes Completed. This connects the customer purchase to the store's
> administrative operations.

**Closing:**

> Across these three videos, we have demonstrated the customer module,
> sign-in, and database-backed administration, including Create, Read, Update,
> and Delete. Thank you for watching.

**Director note:** Current mobile receipt confirmation submits a default five-star
review and the comment `Order received in good condition.` The shared API creates
a purchase review if one does not already exist. Use **My Reviews** to inspect or
edit that review; do not plan a duplicate review submission afterward.

### Source reference for the CRUD explanation

| Action | Repository implementation |
|---|---|
| Create | `POST /api/admin/cms/pages` → `prisma.staticPage.create` |
| Read | List/detail `GET /api/admin/cms/pages` and `/api/admin/cms/pages/[id]` |
| Update | `PATCH /api/admin/cms/pages/[id]` → `prisma.staticPage.update` |
| Delete | `DELETE /api/admin/cms/pages/[id]` → `prisma.staticPage.delete` |
| Database table | Prisma `StaticPage` maps to `static_pages` in `prisma/schema.prisma` |
| Audit | CMS mutations create entries in `admin_logs` |

These are presenter reference notes. The spoken demo can stay focused on the
visible actions and persisted results.

## Combining and submitting the videos

1. Keep each original clip with its own title and a brief introduction/closing.
2. Join them in the submission order: **User Module → Log-in Module → Admin
   Module**. A simple two-second title card between modules is enough.
3. Use consistent volume and framing. Remove long typing/loading gaps while
   retaining each submitted action, confirmation, refresh, and database result.
4. Keep the main order number consistent between Videos 1 and 3. Keep the CRUD
   slug and database record ID consistent throughout Video 3.
5. Retain the three separate uploads/links if the submission asks for all three;
   the combined video is an additional presentation copy. Test link access from
   a signed-out browser before filling in the submission template.
6. For standalone uploads, retain each video's closing. For the combined version,
   trim repeated greetings while keeping the transitions and final closing.

## Optional scenes and shorter cut

- **PayMongo test payment:** Replace the COD branch in Video 1 only after
  rehearsing a confirmed test-mode payment on the actual app/backend. Follow the
  existing [checkout testing guide](./checkout.md#10-card-payment-testing--hardening-2026-10-19).
  Show authorization and the returned confirmed payment state. In Video 3, omit
  COD approval and simulated cash collection. If payment remains pending, say so;
  identify any switch to a prepared paid test order explicitly.
- **Returns/refunds:** Add 2-3 minutes only after rehearsing the deployed workflow.
  Use a separate eligible demo order and the [returns prerequisites](./returns.md#database-and-release-prerequisites).
  Show item selection, reason/evidence, review, admin approval/instructions, and
  tracking. Receipt/inspection precede refunds. Approval does not mean refunded;
  COD repayment references record a repayment made outside the app. Paid-order
  cancellation does not automatically refund.
- **More admin modules:** Briefly show Vouchers, Customers, Banners, or Homepage
  controls if required. Admin Management requires a super-admin. Avoid publishing
  demo content or sending broadcasts solely for a tour.
- **Shorter version:** Trim comparison, Try the Look, support, and the extra
  inventory tour first. Retain the website portion, customer purchase, actual
  logins, all four CRUD actions with database checkpoints, and order continuity.

## Presenter checklist

- [ ] Three original video files retained with the required module titles.
- [ ] Customer website is visibly covered; mobile remains the main shopping demo.
- [ ] Website/mobile customer login and admin login appear in Video 2.
- [ ] Same backend and demo customer used for cross-client order checks.
- [ ] CRUD draft starts absent, is created/read/updated, and is actually deleted.
- [ ] Draft status selected explicitly; core storefront pages left intact.
- [ ] Database results show the matching slug and unchanged ID before deletion.
- [ ] Same order number visible in Videos 1 and 3; delivery simulation identified.
- [ ] Customer receipt confirmation produces the visible Completed state.
- [ ] No credentials or unrelated personal records appear in the footage.
- [ ] Combined edit reviewed; three individual submission links checked.

## Preparation verification and limits

This documentation-only plan was checked against the customer website/mobile
login screens, admin login, camera archive controls, CMS UI and route handlers,
Prisma table mappings, and the previously inspected shared order workflow.
Relative documentation links, their heading targets, and the referenced module
route files were checked; `git diff --check` passed.

No application source was changed. TypeScript, Vitest, and production builds
were not run for this documentation-only task. No device/browser journey,
database mutation/query, provider transaction, migration application, video
recording, upload, or editing was performed. The presenter checklist remains
unverified until rehearsal/recording. Existing acceptance and release limitations
remain in the [mobile plan](./mobile-app-development-plan.md),
[returns guide](./returns.md), and [project checklist](./Group2_ProjectChecklist.md).

