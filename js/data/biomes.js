window.BC = window.BC || {};
// Biomes are placed on a temperature / moisture climate map in world.js.
BC.BIOMES = {
  temperate: {
    id: 'temperate', name: 'Temperate Deciduous Forest', short: 'Temperate Forest',
    places: 'Appalachians & Great Lakes (USA), Western Europe, Japan, Korea, eastern China',
    climate: 'Four seasons. Warm summers, freezing winters. 750 to 1,500 mm of rain a year.',
    soil: 'alfisol', baseMoisture: 0.6, rainChance: 0.5, temp: 'cool',
    sky: '#8fc4ea', grass: [0x5f9a3c, 0x4e8a32],
    facts: [
      'Trees here drop their leaves each autumn to save water and avoid frost damage. Before they fall, chlorophyll breaks down and reveals yellow carotenoids that were there all summer; the reds are new anthocyanins the leaf makes on purpose.',
      'A forest floor in spring is a race: wildflowers such as trillium bloom and set seed in the few weeks of sunlight before the canopy closes above them.',
      'Most of this biome in Europe and eastern North America was cleared for farming by 1900. Much has since regrown, which is why old stone walls run through modern woods.',
    ],
  },
  prairie: {
    id: 'prairie', name: 'Temperate Grassland', short: 'Prairie',
    places: 'The Great Plains (USA & Canada), the Eurasian steppe, the Argentine Pampas, the South African veld',
    climate: 'Hot summers, cold winters, 250 to 750 mm of rain: too dry for forest, too wet for desert.',
    soil: 'mollisol', baseMoisture: 0.42, rainChance: 0.3, temp: 'cool',
    sky: '#9ad0f0', grass: [0x9cb04a, 0x8aa040],
    facts: [
      'Grasslands are kept open by three forces: drought, fire and grazing. Grass grows from the base of the blade, so being burned or bitten does not kill it. A tree seedling is killed.',
      'Less than 4% of the North American tallgrass prairie survives. The rest became corn and wheat fields because the soil beneath it is so fertile.',
      'Bison, prairie dogs and fire together once shaped this landscape. Where bison grazed, wildflowers bloomed; prairie dog towns aerated the soil.',
    ],
  },
  desert: {
    id: 'desert', name: 'Hot Desert', short: 'Desert',
    places: 'The Sonoran Desert (Arizona & Mexico), the Sahara, the Arabian Desert, central Australia, the Atacama',
    climate: 'Under 250 mm of rain a year. Days above 40 °C, nights that can drop near freezing.',
    soil: 'aridisol', baseMoisture: 0.1, rainChance: 0.06, temp: 'hot',
    sky: '#a8d4f4', grass: [0xc9b06a, 0xbfa660],
    facts: [
      'Desert plants survive by three strategies: store water (cacti), lose leaves and wait (ocotillo, brittlebush), or live fast as seeds and sprout only after rain (desert wildflowers).',
      'Many desert plants use CAM photosynthesis: they open their stomata only at night to take in CO2, losing far less water than plants that open them in daytime heat.',
      'The Sonoran is the wettest desert on Earth, with two rainy seasons, which is why it can grow giant saguaros and so many species.',
    ],
  },
  rainforest: {
    id: 'rainforest', name: 'Tropical Rainforest', short: 'Rainforest',
    places: 'The Amazon (Brazil, Peru, Colombia), the Congo basin, Borneo, Sumatra, New Guinea',
    climate: 'Over 2,000 mm of rain. Always warm (25 to 28 °C), never any frost. Twelve hours of daylight all year.',
    soil: 'oxisol', baseMoisture: 0.85, rainChance: 0.8, temp: 'hot',
    sky: '#7fbbe0', grass: [0x2f7a2f, 0x2a6e2a],
    facts: [
      'The forest is built in layers: emergent giants above 50 m, a dense canopy at 30 to 40 m, a dim understorey and a dark floor that receives only 2% of the sunlight.',
      'Rainforests cover about 6% of the land yet hold more than half of all plant and animal species.',
      'Epiphytes such as bromeliads and orchids never touch the soil. They grow on branches and take water and nutrients from rain, mist and falling debris.',
    ],
  },
  boreal: {
    id: 'boreal', name: 'Boreal Forest (Taiga)', short: 'Boreal Forest',
    places: 'Canada, Alaska, Scandinavia, Russia (the world\'s largest land biome)',
    climate: 'Long winters down to minus 40 °C, a short cool summer, 300 to 850 mm of precipitation, much of it snow.',
    soil: 'spodosol', baseMoisture: 0.55, rainChance: 0.4, temp: 'cold',
    sky: '#a7c6dc', grass: [0x4f6e3a, 0x4a6a3a],
    facts: [
      'Conifers win here because needles lose little water, stay on through winter to photosynthesise on any warm day, and the conical shape sheds snow.',
      'The boreal forest is a fire forest. Jack pine cones are sealed with resin and open only in the heat of a wildfire.',
      'Beneath much of the taiga is permafrost, permanently frozen ground. Roots stay shallow, and trees in thawing permafrost lean at odd angles ("drunken forests").',
    ],
  },
  wetland: {
    id: 'wetland', name: 'Freshwater Wetland', short: 'Wetland',
    places: 'The Everglades (Florida), the Pantanal (Brazil), the Okavango Delta (Botswana), the Mississippi delta',
    climate: 'Defined by water, not temperature: the soil is saturated for most or all of the year.',
    soil: 'histosol', baseMoisture: 1.0, rainChance: 0.55, temp: 'cool',
    sky: '#9cc9e2', grass: [0x6f9a3a, 0x5f8a30],
    facts: [
      'Wetland plants face a problem that sounds odd: drowning. Roots need oxygen, so cattails and water lilies pipe air down through spongy aerenchyma tissue.',
      'Wetlands are nature\'s kidneys. They slow floodwater, trap sediment and absorb nitrogen and phosphorus before it reaches rivers.',
      'Over half the wetlands in the United States have been drained since 1780, mostly for farmland.',
    ],
  },
};
BC.BIOME_LIST = ['temperate', 'prairie', 'desert', 'rainforest', 'boreal', 'wetland'];
// Which climates a plant can tolerate at half speed (frost / heat edge cases).
BC.CLIMATE_NEIGHBORS = {
  temperate: ['prairie', 'wetland', 'boreal'],
  prairie: ['temperate', 'desert'],
  desert: ['prairie'],
  rainforest: ['wetland'],
  boreal: ['temperate', 'wetland'],
  wetland: ['temperate', 'rainforest', 'boreal', 'prairie'],
};
