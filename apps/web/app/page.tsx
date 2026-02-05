import Link from "next/link";

const targetAreas = [
  {
    title: "Distribution Ops",
    desc: "Sales, pick/pack, dispatch, and POD with stock movements captured automatically.",
    bullets: ["Pick waves & task assignment", "Load builder & trip planning", "POD capture & exception handling"],
  },
  {
    title: "Warehouse Control",
    desc: "Bin-level visibility with a ledger you can audit. No mystery stock.",
    bullets: ["Receiving & putaway", "Transfers & IBTs", "Cycle counts & adjustments"],
  },
  {
    title: "Returns & Credits",
    desc: "Turn returns into clean credits and correct stock outcomes in minutes.",
    bullets: ["RMA workflows", "Inspection & disposition", "Credit note drafts"],
  },
];

const modules = [
  { name: "Sales", desc: "Orders, lines, allocation, and status flow." },
  { name: "Fulfilment", desc: "Pick waves, pick tasks, pack and shipment creation." },
  { name: "Dispatch", desc: "Trips, manifests, driver assignment, and live progress." },
  { name: "POD", desc: "Signature/photo proof, GPS stamp, exceptions and retries." },
  { name: "Returns", desc: "RMAs, inspection, restock/quarantine/scrap." },
  { name: "Inventory", desc: "Stock ledger, bin moves, adjustments, and counts." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-700 grid place-items-center text-white font-bold text-sm">
              N
            </div>
            <span className="font-semibold text-lg">Nerva</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#why" className="hover:text-gray-900 transition-colors">Why Nerva</a>
            <a href="#modules" className="hover:text-gray-900 transition-colors">Modules</a>
            <a href="#how" className="hover:text-gray-900 transition-colors">How it works</a>
            <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="px-3 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 transition-colors"
            >
              Book a demo
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border border-gray-200 bg-gray-50">
              <span className="font-medium text-gray-900">Ops-first WMS</span>
              <span className="text-gray-500">for distribution teams</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight">
              Warehouse + Dispatch + Returns,
              <span className="block text-gray-500 mt-1">running as one system.</span>
            </h1>

            <p className="text-base md:text-lg text-gray-600 leading-relaxed">
              Pick faster, deliver on time, reconcile stock automatically.
              Nerva connects fulfilment, delivery proof, and returns into one
              operational flow built for real distribution teams.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
                POD in 10 seconds
              </span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                Returns to credits automated
              </span>
              <span className="text-xs px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                Stock ledger audit trail
              </span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Link
                href="/login"
                className="px-5 py-2.5 rounded-lg bg-blue-700 text-white font-medium hover:bg-blue-800 transition-colors"
              >
                Book a demo
              </Link>
              <a
                href="#modules"
                className="px-5 py-2.5 rounded-lg border border-gray-200 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                See modules
              </a>
            </div>

            <p className="text-xs text-gray-400 pt-1">
              Start with one warehouse. Expand when the team is ready.
            </p>
          </div>

          {/* Dashboard preview */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
            <div className="flex items-center justify-between pb-4">
              <div className="text-sm font-semibold text-gray-900">Operations Dashboard</div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-gray-500">Live view</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { k: "Orders to Pick", v: "24", color: "text-orange-600" },
                { k: "Trips in Progress", v: "3", color: "text-blue-600" },
                { k: "POD Exceptions", v: "5", color: "text-red-600" },
                { k: "Returns Pending", v: "7", color: "text-purple-600" },
              ].map((t) => (
                <div key={t.k} className="rounded-xl bg-white border border-gray-200 p-4">
                  <div className="text-xs text-gray-500">{t.k}</div>
                  <div className={`text-3xl font-bold mt-1 ${t.color}`}>{t.v}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-xl bg-white border border-gray-200 p-4">
              <div className="text-xs text-gray-500 mb-1">Today&apos;s focus</div>
              <div className="text-sm text-gray-700">
                Create pick wave for 12 allocated orders, build 2 trips, and resolve 5 POD exceptions before 16:00.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Outcomes strip */}
      <section className="border-y border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { metric: "Short picks", direction: "Down" },
              { metric: "OTIF rate", direction: "Up" },
              { metric: "POD chasing", direction: "Eliminated" },
              { metric: "Returns cycle", direction: "Faster" },
            ].map((o) => (
              <div key={o.metric}>
                <div className="text-lg font-bold text-gray-900">{o.direction}</div>
                <div className="text-sm text-gray-500 mt-0.5">{o.metric}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why / Target areas */}
      <section id="why" className="mx-auto max-w-6xl px-4 py-16">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold">Built for operational clarity</h2>
          <p className="text-gray-600 mt-3 text-lg">
            Clear queues, simple actions, and a stock ledger that explains every movement.
            Your team always knows the next step.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {targetAreas.map((c) => (
            <div key={c.title} className="rounded-2xl border border-gray-200 p-6 hover:shadow-sm transition-shadow">
              <div className="text-lg font-semibold">{c.title}</div>
              <div className="text-sm text-gray-600 mt-2">{c.desc}</div>
              <ul className="text-sm mt-5 space-y-2.5">
                {c.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-gray-700">
                    <svg className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="border-t border-gray-200">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-bold">Modules that connect end-to-end</h2>
          <p className="text-gray-600 mt-3 text-lg max-w-2xl">
            Start with Sales + Fulfilment and add Dispatch and Returns when your workflow is ready.
          </p>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 mt-10">
            {modules.map((m) => (
              <div key={m.name} className="rounded-2xl border border-gray-200 p-6 hover:shadow-sm transition-shadow">
                <div className="text-lg font-semibold">{m.name}</div>
                <div className="text-sm text-gray-600 mt-2">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-bold">How it works</h2>
          <div className="grid md:grid-cols-3 gap-5 mt-10">
            {[
              { step: "01", title: "Create orders", desc: "Capture sales orders, allocate stock from available inventory, and control the status flow from draft to confirmed." },
              { step: "02", title: "Pick, pack & ship", desc: "Create pick waves, assign tasks, scan picks, build shipments, and hand off to dispatch without spreadsheet chaos." },
              { step: "03", title: "Deliver & close the loop", desc: "Plan trips, capture proof of delivery, handle exceptions, process returns, and update stock automatically." },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-700 text-white text-xs font-bold">
                  {s.step}
                </div>
                <div className="text-lg font-semibold mt-3">{s.title}</div>
                <div className="text-sm text-gray-600 mt-2 leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Credibility */}
      <section className="border-t border-gray-200">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-bold">Built for SME distribution teams</h2>
          <div className="grid md:grid-cols-3 gap-5 mt-10">
            <div className="rounded-2xl border border-gray-200 p-6">
              <div className="text-lg font-semibold">Audit trail built-in</div>
              <div className="text-sm text-gray-600 mt-2">
                Every stock movement is a ledger entry. No edits, no overwrites. Your auditors
                can trace any unit from receipt to dispatch.
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 p-6">
              <div className="text-lg font-semibold">Multi-tenant & multi-site</div>
              <div className="text-sm text-gray-600 mt-2">
                Role-based permissions, site isolation, and warehouse-level control.
                Each team sees only what they need.
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 p-6">
              <div className="text-lg font-semibold">Start small, scale up</div>
              <div className="text-sm text-gray-600 mt-2">
                Launch at one warehouse with core modules. Add sites, warehouses,
                and workflow steps as your operation grows.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-bold">Frequently asked questions</h2>
          <div className="mt-8 space-y-4 max-w-3xl">
            {[
              { q: "Can we start with one warehouse only?", a: "Yes. Nerva is designed to launch at one site. Add more warehouses and sites when you're ready, without re-architecture." },
              { q: "How does stock tracking work?", a: "Every movement is a ledger entry with a reason code, reference, timestamp, and user. No edits or overwrites means a complete audit trail." },
              { q: "Does this replace our accounting system?", a: "No. Nerva handles operations: warehouse, fulfilment, dispatch, and returns. It integrates with your finance system so ops stays clean and fast." },
              { q: "What about barcode scanning?", a: "Mobile scanning support is built in for receiving, pick tasks, and proof of delivery. Standard barcode and QR formats are supported." },
            ].map((f) => (
              <div key={f.q} className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="font-semibold">{f.q}</div>
                <div className="text-sm text-gray-600 mt-2">{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-gray-200">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="rounded-2xl border border-gray-200 bg-blue-700 p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="text-white">
              <div className="text-2xl font-bold">Ready to see Nerva in action?</div>
              <div className="text-blue-100 mt-2">
                We&apos;ll walk through your exact pick, dispatch, and returns flow.
              </div>
            </div>
            <Link
              href="/login"
              className="px-6 py-3 rounded-lg bg-white text-blue-700 font-semibold hover:bg-blue-50 transition-colors flex-shrink-0"
            >
              Book a demo
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-gray-500 flex flex-col md:flex-row justify-between gap-3">
          <div>&copy; {new Date().getFullYear()} Nerva</div>
          <div className="flex gap-6">
            <span>Privacy</span>
            <span>Terms</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
