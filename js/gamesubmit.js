// Use global Supabase instance
const supabaseClient = window.supabase;

// Check authentication status
async function checkAuth() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) {
            console.error('Auth error:', error);
            throw error;
        }
        if (!session) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = 'login.html';
        return false;
    }
}

// Enhanced storage bucket checking with better error handling
async function checkBuckets() {
    try {
        console.log('🔍 Checking storage buckets...');
        
        const { data: buckets, error } = await supabaseClient.storage.listBuckets();
        if (error) {
            console.error('❌ Error listing buckets:', error);
            throw new Error(`Failed to access storage: ${error.message}`);
        }
        
        console.log('📦 Available buckets:', buckets.map(b => b.id));
        
        // Check for the main games-images bucket
        const requiredBucket = 'games-images';
        const existingBuckets = buckets.map(bucket => bucket.id);
        
        if (!existingBuckets.includes(requiredBucket)) {
            console.error(`❌ Missing storage bucket: ${requiredBucket}`);
            console.log('Available buckets:', existingBuckets);
            showStorageError();
            throw new Error(`Storage bucket '${requiredBucket}' not found. Please ensure your Supabase setup includes the required storage bucket.`);
        }
        
        console.log('✅ Required storage bucket is available:', requiredBucket);
        await testBucketPermissions(requiredBucket);
        return true;
    } catch (error) {
        console.error('🚨 Bucket check failed:', error);
        throw error;
    }
}

// Test bucket permissions
async function testBucketPermissions(bucketId) {
    try {
        console.log(`🔐 Testing permissions for bucket: ${bucketId}`);
        
        const { data, error } = await supabaseClient.storage
            .from(bucketId)
            .list('', { limit: 1 });
            
        if (error) {
            console.warn('⚠️ Bucket permission test failed:', error.message);
        } else {
            console.log('✅ Bucket permissions test passed');
        }
    } catch (error) {
        console.warn('⚠️ Could not test bucket permissions:', error.message);
    }
}

// Show storage error message to user
function showStorageError() {
    const existingError = document.querySelector('.storage-error-message');
    if (existingError) existingError.remove();
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'storage-error-message bg-red-600 border border-red-500 text-white px-4 py-3 rounded mb-4';
    errorDiv.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            <div>
                <strong>Storage Warning:</strong> Storage bucket 'games-images' not found. 
                Please ensure your Supabase setup includes the required storage bucket.
                <br>
                <small>File uploads may not work properly. Please contact the administrator.</small>
            </div>
        </div>
    `;
    
    const form = document.getElementById('gameSubmissionForm');
    form.insertBefore(errorDiv, form.firstChild);
}

// Remove storage error message
function removeStorageError() {
    const existingError = document.querySelector('.storage-error-message');
    if (existingError) existingError.remove();
}

// Generate unique file path for uploads
function generateFilePath(userId, type, originalName) {
    const timestamp = Date.now();
    const fileExt = originalName.split('.').pop().toLowerCase();
    const randomId = Math.random().toString(36).substring(2, 15);
    return `${type}/${userId}/${timestamp}_${randomId}.${fileExt}`;
}

// Upload file with retry logic
async function uploadFileWithRetry(file, filePath, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`📤 Uploading ${filePath} (attempt ${attempt}/${maxRetries})`);
            
            const { data, error } = await supabaseClient.storage
                .from('games-images')
                .upload(filePath, file);

            if (error) {
                if (error.message.includes('duplicate') || error.message.includes('already exists')) {
                    // File already exists, try with new timestamp
                    const newPath = generateFilePath(filePath.split('/')[1], filePath.split('/')[0], file.name);
                    console.log(`🔄 File exists, retrying with new path: ${newPath}`);
                    return await uploadFileWithRetry(file, newPath, maxRetries - attempt + 1);
                }
                throw error;
            }

            console.log(`✅ Upload successful: ${filePath}`);
            
            // Get public URL
            const { data: publicUrl } = supabaseClient.storage
                .from('games-images')
                .getPublicUrl(filePath);
            
            return publicUrl.publicUrl;
        } catch (error) {
            console.error(`❌ Upload attempt ${attempt} failed:`, error);
            if (attempt === maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Wait before retry
        }
    }
}

// Handle file input changes and preview
function setupFileInputs() {
    // Cover image preview
    const coverInput = document.getElementById('coverImage');
    const coverPreview = document.getElementById('coverPreview');
    
    coverInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (50MB limit)
            if (file.size > 52428800) {
                alert('Cover image must be smaller than 50MB');
                coverInput.value = '';
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = coverPreview.querySelector('img') || document.createElement('img');
                img.src = e.target.result;
                img.className = 'preview-image';
                if (!coverPreview.querySelector('img')) {
                    coverPreview.appendChild(img);
                }
                coverPreview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });

    // Screenshots preview
    const screenshotsInput = document.getElementById('screenshots');
    const screenshotsPreview = document.getElementById('screenshotsPreview');
    
    screenshotsInput.addEventListener('change', (e) => {
        screenshotsPreview.innerHTML = '';
        const files = Array.from(e.target.files);
        
        // Limit to 10 screenshots
        if (files.length > 10) {
            alert('Maximum 10 screenshots allowed');
            screenshotsInput.value = '';
            return;
        }
        
        // Validate each file
        for (let file of files) {
            if (file.size > 52428800) {
                alert(`Screenshot "${file.name}" must be smaller than 50MB`);
                screenshotsInput.value = '';
                return;
            }
        }
        
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'relative';
                div.innerHTML = `
                    <img src="${e.target.result}" alt="Screenshot Preview" class="preview-image w-full">
                `;
                screenshotsPreview.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    });
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
                <label for="linkName${linkCount}" class="block text-gray-300 mb-1 text-sm">Link Name</label>
                <input type="text" id="linkName${linkCount}" name="linkName[]" 
                       class="w-full bg-gray-600 border border-gray-500 rounded px-3 py-1 requirement-input">
            </div>
            
            <div>
                <label for="linkUrl${linkCount}" class="block text-gray-300 mb-1 text-sm">URL *</label>
                <input type="url" id="linkUrl${linkCount}" name="linkUrl[]" required 
                       class="w-full bg-gray-600 border border-gray-500 rounded px-3 py-1 requirement-input">
            </div>
        </div>
        
        <div class="mt-3">
            <label for="linkNotes${linkCount}" class="block text-gray-300 mb-1 text-sm">Notes (optional)</label>
            <textarea id="linkNotes${linkCount}" name="linkNotes[]" rows="2"
                      class="w-full bg-gray-600 border border-gray-500 rounded px-3 py-1 requirement-input"></textarea>
        </div>
    `;
    
    container.appendChild(linkDiv);
};

window.removeDownloadLink = function(button) {
    button.closest('.download-link').remove();
};

// Handle form submission with improved file uploads
async function handleSubmit(e) {
    e.preventDefault();
    
    try {
        // Show loading state
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Submitting...';
        submitButton.disabled = true;

        // Get the current user's session
        const { data: { session }, error: authError } = await supabaseClient.auth.getSession();
        if (authError || !session) {
            throw new Error('You must be logged in to submit a game');
        }
        const userId = session.user.id;

        // Remove any existing error messages
        removeStorageError();

        // Check if storage buckets exist before attempting uploads
        await checkBuckets();

        // Upload cover image with improved path structure
        let coverImageUrl = null;
        const coverImageFile = document.getElementById('coverImage').files[0];
        if (coverImageFile) {
            console.log('📤 Starting cover image upload...');
            const coverPath = generateFilePath(userId, 'covers', coverImageFile.name);
            coverImageUrl = await uploadFileWithRetry(coverImageFile, coverPath);
            console.log('✅ Cover image uploaded:', coverImageUrl);
        }

        // Upload screenshots with improved path structure
        const screenshotUrls = [];
        const screenshotFiles = document.getElementById('screenshots').files;
        if (screenshotFiles.length > 0) {
            console.log(`📤 Starting upload of ${screenshotFiles.length} screenshots...`);
            
            for (let i = 0; i < screenshotFiles.length; i++) {
                const file = screenshotFiles[i];
                const screenshotPath = generateFilePath(userId, 'screenshots', file.name);
                const screenshotUrl = await uploadFileWithRetry(file, screenshotPath);
                screenshotUrls.push(screenshotUrl);
                console.log(`✅ Screenshot ${i + 1}/${screenshotFiles.length} uploaded`);
            }
        }

        // Prepare the game data - NOW INCLUDING user_id (fixed in database)
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
            user_id: userId  // This will now work because we added the column
        };

        console.log('📤 Submitting game data:', gameData);

        // Submit to server
        const response = await fetch('/api/submit-game', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(gameData)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            console.error('Server error:', result);
            throw new Error(result.message || 'Failed to submit game');
        }

        console.log('✅ Game submitted successfully:', result.game);

        // Show success message
        alert('🎉 Game submitted successfully! Images have been uploaded to storage.');
        
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
    
    // Check authentication first
    if (await checkAuth()) {
        console.log('✅ User authenticated, setting up form...');
        
        try {
            await checkBuckets();
            console.log('✅ Storage buckets verified');
        } catch (error) {
            console.warn('⚠️ Storage bucket check failed:', error.message);
            showStorageError();
        }
        
        setupFileInputs();
        document.getElementById('gameSubmissionForm').addEventListener('submit', handleSubmit);
        console.log('✅ Form setup complete');
    }
}); 