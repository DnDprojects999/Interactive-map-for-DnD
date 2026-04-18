# Serkonia

Serkonia is a static worldbuilding site for maps, timelines, archives, heroes, active events, and homebrew notes. It can be used as a personal setting wiki, a DnD campaign hub, or a lore portal for players.

The project works as a static site, so you can host it with GitHub Pages without a backend.

## What The Site Can Do

- world map with markers and right-side information panel
- timeline with acts, event details, and links back to the map
- archive with expandable lore cards
- hall of heroes
- homebrew section for rules, changes, and custom articles
- editor mode directly in the browser
- export and import through `changes.json`
- multilingual content support

## Quick Publish Through GitHub

### 1. Create Your Copy Of The Project

You have two simple options:

1. Fork this repository
2. Or create a new repository and upload the project files there

**Screenshot placeholder:**  
`[Add screenshot here: creating or forking the repository on GitHub]`

### 2. Open The Repository Settings

After the files are in your repository:

1. Open the repository on GitHub
2. Go to `Settings`
3. Open `Pages`

**Screenshot placeholder:**  
`[Add screenshot here: opening Settings -> Pages]`

### 3. Turn On GitHub Pages

Inside `Pages`:

1. In `Source`, choose `Deploy from a branch`
2. Select branch `main`
3. Select folder `/ (root)`
4. Save

GitHub will generate a public link for the site.

**Screenshot placeholder:**  
`[Add screenshot here: branch and root folder selected in GitHub Pages]`

### 4. Open Your Site

After GitHub finishes deployment, your site will be available at a link like:

- `https://yourname.github.io/repository-name/`

If the repository is named exactly `yourname.github.io`, then the site usually opens at:

- `https://yourname.github.io/`

**Screenshot placeholder:**  
`[Add screenshot here: published site link in Pages section]`

## Local Launch

If you want to run the site on your own computer before publishing:

1. Download or clone the repository
2. Open the project folder
3. Run a simple static server

Example with Python:

```powershell
python -m http.server 8000
```

Then open:

- `http://127.0.0.1:8000`

You can also use VS Code with Live Server if you prefer.

## Editor Mode

The site has a built-in editor mode.

### On Localhost

When the project is opened through local addresses like:

- `localhost`
- `127.0.0.1`
- `::1`

editor access is available automatically.

### On A Published Site

Use:

- `?editor=1`

Example:

- `https://yourname.github.io/repository-name/?editor=1`

Then press:

- `Ctrl + Shift + \``

This toggles editor mode on and off.

## Content And Save Logic

The site uses modular base files plus one overlay file for browser edits.

Base content lives in:

- `data/markers.json`
- `data/timeline.json`
- `data/archive.json`
- `data/heroes.json`
- `data/homebrew.json`
- `data/active-map.json`

Browser-made changes are collected into:

- `data/changes.json`

In practice this means:

- you keep base content separate
- you can export one delta file after editing
- you can later import that same file into another copy of the site

## Project Structure

### Main Files

- `index.html`
  Main HTML shell of the application.

- `css/style.css`
  Global site styles, section layouts, editor windows, and visual states.

- `js/app.js`
  Main app bootstrap. Loads data, initializes modules, wires the app together.

### JavaScript Modules

- `js/modules/ui.js`
  Top-level mode switching and shell behavior for map, timeline, archive, homebrew, heroes, and active map.

- `js/modules/homebrew/homebrewController.js`
  Homebrew section: article rendering, inline editing, categories, tables, and collapsible sections.

- `js/modules/archive/`
  Archive rendering and archive-side helpers.

- `js/modules/heroes/`
  Hall of Heroes rendering and hero interactions.

- `js/modules/players/`
  Player sidebar, notes, favorites, and player-related helpers.

- `js/modules/editor/`
  Editor-specific logic such as map textures and editing helpers.

- `js/modules/app/`
  App-level controllers like compact menus, language switching, loading screen editor, and map view admin tools.

### Data

- `data/`
  Main content folder.

- `data/schemas/`
  JSON schema files used for validation-related tooling.

### Assets

- `assets/`
  Icons and static media used by the interface.

## Where To Edit Different Parts Of The Site

If someone wants to change only one part of the project, this is the fastest map:

### Branding And Header

- `index.html`
- `css/style.css`
- `js/modules/ui.js`

### Map

- `data/markers.json`
- `js/modules/map.js`
- `js/modules/mapControls.js`
- `js/modules/panelDetails.js`

### Timeline

- `data/timeline.json`
- `js/modules/timelineModel.js`
- `js/modules/timelineView.js`
- `js/modules/ui/timelineActsController.js`

### Archive

- `data/archive.json`
- `js/modules/archive/`

### Heroes

- `data/heroes.json`
- `js/modules/heroes/`

### Homebrew

- `data/homebrew.json`
- `js/modules/homebrew/homebrewController.js`

### Loading Screen

- `js/modules/app/loadingScreenAdminController.js`
- `js/modules/worldInfo.js`

### Language System

- `js/modules/localization.js`
- `js/modules/uiLocale.js`

## Suggested Screenshot Sections For This README

You said you may want to add a clearer guide later, so here are ready-made places to expand:

### Screenshot Block A

`[Add screenshot here: repository creation / fork]`

### Screenshot Block B

`[Add screenshot here: enabling GitHub Pages]`

### Screenshot Block C

`[Add screenshot here: entering editor mode]`

### Screenshot Block D

`[Add screenshot here: editing map markers / timeline / archive]`

### Screenshot Block E

`[Add screenshot here: exporting and importing changes.json]`

## Notes For Customizers

If someone wants to change the site for their own world:

- rename the world through editor mode or by editing `worldInfo`
- replace the data files in `data/`
- replace icons in `assets/`
- edit `css/style.css` for visual customization
- edit section logic in the relevant controller under `js/modules/`

If someone wants only content edits, they usually do not need to touch the code at all.

## License / Usage

Add your preferred usage terms here before posting publicly.

Example placeholders:

- personal use allowed
- forks allowed with credit
- commercial use not allowed without permission

