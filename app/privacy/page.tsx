import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | MFU Library',
  description: 'Privacy policy and data handling for Mae Fah Luang University Muslim Club Library.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="border-b border-neutral-800 pb-6">
          <Link
            href="/"
            className="inline-flex items-center text-xs font-mono uppercase tracking-wider text-neutral-400 hover:text-white mb-4"
          >
            ← Back to Library
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-neutral-400 mt-2 font-mono">Last updated: October 2026</p>
        </div>

        <section className="space-y-4 text-neutral-300 leading-relaxed text-sm">
          <h2 className="text-lg font-semibold text-white">1. Information We Collect</h2>
          <p>
            When you sign in to MFU Library using Google Authentication, we receive your basic public profile information, specifically:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-neutral-400">
            <li>Your full name</li>
            <li>Your email address</li>
            <li>Your Google profile picture (avatar)</li>
          </ul>
        </section>

        <section className="space-y-4 text-neutral-300 leading-relaxed text-sm">
          <h2 className="text-lg font-semibold text-white">2. How We Use Your Information</h2>
          <p>We use your information exclusively for the operational needs of the library:</p>
          <ul className="list-disc pl-5 space-y-1 text-neutral-400">
            <li>Managing book checkouts, returns, and waitlist queues</li>
            <li>Sending transactional emails (borrow confirmations and overdue reminders)</li>
            <li>Identifying users in our club library management system</li>
          </ul>
        </section>

        <section className="space-y-4 text-neutral-300 leading-relaxed text-sm">
          <h2 className="text-lg font-semibold text-white">3. Data Protection & Sharing</h2>
          <p>
            We do not sell, rent, or share your personal data with third-party advertisers or commercial entities. Your authentication is secured through Supabase and Google OAuth protocols.
          </p>
        </section>

        <section className="space-y-4 text-neutral-300 leading-relaxed text-sm">
          <h2 className="text-lg font-semibold text-white">4. Contact Information</h2>
          <p>
            If you have questions about your data or wish to delete your account, please reach out to the club administration team at{' '}
            <span className="font-mono text-white">tarbiyahmcmfu@gmail.com</span>.
          </p>
        </section>
      </div>
    </div>
  );
}
