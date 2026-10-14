window.BC = window.BC || {};
// Twenty fish you can catch with a rod. water: 'stream' (flowing), 'still' (ponds and lakes), 'salt' (mangrove coast), 'any'.
// time: 'dawn_dusk', 'night', 'day', 'any'. rarity 1 common, 2 uncommon, 3 rare. price in leaf coins at the bait shop.
(function () {
  const F = [
    { id: 'bluegill', name: 'Bluegill', sci: 'Lepomis macrochirus', biomes: ['temperate', 'prairie', 'wetland'], water: 'still', time: 'any', rarity: 1, size: '15–25 cm', price: 2, color: '#4a7a9a',
      teach: 'The pond sunfish every child catches first. Males fan a nest in the shallows and guard it. Fish scraps buried under crops were the first fertiliser of the Americas.', facts: ['A bluegill can lay 50,000 eggs; without bass to eat them a pond fills with stunted fish.', 'They eat mosquito larvae and are stocked for that reason.'] },
    { id: 'largemouth_bass', name: 'Largemouth Bass', sci: 'Micropterus salmoides', biomes: ['temperate', 'prairie', 'wetland'], water: 'still', time: 'dawn_dusk', rarity: 2, size: '30–55 cm', price: 5, color: '#5a7a3a',
      teach: 'The top predator of warm ponds and the most popular sport fish in America. It ambushes from weed beds, which is why a pond needs plants: no cover, no bass.', facts: ['Its mouth extends past the eye; a smallmouth\'s does not.', 'Bass keep bluegill numbers in check, so a balanced pond needs both.'] },
    { id: 'channel_catfish', name: 'Channel Catfish', sci: 'Ictalurus punctatus', biomes: ['temperate', 'prairie', 'wetland'], water: 'any', time: 'night', rarity: 1, size: '35–60 cm', price: 4, color: '#6a6a7a',
      teach: 'Hunts by taste: its whole skin is covered in taste buds, and the whiskers (barbels) find food in muddy water at night. The most farmed fish in the United States.', facts: ['Males guard eggs in hollow logs and undercut banks.', 'Fish emulsion is made from what filleting leaves behind.'] },
    { id: 'brook_trout', name: 'Brook Trout', sci: 'Salvelinus fontinalis', biomes: ['temperate', 'boreal'], water: 'stream', time: 'dawn_dusk', rarity: 2, size: '20–35 cm', price: 6, color: '#3a6a5a',
      teach: 'Needs cold, clean, oxygen-rich water: above 20 °C it dies. Brook trout vanish from a stream when the trees along it are cut and the water warms. It is the canary of the watershed.', facts: ['Native to the eastern forests; the "trout" of the Appalachians is really a char.', 'Shade from streamside trees keeps the water cool enough for them.'] },
    { id: 'rainbow_trout', name: 'Rainbow Trout', sci: 'Oncorhynchus mykiss', biomes: ['temperate', 'boreal', 'prairie'], water: 'stream', time: 'any', rarity: 2, size: '30–50 cm', price: 6, color: '#9a6a8a',
      teach: 'A western native stocked worldwide. It feeds on insects drifting down the current, so a trout stream is only as rich as the leaves and bugs that fall into it from the banks.', facts: ['Riffles put oxygen in; pools give cover: a healthy stream alternates the two.', 'The pink stripe is brightest in spawning season.'] },
    { id: 'northern_pike', name: 'Northern Pike', sci: 'Esox lucius', biomes: ['boreal', 'temperate', 'wetland'], water: 'still', time: 'day', rarity: 3, size: '50–100 cm', price: 10, color: '#5a6a3a',
      teach: 'A torpedo with teeth that waits in weeds and strikes anything half its length. Pike spawn in flooded spring meadows, so draining wetlands empties the lake of pike years later.', facts: ['Can live 25 years.', 'Its teeth point backwards: nothing escapes once seized.'] },
    { id: 'walleye', name: 'Walleye', sci: 'Sander vitreus', biomes: ['boreal', 'prairie', 'temperate'], water: 'still', time: 'night', rarity: 3, size: '35–70 cm', price: 9, color: '#8a8a4a',
      teach: 'Its eyes have a mirror layer like a cat\'s, so it hunts at night and in murky water. Prized as the best-tasting freshwater fish in the north.', facts: ['Spawns on gravel in rivers at ice-out.', 'State fish of Minnesota.'] },
    { id: 'yellow_perch', name: 'Yellow Perch', sci: 'Perca flavescens', biomes: ['boreal', 'temperate'], water: 'still', time: 'day', rarity: 1, size: '15–25 cm', price: 3, color: '#c8a030',
      teach: 'Travels in schools and bites all day: the ice-fishing staple of the north. Lays eggs in long jelly ribbons draped over underwater plants.', facts: ['Food for pike, walleye and loons.', 'Six to eight dark bars on a gold body.'] },
    { id: 'arctic_grayling', name: 'Arctic Grayling', sci: 'Thymallus arcticus', biomes: ['boreal'], water: 'stream', time: 'day', rarity: 3, size: '25–40 cm', price: 8, color: '#6a7aaa',
      teach: 'The sail-finned fish of clear, cold northern rivers. It smells of thyme when fresh, hence the name. Gone from most of its southern range as rivers warmed and silted.', facts: ['Rises to tiny flies; a fly-fisher\'s dream.', 'Needs gravel riffles with no silt to spawn.'] },
    { id: 'lake_whitefish', name: 'Lake Whitefish', sci: 'Coregonus clupeaformis', biomes: ['boreal'], water: 'still', time: 'any', rarity: 2, size: '35–50 cm', price: 6, color: '#b0b8c8',
      teach: 'The fish that fed the fur trade and the Great Lakes fishery for two centuries. Lives deep and cold, eating insect larvae and tiny shrimp off the bottom.', facts: ['Smoked whitefish is a northern tradition.', 'Spawns under the ice in November.'] },
    { id: 'common_carp', name: 'Common Carp', sci: 'Cyprinus carpio', biomes: ['prairie', 'temperate', 'wetland'], water: 'any', time: 'any', rarity: 1, size: '40–75 cm', price: 2, color: '#a08040',
      teach: 'Brought from Europe in the 1880s as food and now in nearly every warm river. Carp root in the bottom, stirring mud that shades out water plants. Great fertiliser, poor neighbour.', facts: ['Can live 40 years and reach 30 kg.', 'Asian carp are different species, introduced later.'] },
    { id: 'flathead_catfish', name: 'Flathead Catfish', sci: 'Pylodictis olivaris', biomes: ['prairie', 'wetland'], water: 'stream', time: 'night', rarity: 3, size: '60–120 cm', price: 12, color: '#7a6a4a',
      teach: 'The river giant: it eats only live fish and hides in log jams by day. Old flatheads are caught by "noodling", reaching into holes by hand, which is exactly as risky as it sounds.', facts: ['Can exceed 50 kg.', 'Woody debris in rivers is habitat, not litter: remove the logs and the big fish leave.'] },
    { id: 'desert_pupfish', name: 'Desert Pupfish', sci: 'Cyprinodon macularius', biomes: ['desert'], water: 'still', time: 'day', rarity: 3, size: '5–7 cm', price: 15, color: '#4aa0e0',
      teach: 'A thumb-sized fish that survives in desert springs at 45 °C and in water saltier than the sea. Each spring holds its own species, stranded there when the ice-age lakes dried up. Endangered: catch, admire, release.', facts: ['Males turn electric blue in breeding season.', 'Devils Hole pupfish live in one pool and number a few hundred.'] },
    { id: 'tilapia', name: 'Tilapia', sci: 'Oreochromis spp.', biomes: ['desert', 'rainforest'], water: 'still', time: 'day', rarity: 1, size: '20–35 cm', price: 3, color: '#8a9aa0',
      teach: 'An African cichlid farmed everywhere warm; in aquaponics its waste feeds the vegetables and the vegetables clean its water. In the wild it escapes and crowds out natives.', facts: ['Mouth-brooders: the mother carries eggs and fry in her mouth.', 'The most farmed fish on Earth after carp.'] },
    { id: 'peacock_bass', name: 'Peacock Bass', sci: 'Cichla ocellaris', biomes: ['rainforest'], water: 'any', time: 'day', rarity: 2, size: '35–60 cm', price: 8, color: '#c0a030',
      teach: 'An Amazon cichlid with an eyespot on the tail that fools predators into biting the wrong end. Both parents guard the fry, a rarity among fish.', facts: ['Hits lures so hard it breaks rods.', 'Introduced to Florida canals to eat other introduced fish.'] },
    { id: 'arapaima', name: 'Arapaima', sci: 'Arapaima gigas', biomes: ['rainforest'], water: 'still', time: 'dawn_dusk', rarity: 3, size: '150–250 cm', price: 25, color: '#5a6a4a',
      teach: 'One of the largest freshwater fish alive: it breathes air, gulping at the surface every fifteen minutes, which lets it live in oxygen-poor floodplain lakes and makes it easy to hunt. Now farmed and protected.', facts: ['Its scales are so tough piranhas cannot bite through them.', 'Floodplain forests are its nursery: when the river rises it swims among the trees.'] },
    { id: 'piranha', name: 'Red-bellied Piranha', sci: 'Pygocentrus nattereri', biomes: ['rainforest'], water: 'any', time: 'day', rarity: 1, size: '15–30 cm', price: 4, color: '#a04040',
      teach: 'Mostly a scavenger and seed eater, despite the films. Piranhas spread fruit seeds along flooded forests the way birds do on land. The frenzies happen in shrinking dry-season pools.', facts: ['Teeth interlock like scissors and are replaced in quarters.', 'A school is for protection from dolphins and caimans, not for hunting.'] },
    { id: 'snook', name: 'Common Snook', sci: 'Centropomus undecimalis', biomes: ['wetland', 'rainforest'], water: 'salt', time: 'night', rarity: 2, size: '50–90 cm', price: 9, color: '#9a9a8a',
      teach: 'Lives among mangrove roots and cannot survive a cold snap below 15 °C. Mangroves are its nursery; cut them for a marina and the snook go with them.', facts: ['A black lateral line like a pen stroke.', 'Changes sex from male to female with age.'] },
    { id: 'red_drum', name: 'Red Drum (Redfish)', sci: 'Sciaenops ocellatus', biomes: ['wetland'], water: 'salt', time: 'dawn_dusk', rarity: 2, size: '50–100 cm', price: 8, color: '#c07a5a',
      teach: 'Tails up in inches of water over oyster bars and marsh grass, grubbing crabs. It drums with its swim bladder. Blackened redfish nearly fished it out in the 1980s; limits brought it back.', facts: ['One or more black spots near the tail.', 'Salt marsh and oyster reef are its whole food chain.'] },
    { id: 'striped_mullet', name: 'Striped Mullet', sci: 'Mugil cephalus', biomes: ['wetland'], water: 'salt', time: 'any', rarity: 1, size: '30–50 cm', price: 3, color: '#8a98a8',
      teach: 'Eats mud: it swallows detritus and algae and sifts out the food. Mullet turn marsh decay into fish flesh that feeds everything else, and they leap for reasons nobody has settled.', facts: ['Netted for roe (bottarga) around the world.', 'Caught by cast net, not hook, in most places; here the bait shop knows a trick.'] },
  ];
  BC.FISH = F; BC.FISH_BY_ID = {}; F.forEach(f => { BC.FISH_BY_ID[f.id] = f; });
  // Things the river gives up instead of a fish.
  BC.FISHING_JUNK = [
    { id: 'old_boot', name: 'Old boot', teach: 'Every angler catches one. Leather rots in a year; the rubber sole will be here in two hundred.' },
    { id: 'tangle_of_line', name: 'Tangle of fishing line', teach: 'Monofilament line takes 600 years to break down and strangles birds and turtles. Take yours home.' },
    { id: 'tin_can', name: 'Rusty tin can', teach: 'Iron rusts back into the soil in a few decades. Aluminium cans take two centuries. Both belong in the bin.' },
  ];
  BC.FISHING_TREASURE = [
    { id: 'super_axe', weight: 5, name: 'the Old-Growth Axe', teach: 'A felling axe from the days of the big timber, oiled and sharp as the day it was lost. One swing drops anything.' },
    { id: 'coin_pouch', weight: 3, name: 'a sunken coin pouch', teach: 'Somebody\'s market money, lost off a ferry long ago.' },
    { id: 'seed_bottle', weight: 3, name: 'a message in a bottle', teach: 'Inside, heirloom seeds wrapped in oilcloth and a note: plant these where the river bends.' },
  ];
})();
