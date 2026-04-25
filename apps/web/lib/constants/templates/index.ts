import type { ProgramTemplate } from '@/types/template'
import { startingStrength } from './beginner/starting-strength'
import { stronglifts5x5 } from './beginner/stronglifts-5x5'
import { gzclp } from './beginner/gzclp'
import { greyskulllp } from './beginner/greyskull-lp'
import { phraksGslp } from './beginner/phraks-gslp'
import { strongCurves } from './beginner/strong-curves'
import { redditPpl } from './beginner/reddit-ppl'
import { wendler531 } from './intermediate/wendler-531'
import { texasMethod } from './intermediate/texas-method'
import { madcow5x5 } from './intermediate/madcow-5x5'
import { nsunsLp } from './intermediate/nsuns-lp'
import { phul } from './intermediate/phul'
import { candito6WeekStrength } from './intermediate/candito-6-week-strength'
import { gzclTheRippler } from './intermediate/gzcl-the-rippler'
import { conjugate } from './advanced/conjugate'
import { juggernaut } from './advanced/juggernaut'
import { sheiko } from './advanced/sheiko'
import { buildingTheMonolith } from './advanced/building-the-monolith'
import { smolovJr } from './advanced/smolov-jr'

export const TEMPLATE_REGISTRY: Record<string, ProgramTemplate> = {
  starting_strength: startingStrength,
  stronglifts_5x5: stronglifts5x5,
  gzclp,
  greyskull_lp: greyskulllp,
  phraks_gslp: phraksGslp,
  strong_curves: strongCurves,
  reddit_ppl: redditPpl,
  wendler_531: wendler531,
  texas_method: texasMethod,
  madcow_5x5: madcow5x5,
  nsuns_lp: nsunsLp,
  phul,
  candito_6_week_strength: candito6WeekStrength,
  gzcl_the_rippler: gzclTheRippler,
  conjugate,
  juggernaut,
  sheiko,
  building_the_monolith: buildingTheMonolith,
  smolov_jr: smolovJr,
}

export function getTemplate(key: string): ProgramTemplate | undefined {
  return TEMPLATE_REGISTRY[key]
}

export function getTemplatesByLevel(level: ProgramTemplate['level']): ProgramTemplate[] {
  return Object.values(TEMPLATE_REGISTRY).filter((t) => t.level === level)
}
