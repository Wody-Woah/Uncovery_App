export default function DeleteAccountPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-semibold text-white mb-2">Delete Your Account</h1>
      <p className="text-sm text-white/50 mb-10">The Uncovery Devotional</p>

      <div className="space-y-8 text-white/80 leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">How to Request Account Deletion</h2>
          <p className="mb-4">
            To request the deletion of your account and all associated data, please send an email to:
          </p>
          <a
            href="mailto:george@rootawakeningfarm.org?subject=Account Deletion Request"
            className="inline-block bg-white/10 border border-white/20 rounded-xl px-5 py-4 text-white font-medium hover:bg-white/20 transition-colors"
          >
            george@rootawakeningfarm.org
          </a>
          <p className="mt-4">
            Please include the email address associated with your account in your message.
            We will process your request within <strong>30 days</strong> and send you a
            confirmation once it is complete.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What Gets Deleted</h2>
          <p className="mb-3">When your account is deleted, the following data is permanently removed:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Your account credentials (email and password)</li>
            <li>Your display name and profile information</li>
            <li>Your journal entries</li>
            <li>Your bookmarks</li>
            <li>Your reading history and streak data</li>
            <li>Your Small Group memberships and chat messages</li>
            <li>Any reactions you have left on group messages</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What Is Retained</h2>
          <p>
            We do not retain any personal data after your account has been deleted. All data
            listed above is permanently and irreversibly removed from our systems.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Questions</h2>
          <p>
            If you have any questions about the deletion process, please contact us at{' '}
            <a href="mailto:george@rootawakeningfarm.org" className="text-blue-400 underline">
              george@rootawakeningfarm.org
            </a>.
          </p>
        </section>

      </div>
    </div>
  )
}
