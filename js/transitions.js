document.addEventListener('DOMContentLoaded', () => {
    // Add the loading screen element if it doesn't exist
    if (!document.querySelector('.loading-screen')) {
        const loadingScreen = document.createElement('div');
        loadingScreen.className = 'loading-screen';
        loadingScreen.innerHTML = `
            <img src="./images/weblogo.png" alt="Gamerang Logo" class="loading-logo">
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading...</div>
            <div class="loading-progress">
                <div class="loading-progress-bar"></div>
            </div>
        `;
        document.body.appendChild(loadingScreen);
    }

    // Get all navigation links
    const navLinks = document.querySelectorAll('a[href]');
    const loadingScreen = document.querySelector('.loading-screen');

    // Add click event listener to all navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Only handle internal links
            if (link.hostname === window.location.hostname) {
                e.preventDefault();
                const targetUrl = link.href;

                // Fade out the page
                document.body.classList.add('fade-out');
                
                // Show the loading screen
                loadingScreen.classList.add('active');

                // Navigate after a short delay
                setTimeout(() => {
                    window.location.href = targetUrl;
                }, 500);
            }
        });
    });

    // Reset transitions when page loads
    window.addEventListener('load', () => {
        document.body.classList.remove('fade-out');
        loadingScreen.classList.remove('active');
    });

    // Show loading screen when page is unloading
    window.addEventListener('beforeunload', () => {
        loadingScreen.classList.add('active');
    });
}); 