window.BC = window.BC || {};
// Character styles: a look (hair, clothes, hat, accessory) and a small perk each. Chosen from the Menu; the look is what other players see.
BC.HAIR_COLORS = ['#2a1a10', '#5a3a1a', '#8a5a2a', '#c86a2a', '#d8a850', '#e8e0c8', '#d8d8d8', '#3a2a4a'];
BC.CLOTH_COLORS = ['#5f9a3c', '#4a6a3a', '#6a8a4a', '#f0f0f0', '#3a3a44', '#6a3a8a', '#d8405a', '#e3a62b', '#3a7ac8', '#e8702a', '#b89a6a', '#6a4a2a', '#4a5a6a', '#2fb5a0'];
BC.SKIN_COLORS = ['#f6d6b8', '#e8b890', '#c8906a', '#9a6a48', '#6a4530'];
BC.HATS = [['none', 'No hat'], ['straw', 'Straw hat'], ['ranger', 'Ranger hat'], ['hood', 'Hood'], ['cap', 'Cap']];
BC.ACCESSORIES = [['none', 'None'], ['backpack', 'Backpack'], ['satchel', 'Satchel'], ['binoculars', 'Binoculars'], ['glasses', 'Glasses'], ['leaf', 'Leaf badge']];
BC.CHARACTERS = [
  { id: 'explorer', name: 'Explorer', emoji: '🧭', blurb: 'The classic adventurer. Perfect for discovering new biomes, collecting plants, and learning about nature.',
    perks: ['Walks and sprints 15% faster', 'Double points for every new region and landmark you find', 'Starter kit: 2 waypoint flags and a spare rope'],
    look: { hair: '#5a3a1a', shirt: '#5f9a3c', pants: '#b89a6a', skin: '#e8b890', hat: 'none', acc: 'backpack' } },
  { id: 'botanist', name: 'Botanist', emoji: '🌸', blurb: 'Focused on plants and education. Comes with a field guide, plant journal, and special tools for identifying species.',
    perks: ['Wild plants and crops give an extra seed every time', 'Double points for every plant and tree in your journal', 'Starter kit: pruning shears and 3 seed bombs'],
    look: { hair: '#c86a2a', shirt: '#6a8a4a', pants: '#4a6a3a', skin: '#f6d6b8', hat: 'straw', acc: 'satchel' } },
  { id: 'ranger', name: 'Ranger', emoji: '🌲', blurb: 'A protector of forests and wildlife. Great for conservation missions and exploring dense woodlands.',
    perks: ['Animals on a rope stay close and calm', 'Shaking leaves gives tree seeds twice as often', 'Starter kit: a machete and 4 ropes'],
    look: { hair: '#4a3020', shirt: '#4a6a3a', pants: '#6a4a2a', skin: '#c8906a', hat: 'ranger', acc: 'binoculars' } },
  { id: 'researcher', name: 'Researcher', emoji: '📖', blurb: 'A scientist at heart. Perfect for studying plant life, taking samples, and unlocking advanced plant knowledge in your journal.',
    perks: ['+2 points on every journal discovery', 'Soil tests also reveal the best crops for that spot', 'Starter kit: a soil test kit and a fertiliser spreader'],
    look: { hair: '#d8d8d8', shirt: '#f0f0f0', pants: '#4a5a6a', skin: '#e8b890', hat: 'none', acc: 'glasses' } },
  { id: 'custom', name: 'Custom', emoji: '🎨', blurb: 'Make it your own! Customize hair, clothing colors, and accessories to create a character that fits your style.',
    perks: ['No special perk: play your own way', 'Starter kit: 10 leaf coins'],
    look: { hair: '#3a2a4a', shirt: '#6a3a8a', pants: '#3a3a44', skin: '#e8b890', hat: 'hood', acc: 'leaf' } },
];
BC.CHARACTER_BY_ID = {}; BC.CHARACTERS.forEach(c => { BC.CHARACTER_BY_ID[c.id] = c; });
BC.STARTER_KITS = {
  explorer: [{ type: 'block', id: 167, count: 2 }, { type: 'material', id: 'rope', count: 1 }],
  botanist: [{ type: 'tool', id: 'shears' }, { type: 'ingredient', id: 'seed_bomb', count: 3 }],
  ranger: [{ type: 'tool', id: 'machete' }, { type: 'material', id: 'rope', count: 4 }],
  researcher: [{ type: 'tool', id: 'testkit' }, { type: 'tool', id: 'spreader' }],
  custom: [{ type: 'coin', count: 10 }],
};
