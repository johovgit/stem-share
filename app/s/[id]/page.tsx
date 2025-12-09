'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase, Track } from '@/lib/supabase'

type StemType = 'vocals' | 'drums' | 'bass' | 'guitar' | 'piano' | 'other'

const STEM_CONFIG: Record<StemType, { label: string; color: string; icon: string }> = {
  vocals: { label: 'Vocals', color: '#f472b6', icon: '🎤' },
  drums: { label: 'Drums', color: '#38bdf8', icon: '🥁' },
  bass: { label: 'Bass', color: '#a3e635', icon: '🎸' },
  guitar: { label: 'Guitar', color: '#fb923c', icon: '🎸' },
  piano: { label: 'Piano', color: '#facc15', icon: '🎹' },
  other: { label: 'Other', color: '#c084fc', icon: '🎵' },
}

const STEM_ORDER: StemType[] = ['vocals', 'drums', 'bass', 'guitar', 'piano', 'other']

type StemState = {
  volume: number
  muted: boolean
  solo: boolean
}

export default function PlayerPage({ params }: { params: { id: string } }) {
  const [track, setTrack] = useState<Track | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [stemStates, setStemStates] = useState<Record<StemType, StemState>>({
    vocals: { volume: 100, muted: false, solo: false },
    drums: { volume: 100, muted: false, solo: false },
    bass: { volume: 100, muted: false, solo: false },
    guitar: { volume: 100, muted: false, solo: false },
    piano: { volume: 100, muted: false, solo: false },
    other: { volume: 100, muted: false, solo: false },
  })
  
  const audioRefs = useRef<Record<StemType, HTMLAudioElement | null>>({
    vocals: null,
    drums: null,
    bass: null,
    guitar: null,
    piano: null,
    other: null,
  })
  const animationRef = useRef<number>()

  useEffect(() => {
    const fetchTrack = async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) {
        setError('Track not found')
      } else {
        setTrack(data)
      }
      setLoading(false)
    }

    fetchTrack()
  }, [params.id])

  // Get available stems
  const getAvailableStems = (): StemType[] => {
    if (!track) return []
    return STEM_ORDER.filter(
      type => track[`${type}_url` as keyof Track]
    )
  }

  // Handle audio metadata loaded
  const handleLoadedMetadata = (type: StemType) => {
    const audio = audioRefs.current[type]
    if (audio && audio.duration > duration) {
      setDuration(audio.duration)
    }
  }

  // Sync all audio elements
  const syncAudioElements = () => {
    const stems = getAvailableStems()
    const anySolo = stems.some(type => stemStates[type].solo)

    stems.forEach(type => {
      const audio = audioRefs.current[type]
      if (audio) {
        const state = stemStates[type]
        const shouldPlay = anySolo ? state.solo : !state.muted
        audio.volume = shouldPlay ? state.volume / 100 : 0
      }
    })
  }

  useEffect(() => {
    syncAudioElements()
  }, [stemStates])

  // Play/Pause all stems
  const togglePlayback = () => {
    const stems = getAvailableStems()
    
    if (isPlaying) {
      stems.forEach(type => {
        audioRefs.current[type]?.pause()
      })
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    } else {
      stems.forEach(type => {
        audioRefs.current[type]?.play()
      })
      updateTime()
    }
    
    setIsPlaying(!isPlaying)
  }

  // Update time display
  const updateTime = () => {
    const firstStem = getAvailableStems()[0]
    const audio = audioRefs.current[firstStem]
    if (audio) {
      setCurrentTime(audio.currentTime)
      if (!audio.paused) {
        animationRef.current = requestAnimationFrame(updateTime)
      }
    }
  }

  // Seek to position
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const newTime = percent * duration

    getAvailableStems().forEach(type => {
      const audio = audioRefs.current[type]
      if (audio) {
        audio.currentTime = newTime
      }
    })
    setCurrentTime(newTime)
  }

  // Handle audio ended
  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
    getAvailableStems().forEach(type => {
      const audio = audioRefs.current[type]
      if (audio) {
        audio.currentTime = 0
      }
    })
  }

  // Volume change
  const handleVolumeChange = (type: StemType, volume: number) => {
    setStemStates(prev => ({
      ...prev,
      [type]: { ...prev[type], volume }
    }))
  }

  // Mute toggle
  const handleMute = (type: StemType) => {
    setStemStates(prev => ({
      ...prev,
      [type]: { ...prev[type], muted: !prev[type].muted, solo: false }
    }))
  }

  // Solo toggle
  const handleSolo = (type: StemType) => {
    setStemStates(prev => {
      const newStates = { ...prev }
      const isCurrentlySolo = prev[type].solo
      
      // Toggle solo for this stem, clear others
      Object.keys(newStates).forEach(key => {
        const k = key as StemType
        newStates[k] = {
          ...newStates[k],
          solo: k === type ? !isCurrentlySolo : false
        }
      })
      
      return newStates
    })
  }

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-400 animate-pulse">Loading...</div>
      </main>
    )
  }

  if (error || !track) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🎵</div>
          <h1 className="text-xl font-semibold mb-2">Track Not Found</h1>
          <p className="text-zinc-400">This link may have expired or been removed</p>
        </div>
      </main>
    )
  }

  const availableStems = getAvailableStems()
  const anySolo = availableStems.some(type => stemStates[type].solo)

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-lg mx-auto">
        {/* Hidden audio elements */}
        {availableStems.map(type => (
          <audio
            key={type}
            ref={el => { audioRefs.current[type] = el }}
            src={track[`${type}_url` as keyof Track] as string}
            onLoadedMetadata={() => handleLoadedMetadata(type)}
            onEnded={handleEnded}
            preload="auto"
          />
        ))}

        {/* Header */}
        <div className="text-center pt-8 mb-8">
          <p className="text-zinc-500 text-sm mb-2">Stem Share</p>
          <h1 className="text-2xl font-bold">{track.title}</h1>
          <p className="text-zinc-500 text-sm mt-2">{availableStems.length} stems</p>
        </div>

        {/* Player Controls */}
        <div className="bg-zinc-900 rounded-2xl p-6 mb-6">
          {/* Play button and time */}
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={togglePlayback}
              className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center text-xl hover:scale-105 transition-transform"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            
            <div
              className="flex-1 h-2 bg-zinc-800 rounded-full cursor-pointer relative overflow-hidden"
              onClick={handleSeek}
            >
              <div
                className="absolute h-full bg-white rounded-full transition-all"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
            
            <div className="font-mono text-sm text-zinc-400 min-w-[90px] text-right">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        </div>

        {/* Stem Controls */}
        <div className="space-y-3">
          {availableStems.map((type, index) => {
            const config = STEM_CONFIG[type]
            const state = stemStates[type]
            const isEffectivelyMuted = anySolo ? !state.solo : state.muted

            return (
              <div
                key={type}
                className="animate-fade-in bg-zinc-900 rounded-xl p-4"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ 
                      backgroundColor: `${config.color}20`,
                      opacity: isEffectivelyMuted ? 0.4 : 1 
                    }}
                  >
                    {config.icon}
                  </div>
                  
                  <span 
                    className="font-semibold flex-1"
                    style={{ 
                      color: isEffectivelyMuted ? '#71717a' : config.color 
                    }}
                  >
                    {config.label}
                  </span>

                  {/* Mute button */}
                  <button
                    onClick={() => handleMute(type)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      state.muted 
                        ? 'bg-pink-500/20 text-pink-400' 
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    M
                  </button>

                  {/* Solo button */}
                  <button
                    onClick={() => handleSolo(type)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      state.solo 
                        ? 'bg-amber-500/20 text-amber-400' 
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    S
                  </button>
                </div>

                {/* Volume slider */}
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={state.volume}
                    onChange={(e) => handleVolumeChange(type, parseInt(e.target.value))}
                    className="flex-1"
                    style={{
                      opacity: isEffectivelyMuted ? 0.4 : 1
                    }}
                  />
                  <span className="font-mono text-sm text-zinc-500 w-10 text-right">
                    {state.volume}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-zinc-500 mt-8">
          Adjust volume, mute (M) or solo (S) each stem
        </p>
      </div>
    </main>
  )
}
