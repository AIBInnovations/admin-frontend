export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl bg-white rounded-lg shadow p-8 sm:p-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-lg font-semibold text-gray-700">PGME (Post Graduate Medical Education)</p>
        <p className="text-sm text-gray-500 mb-1"><strong>Effective Date:</strong> February 23, 2026</p>
        <p className="text-sm text-gray-500 mb-6"><strong>Last Updated:</strong> February 23, 2026</p>

        <p className="text-gray-700 leading-relaxed mb-8">
          PGME ("we," "our," or "us") operates the PGME mobile application (the "App"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our App. Please read this Privacy Policy carefully. By using the App, you agree to the collection and use of information in accordance with this policy.
        </p>

        <hr className="my-8 border-gray-200" />

        {/* Section 1 */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>

        <h3 className="text-lg font-semibold text-gray-800 mb-2">1.1 Personal Information</h3>
        <p className="text-gray-700 mb-3">When you register for an account or use our services, we may collect the following personal information:</p>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-6">
          <li><strong>Identity Information:</strong> Full name, date of birth, gender</li>
          <li><strong>Contact Information:</strong> Phone number, email address</li>
          <li><strong>Educational Background:</strong> Undergraduate college/university, postgraduate college/university, current professional designation, current affiliated organisation</li>
          <li><strong>Address Information:</strong> Residential address, billing address, shipping address (for book orders)</li>
          <li><strong>Profile Information:</strong> Profile photograph</li>
          <li><strong>Payment Information:</strong> Transaction details processed through our payment partner (Zoho Payments). We do not store your credit/debit card numbers directly.</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-800 mb-2">1.2 Device Information</h3>
        <p className="text-gray-700 mb-3">We automatically collect certain device information when you use the App:</p>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-6">
          <li><strong>Device Identifiers:</strong> Android ID or iOS Vendor Identifier</li>
          <li><strong>Device Details:</strong> Device brand, model, and operating system type</li>
          <li><strong>Network Information:</strong> Network connection status</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-800 mb-2">1.3 Location Information</h3>
        <p className="text-gray-700 mb-3">With your explicit consent, we collect:</p>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-3">
          <li><strong>Precise Location:</strong> GPS coordinates (latitude and longitude) used for address auto-fill during profile setup and address selection</li>
          <li><strong>Address Data:</strong> Structured address components obtained through reverse geocoding via OpenStreetMap</li>
        </ul>
        <p className="text-gray-700 mb-6">You can disable location access at any time through your device settings.</p>

        <h3 className="text-lg font-semibold text-gray-800 mb-2">1.4 Usage Information</h3>
        <p className="text-gray-700 mb-3">We collect information about how you interact with the App:</p>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-6">
          <li><strong>Learning Activity:</strong> Video watch progress, document reading progress, module and course completion status, time spent on content</li>
          <li><strong>Session Activity:</strong> Live session attendance, meeting participation records</li>
          <li><strong>Purchase History:</strong> Subscription purchases, session purchases, book orders, payment status</li>
          <li><strong>Notification Activity:</strong> Notification delivery status, read/unread status</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-800 mb-2">1.5 Locally Stored Data</h3>
        <p className="text-gray-700 mb-3">The following data is stored locally on your device:</p>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-6">
          <li><strong>Authentication Tokens:</strong> Encrypted access tokens and session identifiers stored in secure device storage</li>
          <li><strong>Downloaded Content:</strong> Video lectures and PDF documents downloaded for offline access, stored in a dedicated app directory</li>
          <li><strong>User Preferences:</strong> Theme settings, notification preferences, subject selections</li>
        </ul>

        <hr className="my-8 border-gray-200" />

        {/* Section 2 */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
        <p className="text-gray-700 mb-3">We use the information we collect for the following purposes:</p>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-6">
          <li><strong>Account Management:</strong> To create, maintain, and authenticate your account using phone-based OTP verification</li>
          <li><strong>Service Delivery:</strong> To provide access to courses, live sessions, study materials, and other educational content</li>
          <li><strong>Progress Tracking:</strong> To track and synchronise your learning progress across devices</li>
          <li><strong>Payment Processing:</strong> To process subscription payments, session purchases, and book orders through our payment partner</li>
          <li><strong>Order Fulfillment:</strong> To deliver physical books to your shipping address and provide order tracking</li>
          <li><strong>Communication:</strong> To send push notifications about class reminders, new content, purchase confirmations, and important announcements</li>
          <li><strong>Personalisation:</strong> To recommend content and send notifications based on your selected subjects and preferences</li>
          <li><strong>Device Management:</strong> To manage active sessions across multiple devices and provide secure access</li>
          <li><strong>Customer Support:</strong> To respond to your inquiries and provide technical assistance</li>
          <li><strong>App Improvement:</strong> To analyse usage patterns and improve our services</li>
        </ul>

        <hr className="my-8 border-gray-200" />

        {/* Section 3 */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Third-Party Services</h2>
        <p className="text-gray-700 mb-4">We integrate the following third-party services that may collect or process your data:</p>

        <h3 className="text-lg font-semibold text-gray-800 mb-2">3.1 Firebase (Google)</h3>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
          <li><strong>Purpose:</strong> Push notification delivery (Firebase Cloud Messaging), app infrastructure</li>
          <li><strong>Data Shared:</strong> FCM device token, notification delivery data</li>
          <li><strong>Privacy Policy:</strong> <a href="https://firebase.google.com/support/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://firebase.google.com/support/privacy</a></li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-800 mb-2">3.2 Zoho Payments</h3>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
          <li><strong>Purpose:</strong> Secure payment processing for subscriptions, sessions, and book orders</li>
          <li><strong>Data Shared:</strong> Transaction amount, payment session identifiers</li>
          <li><strong>Privacy Policy:</strong> <a href="https://www.zoho.com/privacy.html" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://www.zoho.com/privacy.html</a></li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-800 mb-2">3.3 Zoom Video Communications</h3>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
          <li><strong>Purpose:</strong> Live interactive video sessions and classes</li>
          <li><strong>Data Shared:</strong> Meeting access credentials, participant information during sessions</li>
          <li><strong>Privacy Policy:</strong> <a href="https://zoom.us/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://zoom.us/privacy</a></li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-800 mb-2">3.4 MSG91</h3>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
          <li><strong>Purpose:</strong> OTP delivery for phone-based authentication</li>
          <li><strong>Data Shared:</strong> Phone number for OTP delivery</li>
          <li><strong>Privacy Policy:</strong> <a href="https://msg91.com/privacy-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://msg91.com/privacy-policy</a></li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-800 mb-2">3.5 OpenStreetMap (Nominatim)</h3>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
          <li><strong>Purpose:</strong> Reverse geocoding for address auto-fill</li>
          <li><strong>Data Shared:</strong> GPS coordinates for address lookup</li>
          <li><strong>Privacy Policy:</strong> <a href="https://wiki.osmfoundation.org/wiki/Privacy_Policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://wiki.osmfoundation.org/wiki/Privacy_Policy</a></li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-800 mb-2">3.6 Amazon CloudFront (AWS)</h3>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
          <li><strong>Purpose:</strong> Content delivery network for streaming video lectures and serving media content</li>
          <li><strong>Data Shared:</strong> Standard web request data (IP address, user agent)</li>
          <li><strong>Privacy Policy:</strong> <a href="https://aws.amazon.com/privacy/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://aws.amazon.com/privacy/</a></li>
        </ul>

        <hr className="my-8 border-gray-200" />

        {/* Section 4 */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Storage and Security</h2>

        <h3 className="text-lg font-semibold text-gray-800 mb-2">4.1 Data Storage</h3>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-6">
          <li>Your personal information is stored on secure cloud servers</li>
          <li>Authentication tokens are stored in encrypted device storage (Android EncryptedSharedPreferences / iOS Keychain)</li>
          <li>Downloaded content is stored locally on your device in a private application directory</li>
          <li>All data transmission between the App and our servers is encrypted using HTTPS/TLS</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-800 mb-2">4.2 Security Measures</h3>
        <p className="text-gray-700 mb-3">We implement appropriate technical and organisational measures to protect your personal information, including:</p>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-6">
          <li>Encrypted data transmission (HTTPS/TLS)</li>
          <li>Encrypted local storage for sensitive data (tokens, credentials)</li>
          <li>JWT-based authentication with token refresh mechanism</li>
          <li>Session management with device-level access control</li>
          <li>Secure payment processing through PCI-compliant payment partners</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-800 mb-2">4.3 Data Retention</h3>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-6">
          <li>We retain your personal information for as long as your account is active or as needed to provide services</li>
          <li>Learning progress data is retained to enable continued access to your course history</li>
          <li>Payment records are retained as required by applicable financial regulations</li>
          <li>You may request deletion of your account and associated data at any time (see Section 7)</li>
        </ul>

        <hr className="my-8 border-gray-200" />

        {/* Section 5 */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Sharing of Information</h2>
        <p className="text-gray-700 mb-3">We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-6">
          <li><strong>Service Providers:</strong> With third-party service providers who assist us in operating the App (as listed in Section 3), strictly for the purposes described</li>
          <li><strong>Payment Processing:</strong> With Zoho Payments to process your transactions securely</li>
          <li><strong>Legal Requirements:</strong> When required by law, regulation, legal process, or governmental request</li>
          <li><strong>Safety and Security:</strong> To protect the rights, property, or safety of PGME, our users, or the public</li>
          <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, with appropriate notice to users</li>
        </ul>

        <hr className="my-8 border-gray-200" />

        {/* Section 6 */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Permissions</h2>
        <p className="text-gray-700 mb-4">The App requests the following device permissions:</p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-800">Permission</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-800">Purpose</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              <tr>
                <td className="border border-gray-300 px-4 py-2 font-medium">Camera</td>
                <td className="border border-gray-300 px-4 py-2">Required for live Zoom video sessions</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 font-medium">Microphone</td>
                <td className="border border-gray-300 px-4 py-2">Required for audio in live Zoom sessions</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2 font-medium">Location</td>
                <td className="border border-gray-300 px-4 py-2">Address auto-fill during profile setup (optional)</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 font-medium">Storage</td>
                <td className="border border-gray-300 px-4 py-2">Downloading videos and documents for offline access</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2 font-medium">Notifications</td>
                <td className="border border-gray-300 px-4 py-2">Receiving class reminders and important updates</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 font-medium">Bluetooth</td>
                <td className="border border-gray-300 px-4 py-2">Audio device connectivity during Zoom sessions</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2 font-medium">Internet</td>
                <td className="border border-gray-300 px-4 py-2">Core app functionality and content delivery</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-gray-700 mb-6">All permissions are requested at the time of use and can be managed through your device settings.</p>

        <hr className="my-8 border-gray-200" />

        {/* Section 7 */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your Rights and Choices</h2>
        <p className="text-gray-700 mb-4">You have the following rights regarding your personal information:</p>

        <h3 className="text-lg font-semibold text-gray-800 mb-2">7.1 Access and Update</h3>
        <p className="text-gray-700 mb-4">You can view and update your profile information at any time through the Edit Profile section in the App.</p>

        <h3 className="text-lg font-semibold text-gray-800 mb-2">7.2 Device Session Management</h3>
        <p className="text-gray-700 mb-4">You can view all active sessions and remotely logout from any device through the App settings.</p>

        <h3 className="text-lg font-semibold text-gray-800 mb-2">7.3 Notification Preferences</h3>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
          <li>You can manage notification preferences within the App settings</li>
          <li>You can disable push notifications through your device settings</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-800 mb-2">7.4 Location Access</h3>
        <p className="text-gray-700 mb-4">You can enable or disable location access through your device settings at any time.</p>

        <h3 className="text-lg font-semibold text-gray-800 mb-2">7.5 Data Deletion</h3>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-4">
          <li>You may request complete deletion of your account and all associated personal data by contacting us at the email address provided below</li>
          <li>Upon receiving a valid deletion request, we will delete your personal data within 30 days, except where retention is required by law</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-800 mb-2">7.6 Data Download</h3>
        <p className="text-gray-700 mb-6">You may request a copy of your personal data in a portable format by contacting us.</p>

        <hr className="my-8 border-gray-200" />

        {/* Section 8 */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Children's Privacy</h2>
        <p className="text-gray-700 mb-6">
          The App is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children under 18 years of age. If we become aware that we have collected personal information from a child under 18, we will take steps to delete such information promptly.
        </p>

        <hr className="my-8 border-gray-200" />

        {/* Section 9 */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Changes to This Privacy Policy</h2>
        <p className="text-gray-700 mb-3">We may update this Privacy Policy from time to time. We will notify you of any material changes by:</p>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 mb-3">
          <li>Posting the updated Privacy Policy within the App</li>
          <li>Sending a push notification about the update</li>
          <li>Updating the "Last Updated" date at the top of this policy</li>
        </ul>
        <p className="text-gray-700 mb-6">Your continued use of the App after any changes constitutes your acceptance of the updated Privacy Policy.</p>

        <hr className="my-8 border-gray-200" />

        {/* Section 10 */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Data Transfer</h2>
        <p className="text-gray-700 mb-6">
          Your information may be transferred to and processed on servers located outside your country of residence. By using the App, you consent to the transfer of your information to facilities maintained by us or our third-party service providers, where applicable data protection laws may differ from those in your jurisdiction.
        </p>

        <hr className="my-8 border-gray-200" />

        {/* Section 11 */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Cookies and Tracking</h2>
        <p className="text-gray-700 mb-6">
          The App itself does not use browser cookies. However, our integrated WebView-based payment gateway (Zoho Payments) may use cookies or similar technologies as necessary for secure payment processing.
        </p>

        <hr className="my-8 border-gray-200" />

        {/* Section 12 */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact Us</h2>
        <p className="text-gray-700 mb-3">If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:</p>
        <div className="text-gray-700 mb-6">
          <p className="font-semibold">PGME (Post Graduate Medical Education)</p>
          <p>Email: [your-support-email@pgme.com]</p>
          <p>Address: [Your Registered Business Address]</p>
        </div>

        <hr className="my-8 border-gray-200" />

        {/* Section 13 */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Grievance Officer</h2>
        <p className="text-gray-700 mb-3">In accordance with applicable regulations, the details of the Grievance Officer are as follows:</p>
        <div className="text-gray-700 mb-3">
          <p>Name: [Grievance Officer Name]</p>
          <p>Email: [grievance-officer-email@pgme.com]</p>
          <p>Address: [Registered Office Address]</p>
        </div>
        <p className="text-gray-700">Response time: We will acknowledge your grievance within 24 hours and resolve it within 15 days from the date of receipt.</p>
      </div>
    </div>
  );
}
