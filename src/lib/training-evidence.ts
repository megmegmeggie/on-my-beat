import type { PlanId } from '@/hooks/use-selected-plan';
import type { PlanEvidence } from '@/lib/types';

/**
 * What each in-app plan is based on, and where to read more.
 *
 * `basis` describes the program as built in `PLANS`. The in-app sessions are the shape of each
 * program at its published durations, converted to minutes because that is what the metronome runs
 * on; follow the source for the full schedule, which is week-by-week and distance-based.
 */
export const PLAN_EVIDENCE: Record<PlanId, PlanEvidence> = {
  '5k': {
    basis: 'Nine weeks, three runs a week with a rest day between each. Weeks 1 to 6 alternate running and walking, starting at one minute of running, and weeks 7 to 9 run continuously up to 30 minutes.',
    approaches: [
      {
        name: 'NHS Couch to 5K',
        summary:
          'A 9-week public-health programme: three runs a week with a rest day between each, starting at 1 minute of running and 1 minute 30 seconds of walking and finishing with 30 minutes of continuous running.',
      },
      {
        name: 'Hal Higdon novice 5K',
        summary: 'Graded weekly volume with cross-training, building up to a continuous 5K without a mid-plan jump in distance.',
      },
      {
        name: 'Galloway run/walk',
        summary: 'Takes scheduled walk breaks from the first run rather than treating them as failure, which lowers the early injury risk for new runners.',
      },
    ],
    caveat:
      'These are repeatable, widely used programmes rather than laboratory-tested protocols. Couch to 5K is built for people who do not run today, so it progresses by time-on-feet rather than by speed.',
    sources: [
      {
        label: 'NHS Couch to 5K running plan',
        detail: 'Official 9-week plan, week by week, with a free app',
        href: 'https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan',
      },
      {
        label: 'Hal Higdon training programmes',
        detail: 'Novice, intermediate and walker 5K plans',
        href: 'https://www.halhigdon.com/training/',
      },
      {
        label: 'Jeff Galloway 5K training',
        detail: 'Run/walk plans built on the Magic Mile pace',
        href: 'https://www.jeffgalloway.com/training/5k-training',
      },
    ],
  },

  'half-marathon': {
    basis: 'Twelve weeks of three runs a week: an easy run, one quality session, and a long run that climbs from 50 minutes to a 95-minute peak before a two-week taper and the race. Volume builds gradually so no single week jumps far beyond the last.',
    approaches: [
      {
        name: 'Hal Higdon half marathon novice',
        summary:
          'One long run and one quality run a week with cross-training in between, progressing to a long run in the low teens before a two-week taper.',
      },
      {
        name: 'B.A.A. Boston Half',
        summary:
          'Three 12-week plans for the Boston Half, each built around a single progressive long run so you reach the start line fit rather than merely rested.',
      },
      {
        name: 'Galloway run/walk',
        summary:
          'Sets long-run pace from your Magic Mile and prescribes walk ratios by pace, so the long run is sustainable instead of a weekly test of grit.',
      },
    ],
    caveat:
      'None of these are randomised trials. They agree on the structure and disagree on the numbers, so treat the long-run distance as a starting point and repeat a week rather than pushing through.',
    sources: [
      {
        label: 'Hal Higdon training programmes',
        detail: 'Half marathon plans for all skill levels',
        href: 'https://www.halhigdon.com/training/',
      },
      {
        label: 'B.A.A. Boston Half training plans',
        detail: 'Three official 12-week plans',
        href: 'https://www.baa.org/races/boston-half/info-for-athletes/boston-half-training',
      },
      {
        label: 'Jeff Galloway half marathon training',
        detail: 'Run/walk plans with pace-based walk ratios',
        href: 'https://www.jeffgalloway.com/training/half-marathon-training',
      },
    ],
  },

  marathon: {
    basis: 'Eighteen weeks, three runs a week. The long run opens at an hour, climbs to a 195-minute peak in week 13, then tapers over the final four weeks: 150, 110, 75 and 50 minutes, and the race. Quality work is one tempo or interval session a week, so most of the volume stays easy.',
    approaches: [
      {
        name: 'Hal Higdon Marathon Novice 1',
        summary:
          '18 weeks, four running days a week, opening with a 6-mile long run, peaking at 20 miles three weeks out, then tapering.',
      },
      {
        name: 'B.A.A. Boston Marathon, four levels',
        summary:
          '20-week plans from four to seven days a week. Level One progresses 25 to 40 miles a week with long runs to 16–18 miles; Level Two runs five days and peaks at 45 miles; the advanced levels reach 55–60 miles a week.',
      },
      {
        name: 'Galloway "Marathon To Finish"',
        summary:
          'A run/walk plan where long-run pace comes from the Magic Mile, using walk breaks from the start to make the full distance repeatable for first-time marathoners.',
      },
      {
        name: 'Knopp et al. 2024, 92-plan analysis',
        summary:
          'A quantitative review of 92 sub-elite marathon plans found the final 12 weeks averaged 108, 59 and 43 km per week for high-, middle- and low-volume plans, grouped by peak week.',
      },
    ],
    caveat:
      'The popular "80/20" split is genuinely disputed, not settled. Foster and colleagues argue polarized intensity is optimal (MSSE 2022); Burnley, Bearden and Jones argue most athletes are pyramidal rather than polarized and say otherwise. The 2024 review also notes it has no effectiveness data, only what plans prescribe. This app treats easy-heavy training as a sensible default, not a proven optimum.',
    sources: [
      {
        label: 'Hal Higdon marathon training',
        detail: 'Novice, intermediate and advanced marathon plans',
        href: 'https://www.halhigdon.com/training/marathon-training',
      },
      {
        label: 'B.A.A. Boston Marathon training plans',
        detail: 'Four official 20-week plans with weekly mileage and long runs',
        href: 'https://www.baa.org/races/boston-marathon/info-for-athletes/boston-marathon-training',
      },
      {
        label: 'Jeff Galloway marathon training',
        detail: 'Marathon To Finish run/walk plan',
        href: 'https://www.jeffgalloway.com/training/marathon-training',
      },
      {
        label: 'Knopp et al. (2024), Sports Medicine - Open',
        detail: 'Quantitative analysis of 92 sub-elite marathon training plans (open access)',
        href: 'https://link.springer.com/article/10.1186/s40798-024-00717-5',
      },
      {
        label: 'Seiler & Kjerland (2006), Scand J Med Sci Sports',
        detail: 'The original training intensity distribution analysis',
        href: 'https://onlinelibrary.wiley.com/doi/10.1111/j.1600-0838.2004.00418.x',
      },
      {
        label: 'Foster et al. (2022), "Polarized Training Is Optimal"',
        detail: 'MSSE 54(6):1028–1031, the pro-80/20 side',
        href: 'https://doi.org/10.1249/MSS.0000000000002871',
      },
      {
        label: 'Burnley, Bearden & Jones (2022), "Polarized Training Is Not Optimal"',
        detail: 'MSSE 54(6):1032–1034, the reply',
        href: 'https://doi.org/10.1249/MSS.0000000000002869',
      },
    ],
  },
};
