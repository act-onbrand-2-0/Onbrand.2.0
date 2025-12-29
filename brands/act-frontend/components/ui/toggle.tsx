"use client"

import { useState } from "react";
import { motion } from "motion/react";

interface ToggleProps {
  isOn?: boolean;
  onChange?: (isOn: boolean) => void;
  size?: "sm" | "md" | "lg";
  transitionDuration?: number;
}

export default function Toggle({
  isOn = false,
  onChange,
  size = "md",
  transitionDuration = 0.2
}: ToggleProps) {
  const [isToggled, setIsToggled] = useState(isOn);

  const handleToggle = () => {
    const newState = !isToggled;
    setIsToggled(newState);
    if (onChange) onChange(newState);
  };

  // Size mappings
  const sizes = {
    sm: { width: 36, height: 20, circle: 16 },
    md: { width: 48, height: 24, circle: 20 },
    lg: { width: 60, height: 30, circle: 26 }
  };

  const { width, height, circle } = sizes[size] || sizes.md;
  const padding = (height - circle) / 2;

  return (
    <div className="flex items-center">
      <motion.div
        className="relative cursor-pointer rounded-full"
        style={{
          width: width,
          height: height,
          backgroundColor: isToggled ? "#889def" : "#d1d5db",
          padding: padding
        }}
        animate={{ backgroundColor: isToggled ? "#889def" : "#d1d5db" }}
        transition={{ duration: transitionDuration }}
        onClick={handleToggle}
      >
        <motion.div
          className="absolute rounded-full bg-white shadow-md"
          style={{
            width: circle,
            height: circle,
            top: padding,
            left: padding
          }}
          animate={{
            left: isToggled ? width - circle - padding : padding
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
            duration: transitionDuration
          }}
        />
      </motion.div>
    </div>
  );
}

