"use client"

import { motion, Variants } from "motion/react"

/**
 * LoadingJumpingDots
 * A loading indicator with three jumping dots animation
 * Adapted for the chatbot to show while waiting for AI response
 */
export function LoadingJumpingDots() {
  const dotVariants: Variants = {
    jump: {
      y: -30,
      transition: {
        duration: 0.8,
        repeat: Infinity,
        repeatType: "mirror",
        ease: "easeInOut",
      },
    },
  }

  return (
    <motion.div
      animate="jump"
      transition={{ staggerChildren: -0.2, staggerDirection: -1 }}
      className="flex justify-center items-center gap-1.5"
    >
      <motion.div
        className="w-2 h-2 rounded-full will-change-transform"
        style={{ backgroundColor: '#063EF8' }}
        variants={dotVariants}
      />
      <motion.div
        className="w-2 h-2 rounded-full will-change-transform"
        style={{ backgroundColor: '#063EF8' }}
        variants={dotVariants}
      />
      <motion.div
        className="w-2 h-2 rounded-full will-change-transform"
        style={{ backgroundColor: '#063EF8' }}
        variants={dotVariants}
      />
    </motion.div>
  )
}

