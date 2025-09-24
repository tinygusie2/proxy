const express = require('express');
const axios = require('axios');
const cors = require('cors');
const cheerio = require('cheerio');
const bodyParser = require('body-parser'); // Nodig voor POST requests
const path = require('path'); // Importeer de 'path' module

const app = express();
const PORT = 3000;

app.use(cors()); // CORS inschakelen voor alle routes
app.use(bodyParser.json()); // JSON body parser
app.use(bodyParser.urlencoded({ extended: true })); // URL-encoded body parser

// Statische bestanden serveren vanuit de 'public' map
app.use(express.static(path.join(__dirname, 'public')));

// index.html serveren voor de root-path vanuit de 'public' map
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send('URL parameter is missing.');
    }

    try {
        const response = await axios.get(targetUrl, {
            responseType: 'text', // Changed to text for HTML parsing
            headers: {
                'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                // WARNING: Forwarding 'Cookie' headers can have privacy implications as it sends the user's cookies to the target site.
                'Cookie': req.headers.cookie || '',
                // Stuur alleen de noodzakelijke headers door om lekken te voorkomen
                'Accept': req.headers.accept || '*/*',
                'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.9',
                // WARNING: Forwarding 'Referer' headers can have privacy implications as it reveals the previous page visited by the user.
                'Referer': req.headers.referer || ''
            },
        });

        const contentType = response.headers['content-type'];
        
        // Stuur de set-cookie header door
        if (response.headers['set-cookie']) {
            res.setHeader('set-cookie', response.headers['set-cookie']);
        }


        if (contentType && contentType.includes('text/html')) {
            const $ = cheerio.load(response.data);

            // Function to rewrite URLs
            const rewriteUrl = (oldUrl) => {
                if (!oldUrl) return oldUrl;

                // Handle absolute URLs
                if (oldUrl.startsWith('http://') || oldUrl.startsWith('https://')) {
                    return `http://localhost:${PORT}/proxy?url=${encodeURIComponent(oldUrl)}`;
                }

                // Handle protocol-relative URLs (e.g., //example.com/path)
                if (oldUrl.startsWith('//')) {
                    const protocol = new URL(targetUrl).protocol;
                    return `http://localhost:${PORT}/proxy?url=${encodeURIComponent(protocol + oldUrl)}`;
                }

                // Handle relative URLs
                const baseUrl = new URL(targetUrl);
                const absoluteUrl = new URL(oldUrl, baseUrl).href;
                return `http://localhost:${PORT}/proxy?url=${encodeURIComponent(absoluteUrl)}`;
            };

            // Rewrite URLs in various elements
            $('a[href]').each((i, el) => {
                const href = $(el).attr('href');
                $(el).attr('href', rewriteUrl(href));
            });

            $('link[href]').each((i, el) => {
                const href = $(el).attr('href');
                $(el).attr('href', rewriteUrl(href));
            });

            $('script[src]').each((i, el) => {
                const src = $(el).attr('src');
                $(el).attr('src', rewriteUrl(src));
            });

            $('img[src]').each((i, el) => {
                const src = $(el).attr('src');
                $(el).attr('src', rewriteUrl(src));
            });

            $('form[action]').each((i, el) => {
                const action = $(el).attr('action');
                $(el).attr('action', rewriteUrl(action));
            });

            // Set content type header
            res.setHeader('Content-Type', contentType);
            res.send($.html()); // Send modified HTML

        } else {
            // For non-HTML content, just pass it through
            if (contentType) {
                res.setHeader('Content-Type', contentType);
            }
            res.send(response.data);
        }

    } catch (error) {
        console.error('Proxy error:', error.message);
        if (error.response) {
            res.status(error.response.status).send(error.response.data);
        } else if (error.request) {
            res.status(500).send('No response received from target URL.');
        } else {
            res.status(500).send('Error setting up proxy request.');
        }
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser and enter a URL to unblock.`);
});