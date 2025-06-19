document.addEventListener('DOMContentLoaded', () => {
    const preloader = document.getElementById('pageTransitionPreloader');
    const navLinks = document.querySelectorAll('a[href]');

    if (!preloader) {
        console.warn('Page Transition Preloader element not found. Animations will not run.');
        // return; // Don't return if preloader is missing, decryption can still run
    }

    // Function to show the preloader
    function showPreloader() {
        if(preloader) preloader.classList.add('visible');
    }

    // Function to hide the preloader
    function hidePreloader() {
        if(preloader) preloader.classList.remove('visible');
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

    // --- Decrypted Text Animation --- 
    const defaultChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{};:",./<>?';

    function animateDecryptedText(element, options = {}) {
        const originalText = element.dataset.originalText || element.textContent;
        element.dataset.originalText = originalText; // Store it if not already
        
        const {
            speed = 50, // Time in ms for each character update
            revealDelay = 50, // Time in ms before revealing next char
            scrambleChars = defaultChars,
            maxIterationsPerChar = 5 // How many times each char scrambles before settling
        } = options;

        let currentText = originalText.split('');
        let revealedChars = 0;

        function scramble() {
            if (revealedChars >= originalText.length) {
                element.textContent = originalText; // Ensure final text is correct
                return;
            }

            for (let i = revealedChars; i < originalText.length; i++) {
                currentText[i] = scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
            }
            element.textContent = currentText.join('');

            let iterations = 0;
            const intervalId = setInterval(() => {
                iterations++;
                for (let i = revealedChars; i < originalText.length; i++) {
                    if (i === revealedChars && iterations >= maxIterationsPerChar) {
                        // Time to reveal this character
                        currentText[i] = originalText[i];
                    } else if (i > revealedChars || (i === revealedChars && iterations < maxIterationsPerChar)) {
                        currentText[i] = scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
                    }
                }
                element.textContent = currentText.join('');

                if (iterations >= maxIterationsPerChar && currentText[revealedChars] === originalText[revealedChars]) {
                    clearInterval(intervalId);
                    revealedChars++;
                    // Slight delay before starting the next character's reveal cycle
                    setTimeout(scramble, revealDelay); 
                }
            }, speed);
        }
        scramble(); // Start the animation
    }

    const elementsToDecrypt = document.querySelectorAll('.decrypt-on-load');
    elementsToDecrypt.forEach(el => {
        // Optional: Add a slight delay before starting each to stagger them
        // const delay = parseInt(el.dataset.decryptDelay) || 0;
        // setTimeout(() => animateDecryptedText(el), delay);
        animateDecryptedText(el, { speed: 30, revealDelay: 30, maxIterationsPerChar: 8});
    });

}); 