import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service | MFU Library',
  description: 'Terms of service for Mae Fah Luang University Muslim Club Library.',
};

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-sm text-neutral-400 mt-2 font-mono">Last updated: October 2026</p>
        </div>

        <section className="space-y-4 text-neutral-300 leading-relaxed text-sm">
          <h2 className="text-lg font-semibold text-white">1. Eligibility</h2>
          <p>
            The MFU Library service is provided for students, staff, and members associated with the Mae Fah Luang University Muslim Club.
          </p>
        </section>

        <section className="space-y-4 text-neutral-300 leading-relaxed text-sm">
          <h2 className="text-lg font-semibold text-white">2. Borrowing Rules</h2>
          <ul className="list-disc pl-5 space-y-1 text-neutral-400">
            <li>Standard borrowing duration is 14 days unless specified otherwise.</li>
            <li>Members are responsible for returning books in good condition.</li>
            <li>Overdue notices will be sent via email to remind borrowers.</li>
            <li>Waitlist queue positions are respected on a first-come, first-served basis.</li>
          </ul>
        </section>

        <section className="space-y-4 text-neutral-300 leading-relaxed text-sm">
          <h2 className="text-lg font-semibold text-white">3. Care of Collection</h2>
          <p>
            Borrowers agree to treat library materials with care and report any existing damage or loss immediately to the administrators.
          </p>
        </section>

        <section className="space-y-4 text-neutral-300 leading-relaxed text-sm">
          <h2 className="text-lg font-semibold text-white">4. Modifications</h2>
          <p>
            The club administrators reserve the right to modify these rules as necessary to ensure fair access for all members.
          </p>
        </section>
      </div>
    </div>
  );
}
