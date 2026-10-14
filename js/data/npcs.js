window.BC = window.BC || {};
// Village folk: 14 kinds of helpful mom-and-pop neighbours. Each has a shop (buy/sell in leaf coins), a service you can hire
// for a few minutes, a three-chapter storyline with a botany lesson in every chapter, and things they are happy to explain.
// need kinds: items (consumed from your inventory), stat (game.stats[key] >= n, Sets use size, booleans are 1), journal (key present),
// journal_prefix (n entries starting with prefix), day (in-game day >= n).
(function () {
  const seed = (id, price) => ({ item: { type: 'seed', id }, price });
  const ing = (id, price) => ({ item: { type: 'ingredient', id }, price });
  const blk = (id, price, count) => ({ item: { type: 'block', id, count: count || 1 }, price });
  const buyIng = (id, price) => ({ match: it => it.type === 'ingredient' && it.id === id, label: null, id, price });
  const buySeeds = (price) => ({ match: it => it.type === 'seed' && !it.id.startsWith('tree:'), label: 'any seeds or harvest', price });
  const buyTreeSeeds = (price) => ({ match: it => it.type === 'seed' && it.id.startsWith('tree:'), label: 'tree seeds and nuts', price });
  const items = (type, id, n) => ({ kind: 'items', type, id, n });
  const stat = (key, n) => ({ kind: 'stat', key, n: n || 1 });
  const journal = key => ({ kind: 'journal', key });
  const prefix = (p, n) => ({ kind: 'journal_prefix', prefix: p, n });

  BC.NPC_TYPES = [
    { id: 'nursery', role: 'Nursery owner', shop: 'Nursery & Garden Center', names: ['Mabel', 'Hank', 'Dolores', 'Ray'], color: '#4a8a3a', hat: '#e8d8a0',
      greet: ['Welcome in. Everything on the benches was grown right here, no shipping stress on the roots.', 'Looking for something for sun or for shade? Tell me about your spot first and we will find the plant for it.'],
      sells: 'local', buys: [buySeeds(1), buyTreeSeeds(2)],
      service: { id: 'delivery', name: 'Seedling delivery', desc: 'Every couple of minutes a bundle of two seeds suited to this region turns up in your bag.', cost: 12, minutes: 5 },
      topics: [
        ['Right plant, right place', 'Nine out of ten plants we see die were planted in the wrong spot, not cared for wrong. Read the tag: sun means six hours of direct light, part shade means morning sun, shade means none at noon. Match the soil pH and the water too, then you hardly have to do anything.'],
        ['Why natives', 'A native plant evolved with this soil, this rain and these insects. It needs no extra water once rooted, and it feeds the caterpillars that feed the birds. An oak supports over 500 kinds of caterpillar; a ginkgo from China supports about five.'],
        ['Planting a tree', 'Dig the hole twice as wide as the root ball and no deeper. Find the root flare, where the trunk widens, and set it at soil level: buried flares strangle trees years later. Water deep once a week the first summer. No stakes unless it is windy, and take them off after a year.']],
      story: [
        { intro: 'I started this nursery from seed I gathered myself. Want to learn? Bring me seeds from three different wild plants and I will show you how I sort them.', need: stat('seedSpecies', 3), reward: { coins: 10, items: [{ type: 'ingredient', id: 'mycorrhizal_inoculant', count: 2 }] }, done: 'Three species already. Look how different they are: a dandelion seed flies, a burdock seed hitch-hikes, an acorn just drops and hopes for a squirrel. Here is some mycorrhizal dust for your next planting.' },
        { intro: 'Now the hard part. Grow one of those seeds all the way to harvest. Come back and tell me what it taught you.', need: stat('matured', 1), reward: { coins: 15, items: [{ type: 'seed', id: 'tree:flowering_dogwood', count: 1 }] }, done: 'That is the whole trade in one plant. Every nursery is just somebody who got good at keeping seedlings alive through their first month. Take this dogwood: it wants part shade and acid soil.' },
        { intro: 'Last thing. Plant a tree. Trees outlive us, so planting one is the most hopeful thing a gardener does.', need: stat('treesPlanted', 1), reward: { coins: 30, items: [{ type: 'block', id: 76, count: 2 }] }, done: 'You planted a tree you may never sit under. My grandmother planted the oak over this shop. Two raised beds for you, on the house.' }] },

    { id: 'seed_saver', role: 'Seed saver', shop: 'Heirloom Seed Library', names: ['Opal', 'Luis', 'Verna', 'Thomas'], color: '#a85a2a', hat: '#5a3a1a',
      greet: ['Every packet in here has a story. Some of these beans came over in a coat lining in 1890.', 'Save seed from your best plant, not your first ripe one. That is how a variety gets better every year.'],
      sells: [seed('tomato', 3), seed('bean', 2), seed('squash', 3), seed('corn', 2), seed('chili', 3), seed('cucumber', 3), seed('potato', 3), seed('cabbage', 3), seed('sunflower', 2), seed('buckwheat', 1)], buys: [buySeeds(1)],
      service: { id: 'seed_double', name: 'Seed-saving lessons', desc: 'While I am helping, every crop you harvest gives twice the seed.', cost: 10, minutes: 5 },
      topics: [
        ['Heirloom versus hybrid', 'An heirloom is open-pollinated and comes true from seed: save it and you get the same plant. A hybrid (F1) is a deliberate cross; its seed splits back into the parents. Nothing wrong with hybrids, but you buy them again every year.'],
        ['Keeping seed alive', 'Seed is alive and breathing slowly. Keep it cool, dark and dry and it lasts: onion two years, tomato six, cucumber ten. The Svalbard vault in the Arctic holds a million samples at minus 18 degrees as a backup for the world.'],
        ['Isolation distance', 'Squash and corn cross-pollinate freely, so two varieties within a few hundred metres make mongrel seed. Tomatoes and beans mostly pollinate themselves before the flower opens, which is why beginners save those first.']],
      story: [
        { intro: 'Harvest three of your own crops and come back. I want to hear which one did best, and I want you to tell me why.', need: stat('harvests', 3), reward: { coins: 8, items: [{ type: 'seed', id: 'bean', count: 4 }] }, done: 'The best plant is the one to save seed from: it liked your soil. Here are four beans from a line my family has kept since the dust bowl. Plant them with corn.' },
        { intro: 'Bring me four bean seeds you grew yourself, from a plant that was pollinated. I will add your line to the library with your name on the packet.', need: items('seed', 'bean', 4), reward: { coins: 15, items: [{ type: 'seed', id: 'squash', count: 3 }] }, done: 'Into the library they go. In fifty years someone will plant your beans. Now, squash seed: the third sister.' },
        { intro: 'Grow the three sisters together: corn, beans and squash within two blocks of each other. The oldest companion planting in the Americas.', need: stat('threeSisters', 1), reward: { coins: 30, items: [{ type: 'seed', id: 'tomato', count: 4 }] }, done: 'Corn holds the beans up, beans feed the corn nitrogen, squash leaves shade out weeds and keep raccoons off with their prickles. A thousand years of agronomy in one bed. These tomato seeds are a purple heirloom from Cherokee country.' }] },

    { id: 'soil_doctor', role: 'Soil doctor', shop: 'County Extension Office', names: ['Dr. Ruth', 'Ed', 'Dr. Amara', 'Phil'], color: '#8a7a5a', hat: '#f0f0f0',
      greet: ['Bring me a handful of dirt and I will tell you what it is hungry for.', 'The soil test is the cheapest thing you will ever do for a garden. Everything else is guessing.'],
      sells: [{ item: { type: 'compost' }, price: 4 }, ing('bone_meal', 5), ing('garden_lime', 3), ing('sulfur_dust', 3), ing('rock_dust', 2), ing('kelp_meal', 6), ing('mycorrhizal_inoculant', 7), ing('vermicompost', 6), ing('gypsum', 3)], buys: [buyIng('kitchen_scraps', 1), buyIng('worm_castings', 3), buyIng('bones', 2), buyIng('bison_manure', 2), buyIng('poultry_manure', 2)],
      service: { id: 'feed', name: 'Soil test and feed', desc: 'I test the soil under each of your crops and top up whatever nutrient is short.', cost: 15, minutes: 5 },
      topics: [
        ['Reading a soil test', 'N, P and K are the big three, but pH decides whether roots can take them up. At pH 7.5 iron is locked away and leaves yellow between the veins; below 5.5 aluminium is freed and burns root tips. Most vegetables want 6.2 to 6.8.'],
        ['Organic matter', 'Five percent organic matter is a great garden soil. Each percent holds about 20,000 litres of extra water per hectare and feeds the fungi that hand plants their phosphorus. Compost is how you build it, a centimetre a year.'],
        ['The nitrogen trap', 'More nitrogen is not better. Overfed plants grow soft, watery leaves that aphids prefer and frost kills. Feed the soil slowly with organic matter; it releases nitrogen when it is warm, which is when plants are growing.']],
      story: [
        { intro: 'Dig a hole three blocks deep somewhere and look at the layers. Then come tell me what you saw.', need: stat('maxDig', 3), reward: { coins: 8, items: [{ type: 'ingredient', id: 'rock_dust', count: 3 }] }, done: 'Topsoil, subsoil, parent material: the A, B and C horizons. Everything alive is in the top one. Rock dust for you: it is what the glaciers used to make the prairie.' },
        { intro: 'I need two wood ash and two bones for a demonstration on phosphorus and potassium. Burn a log for the ash; the bones turn up when you dig.', need: [items('ingredient', 'wood_ash', 2), items('ingredient', 'bones', 2)], reward: { coins: 15, items: [{ type: 'ingredient', id: 'bone_meal', count: 3 }] }, done: 'Ash is potassium and lime; bones are phosphorus and calcium. Between them and a legume for nitrogen, a farm can feed itself forever. Bone meal for your flowers.' },
        { intro: 'Use three different amendments on your soil and watch what the meters do. Then you will be a soil doctor too.', need: stat('amendmentsUsed', 3), reward: { coins: 30, items: [{ type: 'ingredient', id: 'biochar', count: 3 }] }, done: 'You read the soil now. Last lesson: biochar. The Amazon dark earths were made two thousand years ago with charcoal and are still fertile. Add this to a bed and it will outlast you.' }] },

    { id: 'beekeeper', role: 'Beekeeper', shop: 'Honey House', names: ['June', 'Amos', 'Lupe', 'Harold'], color: '#e0b030', hat: '#f8f8f0',
      greet: ['Mind the flight line by the door. They are busy, not angry.', 'One in three bites of food needed a pollinator. The bees work for me; I just keep the roof on.'],
      sells: [blk(146, 20), ing('honey', 5), ing('beeswax', 4), seed('sunflower', 2), seed('coneflower', 2), seed('wild_bergamot', 2), seed('milkweed', 2), seed('alfalfa', 1)], buys: [buyIng('honey', 4), buyIng('beeswax', 3)],
      service: { id: 'pollinate', name: 'Pollination hive on loan', desc: 'I set a hive by your garden: your flowering crops get pollinated while it is there.', cost: 12, minutes: 5 },
      topics: [
        ['What pollination is', 'Pollen from the male anther has to reach the female stigma for a seed to form. Bees carry it by accident while collecting food. A pollinated squash flower becomes a squash; an unpollinated one shrivels and drops.'],
        ['Not just honeybees', 'There are 4,000 kinds of bee in North America and most live alone in the ground or in hollow stems. A mason bee pollinates a hundred times more apple blossoms than a honeybee. Leave some bare soil and hollow stems for them.'],
        ['Sprays and bees', 'Never spray an open flower, and spray at dusk when bees are home. Even soap and oil kill a bee they land on. Neem and Bt only affect insects that eat the leaf, so they are the safe choices near flowers.']],
      story: [
        { intro: 'Go find a pollinator and get to know it. A bumblebee, a honeybee, a mason bee, a hoverfly. Read about it in your journal and come back.', need: { kind: 'journal_any', keys: ['animal:bumblebee', 'insect:honeybee', 'insect:mason_bee', 'insect:hoverfly', 'insect:squash_bee', 'insect:leafcutter_bee', 'animal:hummingbird', 'animal:monarch'] }, reward: { coins: 8, items: [{ type: 'seed', id: 'sunflower', count: 3 }] }, done: 'Now you will see them everywhere. Sunflower seed: a single head feeds hundreds of visits a day.' },
        { intro: 'Bring me three sunflower seeds from your own harvest so I can sow a bee pasture behind the house.', need: items('seed', 'sunflower', 3), reward: { coins: 12, items: [{ type: 'ingredient', id: 'beeswax', count: 2 }] }, done: 'Beeswax for you. Bees eat eight kilos of honey to make one of wax; it is the most expensive thing they build.' },
        { intro: 'Keep a hive of your own and harvest honey from it. Then we are colleagues.', need: stat('honey', 1), reward: { coins: 30, items: [{ type: 'block', id: 146, count: 1 }] }, done: 'Your first honey. Taste it: it is the flowers around you, in a jar. A second hive for you, so they can share warmth in winter.' }] },

    { id: 'rancher', role: 'Animal hand', shop: 'Feed & Tack', names: ['Rosa', 'Clyde', 'Birdie', 'Mack'], color: '#7a4a3a', hat: '#5a4030',
      greet: ['Animals are honest. Feed them, keep them dry, and they will tell you when something is wrong.', 'Need rope, fence or feed? Or a hand with a stubborn critter?'],
      sells: [{ item: { type: 'material', id: 'rope' }, price: 3 }, blk(18, 2, 4), blk(126, 4), ing('alfalfa_hay', 2), ing('straw', 1), ing('aged_manure', 3)], buys: [buyIng('feathers', 1), buyIng('eggshells', 1), buyIng('deer_pellets', 1), buyIng('rabbit_pellets', 1), buyIng('bison_manure', 2)],
      service: { id: 'guard', name: 'Herding', desc: 'I walk the fence line: deer, hares and rabbits leave your crops alone while I am on duty.', cost: 10, minutes: 5 },
      topics: [
        ['Manure is not all the same', 'Rabbit pellets are cold: use them fresh. Chicken manure is hot: it burns roots until it has aged six months. Cow and bison are in between and full of weed seed unless composted properly.'],
        ['Fences and deer', 'A deer clears two metres from a standstill. A fence works when they cannot see a landing spot: two short fences a metre apart, or one solid one. Rabbits need the mesh buried a hand deep.'],
        ['Grazers made the prairie', 'Bison grazing kept the prairie open, and their hooves pushed seed into the ground. Take the grazers away and shrubs move in. Managed grazing is how prairie restoration works today.']],
      story: [
        { intro: 'Craft a rope from plant fibre and lead an animal with it. Gently. Then come back and tell me how it went.', need: stat('leashed', 1), reward: { coins: 8, items: [{ type: 'block', id: 18, count: 8 }] }, done: 'A led animal is a calm animal. Eight fence posts: put them around a crop before the deer find it.' },
        { intro: 'Fence a crop on all four sides so nothing can get at it.', need: stat('fenced', 1), reward: { coins: 12, items: [{ type: 'block', id: 126, count: 1 }, { type: 'material', id: 'rope', count: 1 }] }, done: 'That is a proper paddock. A gate so you do not have to climb, and spare rope.' },
        { intro: 'Collect three lots of manure from the big grazers, deer, bison, caribou, whichever lives here. Tap them when they are standing still.', need: { kind: 'items_any', ids: ['deer_pellets', 'bison_manure', 'rabbit_pellets', 'poultry_manure'], type: 'ingredient', n: 3 }, reward: { coins: 25, items: [{ type: 'ingredient', id: 'aged_manure', count: 4 }] }, done: 'Nothing wasted on a farm. I will age it with straw and you will have black gold by spring. Take some I made earlier.' }] },

    { id: 'farmhand', role: 'Farmhand', shop: 'Odd Jobs', names: ['Tyler', 'Nia', 'Jesse', 'Carmen'], color: '#4a6a9a', hat: '#c8a060',
      greet: ['Watering, weeding, hauling. Point me at it.', 'Water deep and seldom. A sprinkle every day grows lazy roots.'],
      sells: [blk(77, 6), ing('straw_mulch', 2), ing('woodchip_mulch', 2), { item: { type: 'compost' }, price: 4 }], buys: [buyIng('grass_clippings', 1), buyIng('straw', 1), buyIng('corn_stalks', 1)],
      service: { id: 'water', name: 'Watering rounds', desc: 'I keep every crop you planted watered while I am on the clock.', cost: 8, minutes: 5 },
      topics: [
        ['When to water', 'Early morning, at the base of the plant, until the top ten centimetres are wet. Evening watering leaves leaves wet overnight and invites mildew. Stick a finger in: dry at the second knuckle means water.'],
        ['Mulch', 'A hand-deep blanket of straw or chips halves how often you water, stops most weeds, keeps roots cool and feeds worms as it rots. Pull it back a few centimetres from stems so they do not rot.'],
        ['Rain barrels', 'A roof the size of a garage sheds a thousand litres in a good storm. Rainwater is soft and free of chlorine, and plants plainly prefer it. Screen the top or you are breeding mosquitoes.']],
      story: [
        { intro: 'Water five times today and watch the moisture number. See how fast it drops in the sun.', need: stat('watered', 5), reward: { coins: 6, items: [{ type: 'ingredient', id: 'straw_mulch', count: 3 }] }, done: 'Now try mulch and watch it drop slower. Three mulch for you.' },
        { intro: 'Plant five things. Anything. The habit matters more than the species.', need: stat('planted', 5), reward: { coins: 10, items: [{ type: 'block', id: 77, count: 1 }] }, done: 'Five plants is a garden. A rain barrel for it.' },
        { intro: 'Bring me two straw mulch. I am mulching the village beds before the dry spell and I am short.', need: items('ingredient', 'straw_mulch', 2), reward: { coins: 20, items: [{ type: 'compost', count: 3 }] }, done: 'That will carry the beds through. Compost from the village heap in return.' }] },

    { id: 'pest_scout', role: 'Pest scout', shop: 'IPM Clinic', names: ['Marisol', 'Gus', 'Priya', 'Walt Jr.'], color: '#3a7a6a', hat: '#e8e0c0',
      greet: ['Bring me a leaf with the bug still on it. Half of what people spray for is harmless.', 'Identify, then decide. Most of what I do is talk people out of spraying.'],
      sells: [ing('insecticidal_soap', 5), ing('neem_oil', 8), ing('bt_spray', 7), ing('row_cover', 10), ing('yellow_sticky_trap', 3), ing('diatomaceous_earth', 4), ing('iron_phosphate', 5), ing('kaolin_spray', 5), ing('stem_collar', 2)], buys: [buyIng('marigold_flowers', 2), buyIng('garlic_chives', 2), buyIng('chili_peppers', 2)],
      service: { id: 'pest', name: 'Scouting rounds', desc: 'I check your crops every minute and knock back whatever is chewing on them, the gentle way.', cost: 15, minutes: 5 },
      topics: [
        ['The IPM ladder', 'Prevention first: healthy soil, right plant, mixed beds. Then physical: hand-pick, water jet, covers, traps. Then biological: predators and Bt. Chemical last, and the mildest that works, spot-applied. Each step costs more and spares less.'],
        ['Thresholds', 'A few aphids are food for ladybug larvae. Farms set a threshold, say 50 aphids per leaf, and do nothing below it. Spraying at the first bug kills the predators that were about to solve it for free.'],
        ['Know the babies', 'Ladybug larvae look like tiny black alligators with orange spots. Lacewing larvae look like mini earwigs. Hoverfly larvae are little green slugs. People squash all three. Learn the young and you will stop killing your allies.']],
      story: [
        { intro: 'Find any insect and read about it in your journal. Pest or friend, I do not mind which.', need: prefix('insect:', 1), reward: { coins: 8, items: [{ type: 'ingredient', id: 'yellow_sticky_trap', count: 2 }] }, done: 'Good. Sticky traps for counting: hang one and you will know what is around before it is a problem.' },
        { intro: 'Treat an infestation on one of your crops. Pick, spray, trap, your choice, as long as it fits the pest.', need: stat('pestsTreated', 1), reward: { coins: 15, items: [{ type: 'ingredient', id: 'neem_oil', count: 2 }] }, done: 'Right tool for the pest. Neem for the next one: it stops them moulting, and it spares anything that does not chew leaves.' },
        { intro: 'Now let nature do it. Get a predator to clear pests off one of your crops: release a ladybug or lacewing next to it, or grow dill and yarrow to invite them.', need: stat('beneficialWin', 1), reward: { coins: 30, items: [{ type: 'ingredient', id: 'row_cover', count: 1 }] }, done: 'That is the whole secret: a garden that sprays least keeps the most predators. Row cover for the brassicas, the one pest predators cannot reach in time.' }] },

    { id: 'carpenter', role: 'Carpenter', shop: 'Sawmill & Joinery', names: ['Walt', 'Dee', 'Ignacio', 'Hazel'], color: '#5a5a6a', hat: '#c04a30',
      greet: ['Measure twice. Wood remembers every mistake.', 'Oak for strength, cedar for weather, pine for cheap. Each tree has its job.'],
      sells: [blk(19, 1, 4), blk(118, 5), blk(86, 3), blk(90, 2, 2), blk(73, 6), blk(78, 3), blk(94, 2), blk(80, 4), blk(74, 1, 4), { item: { type: 'boat' }, price: 12 }], buys: [{ match: it => it.type === 'block' && BC.BLOCKS[it.id] && BC.BLOCKS[it.id].log, label: 'logs', price: 2 }, { match: it => it.type === 'block' && BC.BLOCKS[it.id] && BC.BLOCKS[it.id].plank, label: 'planks', price: 1 }],
      service: { id: 'lumber', name: 'Lumber delivery', desc: 'Four planks dropped in your bag every couple of minutes.', cost: 10, minutes: 5 },
      topics: [
        ['How wood grows', 'A tree adds one ring a year just under the bark: wide in wet years, narrow in drought. Count them on a stump and you read its life. The heartwood in the middle is dead and strong; only the outer sapwood carries water.'],
        ['Which wood for what', 'Rot-resistant woods, cedar, cypress, black locust, mesquite, make fences and raised beds that last twenty years untreated. Oak and hickory for anything that takes a beating. Never use treated lumber around food crops.'],
        ['Coppicing', 'Cut a willow, hazel or oak to the stump and it regrows a dozen straight poles. Cut again in seven years. European woodlands were farmed this way for a thousand years, and a coppiced tree can outlive an uncut one.']],
      story: [
        { intro: 'Chop five logs. Notice how many hits each wood takes: that is density, and density is strength.', need: stat('logsChopped', 5), reward: { coins: 8, items: [{ type: 'block', id: 19, count: 8 }] }, done: 'Hard work. Here are planks to save you the splitting.' },
        { intro: 'Craft five things at the bench. Anything from planks.', need: stat('crafted', 5), reward: { coins: 12, items: [{ type: 'block', id: 118, count: 1 }, { type: 'block', id: 86, count: 2 }] }, done: 'You have the hands for it. A door and two windows: the start of a shed.' },
        { intro: 'Build something. Place twenty wooden blocks and I will come and admire it.', need: stat('woodPlaced', 20), reward: { coins: 30, items: [{ type: 'block', id: 74, count: 12 }] }, done: 'Solid. Shingles for the roof, cut from a cedar that fell in the storm last year. Nothing wasted.' }] },

    { id: 'worm_farmer', role: 'Worm farmer', shop: 'Compost Corner', names: ['Earlene', 'Bud', 'Yolanda', 'Fitz'], color: '#6a4a2a', hat: '#3a5a2a',
      greet: ['Smell that? Good compost smells like a forest floor. Bad compost smells like a swamp: too wet, turn it.', 'Half a million worms in that bin and not one of them has ever complained.'],
      sells: [ing('vermicompost', 6), ing('worm_castings', 3), ing('compost_tea', 3), ing('leaf_mould', 4), ing('biochar', 6), { item: { type: 'compost' }, price: 4 }], buys: [buyIng('kitchen_scraps', 1), buyIng('banana_peel', 1), buyIng('coffee_grounds', 1), buyIng('leaf_litter', 1), buyIng('cacao_husks', 1)],
      service: { id: 'compost', name: 'Compost delivery', desc: 'A load of finished compost in your bag every couple of minutes.', cost: 9, minutes: 5 },
      topics: [
        ['Greens and browns', 'Compost wants roughly one part green, wet nitrogen stuff like scraps and clippings, to three parts brown carbon like leaves and straw. Too green and it goes slimy; too brown and nothing happens. Keep it as damp as a wrung sponge.'],
        ['Hot or cold', 'A pile a metre each way heats to 60 degrees and kills weed seed and disease in a month. A small bin stays cold and takes a year, which is fine, just no diseased leaves in it. Worms do cold composting fast.'],
        ['What worms do', 'An earthworm eats its own weight in soil daily and leaves castings five times richer in nitrogen. Darwin spent forty years on them and worked out they bring up a centimetre of fresh soil every five years. Dig gently.']],
      story: [
        { intro: 'Make your first compost. Harvest three crops and the trimmings turn into a bag of it.', need: stat('compostMade', 1), reward: { coins: 6, items: [{ type: 'ingredient', id: 'compost_tea', count: 2 }] }, done: 'There you go, black gold. Compost tea to spread the microbes around.' },
        { intro: 'Find an earthworm. Dig in good dark soil and you will meet one.', need: journal('animal:earthworm'), reward: { coins: 10, items: [{ type: 'ingredient', id: 'worm_castings', count: 3 }] }, done: 'That is the hardest-working animal on the farm. Castings from my bin for you.' },
        { intro: 'Bring me five kitchen scraps. I am starting a new worm bin and they need a welcome dinner.', need: items('ingredient', 'kitchen_scraps', 5), reward: { coins: 20, items: [{ type: 'ingredient', id: 'vermicompost', count: 4 }] }, done: 'They will be through that by Tuesday. Vermicompost in return, the best thing you can put under a tomato.' }] },

    { id: 'arborist', role: 'Arborist', shop: 'Tree Service', names: ['Cedar', 'Ines', 'Rowan', 'Gerald'], color: '#2a5a3a', hat: '#e07020',
      greet: ['Trees do not need us. We need them. I just help them get along with houses.', 'The best time to plant a tree was twenty years ago. The second best time is now.'],
      sells: 'trees', buys: [buyTreeSeeds(2), buyIng('leaf_litter', 1)],
      service: { id: 'tree_care', name: 'Tree care', desc: 'I tend your saplings: they grow faster and shake off stress while I am about.', cost: 12, minutes: 5 },
      topics: [
        ['How a tree drinks', 'Water climbs a hundred metres up a redwood with no pump: leaves lose vapour, which pulls the water column up through the xylem like a straw. A big oak lifts 400 litres a day.'],
        ['Pruning', 'Cut just outside the branch collar, the swollen ring where branch meets trunk, and the tree seals the wound itself. Never leave a stub, never cut flush, never paint it. Prune in late winter when it is asleep.'],
        ['Mycorrhizae', 'Tree roots are wrapped in fungus. The fungus mines phosphorus and water; the tree pays in sugar. The threads connect trees to each other, and a shaded seedling can get sugar from its mother through them.']],
      story: [
        { intro: 'Get to know three kinds of tree. Inspect their trunks, shake their branches, read the notes.', need: prefix('tree:', 3), reward: { coins: 8, items: [{ type: 'ingredient', id: 'woodchip_mulch', count: 4 }] }, done: 'Three down, thirty to go. Wood chips: ring a tree with them, never piled against the trunk.' },
        { intro: 'Plant a tree seed. Give it room; it will be bigger than you think.', need: stat('treesPlanted', 1), reward: { coins: 12, items: [{ type: 'ingredient', id: 'tree_band', count: 2 }] }, done: 'Patience now. Tree bands keep the climbing caterpillars off while it is small.' },
        { intro: 'Grow a tree all the way up. It takes a while, which is the point.', need: stat('treeGrown', 1), reward: { coins: 35, items: [{ type: 'seed', id: 'tree:sugar_maple', count: 2 }] }, done: 'A tree you grew from seed. Not many people can say it. Sugar maple seed: tap it in thirty years and make syrup.' }] },

    { id: 'herbalist', role: 'Herbalist', shop: 'Kitchen Garden & Apothecary', names: ['Sage', 'Wren', 'Esperanza', 'Alder'], color: '#8a5a8a', hat: '#d8c8e8',
      greet: ['Rub a leaf and smell it. The scent is the plant\'s chemistry, and the chemistry is why it works.', 'Half the medicines in the chemist started as plants. Aspirin is willow bark; the heart drug digitalis is foxglove.'],
      sells: [seed('basil', 2), seed('chives', 2), seed('dill', 2), seed('yarrow', 2), seed('comfrey', 3), seed('nettle', 2), seed('labrador_tea', 3), seed('wild_bergamot', 2), ing('comfrey_tea', 3), ing('nettle_tea', 3), ing('garlic_chili_spray', 4)], buys: [buyIng('comfrey_leaves', 1), buyIng('nettle_leaves', 1), buyIng('marigold_flowers', 2), buyIng('honey', 4)],
      service: { id: 'tonic', name: 'Plant tonic', desc: 'I nurse your struggling crops back: their health recovers while I am visiting.', cost: 10, minutes: 5 },
      topics: [
        ['Why herbs smell', 'Those oils are defence chemicals: basil, mint and lavender make them to repel insects and fungi. Plant them among vegetables and the scent masks the crop. It is companion planting with a reason behind it.'],
        ['Comfrey', 'Comfrey roots go three metres down and bring up potassium nothing else can reach. The leaves rot into a feed tomatoes love. Never eat it, and plant it where you want it forever: it does not leave.'],
        ['Dynamic accumulators', 'Nettle, dandelion, yarrow and comfrey are mineral pumps: deep roots, mineral-rich leaves. Chop and drop them as mulch and you move nutrients from the subsoil to the top where crops can use them.']],
      story: [
        { intro: 'Inspect five different plants closely. Learn their families: the mint family has square stems, the carrot family has umbrella flowers.', need: prefix('plant:', 5), reward: { coins: 8, items: [{ type: 'seed', id: 'basil', count: 3 }] }, done: 'Families tell you what to expect. Basil for you: a mint-family plant, square stem, and it keeps hornworms guessing.' },
        { intro: 'Bring me three comfrey or nettle leaves. Grow them or find nettle in the woods; wear gloves.', need: { kind: 'items_any', ids: ['comfrey_leaves', 'nettle_leaves'], type: 'ingredient', n: 3 }, reward: { coins: 12, items: [{ type: 'ingredient', id: 'comfrey_tea', count: 3 }] }, done: 'Into the barrel. In two weeks it will smell terrible and tomatoes will adore it. Some I made earlier.' },
        { intro: 'Plant a companion herb right next to a crop: basil, chives, dill, yarrow, marigold or nasturtium, within two blocks.', need: stat('companionPlanted', 1), reward: { coins: 25, items: [{ type: 'seed', id: 'yarrow', count: 2 }, { type: 'seed', id: 'dill', count: 2 }] }, done: 'A mixed bed confuses pests and feeds the wasps that eat them. Yarrow and dill: the two plants that bring in the most predators per flower.' }] },

    { id: 'fisher', role: 'Bait & tackle', shop: 'Bait Shop', names: ['Dell', 'Marguerite', 'Tran', 'Sully'], color: '#3a6a8a', hat: '#e8d090',
      greet: ['Fish are fertiliser with fins. The Wampanoag taught the Pilgrims to bury one under each corn hill.', 'Kelp, fish, crab shells: everything from the water feeds the land.'],
      sells: [{ item: { type: 'tool', id: 'rod' }, price: 8 }, { item: { type: 'boat' }, price: 14 }, ing('fish', 3), ing('kelp', 2), ing('fish_emulsion', 5), ing('kelp_meal', 6), ing('crab', 4), ing('pond_algae', 1), seed('wild_rice', 2), seed('cattail', 1)], buys: [{ match: it => it.type === 'fish', label: 'any fish you catch', price: 'fish' }, buyIng('fish', 3), buyIng('crab', 4), buyIng('kelp', 1), buyIng('pond_algae', 1), buyIng('duckweed', 1)],
      service: { id: 'fish', name: 'Catch of the day', desc: 'A fresh fish in your bag every couple of minutes. Bury it under a hungry plant.', cost: 8, minutes: 5 },
      topics: [
        ['Why fish feeds plants', 'Fish is nitrogen, phosphorus and every trace mineral the sea has, in a form microbes break down in weeks. Emulsion is the quick drink; a buried whole fish is the slow meal. Bury it deep or the raccoons dig it up.'],
        ['Seaweed', 'Kelp has little N-P-K but sixty trace elements and growth hormones that make seedlings root faster and tolerate frost. Coastal farms have spread storm wrack for a thousand years. Rinse the salt off first.'],
        ['Wetlands work', 'A hectare of marsh filters the runoff of a town, holds flood water like a sponge and nurses most of the fish you will ever eat. Cattail roots pull nitrogen and even heavy metals out of water.']],
      story: [
        { intro: 'Catch a fish. Grab a bluegill by hand in the shallows, or better, craft a rod (a plank and a rope) and cast it.', need: { kind: 'journal_any', keys: ['ingredient:fish'].concat(BC.FISH ? BC.FISH.map(f => 'fish:' + f.id) : []) }, reward: { coins: 6, items: [{ type: 'ingredient', id: 'kelp', count: 3 }] }, done: 'Ha! Kelp for your trouble. Dig it in or steep it.' },
        { intro: 'Scoop two lots of algae or kelp out of the water for me. Free nitrogen, just floating there.', need: { kind: 'items_any', ids: ['pond_algae', 'kelp', 'duckweed'], type: 'ingredient', n: 2 }, reward: { coins: 10, items: [{ type: 'ingredient', id: 'fish_emulsion', count: 3 }] }, done: 'Pond scum is the most underrated fertiliser there is. Emulsion in return.' },
        { intro: 'Plant something in the water: cattail, wild rice, pickerelweed, arrowhead. The wetland crops.', need: stat('aquaticPlanted', 1), reward: { coins: 25, items: [{ type: 'seed', id: 'wild_rice', count: 3 }] }, done: 'You are a wetland farmer. Wild rice: the Ojibwe harvest it from canoes and it is the only grain native to this continent that is still gathered that way.' }] },

    { id: 'almanac', role: 'Almanac keeper', shop: 'Weather Station', names: ['Granny Pearl', 'Otto', 'Minnie', 'Ambrose'], color: '#6a6a9a', hat: '#404060',
      greet: ['Red sky at night, shepherd\'s delight. Also, the barometer is falling, so plant now.', 'I have kept the rain gauge here for forty years. The springs come earlier than they used to.'],
      sells: [seed('buckwheat', 1), seed('alfalfa', 1), seed('mustard', 1), seed('prairie_clover', 2), ing('green_manure', 3), ing('mineral_salts', 2)], buys: [buyIng('sunflower_seeds', 1), buyIng('buckwheat_cuttings', 1)],
      service: { id: 'rain', name: 'Call the rain', desc: 'I read the sky and pick the hour: a good soaking rain for everyone in the world.', cost: 15, minutes: 1 },
      topics: [
        ['Frost dates', 'Everything is timed from the last spring frost. Peas and spinach six weeks before it; tomatoes and squash two weeks after, when the soil is warm. The almanac is just a hundred years of neighbours writing down when it froze.'],
        ['Cover crops', 'Bare soil loses nutrients to rain and dust to wind. Sow buckwheat in summer, clover or rye in autumn, and dig it in before it seeds. The roots hold the soil, the legumes add nitrogen, and the worms have something to eat all winter.'],
        ['Reading the sky', 'High thin cirrus means a front in a day or two. A ring around the moon, rain within thirty-six hours. Swallows flying low, the insects they chase are low because the air pressure is dropping. The old signs mostly work.']],
      story: [
        { intro: 'Travel to three regions and feel the difference in the air. Cold north, hot south, dry west, wet east. Come back and tell me which you liked.', need: stat('biomesVisited', 3), reward: { coins: 8, items: [{ type: 'seed', id: 'buckwheat', count: 3 }] }, done: 'Climate is what you expect, weather is what you get. Buckwheat: a cover crop that flowers in a month and feeds the bees while it mends the soil.' },
        { intro: 'Stay through to the third day. Watch a whole weather cycle, the rain and the drying after.', need: { kind: 'day', n: 3 }, reward: { coins: 12, items: [{ type: 'seed', id: 'prairie_clover', count: 3 }] }, done: 'Three days of watching teaches more than three books. Clover: the legume that fed the prairie its nitrogen.' },
        { intro: 'Bring me three buckwheat seeds you grew yourself. I sow the village cover crop every autumn and share seed with whoever brings some.', need: items('seed', 'buckwheat', 3), reward: { coins: 25, items: [{ type: 'ingredient', id: 'green_manure', count: 4 }] }, done: 'Into the seed tin. Green manure for your beds: dig it in and the soil will thank you next spring.' }] },

    { id: 'cook', role: 'Farm-stand cook', shop: 'Farm Stand & Cannery', names: ['Rosalind', 'Benny', 'Odette', 'Marcus'], color: '#c0504a', hat: '#f8f0e0',
      greet: ['Fresh picked this morning beats shipped last week, every time. Bring me what you grow.', 'I pay best for what is in season. That is how a farm stand works.'],
      sells: [ing('kitchen_scraps', 1), ing('banana_tea', 2), seed('tomato', 3), seed('chili', 3), seed('basil', 2), ing('honey', 5)], buys: [buySeeds(2), buyIng('honey', 5), { match: it => it.type === 'fish', label: 'fresh fish', price: 'fish+' }, buyIng('fish', 4), buyIng('chili_peppers', 2), buyIng('banana_peel', 1)],
      service: { id: 'market', name: 'Market day', desc: 'I set up your stall: everyone in the village pays you double for whatever you sell while it runs.', cost: 10, minutes: 5 },
      topics: [
        ['Eating in season', 'A tomato in January travelled 3,000 km and was picked green. Food grown within a day of you was picked ripe, which is when the sugars and vitamins peak. Seasonal eating is the cheapest way to eat well.'],
        ['Nothing wasted', 'Peelings, cores and stalks are a third of what a kitchen throws away, and all of it is compost. A bucket by the sink feeds the garden that fed the kitchen. The circle is the whole idea.'],
        ['Preserving', 'Canning, drying, fermenting and root cellars are how people ate in winter before refrigeration. Sauerkraut is cabbage, salt and time; the bacteria do the work and make vitamins while they are at it.']],
      story: [
        { intro: 'Harvest five things and bring them to the stand. I want to see what your ground grows.', need: stat('harvests', 5), reward: { coins: 8, items: [{ type: 'ingredient', id: 'kitchen_scraps', count: 4 }] }, done: 'Good variety. Scraps from the kitchen for your compost, as promised.' },
        { intro: 'Bring me three tomato seeds and two basil seeds from your own garden. Sauce night.', need: [items('seed', 'tomato', 3), items('seed', 'basil', 2)], reward: { coins: 15, items: [{ type: 'seed', id: 'chili', count: 3 }] }, done: 'Tomato and basil grow together and taste together; that is not a coincidence, they like the same soil. Chili seed for heat.' },
        { intro: 'Fifteen harvests in total and you are a supplier. I will put your name on the chalkboard.', need: stat('harvests', 15), reward: { coins: 40, items: [{ type: 'ingredient', id: 'honey', count: 3 }] }, done: 'Your name is up. That is what a mom-and-pop stand is: a few neighbours growing a little more than they need. Honey from the beekeeper, on the house.' }] },
  ];
  BC.NPC_BY_ID = {}; BC.NPC_TYPES.forEach(n => { BC.NPC_BY_ID[n.id] = n; });
  BC.VILLAGE_NAMES = { temperate: ['Maple Hollow', 'Oak Corners', 'Dogwood Crossing', 'Hickory Bend'], prairie: ['Bluestem', 'Tallgrass Junction', 'Coneflower Flats', 'Meadowlark'], desert: ['Saguaro Wells', 'Mesquite Springs', 'Ocotillo', 'Dry Creek'], rainforest: ['Kapok Landing', 'Cacao Grove', 'Rio Verde', 'Heliconia'], boreal: ['Spruce Camp', 'Birch Lake', 'Tamarack', 'Fireweed Hill'], wetland: ['Cypress Landing', 'Cattail Bay', 'Heron Marsh', 'Willow Slough'] };
  BC.COIN_NAME = 'leaf coins';
})();
