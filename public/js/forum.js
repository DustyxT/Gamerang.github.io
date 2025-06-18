// Import Supabase configuration
import { supabase } from './supabase-config.js';

// Forum functionality
export class Forum {
    constructor() {
        console.log('Forum class constructor called');
        this.supabase = supabase; // Access to the imported supabase client
        this.threads = [];
        this.replies = [];
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 1;
        this.sortOption = 'newest';
        this.selectedCategory = ''; // Will be a string category name now
        this.threadsContainer = null;
        this.paginationContainer = null;
        this.selectedThreadImages = [];
        this.selectedEditImages = []; // For new files to upload
        this.imagesToRemove = []; // For existing image URLs to remove
        this.currentThread = null;
        this.isSubmittingNewThread = false;
        this.isSubmittingEditThread = false;
        // Removed this.categoryMap

        // Initialize container references - check if DOM is already loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeContainers();
            });
        } else {
            // DOM is already loaded, initialize immediately
            this.initializeContainers();
        }
    }

    initializeContainers() {
        console.log('[Forum.js] Initializing containers...');
        this.threadsContainer = document.querySelector('.threads-container');
        this.paginationContainer = document.querySelector('.pagination-container');
        
        if (this.threadsContainer) {
            console.log('[Forum.js] Threads container found successfully');
        } else {
            console.error('[Forum.js] Threads container not found!');
        }
        
        // Load threads after containers are initialized
        this.loadThreads();
    }

    setupEventListeners() {
        // Category filter
        const categorySelect = document.getElementById('categorySelect');
        if (categorySelect) {
            categorySelect.addEventListener('change', async (e) => {
                const selectedCategoryName = e.target.value || '';
                
                if (selectedCategoryName === '') {
                    this.selectedCategory = '';
                } else {
                    // Look up category UUID by name for filtering
                    const { data: categoryData, error } = await this.supabase
                        .from('forum_categories')
                        .select('id')
                        .eq('name', selectedCategoryName)
                        .single();
                    
                    if (categoryData && !error) {
                        this.selectedCategory = categoryData.id;
                    } else {
                        console.error('Error finding category for filtering:', error);
                        this.selectedCategory = '';
                    }
                }
                
                this.currentPage = 1;
                this.loadThreads();
            });
        }

        // Sort select
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortOption = e.target.value;
                this.currentPage = 1;
                this.loadThreads();
            });
        }

        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.trim();
                this.currentPage = 1;
                this.loadThreads();
            });
        }

        // Pagination
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('page-link')) {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                if (page && page !== this.currentPage) {
                    this.currentPage = page;
                    this.loadThreads();
                }
            }
        });

        // New thread form
        const newThreadForm = document.getElementById('newThreadForm');
        if (newThreadForm) {
            newThreadForm.addEventListener('submit', this.handleNewThread.bind(this));
        }

        // Edit thread form submission
        const editThreadForm = document.getElementById('editThreadForm');
        if (editThreadForm) {
            editThreadForm.addEventListener('submit', this.submitEditThread.bind(this));
        }

        // Modal open buttons for New Thread
        const newThreadModal = document.getElementById('newThreadModal');
        const newThreadBtn = document.getElementById('newThreadBtn');
        const mobileNewThreadBtn = document.getElementById('mobileNewThreadBtn');
        const newThreadBtnSidebar = document.getElementById('newThreadBtnSidebar');

        const openNewThreadModal = (e) => {
            e.preventDefault();
            if (window.auth && window.auth.currentUser) { // Check if user is logged in via Auth class state
                newThreadModal.classList.remove('hidden');
            } else {
                this.showError('Please sign in to create a new thread.');
                 // Optionally, open the sign-in modal
                 document.getElementById('signInModal').classList.remove('hidden');
            }
        };

        if (newThreadBtn) newThreadBtn.addEventListener('click', openNewThreadModal);
        if (mobileNewThreadBtn) mobileNewThreadBtn.addEventListener('click', openNewThreadModal);
        if (newThreadBtnSidebar) newThreadBtnSidebar.addEventListener('click', openNewThreadModal);

        // Image Dropzone & File Input for New Thread Modal
        const threadImageDropzone = document.getElementById('threadImageDropzone');
        const threadImagesInput = document.getElementById('threadImages');
        const imagePreviewContainer = document.getElementById('imagePreview');

        if (threadImageDropzone && threadImagesInput && imagePreviewContainer) {
            threadImageDropzone.addEventListener('click', (e) => {
                // Only act if the click didn't originate directly on the file input itself.
                // This allows the native file input to work when it's visible and clicked directly.
                if (e.target !== threadImagesInput) {
                    e.stopPropagation(); 
                    e.preventDefault();  
                    threadImagesInput.click(); // Programmatically click the (usually hidden) input
                }
                // If e.target IS threadImagesInput, we do nothing here, allowing its default action.
            });

            threadImageDropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                threadImageDropzone.classList.add('drag-over');
            });

            threadImageDropzone.addEventListener('dragleave', () => {
                threadImageDropzone.classList.remove('drag-over');
            });

            threadImageDropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                threadImageDropzone.classList.remove('drag-over');
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    this.handleFileSelect(Array.from(e.dataTransfer.files));
                }
            });

            threadImagesInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    this.handleFileSelect(Array.from(e.target.files));
                    e.target.value = ''; // Reset file input to allow re-selecting the same file(s)
                }
            });
        }

        // Image Dropzone & File Input for EDIT Thread Modal
        const editThreadImageDropzone = document.getElementById('editThreadImageDropzone');
        const editThreadNewImagesInput = document.getElementById('editThreadNewImages');

        if (editThreadImageDropzone && editThreadNewImagesInput) {
            editThreadImageDropzone.addEventListener('click', () => editThreadNewImagesInput.click());
            
            editThreadImageDropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                editThreadImageDropzone.classList.add('drag-over');
            });
            editThreadImageDropzone.addEventListener('dragleave', () => {
                editThreadImageDropzone.classList.remove('drag-over');
            });
            editThreadImageDropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                editThreadImageDropzone.classList.remove('drag-over');
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    this.handleFileSelectForEdit(Array.from(e.dataTransfer.files));
                }
            });
            editThreadNewImagesInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    this.handleFileSelectForEdit(Array.from(e.target.files));
                    e.target.value = ''; // Reset file input
                }
            });
        }

        // Comment form
        const commentForm = document.getElementById('commentForm');
        if (commentForm) {
            commentForm.addEventListener('submit', this.handleNewComment.bind(this));
        }
    }

    async loadCategories() {
        // Load categories from database and populate the select elements
        console.log('[Forum.js] Loading categories from database...');
        try {
            if (!this.supabase) {
                console.error('Supabase client not initialized');
                return;
            }
            
            const { data: categories, error } = await this.supabase
                .from('forum_categories')
                .select('*')
                .order('order_index');

            if (error) {
                console.error('Error loading categories:', error);
                this.showError('Failed to load forum categories. Some features may be unavailable.');
                return;
            }

            console.log('[Forum.js] Loaded categories:', categories);
            
            // Populate category selects
            const formCategorySelects = [
                document.getElementById('threadCategory'), 
                document.getElementById('editThreadCategory')
            ];
            
            formCategorySelects.forEach(select => {
                if (select) {
                    select.innerHTML = '<option value="">Select a category</option>';
                    categories.forEach(cat => {
                        const option = document.createElement('option');
                        option.value = cat.name; // Use name for form value
                        option.textContent = cat.name;
                        select.appendChild(option);
                    });
                }
            });
            
            const filterCategorySelect = document.getElementById('categorySelect');
            if(filterCategorySelect){
                filterCategorySelect.innerHTML = '<option value="">All Categories</option>';
                categories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.name; // Use name for filtering
                    option.textContent = cat.name;
                    filterCategorySelect.appendChild(option);
                });
            }
                } catch (error) {
            console.error('Exception in loadCategories:', error);
        }
    }

    async loadThreads() {
        try {
            if (!this.supabase) {
                console.error('Supabase client not initialized');
                return;
            }

            if (!this.threadsContainer) {
                console.error('Threads container not found');
                return;
            }

            // Call the updated get_thread_list function with all parameters
            const params = {
                page_number: this.currentPage,
                page_size: this.pageSize,
                p_sort_option: this.sortOption,
                p_category_id_filter: this.selectedCategory === '' ? null : this.selectedCategory
            };
            
            // Detailed Log
            console.log('--- loadThreads ---');
            console.log('Current this.selectedCategory:', this.selectedCategory);
            console.log('Type of this.selectedCategory:', typeof this.selectedCategory);
            console.log('Calculated p_category_id_filter for RPC:', params.p_category_id_filter);
            console.log('Type of p_category_id_filter for RPC:', typeof params.p_category_id_filter);
            console.log('Full params for get_thread_list:', params);
            // End Detailed Log

            const { data, error } = await this.supabase.rpc('get_thread_list', params);

            if (error) {
                console.error('Threads error:', error);
                console.error('Error details:', error.message, error.details, error.hint);
                
                // Fallback: try to load threads directly from table if RPC fails
                console.log('Attempting fallback direct query...');
                const { data: fallbackData, error: fallbackError } = await this.supabase
                    .from('threads')
                    .select(`
                        *,
                        forum_categories(name)
                    `)
                    .order('created_at', { ascending: false })
                    .limit(this.pageSize);
                
                if (fallbackError) {
                    throw new Error(`RPC failed: ${error.message}. Fallback also failed: ${fallbackError.message}`);
                }
                
                // Transform fallback data to match expected format
                this.threads = fallbackData || [];
                this.totalPages = 1;
                console.log('Using fallback data:', this.threads);
            } else {
                if (!data || !Array.isArray(data)) {
                    throw new Error('Invalid response from get_thread_list');
                }
                
                // Extract threads and total pages from the response
                this.threads = data;
                this.totalPages = data.length > 0 ? data[0].total_pages : 1;
            }

            // Removed: Logic to add category_name using this.categoryMap
            // Now, renderThreads will rely on thread.category (which is the UUID)
            // or thread.category_name if the RPC get_thread_list happens to return it (currently it does not).

            this.renderThreads();
            this.renderPagination();
        } catch (error) {
            console.error('Error loading threads:', error);
            this.threadsContainer.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-red-500 mb-4">Failed to load threads. Please try again.</p>
                    <button onclick="location.reload()" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                        Retry
                    </button>
                    <p class="text-sm text-gray-500 mt-2">Error: ${error.message}</p>
                </div>
            `;
        }
    }

    renderThreads() {
        if (!this.threadsContainer) return;

        if (!this.threads || this.threads.length === 0) {
            this.threadsContainer.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-slate-400 mb-4">No threads found matching your criteria.</p>
                    <button 
                        onclick="document.getElementById('newThreadModal').classList.remove('hidden')"
                        class="btn-primary">
                        <i class="fas fa-plus mr-2"></i>Create New Thread
                    </button>
                </div>
            `;
            return;
        }

        this.threadsContainer.innerHTML = this.threads.map(thread => {
            const title = thread.title ? thread.title.replace(/</g, "&lt;").replace(/>/g, "&gt;") : 'No Title';
            const author = thread.author_username ? thread.author_username.replace(/</g, "&lt;").replace(/>/g, "&gt;") : 'Unknown Author';
            const date = thread.created_at ? new Date(thread.created_at).toLocaleDateString() : 'N/A';
            const comments = thread.comment_count !== undefined ? thread.comment_count : 0;
            const views = thread.view_count !== undefined ? thread.view_count : 0;
            // Use category_name for display, handling both direct and nested formats
            let categoryToDisplay = 'Uncategorized';
            if (thread.category_name) {
                categoryToDisplay = thread.category_name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            } else if (thread.forum_categories && thread.forum_categories.name) {
                categoryToDisplay = thread.forum_categories.name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            } else if (thread.category) {
                categoryToDisplay = thread.category.substring(0,8) + '...';
            }
            
            let contentPreview = thread.content ? thread.content.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
            if (contentPreview.length > 150) {
                contentPreview = contentPreview.substring(0, 150) + '...';
            }

            const tagsHtml = Array.isArray(thread.tags) && thread.tags.length > 0 
                ? thread.tags.map(tag => `<span class="trending-tag">${tag.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>`).join(' ') 
                : '<span class="text-sm text-slate-500">No tags</span>';

            // Display all images in a scrollable row or a simple grid
            let imagesHtml = '';
            if (Array.isArray(thread.images) && thread.images.length > 0) {
                imagesHtml = '<div class="flex overflow-x-auto gap-2 py-2 mb-2">';
                thread.images.forEach(imgUrl => {
                    // Add cache-busting parameter to ensure fresh images are loaded
                    const cacheBustedUrl = imgUrl + (imgUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
                    imagesHtml += `
                        <img src="${cacheBustedUrl}" 
                             class="h-24 w-auto rounded-md object-contain cursor-pointer thread-image-thumb"
                             alt="Thread image" 
                             onerror="this.onerror=null; this.src='https://via.placeholder.com/100x100/161629/00c3ff?text=Error'" 
                             onclick="window.forum.openImageLightbox('${imgUrl}')">
                    `;
                });
                imagesHtml += '</div>';
            } else {
                // Optional: keep a placeholder if you want, or leave empty
                // imagesHtml = '<div class="text-sm text-[#a0a0d0] mb-2">No images uploaded.</div>';
            }
            
            const authorInitials = author.substring(0, 2).toUpperCase();
            const pinnedIcon = thread.is_pinned ? '<span class="text-neon-blue text-xs" title="Pinned"><i class="fas fa-thumbtack mr-1"></i>PINNED</span>' : '';
            const lockedIcon = thread.is_locked ? '<span class="text-red-500 text-xs ml-2" title="Locked"><i class="fas fa-lock mr-1"></i>LOCKED</span>' : '';

            // Edit and Delete buttons directly on the card if user is owner
            let ownerControlsHtml = '';
            if (window.auth && window.auth.currentUser && window.auth.currentUser.id === thread.user_id) {
                ownerControlsHtml = `
                    <button class="edit-thread-list-btn text-xs btn-primary py-1 px-2 mr-1" data-thread-id="${thread.id}"><i class="fas fa-edit mr-1"></i>Edit</button>
                    <button class="delete-thread-list-btn text-xs btn-secondary py-1 px-2" data-thread-id="${thread.id}"><i class="fas fa-trash mr-1"></i>Delete</button>
                `;
            }

            return `
            <div class="forum-card mb-6" data-thread-id="${thread.id}">
                <div class="p-5 md:p-6">
                    <div class="flex justify-between items-start mb-1">
                        <h3 class="text-xl font-bold oxanium text-white hover:text-indigo-400 transition cursor-pointer thread-title-link" data-thread-id="${thread.id}">${title}</h3>
                        <span class="category-tag">${categoryToDisplay}</span>
                    </div>
                    <div class="flex items-center text-xs text-slate-400 mb-3">
                        <div class="user-avatar text-sm mr-2"><span>${authorInitials}</span></div>
                        <span class="text-white font-medium">${author}</span>
                        <span class="mx-1.5">•</span>
                        <span>${date}</span>
                        ${pinnedIcon}
                        ${lockedIcon}
                    </div>
                    <p class="text-sm text-slate-300 mb-3 forum-content-display">${contentPreview}</p>
                    ${imagesHtml} 
                    <div class="flex flex-wrap gap-1.5 mb-3">
                        ${tagsHtml}
                    </div>
                    <div class="flex justify-between items-center text-xs">
                        <div class="flex space-x-3 text-slate-400">
                            <span><i class="fas fa-comment mr-1 text-indigo-400"></i> ${comments}</span>
                            <span><i class="fas fa-eye mr-1 text-pink-500"></i> ${views}</span>
                        </div>
                        <div class="flex items-center">
                           ${ownerControlsHtml} <!-- Owner controls added here -->
                           <button class="btn-primary ml-2 join-discussion-btn" data-thread-id="${thread.id}"><i class="fas fa-comment-alt mr-1"></i> Join Discussion</button>
                        </div>
                    </div>
                </div>
            </div>
        `;}).join('');

        // Re-add event listeners 
        this.threadsContainer.querySelectorAll('.thread-title-link, .join-discussion-btn').forEach(element => {
            element.addEventListener('click', (e) => {
                e.preventDefault();
                const threadId = e.currentTarget.dataset.threadId;
                this.viewThread(threadId);
            });
        });

        this.threadsContainer.querySelectorAll('.edit-thread-list-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation(); // Prevent triggering viewThread if buttons are inside clickable area
                const threadId = e.currentTarget.dataset.threadId;
                // Fetch thread data before opening edit modal, as this.currentThread might not be set
                const { data: threadToEdit, error } = await this.supabase.from('threads').select('*').eq('id', threadId).single();
                if (error || !threadToEdit) {
                    this.showError('Could not fetch thread details to edit.'); return;
                }
                this.currentThread = threadToEdit; // Set currentThread for handleEditThread
                this.handleEditThread(); // This method already populates and shows the modal
            });
        });

        this.threadsContainer.querySelectorAll('.delete-thread-list-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                const threadId = e.currentTarget.dataset.threadId;
                // Fetch thread data to confirm user_id if needed, though RLS is primary check
                // Or just set this.currentThread.id for handleDeleteThread if it only needs ID
                this.currentThread = { id: threadId }; // Set just enough for handleDeleteThread
                this.handleDeleteThread(); // This method handles confirmation and deletion
            });
        });
        
        // Event listener for image lightbox (if not already globally handled)
        this.threadsContainer.querySelectorAll('.thread-image-thumb').forEach(img => {
            img.addEventListener('click', (e) => {
                 e.stopPropagation(); // Prevent card click if image is clicked
                 this.openImageLightbox(e.currentTarget.src);
            });
        });
    }

    renderPagination() {
        const container = document.getElementById('pagination');
        if (!container) return;

        if (this.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '<div class="flex justify-center space-x-2">';

        // Previous button
        paginationHTML += `
            <a href="#" class="page-link px-3 py-1 rounded ${this.currentPage === 1 ? 'bg-gray-700 cursor-not-allowed' : 'bg-gray-800 hover:bg-gray-700'}"
               data-page="${this.currentPage - 1}" ${this.currentPage === 1 ? 'disabled' : ''}>
                Previous
            </a>
        `;

        // Page numbers
        for (let i = 1; i <= this.totalPages; i++) {
            if (
                i === 1 || 
                i === this.totalPages || 
                (i >= this.currentPage - 2 && i <= this.currentPage + 2)
            ) {
                paginationHTML += `
                    <a href="#" class="page-link px-3 py-1 rounded ${i === this.currentPage ? 'bg-neon-blue text-white' : 'bg-gray-800 hover:bg-gray-700'}"
                       data-page="${i}">
                        ${i}
                    </a>
                `;
            } else if (
                i === this.currentPage - 3 || 
                i === this.currentPage + 3
            ) {
                paginationHTML += '<span class="px-2">...</span>';
            }
        }

        // Next button
        paginationHTML += `
            <a href="#" class="page-link px-3 py-1 rounded ${this.currentPage === this.totalPages ? 'bg-gray-700 cursor-not-allowed' : 'bg-gray-800 hover:bg-gray-700'}"
               data-page="${this.currentPage + 1}" ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                Next
            </a>
        `;

        paginationHTML += '</div>';
        container.innerHTML = paginationHTML;
    }

    async handleNewThread(e) {
        e.preventDefault();

        if (this.isSubmittingNewThread) {
            console.warn('New thread submission already in progress. Please wait.');
            this.showError('Submission in progress, please wait...', 'formError');
            return; 
        }
        this.isSubmittingNewThread = true;

        console.log('[Forum.js] handleNewThread called.');
        console.log('[Forum.js] Current this.selectedThreadImages at start of handleNewThread:', [...this.selectedThreadImages].map(f => f.name));
        
        if (!window.auth || !window.auth.currentUser) {
            this.showError('Please sign in to create a thread.');
            document.getElementById('signInModal').classList.remove('hidden');
            return;
        }
        const userId = window.auth.currentUser.id;

        const newThreadForm = e.target;
        const formData = new FormData(newThreadForm);
        const title = formData.get('title').trim();
        const content = formData.get('content').trim();
        const category = formData.get('category'); // Assuming this is the category name (TEXT)
        const tagsInput = formData.get('tags').trim();

        const formErrorP = document.getElementById('formError');
        formErrorP.classList.add('hidden');

        if (!title || !content || !category) {
            this.showError('Title, content, and category are required.', 'formError');
            return;
        }

        const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
        const uploadedImageUrls = [];

        // Disable submit button to prevent multiple submissions
        const submitButton = newThreadForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Creating...';

        try {
            // 1. Look up category ID from category name
            console.log(`[Forum.js] Looking up category ID for: ${category}`);
            const { data: categoryData, error: categoryError } = await this.supabase
                .from('forum_categories')
                .select('id')
                .eq('name', category)
                .single();

            if (categoryError || !categoryData) {
                console.error('[Forum.js] Category lookup error:', categoryError);
                this.showError('Invalid category selected. Please refresh the page and try again.', 'formError');
                submitButton.disabled = false;
                submitButton.textContent = 'Create Thread';
                return;
            }

            const categoryId = categoryData.id;
            console.log(`[Forum.js] Found category ID: ${categoryId} for category: ${category}`);

            // 2. Upload Images to Supabase Storage if any are selected
            console.log(`[Forum.js] Checking for images to upload. Count: ${this.selectedThreadImages.length}`);
            if (this.selectedThreadImages.length > 0) {
                for (const file of this.selectedThreadImages) {
                    console.log('[Forum.js] Preparing to upload image:', file.name);
                    let processedFile = file;
                    // Optional: Compress image before uploading
                    if (typeof imageCompression === 'function') {
                        try {
                            const options = {
                                maxSizeMB: 1,          // Max file size in MB
                                maxWidthOrHeight: 1920, // Max width or height
                                useWebWorker: true,
                            };
                            processedFile = await imageCompression(file, options);
                            console.log('Compressed image successfully', processedFile.name, processedFile.size);
                        } catch (compressionError) {
                            console.error('Error compressing image:', compressionError);
                        }
                    }

                    // Sanitize filename more thoroughly
                    const originalName = processedFile.name;
                    const extension = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')) : '';
                    const baseName = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
                    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/\s+/g, '_');

                    const filePath = `${userId}/${Date.now()}-${sanitizedBaseName}${extension}`;

                    console.log(`[Forum.js] Attempting to upload to path: ${filePath}`); // Log the exact path

                    const { data: uploadData, error: uploadError } = await this.supabase.storage
                        .from('thread-images') // Your bucket name
                        .upload(filePath, processedFile);

                    if (uploadError) {
                        console.error('[Forum.js] Supabase upload error for image:', file.name, uploadError);
                        this.showError(`Failed to upload image ${processedFile.name}: ${uploadError.message}`, 'formError');
                        // Re-enable submit button and return if an upload fails
                        submitButton.disabled = false;
                        submitButton.textContent = 'Create Thread';
                        return; 
                    }

                    // Get public URL (ensure RLS allows public reads or use signed URLs if private)
                    const { data: publicUrlData } = this.supabase.storage
                        .from('thread-images')
                        .getPublicUrl(filePath);
                    
                    if (publicUrlData && publicUrlData.publicUrl) {
                        uploadedImageUrls.push(publicUrlData.publicUrl);
                        console.log('[Forum.js] Got public URL for image:', file.name, publicUrlData.publicUrl);
                    } else {
                         console.warn('[Forum.js] Could not get public URL for uploaded image:', filePath, 'Data:', publicUrlData);
                    }
                }
            }

            // 3. Insert Thread data (including image URLs) into the database
            const threadData = {
                user_id: userId,
                author_username: window.auth.currentUser.user_metadata?.username || window.auth.currentUser.email.split('@')[0],
                title,
                content,
                category: categoryId, // Use the category UUID instead of name
                tags,
                images: uploadedImageUrls, // Add the array of image URLs
                // comment_count, view_count will default to 0 in DB or be updated by triggers/RPCs
            };

            console.log('[Forum.js] Thread data to be inserted:', threadData);
            const { data: newThread, error: insertError } = await this.supabase
                .from('threads')
                .insert(threadData)
                .select()
                .single();

            if (insertError) {
                console.error('Error inserting thread:', insertError);
                this.showError(insertError.message || 'Failed to create thread.', 'formError');
                submitButton.disabled = false;
                submitButton.textContent = 'Create Thread';
                return;
            }

            this.showSuccess('Thread created successfully!');
            document.getElementById('newThreadModal').classList.add('hidden');
            newThreadForm.reset();
            
            // Clear selected images and previews
            console.log('[Forum.js] Clearing selected images and previews.');
            this.selectedThreadImages = [];
            const imagePreviewContainer = document.getElementById('imagePreview');
            if(imagePreviewContainer) imagePreviewContainer.innerHTML = '';
            const threadImagesInput = document.getElementById('threadImages');
            if(threadImagesInput) threadImagesInput.value = ''; // Reset file input

            // Optimistic UI Update
            if (newThread) {
                // Ensure default values for counts if not returned by insert (they should be if columns have defaults)
                const threadToPrepend = {
                    ...newThread,
                    comment_count: newThread.comment_count || 0,
                    view_count: newThread.view_count || 0,
                    // Ensure other fields expected by renderThreads are present or have defaults
                    author_username: newThread.author_username || (window.auth?.currentUser?.user_metadata?.username || window.auth?.currentUser?.email?.split('@')[0] || 'User'),
                    category: newThread.category || category // category from form data (this is a string name)
                    // Removed: category_name mapping via this.categoryMap
                };

                if (this.threads && Array.isArray(this.threads)) {
                    this.threads.unshift(threadToPrepend); // Add to the beginning
                    this.renderThreads(); // Re-render immediately
                }
            }

            this.loadThreads(); // Refresh the thread list to ensure full sync and pagination

        } catch (error) {
            console.error('Error in handleNewThread:', error);
            this.showError(error.message || 'An unexpected error occurred.', 'formError');
        } finally {
            this.isSubmittingNewThread = false; // Reset flag
            submitButton.disabled = false;
            submitButton.textContent = 'Create Thread';
            console.log('[Forum.js] handleNewThread finished.');
        }
    }

    async handleNewComment(e) {
        e.preventDefault();
        
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) {
                this.showError('Please sign in to comment');
                return;
            }

            const formData = new FormData(e.target);
            const content = formData.get('content').trim();
            const postId = formData.get('postId');
            const parentCommentId = formData.get('parentCommentId') || null;

            if (!content || !postId) {
                this.showError('Please enter a comment');
                return;
            }

            const { error } = await this.supabase
                .from('forum_comments')
                .insert({
                    content,
                    post_id: postId,
                    parent_comment_id: parentCommentId,
                    user_id: user.id
                });

            if (error) throw error;

            this.showSuccess('Comment added successfully!');
            e.target.reset();
            this.loadComments(postId);
        } catch (error) {
            console.error('Error adding comment:', error);
            this.showError('Failed to add comment. Please try again.');
        }
    }

    async loadComments(postId) {
        try {
            const { data, error } = await this.supabase.rpc('get_comment_tree', {
                post_id: postId
            });

            if (error) throw error;

            this.renderComments(data);
        } catch (error) {
            console.error('Error loading comments:', error);
            this.showError('Failed to load comments. Please try again.');
        }
    }

    renderComments(comments) {
        const container = document.querySelector('.comments-container');
        if (!container) return;

        if (!comments || comments.length === 0) {
            container.innerHTML = '<div class="text-center py-4 text-gray-400">No comments yet.</div>';
            return;
        }

        container.innerHTML = comments.map(comment => `
            <div class="comment bg-gray-800/50 rounded-lg p-4 mb-4" 
                 style="margin-left: ${comment.depth * 2}rem">
                <div class="flex items-start">
                    <img src="${comment.author.avatar_url || 'https://via.placeholder.com/32'}" 
                         alt="${comment.author.username}" 
                         class="w-8 h-8 rounded-full mr-3">
                    <div class="flex-1">
                        <div class="flex items-center mb-2">
                            <span class="font-semibold mr-2">${comment.author.username}</span>
                            <span class="text-sm text-gray-400">
                                ${new Date(comment.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        <div class="text-gray-300 mb-2">${comment.content}</div>
                        <div class="flex items-center space-x-4 text-sm">
                            <button class="reply-btn text-neon-blue hover:text-neon-purple transition"
                                    data-comment-id="${comment.id}">
                                <i class="far fa-reply mr-1"></i> Reply
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Add reply button event listeners
        container.querySelectorAll('.reply-btn').forEach(button => {
            button.addEventListener('click', () => {
                const commentId = button.dataset.commentId;
                const replyForm = document.getElementById('replyForm');
                if (replyForm) {
                    replyForm.querySelector('input[name="parentCommentId"]').value = commentId;
                    replyForm.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    showError(message, errorElementId = null) { 
        console.error('Forum Error:', message);
        if (errorElementId) {
            const el = document.getElementById(errorElementId);
            if (el) {
                el.textContent = message;
                el.classList.remove('hidden');
                return;
            }
        }
        // Fallback to toast if no specific element ID
        const toastId = 'forum-error-toast';
        document.getElementById(toastId)?.remove();
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-xl z-[2000] text-sm';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }

    showSuccess(message) {
        console.log('Forum Success:', message);
        const toastId = 'forum-success-toast';
        document.getElementById(toastId)?.remove();
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl z-[2000] text-sm';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const context = this;
            const later = () => {
                timeout = null;
                func.apply(context, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Method to switch views between main forum and thread detail
    switchView(viewName) {
        const mainForumViewElements = document.querySelectorAll('.main-forum-view');
        const threadDetailViewContainer = document.getElementById('threadDetailViewContainer');

        if (viewName === 'detail') {
            mainForumViewElements.forEach(el => el.classList.add('hidden'));
            threadDetailViewContainer.classList.remove('hidden');
        } else { // 'main' or default
            mainForumViewElements.forEach(el => el.classList.remove('hidden'));
            threadDetailViewContainer.classList.add('hidden');
        }
    }

    async viewThread(threadId) {
        if (!threadId) {
            console.error('No thread ID provided for viewThread');
            return;
        }
        console.log(`[Forum.js] Viewing thread: ${threadId}`);
        try {
            const { data: thread, error } = await this.supabase
                .from('threads')
                .select('*') // Select all columns for now, adjust as needed
                .eq('id', threadId)
                .single();

            if (error) {
                console.error('Error fetching thread details:', error);
                this.showError('Failed to load thread details.');
                return;
            }

            if (thread) {
                console.log('[Forum.js] Fresh thread data fetched:', thread);
                console.log('[Forum.js] Thread images from database:', thread.images);
                this.currentThread = thread; // Store the fetched thread
                this.renderThreadDetail();
                this.loadReplies(threadId); // Now load replies for this thread
                this.switchView('detail'); // Switch to detail view
            } else {
                this.showError('Thread not found.');
            }
        } catch (err) {
            console.error('Exception in viewThread:', err);
            this.showError('An unexpected error occurred while loading the thread.');
        }
    }

    renderThreadDetail() {
        const container = document.getElementById('threadDetailViewContainer');
        if (!container || !this.currentThread) {
            console.error('Thread detail container or currentThread not found/set.');
            return;
        }

        const thread = this.currentThread;
        const title = thread.title ? thread.title.replace(/</g, "&lt;").replace(/>/g, "&gt;") : 'No Title';
        const content = thread.content ? thread.content.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>") : 'No content.'; 
        const author = thread.author_username ? thread.author_username.replace(/</g, "&lt;").replace(/>/g, "&gt;") : 'Unknown Author';
        const date = thread.created_at ? new Date(thread.created_at).toLocaleString() : 'N/A';
        
        let editDeleteButtons = '';
        if (window.auth && window.auth.currentUser && window.auth.currentUser.id === thread.user_id) {
            editDeleteButtons = `
                <div class="mt-4">
                    <button id="editThreadDetailBtn" class="btn-neon mr-2">Edit Thread</button>
                    <button id="deleteThreadDetailBtn" class="btn-neon bg-red-500 hover:bg-red-600">Delete Thread</button>
                </div>
            `;
        }

        // Display all images for the thread
        let imagesDetailHtml = '';
        console.log('[Forum.js] renderThreadDetail - Processing images:', thread.images);
        if (Array.isArray(thread.images) && thread.images.length > 0) {
            console.log('[Forum.js] renderThreadDetail - Images found, count:', thread.images.length);
            imagesDetailHtml = '<div class="my-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">'; // Using a responsive grid
            thread.images.forEach((imgUrl, index) => {
                console.log(`[Forum.js] renderThreadDetail - Processing image ${index + 1}:`, imgUrl);
                // Add cache-busting parameter to ensure fresh images are loaded
                const cacheBustedUrl = imgUrl + (imgUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
                imagesDetailHtml += `
                    <div>
                        <img src="${cacheBustedUrl}" 
                             class="w-full h-auto rounded-lg object-cover cursor-pointer shadow-lg hover:shadow-neon-blue transition-shadow duration-300 detail-thread-image"
                             alt="Thread image" 
                             onerror="this.onerror=null; this.src='https://via.placeholder.com/150/161629/00c3ff?text=Error'" 
                             onclick="window.forum.openImageLightbox('${imgUrl}')">
                    </div>
                `;
            });
            imagesDetailHtml += '</div>';
            console.log('[Forum.js] renderThreadDetail - Images HTML generated:', imagesDetailHtml.length, 'characters');
        } else {
            console.log('[Forum.js] renderThreadDetail - No images to display');
        }

        // Reply Form HTML
        const replyFormHtml = window.auth && window.auth.currentUser ? `
            <form id="newReplyForm" class="mt-6">
                <h4 class="text-lg font-semibold orbitron mb-3">Post a Reply</h4>
                <textarea name="replyContent" class="form-input h-24" placeholder="Write your reply here..." required></textarea>
                <input type="hidden" name="threadId" value="${thread.id}">
                <button type="submit" class="btn-neon mt-3">Submit Reply</button>
            </form>
        ` : '<p class="mt-6 text-[#a0a0d0]">Please <button onclick="document.getElementById(\'signInModal\').classList.remove(\'hidden\')" class="text-[#00c3ff] hover:underline">sign in</button> to reply.</p>';

        container.innerHTML = `
            <div class="neon-card p-6">
                <button id="backToForumBtn" class="btn-neon mb-4"><i class="fas fa-arrow-left mr-2"></i> Back to Forum</button>
                <h1 class="text-3xl font-bold orbitron mb-2 neon-text">${title}</h1>
                <div class="text-sm text-[#a0a0d0] mb-4">
                    Posted by <span class="font-semibold text-white">${author}</span> on ${date}
                </div>
                <div class="prose prose-invert max-w-none forum-content-display mb-4">
                    ${content}
                </div>
                ${imagesDetailHtml}
                ${editDeleteButtons}
                <div id="repliesContainer" class="mt-8 pt-6 border-t border-[#1a1a2e]">
                    <h3 class="text-2xl font-bold orbitron mb-4">Replies</h3>
                    {/* Replies will be rendered here by renderReplies() */}
                </div>
                ${replyFormHtml}
            </div>
        `;

        document.getElementById('backToForumBtn').addEventListener('click', () => {
            this.switchView('main');
            this.currentThread = null; // Clear current thread when going back
        });

        if (editDeleteButtons) {
            const editBtn = document.getElementById('editThreadDetailBtn');
            const deleteBtn = document.getElementById('deleteThreadDetailBtn');
            if (editBtn) editBtn.addEventListener('click', () => this.handleEditThread());
            if (deleteBtn) deleteBtn.addEventListener('click', () => this.handleDeleteThread());
        }
        
        container.querySelectorAll('.detail-thread-image').forEach(img => {
            img.addEventListener('click', (e) => {
                 this.openImageLightbox(e.currentTarget.src);
            });
        });

        // Add event listener for the new reply form
        const newReplyForm = document.getElementById('newReplyForm');
        if (newReplyForm) {
            newReplyForm.addEventListener('submit', this.handleNewReply.bind(this));
        }
    }

    async handleEditThread() {
        if (!this.currentThread) {
            this.showError("No thread selected for editing.");
            return;
        }

        // Clear previous edit state
        this.selectedEditImages = [];
        this.imagesToRemove = [];

        const editModal = document.getElementById('editThreadModal');
        const editForm = document.getElementById('editThreadForm');
        
        // Pre-populate form with current thread data
        editForm.title.value = this.currentThread.title || '';
        
        // For category, we need to find the category name from the UUID
        let categoryName = '';
        if (this.currentThread.category) {
            try {
                const { data: categoryData, error: categoryError } = await this.supabase
                    .from('forum_categories')
                    .select('name')
                    .eq('id', this.currentThread.category)
                    .single();
                
                if (categoryData && !categoryError) {
                    categoryName = categoryData.name;
                } else {
                    console.warn('Could not find category name for UUID:', this.currentThread.category);
                }
            } catch (err) {
                console.error('Error looking up category name:', err);
            }
        }
        
        editForm.category.value = categoryName;
        editForm.tags.value = Array.isArray(this.currentThread.tags) ? this.currentThread.tags.join(', ') : '';
        editForm.content.value = this.currentThread.content || '';

        // Display existing images with remove buttons
        const existingImagesPreviewContainer = document.getElementById('existingImagesPreviewEdit');
        if (existingImagesPreviewContainer) {
            existingImagesPreviewContainer.innerHTML = '';
            const threadImages = this.currentThread.images || [];
            console.log('[Forum.js Edit] Rendering existing images for edit:', threadImages);
            threadImages.forEach((imageUrl, index) => {
                const previewDiv = document.createElement('div');
                previewDiv.className = 'relative w-20 h-20 border border-gray-600 rounded overflow-hidden';
                previewDiv.dataset.imageUrl = imageUrl; // Store the URL for reference
                const img = document.createElement('img');
                img.src = imageUrl;
                img.className = 'w-full h-full object-cover';
                const removeBtn = document.createElement('button');
                removeBtn.type = 'button'; // Prevent form submission
                removeBtn.className = 'absolute top-0 right-0 bg-yellow-500 text-white p-1 text-xs leading-none';
                removeBtn.innerHTML = '<i class="fas fa-times"></i> Remove';
                
                removeBtn.onclick = () => {
                    const urlToRemove = previewDiv.dataset.imageUrl;
                    if (this.imagesToRemove.includes(urlToRemove)) {
                        // Toggle back: User decided NOT to remove it
                        this.imagesToRemove = this.imagesToRemove.filter(url => url !== urlToRemove);
                        img.classList.remove('opacity-50');
                        removeBtn.innerHTML = '<i class="fas fa-times"></i> Remove';
                        removeBtn.classList.replace('bg-green-500', 'bg-yellow-500');
                    } else {
                        // Mark for removal
                        this.imagesToRemove.push(urlToRemove);
                        img.classList.add('opacity-50');
                        removeBtn.innerHTML = '<i class="fas fa-undo"></i> Keep';
                        removeBtn.classList.replace('bg-yellow-500', 'bg-green-500');
                    }
                    console.log('[Forum.js Edit] Images to remove:', this.imagesToRemove);
                    // Potentially re-validate new image additions here if max count is affected
                };
                previewDiv.appendChild(img);
                previewDiv.appendChild(removeBtn);
                if(existingImagesPreviewContainer) existingImagesPreviewContainer.appendChild(previewDiv);
            });
        }

        editModal.classList.remove('hidden');
    }

    async submitEditThread(e) {
        e.preventDefault();
        if (!this.currentThread || !window.auth || !window.auth.currentUser) {
            this.showError("No thread selected or not logged in.", 'editFormError');
            return;
        }
        const userId = window.auth.currentUser.id;

        const editModal = document.getElementById('editThreadModal');
        const editForm = e.target;
        const formData = new FormData(editForm);
        const submitButton = editForm.querySelector('button[type="submit"]');

        const title = formData.get('title').trim();
        const category = formData.get('category');
        const tagsInput = formData.get('tags').trim();
        const content = formData.get('content').trim();

        document.getElementById('editFormError').classList.add('hidden');

        if (!title || !content || !category) {
            this.showError('Title, content, and category are required.', 'editFormError');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Updating...';

        const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
        const newlyUploadedImageUrls = [];

        console.log('[Forum.js Edit] Starting submitEditThread');
        console.log('[Forum.js Edit] selectedEditImages count:', this.selectedEditImages.length);
        console.log('[Forum.js Edit] selectedEditImages:', this.selectedEditImages.map(f => f ? f.name : 'undefined'));
        console.log('[Forum.js Edit] imagesToRemove count:', this.imagesToRemove.length);
        console.log('[Forum.js Edit] imagesToRemove:', this.imagesToRemove);

        try {
            // 1. Look up category ID from category name
            console.log(`[Forum.js Edit] Looking up category ID for: ${category}`);
            const { data: categoryData, error: categoryError } = await this.supabase
                .from('forum_categories')
                .select('id')
                .eq('name', category)
                .single();

            if (categoryError || !categoryData) {
                console.error('[Forum.js Edit] Category lookup error:', categoryError);
                this.showError('Invalid category selected. Please refresh the page and try again.', 'editFormError');
                submitButton.disabled = false;
                submitButton.textContent = 'Update Thread';
                return;
            }

            const categoryId = categoryData.id;
            console.log(`[Forum.js Edit] Found category ID: ${categoryId} for category: ${category}`);

            // 2. Upload NEW images selected during edit
            if (this.selectedEditImages.length > 0) {
                console.log('[Forum.js Edit] Uploading new images:', this.selectedEditImages.map(f=>f.name));
                for (const file of this.selectedEditImages) {
                    console.log('[Forum.js Edit] Processing file:', file.name, 'Size:', file.size, 'Type:', file.type);
                    let processedFile = file;
                    if (typeof imageCompression === 'function' && file instanceof File) {
                        try {
                            processedFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });
                            console.log('[Forum.js Edit] Image compressed successfully:', processedFile.name, 'New size:', processedFile.size);
                        } catch (cErr) { 
                            console.error('Compression error for new edit image:', cErr); 
                        }
                    }
                    const originalName = processedFile.name || 'unnamed';
                    const extension = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')) : '';
                    const baseName = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
                    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/\s+/g, '_');
                    const filePath = `${userId}/${Date.now()}-${sanitizedBaseName}${extension}`;

                    console.log('[Forum.js Edit] Uploading to path:', filePath);
                    const { error: uploadError } = await this.supabase.storage
                        .from('thread-images')
                        .upload(filePath, processedFile);

                    if (uploadError) {
                        console.error('[Forum.js Edit] Upload error:', uploadError);
                        throw new Error(`Failed to upload new image ${processedFile.name}: ${uploadError.message}`);
                    }
                    
                    console.log('[Forum.js Edit] Upload successful, getting public URL...');
                    const { data: publicUrlData } = this.supabase.storage.from('thread-images').getPublicUrl(filePath);
                    if (publicUrlData && publicUrlData.publicUrl) {
                        console.log('[Forum.js Edit] Got public URL:', publicUrlData.publicUrl);
                        newlyUploadedImageUrls.push(publicUrlData.publicUrl);
                    } else {
                        console.warn('Could not get public URL for newly uploaded image in edit:', filePath);
                    }
                }
                console.log('[Forum.js Edit] All new images uploaded. URLs:', newlyUploadedImageUrls);
            } else {
                console.log('[Forum.js Edit] No new images to upload.');
            }

            // 3. Delete images marked for removal from Supabase Storage
            if (this.imagesToRemove.length > 0) {
                console.log('[Forum.js Edit] Removing images from storage:', this.imagesToRemove);
                const pathsToRemove = [];
                for (const urlToRemove of this.imagesToRemove) {
                    try {
                        // Attempt to parse the path from the public URL
                        // Assumes URL format: https://<project_ref>.supabase.co/storage/v1/object/public/<bucket_name>/<actual_path>
                        const urlParts = new URL(urlToRemove);
                        const pathSegments = urlParts.pathname.split('/');
                        // Find bucket name in path and take everything after it
                        const bucketNameIndex = pathSegments.indexOf('thread-images');
                        if (bucketNameIndex !== -1 && bucketNameIndex < pathSegments.length - 1) {
                            const storagePath = pathSegments.slice(bucketNameIndex + 1).join('/');
                            pathsToRemove.push(storagePath);
                        } else {
                            console.warn(`Could not parse storage path from URL: ${urlToRemove}`);
                        }
                    } catch (e) {
                        console.error(`Error parsing URL for deletion: ${urlToRemove}`, e);
                    }
                }
                if (pathsToRemove.length > 0) {
                    const { error: deleteStorageError } = await this.supabase.storage
                        .from('thread-images')
                        .remove(pathsToRemove);
                    if (deleteStorageError) {
                        // Log error but proceed, as primary goal is DB update. Orphaned files can be a secondary concern.
                        console.error('Error deleting images from storage:', deleteStorageError);
                        this.showError('Could not remove all marked images from storage. Some may remain.', 'editFormError');
                    }
                }
            }

            // 4. Construct the final list of image URLs for the database
            let finalImageUrls = Array.isArray(this.currentThread.images) ? [...this.currentThread.images] : [];
            console.log('[Forum.js Edit] Starting with existing images:', finalImageUrls);
            console.log('[Forum.js Edit] Images to remove:', this.imagesToRemove);
            
            finalImageUrls = finalImageUrls.filter(url => !this.imagesToRemove.includes(url));
            console.log('[Forum.js Edit] After removing marked images:', finalImageUrls);
            
            finalImageUrls = finalImageUrls.concat(newlyUploadedImageUrls);
            console.log('[Forum.js Edit] After adding new images:', finalImageUrls);
            
             // Ensure we don't exceed max images overall (e.g. if UI allowed more somehow)
            if (finalImageUrls.length > 5) {
                console.log('[Forum.js Edit] Trimming to max 5 images');
                finalImageUrls = finalImageUrls.slice(0, 5);
            }

            // 5. Update the thread in the database
            const updateData = {
                title,
                category: categoryId,
                tags,
                content,
                images: finalImageUrls,
                updated_at: new Date().toISOString()
            };
            console.log('[Forum.js Edit] Final update data for thread:', updateData);

            const { error: updateDbError } = await this.supabase
                .from('threads')
                .update(updateData)
                .eq('id', this.currentThread.id);

            if (updateDbError) {
                throw new Error(updateDbError.message || 'Failed to update thread in database.');
            }

            this.showSuccess('Thread updated successfully!');
            editModal.classList.add('hidden');
            editForm.reset();
            
            // Clear image tracking arrays for edit session
            this.selectedEditImages = [];
            this.imagesToRemove = [];
            document.getElementById('existingImagesPreviewEdit').innerHTML = '';
            document.getElementById('newImagePreviewEdit').innerHTML = '';
            
            // Refresh the detailed view with updated data
            await this.viewThread(this.currentThread.id);
            
            // Also refresh the main forum thread list to show updated images
            // This ensures that when users go back to the main forum, they see updated images
            await this.loadThreads();

        } catch (error) {
            console.error('[Forum.js Edit] Exception during thread update:', error);
            this.showError(error.message || 'An unexpected error occurred while updating the thread.', 'editFormError');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Update Thread';
        }
    }

    async handleDeleteThread() {
        if (!this.currentThread) {
            this.showError("No thread selected to delete.");
            return;
        }
        console.log(`Attempting to delete thread: ${this.currentThread.id}`);

        if (confirm("Are you sure you want to delete this thread? This action cannot be undone.")) {
            try {
                const { error } = await this.supabase
                    .from('threads')
                    .delete()
                    .eq('id', this.currentThread.id); // RLS will enforce user_id match

                if (error) {
                    console.error('Error deleting thread:', error);
                    this.showError(error.message || 'Failed to delete thread. You may not be the owner or an error occurred.');
                    return;
                }

                this.showSuccess('Thread deleted successfully.');
                this.currentThread = null;
                this.switchView('main');
                this.loadThreads(); // Refresh the thread list
            } catch (err) {
                console.error('Exception during thread deletion:', err);
                this.showError('An unexpected error occurred while deleting the thread.');
            }
        }
    }

    handleFileSelect(files) {
        console.log('[Forum.js] handleFileSelect called with:', files);
        console.log('[Forum.js] Current this.selectedThreadImages before processing:', [...this.selectedThreadImages].map(f => f.name));

        const imagePreviewContainer = document.getElementById('imagePreview');
        const imageError = document.getElementById('imageError');
        const maxFiles = 5;
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        const maxSizeMB = 10;

        imageError.classList.add('hidden');
        imageError.textContent = '';

        const spaceAvailable = maxFiles - this.selectedThreadImages.length;
        console.log(`[Forum.js] Space available for new images: ${spaceAvailable}`);

        if (files.length > spaceAvailable) {
            const message = `You can only add ${spaceAvailable > 0 ? spaceAvailable : 0} more image(s). Max total is ${maxFiles}.`;
            console.warn('[Forum.js] Image selection error:', message);
            imageError.textContent = message;
            imageError.classList.remove('hidden');
            return;
        }

        for (const file of files) {
            console.log('[Forum.js] Processing file:', file.name, file.type, file.size);
            if (this.selectedThreadImages.length >= maxFiles) {
                console.warn('[Forum.js] Max files limit reached during loop.');
                break; 
            }

            if (!allowedTypes.includes(file.type)) {
                const message = `Invalid file type: ${file.name}. Only JPG, PNG, GIF allowed.`;
                console.warn('[Forum.js] Image type error:', message);
                imageError.textContent = message;
                imageError.classList.remove('hidden');
                continue; 
            }

            if (file.size > maxSizeMB * 1024 * 1024) {
                const message = `File too large: ${file.name}. Max size is ${maxSizeMB}MB.`;
                console.warn('[Forum.js] Image size error:', message);
                imageError.textContent = message;
                imageError.classList.remove('hidden');
                continue;
            }
            
            this.selectedThreadImages.push(file);
            console.log('[Forum.js] File added to selectedThreadImages:', file.name, 'New count:', this.selectedThreadImages.length);
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewDiv = document.createElement('div');
                previewDiv.className = 'relative w-20 h-20 border border-gray-600 rounded overflow-hidden';
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'w-full h-full object-cover';
                const removeBtn = document.createElement('button');
                removeBtn.className = 'absolute top-0 right-0 bg-red-500 text-white p-1 text-xs leading-none';
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.onclick = () => {
                    console.log('[Forum.js] Removing image:', file.name);
                    this.selectedThreadImages = this.selectedThreadImages.filter(f => f !== file);
                    previewDiv.remove();
                    console.log('[Forum.js] Image removed. New count:', this.selectedThreadImages.length);
                    if (this.selectedThreadImages.length < maxFiles) {
                        imageError.classList.add('hidden'); 
                        imageError.textContent = '';
                    }
                };
                previewDiv.appendChild(img);
                previewDiv.appendChild(removeBtn);
                imagePreviewContainer.appendChild(previewDiv);
                console.log('[Forum.js] Preview rendered for:', file.name);
            };
            reader.onerror = (err) => {
                console.error('[Forum.js] FileReader error for file:', file.name, err);
            };
            reader.readAsDataURL(file);
        }
        console.log('[Forum.js] Finished handleFileSelect. Final selectedThreadImages:', [...this.selectedThreadImages].map(f => f.name));
    }

    handleFileSelectForEdit(files) {
        console.log('[Forum.js] handleFileSelectForEdit called with:', files);
        const newImagePreviewContainer = document.getElementById('newImagePreviewEdit');
        const imageError = document.getElementById('editImageError');
        const maxTotalFiles = 5;

        if (!imageError) {
            console.warn('Edit image error element not found');
            return;
        }

        imageError.classList.add('hidden');
        imageError.textContent = '';

        // Safe calculation of current image counts
        const currentExistingImagesCount = this.currentThread && Array.isArray(this.currentThread.images) 
            ? this.currentThread.images.filter(url => url && !this.imagesToRemove.includes(url)).length
            : 0;
        const currentNewImagesCount = Array.isArray(this.selectedEditImages) ? this.selectedEditImages.length : 0;
        const totalSelectedSoFar = currentExistingImagesCount + currentNewImagesCount;
        const spaceAvailable = maxTotalFiles - totalSelectedSoFar;

        console.log(`[Forum.js Edit] Existing (not removed): ${currentExistingImagesCount}, New already selected: ${currentNewImagesCount}, Total so far: ${totalSelectedSoFar}, Space available: ${spaceAvailable}`);

        if (files.length > spaceAvailable) {
            const message = `You can only add ${spaceAvailable > 0 ? spaceAvailable : 0} more image(s). Max total is ${maxTotalFiles}.`;
            console.warn('[Forum.js Edit] Image selection error:', message);
            imageError.textContent = message;
            imageError.classList.remove('hidden');
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        const maxSizeMB = 10;

        for (const file of files) {
            if (!file || !file.type) {
                console.warn('[Forum.js Edit] Invalid file object:', file);
                continue;
            }

            if (!allowedTypes.includes(file.type)) {
                imageError.textContent = `Invalid file type: ${file.name}. Only JPG, PNG, GIF allowed.`;
                imageError.classList.remove('hidden');
                continue;
            }
            if (file.size > maxSizeMB * 1024 * 1024) {
                imageError.textContent = `File too large: ${file.name}. Max size is ${maxSizeMB}MB.`;
                imageError.classList.remove('hidden');
                continue;
            }
            
            this.selectedEditImages.push(file);
            console.log('[Forum.js Edit] File added to selectedEditImages:', file.name, 'New count for edit:', this.selectedEditImages.length);
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewDiv = document.createElement('div');
                previewDiv.className = 'relative w-20 h-20 border border-gray-600 rounded overflow-hidden';
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'w-full h-full object-cover';
                const removeBtn = document.createElement('button');
                removeBtn.className = 'absolute top-0 right-0 bg-red-500 text-white p-1 text-xs leading-none';
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.onclick = () => {
                    this.selectedEditImages = this.selectedEditImages.filter(f => f !== file);
                    previewDiv.remove();
                     // Recalculate and check if error for *new* images can be cleared
                    const currentTotalAfterRemove = currentExistingImagesCount + this.selectedEditImages.length;
                    if (currentTotalAfterRemove < maxTotalFiles) {
                        imageError.classList.add('hidden'); 
                        imageError.textContent = '';
                    }
                };
                previewDiv.appendChild(img);
                previewDiv.appendChild(removeBtn);
                if (newImagePreviewContainer) {
                    newImagePreviewContainer.appendChild(previewDiv);
                }
            };
            reader.onerror = (err) => {
                console.error('[Forum.js Edit] FileReader error for file:', file.name, err);
            };
            reader.readAsDataURL(file);
        }
    }

    openImageLightbox(imageUrl) {
        const lightbox = document.getElementById('imageLightbox');
        const lightboxImage = document.getElementById('lightboxImage');
        if (lightbox && lightboxImage) {
            lightboxImage.src = imageUrl;
            lightbox.classList.add('show');
            // Ensure close button works - might need to be in setupEventListeners if it's not dynamic
            const closeLightbox = document.getElementById('closeLightbox');
            if (closeLightbox && !closeLightbox.listenerAttached) {
                closeLightbox.addEventListener('click', () => lightbox.classList.remove('show'));
                closeLightbox.listenerAttached = true; // Prevent multiple listeners
            }
        }
    }

    async loadReplies(threadId) {
        if (!threadId) return;
        console.log(`[Forum.js] Loading replies for thread: ${threadId}`);
        const repliesContainer = document.getElementById('repliesContainer');
        if (repliesContainer) repliesContainer.innerHTML = '<div class="text-center py-4 text-gray-400">Loading replies...</div>'; // Loading state

        try {
            const { data: replies, error } = await this.supabase.rpc('get_replies_for_thread', { p_thread_id: threadId });

            if (error) {
                console.error('Error loading replies:', error);
                if (repliesContainer) repliesContainer.innerHTML = '<div class="text-center py-4 text-red-400">Failed to load replies.</div>';
                this.showError('Failed to load replies.');
                return;
            }
            this.currentThreadReplies = replies || [];
            this.renderReplies();
        } catch (err) {
            console.error('Exception in loadReplies:', err);
            if (repliesContainer) repliesContainer.innerHTML = '<div class="text-center py-4 text-red-400">Error loading replies.</div>';
            this.showError('An unexpected error occurred while loading replies.');
        }
    }

    renderReplies() {
        const container = document.getElementById('repliesContainer');
        if (!container) {
            console.error('Replies container not found for rendering.');
            return;
        }

        const replies = this.currentThreadReplies;
        if (!replies || replies.length === 0) {
            container.innerHTML = '<h3 class="text-2xl font-bold orbitron mb-4">Replies</h3><div class="text-center py-4 text-[#a0a0d0]">No replies yet. Be the first to reply!</div>';
            return;
        }

        let repliesHtml = '<h3 class="text-2xl font-bold orbitron mb-4">Replies</h3>';
        // For now, flat list. Nesting would require processing parent_id.
        replies.forEach(reply => {
            const replyAuthor = reply.reply_author_username ? reply.reply_author_username.replace(/</g, "&lt;").replace(/>/g, "&gt;") : 'User';
            const replyContent = reply.reply_content ? reply.reply_content.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>") : '';
            const replyDate = reply.reply_created_at ? new Date(reply.reply_created_at).toLocaleString() : 'N/A';
            // Placeholder for avatar - replace with actual logic if avatar URL is available
            const avatarUrl = reply.reply_author_avatar_url || 'https://via.placeholder.com/40/1a1a2e/00c3ff?text=' + replyAuthor.charAt(0).toUpperCase();

            // Basic Edit/Delete buttons for replies (owner only)
            let replyOwnerControls = '';
            if (window.auth && window.auth.currentUser && window.auth.currentUser.id === reply.reply_user_id) {
                replyOwnerControls = `
                    <div class="ml-auto text-xs">
                        <button class="text-[#00c3ff] hover:text-white mr-2 edit-reply-btn" data-reply-id="${reply.reply_id}">Edit</button>
                        <button class="text-red-400 hover:text-red-300 delete-reply-btn" data-reply-id="${reply.reply_id}">Delete</button>
                    </div>
                `;
            }

            repliesHtml += `
                <div class="neon-card p-4 mb-4 bg-[#101021] border border-transparent hover:border-[#00c3ff]/30" data-reply-id="${reply.reply_id}">
                    <div class="flex items-start">
                        <img src="${avatarUrl}" alt="${replyAuthor}" class="w-10 h-10 rounded-full mr-3 border-2 border-[#00c3ff]/50">
                        <div class="flex-1">
                            <div class="flex justify-between items-center mb-1">
                                <span class="font-semibold text-white">${replyAuthor}</span>
                                <span class="text-xs text-[#a0a0d0]">${replyDate}</span>
                            </div>
                            <div class="text-gray-300 mb-2">${replyContent}</div>
                        </div>
                    </div>
                    <div class="flex justify-end mt-2">
                        ${replyOwnerControls}
                    </div>
                </div>
            `;
        });
        container.innerHTML = repliesHtml;

        // Add event listeners for reply edit/delete buttons (to be implemented)
        container.querySelectorAll('.edit-reply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const replyId = e.currentTarget.dataset.replyId;
                console.log('Edit reply clicked:', replyId); // Placeholder
                // this.handleEditReply(replyId);
                this.showError('Edit reply functionality not yet implemented.');
            });
        });
        container.querySelectorAll('.delete-reply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const replyId = e.currentTarget.dataset.replyId;
                console.log('Delete reply clicked:', replyId); // Placeholder
                // this.handleDeleteReply(replyId);
                this.showError('Delete reply functionality not yet implemented.');
            });
        });
    }

    async handleNewReply(e) {
        e.preventDefault();
        if (!window.auth || !window.auth.currentUser) {
            this.showError('You must be signed in to reply.');
            return;
        }

        const form = e.target;
        const content = form.elements.replyContent.value.trim();
        const threadId = form.elements.threadId.value;

        if (!content) {
            this.showError('Reply content cannot be empty.');
            return;
        }

        try {
            const { data: newReply, error } = await this.supabase
                .from('thread_replies')
                .insert({
                    thread_id: threadId,
                    user_id: window.auth.currentUser.id,
                    author_username: window.auth.currentUser.user_metadata?.username || window.auth.currentUser.email.split('@')[0],
                    content: content,
                    // parent_id: null // For direct replies; implement UI for selecting parent later
                })
                .select()
                .single();

            if (error) {
                console.error('Error posting reply:', error);
                this.showError(error.message || 'Failed to post reply.');
                return;
            }

            this.showSuccess('Reply posted successfully!');
            form.elements.replyContent.value = ''; // Clear textarea
            this.loadReplies(threadId); // Refresh replies for the current thread

        } catch (err) {
            console.error('Exception in handleNewReply:', err);
            this.showError('An unexpected error occurred while posting your reply.');
        }
    }

    async loadPopularGames() {
        const popularGamesList = document.getElementById('popularGamesList');
        if (!popularGamesList) return;
        popularGamesList.innerHTML = '<div class="animate-pulse space-y-3"><div class="h-12 bg-[#1a1a2e] rounded-lg"></div><div class="h-12 bg-[#1a1a2e] rounded-lg"></div><div class="h-12 bg-[#1a1a2e] rounded-lg"></div></div>'; // Loading state
        try {
            const { data: games, error } = await this.supabase.rpc('get_popular_games', { p_limit: 4 });
            if (error) {
                console.error('Error loading popular games:', error);
                throw error; // Re-throw to be caught by the generic catch block
            }
            this.renderPopularGames(games);
        } catch (error) {
            console.error('Catch block: Error loading popular games:', error);
            if (popularGamesList) popularGamesList.innerHTML = '<p class="text-xs text-red-400">Could not load games.</p>';
        }
    }

    renderPopularGames(games) {
        const container = document.getElementById('popularGamesList');
        if (!container) return;
        if (!games || games.length === 0) {
            container.innerHTML = '<p class="text-xs text-[#a0a0d0]">No games to show.</p>';
            return;
        }
        container.innerHTML = games.map(game => {
            const gameName = game.game_name ? game.game_name.replace(/</g, "&lt;").replace(/>/g, "&gt;") : 'Game';
            const gameImage = game.game_image_url || `https://via.placeholder.com/50/1a1a2e/00c3ff?text=${gameName.charAt(0)}`;
            return `
            <a href="#" class="game-card group block" data-game-id="${game.game_id}">
                <img src="${gameImage}" alt="${gameName.replace(/"/g, '&quot;')}" class="w-12 h-12 object-cover rounded-lg mr-3 group-hover:scale-105 transition-transform">
                <div>
                    <h4 class="text-sm font-semibold text-white group-hover:text-neon-blue transition">${gameName}</h4>
                </div>
            </a>
        `}).join('');
    }

    // async loadTrendingTags() {
    //     const trendingTagsContainer = document.querySelector('#trendingTagsContainer div.flex');
    //     if (!trendingTagsContainer) return;
    //     trendingTagsContainer.innerHTML = '<div class="animate-pulse flex flex-wrap gap-2"><span class="h-6 w-20 bg-[#1a1a2e] rounded-full"></span></div>';
    //     try {
    //         const { data: tags, error } = await this.supabase.rpc('get_trending_tags', { p_limit: 6 });
    //         if (error) throw error;
    //         this.renderTrendingTags(tags);
    //     } catch (error) {
    //         console.error('Error loading trending tags:', error);
    //         if (trendingTagsContainer) trendingTagsContainer.innerHTML = '<p class="text-xs text-red-400">Could not load tags.</p>';
    //     }
    // }

    // renderTrendingTags(tags) {
    //     const container = document.querySelector('#trendingTagsContainer div.flex');
    //     if (!container) return;
    //     if (!tags || tags.length === 0) {
    //         container.innerHTML = '<p class="text-xs text-[#a0a0d0]">No trending tags.</p>';
    //         return;
    //     }
    //     container.innerHTML = tags.map(tag => {
    //         const tagName = tag.tag_name ? tag.tag_name.replace(/</g, "&lt;").replace(/>/g, "&gt;") : 'tag';
    //         return `
    //         <button class="trending-tag" data-tag="${tagName.replace(/"/g, '&quot;')}">${tagName}</button>
    //     `}).join('');
    //     container.querySelectorAll('.trending-tag').forEach(button => {
    //         button.addEventListener('click', (e) => {
    //             const tagName = e.currentTarget.dataset.tag;
    //             console.log('Filter by tag:', tagName); // Placeholder for actual filtering
    //             this.showError('Tag filtering not yet implemented.');
    //         });
    //     });
    // }

    // async loadActiveNowUsers() {
    //     const activeNowContainer = document.getElementById('activeNowContainer');
    //     if (!activeNowContainer) return;
    //     activeNowContainer.innerHTML = '<div class="animate-pulse space-y-3"><div class="h-10 bg-[#1a1a2e] rounded-lg"></div></div>';
    //     try {
    //         const { data: users, error } = await this.supabase.rpc('get_recently_active_users', { p_limit: 4 });
    //         if (error) throw error;
    //         this.renderActiveNowUsers(users);
    //     } catch (error) {
    //         console.error('Error loading active users:', error);
    //         if (activeNowContainer) activeNowContainer.innerHTML = '<p class="text-xs text-red-400">Could not load users.</p>';
    //     }
    // }

    // renderActiveNowUsers(users) {
    //     const container = document.getElementById('activeNowContainer');
    //     if (!container) return;
    //     if (!users || users.length === 0) {
    //         container.innerHTML = '<p class="text-xs text-[#a0a0d0]">No users recently active.</p>';
    //         return;
    //     }
    //     container.innerHTML = users.map(user => {
    //         const username = user.active_username ? user.active_username.replace(/</g, "&lt;").replace(/>/g, "&gt;") : 'User';
    //         const avatar = user.active_avatar_url || `https://via.placeholder.com/32/1a1a2e/00c3ff?text=${username.charAt(0).toUpperCase()}`;
    //         console.log('Rendering active user:', username, 'Avatar URL:', avatar); // DEBUG LOG
    //         const onlineStatus = user.is_online ? '<span class="text-[#00ffaa] text-xs ml-2">• Online</span>' : '<span class="text-gray-500 text-xs ml-2">• Offline</span>';
    //         return `
    //         <div class="flex items-center mb-2">
    //             ${user.is_online ? '<div class="pulse mr-3"></div>' : '<div class="w-[10px] h-[10px] rounded-full bg-gray-600 mr-3"></div>'}
    //             <img src="${avatar}" alt="${username.replace(/"/g, '&quot;')}" class="w-8 h-8 rounded-full mr-3">
    //             <div>
    //                 <span class="text-white text-sm">${username}</span>
    //                 ${onlineStatus}
    //             </div>
    //         </div>
    //     `}).join(''); 
    // }

    // async loadTopContributors() {
    //     const topContributorsContainer = document.getElementById('topContributorsContainer');
    //     if (!topContributorsContainer) return;
    //     topContributorsContainer.innerHTML = '<div class="animate-pulse space-y-3"><div class="h-12 bg-[#1a1a2e] rounded-lg"></div></div>';
    //     try {
    //         const { data: contributors, error } = await this.supabase.rpc('get_top_contributors', { p_limit: 3 });
    //         if (error) throw error;
    //         this.renderTopContributors(contributors);
    //     } catch (error) {
    //         console.error('Error loading top contributors:', error);
    //         if (topContributorsContainer) topContributorsContainer.innerHTML = '<p class="text-xs text-red-400">Could not load contributors.</p>';
    //     }
    // }

    // renderTopContributors(contributors) {
    //     const container = document.getElementById('topContributorsContainer');
    //     if (!container) return;
    //     if (!contributors || contributors.length === 0) {
    //         container.innerHTML = '<p class="text-xs text-[#a0a0d0]">No contributions yet.</p>';
    //         return;
    //     }
    //     const medalColors = ['bg-yellow-400', 'bg-gray-400', 'bg-orange-500'];
    //     container.innerHTML = contributors.map((contrib, index) => {
    //         const username = contrib.contributor_username ? contrib.contributor_username.replace(/</g, "&lt;").replace(/>/g, "&gt;") : 'Contributor';
    //         const avatar = contrib.contributor_avatar_url || `https://via.placeholder.com/40/1a1a2e/00c3ff?text=${username.charAt(0).toUpperCase()}`;
    //         return `
    //         <div class="flex items-center justify-between mb-3">
    //             <div class="flex items-center">
    //                 <img src="${avatar}" alt="${username.replace(/"/g, '&quot;')}" class="user-avatar mr-3 w-10 h-10" style="background-image: none; background-color: transparent; border-radius: 50%;">
    //                 <div>
    //                     <div class="text-white text-sm">${username}</span>
    //                     <div class="text-[#a0a0d0] text-xs">Score: ${contrib.contribution_score}</div>
    //                 </div>
    //             </div>
    //             ${index < 3 ? `<div class="w-6 h-6 rounded-full ${medalColors[index]} flex items-center justify-center"><i class="fas fa-medal text-[10px] text-gray-900"></i></div>` : ''}
    //         </div>
    //     `}).join('');
    // }

    async loadCommunityStats() {
        const threadCountEl = document.getElementById('threadCount');
        const replyCountEl = document.getElementById('replyCount');
        const userCountEl = document.getElementById('userCount');
        // gameCount is static or from another source for now

        try {
            const { data: stats, error } = await this.supabase.rpc('get_forum_stats');
            if (error) throw error;
            
            if (stats && stats.length > 0) {
                if (threadCountEl) threadCountEl.textContent = stats[0].total_threads || '0';
                if (replyCountEl) replyCountEl.textContent = stats[0].total_replies || '0';
                if (userCountEl) userCountEl.textContent = stats[0].total_users || '0';
            }
        } catch (error) {
            console.error("Error loading community stats:", error);
            if (threadCountEl) threadCountEl.textContent = 'N/A';
            if (replyCountEl) replyCountEl.textContent = 'N/A';
            if (userCountEl) userCountEl.textContent = 'N/A';
        }
    }
} 