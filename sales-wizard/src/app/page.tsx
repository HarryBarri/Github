'use client'

import ChatWidget from '@/components/ChatWidget'
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">SW</div>
            <span className="font-bold text-gray-900">Sales Wizard</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <a href="#properties" className="hover:text-gray-900 hidden sm:block">Properties</a>
            <a href="#how-it-works" className="hover:text-gray-900 hidden sm:block">How It Works</a>
            <Link href="/admin" className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
              Admin
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-emerald-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            🏡 Nigeria&apos;s Smartest Property Platform
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Find Your Perfect<br />
            <span className="text-emerald-600">Dream Property</span><br />
            in Nigeria
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            From luxury apartments in Lekki to serene duplexes in Abuja — our AI concierge matches you with properties that fit your budget, location, and lifestyle.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => { const btn = document.querySelector('[aria-label="Open chat"]') as HTMLButtonElement; btn?.click(); }}
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-semibold rounded-2xl shadow-lg shadow-emerald-200 transition-all hover:scale-105"
            >
              Find Your Ideal Property →
            </button>
            <a href="#properties" className="px-8 py-4 text-gray-700 hover:text-gray-900 font-medium">
              Browse Listings ↓
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-emerald-600 text-white">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold">500+</div>
            <div className="text-emerald-200 text-sm mt-1">Happy Buyers</div>
          </div>
          <div>
            <div className="text-3xl font-bold">₦2B+</div>
            <div className="text-emerald-200 text-sm mt-1">Properties Sold</div>
          </div>
          <div>
            <div className="text-3xl font-bold">10+</div>
            <div className="text-emerald-200 text-sm mt-1">Cities Covered</div>
          </div>
        </div>
      </section>

      {/* Properties */}
      <section id="properties" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Featured Properties</h2>
            <p className="text-gray-600">Handpicked properties across Nigeria&apos;s top locations</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: '3-Bedroom Luxury Apartment', location: 'Lekki Phase 1, Lagos', price: '₦85M', type: 'Apartment', img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80' },
              { title: '4-Bedroom Duplex', location: 'Maitama, Abuja', price: '₦120M', type: 'Duplex', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80' },
              { title: 'Premium Land (500sqm)', location: 'Ajah, Lagos', price: '₦45M', type: 'Land', img: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80' },
              { title: '2-Bedroom Apartment', location: 'Victoria Island, Lagos', price: '₦65M', type: 'Apartment', img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80' },
              { title: '5-Bedroom Mansion', location: 'Ikoyi, Lagos', price: '₦250M', type: 'Bungalow', img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80' },
              { title: 'Commercial Space', location: 'Wuse 2, Abuja', price: '₦90M', type: 'Commercial', img: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&q=80' },
            ].map((p, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group">
                <div className="relative overflow-hidden h-48">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <span className="absolute top-3 left-3 bg-white text-gray-700 text-xs font-medium px-2 py-1 rounded-full">
                    {p.type}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">{p.title}</h3>
                  <p className="text-gray-500 text-sm mb-3">📍 {p.location}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-600 font-bold text-lg">{p.price}</span>
                    <button className="text-sm text-emerald-600 hover:text-emerald-800 font-medium">
                      Enquire →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">How It Works</h2>
          <p className="text-gray-600 mb-12">Find your dream property in 3 simple steps</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Start a Chat', desc: 'Talk to Sade, our AI property concierge. She will understand exactly what you need.', icon: '💬' },
              { step: '2', title: 'Get Matched', desc: 'Our system matches you with properties that fit your budget, location, and preferences.', icon: '🎯' },
              { step: '3', title: 'Close the Deal', desc: 'Our expert agents reach out to help you finalize your dream property purchase.', icon: '🤝' },
            ].map(item => (
              <div key={item.step} className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xl mb-4 mx-auto">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-emerald-600 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your Dream Property?</h2>
          <p className="text-emerald-100 mb-8">Join thousands of Nigerians who found their perfect home through Sales Wizard.</p>
          <button
            onClick={() => { const btn = document.querySelector('[aria-label="Open chat"]') as HTMLButtonElement; btn?.click(); }}
            className="px-8 py-4 bg-white text-emerald-600 font-bold rounded-2xl hover:bg-emerald-50 transition-colors shadow-lg"
          >
            Start Your Property Search →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-gray-400 text-center text-sm">
        <p>© 2025 Sales Wizard. Helping Nigerians find their dream properties.</p>
      </footer>

      <ChatWidget />
    </main>
  )
}
