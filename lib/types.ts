export type CardType =
  | 'black'
  | 'fragment'
  | 'word'
  | 'phrase'
  | 'quote'
  | 'number'
  | 'strikethrough';

export type CardColor = 'default' | 'invert' | 'blue' | 'red';

export interface CardSpec {
  type: CardType;
  text?: string;
  lines?: string[];
  color: CardColor;
  mixedCase?: boolean;
  holdMs?: number;
  scale?: number;
}
