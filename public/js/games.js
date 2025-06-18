// Use global Supabase client (simpler approach)
let supabaseClient;

// Initialize Supabase client
function initializeSupabase() {
    try {
        // Use the global Supabase client set in HTML
        if (window.supabaseClient) {
            supabaseClient = window.supabaseClient;
            console.log('✅ Using global Supabase client');
            return Promise.resolve();
        } else {
            console.error('❌ Global Supabase client not found');
            return Promise.reject(new Error('Supabase client not available'));
        }
    } catch (error) {
        console.error('❌ Error initializing Supabase:', error);
        return Promise.reject(error);
    }
}

// DOM Elements
let gamesList, searchInput, searchDropdown, searchResultsList;
let mobileSearchInput, mobileSearchDropdown, mobileSearchResultsList;

// State
let allGames = [];
let filteredGames = [];
let currentFilters = {
    category: [],
    year: [],
    size: [],
    sortBy: 'Latest Releases'
};

// Initialize the page
async function initializePage() {
    try {
        console.log('🚀 Initializing games page...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
        }
        
        // Initialize Supabase
        await initializeSupabase();
        
        // Ensure we have a working Supabase client
        if (!supabaseClient) {
            throw new Error('Failed to initialize Supabase client');
        }
        
        console.log('✅ Supabase client ready');
        
        // Get DOM elements
        gamesList = document.getElementById('gamesList');
        searchInput = document.getElementById('searchInput');
        searchDropdown = document.getElementById('searchDropdown');
        searchResultsList = document.getElementById('searchResultsList');
        mobileSearchInput = document.getElementById('mobileSearchInput');
        mobileSearchDropdown = document.getElementById('mobileSearchDropdown');
        mobileSearchResultsList = document.getElementById('mobileSearchResultsList');
        
        if (!gamesList) {
            console.error('❌ Games list container not found');
            showError('Page elements not found. Please refresh the page.');
            return;
        }
        
        await fetchGames();
        setupEventListeners();
        renderGames(allGames);
        console.log('✅ Games page initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing page:', error);
        showError('Failed to load games. Please refresh the page or try again later.');
    }
}

// Fetch games from Supabase
async function fetchGames() {
    try {
        console.log('📡 Fetching games from Supabase...');
        
        const { data, error } = await supabaseClient
            .from('games')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        console.log(`✅ Fetched ${data?.length || 0} games successfully`);
        allGames = data || [];
        filteredGames = [...allGames];
    } catch (error) {
        console.error('❌ Error fetching games:', error);
        throw error;
    }
}

// Get genre color
function getGenreColor(genre) {
    const colors = {
        'Action': 'from-red-500 to-orange-500',
        'Adventure': 'from-green-500 to-emerald-500',
        'RPG': 'from-purple-500 to-violet-500',
        'Strategy': 'from-blue-500 to-cyan-500',
        'Sports': 'from-yellow-500 to-orange-500',
        'Racing': 'from-pink-500 to-rose-500',
        'Simulation': 'from-indigo-500 to-blue-500',
        'Multiplayer': 'from-teal-500 to-green-500'
    };
    return colors[genre] || 'from-gray-500 to-gray-600';
}

// Get size color based on file size
function getSizeColor(size) {
    const sizeNum = parseFloat(size);
    if (sizeNum <= 5) return 'text-green-400';
    if (sizeNum <= 15) return 'text-yellow-400';
    if (sizeNum <= 30) return 'text-orange-400';
    return 'text-red-400';
}

// Render games to the page
function renderGames(games) {
    if (!gamesList) {
        console.error('Games list container not found');
        return;
    }

    if (!games || games.length === 0) {
        gamesList.innerHTML = `
            <div class="col-span-full text-center py-16">
                <div class="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-12 border border-gray-700">
                    <i class="fas fa-gamepad text-8xl text-gray-500 mb-6 animate-pulse"></i>
                    <h3 class="text-2xl font-bold text-gray-300 mb-4">No Games Found</h3>
                    <p class="text-gray-500 text-lg">No games match your current filters. Try adjusting your search criteria.</p>
                </div>
            </div>
        `;
        return;
    }

    gamesList.innerHTML = games.map((game, index) => `
        <div class="game-card group relative transform transition-all duration-500 hover:scale-105 hover:-translate-y-2" 
             style="animation-delay: ${index * 0.1}s">
            <!-- Glowing Background Effect -->
            <div class="absolute -inset-0.5 bg-gradient-to-r ${getGenreColor(game.genre)} rounded-2xl blur-sm opacity-0 group-hover:opacity-75 transition-opacity duration-500"></div>
            
            <!-- Main Card -->
            <div class="relative bg-gray-900 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl">
                <a href="gamepage.html?id=${game.id}" class="block">
                    <!-- Cover Image Section -->
                    <div class="relative h-56 overflow-hidden bg-gray-800">
                        <img src="${game.cover_image_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImdyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMzMzM7c3RvcC1vcGFjaXR5OjEiIC8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMTExO3N0b3Atb3BhY2l0eToxIiAvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNjAwIiBmaWxsPSJ1cmwoI2dyYWQpIi8+PGNpcmNsZSBjeD0iMjAwIiBjeT0iMzAwIiByPSI1MCIgZmlsbD0iIzY0ZmZkYSIgb3BhY2l0eT0iMC4zIi8+PHRleHQgeD0iNTAlIiB5PSI1NSUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzY0ZmZkYSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIENvdmVyPC90ZXh0Pjx0ZXh0IHg9IjUwJSIgeT0iNjUlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM2NGZmZGEiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZTwvdGV4dD48L3N2Zz4='}" 
                             alt="${game.title}" 
                             class="w-full h-full object-contain bg-gray-800 transform transition-transform duration-700 group-hover:scale-105"
                             onerror="this.onerror=null;this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImdyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMzMzM7c3RvcC1vcGFjaXR5OjEiIC9+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMTExO3N0b3Atb3BhY2l0eToxIiAvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNjAwIiBmaWxsPSJ1cmwoI2dyYWQpIi8+PGNpcmNsZSBjeD0iMjAwIiBjeT0iMzAwIiByPSI1MCIgZmlsbD0iIzY0ZmZkYSIgb3BhY2l0eT0iMC4zIi8+PHRleHQgeD0iNTAlIiB5PSI1NSUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzY0ZmZkYSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIENvdmVyPC90ZXh0Pjx0ZXh0IHg9IjUwJSIgeT0iNjUlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM2NGZmZGEiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZTwvdGV4dD48L3N2Zz4='">
                        
                        <!-- Version Badge -->
                        <div class="absolute top-3 right-3 bg-gradient-to-r ${getGenreColor(game.genre)} text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                            v${game.version || '1.0'}
                        </div>
                        
                        <!-- Size Badge -->
                        <div class="absolute top-3 left-3 bg-black bg-opacity-70 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">
                            <i class="fas fa-hdd mr-1"></i>
                            <span class="${getSizeColor(game.repack_size)}">${game.repack_size || '?'} ${game.repack_size_unit || 'GB'}</span>
                        </div>
                    </div>
                    
                    <!-- Card Content -->
                    <div class="p-3">
                        <!-- Title and Developer -->
                        <div class="mb-2">
                            <h3 class="text-lg font-bold text-white mb-1 truncate">${game.title}</h3>
                            <p class="text-xs text-gray-400 truncate">${game.developer || 'Unknown Developer'}</p>
                        </div>
                        
                        <!-- Genre and Year -->
                        <div class="flex items-center justify-between mb-2">
                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getGenreColor(game.genre)} text-white shadow-sm">
                                <i class="fas fa-tag mr-1"></i>
                                ${game.genre || 'Unknown'}
                            </span>
                            <span class="text-xs text-gray-400 font-medium">
                                <i class="fas fa-calendar-alt mr-1"></i>
                                ${new Date(game.release_date || game.created_at).getFullYear()}
                            </span>
                        </div>
                        
                        <!-- Description -->
                        <p class="text-xs text-gray-300 leading-relaxed mb-3 line-clamp-2">
                            ${game.description || 'Experience this amazing game with enhanced graphics and improved gameplay mechanics.'}
                        </p>
                        
                        <!-- Download Section -->
                        <div class="flex items-center justify-between">
                            <!-- Rating/Quality Indicator -->
                            <div class="flex items-center space-x-1">
                                <div class="flex text-yellow-400">
                                    <i class="fas fa-star text-xs"></i>
                                    <i class="fas fa-star text-xs"></i>
                                    <i class="fas fa-star text-xs"></i>
                                    <i class="fas fa-star text-xs"></i>
                                    <i class="fas fa-star-half-alt text-xs"></i>
                                </div>
                                <span class="text-xs text-gray-400 ml-1">4.5</span>
                            </div>
                            
                            <!-- Download Button -->
                            <button class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-1.5 px-3 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-xs">
                                <i class="fas fa-download mr-1"></i>
                                Download
                            </button>
                        </div>
                    </div>
                </a>
            </div>
        </div>
    `).join('');

    // Add entrance animations
    const cards = document.querySelectorAll('.game-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease-out';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Filter games based on current filters
function filterGames() {
    console.log('🔍 Filtering games with filters:', currentFilters);
    console.log('📚 Total games to filter:', allGames.length);
    
    filteredGames = allGames.filter(game => {
        // Category filter - improved logic with case-insensitive matching and multi-genre support
        if (currentFilters.category.length > 0) {
            const gameGenre = (game.genre || '').trim();
            console.log(`🏷️  Game: "${game.title}" has genre: "${gameGenre}"`);
            
            // Split game genres by common separators (comma, 'and', '&')
            const gameGenres = gameGenre
                .toLowerCase()
                .split(/[,&]|\sand\s/)
                .map(g => g.trim())
                .filter(g => g.length > 0);
            
            console.log(`   Game genres array:`, gameGenres);
            
            // Check if any selected category matches any of the game's genres
            const categoryMatch = currentFilters.category.some(selectedCategory => {
                return gameGenres.some(gameGenrePart => {
                    const match = gameGenrePart.includes(selectedCategory.toLowerCase()) || 
                                  selectedCategory.toLowerCase().includes(gameGenrePart);
                    console.log(`   Comparing "${gameGenrePart}" with "${selectedCategory.toLowerCase()}" = ${match}`);
                    return match;
                });
            });
            
            if (!categoryMatch) {
                console.log(`❌ Game "${game.title}" filtered out - no genre match between [${gameGenres.join(', ')}] and [${currentFilters.category.join(', ')}]`);
                return false;
            } else {
                console.log(`✅ Game "${game.title}" passed category filter`);
            }
        }
        
        // Year filter - improved logic
        if (currentFilters.year.length > 0) {
            const gameYear = new Date(game.release_date || game.created_at).getFullYear().toString();
            console.log(`📅 Game: "${game.title}" has year: ${gameYear}`);
            
            if (!currentFilters.year.includes(gameYear)) {
                console.log(`❌ Game "${game.title}" filtered out - year ${gameYear} not in ${currentFilters.year}`);
                return false;
            } else {
                console.log(`✅ Game "${game.title}" passed year filter`);
            }
        }
        
        // Size filter - improved logic
        if (currentFilters.size && currentFilters.size.length > 0) {
            const gameSize = parseFloat(game.repack_size) || 0;
            console.log(`💾 Game: "${game.title}" has size: ${gameSize}GB`);
            
            let sizeMatches = false;
            
            for (const sizeRange of currentFilters.size) {
                if (sizeRange.includes('Under 5GB') && gameSize < 5) {
                    sizeMatches = true;
                    break;
                } else if (sizeRange.includes('5GB - 15GB') && gameSize >= 5 && gameSize <= 15) {
                    sizeMatches = true;
                    break;
                } else if (sizeRange.includes('15GB - 30GB') && gameSize > 15 && gameSize <= 30) {
                    sizeMatches = true;
                    break;
                } else if (sizeRange.includes('30GB - 50GB') && gameSize > 30 && gameSize <= 50) {
                    sizeMatches = true;
                    break;
                } else if (sizeRange.includes('Over 50GB') && gameSize > 50) {
                    sizeMatches = true;
                    break;
                }
            }
            
            if (!sizeMatches) {
                console.log(`❌ Game "${game.title}" filtered out - size ${gameSize}GB not matching any of ${currentFilters.size}`);
                return false;
            } else {
                console.log(`✅ Game "${game.title}" passed size filter`);
            }
        }
        
        return true;
    });

    // Apply sorting
    switch (currentFilters.sortBy) {
        case 'Latest Releases':
            filteredGames.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'Most Downloaded':
            filteredGames.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
            break;
        case 'Alphabetical':
            filteredGames.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'Size (Smallest First)':
            filteredGames.sort((a, b) => (parseFloat(a.repack_size) || 0) - (parseFloat(b.repack_size) || 0));
            break;
        case 'Size (Largest First)':
            filteredGames.sort((a, b) => (parseFloat(b.repack_size) || 0) - (parseFloat(a.repack_size) || 0));
            break;
    }

    console.log(`📊 Filtered from ${allGames.length} to ${filteredGames.length} games`);
    renderGames(filteredGames);
}

// Search functionality
function setupSearch() {
    const handleSearch = (input, dropdown, resultsList) => {
        if (!input || !dropdown || !resultsList) return;
        
        const searchTerm = input.value.toLowerCase();
        
        if (searchTerm.length < 2) {
            dropdown.classList.add('hidden');
            return;
        }

        const results = allGames.filter(game => 
            game.title.toLowerCase().includes(searchTerm) ||
            (game.description && game.description.toLowerCase().includes(searchTerm))
        ).slice(0, 5);

        if (results.length > 0) {
            resultsList.innerHTML = results.map(game => `
                <a href="gamepage.html?id=${game.id}" class="block p-2 hover:bg-gray-800 rounded transition">
                    <div class="flex items-center space-x-3">
                        <img src="${game.cover_image_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iIzIzMzU1NCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM2NGZmZGEiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBDb3ZlciBJbWFnZTwvdGV4dD48L3N2Zz4='}" alt="${game.title}" class="w-12 h-12 object-cover rounded">
                        <div>
                            <h4 class="text-white font-semibold">${game.title}</h4>
                            <p class="text-sm text-gray-400">${game.genre || 'Unknown'} • ${new Date(game.release_date || game.created_at).getFullYear()}</p>
                        </div>
                    </div>
                </a>
            `).join('');
            dropdown.classList.remove('hidden');
        } else {
            resultsList.innerHTML = '<p class="p-2 text-gray-400">No results found</p>';
            dropdown.classList.remove('hidden');
        }
    };

    // Desktop search
    if (searchInput) {
        searchInput.addEventListener('input', () => handleSearch(searchInput, searchDropdown, searchResultsList));
    }
    
    // Mobile search
    if (mobileSearchInput) {
        mobileSearchInput.addEventListener('input', () => handleSearch(mobileSearchInput, mobileSearchDropdown, mobileSearchResultsList));
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (searchDropdown && !e.target.closest('#searchInput') && !e.target.closest('#searchDropdown')) {
            searchDropdown.classList.add('hidden');
        }
        if (mobileSearchDropdown && !e.target.closest('#mobileSearchInput') && !e.target.closest('#mobileSearchDropdown')) {
            mobileSearchDropdown.classList.add('hidden');
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // Category filters - Enhanced with better visual feedback
    document.querySelectorAll('[data-category]').forEach(button => {
        console.log(`🔧 Setting up category button: ${button.dataset.category}`);
        
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const category = button.dataset.category;
            const index = currentFilters.category.indexOf(category);
            
            if (index === -1) {
                // Add category to filter
                currentFilters.category.push(category);
                button.classList.remove('bg-gray-800', 'text-gray-300', 'hover:bg-neon-blue');
                button.classList.add('bg-blue-600', 'text-white', 'ring-2', 'ring-blue-400');
                console.log(`✅ Added category filter: ${category}`);
            } else {
                // Remove category from filter
                currentFilters.category.splice(index, 1);
                button.classList.remove('bg-blue-600', 'text-white', 'ring-2', 'ring-blue-400');
                button.classList.add('bg-gray-800', 'text-gray-300', 'hover:bg-neon-blue');
                console.log(`❌ Removed category filter: ${category}`);
            }
            
            console.log('🏷️  Current category filters:', currentFilters.category);
            filterGames();
        });
    });

    // Year filters
    document.querySelectorAll('[data-year]').forEach(button => {
        button.addEventListener('click', () => {
            const year = button.dataset.year;
            const index = currentFilters.year.indexOf(year);
            
            if (index === -1) {
                currentFilters.year.push(year);
                button.classList.remove('bg-gray-800', 'text-gray-300');
                button.classList.add('bg-blue-600', 'text-white');
                console.log(`✅ Added year filter: ${year}`);
            } else {
                currentFilters.year.splice(index, 1);
                button.classList.remove('bg-blue-600', 'text-white');
                button.classList.add('bg-gray-800', 'text-gray-300');
                console.log(`❌ Removed year filter: ${year}`);
            }
            
            console.log('Current year filters:', currentFilters.year);
            filterGames();
        });
    });

    // Size filters - Add support for size filtering
    document.querySelectorAll('[data-filter="sizes"]').forEach(button => {
        button.addEventListener('click', () => {
            const sizeText = button.textContent.trim();
            const index = currentFilters.size?.indexOf(sizeText) ?? -1;
            
            // Initialize size filter if it doesn't exist
            if (!currentFilters.size) {
                currentFilters.size = [];
            }
            
            if (index === -1) {
                currentFilters.size.push(sizeText);
                button.classList.remove('bg-gray-800');
                button.classList.add('bg-pink-600', 'text-white');
                console.log(`✅ Added size filter: ${sizeText}`);
            } else {
                currentFilters.size.splice(index, 1);
                button.classList.remove('bg-pink-600', 'text-white');
                button.classList.add('bg-gray-800');
                console.log(`❌ Removed size filter: ${sizeText}`);
            }
            
            console.log('Current size filters:', currentFilters.size);
            filterGames();
        });
    });

    // Sort selection - Fix selector to target the custom-select class
    const sortSelect = document.querySelector('.custom-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentFilters.sortBy = e.target.value;
            console.log(`🔄 Sort changed to: ${currentFilters.sortBy}`);
            filterGames();
        });
        console.log('✅ Sort dropdown event listener attached');
    } else {
        console.warn('⚠️ Sort dropdown not found');
    }

    // Mobile menu toggle
    const mobileMenuButton = document.getElementById('mobileMenuButton');
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Clear filters functionality
    const clearFiltersBtn = document.getElementById('clearFilters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            console.log('🧹 Clearing all filters...');
            
            // Reset filter state
            currentFilters = {
                category: [],
                year: [],
                size: [],
                sortBy: 'Latest Releases'
            };
            
            // Reset all category buttons
            document.querySelectorAll('[data-category]').forEach(button => {
                button.classList.remove('bg-blue-600', 'text-white', 'ring-2', 'ring-blue-400');
                button.classList.add('bg-gray-800', 'text-gray-300', 'hover:bg-neon-blue');
            });
            
            // Reset all year buttons
            document.querySelectorAll('[data-year]').forEach(button => {
                button.classList.remove('bg-blue-600', 'text-white');
                button.classList.add('bg-gray-800', 'text-gray-300');
            });
            
            // Reset all size buttons
            document.querySelectorAll('[data-filter="sizes"]').forEach(button => {
                button.classList.remove('bg-pink-600', 'text-white');
                button.classList.add('bg-gray-800');
            });
            
            // Reset sort dropdown
            const sortSelect = document.querySelector('.custom-select');
            if (sortSelect) {
                sortSelect.value = 'Latest Releases';
            }
            
            console.log('✅ All filters cleared');
            filterGames();
        });
    }

    // Setup search functionality
    setupSearch();
    
    // Debug: Show available genres and years
    console.log('🔍 Debug Info:');
    const availableGenres = [...new Set(allGames.map(g => g.genre).filter(Boolean))];
    const availableYears = [...new Set(allGames.map(g => new Date(g.release_date || g.created_at).getFullYear()))];
    
    // Also show processed genres (split by comma/and)
    const processedGenres = new Set();
    allGames.forEach(game => {
        if (game.genre) {
            const genres = game.genre
                .toLowerCase()
                .split(/[,&]|\sand\s/)
                .map(g => g.trim())
                .filter(g => g.length > 0);
            genres.forEach(genre => processedGenres.add(genre));
        }
    });
    
    console.log('Raw genres from database:', availableGenres);
    console.log('Processed individual genres:', [...processedGenres].sort());
    console.log('Available years:', availableYears.sort());
    console.log('Total games loaded:', allGames.length);
    
    // Show detailed genre breakdown per game
    console.log('\n📋 Game Genre Breakdown:');
    allGames.forEach(game => {
        if (game.genre) {
            const processedGenreList = game.genre
                .toLowerCase()
                .split(/[,&]|\sand\s/)
                .map(g => g.trim())
                .filter(g => g.length > 0);
            console.log(`   "${game.title}": "${game.genre}" → [${processedGenreList.join(', ')}]`);
        }
    });
    
    console.log('✅ All event listeners set up successfully');
}

// Show error message
function showError(message) {
    if (!gamesList) return;
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'bg-red-500 text-white p-4 rounded-lg mb-4 text-center col-span-full';
    errorDiv.textContent = message;
    gamesList.innerHTML = '';
    gamesList.appendChild(errorDiv);
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage); 