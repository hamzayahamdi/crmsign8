import React from 'react'
import Image from 'next/image'

interface Signature8LogoProps {
  className?: string
  size?: number
}

export function Signature8Logo({ className = '', size = 48 }: Signature8LogoProps) {
  return (
    <div 
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Static gradient background glow */}
      <div 
        className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/40 via-purple-500/30 to-blue-500/40 blur-xl"
        style={{ 
          width: size * 1.3, 
          height: size * 1.3,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      />
      
      {/* Main logo with enhanced effects */}
      <div className="relative z-10">
        <Image
          src="/infnite-logo.png"
          alt="Signature8 Logo"
          width={size}
          height={size}
          className="drop-shadow-2xl brightness-110 contrast-125 saturate-150"
          style={{
            filter: 'drop-shadow(0 0 10px rgba(139, 92, 246, 0.6)) drop-shadow(0 0 20px rgba(99, 102, 241, 0.4))'
          }}
          priority
        />
      </div>
    </div>
  )
}

// Compact version for smaller spaces
export function Signature8LogoCompact({ className = '', size = 32 }: Signature8LogoProps) {
  return (
    <div 
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Static subtle glow for compact version */}
      <div 
        className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-blue-500/30 blur-lg"
        style={{ 
          width: size * 1.2, 
          height: size * 1.2,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      />
      
      {/* Compact logo */}
      <div className="relative z-10">
        <Image
          src="/infnite-logo.png"
          alt="Signature8"
          width={size}
          height={size}
          className="drop-shadow-lg brightness-110 contrast-115 saturate-125"
          style={{
            filter: 'drop-shadow(0 0 6px rgba(139, 92, 246, 0.5))'
          }}
        />
      </div>
    </div>
  )
}
