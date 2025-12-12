'use client';

// Completely static global error page
export default function GlobalError() {
  return (
    <html>
      <head>
        <title>Error</title>
      </head>
      <body>
        <div>
          <h1>Something went wrong</h1>
        </div>
      </body>
    </html>
  )
}
