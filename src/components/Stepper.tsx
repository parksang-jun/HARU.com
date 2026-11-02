// 숫자 증감 컨트롤 (인원·객실)
interface Props {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  testId?: string
}

export function Stepper({ label, value, min, max, onChange, testId }: Props) {
  return (
    <div className="stepper" data-testid={testId}>
      <span className="small">{label}</span>
      <div className="stepper__ctl">
        <button type="button" className="stepper__btn" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`${label} −`}>
          −
        </button>
        <span className="stepper__val">{value}</span>
        <button type="button" className="stepper__btn" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`${label} +`}>
          +
        </button>
      </div>
    </div>
  )
}
