import Link from "next/link";

const steps = [
  {
    title: "1. Enter pickup & drop-off",
    body: "Drop a pin or type an address for where we collect your package and where it needs to go.",
    icon: "📍",
  },
  {
    title: "2. Get an instant quote",
    body: "Price is calculated from live distance — no surprises at checkout.",
    icon: "✦",
  },
  {
    title: "3. Track your rider live",
    body: "Watch your package move on the map in real time, from pickup to delivery.",
    icon: "◎",
  },
];

const tiers = [
  { name: "Small package", desc: "Envelope, documents, small box", price: "₦1,200 base", highlight: false },
  { name: "Medium package", desc: "Shoe box, groceries, parcels", price: "₦2,000 base", highlight: true },
  { name: "Large package", desc: "Furniture pieces, appliances", price: "₦3,500 base", highlight: false },
];

const features = [
  {
    icon: "🛡",
    title: "Vetted riders",
    body: "Every rider is background-checked and approved before they accept a single delivery.",
  },
  {
    icon: "⚡",
    title: "Same-day speed",
    body: "Most routes are fulfilled within hours — not days. Book before noon for afternoon delivery.",
  },
  {
    icon: "📱",
    title: "Live GPS tracking",
    body: "Follow your package on a real-time map from pickup confirmation to doorstep handoff.",
  },
  {
    icon: "💳",
    title: "Transparent pricing",
    body: "See the full fare before you pay. Distance-based rates with no hidden fees at checkout.",
  },
  {
    icon: "📦",
    title: "Chain of custody",
    body: "Every status change is logged — assigned, picked up, in transit, delivered.",
  },
  {
    icon: "🤝",
    title: "White-glove support",
    body: "Recipient details, package notes, and direct rider contact when you need it.",
  },
];

const stats = [
  { value: "2,400+", label: "Deliveries completed" },
  { value: "98%", label: "On-time rate" },
  { value: "45 min", label: "Avg. delivery time" },
  { value: "4.9★", label: "Customer rating" },
];

const areas = [
  "Victoria Island",
  "Lekki",
  "Ikeja",
  "Surulere",
  "Yaba",
  "Ikoyi",
  "Ajah",
  "Maryland",
];

const testimonials = [
  {
    quote: "Booked at 9am, package was at my client's office by 11. The live map made the whole thing feel effortless.",
    name: "Adaeze O.",
    role: "Small business owner, VI",
  },
  {
    quote: "Finally a courier that shows the price upfront. No awkward calls, no surprises — just a clean handoff.",
    name: "Tunde M.",
    role: "E-commerce seller, Lekki",
  },
  {
    quote: "I ride with them on weekends. The dashboard is straightforward and payouts are clear per trip.",
    name: "Chidi K.",
    role: "Part-time rider, Ikeja",
  },
];

const faqs = [
  {
    q: "How is the fare calculated?",
    a: "Base fare plus a per-kilometer rate, computed automatically from your pickup and drop-off pins on the map.",
  },
  {
    q: "Can I track my package in real time?",
    a: "Yes. Once a rider accepts your order, you get a live tracking page with GPS updates until delivery.",
  },
  {
    q: "What areas do you cover?",
    a: "We currently serve major Lagos corridors including VI, Lekki, Ikeja, Surulere, Yaba, and surrounding zones.",
  },
  {
    q: "How do I become a rider?",
    a: "Create an account, select rider, fill in your profile and vehicle details, and wait for admin approval.",
  },
];

export default function HomePage() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-[#f4c76b]/10 blur-3xl" />
        <div className="lux-shell grid min-h-[calc(100vh-72px)] items-center gap-10 py-12 md:grid-cols-[1.02fr_0.98fr] md:py-16">
          <div>
            <p className="lux-label">Courier service for Lagos</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[1.02] text-[#17130f] sm:text-6xl">
              Same-day delivery with a private-client feel.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#6f6253]">
              Book a rider in seconds, price the route before checkout, and
              follow every package with live tracking from pickup to handoff.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/checkout"
                className="lux-button-gold inline-flex justify-center"
              >
                Send a package
              </Link>
              <Link
                href="/auth/signup"
                className="lux-button-soft inline-flex justify-center"
              >
                Create account
              </Link>
            </div>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3 text-sm">
              {["Live tracking", "Vetted riders", "Clear pricing"].map((item) => (
                <div key={item} className="lux-trust-pill">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="lux-panel p-5">
            <div className="rounded-xl border border-white/10 bg-white/8 p-5">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f4c76b]">
                    Premium dispatch
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold">Victoria Island → Ikeja</h2>
                </div>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                  Live
                </span>
              </div>
              <div className="mt-8 space-y-5">
                {[
                  ["Pickup confirmed", "12:08"],
                  ["Rider en route", "12:16"],
                  ["Delivery window", "34 min"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/8 px-4 py-3">
                    <span className="text-sm text-white/70">{label}</span>
                    <span className="font-semibold text-white">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 rounded-xl bg-[#f4c76b] p-4 text-[#17130f]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                  Estimated fare
                </p>
                <p className="mt-2 text-4xl font-semibold">₦4,850</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust stats */}
      <section className="lux-section-band">
        <div className="lux-shell py-0">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="lux-card p-6 text-center">
                <p className="text-3xl font-semibold text-[#b2843a]">{s.value}</p>
                <p className="mt-2 text-sm text-[#6f6253]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="lux-shell py-16">
        <div className="max-w-2xl">
          <p className="lux-label">The flow</p>
          <h2 className="mt-3 text-3xl font-semibold">A clean chain of custody.</h2>
          <p className="mt-3 leading-7 text-[#6f6253]">
            Three steps from booking to handoff — designed to feel as polished as a private concierge service.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.title} className="lux-card group p-6">
              <div className="lux-feature-icon">{s.icon}</div>
              <h3 className="mt-4 font-semibold text-[#17130f]">{s.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#6f6253]">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="lux-section-band">
        <div className="lux-shell py-0">
          <div className="text-center">
            <p className="lux-label">Why choose us</p>
            <h2 className="mt-3 text-3xl font-semibold">Built for people who expect more.</h2>
            <p className="mx-auto mt-3 max-w-lg leading-7 text-[#6f6253]">
              Premium isn&apos;t about price — it&apos;s about clarity, speed, and knowing exactly where your package is at every moment.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="lux-card p-6">
                <div className="lux-feature-icon">{f.icon}</div>
                <h3 className="mt-4 font-semibold text-[#17130f]">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6f6253]">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service areas */}
      <section className="lux-shell py-16">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <p className="lux-label">Coverage</p>
            <h2 className="mt-3 text-3xl font-semibold">Serving Lagos&apos;s busiest corridors.</h2>
            <p className="mt-3 leading-7 text-[#6f6253]">
              From island business districts to mainland hubs — we connect the routes that matter most for same-day delivery.
            </p>
            <Link href="/checkout" className="lux-button-gold mt-6 inline-flex">
              Check your route
            </Link>
          </div>
          <div className="lux-card p-6">
            <div className="flex flex-wrap gap-2">
              {areas.map((area) => (
                <span
                  key={area}
                  className="rounded-full border border-[#e7dece] bg-[#fbf8f1] px-4 py-2 text-sm font-medium text-[#2a2118] transition hover:border-[#b2843a] hover:bg-[#fff4dd]"
                >
                  {area}
                </span>
              ))}
            </div>
            <p className="mt-5 text-xs text-[#9a8e7d]">
              Don&apos;t see your area? Book anyway — we&apos;ll confirm availability at checkout.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="lux-section-band">
        <div className="lux-shell py-0">
          <p className="lux-label text-center">Pricing</p>
          <h2 className="mt-3 text-center text-3xl font-semibold">Simple, honest pricing</h2>
          <p className="mx-auto mt-3 max-w-lg text-center leading-7 text-[#6f6253]">
            Base fare plus a per-kilometer rate calculated automatically from your pickup and drop-off pins.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={`lux-card p-6 text-center ${t.highlight ? "ring-2 ring-[#b2843a]/30" : ""}`}
              >
                {t.highlight && (
                  <span className="mb-3 inline-block rounded-full bg-[#fff4dd] px-3 py-1 text-xs font-semibold text-[#987033]">
                    Most popular
                  </span>
                )}
                <h3 className="font-semibold text-[#17130f]">{t.name}</h3>
                <p className="mt-2 text-sm text-[#6f6253]">{t.desc}</p>
                <p className="mt-5 text-3xl font-semibold text-[#b2843a]">{t.price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="lux-shell py-16">
        <div className="text-center">
          <p className="lux-label">Testimonials</p>
          <h2 className="mt-3 text-3xl font-semibold">Trusted by Lagos senders & riders.</h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="lux-card flex flex-col p-6">
              <p className="flex-1 text-sm leading-7 text-[#6f6253]">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="lux-divider mt-6" />
              <div className="mt-4">
                <p className="font-semibold text-[#17130f]">{t.name}</p>
                <p className="text-xs text-[#9a8e7d]">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="lux-section-band">
        <div className="lux-shell max-w-3xl py-0">
          <div className="text-center">
            <p className="lux-label">FAQ</p>
            <h2 className="mt-3 text-3xl font-semibold">Common questions</h2>
          </div>
          <div className="mt-10 flex flex-col gap-4">
            {faqs.map((f) => (
              <div key={f.q} className="lux-card p-5">
                <h3 className="font-semibold text-[#17130f]">{f.q}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6f6253]">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rider CTA */}
      <section className="lux-shell py-16 text-center">
        <div className="lux-panel px-6 py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f4c76b]">
            Join the fleet
          </p>
          <h2 className="mt-3 text-3xl font-semibold">Want to earn as a rider?</h2>
          <p className="mx-auto mt-3 max-w-lg text-white/70">
            Go online, accept nearby deliveries, and get paid per trip.
          </p>
          <Link
            href="/auth/signup?role=rider"
            className="mt-7 inline-flex rounded-xl bg-[#f4c76b] px-6 py-3 font-semibold text-[#17130f] transition hover:bg-[#ffd879]"
          >
            Apply to ride
          </Link>
        </div>
      </section>
    </div>
  );
}
