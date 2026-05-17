"use client"
import { useEffect, useRef } from "react"

export default function CursorGlow() {
  const glowRef = useRef(null)

  useEffect(() => {
    const move = (e) => {
      const x = e.clientX
      const y = e.clientY
      glowRef.current.style.transform =
        `translate(${x - 150}px, ${y - 150}px)`
    }

    window.addEventListener("mousemove", move)
    return () => window.removeEventListener("mousemove", move)
  }, [])

  return <div ref={glowRef} className="cursor-glow"/>
}
