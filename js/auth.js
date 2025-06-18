// Import Supabase configuration
import { supabase } from './supabase-config.js';

// Make supabase available globally if needed by other non-module scripts, though direct import is preferred.
window.supabase = supabase;

// Authentication functionality
export class Auth { // Export the class
    constructor() {
        console.log('Auth class constructor called');
        this.setupEventListeners();
        this.checkSession();
        
        // Listen for auth state changes
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session);
            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                this.updateUI(session);
            }
        });
    }

    setupEventListeners() {
        // Sign up form
        const signUpForm = document.getElementById('signUpForm');
        if (signUpForm) {
            signUpForm.addEventListener('submit', this.handleSignUp.bind(this));
        }

        // Sign in form
        const signInForm = document.getElementById('signInForm');
        if (signInForm) {
            signInForm.addEventListener('submit', this.handleSignIn.bind(this));
        }

        // Sign out button
        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', this.handleSignOut.bind(this));
        }
    }

    async checkSession() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            console.log('Current session on check:', session);
            this.updateUI(session);
        } catch (error) {
            console.error('Error checking session:', error);
            this.updateUI(null);
        }
    }

    async handleSignUp(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const email = formData.get('email').trim();
        const username = formData.get('username').trim();
        const password = formData.get('password').trim();

        if (!email || !username || !password) {
            this.showError('Please fill in all fields');
            return;
        }

        if (username.length < 3) {
            this.showError('Username must be at least 3 characters long');
            return;
        }

        if (password.length < 6) {
            this.showError('Password must be at least 6 characters long');
            return;
        }

        try {
            const { data: usernameAvailable, error: usernameError } = await supabase.rpc('check_username_available', {
                input_username: username
            });

            if (usernameError) {
                console.error('Error checking username availability:', usernameError);
                this.showError('Error checking username. Please try again.');
                return;
            }

            if (!usernameAvailable) {
                this.showError('Username is already taken');
                return;
            }

            const redirectTo = window.location.origin + window.location.pathname; // Redirect to the current page after email confirmation

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: username
                    },
                    emailRedirectTo: redirectTo
                }
            });

            if (error) {
                console.error('Signup error:', error);
                if (error.message.includes('User already registered')) {
                    this.showError('Email is already registered. Please sign in instead.');
                } else if (error.message.includes('Unable to validate email address')) {
                    this.showError('Invalid email address format.');
                } else {
                    this.showError(error.message || 'Failed to sign up. Please try again.');
                }
                return;
            }

            if (data?.user) {
                console.log('Supabase Auth signup successful, user ID:', data.user.id);
                // The Edge Function will now handle profile creation.
                // No longer need to insert into 'profiles' table from client-side.
                this.showSuccess('Account registration initiated! Please check your email for verification.');
                document.getElementById('signUpModal').classList.add('hidden');
                e.target.reset();
                // UI update will be handled by onAuthStateChange after email verification and sign-in,
                // or by the Edge Function succeeding and the user subsequently signing in.

            } else if (data && !data.user && data.session === null) {
                // This case can happen if email confirmation is required.
                // User is created in auth.users, but no session is returned yet.
                // Profile creation will happen after they verify email and sign in for the first time IF we don't do it here.
                // For consistency, let's assume the user object should be present if signup implies profile creation.
                // The current Supabase JS client v2 for signUp typically returns user object even if email confirmation is pending.
                // If `data.user` is null here, it implies something went wrong or the flow is different than expected.
                console.warn('SignUp successful but no user object returned directly. Email verification likely pending.', data);
                this.showSuccess('Account registration initiated! Please check your email for verification.');
                document.getElementById('signUpModal').classList.add('hidden');
                e.target.reset();
            } else {
                console.error('SignUp response did not contain user data:', data);
                throw new Error('SignUp response did not contain user data as expected.');
            }

        } catch (error) {
            console.error('Sign up error details:', error);
            this.showError(error.message || 'An unexpected error occurred during sign up.');
        }
    }

    async handleSignIn(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const email = formData.get('email').trim();
        const password = formData.get('password');

        if (!email || !password) {
            this.showError('Please fill in all fields');
            return;
        }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                console.error('Sign in error:', error);
                if (error.message.includes('Email not confirmed')) {
                    this.showError('Please verify your email before signing in. Check your inbox for a confirmation link.');
                } else if (error.message.includes('Invalid login credentials')) {
                    this.showError('Invalid email or password.');
                } else {
                    this.showError(error.message || 'Failed to sign in. Please try again.');
                }
                return;
            }

            if (data?.session) {
                this.showSuccess('Signed in successfully!');
                document.getElementById('signInModal').classList.add('hidden');
                e.target.reset();
                // The onAuthStateChange listener will handle the UI update via this.updateUI(data.session)
            } else {
                throw new Error('No session data returned from sign in');
            }

        } catch (error) {
            console.error('Sign in error details:', error);
            this.showError(error.message || 'An unexpected error occurred during sign in.');
        }
    }

    async handleSignOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            this.showSuccess('Signed out successfully!');
            // The onAuthStateChange listener will handle the UI update via this.updateUI(null)
        } catch (error) {
            console.error('Sign out error:', error);
            this.showError('Failed to sign out. Please try again.');
        }
    }

    updateUI(session) {
        const authButtons = document.getElementById('authButtons');
        const userInfo = document.getElementById('userInfo');
        const usernameSpan = document.getElementById('username');
        const newThreadBtn = document.getElementById('newThreadBtn');
        const mobileNewThreadBtn = document.getElementById('mobileNewThreadBtn');
        const newThreadBtnSidebar = document.getElementById('newThreadBtnSidebar');
        
        // Mobile auth buttons and user info
        const mobileAuthButtons = document.getElementById('mobileAuthButtons');
        const mobileUserInfo = document.getElementById('mobileUserInfo');
        const mobileUsernameSpan = document.getElementById('mobileUsername');
        const mobileUsernameInitials = document.getElementById('mobileUsernameInitials');
        const usernameInitials = document.getElementById('usernameInitials');
        const adminPanelBtn = document.getElementById('adminPanelBtn');
        const mobileAdminPanelBtn = document.getElementById('mobileAdminPanelBtn');

        if (!authButtons || !userInfo || !usernameSpan) {
            // console.warn('Main auth UI elements not found, skipping some UI updates.');
            // Allow partial updates if some elements are missing (e.g. on other pages)
        }

        if (session?.user) {
            this.currentUser = session.user; // Set currentUser
            const user = session.user;
            const username = user.user_metadata?.username || user.email.split('@')[0];
            const initials = (user.user_metadata?.username ? user.user_metadata.username.charAt(0) : user.email.charAt(0)).toUpperCase();

            if (authButtons) authButtons.classList.add('hidden');
            if (userInfo) userInfo.classList.remove('hidden');
            if (usernameSpan) usernameSpan.textContent = username;
            if (usernameInitials) usernameInitials.textContent = initials;
            
            if (newThreadBtn) newThreadBtn.disabled = false;
            if (mobileNewThreadBtn) mobileNewThreadBtn.disabled = false;
            if (newThreadBtnSidebar) newThreadBtnSidebar.disabled = false;

            if (mobileAuthButtons) mobileAuthButtons.classList.add('hidden');
            if (mobileUserInfo) mobileUserInfo.classList.remove('hidden');
            if (mobileUsernameSpan) mobileUsernameSpan.textContent = username;
            if (mobileUsernameInitials) mobileUsernameInitials.textContent = initials;

            // Handle admin button visibility
            this.checkAdminStatus(user.id).then(isAdmin => {
                if (isAdmin) {
                    if (adminPanelBtn) adminPanelBtn.classList.remove('hidden');
                    if (mobileAdminPanelBtn) mobileAdminPanelBtn.classList.remove('hidden');
                } else {
                    if (adminPanelBtn) adminPanelBtn.classList.add('hidden');
                    if (mobileAdminPanelBtn) mobileAdminPanelBtn.classList.add('hidden');
                }
            });
            console.log('User signed in, UI updated. Current user set:', this.currentUser);

        } else {
            this.currentUser = null; // Clear currentUser
            if (authButtons) authButtons.classList.remove('hidden');
            if (userInfo) userInfo.classList.add('hidden');
            if (usernameSpan) usernameSpan.textContent = '';
            if (usernameInitials) usernameInitials.textContent = 'U';

            if (newThreadBtn) newThreadBtn.disabled = true;
            if (mobileNewThreadBtn) mobileNewThreadBtn.disabled = true;
            if (newThreadBtnSidebar) newThreadBtnSidebar.disabled = true;

            if (mobileAuthButtons) mobileAuthButtons.classList.remove('hidden');
            if (mobileUserInfo) mobileUserInfo.classList.add('hidden');
            if (mobileUsernameSpan) mobileUsernameSpan.textContent = '';
            if (mobileUsernameInitials) mobileUsernameInitials.textContent = 'U';
            
            if (adminPanelBtn) adminPanelBtn.classList.add('hidden');
            if (mobileAdminPanelBtn) mobileAdminPanelBtn.classList.add('hidden');
            console.log('User signed out, UI updated. Current user cleared.');
        }
    }

    async checkAdminStatus(userId) {
        if (!userId) return false;
        try {
            const { data: profile, error } = await this.supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single();

            if (error) {
                // If profile not found or other error, assume not admin for safety
                // console.warn('Error fetching profile for admin check:', error.message);
                return false;
            }
            return profile && profile.role === 'admin';
        } catch (err) {
            // console.error('Exception in checkAdminStatus:', err.message);
            return false;
        }
    }

    showError(message) {
        console.error('Auth Error:', message);
        const errorDivId = 'auth-error-toast';
        document.getElementById(errorDivId)?.remove(); // Remove existing error toast
        const errorDiv = document.createElement('div');
        errorDiv.id = errorDivId;
        errorDiv.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-xl z-[100] text-sm';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }

    showSuccess(message) {
        console.log('Auth Success:', message);
        const successDivId = 'auth-success-toast';
        document.getElementById(successDivId)?.remove(); // Remove existing success toast
        const successDiv = document.createElement('div');
        successDiv.id = successDivId;
        successDiv.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl z-[100] text-sm';
        successDiv.textContent = message;
        document.body.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 3000);
    }

    /* // This method is redundant as handleSignUp calls the RPC directly.
    async checkUsernameAvailable(username) {
        try {
            const { data, error } = await supabase.rpc('check_username_available', {
                input_username: username
            });
            if (error) {
                console.error('Error in checkUsernameAvailable RPC:', error);
                // Propagate the error or return a specific value indicating an issue
                return false; // Or throw error to be caught by caller
            }
            return data; // `data` should be true if available, false if not
        } catch (error) {
            console.error('Exception in checkUsernameAvailable:', error);
            this.showError('Could not verify username availability.');
            return false;
        }
    }
    */
}

// Removed: document.addEventListener('DOMContentLoaded', () => { window.auth = new Auth(); });
// Initialization will be handled in forum.html or other main HTML files. 