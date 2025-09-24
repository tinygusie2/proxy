document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('urlInput');
    const unblockButton = document.getElementById('unblockButton');
    const proxyPort = 3000; // Moet overeenkomen met de poort in server.js

    unblockButton.addEventListener('click', () => {
        const targetUrl = urlInput.value.trim();

        if (targetUrl) {
            // Construct the proxy URL
            const proxyUrl = `http://localhost:${proxyPort}/proxy?url=${encodeURIComponent(targetUrl)}`;
            // Redirect the browser to the proxy URL
            window.location.href = proxyUrl;
        } else {
            alert('Voer een URL in om te bezoeken.');
        }
    });

    // Optional: Allow pressing Enter key to trigger the button click
    urlInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            unblockButton.click();
        }
    });
});
