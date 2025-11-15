import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="flex flex-col">
      
      {/* HERO SECTION */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl -z-10 opacity-30"></div>
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-600/10 rounded-full blur-3xl -z-10 opacity-20"></div>

        <div className="max-w-7xl mx-auto px-6 text-center z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            v2.0 is now live
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight tracking-tight">
            Code together,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              in real-time.
            </span>
          </h1>
          
          <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            The lightweight, browser-based IDE for technical interviews and remote pair programming. 
            Zero setup. minimal latency.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0D1117] text-lg font-bold transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:scale-105"
            >
              Start Coding Free
            </Link>
            <Link 
              to="/demo"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-lg font-medium border border-gray-700 transition-all hover:scale-105"
            >
              Live Demo
            </Link>
          </div>
          
          {/* Mockup Image / Code Preview */}
          <div className="mt-20 relative mx-auto max-w-5xl">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl blur opacity-20"></div>
            <div className="relative bg-[#0D1117] rounded-xl border border-gray-800 shadow-2xl overflow-hidden">
              <div className="h-8 bg-[#161B22] border-b border-gray-800 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
              </div>
              <div className="p-6 font-mono text-sm text-left overflow-hidden">
                <div className="text-gray-400"><span className="text-purple-400">const</span> <span className="text-blue-400">codeMint</span> = <span className="text-emerald-400">"Future of Coding"</span>;</div>
                <div className="text-gray-400 mt-2"><span className="text-purple-400">function</span> <span className="text-yellow-200">sync</span>() {'{'}</div>
                <div className="text-gray-400 ml-4">socket.<span className="text-blue-400">emit</span>(<span className="text-emerald-400">'join'</span>, user);</div>
                <div className="text-gray-400 ml-4"><span className="text-gray-500">// Latency: 12ms</span></div>
                <div className="text-gray-400">{'}'}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="py-24 bg-[#0D1117] relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Real-time Sync",
                desc: "Operational transformation ensures code stays consistent even on shaky connections.",
                icon: <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              },
              {
                title: "Integrated Chat",
                desc: "Discuss solutions without context switching. Built-in voice and text channels.",
                icon: <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              },
              {
                title: "Multi-language",
                desc: "Support for Python, JavaScript, C++, and Java with intelligent syntax highlighting.",
                icon: <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
              }
            ].map((feature, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-[#161B22] border border-gray-800 hover:border-gray-700 transition-all group">
                <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;