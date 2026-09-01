# Requirements Document

## Introduction

The Admin & Client Management Suite extends the existing RePXL vintage digicam
e-commerce platform with a set of operational and customer-facing capabilities that
build on the current PostgreSQL/Prisma data model and existing systems (orders,
products, users, vouchers, admin logs, newsletter, and PayMongo payment tracking).

The suite covers six admin capabilities — printable invoices and packing slips,
returns/refunds handling, a content management system for static pages and homepage
content, platform-wide settings, and configurable automated notifications — and two
customer-facing capabilities — an in-app/email notification center and an order
history/tracking view that lets customers request returns and refunds.

All admin surfaces follow the calm, utilitarian admin visual style. All storefront
surfaces follow the RePXL storefront design language (corner-bracket motif, condition
badges, monospace technical labels). New Prisma models are introduced for CMS pages,
banners/promotions, platform settings, notifications, notification templates, and
return/refund requests, while existing models (Order, OrderItem, User, Voucher,
AdminLog, NewsletterSubscriber) are reused and extended.

## Glossary

- **RePXL_System**: The overall RePXL Next.js application, including storefront, admin
  portal, API routes, and database layer.
- **Admin_Portal**: The role-protected admin dashboard accessible to users with the
  ADMIN role.
- **Storefront**: The customer-facing portion of the RePXL_System.
- **Admin_User**: An authenticated user whose role is ADMIN.
- **Super_Admin**: An Admin_User whose `isSuperAdmin` flag is true.
- **Customer**: An authenticated user whose role is CUSTOMER.
- **Order_Management_System**: The subsystem of the Admin_Portal that manages orders,
  their status, invoices, packing slips, and return/refund workflows.
- **Invoice_Generator**: The component that renders a printable invoice document for a
  single order.
- **Packing_Slip_Generator**: The component that renders a printable packing slip
  document for a single order.
- **Return_Management_System**: The subsystem that records, reviews, approves, rejects,
  and refunds return/refund requests.
- **Return_Request**: A record capturing a Customer's request to return items from an
  order and/or receive a refund, including status, reason, and linked order. A
  Return_Request status is one of the following set: REQUESTED, UNDER_REVIEW, APPROVED,
  REJECTED, REFUNDED.
- **Return_Window**: The period of 30 calendar days from an order's delivery or
  completion date during which a Customer may initiate a return or refund request.
- **Payment_Gateway**: The PayMongo integration used for charges and refunds, tracked
  via the existing `paymentStatus`, `paymentIntentId`, `paymentReference`, and
  `paymentSessionId` fields on the Order model.
- **CMS**: The Content Management System subsystem of the Admin_Portal.
- **Static_Page**: A CMS-managed content page such as About Us, Contact, FAQs, or
  Privacy Policy.
- **Banner**: A CMS-managed promotional visual placed on the Storefront (for example
  the homepage hero or a promotional strip).
- **Homepage_Content_Block**: A CMS-managed section of homepage content (for example
  featured products selection, editorial copy, or brand gallery ordering).
- **Settings_Manager**: The subsystem that stores and exposes platform-wide
  configuration (currency, shipping options, payment options).
- **Platform_Setting**: A single configuration entry stored by the Settings_Manager.
- **Notification_System**: The subsystem that composes, queues, sends, and records
  notifications to Customers.
- **Notification_Template**: A reusable, admin-configurable message definition tied to
  a notification event type.
- **Notification_Event**: A system occurrence that can trigger a notification, such as
  order confirmation, order status change, refund completion, or a promotion.
- **Notification**: A single message instance delivered to a Customer via in-app and/or
  email channel.
- **Notification_Center**: The Storefront view where a Customer reads in-app
  notifications.
- **Order_Tracking_View**: The Storefront view showing a Customer the current status
  and progression of an order.
- **Admin_Log**: An entry in the existing AdminLog model recording an Admin_User action.

## Requirements

### Requirement 1: Print Invoices

**User Story:** As an Admin_User, I want to generate a printable invoice for an order, so that I can provide the Customer with a formal record of their purchase.

#### Acceptance Criteria

1. WHEN an Admin_User opens an existing order in the Order_Management_System, THE Order_Management_System SHALL display a control to generate an invoice for that order.
2. WHEN an Admin_User requests an invoice for an order, THE Invoice_Generator SHALL render, within 5 seconds, a document containing the order number, order date, Customer full name, shipping address snapshot, and one row per line item showing product name, condition, per-item price, quantity, and line subtotal, followed by the order subtotal, shipping cost, discount amount, and total.
3. WHEN the Invoice_Generator renders an invoice, THE Invoice_Generator SHALL display every monetary amount using the currency configured in the Settings_Manager, formatted to exactly 2 decimal places.
4. WHEN an Admin_User generates an invoice, THE Invoice_Generator SHALL produce output sized to a single standard page format (A4 or US Letter) with all content positioned no closer than 10 millimeters to any page edge so that no content is clipped when printed.
5. IF an Admin_User requests an invoice for an order identifier that does not exist, THEN THE Order_Management_System SHALL display an error message indicating that the order was not found and SHALL NOT produce an invoice document.
6. IF the Invoice_Generator fails to render the invoice document, THEN THE Order_Management_System SHALL display an error message indicating that invoice generation failed and SHALL leave the order data unchanged.
7. WHEN an Admin_User generates an invoice, THE Order_Management_System SHALL record an Admin_Log entry containing the action, the order number, the acting Admin_User identity, and a timestamp.

### Requirement 2: Print Packing Slips

**User Story:** As an Admin_User, I want to generate a printable packing slip for an order, so that I can include accurate fulfillment details with a shipment.

#### Acceptance Criteria

1. WHEN an Admin_User opens an existing order in the Order_Management_System, THE Order_Management_System SHALL display a control to generate a packing slip for that order within 3 seconds of the order view loading.
2. WHEN an Admin_User requests a packing slip for an order, THE Packing_Slip_Generator SHALL render a printable document within 5 seconds containing the order number, Customer full name, shipping address snapshot, courier name, courier estimate, and all line items, where each line item includes product name, condition grade (Mint, Excellent, Good, or Fair), and quantity.
3. WHERE a product has a serial number recorded, THE Packing_Slip_Generator SHALL display the serial number for that line item, and WHERE no serial number is recorded, THE Packing_Slip_Generator SHALL display an explicit "not recorded" indicator for that line item.
4. WHEN the Packing_Slip_Generator renders a packing slip, THE Packing_Slip_Generator SHALL exclude per-item prices and order totals.
5. WHEN an Admin_User generates a packing slip, THE Order_Management_System SHALL record an Admin_Log entry containing the action performed, the order number, the acting Admin_User identity, and the timestamp of the action.
6. IF an Admin_User requests a packing slip for an order that does not exist or cannot be retrieved, THEN THE Packing_Slip_Generator SHALL NOT render a document and THE Order_Management_System SHALL display an error message indicating the packing slip could not be generated, while preserving the order record unchanged.
7. IF a requested order is missing a required field among order number, Customer full name, or shipping address snapshot, THEN THE Packing_Slip_Generator SHALL NOT render the document and THE Order_Management_System SHALL display an error message indicating which required fulfillment detail is missing.

### Requirement 3: Customer-Initiated Return and Refund Requests

**User Story:** As a Customer, I want to request a return or refund for an order, so that I can resolve issues with a purchase.

#### Acceptance Criteria

1. WHILE a Customer is viewing an order in the Order_Tracking_View whose status is DELIVERED or COMPLETED and whose delivery or completion date is within the preceding 30 calendar days, THE Storefront SHALL display an enabled control to request a return or refund for that order.
2. WHILE a Customer is viewing an order whose status is DELIVERED or COMPLETED but whose delivery or completion date is more than 30 calendar days in the past, THE Storefront SHALL display the return or refund control in a disabled state with a message indicating that the 30-day return window has expired.
3. WHEN a Customer submits a return or refund request that includes at least one selected order item and a reason between 10 and 1000 characters in length, THE Return_Management_System SHALL create a Return_Request linked to the order, containing the selected order items, the reason provided by the Customer, and an initial status of REQUESTED.
4. WHEN a Customer opens the return or refund request form, THE Return_Management_System SHALL require the Customer to select a minimum of 1 and a maximum of all order items on the order and to provide a reason of 10 to 1000 characters before submission is accepted.
5. IF a Customer submits a return or refund request without selecting at least one order item, or with a reason shorter than 10 characters or longer than 1000 characters, THEN THE Return_Management_System SHALL reject the submission, retain the Customer's entered data, and display a message identifying each missing or invalid field.
6. IF a Customer submits a return or refund request for an order that already has a Return_Request with status REQUESTED or UNDER_REVIEW, THEN THE Return_Management_System SHALL reject the submission without creating a new Return_Request and display a message stating that a request is already in progress.
7. WHEN a Return_Request is created, THE Notification_System SHALL send a notification to the Customer within 60 seconds confirming that the request was received.
8. WHILE a Customer is viewing an order with an associated Return_Request, THE Storefront SHALL display the current status of the Return_Request.

### Requirement 4: Admin Review and Processing of Returns and Refunds

**User Story:** As an Admin_User, I want to review and process return and refund requests, so that I can approve valid requests and issue refunds.

#### Acceptance Criteria

1. THE Return_Management_System SHALL display a list of Return_Requests sorted by request date in descending order, where each entry shows the order number, Customer name, request date, reason, and current status.
2. IF no Return_Requests exist, THEN THE Return_Management_System SHALL display an empty-state message indicating that there are no return requests and SHALL display no list rows.
3. WHEN an Admin_User opens a Return_Request, THE Return_Management_System SHALL display the linked order details, the selected order items, and the Customer-provided reason.
4. WHILE a Return_Request status is REQUESTED, WHEN an Admin_User marks the Return_Request as under review, THE Return_Management_System SHALL set the Return_Request status to UNDER_REVIEW.
5. WHILE a Return_Request status is REQUESTED or UNDER_REVIEW, WHEN an Admin_User approves the Return_Request, THE Return_Management_System SHALL set the Return_Request status to APPROVED.
6. WHILE a Return_Request status is REQUESTED or UNDER_REVIEW, WHEN an Admin_User rejects the Return_Request and provides a rejection reason of 1 to 500 characters, THE Return_Management_System SHALL set the Return_Request status to REJECTED and record the rejection reason entered by the Admin_User.
7. IF an Admin_User attempts to reject a Return_Request with a rejection reason that is empty or contains only whitespace, THEN THE Return_Management_System SHALL reject the action, keep the Return_Request status unchanged, and display an error message indicating that a rejection reason is required.
8. WHILE a Return_Request status is APPROVED, THE Return_Management_System SHALL display a control to process a refund through the Payment_Gateway.
9. WHEN an Admin_User processes a refund for an approved Return_Request whose order has paymentStatus PAID, THE Return_Management_System SHALL request the refund from the Payment_Gateway using the order's payment reference.
10. IF an Admin_User attempts to process a refund for a Return_Request whose order paymentStatus is not PAID, THEN THE Return_Management_System SHALL reject the action, keep the Return_Request status as APPROVED, and display an error message indicating that the order is not eligible for a refund.
11. WHEN the Payment_Gateway confirms a refund, THE Return_Management_System SHALL set the order paymentStatus to REFUNDED and set the Return_Request status to REFUNDED.
12. IF the Payment_Gateway reports a failure or does not respond within 30 seconds while processing a refund, THEN THE Return_Management_System SHALL keep the Return_Request status as APPROVED, keep the order paymentStatus as PAID, and display the failure reason to the Admin_User.
13. WHEN a Return_Request status changes, THE Notification_System SHALL send a notification to the Customer describing the new status.
14. WHEN an Admin_User changes a Return_Request status or processes a refund, THE Return_Management_System SHALL record an Admin_Log entry containing the action, the order number, and the acting Admin_User identity.

### Requirement 5: Manage Static Content Pages

**User Story:** As an Admin_User, I want to create and edit static content pages, so that I can keep the About Us, Contact, FAQs, and Privacy Policy pages current.

#### Acceptance Criteria

1. THE CMS SHALL display a list of Static_Pages sorted by last updated date in descending order, where each entry shows the page title, URL slug, publication status (draft or published), and last updated timestamp.
2. WHILE no Static_Pages exist, THE CMS SHALL display an empty-state message indicating that no content pages exist.
3. WHEN an Admin_User creates a Static_Page with a title of 1 to 200 characters, a URL slug of 1 to 100 characters containing only lowercase letters, digits, and hyphens, and body content of 1 to 100,000 characters, THE CMS SHALL persist the Static_Page.
4. IF an Admin_User submits a Static_Page with a missing or out-of-range title, a slug that is empty, out of range, or contains characters other than lowercase letters, digits, and hyphens, or missing body content, THEN THE CMS SHALL reject the submission, retain the entered values, and display a message identifying each invalid field.
5. IF an Admin_User submits a Static_Page with a URL slug that is already used by another Static_Page, THEN THE CMS SHALL reject the submission, retain the entered values, and display a message stating that the slug is already in use.
6. WHEN an Admin_User saves a Static_Page as published, THE CMS SHALL make the Static_Page content available at its URL slug on the Storefront within 5 seconds.
7. WHILE a Static_Page has publication status of draft, THE Storefront SHALL return a not-found response for that page's URL slug to visitors who are not Admin_Users.
8. WHEN an Admin_User updates a published Static_Page, THE Storefront SHALL serve the updated content at its URL slug within 5 seconds.
9. WHEN an Admin_User creates, updates, or deletes a Static_Page, THE CMS SHALL record an Admin_Log entry containing the action, the page slug, and the acting Admin_User identity.

### Requirement 6: Manage Promotions, Banners, and Homepage Content

**User Story:** As an Admin_User, I want to manage banners and homepage content blocks, so that I can control the promotional messaging shown to Customers.

#### Acceptance Criteria

1. THE CMS SHALL display a list of Banners in which each entry shows the banner title, placement, active state (enabled or disabled), and scheduled date range (start date and end date, or an indication that no schedule is set).
2. WHEN an Admin_User submits a new Banner with a non-empty title of 1 to 120 characters, a resolvable image reference, a placement selected from the CMS-defined placement set, and a link target formatted as a valid URL, THE CMS SHALL persist the Banner and display it in the Banner list.
3. IF an Admin_User submits a new or edited Banner with a missing or out-of-range title, a missing image reference, a placement not in the CMS-defined placement set, or a malformed link target, THEN THE CMS SHALL reject the submission, retain the Admin_User's entered values, and display an error indication identifying each invalid field.
4. IF an Admin_User submits a Banner whose scheduled start date is not strictly earlier than its scheduled end date, THEN THE CMS SHALL reject the submission and display an error indication that the start date must precede the end date.
5. WHERE a Banner has a scheduled start date and end date, THE Storefront SHALL display the Banner only from the start date up to and including the end date, and SHALL exclude the Banner before the start date and after the end date.
6. WHILE a Banner active state is disabled, THE Storefront SHALL exclude the Banner from all placements regardless of its scheduled date range.
7. WHEN an Admin_User edits a Homepage_Content_Block with a display order that is a positive integer from 1 to 999, THE CMS SHALL persist the updated content and display order.
8. IF an Admin_User submits a Homepage_Content_Block with empty content or a display order outside the range 1 to 999, THEN THE CMS SHALL reject the submission, retain the entered values, and display an error indication identifying each invalid field.
9. WHEN an Admin_User publishes changes to a Homepage_Content_Block, THE Storefront SHALL render the homepage using the updated content and display order within 5 seconds of publication.
10. WHEN an Admin_User creates, updates, or deletes a Banner or a Homepage_Content_Block, THE CMS SHALL record an Admin_Log entry containing the action, the affected item identifier, the acting Admin_User identity, and a timestamp.

### Requirement 7: Manage Platform Settings

**User Story:** As an Admin_User, I want to manage platform-wide settings, so that I can configure currency, shipping options, and payment options without code changes.

#### Acceptance Criteria

1. WHEN an Admin_User opens the platform settings view, THE Settings_Manager SHALL display the currently persisted currency, the list of shipping options with their names and costs, and the list of payment options with their enabled or disabled state.
2. WHEN an Admin_User saves a currency setting selected from the list of supported currencies, THE Settings_Manager SHALL persist the currency and display a confirmation that the currency was saved, and THE Storefront SHALL display all monetary amounts using the saved currency.
3. WHEN an Admin_User adds a shipping option with a name of 1 to 60 characters and a cost from 0.00 to 999,999.99, THE Settings_Manager SHALL persist the shipping option and THE Storefront SHALL offer the shipping option during checkout.
4. WHEN an Admin_User disables a payment option, THE Storefront SHALL exclude the disabled payment option from the checkout payment selection.
5. IF an Admin_User saves a shipping option with a cost below 0.00 or above 999,999.99, THEN THE Settings_Manager SHALL reject the submission, retain the values entered by the Admin_User, and display a message stating that the cost must be from 0.00 to 999,999.99.
6. IF an Admin_User saves a shipping option with a name that is empty, exceeds 60 characters, or duplicates the name of an existing shipping option, THEN THE Settings_Manager SHALL reject the submission, retain the values entered by the Admin_User, and display a message indicating the name is invalid or already in use.
7. WHERE no payment option is enabled, THE Settings_Manager SHALL display a warning that checkout will be unavailable to Customers.
8. WHEN an Admin_User changes a Platform_Setting, THE Settings_Manager SHALL record an Admin_Log entry containing the action, the setting name, the previous value, the new value, and the acting Admin_User identity.
9. IF persisting a Platform_Setting change fails, THEN THE Settings_Manager SHALL retain the previously persisted value, leave the Storefront behavior unchanged, and display a message indicating the change could not be saved.
10. WHERE an Admin_User is not a Super_Admin, THE Settings_Manager SHALL present platform settings in read-only mode.

### Requirement 8: Configure Notification Templates and Automation

**User Story:** As an Admin_User, I want to configure automated notifications, so that Customers receive timely, consistent messages for key events.

#### Acceptance Criteria

1. THE Notification_System SHALL display a list of Notification_Templates, each showing the associated Notification_Event, subject, delivery channel, and enabled state (enabled or disabled).
2. WHEN an Admin_User saves an edited Notification_Template with a subject of 1 to 200 characters and a body of 1 to 10,000 characters, THE Notification_System SHALL persist the subject, body content, and delivery channel for the associated Notification_Event and display a confirmation indicating the save succeeded.
3. IF an Admin_User saves a Notification_Template with an empty subject, an empty body, a subject exceeding 200 characters, or a body exceeding 10,000 characters, THEN THE Notification_System SHALL reject the submission, retain the previously persisted template values, and display a message identifying the invalid field and its allowed length.
4. WHERE a Notification_Template body contains defined placeholder tokens, THE Notification_System SHALL replace each token with the corresponding order or Customer value when composing a Notification.
5. IF an Admin_User saves a Notification_Template body containing a placeholder token that is not defined for the associated Notification_Event, THEN THE Notification_System SHALL reject the submission, retain the previously persisted template values, and display a message identifying the unrecognized token.
6. WHILE a Notification_Template enabled state is disabled, THE Notification_System SHALL suppress notifications for the associated Notification_Event.
7. WHEN an order confirmation Notification_Event occurs and its Notification_Template is enabled, THE Notification_System SHALL send an order confirmation Notification to the Customer within 60 seconds of the event.
8. IF sending a Notification fails, THEN THE Notification_System SHALL retry delivery up to 3 attempts and, if all attempts fail, record an Admin_Log entry indicating the delivery failure and the associated Notification_Event.
9. WHEN an Admin_User changes a Notification_Template, THE Notification_System SHALL record an Admin_Log entry containing the action, the Notification_Event, and the acting Admin_User identity.

### Requirement 9: Deliver Customer Notifications

**User Story:** As a Customer, I want to receive alerts about my orders and promotions, so that I stay informed about activity relevant to me.

#### Acceptance Criteria

1. WHEN an order's status changes, THE Notification_System SHALL create an in-app Notification for the Customer who owns the order within 5 seconds of the status change.
2. WHERE the associated Notification_Template delivery channel includes email, THE Notification_System SHALL send the Notification to the Customer's email address within 60 seconds of the Notification being created.
3. WHEN a Notification is created for a Customer, THE Notification_Center SHALL display the Notification with its message text (maximum 500 characters), related event, and creation timestamp.
4. THE Notification_Center SHALL display the count of unread Notifications for the Customer as an integer between 0 and 99, displaying "99+" when the unread count exceeds 99.
5. WHEN a Customer opens a Notification in the Notification_Center, THE Notification_System SHALL set that Notification to read within 2 seconds and decrement the unread count by 1.
6. WHEN a Customer marks all Notifications as read, THE Notification_System SHALL set every unread Notification for that Customer to read and set the unread count to 0.
7. IF sending an email Notification fails, THEN THE Notification_System SHALL retry sending up to 3 times at intervals of 60 seconds each, and retain the in-app Notification regardless of email delivery outcome.
8. IF all email Notification send attempts fail, THEN THE Notification_System SHALL record the email delivery failure and preserve the in-app Notification in an unread state.
9. WHERE a Customer has opted out of promotional notifications, THE Notification_System SHALL exclude that Customer from promotional Notifications while continuing to create and send order-related Notifications.

### Requirement 10: Order History and Tracking

**User Story:** As a Customer, I want to view my order history and track order progress, so that I know the current state of each purchase.

#### Acceptance Criteria

1. WHEN a Customer opens the order history view, THE Storefront SHALL display the Customer's orders sorted by order date in descending order, with each entry showing the order number, order date, total, and current status.
2. WHEN a Customer opens an individual order, THE Order_Tracking_View SHALL display the order status progression across the states PROCESSING, SHIPPED, DELIVERED, and COMPLETED, indicating which states are completed and which is current.
3. WHERE an order has a non-empty courier name and a non-empty courier estimate, THE Order_Tracking_View SHALL display the courier name and courier estimate.
4. WHILE an order status is CANCELLED, THE Order_Tracking_View SHALL display the order as cancelled and suppress the status progression.
5. WHEN a Customer opens an order after its status has changed, THE Order_Tracking_View SHALL display the most recently recorded status for that order within 3 seconds of the view loading.
6. IF a Customer requests an order that does not belong to that Customer, THEN THE Storefront SHALL deny access, withhold all order detail data, and display an authorization error indicating the order is not accessible.
7. WHEN a Customer opens the order history view and the Customer has zero orders, THE Storefront SHALL display an empty-state message indicating no orders exist.
8. IF the order history or order detail data fails to load, THEN THE Storefront SHALL retain the Customer's current view without partial data and display an error message indicating the orders could not be retrieved.
