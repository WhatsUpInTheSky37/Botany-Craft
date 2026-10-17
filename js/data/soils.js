// Soil science content. Each soil is a USDA soil order (or a horizon/material)
// with representative chemistry used by the growth simulation.
window.BC = window.BC || {};
BC.SOILS = {
  alfisol: {
    id: 'alfisol', name: 'Brown Forest Soil', order: 'Alfisol', ph: 6.3, phRange: [5.5, 7.0],
    texture: 'Loam (balanced sand, silt and clay)', organic: 'Moderate', drainage: 'Good',
    color: '#6b4e2e',
    where: 'Ohio Valley and Great Lakes (USA), central Europe, north-east China',
    horizons: [
      ['O', 'Leaf litter', 'Last autumn\'s leaves, slowly decomposing into humus.'],
      ['A', 'Topsoil', 'Dark, crumbly, full of roots, fungi and earthworms. Most nutrients live here.'],
      ['B', 'Subsoil', 'Clay washed down from above collects here (an "argillic" horizon). Lighter in colour, fewer roots.'],
      ['C', 'Parent material', 'Weathered rock fragments: the raw mineral the soil formed from.'],
    ],
    facts: [
      'Loam is the gardener\'s favourite because sand lets water drain, silt holds nutrients and clay holds water.',
      'It takes roughly 500 to 1,000 years for nature to build 2.5 cm (one inch) of topsoil.',
      'A single teaspoon of healthy forest topsoil holds more living organisms than there are people on Earth.',
    ],
  },
  mollisol: {
    id: 'mollisol', name: 'Prairie Black Earth', order: 'Mollisol', ph: 6.8, phRange: [6.0, 7.5],
    texture: 'Silt loam', organic: 'Very high (deep, dark A horizon)', drainage: 'Good',
    color: '#2e2418',
    where: 'The Great Plains (USA & Canada), the Ukrainian and Russian chernozem belt, the Argentine Pampas',
    horizons: [
      ['A', 'Deep dark topsoil', 'Up to a metre thick. Built by thousands of years of grass roots dying and regrowing.'],
      ['B', 'Subsoil', 'Brown, often with lime (calcium carbonate) nodules in drier prairies.'],
      ['C', 'Parent material', 'Loess: wind-blown glacial dust, which is why prairie soil is so silty.'],
    ],
    facts: [
      'Mollisols are the most fertile soils on Earth. They cover only 7% of the land but grow most of the world\'s wheat and corn.',
      'Prairie grasses put two thirds of their mass underground. Roots of big bluestem reach 3 metres deep.',
      'In the 1930s Dust Bowl, ploughing destroyed the root mat that held this soil, and the topsoil blew away as far as New York City.',
    ],
  },
  aridisol: {
    id: 'aridisol', name: 'Desert Sand', order: 'Aridisol', ph: 8.0, phRange: [7.5, 8.5],
    texture: 'Sandy, gravelly', organic: 'Very low (under 1%)', drainage: 'Excessive: water runs straight through',
    color: '#d6b779',
    where: 'The Sonoran Desert (Arizona & Sonora), the Sahara, the Arabian and Gobi deserts, the Australian outback',
    horizons: [
      ['A', 'Thin pale topsoil', 'Little organic matter because there is little plant growth to decay. Often covered by a living "cryptobiotic crust" of cyanobacteria and lichens.'],
      ['Bk', 'Caliche', 'A white, cement-hard layer of calcium carbonate. Rain never falls hard enough to wash the lime away, so it builds up.'],
      ['C', 'Parent material', 'Gravel and bedrock.'],
    ],
    facts: [
      'Desert soils are alkaline (high pH) because there is not enough rain to leach the calcium and salts away.',
      'The desert soil crust is alive. One footprint can destroy decades of cyanobacteria growth that holds the sand in place.',
      'Caliche is so hard that desert gardeners sometimes need a pickaxe or a jackhammer to plant a tree.',
    ],
  },
  oxisol: {
    id: 'oxisol', name: 'Red Tropical Clay', order: 'Oxisol', ph: 4.8, phRange: [4.0, 5.5],
    texture: 'Clay, rich in iron and aluminium oxides', organic: 'Low in the soil itself', drainage: 'Good',
    color: '#9a4a2b',
    where: 'The Amazon basin, the Congo basin, Borneo and Sumatra',
    horizons: [
      ['O', 'Thin leaf litter', 'Decomposes within weeks in the heat and humidity. Fungi and termites recycle it almost instantly.'],
      ['A', 'Thin topsoil', 'Only a few centimetres deep. Most nutrients are not in the soil at all: they are inside the living plants.'],
      ['Bo', 'Deep red oxic horizon', 'Metres of heavily weathered clay, red from iron oxide (rust). Nearly all nutrients have been leached out over millions of years.'],
    ],
    facts: [
      'The richest forest on Earth grows on some of the poorest soil. Rainforest nutrients cycle so fast that they stay in the plants, not the ground.',
      'When rainforest is cleared and burned for farming, the ash gives one or two good harvests. Then the soil is exhausted and farmers must move on.',
      'Laterite, a type of oxisol, hardens like brick when exposed to air. The temples of Angkor were built from it.',
    ],
  },
  spodosol: {
    id: 'spodosol', name: 'Podzol', order: 'Spodosol', ph: 4.3, phRange: [3.5, 5.0],
    texture: 'Sandy', organic: 'High in the surface mat, low below', drainage: 'Good to excessive',
    color: '#7a5a3a',
    where: 'The Canadian Shield, Scandinavia, Siberia, the Scottish Highlands',
    horizons: [
      ['O', 'Needle and moss mat', 'Conifer needles are acidic and decay slowly in the cold, so a thick spongy layer builds up.'],
      ['E', 'Ash-grey leached layer', 'Acid rainwater dripping through the needles strips out iron, aluminium and humus, leaving bleached quartz sand. "Podzol" is Russian for "under ash".'],
      ['Bs', 'Rusty orange layer', 'Everything washed out of the E horizon is deposited here, sometimes cemented into a hardpan.'],
      ['C', 'Parent material', 'Glacial sand and gravel.'],
    ],
    facts: [
      'Podzols are strongly acidic (pH 3.5 to 5), so only acid-loving plants like blueberries and spruce thrive.',
      'The striking stripes of a podzol are one of the easiest soil profiles to recognise in a road cutting.',
      'Cold slows decomposition, so boreal soils and their peatlands store more carbon than all the world\'s tropical forests.',
    ],
  },
  histosol: {
    id: 'histosol', name: 'Peat', order: 'Histosol', ph: 4.5, phRange: [3.5, 5.5],
    texture: 'Fibrous organic matter (over 30% organic)', organic: 'Extremely high', drainage: 'Waterlogged: no oxygen below the surface',
    color: '#2a1f14',
    where: 'The Everglades (Florida), Scottish and Irish bogs, the West Siberian lowland, the Hudson Bay lowlands',
    horizons: [
      ['Oi', 'Fibric peat', 'Recognisable sphagnum moss and sedge remains. Spongy and light.'],
      ['Oe', 'Hemic peat', 'Partly decomposed, darker.'],
      ['Oa', 'Sapric peat', 'Fully decomposed black muck. A metre of peat can take 1,000 years to form.'],
    ],
    facts: [
      'Waterlogged soil has no oxygen, so dead plants cannot rot. They pile up as peat for thousands of years.',
      'Peatlands cover 3% of land but store about a third of all soil carbon, twice as much as all the world\'s forests.',
      'Bog water is so acidic and oxygen-poor that 2,000-year-old human bodies (bog bodies) have been found with skin and hair intact.',
    ],
  },
  gley: {
    id: 'gley', name: 'Gley Clay', order: 'Waterlogged subsoil', ph: 6.0, phRange: [5.0, 7.0],
    texture: 'Heavy clay', organic: 'Low', drainage: 'Very poor',
    color: '#6e7a78',
    where: 'Under marshes, river floodplains and pond edges worldwide',
    horizons: [
      ['Bg', 'Grey-blue gley', 'Iron in waterlogged soil loses oxygen and turns from rusty red to grey-blue or green. Orange mottles mark old root channels where air got in.'],
    ],
    facts: [
      'Soil colour is a water detective tool: red and orange mean air, grey and blue mean the soil is flooded for much of the year.',
      'Clay particles are so small (under 0.002 mm) that a single gram has a surface area the size of a basketball court. That is why clay holds water and nutrients so tightly.',
    ],
  },
  compost: {
    id: 'compost', name: 'Compost-amended Soil', order: 'Improved garden soil', ph: 6.5, phRange: [6.0, 7.0],
    texture: 'Crumbly loam', organic: 'High', drainage: 'Good, holds water well',
    color: '#3a2a1a',
    where: 'Any garden where plant waste is returned to the soil',
    horizons: [
      ['A', 'Amended topsoil', 'Finished compost mixed into the soil. Dark, sweet-smelling and full of life.'],
    ],
    facts: [
      'Compost buffers pH toward neutral and adds humus that holds water like a sponge, so it helps almost any plant.',
      'It cannot fix everything: a blueberry still wants acid, and a cactus still needs sharp drainage.',
      'Compost returns the nutrients a plant took from the soil. In nature the same job is done by fungi, worms and bacteria.',
    ],
  },
  stone: {
    id: 'stone', name: 'Bedrock', order: 'R horizon', ph: 7.0, phRange: [6, 8],
    texture: 'Solid rock', organic: 'None', drainage: 'None', color: '#7d7d7d',
    where: 'Under every soil on Earth, from a few centimetres to many metres down',
    horizons: [['R', 'Bedrock', 'Unweathered rock. Over thousands of years frost, roots, acids and lichens break it into the mineral part of soil.']],
    facts: ['Nothing grows directly on bedrock. Lichens are the first colonisers: their acids begin the slow work of making soil.', 'It takes 200 to 1,000 years to make 2.5 cm of soil from rock, which is why losing topsoil to erosion matters so much.', 'Where bedrock lies close to the surface, trees root sideways and blow over in storms; deep soil is what holds a forest up.'],
  },
  sand_subsoil: {
    id: 'sand_subsoil', name: 'Caliche Hardpan', order: 'Bk horizon', ph: 8.3, phRange: [8, 9],
    texture: 'Cemented calcium carbonate', organic: 'None', drainage: 'Blocks roots and water', color: '#e8dcc0',
    where: 'Beneath desert soils of the American South-west, Australia and the Middle East',
    horizons: [['Bk', 'Caliche', 'Lime cemented into a rock-hard layer by millennia of evaporation.']],
    facts: ['Roots cannot penetrate caliche, so desert trees spread their roots wide and shallow, or find cracks.', 'Desert gardeners break through it with a bar or an auger before planting a tree, or the hole fills with water like a bathtub and drowns the roots.', 'The word is Spanish, from the Latin for lime; the same layer is called calcrete in Australia and duricrust by geologists.'],
  },
};
BC.PH_NOTES = 'pH runs from 0 (acid) to 14 (alkaline); 7 is neutral. Each step is ten times stronger. Most garden plants like 6 to 7. Below 5.5, phosphorus and calcium become hard for roots to absorb; above 7.5, iron becomes locked up and leaves turn yellow between the veins (chlorosis).';
// Baseline available N, P, K per soil (game units, 1 = plenty).
BC.SOIL_NUTR = { alfisol: [0.6, 0.5, 0.55], mollisol: [0.85, 0.6, 0.75], aridisol: [0.2, 0.3, 0.45], oxisol: [0.3, 0.15, 0.3], spodosol: [0.3, 0.25, 0.3], histosol: [0.55, 0.15, 0.25], gley: [0.4, 0.3, 0.4], compost: [0.8, 0.7, 0.7], stone: [0.05, 0.1, 0.1], sand_subsoil: [0.1, 0.2, 0.3], bark: [0.3, 0.2, 0.3] };
