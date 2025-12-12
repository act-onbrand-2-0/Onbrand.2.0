'use client';

// Completely static not-found page
export default function NotFound() {
  return (
    <html>
      <head>
        <title>404 - Not Found</title>
      </head>
      <body>
        <div>
          <h1>404 - Page Not Found</h1>
          <p>The page you are looking for does not exist.</p>
          <a href="/">Return Home</a>
        </div>
      </body>
    </html>
  )
}
