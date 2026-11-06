# Accessibility and small-screen checks

TomatoTick aims to be usable with a keyboard, a screen reader, high-contrast
display settings, and small phones. Automated tests cover the timer, task
drawer, settings, and stats views, but a few checks still need a real browser.

Run these before shipping a UI change.

## Automated

```bash
npm test
```

The suite includes axe checks for the four main views and unit tests for range
announcements, the activity calendar's text alternative, and the timer live
region.

## Keyboard

1. Start at the top of the page and press `Tab` through every control. The focus
   ring must stay visible against the page background.
2. Open **Stats**, then move between the range buttons with `Tab` and activate
   them with `Enter` or `Space`. The range must change and the focus ring must
   stay on the active button.
3. Open **Settings**, press `Tab` until focus wraps, then press `Escape`. Focus
   must return to the button that opened the dialog.
4. On a phone-width window, open **Tasks**. `Escape` closes the drawer and focus
   returns to the Tasks button.
5. In the timer view, press `Space` to start and pause, `R` to reset, and `S` to
   skip. Shortcuts must not fire while a text field has focus.

## Screen readers

Check with VoiceOver on macOS or iOS, and NVDA on Windows.

1. The timer exposes its mode, remaining time, and elapsed fraction. Starting or
   pausing announces the new state once, not on every tick.
2. Completing a session announces the next mode without repeating the countdown.
3. In **Stats**, changing the range announces the new totals. The activity
   calendar exposes a text list of active days, so intensity is not conveyed by
   colour alone.
4. Chart values are available as a text summary; the visual chart itself is
   hidden from assistive technology to avoid duplicate announcements.
5. In **Tasks**, each task reads its title, priority, tags, and focus progress,
   and the current focus task is identifiable.

## Small screens and zoom

1. At 320px wide, no view scrolls horizontally. Check the timer, task drawer,
   stats modal, settings modal, and the custom date range inputs.
2. Zoom the browser to 200%. Content reflows without clipping and the timer
   remains usable.
3. In portrait and landscape, the timer and modals fit without being cut off by
   browser chrome or the notch. Modals scroll internally instead of pushing
   buttons off screen.
4. Form fields do not trigger automatic zoom on iOS Safari (text is at least
   16px on small screens).
5. Every button, switch, and date input is comfortable to tap (at least 44px).

## Visual settings

1. With `prefers-reduced-motion: reduce`, the completion pulse and transitions
   stop.
2. In Windows High Contrast (or a forced-colors emulation), the progress ring,
   heatmap levels, trend bars, and active range buttons remain distinguishable.
3. Every theme (System, Light, Dark, Sunset, Forest, Midnight) keeps text and
   controls readable at normal and zoomed sizes.
