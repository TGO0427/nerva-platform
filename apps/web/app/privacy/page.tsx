import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for the Nerva Platform',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <nav className="mb-8">
          <Link
            href="/login"
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
          >
            &larr; Back to Login
          </Link>
        </nav>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 sm:p-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Last updated: March 2026
          </p>

          <div className="space-y-8 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
            <section>
              <p>
                Nerva Technologies (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the Nerva
                platform (&quot;Service&quot;), a multi-tenant warehouse and distribution management system.
                This Privacy Policy explains how we collect, use, share, and protect information in
                connection with the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                1. Information We Collect
              </h2>
              <h3 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-2">
                Account Information
              </h3>
              <p className="mb-3">
                When your organization registers for the Service, we collect business contact
                information including names, email addresses, and job titles for authorized users
                within your tenant.
              </p>
              <h3 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-2">
                Business Data
              </h3>
              <p className="mb-3">
                The Service stores data you and your organization input, including inventory records,
                warehouse configurations, order details, customer information, supplier data, and
                transaction histories.
              </p>
              <h3 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-2">
                Usage Data
              </h3>
              <p>
                We automatically collect information about how you interact with the Service,
                including access times, pages viewed, browser type, device information, and IP
                addresses.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                2. How We Use Your Information
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>To provide, maintain, and improve the Service.</li>
                <li>To authenticate users and manage access within your tenant environment.</li>
                <li>To process transactions and send related notifications.</li>
                <li>To provide customer support and respond to inquiries.</li>
                <li>
                  To generate aggregated, anonymized analytics to improve the Service (individual
                  tenant data is never shared).
                </li>
                <li>To detect, prevent, and address security incidents and technical issues.</li>
                <li>To comply with legal obligations.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                3. Multi-Tenant Data Isolation
              </h2>
              <p>
                Nerva is a multi-tenant platform. Each organization&apos;s data is logically isolated
                within its own tenant environment. Your data is never accessible to other tenants.
                Access controls ensure that users can only view and manage data within their assigned
                tenant. Tenant isolation is enforced at both the application and database levels.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                4. Data Sharing
              </h2>
              <p className="mb-3">We do not sell your data. We may share information only in the following circumstances:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Service Providers:</strong> With trusted third-party providers who assist us
                  in operating the Service (e.g., cloud hosting, monitoring), subject to
                  confidentiality obligations.
                </li>
                <li>
                  <strong>Legal Requirements:</strong> When required by law, regulation, or legal
                  process, or to protect the rights, property, or safety of Nerva Technologies, our
                  users, or others.
                </li>
                <li>
                  <strong>Business Transfers:</strong> In connection with a merger, acquisition, or
                  sale of assets, in which case your data would remain subject to this Privacy Policy.
                </li>
                <li>
                  <strong>With Your Consent:</strong> When you or your organization&apos;s administrator
                  has given explicit consent.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                5. Security Measures
              </h2>
              <p>
                We implement industry-standard security measures to protect your data, including
                encryption of data in transit (TLS) and at rest, regular security assessments,
                role-based access controls, secure authentication mechanisms, and monitoring for
                unauthorized access. While we strive to protect your data, no method of transmission
                or storage is completely secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                6. Data Retention
              </h2>
              <p>
                We retain your data for as long as your account is active or as needed to provide the
                Service. Business data is retained according to your subscription agreement. Upon
                termination of your account, we will make your data available for export for a
                reasonable period, after which it will be securely deleted. We may retain certain
                information as required by law or for legitimate business purposes such as fraud
                prevention.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                7. Your Rights
              </h2>
              <p className="mb-3">Depending on your jurisdiction, you may have the right to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Access the personal data we hold about you.</li>
                <li>Request correction of inaccurate data.</li>
                <li>Request deletion of your personal data.</li>
                <li>Object to or restrict processing of your data.</li>
                <li>Request portability of your data.</li>
                <li>Withdraw consent where processing is based on consent.</li>
              </ul>
              <p className="mt-3">
                To exercise any of these rights, please contact your organization&apos;s administrator
                or reach out to us directly at support@nerva.app.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                8. Cookies and Tracking
              </h2>
              <p>
                The Service uses essential cookies and local storage to maintain your session,
                remember your preferences (such as your Tenant ID), and ensure the proper functioning
                of the platform. We do not use third-party advertising cookies. Usage analytics, if
                enabled, use anonymized data and do not track individual users across other websites.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                9. Changes to This Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material
                changes by posting the updated policy on the Service and updating the &quot;Last
                updated&quot; date. Your continued use of the Service after changes are posted
                constitutes acceptance of the revised policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                10. Contact Us
              </h2>
              <p>
                If you have any questions or concerns about this Privacy Policy or our data
                practices, please contact us at support@nerva.app.
              </p>
            </section>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
          >
            &larr; Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
