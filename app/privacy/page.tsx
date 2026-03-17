export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-semibold text-white mb-2">Privacy Policy</h1>
      <p className="text-sm text-white/50 mb-10">Last updated: March 17, 2025</p>

      <div className="space-y-8 text-white/80 leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">1. Who We Are</h2>
          <p>
            The Uncovery Devotional is a daily devotional app created to support people in recovery,
            faith, and personal growth. This app is operated by The Uncovery Devotional team. If you
            have any questions about this policy, you can contact us at{' '}
            <a href="mailto:george@rootawakeningfarm.org" className="text-blue-400 underline">
              george@rootawakeningfarm.org
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">2. What Information We Collect</h2>
          <p className="mb-3">When you use this app, we collect the following information:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li><strong>Account information</strong> — your name and email address when you create an account</li>
            <li><strong>Reading activity</strong> — which devotions you have read and when, used to calculate your reading streak</li>
            <li><strong>Journal entries</strong> — any notes or reflections you choose to write inside the app</li>
            <li><strong>Bookmarks</strong> — devotions you save for later</li>
            <li><strong>Group activity</strong> — messages you send in Small Groups, reactions to messages, and group membership</li>
            <li><strong>Profile information</strong> — your display name, which is shown to other members of your Small Groups</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">3. How We Use Your Information</h2>
          <p className="mb-3">We use the information we collect to:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Provide you access to your account and personal content</li>
            <li>Display your reading streak and devotional progress</li>
            <li>Enable Small Groups features including group chat and member lists</li>
            <li>Send you account-related emails (such as password resets)</li>
            <li>Improve the app experience over time</li>
          </ul>
          <p className="mt-3">
            We do not sell your personal information to any third party. We do not use your data
            for advertising purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">4. How We Store Your Information</h2>
          <p>
            Your data is stored securely using Supabase, a trusted database and authentication
            provider. All data is encrypted in transit using HTTPS. Access to your data is
            restricted by row-level security policies, meaning users can only access their own
            private content such as journal entries and bookmarks.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">5. Third-Party Services</h2>
          <p className="mb-3">This app uses the following third-party services:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li><strong>Supabase</strong> — database, authentication, and real-time messaging</li>
            <li><strong>Vercel</strong> — web hosting and deployment</li>
            <li><strong>Resend</strong> — transactional email delivery</li>
          </ul>
          <p className="mt-3">
            Each of these services has its own privacy policy and handles data in accordance with
            applicable laws.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">6. Your Rights</h2>
          <p className="mb-3">You have the right to:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your account and associated data</li>
          </ul>
          <p className="mt-3">
            To request any of the above, please email us at{' '}
            <a href="mailto:george@rootawakeningfarm.org" className="text-blue-400 underline">
              george@rootawakeningfarm.org
            </a>{' '}
            and we will respond within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">7. Children&apos;s Privacy</h2>
          <p>
            This app is not directed at children under the age of 13. We do not knowingly collect
            personal information from children under 13. If you believe a child has provided us
            with their information, please contact us and we will delete it promptly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">8. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. When we do, we will update the
            date at the top of this page. Continued use of the app after changes are posted
            constitutes your acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">9. Contact Us</h2>
          <p>
            If you have any questions or concerns about this privacy policy or your data, please
            contact us at:{' '}
            <a href="mailto:george@rootawakeningfarm.org" className="text-blue-400 underline">
              george@rootawakeningfarm.org
            </a>
          </p>
        </section>

      </div>
    </div>
  )
}
