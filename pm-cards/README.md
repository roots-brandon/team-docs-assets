# pm-cards

The roots-pm cards (answers, plan, done) as one script, so a chat draws a round with a few lines instead of pasting the whole template.

```html
<div id="rc"></div>
<script src="https://cdn.jsdelivr.net/gh/roots-brandon/team-docs-assets@pm-cards-1.0.0/pm-cards/cards.js"></script>
<script>RootsCards.answers({ /* the round's data, as roots-pm references/cards.md describes */ }, 'rc')</script>
```

Styling and layout only: no customer or team data lives here. Built from roots-pm's `assets/` templates in the roots-team repo; a change to the look is a roots-pm release, then a new tag here (`pm-cards-<version>`). Pin a tag, never `@main`, so a chat always draws the version its roots-pm names.
