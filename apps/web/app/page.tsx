import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Nerva Platform
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Distribution & Warehouse Management System
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="btn-primary"
          >
            Sign In
          </Link>
          <Link
            href="/docs"
            className="btn-secondary"
          >
            API Docs
          </Link>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
        <div className="card">
          <h3 className="font-semibold text-lg mb-2">Warehouse Management</h3>
          <p className="text-gray-600 text-sm">
            GRN, putaway, picking, packing, and shipping workflows with barcode scanning support.
          </p>
        </div>
        <div className="card">
          <h3 className="font-semibold text-lg mb-2">Dispatch & POD</h3>
          <p className="text-gray-600 text-sm">
            Trip planning, driver assignment, and mobile proof of delivery capture.
          </p>
        </div>
        <div className="card">
          <h3 className="font-semibold text-lg mb-2">Returns & Credits</h3>
          <p className="text-gray-600 text-sm">
            RMA management, inspection workflows, and credit note processing.
          </p>
        </div>
      </div>
    </main>
  );
}
