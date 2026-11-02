// 데이터 저장소 — Supabase 가 있으면 원격, 없으면 기기 로컬(Preferences)
import type { Itinerary, Trip, TripParams } from './itinerary'
import { loadJson, saveJson } from './storage'
import { ensureSession, getSupabase } from './supabase'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface TripRepo {
  listTrips(): Promise<Trip[]>
  getTrip(id: string): Promise<Trip | null>
  createTrip(params: TripParams): Promise<Trip>
  saveItinerary(tripId: string, itinerary: Itinerary): Promise<void>
  deleteTrip(id: string): Promise<void>
  listMessages(tripId: string): Promise<ChatMessage[]>
  addMessage(tripId: string, msg: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<ChatMessage>
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const TRIPS_KEY = 'trips'
const msgKey = (tripId: string) => `msgs:${tripId}`

/** 로컬 저장소 구현 (오프라인·데모) */
class LocalRepo implements TripRepo {
  async listTrips() {
    const trips = await loadJson<Trip[]>(TRIPS_KEY, [])
    return trips.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
  async getTrip(id: string) {
    return (await this.listTrips()).find((t) => t.id === id) ?? null
  }
  async createTrip(params: TripParams) {
    const now = new Date().toISOString()
    const trip: Trip = { id: uid(), params, createdAt: now, updatedAt: now }
    const trips = await loadJson<Trip[]>(TRIPS_KEY, [])
    trips.push(trip)
    await saveJson(TRIPS_KEY, trips)
    return trip
  }
  async saveItinerary(tripId: string, itinerary: Itinerary) {
    const trips = await loadJson<Trip[]>(TRIPS_KEY, [])
    const t = trips.find((x) => x.id === tripId)
    if (!t) return
    t.itinerary = itinerary
    t.updatedAt = new Date().toISOString()
    await saveJson(TRIPS_KEY, trips)
  }
  async deleteTrip(id: string) {
    const trips = await loadJson<Trip[]>(TRIPS_KEY, [])
    await saveJson(TRIPS_KEY, trips.filter((t) => t.id !== id))
  }
  async listMessages(tripId: string) {
    return loadJson<ChatMessage[]>(msgKey(tripId), [])
  }
  async addMessage(tripId: string, msg: Omit<ChatMessage, 'id' | 'createdAt'>) {
    const list = await loadJson<ChatMessage[]>(msgKey(tripId), [])
    const full: ChatMessage = { id: uid(), createdAt: new Date().toISOString(), ...msg }
    list.push(full)
    await saveJson(msgKey(tripId), list.slice(-100))
    return full
  }
}

interface TripRow {
  id: string
  params: TripParams
  created_at: string
  updated_at: string
  itineraries?: { data: Itinerary }[] | null
}

/** Supabase 구현 — RLS 로 본인 데이터만 접근 */
class SupabaseRepo implements TripRepo {
  private sb() {
    const sb = getSupabase()
    if (!sb) throw new Error('Supabase not configured')
    return sb
  }
  private toTrip(r: TripRow): Trip {
    return {
      id: r.id,
      params: r.params,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      itinerary: r.itineraries?.[0]?.data,
    }
  }
  async listTrips() {
    await ensureSession()
    const { data, error } = await this.sb().from('trips').select('*, itineraries(data)').order('updated_at', { ascending: false })
    if (error) throw error
    return (data as TripRow[]).map((r) => this.toTrip(r))
  }
  async getTrip(id: string) {
    await ensureSession()
    const { data, error } = await this.sb().from('trips').select('*, itineraries(data)').eq('id', id).maybeSingle()
    if (error) throw error
    return data ? this.toTrip(data as TripRow) : null
  }
  async createTrip(params: TripParams) {
    const userId = await ensureSession()
    const { data, error } = await this.sb().from('trips').insert({ user_id: userId, params }).select('*').single()
    if (error) throw error
    return this.toTrip(data as TripRow)
  }
  async saveItinerary(tripId: string, itinerary: Itinerary) {
    const userId = await ensureSession()
    const { error } = await this.sb().from('itineraries').upsert({ trip_id: tripId, user_id: userId, data: itinerary }, { onConflict: 'trip_id' })
    if (error) throw error
    await this.sb().from('trips').update({ updated_at: new Date().toISOString() }).eq('id', tripId)
  }
  async deleteTrip(id: string) {
    const { error } = await this.sb().from('trips').delete().eq('id', id)
    if (error) throw error
  }
  async listMessages(tripId: string) {
    const { data, error } = await this.sb()
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true })
      .limit(100)
    if (error) throw error
    return (data as { id: string; role: 'user' | 'assistant'; content: string; created_at: string }[]).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
    }))
  }
  async addMessage(tripId: string, msg: Omit<ChatMessage, 'id' | 'createdAt'>) {
    const userId = await ensureSession()
    const { data, error } = await this.sb()
      .from('chat_messages')
      .insert({ trip_id: tripId, user_id: userId, role: msg.role, content: msg.content })
      .select('id, role, content, created_at')
      .single()
    if (error) throw error
    return { id: data.id, role: data.role, content: data.content, createdAt: data.created_at }
  }
}

let repo: TripRepo | null = null

export function getRepo(): TripRepo {
  if (!repo) repo = getSupabase() ? new SupabaseRepo() : new LocalRepo()
  return repo
}
