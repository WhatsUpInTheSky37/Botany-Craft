# Botany Craft

A block-world game that teaches botany. Explore six real Earth biomes laid out on a climate map (cold north, hot south, dry west, wet east), dig into the soil to read its horizons, gather seeds from wild plants, and grow them where they belong. Everything you meet goes into a Field Journal, and 17 quests with quiz questions walk you through the science.

Runs in any modern browser on Mac, Windows, Linux, iPhone and Android. No install, no build step.

## Play

* **Hosted:** enable GitHub Pages for this repository (Settings → Pages → Source: *GitHub Actions*). The included workflow publishes the site on every push to `master`.
* **Locally:** open `index.html` in a browser, or serve the folder (`npx http-server .`) and visit the printed URL.

## What it teaches

| Topic | In the game |
|---|---|
| Soil science | 10 soil types based on USDA soil orders (Alfisol, Mollisol, Aridisol, Oxisol, Spodosol, Histosol, gley, compost, caliche, bedrock), each with real horizons, pH, texture, drainage and where on Earth it occurs. Dig down to see the profile. |
| Plant requirements | 38 plants and 14 trees with real soil, pH, water, light and climate needs. The growth simulation scores all five every tick and explains exactly why a plant is thriving or withering. |
| Biogeography | Six biomes with their real-world locations, climate and native species. A world map shows how temperature and rainfall decide the biome. |
| Ecology | Nitrogen fixation (legumes), pollination (bees, butterflies, hummingbirds visit your flowers and double seed yield), herbivory (deer and hares eat unfenced crops), invasive species, epiphytes, carnivorous plants, succession, fire ecology, composting, the Three Sisters. |
| Animals | 16 animals, each with its role in the ecosystem. |

## Controls

Desktop: WASD to move, mouse to look (click to capture), left click to use or harvest, right click to inspect, 1 to 9 or mouse wheel for tools and seeds, J journal, Q quests, M map, Esc menu.

Phone: left thumb drags to move, right thumb drags to look, tap to use, press and hold to inspect. Jump and Run buttons bottom right.

## Code layout

* `js/data/` botanical content: soils, biomes, plants, trees, animals, quests and quizzes.
* `js/textures.js` procedural pixel-art atlas (blocks and plant sprites), drawn at load time.
* `js/world.js` terrain, climate map, soil horizons, trees and wild plants.
* `js/mesher.js` chunk meshes with ambient occlusion, water and plant sprites.
* `js/sim.js` growth simulation and plant diagnosis.
* `js/player.js`, `js/animals.js`, `js/ui.js`, `js/main.js` controls, creatures, interface and game loop.

Rendering uses [three.js](https://threejs.org/) from a CDN. Progress saves to the browser's local storage.
