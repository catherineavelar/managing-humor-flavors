'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type Tab = 'welcome' | 'flavors' | 'new-flavor' | 'captions'
type FlavorTab = 'steps' | 'reorder' | 'test'

interface Flavor {
  id: number
  description: string
  slug: string
  is_pinned: boolean
}

interface Step {
  id: number
  humor_flavor_id: number
  order_by: number
  llm_system_prompt: string
  llm_user_prompt: string
  description: string | null
  llm_temperature: number
  llm_input_type_id: number
  llm_output_type_id: number
  llm_model_id: number
  humor_flavor_step_type_id: number
}

interface Caption {
  id: string
  content: string
  created_datetime_utc: string
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('welcome')
  const [flavors, setFlavors] = useState<Flavor[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedFlavor, setSelectedFlavor] = useState<Flavor | null>(null)
  const [flavorTab, setFlavorTab] = useState<FlavorTab>('steps')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'az' | 'za'>('recent')

  // Reorder
  const [reorderSteps, setReorderSteps] = useState<Step[]>([])
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [savingReorder, setSavingReorder] = useState(false)
  const [reorderSuccess, setReorderSuccess] = useState(false)

  // New flavor form
  const [newDesc, setNewDesc] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  // Steps
  const [steps, setSteps] = useState<Step[]>([])
  const [stepsLoading, setStepsLoading] = useState(false)
  const [showNewStep, setShowNewStep] = useState(false)
  const [newStep, setNewStep] = useState({ llm_system_prompt: '', llm_user_prompt: '', description: '', llm_temperature: 0.7, llm_input_type_id: 1, llm_output_type_id: 2, llm_model_id: 1, humor_flavor_step_type_id: 1 })
  const [savingStep, setSavingStep] = useState(false)
  const [editingStep, setEditingStep] = useState<number | null>(null)
  const [editStepForm, setEditStepForm] = useState<Partial<Step>>({})
  const [deletingStep, setDeletingStep] = useState<number | null>(null)

  // Edit flavor
  const [editingFlavor, setEditingFlavor] = useState(false)
  const [editDesc, setEditDesc] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [savingFlavor, setSavingFlavor] = useState(false)
  const [deletingFlavor, setDeletingFlavor] = useState(false)

  // Captions tab
  const [captionsLoading, setCaptionsLoading] = useState(false)
  const [captionsFlavor, setCaptionsFlavor] = useState<Flavor | null>(null)
  const [flavorCaptions, setFlavorCaptions] = useState<Caption[]>([])
  const [captionsError, setCaptionsError] = useState('')
  const [captionCounts, setCaptionCounts] = useState<Record<number, number>>({})
  const [captionsFilter, setCaptionsFilter] = useState<'all' | 'has-captions'>('all')
  const [captionsSort, setCaptionsSort] = useState<'most' | 'az' | 'za'>('most')

  // Caption testing
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [captions, setCaptions] = useState<Caption[]>([])
  const [generating, setGenerating] = useState(false)
  const [captionError, setCaptionError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Theme
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system'
    setTheme(saved)
  }, [])

  function applyTheme(t: 'light' | 'dark' | 'system') {
    setTheme(t)
    localStorage.setItem('theme', t)
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (t === 'dark' || (t === 'system' && prefersDark)) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  useEffect(() => {
    if (activeTab === 'flavors' || activeTab === 'captions') fetchFlavors()
  }, [activeTab])

  useEffect(() => {
    if (selectedFlavor) {
      fetchSteps(selectedFlavor.id)
      setCaptions([])
      setCaptionError('')
      setImageFile(null)
      setImagePreview(null)
      setFlavorTab('steps')
    }
  }, [selectedFlavor])

  useEffect(() => {
    if (flavorTab === 'reorder') {
      setReorderSteps([...steps])
      setReorderSuccess(false)
    }
  }, [flavorTab])

  async function fetchFlavors() {
    setLoading(true)
    const { data } = await supabase
        .from('humor_flavors')
        .select('id, description, slug, is_pinned')
        .order('description', { ascending: true })
    const flavorList = data || []
    setFlavors(flavorList)
    setLoading(false)
    // Fetch caption counts for each flavor
    if (flavorList.length > 0) {
      const counts: Record<number, number> = {}
      await Promise.all(flavorList.map(async (f: Flavor) => {
        const { count } = await supabase
            .from('captions')
            .select('id', { count: 'exact', head: true })
            .eq('humor_flavor_id', f.id)
        counts[f.id] = count || 0
      }))
      setCaptionCounts(counts)
    }
  }

  async function fetchSteps(flavorId: number) {
    setStepsLoading(true)
    const { data } = await supabase
        .from('humor_flavor_steps')
        .select('*')
        .eq('humor_flavor_id', flavorId)
        .order('order_by')
    setSteps(data || [])
    setStepsLoading(false)
  }

  async function fetchFlavorCaptions(flavorId: number) {
    setCaptionsLoading(true)
    setCaptionsError('')
    setFlavorCaptions([])
    const { data, error } = await supabase
        .from('captions')
        .select('id, content, created_datetime_utc')
        .eq('humor_flavor_id', flavorId)
        .order('created_datetime_utc', { ascending: false })
    if (error) setCaptionsError(error.message)
    else setFlavorCaptions(data || [])
    setCaptionsLoading(false)
  }

  function handleDescChange(val: string) {
    setNewDesc(val)
    setNewSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
  }

  async function createFlavor() {
    if (!newDesc.trim() || !newSlug.trim()) { setCreateError('Description and slug are required.'); return }
    setCreating(true); setCreateError(''); setCreateSuccess('')
    const { data, error } = await supabase
        .from('humor_flavors')
        .insert([{ description: newDesc.trim(), slug: newSlug.trim() }])
        .select()
    if (error) { setCreateError(error.message) }
    else { setCreateSuccess(`"${data[0].description}" created! Check All Flavors.`); setNewDesc(''); setNewSlug('') }
    setCreating(false)
  }

  async function saveFlavor() {
    if (!selectedFlavor) return
    setSavingFlavor(true)
    const { error } = await supabase
        .from('humor_flavors')
        .update({ description: editDesc, slug: editSlug })
        .eq('id', selectedFlavor.id)
    if (!error) {
      const updated = { ...selectedFlavor, description: editDesc, slug: editSlug }
      setSelectedFlavor(updated)
      setFlavors(flavors.map(f => f.id === selectedFlavor.id ? updated : f))
      setEditingFlavor(false)
    }
    setSavingFlavor(false)
  }

  async function deleteFlavor() {
    if (!selectedFlavor) return
    await supabase.from('humor_flavor_steps').delete().eq('humor_flavor_id', selectedFlavor.id)
    await supabase.from('humor_flavors').delete().eq('id', selectedFlavor.id)
    setFlavors(flavors.filter(f => f.id !== selectedFlavor.id))
    setSelectedFlavor(null)
    setDeletingFlavor(false)
  }

  async function addStep() {
    if (!selectedFlavor || !newStep.llm_system_prompt.trim() || !newStep.llm_user_prompt.trim()) return
    setSavingStep(true)
    const { data, error } = await supabase
        .from('humor_flavor_steps')
        .insert({ ...newStep, humor_flavor_id: selectedFlavor.id, order_by: steps.length + 1 })
        .select()
        .single()
    if (!error && data) {
      setSteps([...steps, data])
      setNewStep({ llm_system_prompt: '', llm_user_prompt: '', description: '', llm_temperature: 0.7, llm_input_type_id: 1, llm_output_type_id: 2, llm_model_id: 1, humor_flavor_step_type_id: 1 })
      setShowNewStep(false)
    }
    setSavingStep(false)
  }

  async function saveStep() {
    if (!editingStep) return
    setSavingStep(true)
    const { error } = await supabase
        .from('humor_flavor_steps')
        .update({
          llm_system_prompt: editStepForm.llm_system_prompt,
          llm_user_prompt: editStepForm.llm_user_prompt,
          description: editStepForm.description,
          llm_temperature: editStepForm.llm_temperature,
          llm_input_type_id: editStepForm.llm_input_type_id,
          llm_output_type_id: editStepForm.llm_output_type_id,
          llm_model_id: editStepForm.llm_model_id,
        })
        .eq('id', editingStep)
    if (!error) {
      setSteps(steps.map(s => s.id === editingStep ? { ...s, ...editStepForm } as Step : s))
      setEditingStep(null)
    }
    setSavingStep(false)
  }

  async function deleteStep(stepId: number) {
    await supabase.from('humor_flavor_steps').delete().eq('id', stepId)
    const remaining = steps.filter(s => s.id !== stepId).map((s, i) => ({ ...s, order_by: i + 1 }))
    setSteps(remaining)
    setDeletingStep(null)
    await Promise.all(remaining.map(s => supabase.from('humor_flavor_steps').update({ order_by: s.order_by }).eq('id', s.id)))
  }

  async function moveStep(stepId: number, dir: 'up' | 'down') {
    const idx = steps.findIndex(s => s.id === stepId)
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === steps.length - 1) return
    const arr = [...steps]
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    [arr[idx], arr[swap]] = [arr[swap], arr[idx]]
    const updated = arr.map((s, i) => ({ ...s, order_by: i + 1 }))
    setSteps(updated)
    await Promise.all(updated.map(s => supabase.from('humor_flavor_steps').update({ order_by: s.order_by }).eq('id', s.id)))
  }

  async function saveReorder() {
    setSavingReorder(true)
    const updated = reorderSteps.map((s, i) => ({ ...s, order_by: i + 1 }))
    await Promise.all(updated.map(s =>
        supabase.from('humor_flavor_steps').update({ order_by: s.order_by }).eq('id', s.id)
    ))
    setSteps(updated)
    setReorderSuccess(true)
    setSavingReorder(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setCaptions([])
    setCaptionError('')
  }

  async function generateCaptions() {
    if (!imageFile || !selectedFlavor) return
    setGenerating(true)
    setCaptionError('')
    setCaptions([])

    try {
      // Get JWT token
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Not authenticated')

      const BASE = 'https://api.almostcrackd.ai'
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

      // Step 1: Get presigned URL
      const presignRes = await fetch(`${BASE}/pipeline/generate-presigned-url`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ contentType: imageFile.type }),
      })
      if (!presignRes.ok) throw new Error(`Presign failed: ${presignRes.status}`)
      const { presignedUrl, cdnUrl } = await presignRes.json()

      // Step 2: Upload image to S3
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': imageFile.type },
        body: imageFile,
      })
      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`)

      // Step 3: Register image
      const registerRes = await fetch(`${BASE}/pipeline/upload-image-from-url`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false }),
      })
      if (!registerRes.ok) throw new Error(`Register failed: ${registerRes.status}`)
      const { imageId } = await registerRes.json()

      // Step 4: Generate captions with this flavor
      const captionRes = await fetch(`${BASE}/pipeline/generate-captions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ imageId, humorFlavorId: selectedFlavor.id }),
      })
      if (!captionRes.ok) throw new Error(`Caption generation failed: ${captionRes.status}`)
      const data = await captionRes.json()

      // Handle response — could be array or object
      const results: Caption[] = Array.isArray(data) ? data : data.captions || [data]
      setCaptions(results)
    } catch (e: any) {
      setCaptionError(e.message || 'Something went wrong')
    }

    setGenerating(false)
  }

  const inputCls = "border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-300"
  const labelCls = "text-xs font-medium text-gray-500 uppercase tracking-wide"

  const navItem = (tab: Tab, label: string) => (
      <button
          onClick={() => { setActiveTab(tab); setSelectedFlavor(null) }}
          className={`text-sm text-left px-3 py-2 rounded-lg transition ${activeTab === tab ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
      >
        {label}
      </button>
  )

  return (
      <div className="min-h-screen bg-white text-gray-900 flex flex-col">
        <nav className="border-b border-gray-200 dark:border-gray-800 px-8 py-4 flex items-center justify-between bg-white dark:bg-gray-900">
          <h1 className="text-lg font-medium text-gray-900 dark:text-white">🧪 Flavor Manager</h1>
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {(['light', 'system', 'dark'] as const).map((t) => (
                  <button
                      key={t}
                      onClick={() => applyTheme(t)}
                      title={t.charAt(0).toUpperCase() + t.slice(1)}
                      className={`px-2 py-1 rounded text-sm transition ${theme === t ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                  >
                    {t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '💻'}
                  </button>
              ))}
            </div>
            <button
                onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
                className="text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Sign out
            </button>
          </div>
        </nav>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-56 border-r border-gray-200 dark:border-gray-800 p-4 flex flex-col gap-1 shrink-0 bg-white dark:bg-gray-900">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-2">Menu</p>
            {navItem('welcome', '👋 Welcome')}
            {navItem('flavors', '🌶️ Explore Flavors')}
            {navItem('new-flavor', '✨ Create a Flavor')}
            {navItem('captions', '💬 Captions Created')}
          </div>

          {/* Main panel */}
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">

            {/* WELCOME */}
            {activeTab === 'welcome' && (
                <div className="p-10 max-w-2xl">
                  <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white leading-tight">Train your humor style.</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-base mb-10 leading-relaxed">
                    Flavor Manager lets you craft AI caption pipelines with distinct personalities, tones, and punchlines.<br/>
                    From absurdist memes to dry humor, every flavor creates a different comedic experience.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setActiveTab('flavors')}
                        className="border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-left transition-all duration-200 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 hover:-translate-y-1 hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800"
                    >
                      <p className="text-2xl mb-3">🌶️</p>
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">Explore Flavors</p>
                      <p className="text-xs text-gray-400 leading-relaxed">Browse, edit, and manage your existing prompt chains.</p>
                    </button>
                    <button
                        onClick={() => setActiveTab('new-flavor')}
                        className="border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-left transition-all duration-200 bg-gradient-to-br from-white to-purple-50 dark:from-gray-900 dark:to-purple-900/20 hover:-translate-y-1 hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800"
                    >
                      <p className="text-2xl mb-3">✨</p>
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">Create a Flavor</p>
                      <p className="text-xs text-gray-400 leading-relaxed">Build a new prompt chain from scratch and add steps to it.</p>
                    </button>
                    <button
                        onClick={() => setActiveTab('captions')}
                        className="border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-left transition-all duration-200 bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-900/20 hover:-translate-y-1 hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800"
                    >
                      <p className="text-2xl mb-3">💬</p>
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">Captions Created by Our Flavors</p>
                      <p className="text-xs text-gray-400 leading-relaxed">Read all captions generated by each flavor.</p>
                    </button>
                    <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800/50">
                      <p className="text-2xl mb-3">💡</p>
                      <p className="font-semibold text-gray-900 dark:text-white mb-2">How it works</p>
                      <ol className="text-xs text-gray-400 space-y-1.5 leading-relaxed">
                        <li>1. Create a flavor & give it a name</li>
                        <li>2. Add steps — each with a prompt</li>
                        <li>3. Test it by uploading an image</li>
                        <li>4. Read the generated captions</li>
                      </ol>
                    </div>
                  </div>
                </div>
            )}

            {/* ALL FLAVORS LIST */}
            {activeTab === 'flavors' && !selectedFlavor && (
                <div className="p-8">
                  {/* Search + Sort */}
                  <div className="flex items-center gap-3 mb-6 max-w-3xl">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                      <input
                          type="text"
                          placeholder="Search flavors..."
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 shrink-0">
                      <span>Sort by</span>
                      <select
                          value={sortBy}
                          onChange={e => setSortBy(e.target.value as 'recent' | 'az' | 'za')}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-300"
                      >
                        <option value="recent">Recently updated</option>
                        <option value="az">A-Z</option>
                        <option value="za">Z-A</option>
                      </select>
                    </div>
                  </div>

                  {loading ? (
                      <p className="text-gray-400 text-sm">Loading...</p>
                  ) : flavors.length === 0 ? (
                      <p className="text-gray-400 text-sm">No flavors yet. <button onClick={() => setActiveTab('new-flavor')} className="text-purple-600 hover:underline">Create one →</button></p>
                  ) : (
                      <div className="flex flex-col max-w-3xl divide-y divide-gray-100 dark:divide-gray-800">
                        {flavors
                            .filter(f => (f.description ?? '').toLowerCase().includes(search.toLowerCase()) || (f.slug ?? '').toLowerCase().includes(search.toLowerCase()))
                            .sort((a, b) => sortBy === 'az' ? (a.description ?? '').localeCompare(b.description ?? '') : sortBy === 'za' ? (b.description ?? '').localeCompare(a.description ?? '') : b.id - a.id)
                            .map(flavor => (
                                <div key={flavor.id} className="flex items-center justify-between py-4 gap-4">
                                  {/* Left: name + slug */}
                                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setSelectedFlavor(flavor); setEditingFlavor(false); setShowNewStep(false) }}>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition">{flavor.description}</p>
                                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{flavor.slug}</p>
                                  </div>
                                  {/* Caption count */}
                                  <div className="text-center shrink-0 w-16">
                                    <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">✦ {captionCounts[flavor.id] ?? '—'}</p>
                                    <p className="text-xs text-gray-400">Captions</p>
                                  </div>
                                  {/* Actions */}
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => { setSelectedFlavor(flavor); setEditDesc(flavor.description); setEditSlug(flavor.slug); setEditingFlavor(true) }}
                                        className="text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                                    >
                                      Edit
                                    </button>
                                    <button
                                        onClick={() => { setSelectedFlavor(flavor); setDeletingFlavor(true) }}
                                        className="text-xs font-medium text-red-400 hover:text-red-600 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                            ))
                        }
                      </div>
                  )}
                </div>
            )}

            {/* FLAVOR DETAIL */}
            {activeTab === 'flavors' && selectedFlavor && (
                <div className="p-8 max-w-3xl">
                  <button onClick={() => setSelectedFlavor(null)} className="text-sm text-gray-400 hover:text-gray-700 mb-6 flex items-center gap-1 transition">
                    ← Back to All Flavors
                  </button>

                  {/* Flavor header */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6 bg-white dark:bg-gray-900">
                    {editingFlavor ? (
                        <div className="flex flex-col gap-3">
                          <div>
                            <label className={labelCls}>Description</label>
                            <input value={editDesc} onChange={e => setEditDesc(e.target.value)} className={`mt-1 ${inputCls}`} />
                          </div>
                          <div>
                            <label className={labelCls}>Slug</label>
                            <input value={editSlug} onChange={e => setEditSlug(e.target.value)} className={`mt-1 ${inputCls} font-mono`} />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={saveFlavor} disabled={savingFlavor} className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition">
                              {savingFlavor ? 'Saving...' : 'Save'}
                            </button>
                            <button onClick={() => setEditingFlavor(false)} className="text-sm border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition">Cancel</button>
                          </div>
                        </div>
                    ) : (
                        <div className="flex items-start justify-between">
                          <div>
                            <h2 className="text-xl font-medium">{selectedFlavor.description}</h2>
                            <p className="text-xs text-gray-400 mt-1 font-mono">{selectedFlavor.slug} · ID: {selectedFlavor.id}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                                onClick={() => { setEditDesc(selectedFlavor.description); setEditSlug(selectedFlavor.slug); setEditingFlavor(true) }}
                                className="text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg transition"
                            >
                              Edit
                            </button>
                            {deletingFlavor ? (
                                <div className="flex gap-2">
                                  <button onClick={deleteFlavor} className="text-sm bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition">Confirm delete</button>
                                  <button onClick={() => setDeletingFlavor(false)} className="text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
                                </div>
                            ) : (
                                <button onClick={() => setDeletingFlavor(true)} className="text-sm text-gray-600 hover:text-red-500 border border-gray-200 px-3 py-1.5 rounded-lg transition">
                                  Delete
                                </button>
                            )}
                          </div>
                        </div>
                    )}
                  </div>

                  {/* Flavor sub-tabs */}
                  <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
                    <button
                        onClick={() => setFlavorTab('steps')}
                        className={`text-sm px-4 py-2 border-b-2 transition -mb-px ${flavorTab === 'steps' ? 'border-purple-500 text-purple-700 font-medium' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                    >
                      Steps — {steps.length}
                    </button>
                    <button
                        onClick={() => setFlavorTab('reorder')}
                        className={`text-sm px-4 py-2 border-b-2 transition -mb-px ${flavorTab === 'reorder' ? 'border-purple-500 text-purple-700 font-medium' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                    >
                      Reorder Steps
                    </button>
                    <button
                        onClick={() => setFlavorTab('test')}
                        className={`text-sm px-4 py-2 border-b-2 transition -mb-px ${flavorTab === 'test' ? 'border-purple-500 text-purple-700 font-medium' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                    >
                      Test Captions
                    </button>
                  </div>

                  {/* STEPS TAB */}
                  {flavorTab === 'steps' && (
                      <div className="flex flex-col gap-3">
                        {stepsLoading ? (
                            <p className="text-gray-400 text-sm">Loading steps...</p>
                        ) : (
                            <>
                              {steps.map((step, idx) => (
                                  <div key={step.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                                    {editingStep === step.id ? (
                                        <div className="p-5 flex flex-col gap-3 bg-gray-50 dark:bg-gray-800">
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-purple-600">Editing Step {step.order_by}</span>
                                            <button onClick={() => setEditingStep(null)} className="text-xs text-gray-400 hover:text-gray-600">✕ Cancel</button>
                                          </div>
                                          <div>
                                            <label className={labelCls}>Description</label>
                                            <input value={editStepForm.description || ''} onChange={e => setEditStepForm({ ...editStepForm, description: e.target.value })} className={`mt-1 ${inputCls}`} placeholder="Optional" />
                                          </div>
                                          <div>
                                            <label className={labelCls}>System Prompt *</label>
                                            <textarea value={editStepForm.llm_system_prompt || ''} onChange={e => setEditStepForm({ ...editStepForm, llm_system_prompt: e.target.value })} rows={3} className={`mt-1 ${inputCls} resize-none`} />
                                          </div>
                                          <div>
                                            <label className={labelCls}>User Prompt *</label>
                                            <textarea value={editStepForm.llm_user_prompt || ''} onChange={e => setEditStepForm({ ...editStepForm, llm_user_prompt: e.target.value })} rows={3} className={`mt-1 ${inputCls} resize-none`} />
                                          </div>
                                          <div className="grid grid-cols-2 gap-3">
                                            <div>
                                              <label className={labelCls}>Temperature</label>
                                              <input type="number" step="0.1" min="0" max="2" value={editStepForm.llm_temperature || 0.7} onChange={e => setEditStepForm({ ...editStepForm, llm_temperature: parseFloat(e.target.value) })} className={`mt-1 ${inputCls}`} />
                                            </div>
                                            <div>
                                              <label className={labelCls}>Input Type ID</label>
                                              <input type="number" value={editStepForm.llm_input_type_id || 1} onChange={e => setEditStepForm({ ...editStepForm, llm_input_type_id: parseInt(e.target.value) })} className={`mt-1 ${inputCls}`} />
                                            </div>
                                            <div>
                                              <label className={labelCls}>Output Type ID</label>
                                              <input type="number" value={editStepForm.llm_output_type_id || 2} onChange={e => setEditStepForm({ ...editStepForm, llm_output_type_id: parseInt(e.target.value) })} className={`mt-1 ${inputCls}`} />
                                            </div>
                                            <div>
                                              <label className={labelCls}>Model ID</label>
                                              <input type="number" value={editStepForm.llm_model_id || 1} onChange={e => setEditStepForm({ ...editStepForm, llm_model_id: parseInt(e.target.value) })} className={`mt-1 ${inputCls}`} />
                                            </div>
                                          </div>
                                          <button onClick={saveStep} disabled={savingStep} className="self-start text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition">
                                            {savingStep ? 'Saving...' : 'Save Step'}
                                          </button>
                                        </div>
                                    ) : (
                                        <div className="p-4 flex items-start gap-4">
                                          <div className="flex items-center justify-center w-6 pt-1 shrink-0">
                                            <span className="text-sm font-bold text-purple-500">{step.order_by}</span>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            {step.description && <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{step.description}</p>}
                                            <div className="space-y-1">
                                              <p className="text-xs text-gray-400">System: <span className="text-gray-700 text-sm">{step.llm_system_prompt}</span></p>
                                              <p className="text-xs text-gray-400">User: <span className="text-gray-700 text-sm">{step.llm_user_prompt}</span></p>
                                            </div>
                                            <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
                                              <span>🌡️ {step.llm_temperature}</span>
                                              <span>In: {step.llm_input_type_id}</span>
                                              <span>Out: {step.llm_output_type_id}</span>
                                              <span>Model: {step.llm_model_id}</span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <button onClick={() => { setEditingStep(step.id); setEditStepForm({ ...step }) }} className="text-xs text-gray-600 hover:text-gray-900 border border-gray-200 px-2 py-1 rounded-lg transition">Edit</button>
                                            {deletingStep === step.id ? (
                                                <>
                                                  <button onClick={() => deleteStep(step.id)} className="text-xs bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600 transition">Delete</button>
                                                  <button onClick={() => setDeletingStep(null)} className="text-xs border border-gray-200 px-2 py-1 rounded-lg hover:bg-gray-50 transition">Cancel</button>
                                                </>
                                            ) : (
                                                <button onClick={() => setDeletingStep(step.id)} className="text-xs text-gray-600 hover:text-red-500 border border-gray-200 px-2 py-1 rounded-lg transition">Delete</button>
                                            )}
                                          </div>
                                        </div>
                                    )}
                                  </div>
                              ))}

                              {showNewStep && (
                                  <div className="border border-purple-200 dark:border-purple-800 rounded-xl p-5 flex flex-col gap-3 bg-purple-50 dark:bg-purple-900/20">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium text-purple-600">New Step {steps.length + 1}</span>
                                      <button onClick={() => setShowNewStep(false)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                                    </div>
                                    <div>
                                      <label className={labelCls}>Description</label>
                                      <input value={newStep.description} onChange={e => setNewStep({ ...newStep, description: e.target.value })} className={`mt-1 ${inputCls}`} placeholder="Optional" />
                                    </div>
                                    <div>
                                      <label className={labelCls}>System Prompt *</label>
                                      <textarea value={newStep.llm_system_prompt} onChange={e => setNewStep({ ...newStep, llm_system_prompt: e.target.value })} rows={3} className={`mt-1 ${inputCls} resize-none`} placeholder="You are an eagle-eyed image describer..." />
                                    </div>
                                    <div>
                                      <label className={labelCls}>User Prompt *</label>
                                      <textarea value={newStep.llm_user_prompt} onChange={e => setNewStep({ ...newStep, llm_user_prompt: e.target.value })} rows={3} className={`mt-1 ${inputCls} resize-none`} placeholder="Describe this image in detail..." />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className={labelCls}>Temperature</label>
                                        <input type="number" step="0.1" min="0" max="2" value={newStep.llm_temperature} onChange={e => setNewStep({ ...newStep, llm_temperature: parseFloat(e.target.value) })} className={`mt-1 ${inputCls}`} />
                                      </div>
                                      <div>
                                        <label className={labelCls}>Input Type ID</label>
                                        <input type="number" value={newStep.llm_input_type_id} onChange={e => setNewStep({ ...newStep, llm_input_type_id: parseInt(e.target.value) })} className={`mt-1 ${inputCls}`} />
                                      </div>
                                      <div>
                                        <label className={labelCls}>Output Type ID</label>
                                        <input type="number" value={newStep.llm_output_type_id} onChange={e => setNewStep({ ...newStep, llm_output_type_id: parseInt(e.target.value) })} className={`mt-1 ${inputCls}`} />
                                      </div>
                                      <div>
                                        <label className={labelCls}>Model ID</label>
                                        <input type="number" value={newStep.llm_model_id} onChange={e => setNewStep({ ...newStep, llm_model_id: parseInt(e.target.value) })} className={`mt-1 ${inputCls}`} />
                                      </div>
                                    </div>
                                    <button onClick={addStep} disabled={savingStep || !newStep.llm_system_prompt.trim() || !newStep.llm_user_prompt.trim()} className="self-start text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition">
                                      {savingStep ? 'Adding...' : 'Add Step'}
                                    </button>
                                  </div>
                              )}

                              {!showNewStep && (
                                  <button onClick={() => setShowNewStep(true)} className="w-full border-2 border-dashed border-gray-200 hover:border-purple-300 text-gray-400 hover:text-purple-500 py-4 rounded-xl transition text-sm font-medium">
                                    + Add Step
                                  </button>
                              )}
                            </>
                        )}
                      </div>
                  )}

                  {/* REORDER STEPS TAB */}
                  {flavorTab === 'reorder' && (
                      <div className="flex flex-col gap-4 max-w-xl">
                        <p className="text-sm text-gray-400 dark:text-gray-500">Drag steps to reorder them, then click Save.</p>

                        {reorderSteps.length === 0 && (
                            <p className="text-sm text-gray-400">No steps to reorder yet.</p>
                        )}

                        <div className="flex flex-col gap-2">
                          {reorderSteps.map((step, idx) => (
                              <div
                                  key={step.id}
                                  draggable
                                  onDragStart={() => setDragIdx(idx)}
                                  onDragOver={e => {
                                    e.preventDefault()
                                    if (dragIdx === null || dragIdx === idx) return
                                    const arr = [...reorderSteps]
                                    const dragged = arr.splice(dragIdx, 1)[0]
                                    arr.splice(idx, 0, dragged)
                                    setReorderSteps(arr)
                                    setDragIdx(idx)
                                  }}
                                  onDragEnd={() => setDragIdx(null)}
                                  className={`border rounded-xl px-4 py-3 flex items-center gap-4 cursor-grab active:cursor-grabbing transition select-none
                          ${dragIdx === idx
                                      ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20 shadow-lg scale-[1.02]'
                                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600'
                                  }`}
                              >
                                <span className="text-gray-300 dark:text-gray-600 text-lg select-none">⠿</span>
                                <span className="text-sm font-bold text-purple-500 w-5 shrink-0">{idx + 1}</span>
                                <div className="flex-1 min-w-0">
                                  {step.description && (
                                      <p className="text-xs font-semibold text-gray-400 uppercase mb-0.5">{step.description}</p>
                                  )}
                                  <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{step.llm_system_prompt}</p>
                                </div>
                              </div>
                          ))}
                        </div>

                        {reorderSteps.length > 0 && (
                            <div className="flex items-center gap-3">
                              <button
                                  onClick={saveReorder}
                                  disabled={savingReorder}
                                  className="text-sm bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-5 py-2 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-50 transition font-medium"
                              >
                                {savingReorder ? 'Saving...' : 'Save Order'}
                              </button>
                              {reorderSuccess && (
                                  <span className="text-sm text-green-600 dark:text-green-400">✓ Order saved!</span>
                              )}
                            </div>
                        )}
                      </div>
                  )}

                  {/* TEST CAPTIONS TAB */}
                  {flavorTab === 'test' && (
                      <div className="flex flex-col gap-5 max-w-xl">
                        <div>
                          <h3 className="font-medium text-gray-900 mb-1">Test Caption Generation</h3>
                          <p className="text-sm text-gray-400">Upload an image to generate captions using this flavor's prompt chain.</p>
                        </div>

                        {steps.length === 0 && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg px-4 py-3">
                              ⚠️ This flavor has no steps yet. Add steps before testing.
                            </div>
                        )}

                        {/* Image upload */}
                        <div>
                          <label className={labelCls}>Upload Image</label>
                          <div
                              onClick={() => fileInputRef.current?.click()}
                              className="mt-2 border-2 border-dashed border-gray-200 hover:border-purple-300 rounded-xl p-6 cursor-pointer transition flex flex-col items-center gap-2"
                          >
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="max-h-48 rounded-lg object-contain" />
                            ) : (
                                <>
                                  <span className="text-2xl">📷</span>
                                  <p className="text-sm text-gray-400">Click to upload an image</p>
                                  <p className="text-xs text-gray-300">JPEG, PNG, WebP, GIF, HEIC</p>
                                </>
                            )}
                          </div>
                          <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic"
                              onChange={handleFileChange}
                              className="hidden"
                          />
                          {imageFile && (
                              <p className="text-xs text-gray-400 mt-1">{imageFile.name} · {(imageFile.size / 1024).toFixed(0)} KB</p>
                          )}
                        </div>

                        <button
                            onClick={generateCaptions}
                            disabled={!imageFile || generating || steps.length === 0}
                            className="self-start bg-gray-900 hover:bg-gray-700 disabled:opacity-40 text-white font-medium px-5 py-2.5 rounded-lg transition text-sm flex items-center gap-2"
                        >
                          {generating ? (
                              <><span className="animate-spin inline-block">⚙️</span> Generating...</>
                          ) : (
                              <>🚀 Generate Captions</>
                          )}
                        </button>

                        {captionError && (
                            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
                              Error: {captionError}
                            </div>
                        )}

                        {captions.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-3">Generated Captions — {captions.length}</p>
                              <div className="flex flex-col gap-2">
                                {captions.map((caption, i) => (
                                    <div key={caption.id || i} className="border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex gap-3 bg-white dark:bg-gray-900">
                                      <span className="text-xs font-bold text-purple-500 mt-0.5 shrink-0">#{i + 1}</span>
                                      <p className="text-sm text-gray-800 dark:text-gray-200">{caption.content || JSON.stringify(caption)}</p>
                                    </div>
                                ))}
                              </div>
                            </div>
                        )}
                      </div>
                  )}
                </div>
            )}

            {/* CAPTIONS TAB */}
            {activeTab === 'captions' && (
                <div className="p-8">
                  {!captionsFlavor ? (
                      <>
                        <div className="mb-6">
                          <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Captions</h2>
                          <p className="text-sm text-gray-400 mt-1">Click on a flavor to see all captions it has generated.</p>
                        </div>
                        {/* Filter + Sort */}
                        <div className="flex items-center gap-3 mb-6 max-w-2xl">
                          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                            <button
                                onClick={() => setCaptionsFilter('all')}
                                className={`text-xs px-3 py-1.5 rounded-md transition font-medium ${captionsFilter === 'all' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                            >
                              All Flavors
                            </button>
                            <button
                                onClick={() => setCaptionsFilter('has-captions')}
                                className={`text-xs px-3 py-1.5 rounded-md transition font-medium ${captionsFilter === 'has-captions' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                            >
                              Has Captions
                            </button>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <span>Sort by</span>
                            <select
                                value={captionsSort}
                                onChange={e => setCaptionsSort(e.target.value as 'most' | 'az' | 'za')}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-300"
                            >
                              <option value="most">Most Captions</option>
                              <option value="az">A-Z</option>
                              <option value="za">Z-A</option>
                            </select>
                          </div>
                        </div>

                        {loading ? (
                            <p className="text-gray-400 text-sm">Loading...</p>
                        ) : (
                            <div className="flex flex-col gap-3 max-w-2xl">
                              {flavors.length === 0 && (
                                  <p className="text-gray-400 text-sm">No flavors yet.</p>
                              )}
                              {flavors
                                  .filter(f => captionsFilter === 'has-captions' ? (captionCounts[f.id] ?? 0) > 0 : true)
                                  .sort((a, b) =>
                                      captionsSort === 'most' ? (captionCounts[b.id] ?? 0) - (captionCounts[a.id] ?? 0) :
                                          captionsSort === 'az' ? (a.description ?? '').localeCompare(b.description ?? '') :
                                              (b.description ?? '').localeCompare(a.description ?? '')
                                  )
                                  .map(flavor => (
                                      <div
                                          key={flavor.id}
                                          onClick={() => { setCaptionsFlavor(flavor); fetchFlavorCaptions(flavor.id) }}
                                          className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 transition bg-white dark:bg-gray-900"
                                      >
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{flavor.description}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{flavor.slug}</p>
                                      </div>
                                  ))
                              }
                            </div>
                        )}
                      </>
                  ) : (
                      <div className="max-w-2xl">
                        <button
                            onClick={() => { setCaptionsFlavor(null); setFlavorCaptions([]) }}
                            className="text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6 flex items-center gap-1 transition"
                        >
                          ← Back to Captions
                        </button>
                        <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-1">{captionsFlavor.description}</h2>
                        <p className="text-xs text-gray-400 font-mono mb-6">{captionsFlavor.slug}</p>

                        {captionsLoading && <p className="text-gray-400 text-sm">Loading captions...</p>}
                        {captionsError && <p className="text-red-500 text-sm">{captionsError}</p>}

                        {!captionsLoading && !captionsError && flavorCaptions.length === 0 && (
                            <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
                              <p className="text-gray-400 text-sm">No captions generated for this flavor yet.</p>
                              <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">Go to All Flavors → Test Captions to generate some.</p>
                            </div>
                        )}

                        {flavorCaptions.length > 0 && (
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{flavorCaptions.length} caption{flavorCaptions.length !== 1 ? 's' : ''} generated</p>
                              <div className="flex flex-col gap-2">
                                {flavorCaptions.map((caption, i) => (
                                    <div key={caption.id} className="border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex gap-3 bg-white dark:bg-gray-900">
                                      <span className="text-xs font-bold text-purple-500 mt-0.5 shrink-0">#{i + 1}</span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-800 dark:text-gray-200">{caption.content}</p>
                                        <p className="text-xs text-gray-400 mt-1">{new Date(caption.created_datetime_utc).toLocaleString()}</p>
                                      </div>
                                    </div>
                                ))}
                              </div>
                            </div>
                        )}
                      </div>
                  )}
                </div>
            )}

            {/* NEW FLAVOR */}
            {activeTab === 'new-flavor' && (
                <div className="p-8 max-w-lg">
                  <h2 className="text-2xl font-medium mb-1 text-gray-900 dark:text-white">Create a Flavor ✨</h2>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
                    A flavor defines the personality behind your captions — from dry academic humor to chaotic internet energy.<br/>
                    Create a unique comedic style and shape how your AI responds to images.
                  </p>

                  {/* Example box */}
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-xl p-4 mb-6">
                    <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-2">Example flavor</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Dry Academic Burnout</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">A humor style that frames everyday situations through the lens of overthinking and exhaustion. Captions sound analytical but reveal subtle absurdity.</p>
                    <p className="text-xs font-mono text-purple-500 mt-2">slug: dry-academic-burnout</p>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-900 flex flex-col gap-5">
                    {createError && <p className="text-red-500 text-sm">{createError}</p>}
                    {createSuccess && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3">
                          <p className="text-green-700 dark:text-green-400 text-sm font-medium">✓ Flavor created!</p>
                          <p className="text-green-600 dark:text-green-500 text-xs mt-0.5">Now go to <button onClick={() => setActiveTab('flavors')} className="underline font-medium">All Flavors</button> to add steps to it.</p>
                        </div>
                    )}
                    <div>
                      <label className={labelCls}>Flavor Name *</label>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 mb-1">Give it a descriptive name that captures the humor style or personality.</p>
                      <input type="text" placeholder="e.g. Dry Academic Burnout" value={newDesc} onChange={e => handleDescChange(e.target.value)} className={`mt-1 ${inputCls}`} />
                    </div>
                    <div>
                      <label className={labelCls}>Slug *</label>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 mb-1">A short URL-friendly identifier. Auto-generated — but you can edit it.</p>
                      <input type="text" placeholder="e.g. dry-academic-burnout" value={newSlug} onChange={e => setNewSlug(e.target.value)} className={`mt-1 ${inputCls} font-mono`} />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={createFlavor} disabled={creating} className="text-sm bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-lg px-5 py-2.5 hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-50 transition font-medium">
                        {creating ? 'Creating...' : 'Create Flavor'}
                      </button>
                      <button onClick={() => { setNewDesc(''); setNewSlug(''); setCreateError(''); setCreateSuccess('') }} className="text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
            )}
          </div>
        </div>
      </div>
  )
}