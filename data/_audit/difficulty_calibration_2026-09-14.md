# Difficulty calibration audit, 2026-09-14

Question put: the bank sits at L4 = 32.1% against a v3 target of 15-20%, and
L5 = 4.4% against ~5%. Is the L4 excess real drift or mislabelling?

Answer: mostly mislabelling, but not a clean one-level error, and a blanket
re-shift would be wrong. Details below. Nothing has been re-labelled.

## Bank as measured

5,644 live questions (manifest-served, deduped by id). All four modules are
exactly level at 1,411 each.

| tier | n | share | v3 target |
|---|---|---|---|
| L1 | 58 | 1.0% | <=5% per batch |
| L2 | 1,506 | 26.7% | ~50% baseline |
| L3 | 2,022 | 35.8% | - |
| L4 | 1,812 | 32.1% | 15-20% |
| L5 | 246 | 4.4% | ~5% |

## The bank is two populations, and only one of them is miscalibrated

The 2026-06-01 overhaul shifted every existing question down one level and
recorded the pre-shift value in `difficulty_prior_v3`. That field splits the
bank cleanly. 276 batch files carry it, 281 do not, and no file mixes the two,
so the split is exactly the overhaul boundary. Every file carrying it dates to
2026-05 or earlier; every file without it dates to 2026-06 or later.

| | n | L1 | L2 | L3 | L4 | L5 |
|---|---|---|---|---|---|---|
| pre-overhaul (shifted + curated) | 3,013 | 1.9% | 48.9% | 29.8% | **19.3%** | 0% |
| post-overhaul (generated since) | 2,631 | 0% | 1.2% | 42.7% | **46.8%** | 9.4% |

The pre-overhaul population sits inside the 15-20% target. The entire excess
comes from questions generated after the overhaul. The 436 questions whose
prior and current value are both 4 are not unshifted strays: they are the
deliberate L4 promotion documented in the 2026-06-01 checkpoint.

## Blinded re-rating

150 questions were stripped of their labels, shuffled, and rated against the
v3 rubric by four independent raters who could not see the group. Sample:
30 calibrated L3, 30 calibrated L4 (former L5), 30 promoted L4, 20
post-overhaul L3, 40 post-overhaul L4.

Mean blinded rating:

| group | label | rated | telegraph |
|---|---|---|---|
| pre-overhaul L3 | 3 | 1.83 | 10.0% |
| pre-overhaul L4 (promoted) | 4 | 2.50 | 3.3% |
| pre-overhaul L4 (former L5) | 4 | 2.63 | 6.7% |
| post-overhaul L3 | 3 | 2.25 | 20.0% |
| post-overhaul L4 | 4 | 2.27 | 15.0% |

All four raters produced the same ordering independently. Raters scored
everything below its label, so only the gaps between groups carry meaning.

Bootstrap, 20,000 resamples:

| comparison | difference | 95% CI | |
|---|---|---|---|
| calibrated L3 to calibrated L4 | +0.80 | +0.47 to +1.17 | one real level |
| calibrated L3 to post-overhaul L4 | +0.44 | +0.14 to +0.74 | significant |
| calibrated L4 to post-overhaul L4 | -0.36 | -0.70 to -0.03 | significant |
| post-overhaul L3 to post-overhaul L4 | +0.02 | -0.33 to +0.40 | not significant |

## Reading

A post-overhaul L4 is significantly harder than a calibrated L3 and
significantly easier than a calibrated L4. It sits about 55% of the way up a
level that measures 0.80 wide, so the inflation is roughly half a level, not
a whole one.

The last row is the finding that matters. Inside the post-overhaul cohort the
L3 and L4 labels do not separate real reasoning load at all: the gap is 0.02
against 0.80 for the same boundary before the overhaul. The generator is not
applying the L3/L4 distinction. It appears to use 4 as its default for any
question that is not easy, which also explains why the post-overhaul cohort
has almost no L2 (1.2%) where the binding template asks for roughly 40% and
the pre-overhaul population has 48.9%.

This is consistent with a problem the routine brief already records at line
419: "Do NOT inflate difficulty ratings. Rate DOWN if unsure. Past agents
inflated by 1-2." The guard is present and is not working.

## Why a blanket re-shift is the wrong fix

Shifting every post-overhaul question down one level gives L1 1.6%, L2 46.0%,
L3 37.7%, L4 14.7% and L5 0. It lands L4 just under target and destroys the
L5 tier outright, which is the thing the overhaul was created to build. The
inflation is also only half a level on average, so a full level over-corrects.

## Recommended remedy, not yet applied

1. Demote selectively by content, not mechanically. To reach L4 = 20% demote
   684 questions; to reach 17.5%, 825. Both fit inside the post-overhaul L4
   pool of 1,230. Choose them on evidence, worst first: a telegraphing stem,
   two or fewer distinct reasoning steps, or a niche fact carrying the rating
   on its own. Leave L5 untouched.
2. Fix generation before fixing the labels, or the excess returns. The target
   percentages are already in the brief and are being ignored, so the fix is
   worked exemplars: a named question at L2, L3 and L4 from the calibrated
   pre-overhaul population, shown side by side.
3. Treat the telegraph rate as its own regression. Post-overhaul stems
   telegraph at 15-20% against 3-10% before. Telegraphing collapses real
   difficulty, so it is part of why these questions measure low.

## Separate finding: the routine has stopped generating L5 on a bad denominator

`data/meta.json` for the 2026-09-13 run records no L5 generated "because L5
sits between 5.7 and 6.3 per cent of the live L3 to L5 tiers in every module,
above the 5 per cent target". L5 is 6.03% of the L3-L5 tiers but 4.36% of the
bank, and the target in both the routine brief and the binding template is
~5% of bank. Measured correctly, L5 is roughly 36 questions short and the
routine should still be generating it.

## Method

Raw ratings, the blinded sample and the key are outside the repo, in the
session scratchpad. The counts here come from the manifest-served set only.
