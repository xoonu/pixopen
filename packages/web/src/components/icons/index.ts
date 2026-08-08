import {
  Add01Icon,
  AiImageIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ChartCandlestickIcon,
  CloudIcon,
  MusicNote01Icon,
  ComputerIcon,
  Copy01Icon,
  Delete02Icon,
  EraserIcon,
  Folder01Icon,
  Image01Icon,
  InstagramIcon,
  LayerAddIcon,
  LiveStreaming01Icon,
  MoreHorizontalIcon,
  Note01Icon,
  PaintBoardIcon,
  PaintBucketIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  RadioIcon,
  RedoIcon,
  UndoIcon,
  Video01Icon,
} from '@hugeicons/core-free-icons';

/** Semantic icon map for Pixopen — all from Huge Icons (MIT). */
export const icons = {
  /** Main nav: Projects */
  projects: Folder01Icon,
  /** Main nav: Studio */
  studio: PaintBoardIcon,
  /** Main nav: Devices */
  devices: ComputerIcon,
  /** Create new project */
  add: Add01Icon,
  /** Project template: image frame */
  imageFrame: Image01Icon,
  /** Project template: animator */
  animator: Video01Icon,
  /** Project template: live sign */
  liveSign: LiveStreaming01Icon,
  /** Project template: flip note */
  flipNote: Note01Icon,
  /** Project template: stock ticker */
  stockTicker: ChartCandlestickIcon,
  /** Project template: weather frame */
  weatherFrame: CloudIcon,
  /** Project template: DVD screensaver */
  dvdScreensaver: PlayIcon,
  /** Project template: Spotify now playing */
  spotifyNowPlaying: MusicNote01Icon,
  /** Project template: AI Muse feed */
  aiMuse: AiImageIcon,
  /** Project template: Instagram feed */
  instagramFeed: InstagramIcon,
  /** Project template: On Air status sign */
  onAir: RadioIcon,
  /** Editor: pencil tool */
  pencil: PencilIcon,
  /** Editor: eraser tool */
  eraser: EraserIcon,
  /** Editor: fill tool */
  fill: PaintBucketIcon,
  /** Editor: live region tool */
  liveArea: LayerAddIcon,
  /** Editor: undo */
  undo: UndoIcon,
  /** Editor: redo */
  redo: RedoIcon,
  /** Playback: play */
  play: PlayIcon,
  /** Playback: pause */
  pause: PauseIcon,
  /** Actions: duplicate */
  duplicate: Copy01Icon,
  /** Actions: delete */
  delete: Delete02Icon,
  /** Actions: overflow menu */
  more: MoreHorizontalIcon,
  /** Navigation: previous */
  arrowLeft: ArrowLeft01Icon,
  /** Navigation: next */
  arrowRight: ArrowRight01Icon,
} as const;

export type IconName = keyof typeof icons;

export { Icon } from './Icon';
