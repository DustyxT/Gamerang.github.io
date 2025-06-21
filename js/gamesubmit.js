// Gamesubmit functionality - Direct Supabase integration without server
console.log('🚀 Loading gamesubmit.js...');

// Global variables
let supabaseClient = null;
let currentUser = null;

// Initialize Supabase client (fallback to window.supabase if module import fails)
async function initializeSupabase() {
    try {
        if (window.supabase) {
            supabaseClient = window.supabase;
            console.log('✅ Using window.supabase client');
            return true;
        } else {
            console.error('❌ Supabase client not available');
            return false;
        }
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        return false;
    }
}

// Check authentication status
async function checkAuth() {
    try {
        if (!supabaseClient) {
            console.error('❌ Supabase client not initialized');
            return false;
        }

        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) {
            console.error('Auth error:', error);
            throw error;
        }
        if (!session) {
            console.log('❌ No session found, redirecting to login');
            window.location.href = 'login.html';
            return false;
        }
        
        currentUser = session.user;
        console.log('✅ User authenticated:', currentUser.email);
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = 'login.html';
        return false;
    }
}

// Check storage buckets
async function checkBuckets() {
    try {
        console.log('🔍 Checking storage buckets...');
        
        const { data: buckets, error } = await supabaseClient.storage.listBuckets();
        if (error) {
            console.error('❌ Error listing buckets:', error);
            // Create bucket if it doesn't exist
            await createRequiredBucket();
            return true;
        }
        
        console.log('📦 Available buckets:', buckets.map(b => b.id));
        
        // Check for the main games-images bucket
        const requiredBucket = 'games-images';
        const existingBuckets = buckets.map(bucket => bucket.id);
        
        if (!existingBuckets.includes(requiredBucket)) {
            console.log(`📦 Creating missing bucket: ${requiredBucket}`);
            await createRequiredBucket();
        } else {
            console.log('✅ Required storage bucket is available:', requiredBucket);
        }
        
        return true;
    } catch (error) {
        console.error('🚨 Bucket check failed:', error);
        showStorageWarning();
        return false;
    }
}

// Create required storage bucket
async function createRequiredBucket() {
    try {
        const { data, error } = await supabaseClient.storage.createBucket('games-images', {
            public: true,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            fileSizeLimit: 52428800 // 50MB
        });
        
        if (error && !error.message.includes('already exists')) {
            console.error('❌ Failed to create bucket:', error);
            showStorageWarning();
        } else {
            console.log('✅ Storage bucket created or already exists');
        }
    } catch (error) {
        console.error('❌ Error creating bucket:', error);
        showStorageWarning();
    }
}

// Show storage warning
function showStorageWarning() {
    const existingWarning = document.querySelector('.storage-warning');
    if (existingWarning) return;
    
    const warningDiv = document.createElement('div');
    warningDiv.className = 'storage-warning bg-yellow-600 border border-yellow-500 text-white px-4 py-3 rounded mb-4';
    warningDiv.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            <div>
                <strong>Storage Notice:</strong> Image uploads may be limited. 
                Contact administrator if you experience issues.
            </div>
        </div>
    `;
    
    const form = document.getElementById('gameSubmissionForm');
    if (form) {
        form.insertBefore(warningDiv, form.firstChild);
    }
}

// Generate unique file path
function generateFilePath(userId, type, originalName) {
    const timestamp = Date.now();
    const fileExt = originalName.split('.').pop().toLowerCase();
    const randomId = Math.random().toString(36).substring(2, 15);
    return `${type}/${userId}/${timestamp}_${randomId}.${fileExt}`;
}

// Upload file to Supabase storage
async function uploadFile(file, filePath) {
    try {
        console.log(`📤 Uploading ${filePath}...`);
        
        const { data, error } = await supabaseClient.storage
            .from('games-images')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error('❌ Upload error:', error);
            throw error;
        }

        console.log(`✅ Upload successful: ${filePath}`);
        
        // Get public URL
        const { data: publicUrl } = supabaseClient.storage
            .from('games-images')
            .getPublicUrl(filePath);
        
        return publicUrl.publicUrl;
    } catch (error) {
        console.error(`❌ Upload failed:`, error);
        throw error;
    }
}

// Setup file input handlers
function setupFileInputs() {
    console.log('🎯 Setting up file inputs...');

    // Cover Image Setup
    const coverInput = document.getElementById('coverImage');
    const coverPreview = document.getElementById('coverPreview');

    if (coverInput && coverPreview) {
        console.log('📁 Cover input and preview found');

        coverInput.addEventListener('change', (e) => {
            console.log('🖼️ Cover input changed');
            const file = e.target.files[0];
            if (file) {
                if (file.size > 52428800) { // 50MB
                    alert('Cover image must be smaller than 50MB');
                    coverInput.value = '';
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    let img = coverPreview.querySelector('img');
                    if (!img) {
                        img = document.createElement('img');
                        img.className = 'preview-image';
                        coverPreview.appendChild(img);
                    }
                    img.src = event.target.result;
                    coverPreview.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Screenshots Setup
    const screenshotsInput = document.getElementById('screenshots');
    const screenshotsPreview = document.getElementById('screenshotsPreview');

    if (screenshotsInput && screenshotsPreview) {
        console.log('📷 Screenshots input and preview found');

        screenshotsInput.addEventListener('change', (e) => {
            console.log(`🖼️ Screenshots changed: ${e.target.files.length} files`);
            screenshotsPreview.innerHTML = '';
            const files = Array.from(e.target.files);

            if (files.length > 10) {
                alert('Maximum 10 screenshots allowed');
                screenshotsInput.value = '';
                return;
            }

            if (files.length > 0) {
                const countMessage = document.createElement('div');
                countMessage.className = 'mb-2 text-sm text-blue-400';
                countMessage.textContent = `${files.length} screenshot${files.length > 1 ? 's' : ''} selected`;
                screenshotsPreview.appendChild(countMessage);
            }

            let allFilesValid = true;
            files.forEach((file) => {
                if (file.size > 52428800) { // 50MB
                    alert(`Screenshot "${file.name}" must be smaller than 50MB`);
                    allFilesValid = false;
                }
            });

            if (!allFilesValid) {
                screenshotsInput.value = '';
                screenshotsPreview.innerHTML = '';
                return;
            }

            files.forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const div = document.createElement('div');
                    div.className = 'relative';
                    div.innerHTML = `
                        <img src="${event.target.result}" alt="Screenshot ${index + 1}" class="preview-image w-full rounded border-2 border-gray-600">
                        <div class="absolute top-1 left-1 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">${index + 1}</div>
                    `;
                    screenshotsPreview.appendChild(div);
                };
                reader.readAsDataURL(file);
            });
        });
    }
}

// Handle download links
window.addDownloadLink = function() {
    const container = document.getElementById('downloadLinksContainer');
    const linkCount = container.children.length + 1;
    
    const linkDiv = document.createElement('div');
    linkDiv.className = 'download-link mb-4 bg-gray-700 p-4 rounded-lg';
    linkDiv.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <h3 class="font-bold">Download Link #${linkCount}</h3>
            <button type="button" class="text-red-400 hover:text-red-300" onclick="removeDownloadLink(this)">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-gray-300 mb-1 text-sm">Link Name</label>
                <input type="text" name="linkName[]" 
                       class="w-full bg-gray-600 border border-gray-500 rounded px-3 py-1">
            </div>
            
            <div>
                <label class="block text-gray-300 mb-1 text-sm">URL *</label>
                <input type="url" name="linkUrl[]" required 
                       class="w-full bg-gray-600 border border-gray-500 rounded px-3 py-1">
            </div>
        </div>
        
        <div class="mt-3">
            <label class="block text-gray-300 mb-1 text-sm">Notes (optional)</label>
            <textarea name="linkNotes[]" rows="2"
                      class="w-full bg-gray-600 border border-gray-500 rounded px-3 py-1"></textarea>
        </div>
    `;
    
    container.appendChild(linkDiv);
};

window.removeDownloadLink = function(button) {
    const container = document.getElementById('downloadLinksContainer');
    if (container.children.length > 1) {
        button.closest('.download-link').remove();
    }
};

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault();
    
    try {
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Submitting...';
        submitButton.disabled = true;

        if (!currentUser) {
            throw new Error('You must be logged in to submit a game');
        }

        // Upload cover image
        let coverImageUrl = null;
        const coverImageFile = document.getElementById('coverImage').files[0];
        if (coverImageFile) {
            console.log('📤 Uploading cover image...');
            const coverPath = generateFilePath(currentUser.id, 'covers', coverImageFile.name);
            coverImageUrl = await uploadFile(coverImageFile, coverPath);
            console.log('✅ Cover image uploaded:', coverImageUrl);
        }

        // Upload screenshots
        const screenshotUrls = [];
        const screenshotFiles = document.getElementById('screenshots').files;
        if (screenshotFiles.length > 0) {
            console.log(`📤 Uploading ${screenshotFiles.length} screenshots...`);
            
            for (let i = 0; i < screenshotFiles.length; i++) {
                const file = screenshotFiles[i];
                const screenshotPath = generateFilePath(currentUser.id, 'screenshots', file.name);
                const screenshotUrl = await uploadFile(file, screenshotPath);
                screenshotUrls.push(screenshotUrl);
                console.log(`✅ Screenshot ${i + 1}/${screenshotFiles.length} uploaded`);
            }
        }

        // Prepare game data
        const gameData = {
            title: document.getElementById('gameTitle').value,
            description: document.getElementById('gameDescription').value,
            genre: document.getElementById('gameGenre').value,
            developer: document.getElementById('gameDeveloper').value,
            publisher: document.getElementById('gamePublisher').value || null,
            release_date: document.getElementById('releaseDate').value,
            version: document.getElementById('gameVersion').value,
            cover_image_url: coverImageUrl,
            screenshot_urls: screenshotUrls,
            repack_size: parseFloat(document.getElementById('repackSize').value) || 0,
            repack_size_unit: document.getElementById('sizeUnit').value,
            original_size: parseFloat(document.getElementById('originalSize').value) || null,
            original_size_unit: document.getElementById('originalSizeUnit').value || null,
            compression_ratio: document.getElementById('compressionRatio').value || null,
            repack_features: document.getElementById('repackFeatures').value,
            installation_notes: document.getElementById('installationNotes').value || null,
            system_requirements: {
                minimum: {
                    os: document.getElementById('minOS').value || null,
                    processor: document.getElementById('minProcessor').value || null,
                    memory: document.getElementById('minMemory').value || null,
                    graphics: document.getElementById('minGraphics').value || null,
                    storage: document.getElementById('minStorage').value || null
                },
                recommended: {
                    os: document.getElementById('recOS').value || null,
                    processor: document.getElementById('recProcessor').value || null,
                    memory: document.getElementById('recMemory').value || null,
                    graphics: document.getElementById('recGraphics').value || null,
                    storage: document.getElementById('recStorage').value || null
                }
            },
            download_links: Array.from(document.querySelectorAll('.download-link')).map(link => ({
                name: link.querySelector('input[name="linkName[]"]').value || 'Download',
                url: link.querySelector('input[name="linkUrl[]"]').value,
                notes: link.querySelector('textarea[name="linkNotes[]"]').value || null
            })),
            user_id: currentUser.id,
            submitted_by: currentUser.email,
            created_at: new Date().toISOString()
        };

        console.log('📤 Submitting game data to Supabase...');

        // Insert directly into Supabase
        const { data, error } = await supabaseClient
            .from('games')
            .insert([gameData])
            .select();

        if (error) {
            console.error('❌ Supabase error:', error);
            throw new Error(`Database error: ${error.message}`);
        }

        console.log('✅ Game submitted successfully:', data);

        // Show success message
        alert('🎉 Game submitted successfully! Your submission is now pending review.');
        
        // Reset form
        document.getElementById('gameSubmissionForm').reset();
        document.getElementById('coverPreview').classList.add('hidden');
        document.getElementById('screenshotsPreview').innerHTML = '';

    } catch (error) {
        console.error('❌ Error submitting game:', error);
        alert('❌ Error submitting game: ' + error.message);
    } finally {
        // Reset button state
        const submitButton = document.querySelector('button[type="submit"]');
        submitButton.innerHTML = '<i class="fas fa-paper-plane mr-2"></i> Submit Game';
        submitButton.disabled = false;
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing game submission page...');
    
    // Debug: Make sure body is visible
    console.log('🔍 Body display style:', document.body.style.display);
    console.log('🔍 Body computed style:', window.getComputedStyle(document.body).display);
    
    // Force body to be visible
    document.body.style.display = 'block';
    document.body.style.visibility = 'visible';
    document.body.style.opacity = '1';
    
    console.log('🔍 After forcing visibility - Body display:', document.body.style.display);
    
    // Debug: Check if main elements exist
    const header = document.querySelector('header');
    const main = document.querySelector('main');
    const form = document.getElementById('gameSubmissionForm');
    
    console.log('🔍 Header element found:', !!header);
    console.log('🔍 Main element found:', !!main);
    console.log('🔍 Form element found:', !!form);
    
    if (header) {
        console.log('🔍 Header computed display:', window.getComputedStyle(header).display);
        console.log('🔍 Header computed visibility:', window.getComputedStyle(header).visibility);
    }
    
    if (main) {
        console.log('🔍 Main computed display:', window.getComputedStyle(main).display);
        console.log('🔍 Main computed visibility:', window.getComputedStyle(main).visibility);
    }
    
    // Initialize Supabase
    if (await initializeSupabase()) {
        // Check authentication
        if (await checkAuth()) {
            console.log('✅ User authenticated, setting up form...');
            
            // Check storage buckets
            await checkBuckets();
            
            // Setup form
            setupFileInputs();
            const form = document.getElementById('gameSubmissionForm');
            if (form) {
                form.addEventListener('submit', handleSubmit);
                console.log('✅ Form setup complete');
            } else {
                console.error('❌ Form not found');
            }
        }
    } else {
        console.error('❌ Failed to initialize Supabase');
        alert('❌ Failed to initialize application. Please refresh the page.');
    }
}); 