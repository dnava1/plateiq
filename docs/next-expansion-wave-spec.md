# PlateIQ Product Spec - Next Expansion Wave

**Date:** 2026-04-17  
**Status:** Draft  
**Scope:** Product specification only. This document intentionally avoids implementation details and explicitly excludes exercise demos.

PlateIQ already has a strong base for serious strength athletes: structured programs, workout launch and resume, offline logging, set logging, AMRAP support, notes at workout completion, analytics dashboards, AI insights, strength profile scoring, calculators, settings, and guest-to-permanent account flows. The next expansion wave should deepen that core loop rather than broaden the product into generic fitness content.

## 1. Product Thesis For The Next Expansion Wave

PlateIQ should expand inward, not outward.

The next wave should make PlateIQ materially better in the moments that matter most to strength athletes:

- while executing a session
- while judging how hard a set actually was
- while remembering what happened last time
- while deciding what to do next
- while trusting that their core training history stays portable and under their control

The product opportunity is not "more features" in the abstract. It is a tighter strength loop:

- follow a structured plan more smoothly
- capture effort and context more truthfully
- preserve user judgment rather than replacing it
- turn performance history into credible next-step guidance
- reinforce trust with credible data portability

The highest-confidence near-term direction is still the workout surface itself: better execution ergonomics, better in-workout context/history, and lower-friction effort capture. But this wave should also tighten PlateIQ's product framing. PlateIQ can be broad at the program level while staying strict about what each metric actually means. The product should support multiple programming methods without pretending that percentage-based work, AMRAP-driven main lifts, accessories, and bodyweight movements all deserve the same kind of analysis.

That means training max should remain a strong supported method, not the universal center of the product. Method-specific inputs should appear only when the selected program actually needs them. Analytics should distinguish broad coverage from method-aware coverage, and bodyweight work should have its own honest lane rather than being forced through load-based metrics that do not fit. Prescriptive guidance should therefore stay narrower for now, while export, lightweight feedback intake, and baseline trust surfaces reinforce that PlateIQ is serious about both training quality and user trust.

### What The First Implemented Slice Taught Us

The first real implementation slice in this wave validated the direction, but it also narrowed the product shape in important ways.

- Compact in-workout history is high leverage. Users benefit from seeing the last comparable completed session at the point of execution.
- Comparability matters more than raw recency. A "latest" or "heaviest" prior set is not automatically useful if it does not match the work the user is about to do.
- Freeform cue or note persistence is lower-confidence than history-first context. Unless stronger evidence emerges, this wave should not spend product complexity on a dedicated in-workout cue system.
- Deload should stay user-owned. The app can surface missed-target context, hold states, and cycle review framing, but generic deload triggers and strategies should not be a primary configuration surface.
- A broader future cycle-review surface is still the right place for manual progression judgment. In the current product, the programs-entry complete-cycle TM preview is the narrow first checkpoint that can expand in that direction.

## 2. Feature Specs

### Workout Execution Ergonomics

This is not cosmetic polish. It is core product work. PlateIQ's value rises or falls with how usable it feels in the gym.

A first ergonomics slice is already shipped. Users can back out to the workouts launcher and resume later without losing an in-progress session, the old quick-load UI is gone in favor of a simpler planned-log plus adjust flow, rest timing now appears only when the program explicitly defines it, loads now round down from unit-native defaults rather than a user-facing rounding setting, adjusted-load defaults are more reliable, and plate breakdown now respects unit-native plate inventories and exact-fit loads. The broader workout-console work below remains the next step.

**Problem**

PlateIQ already supports launch, resume, offline logging, structured set entry, and AMRAP handling, but the live workout experience still behaves more like a faithful plan renderer than a purpose-built lifting console. In a gym context, every extra tap, ambiguous state, or hidden next action creates friction. A strength-first product should feel calm, fast, and obvious under load.

**Why It Fits PlateIQ**

PlateIQ is centered on structured strength training, not passive tracking. Better execution ergonomics strengthen adherence to serious programs, make offline gym mode more valuable, and improve the daily experience for every user regardless of program style.

**Proposed User Experience**

- The active workout surface should always make the next action obvious.
- Logging a set that matched the prescription should be extremely fast.
- Logging a deviation from the prescription should be easy without feeling like a correction workflow.
- Session progress should be visible at three levels: workout, exercise, and set.
- Main work, backoff work, AMRAP work, and accessory work should feel distinct rather than visually equivalent.
- The first pass of this feature should explicitly cover rest timers, faster set completion, clearer load-adjustment flow, and dedicated superset/circuit handling.
- Secondary utilities should stay available, but the primary screen should feel optimized for logging the next meaningful set.

**Core Requirements**

- Make the next required action unmistakable.
- Reduce friction for standard prescribed set logging.
- Preserve reliable offline and resume behavior.
- Clearly distinguish planned work from user-adjusted work.
- Keep the workout screen focused on execution rather than analysis overload.
- Support quick capture of exceptions, deviations, and small in-session decisions.
- Treat rest timing and superset grouping as first-class workout behaviors, not note-based workarounds.

**Data And Logic Implications At A High Level**

PlateIQ will need a clearer concept of session state during execution: what set is current, what has been logged, what was edited, what belongs to a superset or circuit, and what still needs attention. This feature mainly changes how existing structured workout data is surfaced and sequenced, rather than changing the fundamental training model.

**Risks And Tradeoffs**

- Over-optimizing for speed can make the broader workout context harder to see.
- More automation can create mistrust if the app appears to advance or assume too much.
- Dense execution UI may intimidate newer lifters if it is not progressively disclosed.
- The screen can easily become too busy once more context and effort capture are added.

**Success Criteria**

- Launched workouts are completed more often without mid-session friction.
- Users can log prescribed work with less hesitation and fewer corrections.
- The workout screen feels faster and more focused in real gym use.
- PlateIQ becomes more credible as a "use this during lifting" product, not just a tracker before and after the session.

### First-Class RPE/RIR Capture

This is not just an extra field. It is the missing signal for real autoregulation.

**Problem**

PlateIQ already understands effort-based training concepts in its programming foundation and stored workout data, but the user-facing logging flow does not yet make effort capture a first-class behavior. That means PlateIQ can record what weight and reps happened, but not reliably capture how hard those sets actually felt. Without that signal, autoregulation stays partial and future guidance is forced to infer too much from reps and load alone.

**Why It Fits PlateIQ**

PlateIQ already supports structured programs that naturally benefit from effort-based interpretation. Making RPE/RIR first-class strengthens the product's strength-first identity, especially for intermediate and advanced lifters who use effort to manage fatigue, progression, and day-to-day readiness.

PlateIQ should treat RPE and RIR as one canonical effort signal across every current prescription path: training-max percentages, 1RM percentages, explicit effort prescriptions, fixed-weight work, bodyweight work, and percentage-of-work-set prescriptions (`percentage_tm`, `percentage_1rm`, `rpe`, `fixed_weight`, `bodyweight`, and `percentage_work_set`). That does not mean effort carries equal product weight everywhere. Capture priority and downstream interpretation should vary by prescription method, set decision value, progression style, and data quality.

**Proposed User Experience**

- PlateIQ should visibly show prescribed effort when a program uses effort-based prescriptions.
- Users should be able to log actual effort with very low friction after relevant sets across all current prescription paths, not only in `rpe`-prescribed work.
- PlateIQ should support both RPE and RIR as user-facing effort language.
- The product should treat RPE and RIR as one effort system from a user-value perspective, not two separate feature tracks.
- Effort capture should be optional where it would slow the workout unnecessarily, especially on warm-ups and low-value sets.
- Effort capture should be more prominent on top sets, AMRAP sets, and other progression-relevant work.
- Effort prompts and follow-on interpretation should still respect the selected progression style, whether the program is `linear_per_session`, `linear_per_week`, `linear_per_cycle`, `percentage_cycle`, `wave`, `autoregulated`, or `custom`.
- Users should stay in control of whether a suggested effort interpretation is accepted, edited, or skipped, and effort should not silently override the selected progression method.

**Core Requirements**

- Support prescribed effort and actual effort as distinct concepts.
- Let users think in either RPE or RIR without fragmenting the feature.
- Keep one canonical effort model that works across `percentage_tm`, `percentage_1rm`, `rpe`, `fixed_weight`, `bodyweight`, and `percentage_work_set`.
- Keep effort entry fast enough for live gym use.
- Make empty effort values acceptable rather than forcing false precision.
- Weight effort differently by method, set decision value, and data quality rather than treating every effort entry as equally informative.
- Use effort data downstream in analytics and future guidance.
- Preserve clarity between "programmed target" and "what actually happened."
- Let effort inform `linear_per_session`, `linear_per_week`, `linear_per_cycle`, `percentage_cycle`, `wave`, `autoregulated`, and `custom` programs without collapsing them into one universal progression behavior.

**Data And Logic Implications At A High Level**

PlateIQ needs a canonical effort signal that can represent what was prescribed, what was performed, and when effort data is missing or low-confidence across every supported prescription method. It also needs method-aware rules for how much weight effort should carry: central in explicit `rpe` contexts, informative but secondary in `percentage_tm`, `percentage_1rm`, and `percentage_work_set` flows, and available without being over-claimed in `fixed_weight` and `bodyweight` work.

It also needs progression-aware interpretation. `linear_per_session`, `linear_per_week`, `linear_per_cycle`, `percentage_cycle`, `wave`, `autoregulated`, and `custom` programs should all be able to use effort without losing the logic of the selected method. Effort should therefore matter most when the set has real decision value and the captured data is credible, and should degrade gracefully when the data is sparse, inconsistent, or attached to low-value work instead of overriding the chosen progression style by default.

At a product-rules level, that means:

- `percentage_tm`, `percentage_1rm`, and `percentage_work_set` prescriptions use effort primarily to interpret whether the planned loading matched reality, especially on top sets, AMRAP sets, and other reference work.
- `rpe` prescriptions treat prescribed effort as a first-order target and actual effort as the most important comparison signal.
- `fixed_weight` and `bodyweight` prescriptions still support effort capture, but should emphasize it only where the set is repeatedly benchmarked or clearly progression-relevant.
- `linear_per_session`, `linear_per_week`, and `linear_per_cycle` progression styles use effort as review context and a guardrail rather than a replacement for the linear rule.
- `percentage_cycle` and `wave` progression styles use effort to judge whether the planned cycle or undulating pattern was appropriately challenging at the key exposures.
- `autoregulated` progression uses effort as a primary progression signal alongside AMRAP and comparable performance data.
- `custom` progression records and preserves effort, but should not assume effort drives the rule unless the selected custom method explicitly says it does.

**Risks And Tradeoffs**

- Effort data is subjective and can be noisy.
- Requiring too much effort entry will slow the workout flow.
- Some users understand RPE well; others do not.
- Promoting effort too aggressively could make PlateIQ feel too specialized for users who mainly follow percentage-based templates.

**Success Criteria**

- Users who want autoregulation can capture effort without feeling slowed down.
- PlateIQ can clearly distinguish prescribed versus actual effort in the training record.
- Effort data becomes meaningful enough to support smarter analytics and future progression guidance.
- Users understand that effort capture helps interpret performance, not just decorate the log.

### Method-Aware Analytics And Bodyweight Coverage

This is not about adding more charts. It is about making PlateIQ's current analytics more honest and more useful.

A smaller analytics consistency pass is already shipped: chart axes, tooltips, summary cards, and dashboard and analytics summaries on the audited surfaces now follow the selected kg or lbs formatting. That improves trust in the current surface, but it does not yet deliver the broader method-aware coverage and bodyweight lane described below.

**Problem**

PlateIQ already gives users an analytics surface, but the product currently mixes general exercise tracking with metrics that are really strongest in main-lift, AMRAP, and training-max-driven contexts. Bodyweight work is the clearest gap: it should not be treated as if zero external load is meaningful general coverage. A few bodyweight-aware exceptions do not solve the broader issue.

**Why It Fits PlateIQ**

Serious lifters will accept that not every metric applies everywhere. They will not accept a dashboard that implies more certainty than it actually has. PlateIQ should be broad at the program level and honest at the metric level.

**Proposed User Experience**

- Analytics should clearly signal what kind of logic a metric depends on: general logging, main-lift or training-max context, effort-informed context, or bodyweight-specific context.
- Bodyweight work should have a distinct review lane inside the existing Analytics surface rather than disappearing into zero-load charts.
- Bodyweight coverage should not become a separate primary destination, tab, or navigation item.
- The bodyweight lane should appear only when it is relevant to the selected exercise, filter, or recent training history.
- When a metric is not applicable or not trustworthy for the selected work, PlateIQ should say so plainly instead of showing a weak proxy.
- Exercise filtering should remain useful, but coverage framing should be more visible than exercise scope alone.
- AI insight and future guidance surfaces should inherit the same honesty about what signals they are actually using.

**Core Requirements**

- Make coverage explicit instead of implying that every chart applies equally to every program method.
- Create a distinct bodyweight lane rather than forcing bodyweight sets through external-load analytics.
- Keep bodyweight coverage inside the current Analytics experience with progressive disclosure rather than adding UI clutter.
- Preserve method-aware metrics for training-max and AMRAP-heavy programs without presenting them as universal.
- Make "not enough signal" and "not applicable to this method" acceptable product outcomes.
- Keep the line clear between descriptive tracking and interpretive scoring.

**Data And Logic Implications At A High Level**

PlateIQ needs a cleaner taxonomy of metric families based on how work was prescribed and how it was logged. Coverage should be evaluated before confidence is implied.

**Risks And Tradeoffs**

- More coverage labels can make analytics feel more complex.
- Separate lanes can make the dashboard feel less unified.
- Honest "not covered yet" messaging can feel like a regression if it is not framed well.

**Success Criteria**

- Users understand which metrics are broadly comparable and which are method-bound.
- Bodyweight work stops effectively disappearing from performance review.
- PlateIQ says less, but means it more clearly.

### Program-Method Consistency And Navigation Simplification

This is not just information architecture cleanup. It is part of making PlateIQ feel quicker, cleaner, and more program-centered.

**Problem**

PlateIQ supports multiple prescription types, but some setup language, shared data entry, and navigation still imply that training max and Exercises are the center of the product. That creates unnecessary detours, makes the custom builder feel more training-max-first than method-first, and splits related jobs across builder, workouts, dashboard context, analytics, and the current programs-entry complete-cycle checkpoint.

**Why It Fits PlateIQ**

A strength-first product should feel organized around following and reviewing a program, not around maintaining a library. Serious lifters think first about what program they are running, what they need to do today, and what should change at the end of a block. PlateIQ should therefore feel organized around planning, execution, and review. Training max remains important shared method data where relevant, but it should be surfaced contextually rather than acting as the app's organizing center.

**Proposed User Experience**

- Built-in templates should stay template-first rather than forcing an extra method-selection step that adds no value.
- Build-from-scratch should begin with method selection so the builder can stay method-appropriate instead of asking every user the same generalized questions.
- Training max should be obvious on TM-driven paths and quiet on non-TM paths.
- The active builder UI should not present generic deload trigger or deload strategy fields as first-class configuration. If a template already includes an explicit programmed deload week, that remains part of the template logic. Otherwise deload stays a manual review decision.
- Exercise search, selection, and custom exercise creation should continue moving into builder and workout-related flows rather than remaining anchored to Exercises.
- Today's programs-entry complete-cycle training-max preview should expand over time into a broader future cycle-review surface. Until then, PlateIQ should describe it as the current TM-first checkpoint rather than imply that a full review surface already exists.
- In that future cycle-review surface, TM-driven methods should center training-max confirmation or adjustment, while non-TM methods should center adherence, effort, misses, notes, and other method-specific checkpoints.
- Dashboard should keep surfacing current training max as supporting context where relevant, but Analytics should stay centered on broader performance review such as e1RM trends, strength profile, and method-aware coverage. Analytics should not become a training-max review surface.
- Exercises no longer needs to stand as a primary destination once exercise creation, library lookup, and training-max access are carried by Programs and Workouts directly.

**Recommended Surface Ownership**

- Programs should be the primary planning surface.
- Workouts should be the primary execution surface.
- The future cycle-review surface should be the primary adjustment surface.
- Dashboard should summarize current state and next-step context.
- Analytics should carry deeper history, coverage framing, and progression review across broader signals such as e1RM, logged performance, and strength profile rather than method-specific setup data.
- Training max should be shared method data that appears wherever the selected method actually depends on it.
- Exercise creation and library lookup should live inside program-building flows rather than on a standalone destination, while day-of training-max access should live under Workouts; Exercises should no longer be a first-class surface once that handoff is complete.

**Recommended Rollout**

- First clarify the product model in builder, workouts, dashboard, analytics, and programs copy without removing navigation.
- Then finish the builder-side exercise rehoming already underway and extend comparable exercise and custom-exercise flows into workout-adjacent paths.
- Expand the current programs-entry complete-cycle training-max preview into a broader cycle-review surface rather than creating a separate competing checkpoint.
- Remove Exercises from primary navigation now that exercise-library tasks and training-max access live elsewhere, and delete the old route instead of preserving a fallback surface.

**Core Requirements**

- Keep training max as one supported method, not a universal prerequisite.
- Reduce redundant navigation between builder, exercises, and training max management.
- Treat generic deload trigger or strategy fields as deprecated product UI unless a specific template already encodes an explicit programmed deload week.
- Preserve fast access to exercise data and training max history for users who need it without routing that history through Analytics. Programs should carry planning and cycle-checkpoint context, with TM setup exposed when the user reopens a program that actually depends on it. Builder flows should carry exercise search, custom-exercise creation, and required TM entry for every lift whose actual prescriptions still depend on training max for execution. Workouts should stay focused on launch, logging, and completion rather than duplicating TM management. Dashboard should remain current-state context, and broader analytics review should stay centered on more universal signals that work across programs and exercises.
- Do not preserve a backward-compatibility Exercises surface once its jobs have moved into Programs and Workouts.
- Preserve manual deload judgment except where a template already includes an explicit programmed deload week.
- Keep the UI cleaner, quicker, and more obvious with fewer detours.

**Data And Logic Implications At A High Level**

PlateIQ needs a clearer distinction between program method, execution flows, review checkpoints, exercise-library data, and shared method data such as training max so the UI can surface only what matters in context. Existing custom programs and saved drafts may still encode uses_training_max or tm_percentage-style assumptions, so a method-first builder direction needs an explicit compatibility path instead of silently rewriting those definitions. Legacy template metadata may still exist for compatibility, but the active product surface should not depend on generic deload text fields.

**Risks And Tradeoffs**

- Hiding training max too aggressively could frustrate users on training-max-driven templates.
- Existing custom programs or saved drafts with uses_training_max or tm_percentage-style assumptions could make method-first builder changes feel inconsistent unless compatibility is explicit.
- Rehoming exercise jobs incompletely would hurt discoverability.
- If the recovery path is vague, removing Exercises from primary navigation will feel like lost functionality rather than simplification.
- A partial migration could leave PlateIQ with two competing mental models instead of one cleaner one.

**Success Criteria**

- Program setup feels method-appropriate rather than one-size-fits-all.
- Users need fewer clicks to start a program or review core progression inputs.
- The current complete-cycle TM preview feels like a clear stepping stone toward broader future cycle review rather than an awkward duplicate surface.
- TM-driven users still see training max exactly where they need it, while non-TM users stop feeling routed through irrelevant inputs.
- Exercises no longer acts as a primary destination once its remaining jobs live naturally in Programs and Workouts.
- PlateIQ feels more like a program system and less like an exercise database with training attached.

### Prescriptive Progression Guidance

This should remain a narrow decision-support layer until PlateIQ has stronger method-aware coverage and clearer trust boundaries.

**Problem**

PlateIQ already helps users review what happened. It does not yet have a strong enough product basis to imply equally credible next-step recommendations across every lift, every method, and every style of logged work. Current signals are stronger in some main-lift, AMRAP, and training-max-driven cases than they are in accessory, bodyweight, or lightly instrumented work.

**Why It Fits PlateIQ**

PlateIQ can create real value if it starts where program logic is strongest and stays explicit about its boundaries. Narrow, credible guidance fits the product better than broad, weak coaching language.

**Proposed User Experience**

- The first version should appear at natural checkpoints such as cycle review, main-lift review, or other clearly bounded progression moments.
- Recommendations should be limited to a small set of actions such as hold, increase, repeat, or review.
- A hold should be treated as a first-class supported outcome when the signal is weak or a recent miss suggests caution.
- Manual deload decisions should remain user-owned rather than being treated as an automatic app action, except where a selected method already contains an explicit programmed deload week.
- Every recommendation should state the method context it depends on.
- Unsupported or low-confidence cases should result in no recommendation rather than a generic nudge.
- Guidance should never masquerade as an automatic program rewrite.

**Core Requirements**

- Be method-aware before being global.
- State rationale, coverage, and confidence plainly.
- Keep user confirmation mandatory for any actual plan change.
- Prefer hold or review over automatic negative progression when confidence is low or the signal is mixed.
- Avoid giving equally strong advice on accessories, bodyweight work, or sparse logs when the signal does not justify it.
- Preserve a hard line between advisory interpretation and committed program state.

**Data And Logic Implications At A High Level**

PlateIQ needs a progression layer that starts from the narrowest high-confidence cases rather than from an ambition to cover every lift. Guidance should inherit the same coverage framing used in analytics and effort capture.

**Risks And Tradeoffs**

- Over-broad recommendations will damage trust faster than missing recommendations.
- Narrow first-version scope may disappoint users expecting universal coaching.
- If hold and review are not treated as acceptable outcomes, the product will over-prescribe and imply more certainty than it has.
- If the product language is careless, users may infer medical or safety guarantees that PlateIQ cannot actually provide.

**Success Criteria**

- Users understand why some lifts get guidance and others do not.
- Recommendations feel earned, bounded, and easy to override.
- PlateIQ improves next-step decisions in supported cases without pretending to be a universal coach.
- Deload remains explicitly user-owned in unsupported or mixed-signal cases.

### CSV Export In Settings

**Recommendation:** Yes. CSV export should live in Settings.

**Problem**

As PlateIQ becomes more valuable, training data ownership becomes a product requirement, not an admin nice-to-have. Users need a clear way to take their full history with them. Without that, the product feels less trustworthy and more like a silo.

**Why It Fits PlateIQ**

Settings is already where users manage account-level concerns such as preferences, identity, and account-state recovery. Data export belongs with privacy, portability, and ownership controls, not inside the daily workout flow. This is especially important for a product aimed at serious training history rather than disposable check-ins.

**Proposed User Experience**

- Settings should contain a dedicated Data Export area.
- The primary action should be framed as "Download your PlateIQ data."
- The default export should cover the user's core structured training history.
- The export should be delivered as multiple CSVs in a single package, not as a single flattened spreadsheet.
- The product should clearly explain what is included and what is not.
- Export should feel like a user-facing portability control, not a developer utility.

**Core Requirements**

- Include the core structured training data a reasonable user would expect to count as their PlateIQ history.
- Cover programs, cycles, workouts, logged sets, training max history, custom exercises, workout notes, strength-profile-related inputs, and relevant settings or metadata that help interpret the history.
- Preserve timestamps and stable identifiers so the export is actually useful.
- Distinguish source-of-truth training data from derived outputs.
- Work as an account-level feature in Settings because that is the correct mental model.
- Be clear about whether guest users can export immediately or under what limits.

**Data And Logic Implications At A High Level**

PlateIQ needs a documented export boundary. The product should treat raw training history as the canonical export and derived interpretations as secondary. If AI insight outputs are included, they should be clearly separated from core training data because they are interpretations, not ground truth.

**Risks And Tradeoffs**

- CSV is imperfect for relational data, so a single-file export would be misleading.
- Exporting too little undermines trust.
- Exporting too much derived data can confuse users.
- Data portability increases privacy and support expectations.
- Guest account support introduces product questions about timing and identity state.

**Success Criteria**

- Users can take their full training history without support intervention.
- The export feels complete and legible.
- Spreadsheet-oriented users can analyze their data immediately.
- The feature reinforces trust in PlateIQ as a serious long-term training system.

### Lightweight Feedback Intake And Trust Baseline

This is not compliance theater. It is baseline product trust.

**Problem**

As PlateIQ adds more interpretation, users need a clear place to report bugs, confusing guidance, and missing coverage. They also need visible baseline policy surfaces and a narrow advisory boundary. Right now that trust layer is too implicit.

**Why It Fits PlateIQ**

Serious training users tolerate product limits when the product is direct about them. A lightweight feedback path and calm trust framing support credibility without interrupting workouts.

**Proposed User Experience**

- Add one obvious feedback entry point in a low-friction place such as Settings, plus one contextual path where users naturally notice issues.
- Keep intake short and product-oriented: bug, feature request, confusing insight, or other.
- Make Terms and Privacy easy to reach from account, settings, and public surfaces.
- Use a narrow advisory disclaimer around analytics and future guidance: PlateIQ supports training decisions but does not replace medical, rehab, or professional coaching judgment.
- Avoid a disruptive sign-in interruption whose main job is liability transfer rather than user clarity.

**Core Requirements**

- One obvious in-app feedback path.
- Visible terms and privacy surfaces.
- Disclaimer language that is narrow, calm, and attached to advisory contexts rather than blocking account entry.
- Any move from retrospective insight language toward directive coaching or progression claims should trigger legal review before launch.
- Product claims that stay within what PlateIQ can actually support.

**Data And Logic Implications At A High Level**

Feedback should carry enough context to be actionable without becoming a support maze. Trust language should stay consistent across onboarding, settings, analytics, and future guidance surfaces.

**Risks And Tradeoffs**

- Too much disclaimer copy will make the product feel defensive.
- A buried feedback form is almost equivalent to no feedback form.
- Vague legal language creates confusion rather than trust.

**Success Criteria**

- Users know where to report an issue or suggestion in one step.
- Trust surfaces feel adult and non-disruptive.
- PlateIQ sets clear expectations as its recommendations become more consequential.

## 3. Current AI Insights vs Prescriptive Progression Guidance

PlateIQ's current AI insights are valuable, but they are not the same thing as prescriptive progression guidance.

Current AI insights are advisory and retrospective. They summarize recent training, identify strengths and concerns, and suggest practical recommendations based on an analytics snapshot. Even when they sound forward-looking, they remain interpretation. They do not directly decide what the next session should do.

Prescriptive progression guidance is a separate product capability with a much higher trust bar.

| Dimension | Current AI Insights | Prescriptive Progression Guidance |
|---|---|---|
| Primary job | Explain recent training | Recommend what to do next |
| Time orientation | Retrospective and reflective | Forward-looking and operational |
| Inputs | Analytics snapshot filtered by time range and optional exercise | Program context, recent execution, effort data, notes, cycle state, and user preferences |
| Output | Summary, strengths, concerns, recommendations | Specific next-step guidance tied to lifts, sessions, or cycle checkpoints |
| Relationship to the plan | No direct control over the plan | Can influence the next planned decision, but only with user confirmation |
| User action | Read and interpret | Accept, edit, dismiss, snooze, or disable |
| Explainability requirement | Moderate | Very high |
| Trust risk if wrong | Advice feels weak or generic | User may lose trust in the program logic or the product itself |

The key distinction is this: current AI insights help the user understand their training; prescriptive progression guidance helps the user decide their next move inside a structured program.

PlateIQ should keep these layers separate in the product model. Current AI can remain the narrative layer, but it should be explicitly framed as retrospective insight rather than operational coaching. Existing AI surfaces and copy should be recast as insight summaries before or alongside any separate guidance layer. Prescriptive guidance should begin as a narrow, method-bound decision-support layer with stronger guardrails, clearer user control, and explicit coverage limits.

## 4. Open Product Questions

- Should PlateIQ treat effort language as a global user preference, a program-level choice, or a per-exercise choice?
- What is the minimum comparability rule for the in-workout context card: exact rep target, AMRAP flag, set role, week scheme, or a layered fallback?
- When should the product show "no comparable recent session" instead of falling back to a weaker exercise-level summary?
- Where should analytics coverage labels appear first so users actually notice them: the dashboard, AI insight surfaces, or both?
- What is the minimum useful first bodyweight lane: rep trends, added-load history, consistency, or some combination?
- What additional training-max actions or history views should advanced users still need beyond dashboard visibility and future cycle-review adjustments as Exercises is de-emphasized?
- What compatibility path should preserve existing custom programs and drafts that still encode uses_training_max or tm_percentage-style assumptions as builder flows become method-first?
- Where should the first feedback entry point live to maximize usage without interrupting workouts?
- Do baseline Terms and Privacy pages plus a narrow advisory disclaimer satisfy the current trust bar, or does stronger guidance require explicit legal review before rollout?
- What additional evidence would justify expanding beyond hold, increase, repeat, and review into richer method-specific progression guidance?
- Should guest users have the same export rights before upgrade or merge, or should portability boundaries differ by account state?

## 5. Recommended Implementation Order From A Product Perspective

Some enabling cleanup from workout ergonomics and analytics consistency is already shipped, but the order below still reflects the remaining product work. The first implemented slice also confirmed that in-workout context or history is worth keeping, but in a narrower history-first and comparable-set-aware shape rather than a note-heavy one.

1. **Workout execution ergonomics**  
This remains the foundation because the product lives or dies in the gym.

2. **In-workout context/history**  
This is still the highest-confidence judgment aid inside the session. The first shipped shape should stay history-first, lightweight, and comparable-set-aware rather than note-heavy.

3. **Program-method consistency and navigation simplification**  
This should first clarify that programs plan, workouts execute, the current complete-cycle TM preview is the seed of future cycle review, and dashboard and analytics provide supporting context; then continue the builder-side exercise rehoming already underway, move the remaining exercise and training-max jobs into the right program and workout surfaces, keep generic deload fields out of the active builder UI, keep analytics centered on broader signals such as e1RM and strength profile rather than training max, and remove Exercises from primary navigation and routing in favor of Programs and Workouts without leaving a compatibility redirect behind.

4. **First-class RPE/RIR capture**  
This adds the missing effort signal once the workout surface can absorb it cleanly.

5. **Method-aware analytics and bodyweight coverage**  
This makes the post-workout layer more honest before PlateIQ tries to recommend next steps too aggressively.

6. **CSV export in Settings**  
This remains strategically important for trust and long-term data ownership.

7. **Lightweight feedback intake and trust baseline**  
This gives users a correction channel and clear boundaries as the product becomes more interpretive.

8. **Prescriptive progression guidance**  
This should come last, stay narrow until coverage, confidence, and trust surfaces are stronger, treat hold and review as first-class outcomes, and leave deload manual except for explicit programmed deload weeks.
