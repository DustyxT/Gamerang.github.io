document.addEventListener('DOMContentLoaded', () => {
    const preloader = document.getElementById('pageTransitionPreloader');
    const navLinks = document.querySelectorAll('a[href]');

    if (!preloader) {
        console.warn('Page Transition Preloader element not found. Animations will not run.');
        return;
    }

    // Function to show the preloader
    function showPreloader() {
        preloader.classList.add('visible');
    }

    // Function to hide the preloader
    function hidePreloader() {
        preloader.classList.remove('visible');
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetUrl = link.href;
            const currentUrl = window.location.href;
            const currentPath = new URL(currentUrl).pathname;
            const targetPath = new URL(targetUrl).pathname;

            // Only handle internal links that are not hash links on the same page,
            // not links that open in a new tab,
            // and actual page changes (not just query params on the same page if that's not desired).
            if (link.hostname === window.location.hostname &&
                link.getAttribute('href') && // Ensure href exists
                !link.getAttribute('href').startsWith('#') && // Exclude same-page hash links
                link.target !== '_blank' && // Exclude links opening in new tabs
                targetUrl !== currentUrl && // Exclude links that are identical (e.g. re-clicking current page link)
                !targetUrl.includes('#') // A more robust check for hash links that might be appended
            ) {
                
                // Prevent default navigation if it's a different page path
                if (targetPath !== currentPath || new URL(targetUrl).search !== new URL(currentUrl).search) {
                    e.preventDefault();
                    showPreloader();

                    setTimeout(() => {
                        window.location.href = targetUrl;
                    }, 500); // Adjust delay as needed for animation
                }
            }
        });
    });

    // Ensure preloader is hidden on page load (e.g., after navigation or back/forward)
    window.addEventListener('load', () => {
        hidePreloader();
    });

    // Handle back/forward browser navigation to hide preloader
    window.addEventListener('pageshow', (event) => {
        // event.persisted is true if the page is loaded from the bfcache (back/forward cache)
        if (event.persisted) {
            hidePreloader();
        }
    });
}); 