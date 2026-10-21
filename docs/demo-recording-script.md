# RePXL demo recording script

Prepared 2026-10-21. Target length: **12-15 minutes**, excluding optional scenes.
Customer shopping is demonstrated primarily in the mobile app; administration
uses the website, with a short customer website introduction and a final shared
order check. Timings include tapping, loading, and transitions; the narration
does not need to fill every second.

## Recording setup

- Use a demo customer and an administrator account. Sign in before recording,
  or record a short login clip without showing credentials. Keep customer and
  admin browser sessions in separate profiles/windows.
- Confirm the installed app and website use the same backend/environment.
  Rehearse one purchase and the admin-to-mobile status refresh before recording;
  source inspection alone does not verify the installed APK or deployment.
- Choose one available camera as the main purchase and a second for comparison.
  Keep their names handy. Use a saved Philippine delivery address with demo
  contact information, and start with a clean demo cart.
- If showing selective checkout, add both cameras and select only the main one.
  If showing quantity changes, choose an item with sufficient stock.
- Prepare an active voucher whose dates, minimum purchase, discount cap, and
  usage limits permit this customer's purchase. Use its actual code on screen.
  Skip voucher application if no suitable voucher is available.
- The main script uses **Cash on Delivery (COD)**. It demonstrates the approval
  workflow without requiring an online payment. Use test data for simulated
  delivery and cash collection. If payment processing is required for the demo,
  use the optional rehearsed PayMongo test-mode scene instead.
- Have a separate demo camera available if you want to save an inventory edit.
  Prepare any optional return case in advance; see the prerequisites below.
- Enable Do Not Disturb, hide personal notifications, and frame the phone screen
  large enough for viewers to read. Pause briefly after each important result.

**Continuity cue:** follow the same camera and generated order number from mobile
checkout to admin fulfillment and back to mobile. Read the actual number displayed
instead of inventing a sample number. Describe delivery advancement as a demo
simulation; the delivery map is a simulation rather than verified courier GPS.

## Main recording script

Read the **Say** paragraphs aloud. Follow **Show** as recording directions.
Bracketed names are placeholders to replace with the actual item on screen.

### 1. Introduction | 0:00-0:30 | Customer website

**Show:** The website homepage with the RePXL branding visible.

**Say:**

> Hello! This is RePXL, an e-commerce platform for vintage digital cameras. In
> this demonstration, I will show how a customer discovers and purchases a camera
> using the mobile app, and how an administrator manages that order through the
> website. I will also briefly show the customer website.

### 2. Brief customer website tour | 0:30-1:30

**Show:** Scroll the homepage once, open **Cameras** (`/products`), apply one
filter, and open a camera's product detail. Point out price, condition,
specifications, and the customer reviews section. Clear any restrictive filter
before leaving. Keep this scene to about one minute.

**Say:**

> Customers can shop through the website as well. The homepage introduces the
> collection, while the Cameras page helps shoppers narrow their choices by
> brand, condition, price, and availability. Each product page brings together
> the camera's details, condition, and customer reviews to support the purchase
> decision. I will now continue the main customer journey in the mobile app.

### 3. Mobile account and discovery | 1:30-2:45

**Show:** Switch to the app. Show the signed-in **Account** screen briefly,
then **Home** and **Search**. Search for the chosen camera or brand. Apply a
brand or price filter and show the results. Open the condition-grading help if
time permits. Do not spend the scene filling registration fields.

**Say:**

> This is the RePXL customer mobile app. Customers can create an account or sign
> in to manage their shopping activity. For this recording, I am already signed
> in with a demo account. From Home and Search, I can explore the collection and
> narrow the results. Here, I am looking for [camera model or brand], and I can
> check its condition before choosing a camera.

### 4. Product details and shopping tools | 2:45-4:00

**Show:** Open the chosen camera. Show its price, stock, condition, and
specifications. Tap **Wishlist**. Open **Try the Look**, briefly demonstrate a
preview, and close it. Add the main camera and a second camera to comparison;
open the comparison view and return to the main camera. Skip a tool if rehearsal
shows it is unavailable on the recording device.

**Say:**

> On the product page, I can inspect the camera's specifications, price, and
> condition. I can save it to my wishlist or compare it with another model.
> Try the Look provides a simulated vintage color preview to help explore the
> visual style. Here, comparison helps me consider the available specifications
> before I choose [camera model]. I will add this camera to my cart.

**Director note:** The color preview is illustrative; do not describe it as an
exact reproduction of photographs taken by the physical camera. Comparison may
show `Not listed` where a product has no recorded specification.

### 5. Cart and mobile checkout | 4:00-6:00

**Show:** Add the camera and open **Cart**. Show the selected-item checkbox;
if two cameras are present, select only the one being purchased. Apply the
prepared voucher if available. Continue to checkout, select the saved address,
show the address-entry option, select a courier, and choose **Cash on Delivery**.
Pause over the total, then tap **Place Order**. Show the confirmation screen and
the generated order number.

**Say:**

> In the cart, I can review my items and choose which ones to check out.
> [If applying a voucher: I can also apply a valid voucher and see the discount
> reflected in the total.] At checkout, I select my *delivery* address and courier,
> then review the payment option and final amount. For this demonstration, I am
> choosing Cash on Delivery. This requires store approval before the order is
> officially placed and prepared for dispatch.

**After the result appears, say:**

> The COD request has been received, and this is its order number. I will follow
> this same order in the administrator website shortly.

**Director note:** COD approval and payment collection are separate steps. Do not
describe the initial confirmation as an online payment or an approved COD order.
The mobile checkout is its own screen; the website's four-step checkout labels
should not be applied to it.

### 6. Mobile account and support | 6:00-7:00

**Show:** Open **Account**, briefly show **Addresses**, **My Wishlist**, and
**My Purchases**. Open the new order and show its current approval/tracking
information. If time permits, open **Customer Support & FAQs** or **AI Vintage
Camera Concierge**, ask one rehearsed supported question, then return.

**Say:**

> The Account area keeps my addresses, wishlist, purchases, reviews, and
> notifications together. My Purchases lets me reopen this order and check its
> progress. The app also includes FAQs and an automated concierge for common
> shopping and store-policy questions. I will now switch to the administrator's
> view to process the customer's request.

**Director note:** The concierge is a local rule-based responder. Demonstrate a
supported store question; do not promise unrestricted AI answers, live human
chat, or shared website/mobile chat history.

### 7. Admin dashboard | 7:00-7:45 | Admin website

**Show:** Open the signed-in `/admin` dashboard. Point out **Total Cameras**,
**Total Stock**, **Total Orders**, **Revenue**, and inventory alerts using the
values actually displayed.

**Say:**

> Administration is handled through the website. The dashboard gives the store
> an overview of its cameras, available stock, orders, revenue, and stock alerts.
> These views help the administrator identify orders that need attention and
> inventory that may need replenishment.

### 8. Inventory and vouchers | 7:45-9:00

**Show:** Open **Cameras** (`/admin/cameras`), search for a camera, and open its
edit form. Point out price, condition grade, condition notes, serial number,
and stock. To demonstrate a save, make a small valid change to the separate
demo camera's condition notes and save it. Otherwise, close the form without
claiming an update. Open **Vouchers** (`/admin/vouchers`) and show the voucher
used earlier, or open **Add Voucher** to show its controls.

**Say:**

> Camera management lets the administrator maintain product information,
> condition grading, serial numbers, pricing, and stock. Clear condition notes
> are especially useful when selling vintage equipment. Voucher management
> provides controls for discount values, purchase requirements, validity dates,
> and usage limits.

**Optional after a successful demo edit:**

> I have saved this update to the demo camera's condition notes.

### 9. Process the same customer order | 9:00-10:45

**Show:** Open **Orders** (`/admin/orders`), find the number from mobile checkout,
and open the order details. Show its camera, totals, courier, and payment method.
Click **Approve COD** and confirm. Advance the demo order through **In Transit**,
**Out for Delivery**, and **Delivered**, pausing after each successful update.
After the simulated delivery, click **Mark Payment Completed** to represent cash
collection on this demo order. Do not use that control to imitate PayMongo
payment verification.

**Say:**

> Here is the same order submitted from the mobile app. The administrator can
> review its items, delivery information, total, and payment method. Because it
> uses Cash on Delivery, I will approve the request first. I will now simulate
> the delivery stages for this demonstration: In Transit, Out for Delivery, and
> Delivered. After the simulated cash collection, I can record the COD payment
> as completed. Delivery status and payment status are tracked separately.

**Director note:** Fulfillment advancement here is manual demo activity. The
admin map is labeled **Live Delivery Map Simulation**. The administrator does
not set the final **Completed** state; the customer confirms receipt.

### 10. Return to mobile: status, notification, receipt | 10:45-12:15

**Show:** Switch to the app. Open **Account → Notifications** and the relevant
order update, if present. Otherwise, open **My Purchases**, select the same
order, and use its refresh control. Show **Delivered** and the tracking timeline.
Tap **Confirm Delivery Received**, then **Yes, Confirm Received**. Wait for
**Completed**. Open **My Reviews** to show the resulting review; edit it if
personalized feedback is part of the recording.

**Say:**

> Returning to the mobile app, I can refresh the same order and see the status
> recorded by the administrator. Order notifications also help the customer
> follow its progress. The order is now delivered, so I can confirm that I have
> received it. After confirmation, its status changes to Completed. This shows
> the connection between the customer's mobile purchase and the store's website
> operations.

**Director note:** In the current mobile source, receipt confirmation sends a
default five-star rating and the comment `Order received in good condition.`
through the shared receipt API. The API creates the purchase review if one does
not already exist. Use **My Reviews** to inspect/edit it; do not plan to submit
a duplicate product review afterward. Rehearse this behavior with a fresh demo
customer/product combination.

### 11. Admin controls and brief customer web confirmation | 12:15-13:15

**Show:** In admin, show **Customers** (`/admin/customers`) and **Activity Logs**
(`/admin/logs`). Keep this brief. Switch to the customer browser profile using
the same account as mobile, open `/account/orders`, and show the same order's
current state. Refresh if necessary.

**Say:**

> The administrator also has customer-management tools and an activity log for
> reviewing recorded actions. Finally, I can open the customer website with the
> same account and find this order there as well. Customers can access their
> order information through either interface, while the administrator manages
> store operations through the website.

### 12. Closing | 13:15-13:45

**Show:** End on the completed order or the homepage.

**Say:**

> That completes the RePXL demonstration: discovering a vintage camera,
> reviewing its details, placing a mobile order, processing it through the admin
> website, and confirming receipt as the customer. RePXL brings these shopping
> and store-management activities into one connected workflow. Thank you for
> watching.

## Optional scenes

### PayMongo test payment | Replace COD checkout; allow 1-2 extra minutes

Use this version if online payment integration must appear in the recording.
Rehearse it on the actual installed app and backend in confirmed **test mode**.
Use the existing [checkout test guide](./checkout.md#10-card-payment-testing--hardening-2026-10-19)
for the configured sandbox scenarios. Do not enter a real card or assume that a
demo fallback represents a provider payment.

**Show:** Choose card or the configured test payment method, enter its test
details, complete any authorization shown, return to the app, and refresh the
order until its actual payment result is visible.

**Say:**

> For this payment demonstration, I am using the configured test environment.
> I will complete the payment authorization and return to RePXL to check the
> result. [Only after a confirmed paid result appears: The order now shows a
> confirmed payment, and the administrator can proceed with fulfillment.]

In the admin scene, omit **Approve COD** and the simulated cash-collection step.
Show the provider-confirmed payment state. If payment stays pending, show that
state honestly and use a previously prepared paid test order for the remaining
fulfillment scenes, explicitly explaining the switch.

### Returns and refunds | Allow 2-3 extra minutes

Only include after rehearsing the deployed workflow. The
[returns guide](./returns.md#database-and-release-prerequisites) records a prepared
migration whose application was unverified in that task; confirm the target
environment is ready before relying on this scene. Use a separate eligible demo
order, within its return window, with any required evidence already available.

**Show:** Mobile order → **Returns & Refunds** → item selection → reason and
required evidence → refund estimate/review → submit. In admin, open **Returns**
(`/admin/returns`), review the case, and approve with return instructions. Return
to mobile to show those instructions and shipment tracking. Receipt, inspection,
and refund progression can use a separately prepared later-stage case, clearly
identified as such.

**Say:**

> If an eligible purchase has an issue, the customer can select the affected
> items, explain the reason, attach required evidence, and review the estimated
> refund before submitting a return request. The administrator reviews the case
> and supplies return instructions. The customer can then follow the return and
> refund milestones. Approval begins the return process; refund completion is
> shown only after the relevant payment outcome is confirmed.

For COD, record a refund reference only after repayment has happened outside the
app. That reference does not send money. Paid-order cancellation does not
automatically issue a refund; do not present cancellation as a refund shortcut.

### Additional admin tools | Allow 30-60 seconds

If the assessment requires broader module coverage, briefly show **Static
Pages**, **Banners**, **Homepage**, and **Archived Data**. Show **Admin Management**
only with a super-admin account. Describe visible controls without publishing
content, sending broadcasts, or archiving real customer records for the recording.

## Shorter cut and recording checklist

For an **8-10 minute** cut, keep the introduction, a 30-second customer website
tour, mobile search/product/cart/checkout, the admin dashboard and order scene,
mobile receipt confirmation, and the closing. Remove comparison, support, the
separate inventory edit, voucher-management tour, and optional scenes first.

- [ ] Same customer account and backend on mobile and customer website.
- [ ] Main camera is available; voucher and address have been rehearsed.
- [ ] Order number is readable at checkout, in admin, and on return to mobile.
- [ ] COD approval is shown, or confirmed test payment replaces the COD branch.
- [ ] Delivery simulation and any prepared later-stage case are identified.
- [ ] Customer confirmation produces the visible Completed state.
- [ ] No real credentials, payment details, or unrelated customer records appear.
- [ ] Completed take reviewed for readable text, audio, pauses, and loading gaps.

## Preparation verification and limits

This is a documentation-only recording plan, not a new application acceptance
result. Its routes, screen labels, COD approval/payment separation, fulfillment
stages, mobile receipt-review behavior, and shared data flow were checked against
the repository source and existing guides. Relative documentation links and
listed main route files were checked, and `git diff --check` passed.

TypeScript, Vitest, and production builds were not run for this documentation-only
task. No device/browser interaction, provider transaction, migration application,
or actual recording was performed. The recording checkboxes above remain for the
presenter to complete during rehearsal. Existing runtime and release limitations
remain tracked in the [mobile plan](./mobile-app-development-plan.md),
[returns guide](./returns.md), and [project checklist](./Group2_ProjectChecklist.md).
