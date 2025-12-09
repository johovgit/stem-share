'use client'

import { useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { nanoid } from 'nanoid'

type StemType = 'vocals' | 'drums' | 'bass' | 'guitar' | 'piano' | 'other'

const STEM_CONFIG: Record<StemType, { label: string; color: string; icon: string; keywords: string[] }> = {
  vocals: { label: 'Vocals', color: '#f472b6', icon: '🎤', keywords: ['vocal', 'vox', 'voice', 'sing'] },
  drums: { label: 'Drums', color: '#38bdf8', icon: '🥁', keywords: ['drum', 'percussion', 'beat'] },
  bass: { label: 'Bass', color: '#a3e635', icon: '🎸', keywords: ['bass'] },
  guitar: { label: 'Guitar', color: '#fb923c', icon: '🎸', keywords: ['guitar', 'gtr'] },
  piano: { label: 'Piano', color: '#facc15', icon: '🎹', keywords: ['piano', 'keys', 'keyboard'] },
  other: { label: 'Other', color: '#c084fc', icon: '🎵', keywords: ['other', 'inst', 'synth', 'strings', 'pad'] },
}

const STEM_ORDER: StemType[] = ['vocals', 'drums', 'bass', 'guitar', 'piano', 'other']

// Auto-detect stem type from filename
function detectStemType(filename: string): StemType | null {
  const lowerName = filename.toLowerCase()
  
  for (const [type, config] of Object.entries(STEM_CONFIG)) {
    for (const keyword of config.keywords) {
      // Check for patterns like "(Vocals)" or "_Vocals" or "-vocals"
      if (lowerName.includes(`(${keyword})`) || 
          lowerName.includes(`_${keyword}`) || 
          lowerName.includes(`-${keyword}`) ||
          lowerName.includes(` ${keyword}`)) {
        return type as StemType
      }
    }
  }
  
  return null
}

// Extract track title from filename
function extractTitle(filename: string): string {
  // Remove file extension
  let title = filename.replace(/\.(wav|mp3|m4a|aiff|flac|ogg)$/i, '')
  
  // Remove stem suffix like "(Vocals)" or "_Drums"
  title = title.replace(/[\s_-]*\((vocals|drums|bass|guitar|piano|other|vox|keys|keyboard|stems)\)/gi, '')
  title = title.replace(/[\s_-]*(vocals|drums|bass|guitar|piano|other|vox|keys|keyboard)$/gi, '')
  
  // Clean up
  title = title.replace(/_/g, ' ').trim()
  
  return title || 'Untitled Track'
}

export default function Home() {
  const [title, setTitle] = useState('')
  const [stems, setStems] = useState<Record<StemType, File | null>>({
    vocals: null,
    drums: null,
    bass: null,
    guitar: null,
    piano: null,
    other: null,
  })
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  
  const fileInputRefs = useRef<Record<StemType, HTMLInputElement | null>>({
    vocals: null,
    drums: null,
    bass: null,
    guitar: null,
    piano: null,
    other: null,
  })

  const handleFileSelect = (type: StemType, file: File | null) => {
    setStems(prev => ({ ...prev, [type]: file }))
    
    // Auto-set title from first uploaded file if empty
    if (file && !title) {
      setTitle(extractTitle(file.name))
    }
  }

  // Handle multiple files dropped or selected
  const handleMultipleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const newStems = { ...stems }
    let detectedTitle = ''

    for (const file of fileArray) {
      if (!file.type.startsWith('audio/') && !file.name.match(/\.(wav|mp3|m4a|aiff|flac|ogg)$/i)) {
        continue
      }

      const detectedType = detectStemType(file.name)
      if (detectedType && !newStems[detectedType]) {
        newStems[detectedType] = file
        if (!detectedTitle) {
          detectedTitle = extractTitle(file.name)
        }
      }
    }

    setStems(newStems)
    if (detectedTitle && !title) {
      setTitle(detectedTitle)
    }
  }, [stems, title])

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleMultipleFiles(e.dataTransfer.files)
  }

  const uploadStem = async (file: File, trackId: string, stemType: StemType) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${trackId}/${stemType}.${fileExt}`
    
    const { error } = await supabase.storage
      .from('stems')
      .upload(fileName, file, { upsert: true })
    
    if (error) throw error
    
    const { data } = supabase.storage.from('stems').getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleUpload = async () => {
    if (!title.trim()) {
      alert('Please enter a track title')
      return
    }

    const hasAtLeastOneStem = Object.values(stems).some(s => s !== null)
    if (!hasAtLeastOneStem) {
      alert('Please upload at least one stem')
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      const trackId = nanoid(10)
      const urls: Record<string, string | null> = {
        vocals_url: null,
        drums_url: null,
        bass_url: null,
        guitar_url: null,
        piano_url: null,
        other_url: null,
      }

      const stemEntries = Object.entries(stems).filter(([_, file]) => file !== null)
      let completed = 0

      for (const [type, file] of stemEntries) {
        if (file) {
          const url = await uploadStem(file, trackId, type as StemType)
          urls[`${type}_url`] = url
          completed++
          setProgress((completed / stemEntries.length) * 90)
        }
      }

      const { error } = await supabase.from('tracks').insert({
        id: trackId,
        title: title.trim(),
        ...urls,
      })

      if (error) throw error

      setProgress(100)
      const url = `${window.location.origin}/s/${trackId}`
      setShareUrl(url)
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed. Please check your Supabase configuration.')
    } finally {
      setUploading(false)
    }
  }

  const copyToClipboard = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const resetForm = () => {
    setTitle('')
    setStems({ vocals: null, drums: null, bass: null, guitar: null, piano: null, other: null })
    setShareUrl(null)
    setProgress(0)
  }

  const stemCount = Object.values(stems).filter(s => s !== null).length

  if (shareUrl) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold mb-2">Track Uploaded!</h1>
            <p className="text-zinc-400">Share this link with your bandmates</p>
          </div>

          <div className="bg-zinc-900 rounded-2xl p-4 mb-4">
            <p className="font-mono text-sm text-zinc-300 break-all mb-3">{shareUrl}</p>
            <button
              onClick={copyToClipboard}
              className="w-full py-3 rounded-xl font-semibold transition-all bg-white text-black hover:bg-zinc-200"
            >
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>

          <button
            onClick={resetForm}
            className="w-full py-3 rounded-xl font-semibold transition-all bg-zinc-800 hover:bg-zinc-700"
          >
            Upload Another Track
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-3xl font-bold mb-2">Stem Share</h1>
          <p className="text-zinc-400">Upload stems, share with your band</p>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`mb-6 p-8 border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer ${
            isDragging 
              ? 'border-white bg-white/5' 
              : 'border-zinc-700 hover:border-zinc-500'
          }`}
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.multiple = true
            input.accept = 'audio/*'
            input.onchange = (e) => {
              const files = (e.target as HTMLInputElement).files
              if (files) handleMultipleFiles(files)
            }
            input.click()
          }}
        >
          <div className="text-4xl mb-3">📂</div>
          <p className="font-medium mb-1">
            {isDragging ? 'Drop stems here' : 'Drop all stems here'}
          </p>
          <p className="text-sm text-zinc-500">
            Auto-detects from Logic Pro filenames
          </p>
        </div>

        {/* Track Title */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Track Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Auto-detected from filename"
            className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none transition-colors"
          />
        </div>

        {/* Stem Cards */}
        <div className="space-y-3 mb-8">
          {STEM_ORDER.map((type) => {
            const config = STEM_CONFIG[type]
            const file = stems[type]
            
            return (
              <div
                key={type}
                onClick={() => fileInputRefs.current[type]?.click()}
                className={`relative p-4 rounded-xl border cursor-pointer transition-all group ${
                  file 
                    ? 'bg-zinc-900 border-zinc-700' 
                    : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <input
                  ref={el => { fileInputRefs.current[type] = el }}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(type, e.target.files?.[0] || null)}
                />
                
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl transition-all"
                    style={{ 
                      backgroundColor: file ? `${config.color}20` : '#27272a',
                      opacity: file ? 1 : 0.5
                    }}
                  >
                    {config.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div 
                      className="font-semibold transition-colors"
                      style={{ color: file ? config.color : '#71717a' }}
                    >
                      {config.label}
                    </div>
                    {file ? (
                      <div className="text-sm text-zinc-400 truncate">
                        {file.name}
                      </div>
                    ) : (
                      <div className="text-sm text-zinc-600">
                        Click or drop to add
                      </div>
                    )}
                  </div>

                  {file ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFileSelect(type, null)
                      }}
                      className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400"
                    >
                      ✕
                    </button>
                  ) : (
                    <div className="text-zinc-600 group-hover:text-zinc-400 transition-colors text-xl">
                      +
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={uploading || stemCount === 0}
          className="w-full py-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white text-black hover:bg-zinc-200"
        >
          {uploading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">◌</span>
              Uploading... {Math.round(progress)}%
            </span>
          ) : (
            `Upload ${stemCount} Stem${stemCount !== 1 ? 's' : ''} & Get Link`
          )}
        </button>

        {/* Progress Bar */}
        {uploading && (
          <div className="mt-4 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-sm text-zinc-500 mt-8">
          Recipients can play and adjust stems without login
        </p>
      </div>
    </main>
  )
}
