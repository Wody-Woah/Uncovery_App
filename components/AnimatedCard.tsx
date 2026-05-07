'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export default function AnimatedCard({
  delay = 0,
  children,
}: {
  delay?: number
  children: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
