'use client'

import React from 'react'
import Link from 'next/link'

const HeroSection = () => {
  const experts = [
    { name: "Elisa Song", role: "Doctor", image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face" },
    { name: "Sam Feldt", role: "Musician", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face" },
    { name: "Brendon Burchard", role: "Coach", question: "How do I open my mind to people?", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face" },
    { name: "Hadar Shemesh", role: "Coach", image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face" },
    { name: "Keith Rabois", role: "Investor", image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face" },
  ]

  return (
    <section className="relative pt-24 pb-16 bg-gradient-to-br from-slate-50 via-white to-blue-50 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-400/10 to-cyan-400/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 mb-6 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-full border border-indigo-200 animate-fade-in">
            <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2 animate-pulse"></span>
            AI-Powered Voice Assistant
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-6 leading-tight animate-slide-up">
            Your Living Profile
          </h1>
          
          {/* Subheading */}
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed animate-slide-up" style={{animationDelay: '0.2s'}}>
            Always-on, conversational, and evolving. Answer questions, qualify leads, and connect 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 font-semibold"> 24/7 in your voice</span>.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-slide-up" style={{animationDelay: '0.4s'}}>
            <Link 
              href="#" 
              className="group relative inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25"
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-300"></span>
              <span className="relative flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Create My Dilan AI
              </span>
            </Link>
            <Link 
              href="#" 
              className="group inline-flex items-center px-8 py-4 text-lg font-semibold text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-white hover:border-gray-300 hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <svg className="w-5 h-5 mr-2 text-gray-500 group-hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Explore Experts
            </Link>
          </div>
        </div>

        {/* Expert Profiles Carousel */}
        <div className="relative overflow-hidden">
          {/* Gradient Fade Edges */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-50 to-transparent z-10"></div>
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-blue-50 to-transparent z-10"></div>
          
          <div className="flex animate-scroll space-x-6 pb-4">
            {/* Duplicate the experts array for seamless loop */}
            {[...experts, ...experts].map((expert, index) => (
              <div 
                key={index}
                className="group flex-shrink-0 relative rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 w-72 h-96 transform hover:scale-105"
              >
                {/* Profile Image */}
                <img 
                  src={expert.image} 
                  alt={expert.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                
                {/* Animated Border */}
                <div className="absolute inset-0 rounded-3xl border-2 border-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{padding: '2px'}}>
                  <div className="w-full h-full rounded-3xl bg-black"></div>
                </div>
                
                {/* Gradient Overlay */}
                <div className={`absolute inset-0 ${
                  index % 5 === 0 ? 'bg-gradient-to-t from-pink-600/90 via-pink-500/50 to-transparent' : 
                  index % 5 === 1 ? 'bg-gradient-to-t from-orange-600/90 via-orange-500/50 to-transparent' :
                  index % 5 === 2 ? 'bg-gradient-to-t from-blue-600/90 via-blue-500/50 to-transparent' :
                  index % 5 === 3 ? 'bg-gradient-to-t from-amber-600/90 via-amber-500/50 to-transparent' :
                  'bg-gradient-to-t from-purple-600/90 via-purple-500/50 to-transparent'
                }`}>
                  {/* Floating Elements */}
                  <div className="absolute top-4 right-4 w-3 h-3 bg-white/30 rounded-full animate-pulse"></div>
                  <div className="absolute top-8 right-8 w-2 h-2 bg-white/20 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                  
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <div className="transform transition-transform duration-300 group-hover:translate-y-[-4px]">
                      <h3 className="font-bold text-xl mb-2 drop-shadow-lg">{expert.name}</h3>
                      <div className="flex items-center mb-4">
                        <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                        <p className="text-sm opacity-90 font-medium">{expert.role}</p>
                      </div>
                      {expert.question && (
                        <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 text-sm border border-white/30 transform transition-all duration-300 hover:bg-white/30">
                          <div className="flex items-start">
                            <span className="text-lg mr-2">💬</span>
                            <span className="leading-relaxed">{expert.question}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Library of Minds Banner */}
        <div className="mt-20 text-center animate-fade-in" style={{animationDelay: '0.8s'}}>
          <div className="group relative inline-flex items-center px-6 py-3 text-sm font-medium text-gray-700 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200 shadow-lg hover:shadow-xl hover:bg-white transition-all duration-300 transform hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 to-pink-400/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative flex items-center">
              <span className="text-lg mr-3 animate-bounce">📚</span>
              <span>Announcing </span>
              <Link href="#" className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 mx-2 font-semibold transition-all duration-300">
                The Library of Minds
              </Link>
              <span> – the first interactive podcast</span>
              <svg className="w-4 h-4 ml-2 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
