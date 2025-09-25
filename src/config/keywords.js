/**
 * Keywords Configuration Module
 * Defines search keywords, categories, and keyword management settings
 */

// Keyword categories for better organization
const KEYWORD_CATEGORIES = {
    brand: [
        'KMS Marketplace'
    ],
    products: [
        'kmsmarketplace t shirt',
        'kmsmarketplace vinova',
        'kmsmarketplace Consequat',
        'kmsmarketplace Gaming Headset',
        'kmsmarketplace Wage Universal Wired',
        'kmsmarketplace Comodous Portable',
        'kmsmarketplace Earbud Fashion Fidelity',
        'kmsmarketplace Amoled Music Weather'
    ]
    // Add more categories as needed:
    // services: [],
    // locations: [],
    // competitors: []
};

// Flatten all categories into a single keywords array
const KEYWORDS = Object.values(KEYWORD_CATEGORIES).flat();

// Configuration for keyword management
const KEYWORD_CONFIG = {
    // Maximum number of keywords to process per cycle (0 = no limit)
    maxKeywordsPerCycle: 0,

    // Randomize keyword order to avoid patterns
    randomizeOrder: true,

    // Enable/disable specific categories
    enabledCategories: Object.keys(KEYWORD_CATEGORIES),

    // Organic search behavior settings
    enableOrganicPatterns: true,
    enableRandomizedSequencing: true,
    enableAntiDetection: true
};

// Geographic locations for search targeting
const GEO_LOCATIONS = [
    { name: 'New York, USA', latitude: 40.7128, longitude: -74.0060 },
    { name: 'London, UK', latitude: 51.5074, longitude: -0.1278 },
    { name: 'Tokyo, Japan', latitude: 35.6895, longitude: 139.6917 },
    { name: 'Sydney, Australia', latitude: -33.8688, longitude: 151.2093 },
    { name: 'Dhaka, Bangladesh', latitude: 23.8103, longitude: 90.4125 },
    { name: 'Berlin, Germany', latitude: 52.5200, longitude: 13.4050 },
    { name: 'Paris, France', latitude: 48.8566, longitude: 2.3522 },
    { name: 'Toronto, Canada', latitude: 43.6510, longitude: -79.3470 },
    { name: 'Moscow, Russia', latitude: 55.7558, longitude: 37.6173 },
    { name: 'Beijing, China', latitude: 39.9042, longitude: 116.4074 },
    { name: 'Mumbai, India', latitude: 19.0760, longitude: 72.8777 },
    { name: 'São Paulo, Brazil', latitude: -23.5505, longitude: -46.6333 },
    { name: 'Cape Town, South Africa', latitude: -33.9249, longitude: 18.4241 },
    { name: 'Seoul, South Korea', latitude: 37.5665, longitude: 126.9780 },
    { name: 'Bangkok, Thailand', latitude: 13.7563, longitude: 100.5018 },
    { name: 'Buenos Aires, Argentina', latitude: -34.6037, longitude: -58.3816 },
    { name: 'Rome, Italy', latitude: 41.9028, longitude: 12.4964 },
    { name: 'Madrid, Spain', latitude: 40.4168, longitude: -3.7038 },
    { name: 'Jakarta, Indonesia', latitude: -6.2088, longitude: 106.8456 },
    { name: 'Istanbul, Turkey', latitude: 41.0082, longitude: 28.9784 },
    { name: 'Lagos, Nigeria', latitude: 6.5244, longitude: 3.3792 },
    { name: 'Nairobi, Kenya', latitude: -1.2921, longitude: 36.8219 },
    { name: 'Cairo, Egypt', latitude: 30.0444, longitude: 31.2357 },
    { name: 'Tehran, Iran', latitude: 35.6892, longitude: 51.3890 },
    { name: 'Kuala Lumpur, Malaysia', latitude: 3.1390, longitude: 101.6869 },
    { name: 'Singapore', latitude: 1.3521, longitude: 103.8198 },
    { name: 'Hanoi, Vietnam', latitude: 21.0285, longitude: 105.8542 },
    { name: 'Melbourne, Australia', latitude: -37.8136, longitude: 144.9631 },
    { name: 'Auckland, New Zealand', latitude: -36.8485, longitude: 174.7633 },
    { name: 'Lisbon, Portugal', latitude: 38.7169, longitude: -9.1399 },
    { name: 'Oslo, Norway', latitude: 59.9139, longitude: 10.7522 },
    { name: 'Stockholm, Sweden', latitude: 59.3293, longitude: 18.0686 },
    { name: 'Zurich, Switzerland', latitude: 47.3769, longitude: 8.5417 },
    { name: 'Vienna, Austria', latitude: 48.2082, longitude: 16.3738 },
    { name: 'Warsaw, Poland', latitude: 52.2297, longitude: 21.0122 },
    { name: 'Helsinki, Finland', latitude: 60.1695, longitude: 24.9354 },
    { name: 'Chicago, USA', latitude: 41.8781, longitude: -87.6298 },
    { name: 'Los Angeles, USA', latitude: 34.0522, longitude: -118.2437 },
    { name: 'San Francisco, USA', latitude: 37.7749, longitude: -122.4194 },
    { name: 'Miami, USA', latitude: 25.7617, longitude: -80.1918 },
    { name: 'Houston, USA', latitude: 29.7604, longitude: -95.3698 },
    { name: 'Seattle, USA', latitude: 47.6062, longitude: -122.3321 },
    { name: 'Mexico City, Mexico', latitude: 19.4326, longitude: -99.1332 },
    { name: 'Rio de Janeiro, Brazil', latitude: -22.9068, longitude: -43.1729 },
    { name: 'Brasília, Brazil', latitude: -15.8267, longitude: -47.9218 },
    { name: 'Santiago, Chile', latitude: -33.4489, longitude: -70.6693 },
    { name: 'Lima, Peru', latitude: -12.0464, longitude: -77.0428 },
    { name: 'Bogotá, Colombia', latitude: 4.7110, longitude: -74.0721 },
    { name: 'Caracas, Venezuela', latitude: 10.4806, longitude: -66.9036 },
    { name: 'Quito, Ecuador', latitude: -0.1807, longitude: -78.4678 },
    { name: 'La Paz, Bolivia', latitude: -16.4897, longitude: -68.1193 },
    { name: 'Asunción, Paraguay', latitude: -25.2637, longitude: -57.5759 },
    { name: 'Montevideo, Uruguay', latitude: -34.9011, longitude: -56.1645 },
    { name: 'Panama City, Panama', latitude: 8.9824, longitude: -79.5199 },
    { name: 'Manila, Philippines', latitude: 14.5995, longitude: 120.9842 },
    { name: 'Cebu City, Philippines', latitude: 10.3157, longitude: 123.8854 },
    { name: 'Dubai, UAE', latitude: 25.276987, longitude: 55.296249 },
    { name: 'Abu Dhabi, UAE', latitude: 24.4539, longitude: 54.3773 },
    { name: 'Doha, Qatar', latitude: 25.276987, longitude: 51.520008 },
    { name: 'Riyadh, Saudi Arabia', latitude: 24.7136, longitude: 46.6753 },
    { name: 'Jeddah, Saudi Arabia', latitude: 21.4858, longitude: 39.1925 },
    { name: 'Baghdad, Iraq', latitude: 33.3152, longitude: 44.3661 },
    { name: 'Amman, Jordan', latitude: 31.9454, longitude: 35.9284 },
    { name: 'Damascus, Syria', latitude: 33.5138, longitude: 36.2765 },
    { name: 'Beirut, Lebanon', latitude: 33.8938, longitude: 35.5018 },
    { name: 'Muscat, Oman', latitude: 23.5859, longitude: 58.4059 },
    { name: 'Manama, Bahrain', latitude: 26.2285, longitude: 50.5861 },
    { name: 'Kuwait City, Kuwait', latitude: 29.3759, longitude: 47.9774 },
    { name: 'Addis Ababa, Ethiopia', latitude: 9.0300, longitude: 38.7400 },
    { name: 'Dar es Salaam, Tanzania', latitude: -6.7924, longitude: 39.2083 },
    { name: 'Accra, Ghana', latitude: 5.6037, longitude: -0.1870 },
    { name: 'Dakar, Senegal', latitude: 14.6928, longitude: -17.4467 },
    { name: 'Casablanca, Morocco', latitude: 33.5731, longitude: -7.5898 },
    { name: 'Marrakech, Morocco', latitude: 31.6295, longitude: -7.9811 },
    { name: 'Algiers, Algeria', latitude: 36.7538, longitude: 3.0588 },
    { name: 'Tunis, Tunisia', latitude: 36.8065, longitude: 10.1815 },
    { name: 'Tripoli, Libya', latitude: 32.8872, longitude: 13.1913 },
    { name: 'Khartoum, Sudan', latitude: 15.5007, longitude: 32.5599 },
    { name: 'Pretoria, South Africa', latitude: -25.7479, longitude: 28.2293 },
    { name: 'Johannesburg, South Africa', latitude: -26.2041, longitude: 28.0473 },
    { name: 'Harare, Zimbabwe', latitude: -17.8292, longitude: 31.0522 },
    { name: 'Lusaka, Zambia', latitude: -15.3875, longitude: 28.3228 },
    { name: 'Kampala, Uganda', latitude: 0.3476, longitude: 32.5825 },
    { name: 'Yaoundé, Cameroon', latitude: 3.8480, longitude: 11.5021 },
    { name: 'Kinshasa, DR Congo', latitude: -4.4419, longitude: 15.2663 },
    { name: 'Luanda, Angola', latitude: -8.8390, longitude: 13.2894 },
    { name: 'Antananarivo, Madagascar', latitude: -18.8792, longitude: 47.5079 },
    { name: 'Reykjavik, Iceland', latitude: 64.1355, longitude: -21.8954 },
    { name: 'Brussels, Belgium', latitude: 50.8503, longitude: 4.3517 },
    { name: 'Luxembourg City, Luxembourg', latitude: 49.6117, longitude: 6.1319 },
    { name: 'Tallinn, Estonia', latitude: 59.4370, longitude: 24.7536 },
    { name: 'Riga, Latvia', latitude: 56.9496, longitude: 24.1052 },
    { name: 'Vilnius, Lithuania', latitude: 54.6872, longitude: 25.2797 },
    { name: 'Bratislava, Slovakia', latitude: 48.1486, longitude: 17.1077 },
    { name: 'Ljubljana, Slovenia', latitude: 46.0569, longitude: 14.5058 },
    { name: 'Sarajevo, Bosnia and Herzegovina', latitude: 43.8563, longitude: 18.4131 },
    { name: 'Zagreb, Croatia', latitude: 45.8150, longitude: 15.9785 },
    { name: 'Belgrade, Serbia', latitude: 44.8176, longitude: 20.4569 },
    { name: 'Skopje, North Macedonia', latitude: 41.9981, longitude: 21.4254 },
    { name: 'Podgorica, Montenegro', latitude: 42.4410, longitude: 19.2627 },
    { name: 'Pristina, Kosovo', latitude: 42.6629, longitude: 21.1655 },
    { name: 'Athens, Greece', latitude: 37.9838, longitude: 23.7275 },
    { name: 'Thessaloniki, Greece', latitude: 40.6401, longitude: 22.9444 },
    { name: 'Frankfurt, Germany', latitude: 50.1109, longitude: 8.6821 },
    { name: 'Hamburg, Germany', latitude: 53.5511, longitude: 9.9937 },
    { name: 'Munich, Germany', latitude: 48.1351, longitude: 11.5820 },
    { name: 'Cologne, Germany', latitude: 50.9375, longitude: 6.9603 },
    { name: 'Barcelona, Spain', latitude: 41.3851, longitude: 2.1734 },
    { name: 'Valencia, Spain', latitude: 39.4699, longitude: -0.3763 },
    { name: 'Seville, Spain', latitude: 37.3891, longitude: -5.9845 },
    { name: 'Florence, Italy', latitude: 43.7699, longitude: 11.2556 },
    { name: 'Milan, Italy', latitude: 45.4642, longitude: 9.1900 },
    { name: 'Naples, Italy', latitude: 40.8518, longitude: 14.2681 },
    { name: 'Bucharest, Romania', latitude: 44.4268, longitude: 26.1025 },
    { name: 'Sofia, Bulgaria', latitude: 42.6977, longitude: 23.3219 },
    { name: 'Budapest, Hungary', latitude: 47.4979, longitude: 19.0402 },
    { name: 'Krakow, Poland', latitude: 50.0647, longitude: 19.9450 },
    { name: 'St. Petersburg, Russia', latitude: 59.9343, longitude: 30.3351 },
    { name: 'Novosibirsk, Russia', latitude: 55.0084, longitude: 82.9357 },
    { name: 'Vladivostok, Russia', latitude: 43.1155, longitude: 131.8854 },
    { name: 'Ulaanbaatar, Mongolia', latitude: 47.9212, longitude: 106.9186 },
    { name: 'Chengdu, China', latitude: 30.5728, longitude: 104.0668 },
    { name: 'Shanghai, China', latitude: 31.2304, longitude: 121.4737 },
    { name: 'Shenzhen, China', latitude: 22.5431, longitude: 114.0579 },
    { name: 'Guangzhou, China', latitude: 23.1291, longitude: 113.2644 },
    { name: 'Hong Kong, China', latitude: 22.3193, longitude: 114.1694 },
    { name: 'Taipei, Taiwan', latitude: 25.0330, longitude: 121.5654 },
    { name: 'Kyoto, Japan', latitude: 35.0116, longitude: 135.7681 },
    { name: 'Osaka, Japan', latitude: 34.6937, longitude: 135.5023 },
    { name: 'Nagoya, Japan', latitude: 35.1815, longitude: 136.9066 },
    { name: 'Kobe, Japan', latitude: 34.6901, longitude: 135.1955 },
    { name: 'Busan, South Korea', latitude: 35.1796, longitude: 129.0756 },
    { name: 'Fukuoka, Japan', latitude: 33.5904, longitude: 130.4017 }
];

module.exports = {
    KEYWORD_CATEGORIES,
    KEYWORDS,
    KEYWORD_CONFIG,
    GEO_LOCATIONS
};