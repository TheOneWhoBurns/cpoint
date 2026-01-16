/**
 * CloudFlare Worker for Scale-to-Zero Auto Wake-Up
 *
 * This worker detects when the origin is down and triggers Lambda
 * to scale up the ASG, bringing the applications back online.
 *
 * Configuration: Update WAKEUP_URL with your Lambda Function URL
 */

const CONFIG = {
  // Replace with your Lambda Function URL from Terraform outputs
  WAKEUP_URL: 'https://YOUR_LAMBDA_URL_HERE.lambda-url.us-east-1.on.aws/',

  // Origin domain (DNS only, not proxied through CloudFlare)
  ORIGIN: 'origin.xn--caonpoint-m6a.com',

  // Message shown while server is waking up
  WAKE_MESSAGE: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Server Waking Up</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
          text-align: center;
          background: white;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          max-width: 600px;
        }
        h1 {
          color: #333;
          margin: 0 0 10px 0;
        }
        p {
          color: #666;
          line-height: 1.6;
          margin: 15px 0;
        }
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 20px auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .status {
          font-size: 14px;
          color: #999;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Server Waking Up</h1>
        <div class="spinner"></div>
        <p>The rental management system is currently offline and is being brought back online.</p>
        <p><strong>Please wait 2-3 minutes</strong> and then refresh this page.</p>
        <p>If the issue persists, contact support.</p>
        <div class="status">
          Server Status: <span id="status">Starting...</span>
        </div>
      </div>
      <script>
        // Check every 30 seconds if server is back
        let checkCount = 0;
        const maxChecks = 6; // 3 minutes max

        async function checkServer() {
          try {
            const response = await fetch(window.location.href, {
              method: 'HEAD',
              cache: 'no-store'
            });
            if (response.ok || response.status < 500) {
              // Server is back, reload
              setTimeout(() => window.location.reload(), 1000);
              return;
            }
          } catch (e) {
            // Still down
          }

          checkCount++;
          const elapsed = checkCount * 30;
          document.getElementById('status').textContent = elapsed + 's elapsed...';

          if (checkCount < maxChecks) {
            setTimeout(checkServer, 30000);
          } else {
            document.getElementById('status').textContent = 'Taking longer than expected. Please refresh manually.';
          }
        }

        // Start checking after 30 seconds
        setTimeout(checkServer, 30000);
      </script>
    </body>
    </html>
  `,

  // Request timeout in milliseconds
  ORIGIN_TIMEOUT: 5000,

  // Cache TTL for 503 responses
  CACHE_TTL: 60
};

/**
 * Trigger Lambda function to scale up ASG
 */
async function triggerWakeup() {
  try {
    const response = await fetch(CONFIG.WAKEUP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'scale-up',
        timestamp: new Date().toISOString()
      })
    });

    console.log('Wake-up request sent to Lambda:', response.status);
    return response.ok;
  } catch (error) {
    console.error('Failed to trigger wake-up:', error);
    return false;
  }
}

/**
 * Check if origin is accessible
 */
async function checkOrigin(request) {
  try {
    const response = await fetch(`https://${CONFIG.ORIGIN}${new URL(request.url).pathname}`, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      timeout: CONFIG.ORIGIN_TIMEOUT,
      cf: {
        cacheTtl: 0,
        mirage: false
      }
    });

    return { ok: true, response };
  } catch (error) {
    console.error('Origin check failed:', error.message);
    return { ok: false, error };
  }
}

/**
 * Main request handler
 */
async function handleRequest(request) {
  // Only handle GET/HEAD for wake-up detection
  const isReadRequest = ['GET', 'HEAD'].includes(request.method);

  if (isReadRequest) {
    // Try to access origin with timeout
    const originCheck = await checkOrigin(request);

    if (originCheck.ok) {
      // Origin is up, proxy the request
      return originCheck.response;
    }

    // Origin is down, trigger wake-up
    console.log('Origin is down, triggering wake-up');
    await triggerWakeup();

    // Return wake-up message
    return new Response(CONFIG.WAKE_MESSAGE, {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Retry-After': '180',
        'Cache-Control': `public, max-age=${CONFIG.CACHE_TTL}`
      }
    });
  }

  // For non-read requests (POST, PUT, DELETE), forward directly
  // These will fail if origin is down, but that's expected behavior
  return fetch(request, {
    cf: {
      cacheTtl: 0
    }
  });
}

// CloudFlare Worker entrypoint
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});
