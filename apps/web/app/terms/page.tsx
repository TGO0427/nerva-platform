import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for the Nerva Platform',
};

export default function TermsOfServicePage() {
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
            Terms of Service
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Last updated: March 2026
          </p>

          <div className="space-y-8 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing or using the Nerva platform (&quot;Service&quot;), operated by Nerva Technologies
                (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be bound by these Terms of
                Service (&quot;Terms&quot;). If you are using the Service on behalf of an organization, you
                represent that you have the authority to bind that organization to these Terms. If you
                do not agree to these Terms, you may not access or use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                2. Description of Service
              </h2>
              <p>
                Nerva is a cloud-based, multi-tenant warehouse and distribution management platform
                designed for business-to-business use. The Service provides inventory management,
                order processing, warehouse operations, reporting, and related functionality as
                described in your applicable subscription agreement.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                3. Account Responsibilities
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  You are responsible for maintaining the confidentiality of your account credentials,
                  including your Tenant ID, email, and password.
                </li>
                <li>
                  You must promptly notify us of any unauthorized access to or use of your account.
                </li>
                <li>
                  You are responsible for all activities that occur under your account and within your
                  tenant environment.
                </li>
                <li>
                  Account administrators are responsible for managing user access and permissions
                  within their organization&apos;s tenant.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                4. Acceptable Use
              </h2>
              <p className="mb-3">You agree not to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Use the Service for any unlawful purpose or in violation of any applicable laws or
                  regulations.
                </li>
                <li>
                  Attempt to gain unauthorized access to other tenants&apos; data or any part of the
                  Service not intended for your use.
                </li>
                <li>
                  Interfere with or disrupt the integrity or performance of the Service or its
                  underlying infrastructure.
                </li>
                <li>
                  Reverse engineer, decompile, or disassemble any aspect of the Service.
                </li>
                <li>
                  Upload or transmit viruses, malware, or other malicious code through the Service.
                </li>
                <li>
                  Use the Service to store or process data that you do not have the right to use.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                5. Intellectual Property
              </h2>
              <p>
                The Service, including all software, design, text, graphics, and other content, is
                the property of Nerva Technologies or its licensors and is protected by intellectual
                property laws. You retain ownership of all data you input into the Service. We do not
                claim ownership of your data. You grant us a limited license to host, store, and
                process your data solely for the purpose of providing the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                6. Service Availability
              </h2>
              <p>
                We strive to maintain high availability of the Service but do not guarantee
                uninterrupted access. The Service may be temporarily unavailable due to scheduled
                maintenance, upgrades, or circumstances beyond our reasonable control. We will make
                commercially reasonable efforts to notify you of planned downtime in advance. We are
                not liable for any loss or damage arising from service interruptions.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                7. Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by applicable law, Nerva Technologies shall not be liable
                for any indirect, incidental, special, consequential, or punitive damages, including
                but not limited to loss of profits, data, or business opportunities, arising out of
                or related to your use of the Service. Our total aggregate liability for any claims
                arising under these Terms shall not exceed the amount you paid to us for the Service
                during the twelve (12) months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                8. Termination
              </h2>
              <p>
                Either party may terminate the Service agreement in accordance with the terms of the
                applicable subscription agreement. We may suspend or terminate your access to the
                Service immediately if you breach these Terms. Upon termination, your right to access
                the Service ceases. We will make your data available for export for a reasonable
                period following termination, after which we may delete it.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                9. Changes to Terms
              </h2>
              <p>
                We may update these Terms from time to time. We will notify you of material changes
                by posting the updated Terms on the Service and updating the &quot;Last updated&quot; date.
                Your continued use of the Service after such changes constitutes acceptance of the
                revised Terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                10. Governing Law
              </h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the
                jurisdiction in which Nerva Technologies is incorporated, without regard to its conflict
                of law provisions. Any disputes arising under these Terms shall be resolved in the
                courts of that jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                11. Contact
              </h2>
              <p>
                If you have any questions about these Terms, please contact us at support@nerva.app.
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
