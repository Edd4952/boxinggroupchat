const fs = require('fs');
const path = require('path');

// Optional: Keep only if you still want a web-build copy locally
if (fs.existsSync('web-build')) fs.rmSync('web-build', { recursive: true, force: true });
if (fs.existsSync('dist')) {
  fs.cpSync('dist', 'web-build', { recursive: true });
  console.log('[postbuild] Copied dist -> web-build (local preview)');
} else {
  console.log('[postbuild] No dist folder yet. Run: npm run build:web');
}

function rewrite() {
  const files = ['web-build/index.html', 'web-build/404.html'].filter(f => fs.existsSync(f));
  files.forEach(f => {
    let html = fs.readFileSync(f, 'utf8');
    const replaced = html.replace(/(["'(])\/_expo\//g, '$1./_expo/');
    if (replaced !== html) {
      fs.writeFileSync(f, replaced, 'utf8');
      console.log(`[postbuild] Rewrote /_expo/ -> ./_expo/ in ${path.basename(f)}`);
    } else {
      console.log(`[postbuild] No /_expo/ paths in ${path.basename(f)}`);
    }
  });
  if (!fs.existsSync('web-build/404.html') && fs.existsSync('web-build/index.html')) {
    fs.copyFileSync('web-build/index.html', 'web-build/404.html');
    console.log('[postbuild] Created 404.html');
  }
  // IMPORTANT: allow _expo directory on GitHub Pages
  fs.writeFileSync(path.join('web-build', '.nojekyll'), '');
  console.log('[postbuild] Wrote .nojekyll');
}

rewrite();
console.log('[postbuild] Done.');