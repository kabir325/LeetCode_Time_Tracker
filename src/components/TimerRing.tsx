import cls from './timerRing.module.css'

export function TimerRing({
  progress,
  sizePx,
  strokePx,
  danger,
}: {
  progress: number
  sizePx: number
  strokePx: number
  danger?: boolean
}) {
  const size = Math.max(80, Math.round(sizePx))
  const stroke = Math.max(4, Math.round(strokePx))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.min(1, Math.max(0, progress))
  const dash = c * clamped
  const gap = c - dash

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={danger ? cls.danger : cls.base}
    >
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle
          className={cls.track}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className={cls.progress}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${gap}`}
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}

