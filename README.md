# Interactive map (working title "Serkonia")

> A flexible worldbuilding and campaign hub for maps, timelines, archives, heroes, and homebrew content.

Serkonia is a static browser-based worldbuilding tool. It can be used as a personal setting wiki, a tabletop campaign hub, a lore portal for players, or a lightweight interactive atlas for any fictional universe.

The project is intentionally system-agnostic. You can adapt it for DnD, Pathfinder, Starfinder, custom sci-fi settings, historical worlds, or anything else that benefits from a map, timeline, archive, and character roster.

## Quick Start

1. Fork or download this repository.
2. Run it locally or publish it through GitHub Pages.
3. Open the site in a browser.
4. Enable editor mode if you want browser-based editing.
5. Build your world, export changes, and commit the updated JSON files.

## Who This Is For

- Game masters who want a clean campaign portal for players.
- Worldbuilders who need one place for maps, timelines, archives, and characters.
- Writers who want a static lore site without a backend.
- Groups that want a portable project they can host on GitHub Pages.

## Features

- Interactive world map with layers, markers, labels, and a right-side detail panel.
- Timeline with acts, event cards, and links back to map/archive content.
- Archive for expandable lore cards, factions, places, artifacts, and notes.
- Hall of Heroes for characters, allies, legends, and important NPCs.
- Homebrew section for rules, rulings, campaign material, and custom articles.
- Built-in editor mode with browser-side editing tools.
- Import/export workflow through `data/changes.json`.
- Multilingual content and interface support.
- Site themes, palette groups, and map-view modes.
- Hover hints that explain the interface and can be reset from editor tools.
- Audio and ambience controls with local preview and editor upload tools.

## Example

[Example text](https://dndprojects999.github.io/Example-interactive-map/)

## Flexibility

Serkonia is not tied to one ruleset or one genre. The default visual style is restrained fantasy, while the theme system can switch the same content into a different presentation, such as a sci-fi command interface.

The data stays in JSON files, so content can be edited through the browser editor, by hand, or with external tools.

## Quick Publish Through GitHub

1. Create your own repository or fork this one.
2. Open the repository on GitHub.
3. Go to `Settings -> Pages`.
4. Set `Source` to `Deploy from a branch`.
5. Select branch `main`.
6. Select folder `/ (root)`.
7. Save and wait for GitHub to generate the public link.

Your site will usually appear at:

```text
https://yourname.github.io/repository-name/
```

If the repository is named exactly `yourname.github.io`, the site usually appears at:

```text
https://yourname.github.io/
```

## Run Locally

Download or clone the repository, open the project folder, and run a simple static server:

```powershell
python -m http.server 8000
```

Then open:

```text
http://127.0.0.1:8000
```

You can also use VS Code with Live Server.

## Editor Mode

Editor mode is available automatically on local addresses such as `localhost`, `127.0.0.1`, and `::1`.

On a published site, editor mode is disabled by default. To allow public editing, open `index.html` and change:

```html
window.SERKONIA_CONFIG = {
  publicEditorAccess: false,
};
```

to:

```html
window.SERKONIA_CONFIG = {
  publicEditorAccess: true,
};
```

Toggle editor mode with:

```text
Ctrl + Shift + `
```

## Content And Save Logic

Base content lives in:

- `data/markers.json`
- `data/timeline.json`
- `data/archive.json`
- `data/heroes.json`
- `data/homebrew.json`
- `data/players.json`
- `data/world.json`

Browser-made edits are collected into:

- `data/changes.json`

This keeps the original content separate from the editable overlay. You can export the overlay, import it into another copy, or commit it as part of your published world.

## Documentation

- [Editor Mode & Workflow](Docs/Editor.md)
- [Project Structure](Docs/Structure.md)

## Notes For Customizers

- Change world text, loading copy, language settings, map views, site theme, and audio defaults through editor mode or `data/world.json`.
- Replace map markers and lore content by editing the JSON files in `data/`.
- Replace icons and media through `assets/`.
- Adjust layout and visual language through the split CSS files in `css/`.
- Add deeper behavior by editing the relevant controller under `js/modules/`.

If you only want content changes, you usually do not need to touch JavaScript.

## License / Usage

Add your preferred usage terms before publishing your own copy.

Suggested placeholder:

- Personal use allowed.
- Forks allowed with credit.
- Commercial use requires permission.
