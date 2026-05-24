import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import clsx from 'clsx'
import {
  ChevronRight,
  Gamepad2,
  Globe2,
  Heart,
  KeyRound,
  LockKeyhole,
  Maximize2,
  Minimize2,
  Music,
  ShieldCheck,
  Sparkles,
  Volume2,
} from 'lucide-react'
import './App.css'
import { DEFAULT_LANGUAGE, LANGUAGE_LABELS, UI_TEXT, localizeStory } from './i18n'
import { decryptStory, verifyAccessCode } from './lib/crypto'
import { loadStory } from './lib/storyLoader'
import type { EncryptedStoryBundle, LanguageCode, PhotoItem, QuizOption, Scene, StoryContent } from './types'

type AuthMode = 'plain' | 'encrypted'
type ErrorKey = '' | 'loadFailed' | 'passwordRejected' | 'codeRejected'
type GameMode = 'intro' | 'dialog' | 'response' | 'photo' | 'transition' | 'ending'
type PendingAction = 'advance' | 'celebrate' | null
type SceneChoice = {
  label: string
  response: string
  action: 'advance' | 'stay' | 'photo' | 'celebrate'
  correct?: boolean
}

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

  return <ImmersiveGame story={localizedStory} language={language} onLanguageChange={changeLanguage} />
}

function StatusScreen({ label }: { label: string }) {
  return (
    <main className="status-screen">
      <LoveCanvas title={label} active />
      <div className="boot-card">
        <Sparkles aria-hidden="true" />
        <p>{label}</p>
      </div>
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
    <main className="game-shell">
      <LoveCanvas title="💗 心动纪念馆 💗" active />
      <LanguageSwitch language={language} onLanguageChange={onLanguageChange} />
      <section className="game-modal lock-modal" aria-label={t.privateEntrance}>
        <div className="modal-icon">
          {mode === 'encrypted' ? <ShieldCheck aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
        </div>
        <p className="kicker">{mode === 'encrypted' ? t.encryptedPack : t.privateEntrance}</p>
        <h1>{t.openQuest}</h1>
        <p className="dialog-text">
          {language === 'zh-CN'
            ? '输入口令后，主线会自动开始。接下来只需要跟着弹窗做选择。'
            : 'Enter the code and the main quest will start. Follow the pop-up choices from there.'}
        </p>
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

function ImmersiveGame({
  story,
  language,
  onLanguageChange,
}: {
  story: StoryContent
  language: LanguageCode
  onLanguageChange: (language: LanguageCode) => void
}) {
  const [mode, setMode] = useState<GameMode>('intro')
  const [sceneIndex, setSceneIndex] = useState(0)
  const [response, setResponse] = useState('')
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null)
  const [celebrating, setCelebrating] = useState(false)
  const [musicEnabled, setMusicEnabled] = useState(false)
  const [musicVolume, setMusicVolume] = useState(0.68)
  const [dialogCollapsed, setDialogCollapsed] = useState(false)
  const [typedBody, setTypedBody] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ambientRef = useRef<AmbientHandle | null>(null)

  const currentScene = story.scenes[sceneIndex] || story.scenes[0]
  const nextScene = story.scenes[sceneIndex + 1]
  const photosById = useMemo(() => new Map(story.photos.map((photo) => [photo.id, photo])), [story.photos])
  const scenePhotos = (currentScene.photoIds || []).map((id) => photosById.get(id)).filter(Boolean) as PhotoItem[]
  const featuredPhoto = selectedPhoto || scenePhotos[0] || story.photos[0]
  const track = story.playlist?.find((item) => item.src)
  const progress = Math.round(((sceneIndex + 1) / story.scenes.length) * 100)

  useEffect(() => {
    if (mode !== 'dialog') return
    let index = 0
    const resetTimer = window.setTimeout(() => setTypedBody(''), 0)
    const text = currentScene.body
    const timer = window.setInterval(() => {
      index += 1
      setTypedBody(text.slice(0, index))
      if (index >= text.length) window.clearInterval(timer)
    }, 24)
    return () => {
      window.clearTimeout(resetTimer)
      window.clearInterval(timer)
    }
  }, [currentScene.body, mode])

  useEffect(() => {
    return () => {
      ambientRef.current?.stop()
    }
  }, [])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = musicVolume
    ambientRef.current?.setVolume(musicVolume)
  }, [musicVolume])

  function startGame() {
    activateMusic()
    setDialogCollapsed(false)
    setMode('dialog')
  }

  function activateMusic() {
    const audio = audioRef.current
    if (track && audio) {
      audio.volume = musicVolume
      audio.play().then(() => setMusicEnabled(true)).catch(() => setMusicEnabled(false))
      return
    }
    if (!ambientRef.current) ambientRef.current = startAmbientMusic(musicVolume)
    setMusicEnabled(true)
  }

  function deactivateMusic() {
    audioRef.current?.pause()
    ambientRef.current?.stop()
    ambientRef.current = null
    setMusicEnabled(false)
  }

  function toggleMusic() {
    if (musicEnabled) deactivateMusic()
    else activateMusic()
  }

  function handleChoice(choice: SceneChoice) {
    setResponse(choice.response)
    setPendingAction(null)
    if (choice.action === 'photo') {
      setSelectedPhoto(scenePhotos[0] || story.photos[0] || null)
      setMode('photo')
      return
    }
    if (choice.action === 'celebrate') {
      setPendingAction('celebrate')
      setMode('response')
      return
    }
    if (choice.action === 'advance') {
      setPendingAction('advance')
      setMode('response')
      return
    }
    setMode('response')
  }

  function continueAfterResponse() {
    if (pendingAction === 'celebrate' || !nextScene) {
      setCelebrating(true)
      setMode('ending')
      setPendingAction(null)
      return
    }

    if (pendingAction === 'advance') {
      setMode('transition')
      window.setTimeout(() => {
        setSceneIndex((value) => value + 1)
        setSelectedPhoto(null)
        setResponse('')
        setPendingAction(null)
        setMode('dialog')
      }, 720)
      return
    }

    resumeDialog()
  }

  function resumeDialog() {
    setResponse('')
    setPendingAction(null)
    setDialogCollapsed(false)
    setMode('dialog')
  }

  const choices = buildChoices(currentScene, Boolean(nextScene), language)
  const shellStyle = {
    '--accent': story.theme.accent,
    '--accent-2': story.theme.accent2,
    '--ink': story.theme.ink,
    '--paper': story.theme.paper,
  } as CSSProperties

  return (
    <main className={clsx('game-shell', `scene-${currentScene.kind}`, celebrating && 'celebrating')} style={shellStyle}>
      {track ? <audio ref={audioRef} src={track.src} loop preload="metadata" /> : null}
      <LoveCanvas title={story.meta.title} active={musicEnabled || celebrating} />
      <LanguageSwitch language={language} onLanguageChange={onLanguageChange} />
      <div className="music-controls">
        <button
          type="button"
          className={clsx('music-pill', musicEnabled && 'active')}
          onClick={toggleMusic}
        >
          <Music aria-hidden="true" />
          {language === 'zh-CN' ? (musicEnabled ? '甜甜 BGM 开' : '开启 BGM') : musicEnabled ? 'BGM on' : 'Start BGM'}
        </button>
        <label className="volume-control">
          <Volume2 aria-hidden="true" />
          <span>{language === 'zh-CN' ? '音量' : 'Volume'}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={musicVolume}
            onChange={(event) => setMusicVolume(Number(event.currentTarget.value))}
            aria-label={language === 'zh-CN' ? '背景音乐音量' : 'Background music volume'}
          />
        </label>
      </div>

      <div className="quest-hud" aria-label={language === 'zh-CN' ? '主线进度' : 'Quest progress'}>
        <span>{String(sceneIndex + 1).padStart(2, '0')}</span>
        <div>
          <strong>{currentScene.eyebrow}</strong>
          <i style={{ width: `${progress}%` }} />
        </div>
      </div>

      <section className="memory-stage" aria-live="polite">
        {mode === 'intro' ? (
          dialogCollapsed ? (
            <CollapsedDialogTab language={language} onExpand={() => setDialogCollapsed(false)} />
          ) : (
            <IntroPanel
              story={story}
              language={language}
              onStart={startGame}
              onCollapse={() => setDialogCollapsed(true)}
            />
          )
        ) : (
          <>
            <PhotoPortal photo={featuredPhoto} mode={mode} />
            {dialogCollapsed ? (
              <CollapsedDialogTab language={language} onExpand={() => setDialogCollapsed(false)} />
            ) : mode === 'photo' ? (
              <PhotoViewActions
                response={response}
                language={language}
                onResume={resumeDialog}
                onCollapse={() => setDialogCollapsed(true)}
              />
            ) : (
              <DialogPanel
                story={story}
                scene={currentScene}
                mode={mode}
                typedBody={typedBody}
                response={response}
                pendingAction={pendingAction}
                choices={choices}
                language={language}
                onChoice={handleChoice}
                onResume={resumeDialog}
                onContinue={continueAfterResponse}
                onCollapse={() => setDialogCollapsed(true)}
              />
            )}
          </>
        )}
      </section>

      <div className="tap-hint">
        {language === 'zh-CN' ? '跟随弹窗选择推进主线' : 'Follow the pop-up choices to advance'}
      </div>
    </main>
  )
}

function IntroPanel({
  story,
  language,
  onStart,
  onCollapse,
}: {
  story: StoryContent
  language: LanguageCode
  onStart: () => void
  onCollapse: () => void
}) {
  return (
    <section className="game-modal intro-modal">
      <FoldButton language={language} onCollapse={onCollapse} />
      <div className="modal-icon">
        <Gamepad2 aria-hidden="true" />
      </div>
      <p className="kicker">{story.meta.location}</p>
      <h1>{story.meta.title}</h1>
      <p className="dialog-text">
        {language === 'zh-CN'
          ? '这是一条已经写好的主线。你不需要找菜单，也不需要翻页面，只要按弹窗做选择，记忆会自己打开。'
          : 'This is a guided main quest. No menus, no page hunting. Choose from each pop-up and the memories will open by themselves.'}
      </p>
      <button type="button" className="choice-button primary" onClick={onStart}>
        <Heart aria-hidden="true" />
        {language === 'zh-CN' ? '开始主线' : 'Start quest'}
      </button>
    </section>
  )
}

function DialogPanel({
  story,
  scene,
  mode,
  typedBody,
  response,
  pendingAction,
  choices,
  language,
  onChoice,
  onResume,
  onContinue,
  onCollapse,
}: {
  story: StoryContent
  scene: Scene
  mode: GameMode
  typedBody: string
  response: string
  pendingAction: PendingAction
  choices: SceneChoice[]
  language: LanguageCode
  onChoice: (choice: SceneChoice) => void
  onResume: () => void
  onContinue: () => void
  onCollapse: () => void
}) {
  if (mode === 'transition') {
    return (
      <section className="game-modal dialog-modal transition-modal">
        <FoldButton language={language} onCollapse={onCollapse} />
        <p className="kicker">{language === 'zh-CN' ? '主线推进中' : 'Quest advancing'}</p>
        <h2>{language === 'zh-CN' ? '下一段记忆正在加载...' : 'Loading the next memory...'}</h2>
      </section>
    )
  }

  if (mode === 'ending') {
    return (
      <section className="game-modal dialog-modal ending-modal">
        <FoldButton language={language} onCollapse={onCollapse} />
        <p className="kicker">{language === 'zh-CN' ? '最终房间已打开' : 'Final room unlocked'}</p>
        <h2>{scene.title}</h2>
        <p className="dialog-text">{response || scene.body}</p>
        <p className="signature">{story.meta.signature}</p>
      </section>
    )
  }

  if (mode === 'response') {
    const canContinue = Boolean(pendingAction)
    return (
      <section className="game-modal dialog-modal">
        <FoldButton language={language} onCollapse={onCollapse} />
        <p className="kicker">{scene.eyebrow}</p>
        <h2>{scene.title}</h2>
        <p className="dialog-text">{response}</p>
        <button type="button" className="choice-button primary" onClick={canContinue ? onContinue : onResume}>
          <ChevronRight aria-hidden="true" />
          {canContinue
            ? language === 'zh-CN'
              ? '看完了，继续下一步'
              : 'Continue after reading'
            : language === 'zh-CN'
              ? '回到弹窗选择'
              : 'Back to choices'}
        </button>
      </section>
    )
  }

  return (
    <section className="game-modal dialog-modal">
      <FoldButton language={language} onCollapse={onCollapse} />
      <p className="kicker">{scene.eyebrow}</p>
      <h2>{scene.title}</h2>
      <p className="dialog-text typing">{typedBody}</p>
      <div className="choice-grid">
        {choices.map((choice) => (
          <button
            type="button"
            key={choice.label}
            className={clsx('choice-button', choice.action === 'advance' && 'primary')}
            onClick={() => onChoice(choice)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </section>
  )
}

function PhotoViewActions({
  response,
  language,
  onResume,
  onCollapse,
}: {
  response: string
  language: LanguageCode
  onResume: () => void
  onCollapse: () => void
}) {
  return (
    <aside className="photo-actions" aria-label={language === 'zh-CN' ? '照片查看操作' : 'Photo actions'}>
      <FoldButton language={language} onCollapse={onCollapse} />
      <p>{response}</p>
      <button type="button" className="choice-button primary" onClick={onResume}>
        <ChevronRight aria-hidden="true" />
        {language === 'zh-CN' ? '看完了，回到选择' : 'Back to choices'}
      </button>
    </aside>
  )
}

function FoldButton({ language, onCollapse }: { language: LanguageCode; onCollapse: () => void }) {
  const label = language === 'zh-CN' ? '折叠弹窗' : 'Collapse dialog'
  return (
    <button type="button" className="fold-button" onClick={onCollapse} aria-label={label} title={label}>
      <Minimize2 aria-hidden="true" />
    </button>
  )
}

function CollapsedDialogTab({ language, onExpand }: { language: LanguageCode; onExpand: () => void }) {
  return (
    <button
      type="button"
      className="dialog-edge-tab"
      onClick={onExpand}
      aria-label={language === 'zh-CN' ? '展开弹窗' : 'Expand dialog'}
      title={language === 'zh-CN' ? '展开弹窗' : 'Expand dialog'}
    >
      <Maximize2 aria-hidden="true" />
      <span>{language === 'zh-CN' ? '展开' : 'Open'}</span>
    </button>
  )
}

function PhotoPortal({ photo, mode }: { photo?: PhotoItem | null; mode: GameMode }) {
  if (!photo) return null
  return (
    <div className={clsx('photo-portal', mode === 'photo' && 'spotlight')}>
      <img src={photo.src} alt={photo.alt} />
      <div>
        <strong>{photo.date}</strong>
        <p>{photo.caption}</p>
      </div>
    </div>
  )
}

function LoveCanvas({ title, active }: { title: string; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvasElement = canvasRef.current
    if (!canvasElement) return
    const drawingContext = canvasElement.getContext('2d')
    if (!drawingContext) return
    const canvasSurface: HTMLCanvasElement = canvasElement
    const context: CanvasRenderingContext2D = drawingContext

    let frame = 0
    let raf = 0
    const particles = Array.from({ length: 560 }, (_, index) => ({
      seed: index * 17,
      t: Math.random() * Math.PI * 2,
      orbit: 0.2 + Math.random() * 1.04,
      layer: index % 3,
      size: 4 + Math.random() * 8,
      speed: 0.0018 + Math.random() * 0.003,
      alpha: 0.35 + Math.random() * 0.55,
    }))
    const floaters = Array.from({ length: 14 }, (_, index) => ({
      text: index % 5 === 0 ? title : index % 2 === 0 ? '💗' : '520',
      x: Math.random(),
      y: Math.random(),
      speed: 0.16 + Math.random() * 0.22,
      size: index % 5 === 0 ? 20 + Math.random() * 12 : 18 + Math.random() * 20,
      alpha: index % 5 === 0 ? 0.1 + Math.random() * 0.08 : 0.22 + Math.random() * 0.24,
    }))

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = window.innerWidth
      const height = window.innerHeight
      canvasSurface.width = Math.floor(width * dpr)
      canvasSurface.height = Math.floor(height * dpr)
      canvasSurface.style.width = `${width}px`
      canvasSurface.style.height = `${height}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function heartPoint(t: number, scale: number) {
      const x = 16 * Math.sin(t) ** 3
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
      return { x: x * scale, y: -y * scale }
    }

    function drawHeart(x: number, y: number, size: number, color: string, alpha: number) {
      context.save()
      context.translate(x, y)
      context.scale(size, size)
      context.globalAlpha = alpha
      context.fillStyle = color
      context.beginPath()
      context.moveTo(0, 0.35)
      context.bezierCurveTo(0.7, 1, 1.45, -0.18, 0, -0.74)
      context.bezierCurveTo(-1.45, -0.18, -0.7, 1, 0, 0.35)
      context.closePath()
      context.fill()
      context.restore()
    }

    function render() {
      const width = window.innerWidth
      const height = window.innerHeight
      frame += active ? 1 : 0.38
      context.clearRect(0, 0, width, height)
      context.fillStyle = '#0b0b0d'
      context.fillRect(0, 0, width, height)

      const cx = width / 2
      const cy = height / 2 - height * 0.09
      const base = Math.min(width, height) * 0.016
      const pulse = 1 + Math.sin(frame * 0.06) * 0.14
      const swayX = Math.sin(frame * 0.012) * Math.min(width, height) * 0.018
      const swayY = Math.cos(frame * 0.01) * Math.min(width, height) * 0.012
      const colors = ['#ff5f9f', '#ff7fb0', '#ff96bf', '#ffc3d6', '#c9fff2']

      particles.forEach((particle, index) => {
        particle.t += particle.speed * (active ? 1.8 : 1)
        const layerScale = [0.86, 1, 1.15][particle.layer]
        const point = heartPoint(particle.t + particle.seed, base * pulse * particle.orbit * layerScale)
        const drift = Math.sin(frame * 0.02 + particle.seed) * 4
        drawHeart(cx + swayX + point.x + drift, cy + swayY + point.y, particle.size, colors[index % colors.length], particle.alpha)
      })

      floaters.forEach((floater, index) => {
        floater.y -= floater.speed / Math.max(height, 1)
        floater.x += Math.sin(frame * 0.01 + index) * 0.0008
        if (floater.y < -0.1) {
          floater.y = 1.08
          floater.x = Math.random()
        }
        context.save()
        context.globalAlpha = floater.alpha
        context.fillStyle = index % 2 === 0 ? '#ffd1e2' : '#c9fff2'
        context.font = `700 ${floater.size}px "Microsoft YaHei", system-ui, sans-serif`
        context.translate(floater.x * width, floater.y * height)
        context.rotate(Math.sin(frame * 0.008 + index) * 0.08)
        context.fillText(floater.text, 0, 0)
        context.restore()
      })

      raf = requestAnimationFrame(render)
    }

    resize()
    window.addEventListener('resize', resize)
    render()
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [active, title])

  return <canvas ref={canvasRef} className="love-canvas" aria-hidden="true" />
}

function LanguageSwitch({
  language,
  onLanguageChange,
}: {
  language: LanguageCode
  onLanguageChange: (language: LanguageCode) => void
}) {
  return (
    <div className="language-switch" aria-label={UI_TEXT[language].language}>
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

function buildChoices(scene: Scene, hasNext: boolean, language: LanguageCode): SceneChoice[] {
  if (scene.kind === 'quiz' && scene.options?.length) {
    return scene.options.map((option: QuizOption) => ({
      label: option.label,
      response: option.response,
      correct: option.correct,
      action: option.correct ? 'advance' : 'stay',
    }))
  }

  if (scene.kind === 'gallery') {
    return [
      {
        label: language === 'zh-CN' ? '打开一张记忆照片' : 'Open a memory photo',
        response: language === 'zh-CN' ? '照片被点亮了。先看这一张，然后继续主线。' : 'The photo lights up. Take a look, then continue.',
        action: 'photo',
      },
      {
        label: language === 'zh-CN' ? '继续下一关' : 'Continue quest',
        response: language === 'zh-CN' ? '图集检查点通过，下一段主线已解锁。' : 'Gallery checkpoint cleared. The next memory is unlocked.',
        action: hasNext ? 'advance' : 'celebrate',
      },
    ]
  }

  if (scene.kind === 'finale') {
    return [
      {
        label: language === 'zh-CN' ? '启动最终庆祝' : 'Launch final celebration',
        response: language === 'zh-CN' ? '所有记忆房间都打开了。现在进入只属于你们的庆祝模式。' : 'All rooms are open. Enter celebration mode.',
        action: 'celebrate',
      },
      {
        label: language === 'zh-CN' ? '再停留一会儿' : 'Stay a little longer',
        response: language === 'zh-CN' ? '那就再让心跳和星光多停留一会儿。' : 'Then let the heartbeat and stars stay a little longer.',
        action: 'stay',
      },
    ]
  }

  return [
    {
      label: scene.unlockText || (language === 'zh-CN' ? '继续主线' : 'Continue quest'),
      response: language === 'zh-CN' ? '选择已确认，下一段记忆正在打开。' : 'Choice confirmed. Opening the next memory.',
      action: hasNext ? 'advance' : 'celebrate',
    },
    {
      label: language === 'zh-CN' ? '先看看这张照片' : 'Look at this photo first',
      response: language === 'zh-CN' ? '这张照片被临时放大了。看完后会回到主线弹窗。' : 'This photo is enlarged for a moment. Return to the quest after viewing.',
      action: 'photo',
    },
    {
      label: language === 'zh-CN' ? '害羞，等一下' : 'Wait a second',
      response: language === 'zh-CN' ? '没关系，主线会等你。准备好以后再继续。' : 'No rush. The quest will wait until you are ready.',
      action: 'stay',
    },
  ]
}

type AmbientHandle = {
  stop: () => void
  setVolume: (volume: number) => void
}

function startAmbientMusic(initialVolume: number): AmbientHandle {
  const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return { stop() {}, setVolume() {} }
  const context = new AudioContextClass()
  void context.resume()
  const master = context.createGain()
  let currentVolume = clampVolume(initialVolume)
  master.gain.value = 0.08 * currentVolume
  master.connect(context.destination)

  const notes = [261.63, 329.63, 392, 523.25]
  const oscillators = notes.map((frequency, index) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = index % 2 === 0 ? 'sine' : 'triangle'
    oscillator.frequency.value = frequency
    gain.gain.value = 0.22 / notes.length
    oscillator.connect(gain)
    gain.connect(master)
    oscillator.start()
    return oscillator
  })

  const timer = window.setInterval(() => {
    const now = context.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(master.gain.value, now)
    master.gain.linearRampToValueAtTime(0.1 * currentVolume, now + 0.4)
    master.gain.linearRampToValueAtTime(0.065 * currentVolume, now + 1.6)
  }, 2200)
  const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 659.25, 523.25, 392]
  let step = 0
  const melodyTimer = window.setInterval(() => {
    const now = context.currentTime
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = melody[step % melody.length]
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42)
    oscillator.connect(gain)
    gain.connect(master)
    oscillator.start(now)
    oscillator.stop(now + 0.44)
    step += 1
  }, 420)

  return {
    setVolume(volume: number) {
      currentVolume = clampVolume(volume)
      const now = context.currentTime
      master.gain.cancelScheduledValues(now)
      master.gain.setTargetAtTime(0.08 * currentVolume, now, 0.08)
    },
    stop() {
      window.clearInterval(timer)
      window.clearInterval(melodyTimer)
      oscillators.forEach((oscillator) => oscillator.stop())
      context.close()
    },
  }
}

function clampVolume(volume: number) {
  return Math.min(1, Math.max(0, volume))
}

export default App
