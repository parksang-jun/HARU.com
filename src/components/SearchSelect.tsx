// 검색형 선택기 — 버튼을 누르면 검색창 + 목록 패널이 열림 (공항·여행지 선택)
import { useEffect, useMemo, useRef, useState } from 'react'

export interface SelectItem {
  value: string
  label: string
  sub?: string
  group?: string
}

interface Props {
  label: string
  value: string | null
  display: string
  placeholder: string
  searchPlaceholder: string
  emptyText: string
  search: (q: string) => SelectItem[]
  onChange: (value: string) => void
  testId?: string
}

export function SearchSelect({ label, value, display, placeholder, searchPlaceholder, emptyText, search, onChange, testId }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  // 전체 목록을 스크롤로 볼 수 있게 자르지 않는다. 묶음(나라)이 있으면 처음 나온 순서대로 모아서 보여 준다
  const items = useMemo(() => {
    if (!open) return []
    const list = search(q)
    const order: string[] = []
    for (const it of list) if (!order.includes(it.group ?? '')) order.push(it.group ?? '')
    return order.flatMap((g) => list.filter((it) => (it.group ?? '') === g))
  }, [open, q, search])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <button type="button" className={`picker-btn${value ? '' : ' is-empty'}`} onClick={() => setOpen((v) => !v)} aria-expanded={open} data-testid={testId}>
        {value ? display : placeholder}
      </button>
      {open && (
        <div className="picker" role="dialog" aria-label={label}>
          <input
            ref={inputRef}
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            data-testid={testId ? `${testId}-search` : undefined}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false)
              if (e.key === 'Enter' && items[0]) {
                onChange(items[0].value)
                setOpen(false)
                setQ('')
              }
            }}
          />
          <ul className="picker__list" role="listbox">
            {items.length === 0 && <li className="picker__empty">{emptyText}</li>}
            {items.map((it, i) => (
              <li key={it.value}>
                {it.group && it.group !== items[i - 1]?.group && (
                  <div className="picker__group" data-testid="picker-group">
                    {it.group}
                  </div>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={it.value === value}
                  className={`picker__item${it.value === value ? ' is-on' : ''}`}
                  onClick={() => {
                    onChange(it.value)
                    setOpen(false)
                    setQ('')
                  }}
                  data-testid={testId ? `${testId}-opt-${it.value}` : undefined}
                >
                  <span>{it.label}</span>
                  {it.sub && <span className="xs muted">{it.sub}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
