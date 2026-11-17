// 여행 한 건 불러오기 — 도구 화면들이 함께 쓴다
import { useEffect, useState } from 'react'
import type { Trip } from './itinerary'
import { getRepo } from './repo'

export function useTrip(id: string | undefined): [Trip | null | undefined, (t: Trip) => void] {
  const [trip, setTrip] = useState<Trip | null | undefined>(undefined)
  useEffect(() => {
    if (!id) return
    let alive = true
    getRepo()
      .getTrip(id)
      .then((t) => alive && setTrip(t))
      .catch(() => alive && setTrip(null))
    return () => {
      alive = false
    }
  }, [id])
  return [trip, setTrip]
}
