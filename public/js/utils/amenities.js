export const amenityDefinitions = {
    'bbq': { title: 'BBQ/Grill', emoji: '🔥', color: 'var(--color-fire)', queryTags: ['amenity=bbq'], canBeArea: true },
    'firepit': { title: 'Fire Pit', emoji: '🔥', color: 'var(--color-fire)', queryTags: ['leisure=firepit'], attributeTags: ['fireplace=yes'], canBeArea: true },
    'drinking_water': { title: 'Drinking Water', emoji: '💧', color: 'var(--color-water)', queryTags: ['amenity=drinking_water', 'drinking_water=yes'], canBeArea: false },
    'water_point': { title: 'Water Point/Tap', emoji: '💧', color: 'var(--color-water)', queryTags: ['amenity=water_point'], canBeArea: false },
    'fountain': { title: 'Fountain', emoji: '💧', color: 'var(--color-water)', queryTags: ['amenity=fountain'], canBeArea: false },
    'picnic_table': { title: 'Picnic Table', emoji: '🍽️', color: 'var(--color-water)', queryTags: ['leisure=picnic_table'], attributeTags: ['picnic_table=yes'], canBeArea: true },
    'food_court': { title: 'Food Court', emoji: '☕', color: 'var(--color-comfort)', queryTags: ['amenity=food_court'], canBeArea: true },
    'cafe': { title: 'Cafe', emoji: '☕', color: 'var(--color-comfort)', queryTags: ['amenity=cafe'], canBeArea: true },
    'restaurant': { title: 'Restaurant', emoji: '🍽️', color: 'var(--color-comfort)', queryTags: ['amenity=restaurant'], canBeArea: true },
    'fast_food': { title: 'Fast Food', emoji: '🍔', color: 'var(--color-comfort)', queryTags: ['amenity=fast_food'], canBeArea: true },
    'ice_cream': { title: 'Ice Cream', emoji: '🍦', color: 'var(--color-comfort)', queryTags: ['amenity=ice_cream'], canBeArea: true },
    'pub': { title: 'Pub', emoji: '🍺', color: 'var(--color-comfort)', queryTags: ['amenity=pub'], canBeArea: true },
    'bar': { title: 'Bar', emoji: '🍸', color: 'var(--color-comfort)', queryTags: ['amenity=bar'], canBeArea: true },
    'biergarten': { title: 'Beer Garden', emoji: '🍻', color: 'var(--color-comfort)', queryTags: ['amenity=biergarten'], canBeArea: true },
    'bakery': { title: 'Bakery', emoji: '🥐', color: 'var(--color-comfort)', queryTags: ['shop=bakery'], canBeArea: true },
    'marketplace': { title: 'Marketplace', emoji: '🛒', color: 'var(--color-comfort)', queryTags: ['amenity=marketplace'], canBeArea: true },
    'toilets': { title: 'Toilets', emoji: '🚽', color: 'var(--color-facility)', queryTags: ['amenity=toilets'], attributeTags: ['toilets=yes'], canBeArea: true },
    'shower': { title: 'Shower', emoji: '🚿', color: 'var(--color-facility)', queryTags: ['amenity=shower'], attributeTags: ['shower=yes'], canBeArea: true },
    'waste_basket': { title: 'Waste Basket', emoji: '🗑️', color: 'var(--text-muted)', queryTags: ['amenity=waste_basket'], canBeArea: false },
    'waste_disposal': { title: 'Waste Disposal', emoji: '🗑️', color: 'var(--text-muted)', queryTags: ['amenity=waste_disposal'], canBeArea: true },
    'recycling': { title: 'Recycling', emoji: '♻️', color: 'var(--text-muted)', queryTags: ['amenity=recycling'], canBeArea: true },
    'shelter': { title: 'Shelter/Hut', emoji: '🛖', color: 'var(--color-comfort)', queryTags: ['amenity=shelter', 'tourism=wilderness_hut'], attributeTags: ['shelter=yes'], canBeArea: true },
    'bench': { title: 'Bench', emoji: '🪑', color: 'var(--color-water)', queryTags: ['amenity=bench'], attributeTags: ['bench=yes'], canBeArea: false },
    'playground': { title: 'Playground', emoji: '🤸', color: 'var(--color-comfort)', queryTags: ['leisure=playground'], attributeTags: ['playground=yes'], canBeArea: true },
    'camp_site': { title: 'Camp Site', emoji: '🏕️', color: 'var(--color-comfort)', queryTags: ['tourism=camp_site'], canBeArea: true },
    'charging_station': { title: 'EV Charging', emoji: '🔌', color: 'var(--color-water)', queryTags: ['amenity=charging_station'], canBeArea: false }
};

export const amenityGroupDefinitions = {
    'fire_place_group': { title: 'Fire Place (Any)', includes: ['bbq', 'firepit'], subtext: '(BBQ, Fire Pit, or fireplace=yes)' },
    'water_source_group': { title: 'Water Source (Any)', includes: ['drinking_water', 'water_point', 'fountain'], subtext: '(Drinking Water, Fountain, Tap)' },
    'waste_disposal_group': { title: 'Waste Disposal (Any)', includes: ['waste_basket', 'waste_disposal', 'recycling'], subtext: '(Basket, Disposal, Recycling)' },
    'food_nearby_group': { title: 'Food Nearby (Any)', includes: ['cafe', 'restaurant', 'fast_food', 'food_court', 'ice_cream', 'pub', 'bar', 'biergarten', 'bakery', 'marketplace'], subtext: '(Restaurant, Cafe, Fast Food, Bakery, Pub, Bar, Marketplace…)' },
    'toilets_group': { title: 'Toilets (Any)', includes: ['toilets'], subtext: '(Toilets amenity or toilets=yes)' },
    'shelter_group': { title: 'Shelter (Any)', includes: ['shelter'], subtext: '(Shelter, Wilderness Hut)' }
};

// Groups needed for rendering UI dynamically
export const uiSections = [
    {
        title: "Fire & Water",
        items: [
            { id: 'fire_place_group', type: 'group' },
            { id: 'water_source_group', type: 'group' }
        ]
    },
    {
        title: "Eating & Facilities",
        items: [
            { id: 'picnic_table', type: 'single' },
            { id: 'toilets_group', type: 'group' },
            { id: 'waste_disposal_group', type: 'group' },
            { id: 'shower', type: 'single' }
        ]
    },
    {
        title: "Comfort & Other",
        items: [
            { id: 'shelter_group', type: 'group' },
            { id: 'bench', type: 'single' },
            { id: 'playground', type: 'single' },
            { id: 'food_nearby_group', type: 'group' },
            { id: 'camp_site', type: 'single' },
            { id: 'charging_station', type: 'single' }
        ]
    }
];
