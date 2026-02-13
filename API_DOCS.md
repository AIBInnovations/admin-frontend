# PGME Admin API Documentation

> Base URL: `https://pgme-backend.onrender.com/api/v1`
> Admin endpoints prefix: `/api/v1/admin`

---

## Authentication

### Admin Auth (`/admin/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/login` | Admin login (email + password) | Public |
| POST | `/refresh` | Refresh access token | Public |
| GET | `/me` | Get admin profile | Admin |
| POST | `/logout` | Admin logout | Admin |

**Login Request:**
```json
{ "email": "string", "password": "string" }
```

**Login Response:**
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "admin": {
    "admin_id": "string",
    "name": "string",
    "email": "string",
    "role_name": "string",
    "permissions": ["string"]
  }
}
```

---

## Admin CRUD Endpoints

All admin endpoints require JWT Bearer token + permission checks.
Permission format: `resource.action` (e.g., `subjects.create`, `videos.delete`)

---

### Subjects (`/admin/subjects`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/` | Create subject | subjects.create |
| GET | `/` | List subjects (paginated) | subjects.read |
| GET | `/:subject_id` | Get subject by ID | subjects.read |
| PUT | `/:subject_id` | Update subject | subjects.update |
| DELETE | `/:subject_id` | Delete subject | subjects.delete |

**Model Fields:** name, description, icon_url?, display_order, is_active

---

### Packages (`/admin/packages`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/` | Create package | packages.create |
| GET | `/` | List packages (filtered) | packages.read |
| GET | `/:package_id` | Get package by ID | packages.read |
| PUT | `/:package_id` | Update package | packages.update |
| DELETE | `/:package_id` | Delete package | packages.delete |

**Model Fields:** subject_id, package_type_id, name, description, price, original_price, is_on_sale, sale_price, sale_end_date, duration_days, trailer_video_id?, thumbnail_url?, features?, is_active, display_order

---

### Series (`/admin/series`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/` | Create series | series.create |
| GET | `/` | List series (filtered) | series.read |
| GET | `/:series_id` | Get series by ID | series.read |
| PUT | `/:series_id` | Update series | series.update |
| DELETE | `/:series_id` | Delete series | series.delete |

**Model Fields:** package_id, name, description, display_order, is_active

---

### Modules (`/admin/modules`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/` | Create module | modules.create |
| GET | `/` | List modules (filtered) | modules.read |
| GET | `/:module_id` | Get module by ID | modules.read |
| PUT | `/:module_id` | Update module | modules.update |
| DELETE | `/:module_id` | Delete module | modules.delete |
| POST | `/:module_id/recalculate` | Recalculate stats | modules.update |

**Model Fields:** series_id, name, description, display_order, lesson_count (auto), estimated_duration_minutes (auto), is_active

---

### Videos (`/admin/videos`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/` | Upload video | videos.create |
| GET | `/` | List videos (filtered) | videos.read |
| GET | `/:video_id/status` | Get processing status | videos.read |
| PUT | `/:video_id` | Update video | videos.update |
| DELETE | `/:video_id` | Delete video | videos.delete |
| POST | `/:video_id/tags` | Assign tags to video | videos.update |
| GET | `/:video_id/tags` | Get video tags | videos.read |
| DELETE | `/:video_id/tags` | Remove tags | videos.update |

**Model Fields:** module_id, faculty_id?, title, description, video_url, thumbnail_url, subtitle_url?, transcript_url?, duration_seconds, is_free, display_order, view_count (auto), processing_status (uploading/processing/ready/failed), video_urls (HLS), file_size_mb

---

### Documents (`/admin/documents`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/` | Upload document | documents.create |
| GET | `/` | List documents (filtered) | documents.read |
| GET | `/:document_id` | Get document by ID | documents.read |
| PUT | `/:document_id` | Update document | documents.update |
| DELETE | `/:document_id` | Delete document | documents.delete |

**Model Fields:** series_id, title, description, file_url, file_format (pdf/epub/doc/docx/ppt/pptx), preview_url?, file_size_mb, page_count?, is_free, display_order, download_count (auto)

---

### Video Tags (`/admin/video-tags`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/` | Create tag | video_tags.create |
| GET | `/` | List tags (filtered) | video_tags.read |
| GET | `/:tag_id` | Get tag by ID | video_tags.read |
| PUT | `/:tag_id` | Update tag | video_tags.update |
| DELETE | `/:tag_id` | Delete tag | video_tags.delete |
| GET | `/:tag_id/videos` | Get videos with tag | video_tags.read |

**Model Fields:** name (unique), description?, slug (auto), color?, is_active

---

### Live Sessions (`/admin/live-sessions`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/` | Create session | live_sessions.create |
| GET | `/` | List sessions (filtered) | live_sessions.read |
| GET | `/:session_id` | Get session by ID | live_sessions.read |
| PUT | `/:session_id` | Update session | live_sessions.update |
| POST | `/:session_id/cancel` | Cancel session | live_sessions.update |
| DELETE | `/:session_id` | Delete session | live_sessions.delete |
| POST | `/zoom/configure-restrictions` | Configure Zoom | live_sessions.update |

**Model Fields:** subject_id, series_id?, faculty_id?, title, description, scheduled_start_time, scheduled_end_time, duration_minutes, platform (zoom/agora/teams/other), status (scheduled/live/completed/cancelled), max_attendees?, current_attendees (auto), enrollment_mode (open/enrollment_required/disabled), capacity_mode (limited/unlimited), is_free, price, allow_waitlist, guaranteed_seats_for_paid, thumbnail_url?, zoom_meeting_id? (auto), meeting_link? (auto)

---

### Session Enrollments (`/admin/session-enrollments`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/analytics/attendance` | Attendance analytics | sessions.read |
| GET | `/:session_id/attendance-report` | Attendance report | sessions.read |
| POST | `/:session_id/manual-enroll` | Manual enroll | sessions.update |
| GET | `/:session_id/enrollees` | Get enrollees | sessions.read |

---

### Faculty (`/admin/faculty`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/` | Create faculty | faculty.create |
| GET | `/` | List faculty (filtered) | faculty.read |
| GET | `/:faculty_id` | Get faculty by ID | faculty.read |
| PUT | `/:faculty_id` | Update faculty | faculty.update |
| PUT | `/:faculty_id/verify` | Verify/unverify | faculty.update |
| DELETE | `/:faculty_id` | Delete faculty | faculty.delete |
| GET | `/:faculty_id/performance` | Performance analytics | faculty.read |
| GET | `/:faculty_id/schedule` | Faculty schedule | faculty.read |

**Model Fields:** name, email (unique), password_hash, photo_url?, phone?, bio?, qualifications?, experience_years?, specialization, is_active, is_verified

---

### Users (`/admin/users`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/` | List users (aggregated) | users.read |
| GET | `/:user_id` | Get user profile | users.read |
| PUT | `/:user_id/block` | Block user | users.update |
| PUT | `/:user_id/unblock` | Unblock user | users.update |
| POST | `/:user_id/extend-subscription` | Extend subscription | users.update |

**Model Fields:** phone_number, name, email, photo_url?, address?, date_of_birth?, gender?, student_id?, ug_college?, pg_college?, profile_completion_percentage (auto), last_login, is_active, onboarding_completed, subject_selections[]

---

### Books (`/admin/books`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/` | Create book | books.create |
| GET | `/` | List books (filtered) | books.read |
| GET | `/low-stock` | Low stock alerts | books.read |
| GET | `/:book_id` | Get book by ID | books.read |
| PUT | `/:book_id` | Update book | books.update |
| DELETE | `/:book_id` | Delete book | books.delete |
| PUT | `/:book_id/stock` | Update stock | books.update |
| POST | `/:book_id/images` | Add images | books.update |
| DELETE | `/:book_id/images/:index` | Remove image | books.update |
| POST | `/stock/bulk-update` | Bulk stock update | books.update |

**Model Fields:** title, author, description?, isbn?, price, original_price?, is_on_sale, sale_price?, thumbnail_url?, images[]?, category?, subject_id?, stock_quantity, is_available, weight_grams, publisher?, publication_year?, pages?, display_order

---

### Book Orders (`/admin/book-orders`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/statistics` | Order statistics | book_orders.read |
| GET | `/` | List orders (filtered) | book_orders.read |
| GET | `/:order_id` | Get order by ID | book_orders.read |
| PUT | `/:order_id/status` | Update order status | book_orders.update |
| PUT | `/:order_id/shipping` | Update shipping info | book_orders.update |

---

### Banners (`/admin/banners`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/` | Create banner | banners.create |
| GET | `/` | List banners (filtered) | banners.read |
| GET | `/:banner_id` | Get banner by ID | banners.read |
| PUT | `/:banner_id` | Update banner | banners.update |
| DELETE | `/:banner_id` | Delete banner | banners.delete |

**Model Fields:** title, description?, image_url?, action_url?, position, is_active, start_date?, end_date?

---

### Payments (`/admin/payments`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/transactions` | List all transactions | payments.read |
| GET | `/transactions/:id` | Get transaction + invoice | payments.read |
| GET | `/reconciliation` | Payment reconciliation | payments.read |
| GET | `/failed` | Failed payments | payments.read |

---

### Invoices (`/admin/invoices`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/manual` | Create manual invoice | invoices.create |
| GET | `/` | List invoices (filtered) | invoices.read |
| GET | `/:invoice_id` | Get invoice by ID | invoices.read |
| POST | `/:invoice_id/regenerate` | Regenerate from Zoho | invoices.update |
| GET | `/:invoice_id/download` | Download PDF | invoices.read |

**Model Fields:** purchase_id, user_id, purchase_type (package/session/book), zoho_invoice_id?, invoice_number (unique), invoice_url?, amount, gst_amount, zoho_payment_id?, payment_status (unpaid/paid/partially_paid/void)

---

### Revenue (`/admin/revenue`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/by-product-type` | Revenue by type | analytics.read |
| GET | `/trends` | Revenue trends | analytics.read |
| GET | `/top-selling` | Top products | analytics.read |
| GET | `/forecast` | Revenue forecast | analytics.read |

---

### Admin Roles (`/admin/admin-roles`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/` | Create role | admin_roles.create |
| GET | `/` | List roles | admin_roles.read |
| GET | `/:role_id` | Get role by ID | admin_roles.read |
| PUT | `/:role_id` | Update role | admin_roles.update |
| DELETE | `/:role_id` | Delete role | admin_roles.delete |

**Model Fields:** name (unique), description?, permissions[], is_active

---

### Admin Users (`/admin/admin-users`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/` | Create admin user | admin_users.create |
| GET | `/` | List admin users | admin_users.read |
| GET | `/:id` | Get admin user | admin_users.read |
| PUT | `/:id` | Update admin user | admin_users.update |
| DELETE | `/:id` | Delete admin user | admin_users.delete |
| PUT | `/:id/activate` | Activate | admin_users.update |
| PUT | `/:id/deactivate` | Deactivate | admin_users.update |

**Model Fields:** name, email (unique), phone?, password_hash, role_id (ref AdminRole), is_active

---

### Analytics (`/admin/analytics`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/dashboard` | Dashboard analytics | analytics.dashboard |

---

### Media (`/media`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/upload` | Upload single file (Cloudinary) | Public |
| POST | `/upload/multiple` | Upload multiple files (max 10) | Public |

---

## Public Endpoints (used by mobile app)

| Route Prefix | Key Endpoints |
|--------------|---------------|
| `/auth` | send-otp, verify-otp, refresh-token, logout |
| `/subjects` | GET / (list), GET /:id (detail) |
| `/packages` | GET / (list), GET /:id (detail), GET /:id/series |
| `/series` | GET /:id, GET /:id/modules, GET /:id/documents |
| `/videos` | GET /:id/playback |
| `/live-sessions` | GET / (list), GET /next-upcoming, GET /:id, POST /:id/join |
| `/faculty` | GET / (list), GET /:id |
| `/books` | GET / (list), GET /:id, GET /categories, GET /search |
| `/book-orders` | POST /create-order, POST /verify-payment, GET / |
| `/payments` | POST /create-order, POST /verify |
| `/banners` | GET / |
| `/search` | GET /, GET /suggestions |
| `/notifications` | GET /, PUT /:id/read, DELETE /:id |
| `/legal-documents` | GET /, GET /all |
| `/app-settings` | GET / |
