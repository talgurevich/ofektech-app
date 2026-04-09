"use client";

import { motion } from "framer-motion";

export function LoadingScreen() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <motion.img
        src="/logo-icon.png"
        alt="טוען..."
        className="size-20 object-contain"
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 360],
          opacity: [0.4, 1, 0.4],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
