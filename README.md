# TX-HUNTER // PROJECT_RED (Web Version)

This is a web-based version of the TX-Hunter tool, built with HTML, JavaScript, and Tailwind CSS.

## How to Use
Simply open `index.html` in any modern web browser.

## Features
- **Resolver**: Converts CFX join links to IP:Port.
- **Sniper**: Monitors port 40120 (txAdmin) and alerts when open.
- **Ping**: Estimates latency to the target server.

## Technical Notes & Limitations (Browser Security)
Because this runs entirely in your browser (Client-Side), it has some security restrictions compared to the Python version:

1.  **CORS (Cross-Origin Resource Sharing)**:
    -   Some browsers may block requests to the FiveM API or target servers if they don't allow "Cross-Origin" requests.
    -   If the Resolver fails, you might need to use a CORS extension or run a local proxy.

2.  **Port Scanning**:
    -   Browsers cannot directly check TCP ports. This tool uses a "smart fetch" trick to estimate if port 40120 is open.
    -   It detects "Connection Refused" (Closed) vs "Network Error/Timeout" (Likely Open/Filtered).
    -   It is not 100% accurate compared to a real socket connection.

3.  **Ping**:
    -   Real ICMP/TCP ping is impossible in a browser. This tool measures the time it takes to get an HTTP response (or error) from the server.

## Customization
-   Edit `css/style.css` to change colors/animations.
-   Edit `js/script.js` to tweak the logic.
