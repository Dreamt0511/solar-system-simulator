# Solar and Mars Color Adjustment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the Sun to an orange-red palette and Mars to a more realistic rusty ochre-red color.

**Architecture:** Keep the change localized to `planets.js`, where planet data, Sun core material, and Sun glow colors are already defined. Do not add new rendering systems or texture dependencies.

**Tech Stack:** JavaScript ES modules and Three.js materials already used by the project.

---

### Task 1: Update Planet Colors

**Files:**
- Modify: `太阳系行星系统/js/planets.js:7-234`

- [ ] **Step 1: Verify current syntax before editing**

Run:

```bash
node --check "太阳系行星系统/js/planets.js"
```

Expected: PASS with no output.

- [ ] **Step 2: Change Sun and Mars colors**

In `PLANET_DATA.sun`, change:

```javascript
color: 0xffcc33,
```

to:

```javascript
color: 0xff7a1f,
```

In `PLANET_DATA.mars`, change:

```javascript
color: 0xc1440e,
```

to:

```javascript
color: 0xb45a32,
```

- [ ] **Step 3: Change Sun core and glow colors**

In `createSun()`, change the core material color from:

```javascript
color: 0xffee55
```

to:

```javascript
color: 0xff6a1a
```

Change inner glow color from:

```javascript
color: 0xffdd88,
```

to:

```javascript
color: 0xff8a3d,
```

Change outer glow color from:

```javascript
color: 0xffaa44,
```

to:

```javascript
color: 0xff3f1f,
```

- [ ] **Step 4: Verify syntax after editing**

Run:

```bash
node --check "太阳系行星系统/js/planets.js"
```

Expected: PASS with no output.

- [ ] **Step 5: Browser visual check**

Open:

```text
http://127.0.0.1:8000/
```

Expected:

```text
1. The Sun appears orange-red rather than yellow.
2. The Sun glow matches the orange-red core instead of staying golden-yellow.
3. Mars appears as a rusty ochre-red, less saturated than the previous bright red-orange.
4. Other planet colors are unchanged.
```

---

### Self-Review

- Spec coverage: Sun data color, Sun rendered core, Sun glow, and Mars data color are covered.
- Placeholder scan: no placeholders remain.
- Type consistency: only existing color numeric literals are changed.
