import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, ReactElement } from 'react'
import clsx from 'clsx'
import {
  Camera,
  Check,
  ChevronRight,
  Gift,
  Heart,
  Images,
  KeyRound,
  LockKeyhole,
  Map as MapIcon,
  Music,
  Palette,
  ShieldCheck,
  Sparkles,
  Volume2,
  Wand2,
  X,
} from 'lucide-react'
import './App.css'
import { decryptStory, verifyAccessCode } from './lib/crypto'
import { loadStory } from './lib/storyLoader'
import type { EffectName, EncryptedStoryBundle, PhotoItem, Scene, StoryContent } from './types'

type AuthMode = 'plain' | 'encrypted'

function App() {
  const [story, setStory] = useState<StoryContent | null>(null)
  const [bundle, setBundle] = useState<EncryptedStoryBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    let alive = true
    loadStory()
      .then((result) => {
        if (!alive) return
        if (result.kind === 'encrypted') {
          setBundle(result.bundle)
          setAuthenticated(false)
        } else {
          setStory(result.story)
          setAuthenticated(!result.story.access?.enabled)
        }
      })
      .catch(() => {
        if (alive) setError('Story content failed to load.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  async function unlockWithPassword(password: string) {
    setError('')
    if (bundle) {
      try {
        setStory(await decryptStory(bundle, password))
        setAuthenticated(true)
      } catch {
        setError('Password rejected. Check the private code and try again.')
      }
      return
    }

    if (!story) return
    if (await verifyAccessCode(password, story.access?.codeHash)) {
      setAuthenticated(true)
    } else {
      setError('Code rejected. Try the hint or regenerate your content pack.')
    }
  }

  if (loading) return <StatusScreen label="Loading memory vault" />
  if (!story && !bundle) return <StatusScreen label={error || 'No story content found'} />
  if (!story || !authenticated) {
    return (
      <LockScreen
        mode={bundle ? 'encrypted' : 'plain'}
        hint={story?.access?.hint}
        error={error}
        onUnlock={unlockWithPassword}
      />
    )
  }

  return <Journey story={story} />
}

function StatusScreen({ label }: { label: string }) {
  return (
    <main className="status-screen">
      <Sparkles aria-hidden="true" />
      <p>{label}</p>
    </main>
  )
}

function LockScreen({
  mode,
  hint,
  error,
  onUnlock,
}: {
  mode: AuthMode
  hint?: string
  error: string
  onUnlock: (password: string) => Promise<void>
}) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    await onUnlock(password)
    setBusy(false)
  }

  return (
    <main className="lock-screen">
      <section className="lock-panel" aria-label="Private entrance">
        <div className="lock-mark">
          {mode === 'encrypted' ? <ShieldCheck aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
        </div>
        <p className="eyebrow">{mode === 'encrypted' ? 'Encrypted content pack' : 'Private entrance'}</p>
        <h1>Open the memory quest</h1>
        <form onSubmit={submit} className="lock-form">
          <label htmlFor="password">Access code</label>
          <div className="password-row">
            <KeyRound aria-hidden="true" />
            <input
              id="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              autoFocus
            />
            <button type="submit" disabled={busy || !password.trim()} aria-label="Unlock">
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </form>
        {hint ? <p className="hint">{hint}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
      </section>
    </main>
  )
}

function Journey({ story }: { story: StoryContent }) {
  const [activeId, setActiveId] = useState(story.scenes[0]?.id)
  const [unlockedIds, setUnlockedIds] = useState(() => new Set([story.scenes[0]?.id].filter(Boolean)))
  const [effect, setEffect] = useState<EffectName>(story.effects[0] || 'petals')
  const [celebrating, setCelebrating] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null)
  const [quizResponse, setQuizResponse] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const activeScene = story.scenes.find((scene) => scene.id === activeId) || story.scenes[0]
  const activeIndex = story.scenes.findIndex((scene) => scene.id === activeScene.id)
  const photosById = useMemo(() => new Map(story.photos.map((photo) => [photo.id, photo])), [story.photos])
  const activePhotos = (activeScene.photoIds || []).map((id) => photosById.get(id)).filter(Boolean) as PhotoItem[]
  const progress = Math.round((unlockedIds.size / story.scenes.length) * 100)
  const days = daysBetween(story.meta.startDate)
  const track = story.playlist?.find((item) => item.src)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (soundEnabled) {
      audio.play().catch(() => setSoundEnabled(false))
    } else {
      audio.pause()
    }
  }, [soundEnabled])

  function unlockNext() {
    const next = story.scenes[activeIndex + 1]
    setUnlockedIds((current) => {
      const copy = new Set(current)
      copy.add(activeScene.id)
      if (next) copy.add(next.id)
      return copy
    })
    if (next) {
      setActiveId(next.id)
      setQuizResponse('')
    } else {
      setCelebrating(true)
      window.setTimeout(() => setCelebrating(false), 1600)
    }
  }

  function chooseOption(scene: Scene, optionIndex: number) {
    const option = scene.options?.[optionIndex]
    if (!option) return
    setQuizResponse(option.response)
    if (option.correct) {
      window.setTimeout(unlockNext, 520)
    }
  }

  const style = {
    '--accent': story.theme.accent,
    '--accent-2': story.theme.accent2,
    '--ink': story.theme.ink,
    '--paper': story.theme.paper,
  } as CSSProperties

  return (
    <main className="journey" style={style}>
      {track ? <audio ref={audioRef} src={track.src} loop preload="metadata" /> : null}
      <EffectLayer effect={effect} active={celebrating} />
      <header className="topbar">
        <div>
          <p className="eyebrow">{story.meta.location}</p>
          <h1>{story.meta.title}</h1>
        </div>
        <div className="metric-strip" aria-label="Journey stats">
          <Metric icon={<Heart />} label="Together" value={`${days} days`} />
          <Metric icon={<Images />} label="Photos" value={`${story.photos.length}`} />
          <Metric icon={<MapIcon />} label="Rooms" value={`${unlockedIds.size}/${story.scenes.length}`} />
        </div>
      </header>

      <section className="control-bar" aria-label="Experience controls">
        <div className="segmented" aria-label="Effect mode">
          {story.effects.map((item) => (
            <button
              key={item}
              type="button"
              className={clsx(item === effect && 'active')}
              onClick={() => setEffect(item)}
              aria-label={`Effect ${item}`}
              title={`Effect: ${item}`}
            >
              <Palette aria-hidden="true" />
              <span>{item}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className={clsx('icon-button', soundEnabled && 'active')}
          onClick={() => setSoundEnabled((value) => !value)}
          aria-label="Toggle music"
          title="Toggle music"
        >
          {soundEnabled ? <Volume2 aria-hidden="true" /> : <Music aria-hidden="true" />}
        </button>
      </section>

      <section className="workspace">
        <nav className="quest-map" aria-label="Memory rooms">
          <div className="progress-rail">
            <span style={{ height: `${progress}%` }} />
          </div>
          {story.scenes.map((scene, index) => {
            const unlocked = unlockedIds.has(scene.id)
            return (
              <button
                type="button"
                key={scene.id}
                disabled={!unlocked}
                className={clsx('map-node', activeScene.id === scene.id && 'active', unlocked && 'unlocked')}
                onClick={() => setActiveId(scene.id)}
              >
                <span className="node-index">{String(index + 1).padStart(2, '0')}</span>
                <span>
                  <strong>{scene.title}</strong>
                  <small>{unlocked ? scene.eyebrow : 'Locked'}</small>
                </span>
              </button>
            )
          })}
        </nav>

        <section className="scene-window" aria-live="polite">
          <div className="window-chrome">
            <span />
            <span />
            <span />
            <p>{story.meta.coupleName}</p>
          </div>
          <div className="scene-grid">
            <div className="scene-copy">
              <p className="eyebrow">{activeScene.eyebrow}</p>
              <h2>{activeScene.title}</h2>
              <p>{activeScene.body}</p>

              {activeScene.kind === 'quiz' && activeScene.options ? (
                <div className="quiz-block">
                  <h3>{activeScene.prompt}</h3>
                  <div className="quiz-options">
                    {activeScene.options.map((option, index) => (
                      <button key={option.label} type="button" onClick={() => chooseOption(activeScene, index)}>
                        <Check aria-hidden="true" />
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {quizResponse ? <p className="quiz-response">{quizResponse}</p> : null}
                </div>
              ) : null}

              <div className="scene-actions">
                <button type="button" className="primary-action" onClick={unlockNext}>
                  <Gift aria-hidden="true" />
                  {activeIndex === story.scenes.length - 1 ? 'Celebrate' : activeScene.unlockText || 'Continue'}
                </button>
                <button type="button" className="secondary-action" onClick={() => setCelebrating(true)}>
                  <Wand2 aria-hidden="true" />
                  Spark
                </button>
              </div>
            </div>

            <div className="photo-stack" aria-label="Scene photos">
              {activePhotos.map((photo, index) => (
                <button
                  type="button"
                  key={photo.id}
                  className="feature-photo"
                  style={{ '--tilt': `${index % 2 === 0 ? -2 : 2}deg` } as CSSProperties}
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img src={photo.src} alt={photo.alt} />
                  <span>{photo.caption}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="vault-panel">
          <p className="eyebrow">Vault</p>
          <h2>{story.meta.subtitle}</h2>
          <div className="signature-card">
            <Sparkles aria-hidden="true" />
            <p>{story.meta.signature}</p>
          </div>
          <div className="mini-gallery">
            {story.photos.slice(0, 6).map((photo) => (
              <button type="button" key={photo.id} onClick={() => setSelectedPhoto(photo)}>
                <img src={photo.src} alt={photo.alt} />
              </button>
            ))}
          </div>
        </aside>
      </section>

      <section className="album-wall" aria-label="All memories">
        <div>
          <p className="eyebrow">Daily gallery</p>
          <h2>Replace the samples with your own timeline.</h2>
        </div>
        <div className="album-grid">
          {story.photos.map((photo) => (
            <button type="button" key={photo.id} className="album-card" onClick={() => setSelectedPhoto(photo)}>
              <img src={photo.src} alt={photo.alt} />
              <span>
                <Camera aria-hidden="true" />
                {photo.date || 'Memory'}
              </span>
              <strong>{photo.caption}</strong>
            </button>
          ))}
        </div>
      </section>

      {selectedPhoto ? <PhotoModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} /> : null}
    </main>
  )
}

function Metric({ icon, label, value }: { icon: ReactElement; label: string; value: string }) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function PhotoModal({ photo, onClose }: { photo: PhotoItem; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={photo.caption}>
      <div className="photo-modal">
        <button type="button" className="icon-button close" onClick={onClose} aria-label="Close">
          <X aria-hidden="true" />
        </button>
        <img src={photo.src} alt={photo.alt} />
        <div>
          <p className="eyebrow">{[photo.date, photo.location].filter(Boolean).join(' / ')}</p>
          <h2>{photo.caption}</h2>
        </div>
      </div>
    </div>
  )
}

function EffectLayer({ effect, active }: { effect: EffectName; active: boolean }) {
  const particles = useMemo(
    () =>
      Array.from({ length: effect === 'matrix' ? 54 : 42 }, (_, index) => ({
        id: index,
        left: `${(index * 37) % 100}%`,
        delay: `${(index % 12) * 0.21}s`,
        duration: `${5 + (index % 7) * 0.55}s`,
        angle: `${index * 29}deg`,
      })),
    [effect],
  )

  return (
    <div className={clsx('effect-layer', `effect-${effect}`, active && 'celebrate')} aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          style={
            {
              '--left': particle.left,
              '--delay': particle.delay,
              '--duration': particle.duration,
              '--angle': particle.angle,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

function daysBetween(startDate: string): number {
  const start = new Date(`${startDate}T00:00:00`)
  if (Number.isNaN(start.getTime())) return 0
  const now = new Date()
  const diff = now.getTime() - start.getTime()
  return Math.max(0, Math.floor(diff / 86_400_000))
}

export default App
