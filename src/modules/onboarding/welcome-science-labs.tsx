'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type ComponentType,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  motion,
  useReducedMotion,
  type PanInfo,
} from 'framer-motion';
import {
  PiArrowUp as ArrowUp,
  PiFlask as Flask,
  PiSun as Sun,
  PiWaveSine as WaveSine,
} from 'react-icons/pi';
import { Range } from '@/components/ui/range';
import { cn } from '@/src/lib/utils';

const CARD_HEIGHT = 414;
const WAVE_VIEWBOX_WIDTH = 248;
const WAVE_VIEWBOX_HEIGHT = 128;
const WAVE_CENTER_Y = WAVE_VIEWBOX_HEIGHT / 2;
const DECK_DEPTH_STYLES = [
  { y: 0, scale: 1, opacity: 1 },
  { y: 16, scale: 0.985, opacity: 1 },
  { y: 32, scale: 0.97, opacity: 1 },
] as const;
const SWIPE_DISTANCE = 64;
const SWIPE_VELOCITY = 500;
const DECK_EXIT_DURATION_MS = 340;

type LabId = 'wave' | 'chemistry' | 'light';
const LAB_IDS: LabId[] = ['wave', 'chemistry', 'light'];

type LabCopy = {
  eyebrow: string;
  title: string;
  hint: string;
};

export type WelcomeScienceLabsCopy = {
  label: string;
  nextLab: string;
  swipeHint: string;
  position: string;
  wave: LabCopy & {
    frequency: string;
    amplitude: string;
    frequencyUnit: string;
    amplitudeUnit: string;
  };
  chemistry: LabCopy & {
    acid: string;
    base: string;
    volumeUnit: string;
    phLabel: string;
  };
  light: LabCopy & {
    wavelength: string;
    intensity: string;
    wavelengthUnit: string;
    intensityUnit: string;
  };
};

function formatPosition(template: string, current: number, total: number) {
  return template
    .replace('{{current}}', String(current))
    .replace('{{total}}', String(total));
}

function createWavePath(frequency: number, amplitude: number): string {
  const segments = 64;
  const cycles = frequency * 0.72;
  const amplitudePixels = 9 + amplitude * 0.29;
  const points = Array.from({ length: segments + 1 }, (_, index) => {
    const x = (index / segments) * WAVE_VIEWBOX_WIDTH;
    const phase = (index / segments) * cycles * Math.PI * 2;
    const y = WAVE_CENTER_Y - Math.sin(phase) * amplitudePixels;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  });
  return points.join(' ');
}

function wavelengthToRgb(wavelength: number, intensity: number): string {
  let red = 0;
  let green = 0;
  let blue = 0;

  if (wavelength < 440) {
    red = -(wavelength - 440) / 60;
    blue = 1;
  } else if (wavelength < 490) {
    green = (wavelength - 440) / 50;
    blue = 1;
  } else if (wavelength < 510) {
    green = 1;
    blue = -(wavelength - 510) / 20;
  } else if (wavelength < 580) {
    red = (wavelength - 510) / 70;
    green = 1;
  } else if (wavelength < 645) {
    red = 1;
    green = -(wavelength - 645) / 65;
  } else {
    red = 1;
  }

  const edgeAttenuation =
    wavelength < 420
      ? 0.3 + (0.7 * (wavelength - 380)) / 40
      : wavelength > 700
        ? 0.3 + (0.7 * (780 - wavelength)) / 80
        : 1;
  const brightness = edgeAttenuation * (intensity / 100);
  const channel = (value: number) =>
    Math.round(255 * Math.pow(Math.max(0, value) * brightness, 0.8));

  return `rgb(${channel(red)} ${channel(green)} ${channel(blue)})`;
}

const PH_COLOR_STOPS = [
  { ph: 0, color: [218, 58, 69] },
  { ph: 3, color: [240, 131, 49] },
  { ph: 6, color: [226, 204, 50] },
  { ph: 7, color: [41, 183, 101] },
  { ph: 9, color: [37, 166, 232] },
  { ph: 11, color: [49, 94, 234] },
  { ph: 14, color: [111, 53, 216] },
] as const;

function calculateMixedPh(acidVolume: number, baseVolume: number): number {
  if (acidVolume === baseVolume) {
    return 7;
  }

  const totalVolumeLiters = Math.max(0.001, (acidVolume + baseVolume) / 1000);
  const excessMoles = (Math.abs(acidVolume - baseVolume) / 1000) * 0.1;
  const excessConcentration = excessMoles / totalVolumeLiters;

  if (acidVolume > baseVolume) {
    return Math.max(0, Math.min(7, -Math.log10(excessConcentration)));
  }

  const pOH = -Math.log10(excessConcentration);
  return Math.max(7, Math.min(14, 14 - pOH));
}

function phToColor(ph: number): string {
  const upperIndex = PH_COLOR_STOPS.findIndex((stop) => stop.ph >= ph);
  if (upperIndex <= 0) {
    const [red, green, blue] = PH_COLOR_STOPS[0].color;
    return `rgb(${red} ${green} ${blue})`;
  }

  const lower = PH_COLOR_STOPS[upperIndex - 1];
  const upper = PH_COLOR_STOPS[upperIndex];
  const progress = (ph - lower.ph) / (upper.ph - lower.ph);
  const channels = lower.color.map((channel, index) =>
    Math.round(channel + (upper.color[index] - channel) * progress),
  );
  return `rgb(${channels[0]} ${channels[1]} ${channels[2]})`;
}

function LabControl({
  id,
  label,
  valueLabel,
  min,
  max,
  step,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-xs">
        <label htmlFor={id} className="font-medium text-foreground">
          {label}
        </label>
        <output htmlFor={id} className="tabular-nums text-muted-foreground">
          {valueLabel}
        </output>
      </div>
      <Range
        id={id}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        aria-label={label}
        className="mt-1"
      />
    </div>
  );
}

function LabCardFrame({
  eyebrow,
  title,
  icon: Icon,
  position,
  nextLabLabel,
  swipeHint,
  interactive,
  onNext,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  position: string;
  nextLabLabel: string;
  swipeHint: string;
  interactive: boolean;
  onNext: () => void;
  children: ReactNode;
}) {
  const stopDrag = (event: ReactPointerEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  return (
    <article
      className="flex h-full flex-col overflow-hidden rounded-[28px] border border-border/75 bg-background"
      aria-label={`${eyebrow}: ${title}`}
    >
      <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-5">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 text-[11px] font-medium text-muted-foreground">
            <span className="truncate">{eyebrow}</span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0 tabular-nums">{position}</span>
          </div>
          <h2 className="mt-1 text-sm font-medium text-foreground">{title}</h2>
        </div>
        <div
          className="flex shrink-0 items-center gap-1"
          onPointerDown={stopDrag}
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <Icon className="h-4 w-4" />
          </span>
          <button
            type="button"
            disabled={!interactive}
            onClick={onNext}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none"
            aria-label={nextLabLabel}
            title={nextLabLabel}
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {children}

      <p className="sr-only">{swipeHint}</p>
    </article>
  );
}

function WaveLab({
  copy,
  position,
  nextLabLabel,
  swipeHint,
  active,
  frequency,
  amplitude,
  onFrequencyChange,
  onAmplitudeChange,
  onNext,
}: {
  copy: WelcomeScienceLabsCopy['wave'];
  position: string;
  nextLabLabel: string;
  swipeHint: string;
  active: boolean;
  frequency: number;
  amplitude: number;
  onFrequencyChange: (value: number) => void;
  onAmplitudeChange: (value: number) => void;
  onNext: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const frequencyId = useId();
  const amplitudeId = useId();
  const wavePath = useMemo(
    () => createWavePath(frequency, amplitude),
    [frequency, amplitude],
  );

  return (
    <LabCardFrame
      eyebrow={copy.eyebrow}
      title={copy.title}
      icon={WaveSine}
      position={position}
      nextLabLabel={nextLabLabel}
      swipeHint={swipeHint}
      interactive={active}
      onNext={onNext}
    >
      <div className="mx-3 overflow-hidden rounded-2xl bg-muted/25">
        <svg
          viewBox={`0 0 ${WAVE_VIEWBOX_WIDTH} ${WAVE_VIEWBOX_HEIGHT}`}
          className="block h-[140px] w-full"
          role="img"
          aria-label={copy.title}
        >
          <g className="text-border/70" aria-hidden="true">
            {[31, 62, 93, 124, 155, 186, 217].map((x) => (
              <line
                key={x}
                x1={x}
                y1="0"
                x2={x}
                y2={WAVE_VIEWBOX_HEIGHT}
                stroke="currentColor"
                strokeWidth="0.6"
              />
            ))}
            {[32, 64, 96].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2={WAVE_VIEWBOX_WIDTH}
                y2={y}
                stroke="currentColor"
                strokeWidth="0.6"
              />
            ))}
          </g>

          <line
            x1="0"
            y1={WAVE_CENTER_Y}
            x2={WAVE_VIEWBOX_WIDTH}
            y2={WAVE_CENTER_Y}
            className="text-border"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeDasharray="3 5"
            aria-hidden="true"
          />

          <motion.path
            key={`${frequency.toFixed(1)}-${amplitude}`}
            d={wavePath}
            fill="none"
            className="text-primary"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: reduceMotion ? 1 : 0.25, opacity: 0.45 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              duration: reduceMotion ? 0 : 0.35,
              ease: [0.16, 1, 0.3, 1],
            }}
          />

          {active && !reduceMotion ? (
            <circle r="3.5" className="fill-primary">
              <animateMotion
                path={wavePath}
                dur={`${Math.max(1.4, 4.4 - frequency * 0.6)}s`}
                repeatCount="indefinite"
              />
            </circle>
          ) : (
            <circle
              cx={WAVE_VIEWBOX_WIDTH / 2}
              cy={WAVE_CENTER_Y}
              r="3.5"
              className="fill-primary"
            />
          )}
        </svg>
      </div>

      <div
        className="flex flex-1 flex-col justify-between px-5 py-4"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="space-y-4">
          <LabControl
            id={frequencyId}
            label={copy.frequency}
            valueLabel={`${frequency.toFixed(1)} ${copy.frequencyUnit}`}
            min={1}
            max={4}
            step={0.1}
            value={frequency}
            disabled={!active}
            onChange={onFrequencyChange}
          />
          <LabControl
            id={amplitudeId}
            label={copy.amplitude}
            valueLabel={`${Math.round(amplitude)} ${copy.amplitudeUnit}`}
            min={20}
            max={90}
            step={1}
            value={amplitude}
            disabled={!active}
            onChange={onAmplitudeChange}
          />
        </div>
        <p className="text-[11px] leading-4 text-muted-foreground">
          {copy.hint}
        </p>
      </div>
    </LabCardFrame>
  );
}

function PhMixingLab({
  copy,
  position,
  nextLabLabel,
  swipeHint,
  active,
  acidVolume,
  baseVolume,
  onAcidVolumeChange,
  onBaseVolumeChange,
  onNext,
}: {
  copy: WelcomeScienceLabsCopy['chemistry'];
  position: string;
  nextLabLabel: string;
  swipeHint: string;
  active: boolean;
  acidVolume: number;
  baseVolume: number;
  onAcidVolumeChange: (value: number) => void;
  onBaseVolumeChange: (value: number) => void;
  onNext: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const acidId = useId();
  const baseId = useId();
  const beakerClipId = useId().replaceAll(':', '');
  const phScaleId = useId().replaceAll(':', '');
  const ph = calculateMixedPh(acidVolume, baseVolume);
  const solutionColor = phToColor(ph);
  const totalVolume = acidVolume + baseVolume;
  const liquidY = 105 - Math.min(1, totalVolume / 200) * 72;
  const liquidHeight = 112 - liquidY;
  const reactionActivity =
    totalVolume === 0
      ? 0
      : Math.min(acidVolume, baseVolume) /
        Math.max(acidVolume, baseVolume, 1);
  const phMarkerX = 166 + (ph / 14) * 60;
  const bubbles = [
    { x: 81, delay: 0.1, duration: 2.2 },
    { x: 96, delay: 0.7, duration: 2.6 },
    { x: 111, delay: 0.35, duration: 2.35 },
    { x: 124, delay: 1.05, duration: 2.7 },
  ];

  return (
    <LabCardFrame
      eyebrow={copy.eyebrow}
      title={copy.title}
      icon={Flask}
      position={position}
      nextLabLabel={nextLabLabel}
      swipeHint={swipeHint}
      interactive={active}
      onNext={onNext}
    >
      <div className="mx-3 overflow-hidden rounded-2xl bg-muted/25">
        <svg
          viewBox="0 0 248 128"
          className="block h-[140px] w-full"
          role="img"
          aria-label={copy.title}
        >
          <defs>
            <clipPath id={beakerClipId}>
              <path d="M60 22 L68 102 Q69 113 81 115 H119 Q131 113 132 102 L140 22 Z" />
            </clipPath>
            <linearGradient id={phScaleId} x1="0" x2="1">
              <stop offset="0%" stopColor="rgb(218 58 69)" />
              <stop offset="21%" stopColor="rgb(240 131 49)" />
              <stop offset="43%" stopColor="rgb(226 204 50)" />
              <stop offset="50%" stopColor="rgb(41 183 101)" />
              <stop offset="64%" stopColor="rgb(37 166 232)" />
              <stop offset="79%" stopColor="rgb(49 94 234)" />
              <stop offset="100%" stopColor="rgb(111 53 216)" />
            </linearGradient>
          </defs>

          <g className="text-border/55" aria-hidden="true">
            {[31, 62, 93, 124, 155, 186, 217].map((x) => (
              <line
                key={x}
                x1={x}
                y1="0"
                x2={x}
                y2="128"
                stroke="currentColor"
                strokeWidth="0.6"
              />
            ))}
            {[32, 64, 96].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="248"
                y2={y}
                stroke="currentColor"
                strokeWidth="0.6"
              />
            ))}
          </g>

          <motion.rect
            x="58"
            width="84"
            initial={false}
            animate={{
              y: liquidY,
              height: liquidHeight,
              fill: solutionColor,
            }}
            transition={{
              duration: reduceMotion ? 0 : 0.28,
              ease: [0.16, 1, 0.3, 1],
            }}
            clipPath={`url(#${beakerClipId})`}
            opacity="0.58"
          />

          <path
            d="M60 22 L68 102 Q69 113 81 115 H119 Q131 113 132 102 L140 22"
            fill="none"
            className="stroke-border"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="55"
            y1="22"
            x2="145"
            y2="22"
            className="stroke-border"
            strokeWidth="1.6"
            strokeLinecap="round"
          />

          {active && !reduceMotion && reactionActivity > 0.05
            ? bubbles.map((bubble) => (
                <motion.circle
                  key={bubble.x}
                  cx={bubble.x}
                  r="2.2"
                  fill={solutionColor}
                  initial={{ cy: 101, opacity: 0 }}
                  animate={{ cy: [101, liquidY + 5], opacity: [0, 0.7, 0] }}
                  transition={{
                    duration: bubble.duration,
                    delay: bubble.delay,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                />
              ))
            : null}

          <text
            x="196"
            y="48"
            textAnchor="middle"
            className="fill-muted-foreground text-[9px]"
          >
            {copy.phLabel}
          </text>
          <motion.text
            x="196"
            y="71"
            textAnchor="middle"
            className="text-[19px] font-medium tabular-nums"
            initial={false}
            animate={{ fill: solutionColor }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
          >
            {ph.toFixed(1)}
          </motion.text>
          <rect
            x="166"
            y="93"
            width="60"
            height="4"
            rx="2"
            fill={`url(#${phScaleId})`}
            opacity="0.8"
          />
          <motion.circle
            cy="95"
            r="4.5"
            fill={solutionColor}
            className="stroke-background"
            strokeWidth="2"
            initial={false}
            animate={{ cx: phMarkerX }}
            transition={{
              duration: reduceMotion ? 0 : 0.22,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
        </svg>
      </div>

      <div
        className="flex flex-1 flex-col justify-between px-5 py-4"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="space-y-4">
          <LabControl
            id={acidId}
            label={copy.acid}
            valueLabel={`${Math.round(acidVolume)} ${copy.volumeUnit}`}
            min={0}
            max={100}
            step={1}
            value={acidVolume}
            disabled={!active}
            onChange={onAcidVolumeChange}
          />
          <LabControl
            id={baseId}
            label={copy.base}
            valueLabel={`${Math.round(baseVolume)} ${copy.volumeUnit}`}
            min={0}
            max={100}
            step={1}
            value={baseVolume}
            disabled={!active}
            onChange={onBaseVolumeChange}
          />
        </div>
        <p className="text-[11px] leading-4 text-muted-foreground">
          {copy.hint}
        </p>
      </div>
    </LabCardFrame>
  );
}

function LightLab({
  copy,
  position,
  nextLabLabel,
  swipeHint,
  active,
  wavelength,
  intensity,
  onWavelengthChange,
  onIntensityChange,
  onNext,
}: {
  copy: WelcomeScienceLabsCopy['light'];
  position: string;
  nextLabLabel: string;
  swipeHint: string;
  active: boolean;
  wavelength: number;
  intensity: number;
  onWavelengthChange: (value: number) => void;
  onIntensityChange: (value: number) => void;
  onNext: () => void;
}) {
  const wavelengthId = useId();
  const intensityId = useId();
  const spectrumId = useId().replaceAll(':', '');
  const beamColor = wavelengthToRgb(wavelength, intensity);
  const markerPosition = ((wavelength - 380) / (700 - 380)) * 188 + 30;

  return (
    <LabCardFrame
      eyebrow={copy.eyebrow}
      title={copy.title}
      icon={Sun}
      position={position}
      nextLabLabel={nextLabLabel}
      swipeHint={swipeHint}
      interactive={active}
      onNext={onNext}
    >
      <div className="mx-3 overflow-hidden rounded-2xl bg-muted/25">
        <svg
          viewBox="0 0 248 128"
          className="block h-[140px] w-full"
          role="img"
          aria-label={copy.title}
        >
          <defs>
            <linearGradient id={spectrumId} x1="0" x2="1">
              <stop offset="0%" stopColor="#6f35d8" />
              <stop offset="18%" stopColor="#315eea" />
              <stop offset="36%" stopColor="#25a6e8" />
              <stop offset="51%" stopColor="#29b765" />
              <stop offset="68%" stopColor="#e2cc32" />
              <stop offset="84%" stopColor="#f08331" />
              <stop offset="100%" stopColor="#de3a45" />
            </linearGradient>
            <filter id={`${spectrumId}-glow`} x="-30%" y="-100%" width="160%" height="300%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          <g className="text-border/70" aria-hidden="true">
            {[31, 62, 93, 124, 155, 186, 217].map((x) => (
              <line
                key={x}
                x1={x}
                y1="0"
                x2={x}
                y2="128"
                stroke="currentColor"
                strokeWidth="0.6"
              />
            ))}
            {[32, 64, 96].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="248"
                y2={y}
                stroke="currentColor"
                strokeWidth="0.6"
              />
            ))}
          </g>

          <line
            x1="24"
            y1="54"
            x2="224"
            y2="54"
            stroke={beamColor}
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.18"
            filter={`url(#${spectrumId}-glow)`}
          />
          <line
            x1="24"
            y1="54"
            x2="224"
            y2="54"
            stroke={beamColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="124" cy="54" r="8" fill={beamColor} opacity="0.18" />
          <circle cx="124" cy="54" r="3.5" fill={beamColor} />

          <rect
            x="30"
            y="101"
            width="188"
            height="5"
            rx="2.5"
            fill={`url(#${spectrumId})`}
            opacity="0.8"
          />
          <motion.circle
            cx={markerPosition}
            cy="103.5"
            r="5"
            fill={beamColor}
            stroke="currentColor"
            className="text-background"
            strokeWidth="2"
            animate={{ cx: markerPosition }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
      </div>

      <div
        className="flex flex-1 flex-col justify-between px-5 py-4"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="space-y-4">
          <LabControl
            id={wavelengthId}
            label={copy.wavelength}
            valueLabel={`${Math.round(wavelength)} ${copy.wavelengthUnit}`}
            min={380}
            max={700}
            step={1}
            value={wavelength}
            disabled={!active}
            onChange={onWavelengthChange}
          />
          <LabControl
            id={intensityId}
            label={copy.intensity}
            valueLabel={`${Math.round(intensity)} ${copy.intensityUnit}`}
            min={25}
            max={100}
            step={1}
            value={intensity}
            disabled={!active}
            onChange={onIntensityChange}
          />
        </div>
        <p className="text-[11px] leading-4 text-muted-foreground">
          {copy.hint}
        </p>
      </div>
    </LabCardFrame>
  );
}

export function WelcomeScienceLabs({
  copy,
}: {
  copy: WelcomeScienceLabsCopy;
}) {
  const reduceMotion = useReducedMotion();
  const [order, setOrder] = useState<LabId[]>(LAB_IDS);
  const [departingId, setDepartingId] = useState<LabId | null>(null);
  const [waveFrequency, setWaveFrequency] = useState(2.2);
  const [waveAmplitude, setWaveAmplitude] = useState(56);
  const [acidVolume, setAcidVolume] = useState(50);
  const [baseVolume, setBaseVolume] = useState(50);
  const [wavelength, setWavelength] = useState(520);
  const [lightIntensity, setLightIntensity] = useState(78);
  const activeId = order[0];

  const advance = useCallback(() => {
    if (departingId) {
      return;
    }
    setDepartingId(activeId);
  }, [activeId, departingId]);

  const finishAdvance = useCallback(() => {
    setOrder((current) => [...current.slice(1), current[0]]);
    setDepartingId(null);
  }, []);

  useEffect(() => {
    if (!departingId) {
      return;
    }

    const timeout = window.setTimeout(
      finishAdvance,
      reduceMotion ? 140 : DECK_EXIT_DURATION_MS + 40,
    );
    return () => window.clearTimeout(timeout);
  }, [departingId, finishAdvance, reduceMotion]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (
      info.offset.y < -SWIPE_DISTANCE ||
      info.velocity.y < -SWIPE_VELOCITY
    ) {
      advance();
    }
  };

  const renderLab = (labId: LabId, active: boolean) => {
    const position = formatPosition(
      copy.position,
      LAB_IDS.indexOf(labId) + 1,
      LAB_IDS.length,
    );
    const sharedProps = {
      position,
      nextLabLabel: copy.nextLab,
      swipeHint: copy.swipeHint,
      active,
      onNext: advance,
    };

    switch (labId) {
      case 'chemistry':
        return (
          <PhMixingLab
            {...sharedProps}
            copy={copy.chemistry}
            acidVolume={acidVolume}
            baseVolume={baseVolume}
            onAcidVolumeChange={setAcidVolume}
            onBaseVolumeChange={setBaseVolume}
          />
        );
      case 'light':
        return (
          <LightLab
            {...sharedProps}
            copy={copy.light}
            wavelength={wavelength}
            intensity={lightIntensity}
            onWavelengthChange={setWavelength}
            onIntensityChange={setLightIntensity}
          />
        );
      case 'wave':
      default:
        return (
          <WaveLab
            {...sharedProps}
            copy={copy.wave}
            frequency={waveFrequency}
            amplitude={waveAmplitude}
            onFrequencyChange={setWaveFrequency}
            onAmplitudeChange={setWaveAmplitude}
          />
        );
    }
  };

  const visibleLabs = departingId
    ? order.filter((labId) => labId !== departingId)
    : order;

  return (
    <section
      className="order-2 mx-auto w-full max-w-[304px]"
      aria-label={copy.label}
    >
      <div
        className="relative w-full"
        style={{ height: CARD_HEIGHT + DECK_DEPTH_STYLES[2].y }}
      >
        {visibleLabs
          .slice()
          .reverse()
          .map((labId) => {
            const originalDepth = order.indexOf(labId);
            const depth = departingId
              ? Math.max(0, originalDepth - 1)
              : originalDepth;
            const style = DECK_DEPTH_STYLES[depth] ?? DECK_DEPTH_STYLES[2];
            const active = depth === 0 && !departingId;

            return (
              <motion.div
                key={labId}
                className={cn(
                  'absolute inset-x-0 top-0 origin-top',
                  active ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none',
                )}
                style={{
                  height: CARD_HEIGHT,
                  zIndex: 30 - depth * 10,
                  touchAction: active ? 'pan-x' : 'auto',
                }}
                initial={false}
                animate={{
                  y: style.y,
                  scale: style.scale,
                  opacity: style.opacity,
                }}
                transition={{
                  duration: reduceMotion ? 0 : 0.32,
                  ease: [0.16, 1, 0.3, 1],
                }}
                drag={active ? 'y' : false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0.34, bottom: 0.08 }}
                onDragEnd={handleDragEnd}
                aria-hidden={!active}
                inert={!active}
              >
                {renderLab(labId, active)}
              </motion.div>
            );
          })}

        {departingId ? (
          <motion.div
            key={`${departingId}-departing`}
            className="pointer-events-none absolute inset-x-0 top-0 origin-top"
            style={{ height: CARD_HEIGHT, zIndex: 40 }}
            initial={{ y: 0, scale: 1, opacity: 1 }}
            animate={{
              y: reduceMotion ? -16 : -CARD_HEIGHT * 0.92,
              scale: reduceMotion ? 0.98 : 0.96,
              rotate: reduceMotion ? 0 : -2.5,
              opacity: 0,
            }}
            transition={{
              duration: reduceMotion ? 0.12 : 0.34,
              ease: [0.4, 0, 0.2, 1],
            }}
            aria-hidden="true"
            inert
          >
            {renderLab(departingId, false)}
          </motion.div>
        ) : null}
      </div>

      <p
        className="mt-3 flex items-center justify-center gap-2 text-[11px] text-muted-foreground"
        aria-hidden="true"
      >
        <ArrowUp className="h-3.5 w-3.5" />
        {copy.swipeHint}
      </p>

      <p className="sr-only" aria-live="polite">
        {copy[activeId].title}
      </p>
    </section>
  );
}
