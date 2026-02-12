// Mock data matching actual backend model schemas

export const mockUsers = [
  { _id: '1', name: 'Raj Kumar', phone_number: '9876543210', email: 'raj@example.com', gender: 'male', is_active: true, onboarding_completed: true, profile_completion_percentage: 85, last_login: '2026-02-11T10:30:00Z', createdAt: '2025-06-15T00:00:00Z', subject_selections: [{ subject_id: '1', is_primary: true }] },
  { _id: '2', name: 'Priya Sharma', phone_number: '9876543211', email: 'priya@example.com', gender: 'female', is_active: true, onboarding_completed: true, profile_completion_percentage: 100, last_login: '2026-02-12T08:00:00Z', createdAt: '2025-07-20T00:00:00Z', subject_selections: [{ subject_id: '1', is_primary: true }, { subject_id: '2', is_primary: false }] },
  { _id: '3', name: 'Amit Patel', phone_number: '9876543212', email: 'amit@example.com', gender: 'male', is_active: false, onboarding_completed: true, profile_completion_percentage: 60, last_login: '2026-01-05T00:00:00Z', createdAt: '2025-04-10T00:00:00Z', subject_selections: [] },
  { _id: '4', name: 'Neha Singh', phone_number: '9876543213', email: 'neha@example.com', gender: 'female', is_active: true, onboarding_completed: false, profile_completion_percentage: 30, last_login: '2026-02-10T14:00:00Z', createdAt: '2026-01-25T00:00:00Z', subject_selections: [{ subject_id: '2', is_primary: true }] },
  { _id: '5', name: 'Dr. Sanjay Gupta', phone_number: '9876543214', email: 'sanjay@example.com', gender: 'male', is_active: true, onboarding_completed: true, profile_completion_percentage: 95, last_login: '2026-02-12T06:00:00Z', createdAt: '2025-03-01T00:00:00Z', subject_selections: [{ subject_id: '1', is_primary: true }] },
  { _id: '6', name: 'Kavita Reddy', phone_number: '9876543215', email: 'kavita@example.com', gender: 'female', is_active: true, onboarding_completed: true, profile_completion_percentage: 70, last_login: '2026-02-11T18:00:00Z', createdAt: '2025-09-12T00:00:00Z', subject_selections: [{ subject_id: '3', is_primary: true }] },
]

export const mockSubjects = [
  { _id: '1', name: 'Anatomy', description: 'Complete study of human anatomy including gross anatomy, histology, and embryology', icon_url: null, display_order: 1, is_active: true, package_count: 4, createdAt: '2025-01-01T00:00:00Z' },
  { _id: '2', name: 'Physiology', description: 'Study of functions and mechanisms in living organisms', icon_url: null, display_order: 2, is_active: true, package_count: 3, createdAt: '2025-01-01T00:00:00Z' },
  { _id: '3', name: 'Biochemistry', description: 'Chemical processes within and relating to living organisms', icon_url: null, display_order: 3, is_active: true, package_count: 2, createdAt: '2025-01-15T00:00:00Z' },
  { _id: '4', name: 'Pharmacology', description: 'Study of drug action and therapeutic uses', icon_url: null, display_order: 4, is_active: false, package_count: 0, createdAt: '2025-02-01T00:00:00Z' },
]

export const mockPackages = [
  { _id: '1', subject_id: '1', package_type_id: '1', name: 'Anatomy Theory Complete', description: 'Complete anatomy theory course covering all systems', price: 4999, original_price: 6999, is_on_sale: true, sale_price: 3999, sale_end_date: '2026-03-31T00:00:00Z', duration_days: 365, thumbnail_url: null, features: 'Full video access, PDF notes, Live session access', is_active: true, display_order: 1, subject_name: 'Anatomy', type_name: 'Theory', enrolled_count: 234 },
  { _id: '2', subject_id: '1', package_type_id: '2', name: 'Anatomy Practical', description: 'Hands-on practical anatomy with dissection videos', price: 5999, original_price: null, is_on_sale: false, sale_price: null, sale_end_date: null, duration_days: 365, thumbnail_url: null, features: 'Practical videos, 3D models, Lab sessions', is_active: true, display_order: 2, subject_name: 'Anatomy', type_name: 'Practical', enrolled_count: 156 },
  { _id: '3', subject_id: '2', package_type_id: '1', name: 'Physiology Theory', description: 'Complete physiology theory for PG entrance', price: 3999, original_price: null, is_on_sale: false, sale_price: null, sale_end_date: null, duration_days: 180, thumbnail_url: null, features: 'Video lectures, Notes, MCQ bank', is_active: true, display_order: 1, subject_name: 'Physiology', type_name: 'Theory', enrolled_count: 312 },
  { _id: '4', subject_id: '3', package_type_id: '1', name: 'Biochemistry Crash Course', description: 'Rapid revision of biochemistry', price: 1999, original_price: 2999, is_on_sale: true, sale_price: 1499, sale_end_date: '2026-02-28T00:00:00Z', duration_days: 90, thumbnail_url: null, features: 'Crash course videos, Quick notes', is_active: true, display_order: 1, subject_name: 'Biochemistry', type_name: 'Theory', enrolled_count: 89 },
]

export const mockSeries = [
  { _id: '1', package_id: '1', name: 'Upper Limb', description: 'Complete upper limb anatomy', display_order: 1, is_active: true, module_count: 5, package_name: 'Anatomy Theory Complete' },
  { _id: '2', package_id: '1', name: 'Lower Limb', description: 'Complete lower limb anatomy', display_order: 2, is_active: true, module_count: 4, package_name: 'Anatomy Theory Complete' },
  { _id: '3', package_id: '1', name: 'Thorax', description: 'Thoracic anatomy in detail', display_order: 3, is_active: true, module_count: 6, package_name: 'Anatomy Theory Complete' },
  { _id: '4', package_id: '2', name: 'Upper Limb Practical', description: 'Practical dissection of upper limb', display_order: 1, is_active: true, module_count: 3, package_name: 'Anatomy Practical' },
]

export const mockVideos = [
  { _id: '1', module_id: '1', faculty_id: '1', title: 'Introduction to Upper Limb', description: 'Overview of upper limb anatomy', video_url: 'https://cdn.example.com/v1.mp4', thumbnail_url: 'https://cdn.example.com/t1.jpg', duration_seconds: 2400, is_free: true, display_order: 1, view_count: 1520, processing_status: 'ready' as const, file_size_mb: 450, faculty_name: 'Dr. Priya Sharma', module_name: 'Intro to Upper Limb' },
  { _id: '2', module_id: '1', faculty_id: '1', title: 'Bones of Upper Limb', description: 'Detailed study of humerus, radius, ulna', video_url: 'https://cdn.example.com/v2.mp4', thumbnail_url: 'https://cdn.example.com/t2.jpg', duration_seconds: 3600, is_free: false, display_order: 2, view_count: 980, processing_status: 'ready' as const, file_size_mb: 620, faculty_name: 'Dr. Priya Sharma', module_name: 'Intro to Upper Limb' },
  { _id: '3', module_id: '2', faculty_id: '2', title: 'Muscles of Arm', description: 'Biceps, triceps, and brachialis', video_url: 'https://cdn.example.com/v3.mp4', thumbnail_url: 'https://cdn.example.com/t3.jpg', duration_seconds: 1800, is_free: false, display_order: 1, view_count: 756, processing_status: 'ready' as const, file_size_mb: 380, faculty_name: 'Dr. Rajesh Kumar', module_name: 'Arm Muscles' },
  { _id: '4', module_id: '3', faculty_id: '1', title: 'Nerve Supply of Forearm', description: 'Median, ulnar, and radial nerves', video_url: '', thumbnail_url: '', duration_seconds: 0, is_free: false, display_order: 1, view_count: 0, processing_status: 'processing' as const, file_size_mb: 0, faculty_name: 'Dr. Priya Sharma', module_name: 'Forearm Nerves' },
]

export const mockFaculty = [
  { _id: '1', name: 'Dr. Priya Sharma', email: 'priya.sharma@pgme.com', phone: '9876500001', bio: 'MBBS, MS (Anatomy), 15 years teaching experience at AIIMS Delhi', qualifications: 'MBBS, MS (Anatomy)', experience_years: 15, specialization: 'Anatomy', is_active: true, is_verified: true, photo_url: null, last_login: '2026-02-12T09:00:00Z', session_count: 24, createdAt: '2024-06-01T00:00:00Z' },
  { _id: '2', name: 'Dr. Rajesh Kumar', email: 'rajesh.kumar@pgme.com', phone: '9876500002', bio: 'MBBS, MD (Physiology), Author of 3 textbooks', qualifications: 'MBBS, MD (Physiology)', experience_years: 20, specialization: 'Physiology', is_active: true, is_verified: true, photo_url: null, last_login: '2026-02-11T15:00:00Z', session_count: 18, createdAt: '2024-06-15T00:00:00Z' },
  { _id: '3', name: 'Dr. Anita Desai', email: 'anita.desai@pgme.com', phone: '9876500003', bio: 'MBBS, MD (Biochemistry), Research focus on metabolic disorders', qualifications: 'MBBS, MD (Biochemistry)', experience_years: 10, specialization: 'Biochemistry', is_active: true, is_verified: false, photo_url: null, last_login: '2026-02-10T12:00:00Z', session_count: 8, createdAt: '2025-01-01T00:00:00Z' },
]

export const mockLiveSessions = [
  { _id: '1', subject_id: '1', faculty_id: '1', title: 'Upper Limb Anatomy - Muscles & Nerves', description: 'Comprehensive session on upper limb musculature and nerve supply', scheduled_start_time: '2026-02-15T10:30:00Z', scheduled_end_time: '2026-02-15T12:30:00Z', duration_minutes: 120, platform: 'zoom' as const, status: 'scheduled' as const, max_attendees: 100, current_attendees: 0, enrollment_mode: 'enrollment_required' as const, capacity_mode: 'limited' as const, guaranteed_seats_for_paid: true, allow_waitlist: true, price: 299, is_free: false, thumbnail_url: null, subject_name: 'Anatomy', faculty_name: 'Dr. Priya Sharma', enrolled_count: 85 },
  { _id: '2', subject_id: '2', faculty_id: '2', title: 'Thorax Complete Revision', description: 'Quick revision of thoracic anatomy for upcoming exams', scheduled_start_time: '2026-02-15T14:00:00Z', scheduled_end_time: '2026-02-15T16:00:00Z', duration_minutes: 120, platform: 'zoom' as const, status: 'scheduled' as const, max_attendees: 50, current_attendees: 0, enrollment_mode: 'open' as const, capacity_mode: 'limited' as const, guaranteed_seats_for_paid: false, allow_waitlist: false, price: 0, is_free: true, thumbnail_url: null, subject_name: 'Physiology', faculty_name: 'Dr. Rajesh Kumar', enrolled_count: 42 },
  { _id: '3', subject_id: '1', faculty_id: '1', title: 'Abdomen - Live Discussion', description: 'Interactive discussion on abdominal anatomy', scheduled_start_time: '2026-02-14T10:00:00Z', scheduled_end_time: '2026-02-14T11:30:00Z', duration_minutes: 90, platform: 'zoom' as const, status: 'completed' as const, max_attendees: 100, current_attendees: 78, enrollment_mode: 'enrollment_required' as const, capacity_mode: 'limited' as const, guaranteed_seats_for_paid: true, allow_waitlist: true, price: 199, is_free: false, thumbnail_url: null, subject_name: 'Anatomy', faculty_name: 'Dr. Priya Sharma', enrolled_count: 92 },
  { _id: '4', subject_id: '3', faculty_id: '3', title: 'Biochemistry Rapid Fire', description: 'Quick fire round on important biochemistry topics', scheduled_start_time: '2026-02-16T18:00:00Z', scheduled_end_time: '2026-02-16T19:00:00Z', duration_minutes: 60, platform: 'zoom' as const, status: 'cancelled' as const, max_attendees: null, current_attendees: 0, enrollment_mode: 'open' as const, capacity_mode: 'unlimited' as const, guaranteed_seats_for_paid: false, allow_waitlist: false, price: 0, is_free: true, thumbnail_url: null, subject_name: 'Biochemistry', faculty_name: 'Dr. Anita Desai', enrolled_count: 15 },
]

export const mockPurchases = [
  { _id: '1', user_id: '1', package_id: '1', amount_paid: 3999, currency: 'INR', payment_status: 'completed' as const, payment_gateway: 'zoho_payments' as const, purchased_at: '2026-01-10T08:00:00Z', expires_at: '2027-01-10T08:00:00Z', is_active: true, user_name: 'Raj Kumar', package_name: 'Anatomy Theory Complete', zoho_payment_id: 'ZP_001' },
  { _id: '2', user_id: '2', package_id: '1', amount_paid: 3999, currency: 'INR', payment_status: 'completed' as const, payment_gateway: 'zoho_payments' as const, purchased_at: '2026-01-15T10:00:00Z', expires_at: '2027-01-15T10:00:00Z', is_active: true, user_name: 'Priya Sharma', package_name: 'Anatomy Theory Complete', zoho_payment_id: 'ZP_002' },
  { _id: '3', user_id: '2', package_id: '3', amount_paid: 3999, currency: 'INR', payment_status: 'completed' as const, payment_gateway: 'zoho_payments' as const, purchased_at: '2026-01-20T12:00:00Z', expires_at: '2026-07-20T12:00:00Z', is_active: true, user_name: 'Priya Sharma', package_name: 'Physiology Theory', zoho_payment_id: 'ZP_003' },
  { _id: '4', user_id: '5', package_id: '4', amount_paid: 1499, currency: 'INR', payment_status: 'pending' as const, payment_gateway: 'zoho_payments' as const, purchased_at: '2026-02-12T06:00:00Z', expires_at: '2026-05-12T06:00:00Z', is_active: false, user_name: 'Dr. Sanjay Gupta', package_name: 'Biochemistry Crash Course', zoho_payment_id: null },
  { _id: '5', user_id: '3', package_id: '2', amount_paid: 5999, currency: 'INR', payment_status: 'failed' as const, payment_gateway: 'zoho_payments' as const, purchased_at: '2026-02-01T00:00:00Z', expires_at: '2027-02-01T00:00:00Z', is_active: false, user_name: 'Amit Patel', package_name: 'Anatomy Practical', zoho_payment_id: null },
]

export const mockBookOrders = [
  { _id: '1', user_id: '1', order_number: 'PGME-BK-20260115-001', items: [{ book_id: '1', title: 'Gray\'s Anatomy', quantity: 1, price_at_purchase: 1200 }], recipient_name: 'Raj Kumar', shipping_phone: '9876543210', shipping_address: '123, MG Road, Delhi', subtotal: 1200, shipping_cost: 50, total_amount: 1250, payment_status: 'completed' as const, order_status: 'delivered' as const, tracking_number: 'DL123456', courier_name: 'Delhivery', createdAt: '2026-01-15T00:00:00Z' },
  { _id: '2', user_id: '2', order_number: 'PGME-BK-20260201-002', items: [{ book_id: '2', title: 'Guyton Physiology', quantity: 1, price_at_purchase: 850 }, { book_id: '3', title: 'Harper\'s Biochemistry', quantity: 1, price_at_purchase: 750 }], recipient_name: 'Priya Sharma', shipping_phone: '9876543211', shipping_address: '456, Park Street, Mumbai', subtotal: 1600, shipping_cost: 0, total_amount: 1600, payment_status: 'completed' as const, order_status: 'shipped' as const, tracking_number: 'BW789012', courier_name: 'BlueDart', createdAt: '2026-02-01T00:00:00Z' },
  { _id: '3', user_id: '6', order_number: 'PGME-BK-20260210-003', items: [{ book_id: '1', title: 'Gray\'s Anatomy', quantity: 2, price_at_purchase: 1200 }], recipient_name: 'Kavita Reddy', shipping_phone: '9876543215', shipping_address: '789, Tank Bund, Hyderabad', subtotal: 2400, shipping_cost: 100, total_amount: 2500, payment_status: 'completed' as const, order_status: 'processing' as const, tracking_number: null, courier_name: null, createdAt: '2026-02-10T00:00:00Z' },
]

export const mockBooks = [
  { _id: '1', title: "Gray's Anatomy for Students", author: 'Richard Drake', description: 'The most popular anatomy textbook for medical students', isbn: '978-0323393041', price: 1200, original_price: 1500, is_on_sale: true, sale_price: 999, category: 'Anatomy', subject_id: '1', stock_quantity: 45, is_available: true, weight_grams: 1200, publisher: 'Elsevier', publication_year: 2024, pages: 1168, display_order: 1 },
  { _id: '2', title: 'Guyton and Hall Textbook of Medical Physiology', author: 'John E. Hall', description: 'Gold standard physiology textbook', isbn: '978-0323597128', price: 850, original_price: null, is_on_sale: false, sale_price: null, category: 'Physiology', subject_id: '2', stock_quantity: 3, is_available: true, weight_grams: 1500, publisher: 'Elsevier', publication_year: 2023, pages: 1152, display_order: 2 },
  { _id: '3', title: "Harper's Illustrated Biochemistry", author: 'Victor W. Rodwell', description: 'Comprehensive biochemistry reference', isbn: '978-1260462142', price: 750, original_price: null, is_on_sale: false, sale_price: null, category: 'Biochemistry', subject_id: '3', stock_quantity: 0, is_available: false, weight_grams: 900, publisher: 'McGraw-Hill', publication_year: 2023, pages: 832, display_order: 3 },
]

export const mockBanners = [
  { _id: '1', title: 'New Year Sale - 30% Off', subtitle: 'On all theory packages', image_url: 'https://cdn.example.com/banner1.jpg', click_url: '/packages', display_order: 1, is_active: true, start_date: '2026-01-01T00:00:00Z', end_date: '2026-01-31T00:00:00Z' },
  { _id: '2', title: 'Live Session: Anatomy Master Class', subtitle: 'With Dr. Priya Sharma', image_url: 'https://cdn.example.com/banner2.jpg', click_url: '/sessions/1', display_order: 2, is_active: true, start_date: '2026-02-01T00:00:00Z', end_date: '2026-02-28T00:00:00Z' },
]

export const mockInvoices = [
  { _id: '1', user_id: '1', purchase_type: 'package' as const, invoice_number: 'INV-2026-001', amount: 3999, gst_amount: 720, payment_status: 'paid' as const, zoho_invoice_id: 'ZI_001', createdAt: '2026-01-10T00:00:00Z', user_name: 'Raj Kumar', item_name: 'Anatomy Theory Complete' },
  { _id: '2', user_id: '2', purchase_type: 'package' as const, invoice_number: 'INV-2026-002', amount: 3999, gst_amount: 720, payment_status: 'paid' as const, zoho_invoice_id: 'ZI_002', createdAt: '2026-01-15T00:00:00Z', user_name: 'Priya Sharma', item_name: 'Anatomy Theory Complete' },
  { _id: '3', user_id: '1', purchase_type: 'book' as const, invoice_number: 'INV-2026-003', amount: 1250, gst_amount: 225, payment_status: 'paid' as const, zoho_invoice_id: 'ZI_003', createdAt: '2026-01-15T00:00:00Z', user_name: 'Raj Kumar', item_name: "Gray's Anatomy" },
  { _id: '4', user_id: '2', purchase_type: 'session' as const, invoice_number: 'INV-2026-004', amount: 299, gst_amount: 54, payment_status: 'unpaid' as const, zoho_invoice_id: null, createdAt: '2026-02-10T00:00:00Z', user_name: 'Priya Sharma', item_name: 'Upper Limb Anatomy Session' },
]

export const mockAdminUsers = [
  { _id: '1', name: 'Super Admin', email: 'admin@pgme.com', phone: '9999900001', role_name: 'super_admin', is_active: true, createdAt: '2024-01-01T00:00:00Z' },
  { _id: '2', name: 'Content Manager', email: 'content@pgme.com', phone: '9999900002', role_name: 'admin', is_active: true, createdAt: '2024-06-01T00:00:00Z' },
  { _id: '3', name: 'Session Moderator', email: 'mod@pgme.com', phone: '9999900003', role_name: 'moderator', is_active: false, createdAt: '2025-01-01T00:00:00Z' },
]

export const mockPayments = [
  { _id: '1', transaction_id: 'TXN_20260110_001', payment_id: 'ZP_001', user_id: '1', user_name: 'Raj Kumar', amount: 3999, currency: 'INR', status: 'success' as const, method: 'upi' as const, gateway: 'zoho_payments' as const, purchase_type: 'package' as const, item_name: 'Anatomy Theory Complete', upi_id: 'raj@upi', card_last4: null, bank_name: null, refund_id: null, createdAt: '2026-01-10T08:00:00Z' },
  { _id: '2', transaction_id: 'TXN_20260115_002', payment_id: 'ZP_002', user_id: '2', user_name: 'Priya Sharma', amount: 3999, currency: 'INR', status: 'success' as const, method: 'card' as const, gateway: 'zoho_payments' as const, purchase_type: 'package' as const, item_name: 'Anatomy Theory Complete', upi_id: null, card_last4: '4242', bank_name: 'HDFC Bank', refund_id: null, createdAt: '2026-01-15T10:00:00Z' },
  { _id: '3', transaction_id: 'TXN_20260120_003', payment_id: 'ZP_003', user_id: '2', user_name: 'Priya Sharma', amount: 3999, currency: 'INR', status: 'success' as const, method: 'netbanking' as const, gateway: 'zoho_payments' as const, purchase_type: 'package' as const, item_name: 'Physiology Theory', upi_id: null, card_last4: null, bank_name: 'ICICI Bank', refund_id: null, createdAt: '2026-01-20T12:00:00Z' },
  { _id: '4', transaction_id: 'TXN_20260115_004', payment_id: 'ZP_004', user_id: '1', user_name: 'Raj Kumar', amount: 1250, currency: 'INR', status: 'success' as const, method: 'upi' as const, gateway: 'zoho_payments' as const, purchase_type: 'book' as const, item_name: "Gray's Anatomy", upi_id: 'raj@upi', card_last4: null, bank_name: null, refund_id: null, createdAt: '2026-01-15T09:00:00Z' },
  { _id: '5', transaction_id: 'TXN_20260212_005', payment_id: null, user_id: '5', user_name: 'Dr. Sanjay Gupta', amount: 1499, currency: 'INR', status: 'pending' as const, method: 'upi' as const, gateway: 'zoho_payments' as const, purchase_type: 'package' as const, item_name: 'Biochemistry Crash Course', upi_id: 'sanjay@upi', card_last4: null, bank_name: null, refund_id: null, createdAt: '2026-02-12T06:00:00Z' },
  { _id: '6', transaction_id: 'TXN_20260201_006', payment_id: null, user_id: '3', user_name: 'Amit Patel', amount: 5999, currency: 'INR', status: 'failed' as const, method: 'card' as const, gateway: 'zoho_payments' as const, purchase_type: 'package' as const, item_name: 'Anatomy Practical', upi_id: null, card_last4: '1234', bank_name: 'SBI', refund_id: null, createdAt: '2026-02-01T00:00:00Z' },
  { _id: '7', transaction_id: 'TXN_20260201_007', payment_id: 'ZP_007', user_id: '2', user_name: 'Priya Sharma', amount: 1600, currency: 'INR', status: 'success' as const, method: 'wallet' as const, gateway: 'zoho_payments' as const, purchase_type: 'book' as const, item_name: 'Guyton Physiology + 1 more', upi_id: null, card_last4: null, bank_name: null, refund_id: null, createdAt: '2026-02-01T11:00:00Z' },
  { _id: '8', transaction_id: 'TXN_20260210_008', payment_id: 'ZP_008', user_id: '6', user_name: 'Kavita Reddy', amount: 2500, currency: 'INR', status: 'success' as const, method: 'netbanking' as const, gateway: 'zoho_payments' as const, purchase_type: 'book' as const, item_name: "Gray's Anatomy x2", upi_id: null, card_last4: null, bank_name: 'Axis Bank', refund_id: null, createdAt: '2026-02-10T14:00:00Z' },
  { _id: '9', transaction_id: 'TXN_20260210_009', payment_id: 'ZP_009', user_id: '1', user_name: 'Raj Kumar', amount: 299, currency: 'INR', status: 'refunded' as const, method: 'upi' as const, gateway: 'zoho_payments' as const, purchase_type: 'session' as const, item_name: 'Abdomen Discussion Session', upi_id: 'raj@upi', card_last4: null, bank_name: null, refund_id: 'RF_001', createdAt: '2026-02-10T08:00:00Z' },
  { _id: '10', transaction_id: 'TXN_20260211_010', payment_id: 'ZP_010', user_id: '4', user_name: 'Neha Singh', amount: 299, currency: 'INR', status: 'success' as const, method: 'upi' as const, gateway: 'zoho_payments' as const, purchase_type: 'session' as const, item_name: 'Upper Limb Anatomy Session', upi_id: 'neha@paytm', card_last4: null, bank_name: null, refund_id: null, createdAt: '2026-02-11T16:00:00Z' },
]

export const mockNotifications = [
  { _id: '1', title: 'New Year Sale is Live!', body: 'Get 30% off on all theory packages. Limited time offer!', type: 'promotional' as const, target: 'all' as const, target_count: 1200, sent_at: '2026-01-01T09:00:00Z', delivered_count: 1150, read_count: 780, click_count: 342, status: 'delivered' as const, channel: 'push' as const, created_by: 'Super Admin' },
  { _id: '2', title: 'Live Session Tomorrow', body: 'Dr. Priya Sharma - Upper Limb Anatomy at 10:30 AM', type: 'reminder' as const, target: 'segment' as const, target_count: 85, sent_at: '2026-02-14T18:00:00Z', delivered_count: 82, read_count: 68, click_count: 45, status: 'delivered' as const, channel: 'push' as const, created_by: 'Content Manager' },
  { _id: '3', title: 'Payment Received', body: 'Your payment of ₹3,999 for Anatomy Theory Complete has been received', type: 'transactional' as const, target: 'individual' as const, target_count: 1, sent_at: '2026-01-10T08:05:00Z', delivered_count: 1, read_count: 1, click_count: 0, status: 'delivered' as const, channel: 'push' as const, created_by: 'System' },
  { _id: '4', title: 'Complete Your Profile', body: 'Your profile is 30% complete. Add your details to get personalized recommendations.', type: 'engagement' as const, target: 'segment' as const, target_count: 45, sent_at: '2026-02-08T10:00:00Z', delivered_count: 40, read_count: 12, click_count: 8, status: 'delivered' as const, channel: 'push' as const, created_by: 'Content Manager' },
  { _id: '5', title: 'New Video: Nerve Supply of Forearm', body: 'A new video has been uploaded by Dr. Priya Sharma. Watch now!', type: 'content' as const, target: 'segment' as const, target_count: 234, sent_at: '2026-02-12T09:00:00Z', delivered_count: 220, read_count: 156, click_count: 98, status: 'delivered' as const, channel: 'push' as const, created_by: 'Content Manager' },
  { _id: '6', title: 'Subscription Expiring Soon', body: 'Your Physiology Theory subscription expires in 7 days. Renew now to continue learning.', type: 'reminder' as const, target: 'segment' as const, target_count: 28, sent_at: '2026-02-11T08:00:00Z', delivered_count: 26, read_count: 18, click_count: 10, status: 'delivered' as const, channel: 'push' as const, created_by: 'System' },
  { _id: '7', title: 'Flash Sale: Biochemistry Crash Course', body: 'Only ₹1,499! Offer valid till Feb 28.', type: 'promotional' as const, target: 'all' as const, target_count: 1200, sent_at: null, delivered_count: 0, read_count: 0, click_count: 0, status: 'scheduled' as const, channel: 'push' as const, created_by: 'Super Admin', scheduled_for: '2026-02-15T09:00:00Z' },
  { _id: '8', title: 'Session Cancelled: Biochemistry Rapid Fire', body: 'The scheduled session has been cancelled. We apologize for the inconvenience.', type: 'transactional' as const, target: 'segment' as const, target_count: 15, sent_at: '2026-02-12T10:00:00Z', delivered_count: 14, read_count: 14, click_count: 0, status: 'delivered' as const, channel: 'push' as const, created_by: 'System' },
]

export const mockAnalytics = {
  userGrowth: [
    { month: 'Sep 2025', users: 320 },
    { month: 'Oct 2025', users: 450 },
    { month: 'Nov 2025', users: 580 },
    { month: 'Dec 2025', users: 720 },
    { month: 'Jan 2026', users: 950 },
    { month: 'Feb 2026', users: 1200 },
  ],
  revenueByMonth: [
    { month: 'Sep 2025', revenue: 125000 },
    { month: 'Oct 2025', revenue: 198000 },
    { month: 'Nov 2025', revenue: 245000 },
    { month: 'Dec 2025', revenue: 310000 },
    { month: 'Jan 2026', revenue: 425000 },
    { month: 'Feb 2026', revenue: 180000 },
  ],
  topVideos: [
    { title: 'Introduction to Upper Limb', views: 1520, watch_time_hours: 1013 },
    { title: 'Bones of Upper Limb', views: 980, watch_time_hours: 980 },
    { title: 'Muscles of Arm', views: 756, watch_time_hours: 378 },
  ],
  topPackages: [
    { name: 'Physiology Theory', enrollments: 312, revenue: 1247688 },
    { name: 'Anatomy Theory Complete', enrollments: 234, revenue: 935766 },
    { name: 'Anatomy Practical', enrollments: 156, revenue: 935844 },
    { name: 'Biochemistry Crash Course', enrollments: 89, revenue: 133411 },
  ],
  engagementMetrics: {
    daily_active_users: 342,
    weekly_active_users: 780,
    monthly_active_users: 1050,
    avg_session_duration_minutes: 28,
    avg_videos_watched_per_user: 4.2,
    completion_rate: 67,
  },
  deviceBreakdown: [
    { device: 'Android', percentage: 62 },
    { device: 'iOS', percentage: 31 },
    { device: 'Web', percentage: 7 },
  ],
  subjectPopularity: [
    { subject: 'Anatomy', students: 520, percentage: 43 },
    { subject: 'Physiology', students: 380, percentage: 32 },
    { subject: 'Biochemistry', students: 210, percentage: 18 },
    { subject: 'Pharmacology', students: 90, percentage: 7 },
  ],
}
