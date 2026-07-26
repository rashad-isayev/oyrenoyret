export {
  DEFAULT_LOCALE,
  LOCALE_CONFIG,
  SUPPORTED_LOCALES,
  getLocaleCode,
  isSupportedLocale,
  normalizeLocale,
  type Locale,
} from '@/src/i18n/config';

type WidenMessages<T> = T extends string
  ? string
  : T extends readonly (infer Item)[]
    ? [Item] extends [never]
      ? readonly string[]
      : readonly WidenMessages<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: WidenMessages<T[Key]> }
      : T;

export type Messages = WidenMessages<typeof import('@/src/i18n/messages/en').EN_MESSAGES>;

type Primitive = string | number | boolean | null | undefined;

type DotPrefix<T extends string> = T extends '' ? '' : `.${T}`;

type DepthLimit = 6;
type PrevDepth = [never, 0, 1, 2, 3, 4, 5, 6];

type DotNestedKeys<T, Depth extends number = DepthLimit> = Depth extends 0
  ? ''
  : T extends Primitive
    ? ''
    : {
        [K in keyof T & string]: T[K] extends Primitive
          ? K
          : `${K}${DotPrefix<DotNestedKeys<T[K], PrevDepth[Depth]>>}`;
      }[keyof T & string];

export type MessageKey = DotNestedKeys<Messages>;

export type TranslateVars = Record<string, string | number>;
