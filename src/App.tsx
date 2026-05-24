import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, ReactElement } from 'react'
import clsx from 'clsx'
import {
  Camera,
  Check,
  ChevronRight,
  Gift,
  Globe2,
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
import { DEFAULT_LANGUAGE, LANGUAGE_LABELS, UI_TEXT, localizeStory } from './i18n'
import { decryptStory, verifyAccessCode } from './lib/crypto'
import { loadStory } from './lib/storyLoader'
import type { EffectName, EncryptedStoryBundle, LanguageCode, PhotoItem, Scene, StoryContent } from './types'

type AuthMode = 'plain' | 'encrypted'
type ErrorKey = '' | 'loadFailed' | 'passwordRejected' | 'codeRejected'

function App() {
  const [story, setStory] = useState<StoryContent | null>(null)
  const [bundle, setBundle] = useState<EncryptedStoryBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorKey, setErrorKey] = useState<ErrorKey>('')
  const [authenticated, setAuthenticated] = useState(false)
  const [language, setLanguage] = useState<LanguageCode>(() => {
    const saved = window.localStorage.getItem('heartfelt-language')
    return saved === 'en' ? 'en' : DEFAULT_LANGUAGE
  })

  const t = UI_TEXT[language]
  const localizedStory = story ? localizeStory(story, language) : null

  function changeLanguage(nextLanguage: LanguageCode) {
    setLanguage(nextLanguage)
    window.localStorage.setItem('heartfelt-language', nextLanguage)
  }

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
        if (alive) setErrorKey('loadFailed')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  async function unlockWithPassword(password: string) {
    setErrorKey('')
    if (bundle) {
      try {
        setStory(await decryptStory(bundle, password))
        setAuthenticated(true)
      } catch {
        setErrorKey('passwordRejected')
      }
      return
    }

    if (!story) return
    if (await verifyAccessCode(password, story.access?.codeHash)) {
      setAuthenticated(true)
    } else {
      setErrorKey('codeRejected')
    }
  }

  if (loading) return <StatusScreen label={t.loading} />
  if (!localizedStory && !bundle) return <StatusScreen label={errorKey ? t[errorKey] : t.noStory} />
  if (!localizedStory || !authenticated) {
    return (
      <LockScreen
        mode={bundle ? 'encrypted' : 'plain'}
        hint={localizedStory?.access?.hint}
        error={errorKey ? t[errorKey] : ''}
        language={language}
        onLanguageChange={changeLanguage}
        onUnlock={unlockWithPassword}
      />
    )
  }

  return <Journey story={localizedStory} language={language} onLanguageChange={changeLanguage} />
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
  language,
  onLanguageChange,
  onUnlock,
}: {
  mode: AuthMode
  hint?: string
  error: string
  language: LanguageCode
  onLanguageChange: (language: LanguageCode) => void
  onUnlock: (password: string) => Promise<void>
}) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const t = UI_TEXT[language]

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    await onUnlock(password)
    setBusy(false)
  }

  return (
    <main className="lock-screen">
      <LanguageSwitch language={language} onLanguageChange={onLanguageChange} floating />
      <section className="lock-panel" aria-label={t.privateEntrance}>
        <div className="lock-mark">
          {mode === 'encrypted' ? <ShieldCheck aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
        </div>
        <p className="eyebrow">{mode === 'encrypted' ? t.encryptedPack : t.privateEntrance}</p>
        <h1>{t.openQuest}</h1>
        <form onSubmit={submit} className="lock-form">
          <label htmlFor="password">{t.accessCode}</label>
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
            <button type="submit" disabled={busy || !password.trim()} aria-label={t.unlock}>
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

function Journey({
  story,
  language,
  onLanguageChange,
}: {
  story: StoryContent
  language: LanguageCode
  onLanguageChange: (language: LanguageCode) => void
}) {
  const [activeId, setActiveId] = useState(story.scenes[0]?.id)
  const [unlockedIds, setUnlockedIds] = useState(() => new Set([story.scenes[0]?.id].filter(Boolean)))
  const [effect, setEffect] = useState<EffectName>(story.effects[0] || 'petals')
  const [celebrating, setCelebrating] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null)
  const [quizResponse, setQuizResponse] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const t = UI_TEXT[language]

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
        <div className="topbar-side">
          <LanguageSwitch language={language} onLanguageChange={onLanguageChange} />
          <div className="metric-strip" aria-label={language === 'zh-CN' ? '探索统计' : 'Journey stats'}>
            <Metric icon={<Heart />} label={t.together} value={`${days} ${t.days}`} />
            <Metric icon={<Images />} label={t.photos} value={`${story.photos.length}`} />
            <Metric icon={<MapIcon />} label={t.rooms} value={`${unlockedIds.size}/${story.scenes.length}`} />
          </div>
        </div>
      </header>

      <section className="control-bar" aria-label={language === 'zh-CN' ? '体验控制' : 'Experience controls'}>
        <div className="segmented" aria-label={t.effectMode}>
          {story.effects.map((item) => (
            <button
              key={item}
              type="button"
              className={clsx(item === effect && 'active')}
              onClick={() => setEffect(item)}
              aria-label={`${t.effectTitle} ${t.effectNames[item]}`}
              title={`${t.effectTitle}: ${t.effectNames[item]}`}
            >
              <Palette aria-hidden="true" />
              <span>{t.effectNames[item]}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className={clsx('icon-button', soundEnabled && 'active')}
          onClick={() => setSoundEnabled((value) => !value)}
          aria-label={t.toggleMusic}
          title={t.toggleMusic}
        >
          {soundEnabled ? <Volume2 aria-hidden="true" /> : <Music aria-hidden="true" />}
        </button>
      </section>

      <section className="workspace">
        <nav className="quest-map" aria-label={t.memoryRooms}>
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
                  <small>{unlocked ? scene.eyebrow : t.locked}</small>
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
                  {activeIndex === story.scenes.length - 1 ? t.celebrate : activeScene.unlockText || t.continue}
                </button>
                <button type="button" className="secondary-action" onClick={() => setCelebrating(true)}>
                  <Wand2 aria-hidden="true" />
                  {t.spark}
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
          <p className="eyebrow">{t.vault}</p>
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

      <section className="album-wall" aria-label={language === 'zh-CN' ? '全部记忆' : 'All memories'}>
        <div>
          <p className="eyebrow">{t.dailyGallery}</p>
          <h2>{t.galleryHint}</h2>
        </div>
        <div className="album-grid">
          {story.photos.map((photo) => (
            <button type="button" key={photo.id} className="album-card" onClick={() => setSelectedPhoto(photo)}>
              <img src={photo.src} alt={photo.alt} />
              <span>
                <Camera aria-hidden="true" />
                {photo.date || t.memory}
              </span>
              <strong>{photo.caption}</strong>
            </button>
          ))}
        </div>
      </section>

      {selectedPhoto ? <PhotoModal photo={selectedPhoto} closeLabel={t.close} onClose={() => setSelectedPhoto(null)} /> : null}
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

function PhotoModal({ photo, closeLabel, onClose }: { photo: PhotoItem; closeLabel: string; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={photo.caption}>
      <div className="photo-modal">
        <button type="button" className="icon-button close" onClick={onClose} aria-label={closeLabel}>
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

function LanguageSwitch({
  language,
  floating = false,
  onLanguageChange,
}: {
  language: LanguageCode
  floating?: boolean
  onLanguageChange: (language: LanguageCode) => void
}) {
  const t = UI_TEXT[language]
  return (
    <div className={clsx('language-switch', floating && 'floating')} aria-label={t.language}>
      <Globe2 aria-hidden="true" />
      {(['zh-CN', 'en'] as const).map((item) => (
        <button
          type="button"
          key={item}
          className={clsx(language === item && 'active')}
          onClick={() => onLanguageChange(item)}
          aria-pressed={language === item}
        >
          {LANGUAGE_LABELS[item]}
        </button>
      ))}
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
