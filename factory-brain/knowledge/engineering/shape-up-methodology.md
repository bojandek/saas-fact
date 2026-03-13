# Shape Up Methodology: Ryan Singer - 6-Week Cycles

## Overview
Ryan Singer developed "Shape Up" as an alternative to both traditional Waterfall and continuous Agile. Basecamp uses it successfully at scale. It's less about daily standups, more about **betting on shaped work**.

Core philosophy: **Define what we're building (shaped), not how we're building it. Give teams autonomy within clear boundaries.**

## The Problem Shape Up Solves

### Agile's Pitfalls
```
Sprint Planning:
├─ "We'll do 40 story points"
├─ Points are guesses
├─ Scope creeps mid-sprint
├─ "Just 2 more weeks" spirals
└─ Never enough time to finish

Backlog Grooming:
├─ Infinite list of features
├─ Nothing prioritized clearly
├─ PMs constantly saying "do this instead"
└─ Teams interrupted constantly

Stand-ups:
├─ Ceremony, not substance
├─ People don't listen
├─ No decision-making
└─ Takes 30 minutes for no output
```

### Shape Up's Approach
```
Planning:
├─ Deep work on what (before who)
├─ Shaped work scoped to 6 weeks
├─ Clear "done" definition
└─ No mid-cycle pivot (unless emergency)

Focus:
├─ Team owns how they build it
├─ No daily standups (async check-ins)
├─ Continuous integration (not sprint end)
└─ Real-time problem solving

Delivery:
├─ Finished or shipped, no "done mid-feature"
├─ Scope cuts happen proactively
├─ Betting (not hoping) things ship
└─ Retrospectives inform next cycle
```

## The Six-Week Cycle

### Structure

```
Week 1-2: Shaping + Planning
├─ Leads (PM, designer, tech) shape work
├─ Risk assessment
├─ Scope definition
│  ├─ "This IS included"
│  ├─ "This IS NOT included"
│  └─ "Scope cuts if running out of time"
├─ Betting table (leadership decides what to fund)
└─ Team selected based on skills needed

Week 2: Kickoff
├─ Shaped work presented to team
├─ Team asks clarifying questions
├─ No assigned tasks (team self-organizes)
├─ Acceptance criteria clear
└─ Timeline: 6 weeks

Week 3-5: Build & Integration
├─ Team self-organizes work
├─ Daily async updates (no standups)
├─ Integration as they go (not end-of-sprint)
├─ Problem-solving in real-time
└─ No scope changes (unless emergency)

Week 5-6: Polish & Ship
├─ Finish edge cases
├─ Test thoroughly
├─ Fix bugs
├─ Performance tuning
└─ Deploy when ready

Post-Cycle: 2-Week Cool Down
├─ No planned work
├─ Team: Fix bugs, handle small requests
├─ Leaders: Observe product, gather feedback
├─ Plan next cycle
└─ Time for learning, exploration
```

## The Shaping Process

Before announcing work, do 3-4 weeks of **shaping** with small group.

### Step 1: Set Appetite

```
Appetite = How much time will we bet?

NOT time estimate. Rather:
├─ Small bet: 1 person for 1 week? (5 days)
├─ Medium bet: 1 person for 2 weeks? (10 days)
├─ Large bet: 1 person for 6 weeks? (30 days)
└─ Or: 2 people for 6 weeks (60 person-days)

Appetite constrains scope:
├─ "60 person-days for new checkout"
├─ This is finite, forces prioritization
├─ Must cut scope to fit
└─ NOT "let's estimate then timebox"
```

### Step 2: Explore

```
Research phase (not detailed spec):

1. Identify the problem
   ├─ What's the actual user pain?
   ├─ Why haven't we solved it?
   └─ Who has this pain?

2. Study existing solutions
   ├─ What do competitors do?
   ├─ What do other tools do?
   ├─ Are there patterns?
   └─ What can we learn?

3. Sketch potential solutions
   ├─ Multiple approaches (3-5)
   ├─ Quick sketches (not detailed)
   ├─ Brutal prioritization (pick 1-2)
   └─ Identify key decisions

4. Interface sketching
   ├─ Show how user interacts
   ├─ Use paper or simple tools
   ├─ Not high-fidelity
   └─ Enough to test concept
```

### Step 3: De-risk

```
Identify potential problems BEFORE committing:

Technical risks:
├─ "Will this API support the load?"
├─ "Can we integrate with service X?"
├─ "Is the database query fast enough?"
└─ "Build spike to answer"

Design risks:
├─ "Is flow intuitive?"
├─ "Will users understand this?"
└─ "Quick user test with prototype"

Feasibility risks:
├─ "Haven't done this before"
├─ "External dependency?"
├─ "Experimental tech?"
└─ "Proof of concept needed"

After de-risking:
├─ Confident we can do this? → Proceed
├─ Major unknowns remain? → More shaping needed
└─ Risks too high? → Trim scope
```

### Step 4: Write the Brief

```
1-Page Shaped Brief Template:

┌─ PROBLEM ────────────────────────────────┐
│ Users can't find features in long lists.│
│ Search exists but 40% don't know it.    │
└──────────────────────────────────────────┘

┌─ APPETITE ─────────────────────────────┐
│ Two weeks, one person                  │
└───────────────────────────────────────┘

┌─ SOLUTION ─────────────────────────────┐
│ [Sketches of UI]                       │
│ Use command palette pattern:            │
│ Cmd+K → Search box → Results            │
│ Show recently accessed features first   │
│ Fuzzy match (not exact match)           │
└───────────────────────────────────────┘

┌─ WHAT CHANGES / WHAT DOESN'T ─────────┐
│ IN:                                    │
│ • Command palette for feature search   │
│ • Fuzzy matching algorithm             │
│ • Keyboard navigation                  │
│ • Integrate with feature flags         │
│                                        │
│ OUT (scope cuts if needed):            │
│ • Mobile version                       │
│ • Favorites system                     │
│ • Search history                       │
│ • Analytics tracking                   │
└───────────────────────────────────────┘

┌─ RISKS & DE-RISKING ──────────────────┐
│ Risk: Fuzzy match too slow?            │
│ Mitig: Built spike, <50ms ✓            │
│                                        │
│ Risk: Users don't find it?             │
│ Mitig: Test in-product, A/B test       │
└───────────────────────────────────────┘
```

## The Betting Table

Weekly leadership meeting (30 min):

```
Attendees:
├─ CEO / Product Head
├─ Key PMs
├─ Tech Lead
└─ Design Lead

Agenda:
├─ 1. Review cool-down feedback
├─ 2. Highlight from last cycle
├─ 3. Present shaped work candidates
├─ 4. Decide what to fund (betting)
│  ├─ "We're betting 2 people on X for 6 weeks"
│  ├─ "We're betting 1 person on Y for 6 weeks"
│  └─ "We're NOT doing Z (back to shape for later)"
├─ 5. Pick teams
│  ├─ Who has skills for X?
│  ├─ Who's available?
│  └─ Growth opportunities?
└─ 6. Kickoff next week

Decision filter:
├─ "Is this shaped well enough?"
├─ "Will this move the needle?"
├─ "Are we betting instead of hoping?"
└─ "Do we have the right team?"
```

## Team Structure During Cycle

### No Project Manager

```
NOT: "Here's your tasks for the sprint"

YES: "Here's the shaped work, solve it"
├─ Team reads brief (15 min)
├─ Team asks clarifying questions
├─ Team self-organizes how to solve
├─ Team makes daily decisions
└─ Leads available but not directing

Benefits:
├─ Ownership mentality
├─ Better solutions (team thinks deeply)
├─ Faster problem-solving (teams solve immediately)
└─ More satisfying work
```

### One Tech Lead, One Designer

```
Role: Solve problems, not manage

Tech Lead:
├─ Available for architecture questions
├─ Helps with hard technical problems
├─ Reviews code thoughtfully
├─ Doesn't assign tasks
└─ Escalates only if can't solve

Designer:
├─ Clarifies interaction design
├─ Tests with users mid-cycle if needed
├─ Adjusts based on engineering constraints
├─ Available but not directing
└─ Helps make push-back decisions
```

### Async Communication

```
Daily Update (Async):
├─ Each person posts: What I did, what I'm doing, blockers
├─ 5 minutes to read all updates
├─ If blocked: Async discussion or quick video call
├─ NOT: Standing meeting

Problem Solving:
├─ Post in Slack: Quick question → Quick response
├─ If complex: 15-min video call
├─ Decision made immediately
└─ Life continues

Meetings:
├─ Kickoff (1 hour): Present shaped work
├─ Demos (30 min): Show progress mid-cycle
├─ Shipping (30 min): Go/no-go decision
└─ Everything else: Async
```

## Scope Cuts (Pro-active, Not Reactive)

### Why Cuts Matter

```
6-week clock is ticking:

Week 3: Track record
├─ 50% done? On pace.
├─ 30% done? Running behind.
└─ Action: Cut scope now, don't wait.

Week 4: Last chance
├─ 65% done? Cutting scope won't help.
├─ 40% done? Radical cuts needed.
└─ Action: Now or never.

Week 5-6: Polish time
├─ Should be 90% done
├─ Fix bugs, improve UX
├─ NOT adding features
```

### How Cuts Work

```
Step 1: Identify expendable features
├─ What was "OUT" scope is first to cut
├─ What's not on critical path
└─ What "nice to have"?

Example:
├─ Critical: Search algorithm, UI, keyboard nav
├─ Nice to have: Analytics tracking, mobile version
├─ Cut: Analytics & mobile
└─ Ship 90% amazing vs 60% OK

Step 2: Announce cuts clearly
├─ "We cut mobile for this cycle"
├─ "It will be next cycle's focus"
├─ "This doesn't change our plan (just timing)"
└─ Clarity prevents resentment

Step 3: Don't re-add cut scope
├─ "Mobile users can use web version"
├─ "Analytics we'll add next cycle"
└─ Discipline prevents scope creep
```

## No Mid-Cycle Pivots

### The Rule

```
6-week commitment = immutable (except emergencies)

What's an emergency?
├─ Security issue discovered
├─ Customer data corruption
├─ Service down → can't operate
└─ NOT: "New feature request" or "competitor did X"

If mid-cycle request arrives:
├─ "Put it on shaped backlog for next cycle"
├─ "If truly urgent, we interrupt current cycle"
├─ "But that means current shipped as-is"
└─ This filter: Is it REALLY important?
```

### Why This Works

```
Without discipline:
├─ "Quick, ship this instead"
├─ Team switches context (kills productivity)
├─ Original work half-baked
├─ Nothing ships complete
└─ Constant firefighting

With 6-week commitment:
├─ Requester: "Can this wait 2 weeks?"
├─ Urgency becomes clear
├─ Real emergencies rare
└─ Team momentum preserved
```

## Cool-Down Periods

```
After 6-week cycle:
├─ Week 7-8: Cool down (2 weeks)

Cool Down Activities:
├─ Fix bugs found during cycle
├─ Handle support requests
├─ Small improvements (not new features)
├─ Learning & exploration
├─ Conferences, reading, thinking
└─ NO: Starting next shaped work

Purpose:
├─ Release pressure (team recharged)
├─ Observe product (gather feedback)
├─ Fix issues (before next cycle)
├─ Technical debt (if team chooses)
└─ Prevent burnout
```

## Shipping Decision

### Go / No-Go

```
End of Week 6:

Shipping Committee:
├─ CEO or Product Head
├─ Team lead
├─ Tech lead
├─ Designer

Questions:
├─ "Is it production-ready?"
├─ "Did major bugs get fixed?"
├─ "Is it OK to go out?"
├─ "Will it move the needle?"
└─ "Can we support it?"

Options:
├─ GO: Ship immediately
├─ HOLD: Ship next week (minor polish needed)
├─ NO-GO: Don't ship (rare, but possible)
│  └─ Retrospective: What went wrong?
└─ Regardless: Cool-down scheduling!
```

## Levels of Shape Up

### Level 1: No Shaping
```
Status quo: Agile without shaping
├─ Backlog grooming sessions
├─ Endless refinement
├─ Story points that don't match reality
└─ Scope creep every sprint
```

### Level 2: Light Shaping
```
Before work starts:
├─ 1-2 hours shaping (PM does alone)
├─ Written brief (1 page)
├─ No design sketches
├─ Enough to start
```

### Level 3: Full Shape Up
```
As described:
├─ 3-4 weeks dense shaping
├─ Multiple approaches explored
├─ De-risked thoroughly
├─ Design sketches included
├─ 6-week cycles
```

### Level 4: Disciplined Shape Up
```
All of Level 3 +
├─ Betting table decisions
├─ No mid-cycle changes (enforced)
├─ Scope cuts (proactive)
├─ Cool-down periods (mandatory)
└─ This is Basecamp's actual practice
```

## Implementation for Startup

### Month 1: Basics
- [ ] Define 6-week cycles (pick start date)
- [ ] First shaped brief (PM does alone)
- [ ] Assign one team to shaped work
- [ ] End-of-cycle shipping decision

### Month 2: Improve Shaping
- [ ] Add 1-2 weeks shaping before cycle
- [ ] Include design sketches
- [ ] De-risk with spikes if needed
- [ ] Multi-project shaping (competitors)

### Month 3: Betting Table
- [ ] Weekly leadership sync (30 min)
- [ ] Decide what to fund (2-3 projects)
- [ ] Pick teams based on skills
- [ ] Commit to 6 weeks

### Month 4: Discipline
- [ ] Enforce no mid-cycle pivots
- [ ] Pro-active scope cuts
- [ ] Cool-down periods (mandatory)
- [ ] Measure cycle success

### Month 5+: Refinement
- [ ] Async communication protocols
- [ ] Better de-risking methods
- [ ] Retrospectives to improve shaping
- [ ] Scale to multiple cycles

## Comparing Methodologies

### Shape Up vs Agile vs Waterfall

```
Waterfall:
├─ Plan everything upfront
├─ Build for 6 months
├─ Test at end (uh oh, bugs!)
└─ Ship all at once (high risk)

Agile:
├─ Continuous sprints (good)
├─ But: No appetite (scope undefined)
├─ But: Daily standups (overhead)
├─ But: Points don't mean much
└─ Myth: "Fail fast" → ships broken stuff

Shape Up:
├─ Appetite defines scope (bounded)
├─ 6-week focus (not continuous context-switch)
├─ Shaped before execution (know what we're doing)
├─ Shipping decision (thoughtful go/no-go)
└─ Cool-down (team recharge + observe)
```

## Shape Up vs Kanban

```
Kanban:
├─ No cycles (continuous flow)
├─ Pull from backlog
├─ WIP limits
├─ Works for bug fixes, small features
└─ But: No trajectory (easier to say yes to everything)

Shape Up:
├─ Cycles create focus (2-month view)
├─ Shaped work (know we can do it)
├─ Betting (discipline)
└─ Better for product direction
```

## Lessons for Your SaaS

1. **Define appetite before shaping**: How much time, not story points
2. **Shaped work ≠ Detailed spec**: Tell what but not exactly how
3. **6-week cycles work**: Long enough to ship, short enough to focus
4. **Scope cuts beat late**: Fix mid-cycle, don't scramble at end
5. **Betting table filters**: Is it really worth shipping?
6. **No mid-cycle pivots**: Protect team focus
7. **Cool-down recharges**: Teams, not robots
8. **Shipping decision matters**: Not every cycle produces release

## Template: Shaped Brief

```
PROJECT NAME: [Name]

PROBLEM:
[1-2 sentences describing user pain]

APPETITE:
[How many weeks? How many people?]

SOLUTION:
[Sketches and description]
[Key workflows]
[How it integrates]

SCOPE BOUNDARIES:
IN:
- Feature A
- Feature B

OUT (cut if needed):
- Feature C
- Feature D

RISK & DE-RISKING:
[Technical risks]
[How we confirmed feasibility]

SUCCESS MEASURES:
[How we know it worked?]
[Business metrics or user feedback?]
```

Shape Up forces clarity. If you can't write clear brief, the work isn't shaped.
