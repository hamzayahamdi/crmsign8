"use client"

import React, { useEffect, useRef } from 'react'

interface ConversionCelebrationProps {
  show: boolean
}

/**
 * Lightweight confetti-only celebration component
 * No modal, just beautiful confetti animation
 */
export function ConversionCelebration({ show }: ConversionCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const confettiFired = useRef(false)

  // Fire confetti immediately when show becomes true
  useEffect(() => {
    if (show && !confettiFired.current) {
      confettiFired.current = true
      
      // Import and fire confetti immediately
      import('canvas-confetti').then((confettiModule) => {
        const confetti = confettiModule.default
        
        // Use default confetti (no canvas needed for global confetti)
        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4']

        // Main burst from center
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: colors,
        })

        // Side bursts for more celebration
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors,
          })
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors,
          })
        }, 250)

        // Final burst
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.5 },
            colors: colors,
          })
        }, 500)
      })
    }
    
    // Reset when hidden
    if (!show) {
      confettiFired.current = false
    }
  }, [show])

  // No UI, just confetti
  return null
}

