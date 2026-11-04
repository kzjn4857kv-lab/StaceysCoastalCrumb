Stacey's Coastal Crumb website redesign

Files:
- index.html: landing page
- sourdough.html: sourdough ordering page
- tomato-sauce.html: tomato sauce ordering page
- styles.css: shared responsive styling
- app.js: existing ordering logic plus cross-page draft persistence
- sourdough-hero.jpg, sourdough.jpg, tomato-sauce.jpg: website photography

Deployment:
1. Upload every file in this folder to the same directory in your GitHub Pages repository.
2. Keep the filenames unchanged; the pages and assets reference one another by filename.
3. Open index.html (your site's root page) to start.

Ordering behavior retained:
- Existing Supabase project configuration and RPC calls
- Weekly loaf capacity checks and the 8-loaf fallback
- Sauce products excluded from loaf capacity
- Existing product prices, quantities, and inclusion choices
- Existing order validation and Supabase order insertion
- Existing confirmation and reset behavior

The added draft persistence saves selections and pickup details in the visitor's browser so a customer can switch between the two category pages without losing their in-progress order. The server-side capacity checks and order submission flow remain in place.
