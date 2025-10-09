'use client'

import React from 'react'

const FeaturesSection = () => {
  const features = [
    {
      title: "Never Repeat Yourself Again",
      description: "Your Dilan AI answers the questions you've already answered, so you don't have to. That means less repetition, more impact, and time back for what matters most.",
      icon: "🔄"
    },
    {
      title: "Keep Every Relationship Alive",
      description: "Never ghost anyone again. With Dilan AI, you can recognize loyal fans, follow up with intent, and make sure the right people always feel heard.",
      icon: "💬"
    },
    {
      title: "Future-Proof Your Knowledge",
      description: "Instantly turn text, audio, or video into a living Digital Mind. It learns continuously, evolves with you, and mirrors your latest insights.",
      icon: "🧠"
    },
    {
      title: "Catch Signals Before They Slip Away",
      description: "Opportunities slip by when you can't see them. Dilan AI makes sure you don't. It reveals rising trends, hidden signals, and the exact moments worth acting on.",
      icon: "📡"
    },
    {
      title: "Not a Link in Bio. An Interactive Profile.",
      description: "Turn every visit into a conversation, and every conversation into an opportunity. Capture leads, share products, and guide people to what matters most.",
      icon: "🔗"
    }
  ]

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            Never miss a connection.
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            You, Everywhere
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-black mb-4">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Multi-Platform Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
            Any Time. Any Medium. Any Language.
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Your Dilan AI works across your website, app, SMS, WhatsApp, Slack and more.
          </p>
          
          {/* Platform Demo */}
          <div className="bg-white rounded-2xl p-8 shadow-lg max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 items-center">
              <div className="space-y-4">
                <div className="bg-gray-100 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Question:</p>
                  <p className="font-medium">What storytelling principles can I use when pitching my hard tech idea?</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600 mb-2">Answer:</p>
                  <p className="text-sm">Show the transformation your hard tech enables with vivid, human-centered examples, and craft a concise, repeatable four-word story that captures your idea's essence</p>
                </div>
              </div>
              
              <div className="flex justify-center">
                <div className="text-6xl">📱</div>
              </div>
              
              <div className="space-y-2 text-center">
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm inline-block">Web</div>
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm inline-block">Phone</div>
                <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm inline-block">SMS</div>
                <p className="text-xs text-gray-500 mt-2">Powered by Dilan AI</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Section */}
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-12">
            Trust is Yours.
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="text-3xl mb-4">🛡️</div>
              <h3 className="font-semibold text-black mb-2">Built to protect your legacy</h3>
              <p className="text-sm text-gray-600">Your Dilan AI maintains integrity over time. Your authenticity stays intact, trusted by your audience now—and forever.</p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="text-3xl mb-4">🔒</div>
              <h3 className="font-semibold text-black mb-2">Privacy first, always</h3>
              <p className="text-sm text-gray-600">We uphold strict privacy standards. Dilan AI keeps your conversations private and your audience protected.</p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="text-3xl mb-4">👑</div>
              <h3 className="font-semibold text-black mb-2">Complete ownership</h3>
              <p className="text-sm text-gray-600">We believe your mind is your most precious asset. It's securely stored, fully encrypted, and never shared or sold.</p>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="font-semibold text-black mb-2">You're in control</h3>
              <p className="text-sm text-gray-600">Your Digital Mind speaks only your words. Dilan AI never improvises without your consent.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default FeaturesSection
