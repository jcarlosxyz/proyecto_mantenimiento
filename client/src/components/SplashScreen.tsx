import { useEffect, useRef, useState } from 'react'

interface SplashScreenProps {
  onFinish: () => void
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter')

  /* ── Partículas de fondo en canvas ─────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    const particles: { x:number; y:number; r:number; vx:number; vy:number; alpha:number; color:string }[] = []
    const colors = ['#f59e0b', '#fbbf24', '#3b82f6', '#60a5fa', '#ffffff']

    for (let i = 0; i < 140; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2.8 + 0.5,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        alpha: Math.random() * 0.6 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }

    let animId: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.alpha
        ctx.fill()
      })
      ctx.globalAlpha = 1
      animId = requestAnimationFrame(draw)
    }
    draw()

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  /* ── Secuencia de fases — 14.8s total ─────────────────── */
  useEffect(() => {
    // enter → hold  a los 3.2s
    // hold  → exit  a los 11.2s
    // exit  → done  a los 14.8s
    const t1 = setTimeout(() => setPhase('hold'), 3_200)
    const t2 = setTimeout(() => setPhase('exit'), 11_200)
    const t3 = setTimeout(() => onFinish(),        14_800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onFinish])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'radial-gradient(ellipse at 50% 40%, #0f1a2e 0%, #070d1a 60%, #000 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      opacity: phase === 'exit' ? 0 : 1,
      transition: phase === 'exit' ? 'opacity 3600ms cubic-bezier(0.4,0,0.2,1)' : 'none',
    }}>

      {/* Canvas partículas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      {/* Aura de luz central — escala con el logo */}
      <div style={{
        position: 'absolute',
        width: '900px', height: '900px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,158,11,0.14) 0%, rgba(59,130,246,0.07) 40%, transparent 70%)',
        animation: 'splashPulse 3s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Anillos orbitales */}
      <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', border: '1px solid rgba(245,158,11,0.12)', animation: 'splashOrbit 10s linear infinite' }} />
      <div style={{ position: 'absolute', width: 850, height: 850, borderRadius: '50%', border: '1px solid rgba(59,130,246,0.08)', animation: 'splashOrbit 15s linear infinite reverse' }} />

      {/* Contenedor principal del logo */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px',
        transform: phase === 'enter' ? 'scale(0.5) translateY(40px)' : phase === 'exit' ? 'scale(1.04) translateY(-12px)' : 'scale(1) translateY(0)',
        opacity: phase === 'enter' ? 0 : 1,
        transition: phase === 'enter'
          ? 'transform 2800ms cubic-bezier(0.34,1.56,0.64,1), opacity 2000ms ease'
          : phase === 'exit'
          ? 'transform 3600ms ease, opacity 3600ms ease'
          : 'none',
      }}>

        {/* Logo con efectos */}
        <div style={{ position: 'relative' }}>
          {/* Sombra de luz exterior */}
          <div style={{
            position: 'absolute', inset: -35,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245,158,11,0.28) 0%, transparent 70%)',
            animation: 'splashGlow 2.2s ease-in-out infinite alternate',
            filter: 'blur(14px)',
          }} />

          {/* Marco decorativo exterior */}
          <div style={{
            position: 'absolute', inset: -10,
            borderRadius: '34px',
            border: '2px solid rgba(245,158,11,0.35)',
            boxShadow: '0 0 60px rgba(245,158,11,0.2), inset 0 0 30px rgba(245,158,11,0.05)',
            animation: 'splashGlow 2.5s ease-in-out infinite alternate',
          }} />

          {/* Segundo marco más sutil */}
          <div style={{
            position: 'absolute', inset: -22,
            borderRadius: '42px',
            border: '1px solid rgba(59,130,246,0.2)',
            animation: 'splashGlow 3s ease-in-out infinite alternate-reverse',
          }} />

          {/* Logo — 3x más grande: 200 → 600px */}
          <img
            src="/logo_inicio.jpg"
            alt="CMMS Logo"
            style={{
              width: 600,
              height: 600,
              borderRadius: 28,
              objectFit: 'cover',
              display: 'block',
              position: 'relative',
              zIndex: 1,
              boxShadow: '0 30px 80px rgba(0,0,0,0.85), 0 0 50px rgba(245,158,11,0.18)',
            }}
          />
        </div>

        {/* Textos */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '15px',
            fontWeight: 700,
            letterSpacing: '6px',
            textTransform: 'uppercase',
            color: '#f59e0b',
            marginBottom: '8px',
            opacity: phase === 'hold' ? 1 : 0,
            transform: phase === 'hold' ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 600ms ease 300ms',
          }}>
            Sistema de Gestión
          </div>
          <div style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            opacity: phase === 'hold' ? 1 : 0,
            transform: phase === 'hold' ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 600ms ease 500ms',
          }}>
            Mantenimiento Industrial
          </div>
        </div>

        {/* Barra de carga */}
        <div style={{
          width: 260,
          opacity: phase === 'hold' ? 1 : 0,
          transition: 'opacity 500ms ease 600ms',
        }}>
          <div style={{
            height: '3px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '99px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #f59e0b, #fbbf24, #3b82f6)',
              borderRadius: '99px',
              /* dura 4s = tiempo hold (5.6 - 1.6 = 4s) */
              animation: 'splashLoad 8s ease forwards',
              boxShadow: '0 0 12px rgba(245,158,11,0.9)',
            }} />
          </div>
          <div style={{
            textAlign: 'center',
            marginTop: '10px',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '2.5px',
          }}>
            CARGANDO...
          </div>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes splashPulse {
          0%, 100% { transform: scale(1);    opacity: 0.7; }
          50%       { transform: scale(1.12); opacity: 1;   }
        }
        @keyframes splashOrbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes splashGlow {
          from { opacity: 0.4; }
          to   { opacity: 1;   }
        }
        @keyframes splashLoad {
          from { width: 0%;   }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  )
}
