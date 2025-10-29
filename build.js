#!/usr/bin/env node

/**
 * RivianSpotter Build Script
 *
 * Minifies JavaScript and CSS files for production deployment.
 * Generates production HTML files that reference minified assets.
 * Creates source maps for debugging.
 *
 * Usage:
 *   node build.js              - Full production build
 *   node build.js --js-only    - Minify JavaScript only
 *   node build.js --css-only   - Minify CSS only
 *   node build.js --html-only  - Generate production HTML only
 *   node build.js --clean      - Remove all generated files
 */

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');
const chalk = require('chalk');

// Configuration
const config = {
  jsFiles: [
    'js/app.js',
    'js/config.js',
    'js/components.js',
    'js/data-loader.js',
    'js/features.js',
    'js/admin/config.js',
    'js/admin/state.js',
    'js/admin/auth.js',
    'js/admin/api.js',
    'js/admin/ui.js',
    'js/admin/modal.js',
    'js/admin/app.js'
  ],
  cssFiles: [
    'css/style.css',
    'css/admin.css'
  ],
  htmlFiles: [
    'index.html',
    'admin.html',
    'about.html',
    'contact.html'
  ],
  ignorePatterns: []
};

// Read .buildignore file if it exists
function readBuildIgnore() {
  const ignorePath = path.join(__dirname, '.buildignore');
  if (fs.existsSync(ignorePath)) {
    const content = fs.readFileSync(ignorePath, 'utf8');
    const patterns = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
    config.ignorePatterns = patterns;
    console.log(chalk.gray(`Loaded ${patterns.length} ignore patterns from .buildignore`));
  }
}

// Check if a file should be ignored
function shouldIgnore(filePath) {
  return config.ignorePatterns.some(pattern => {
    if (pattern.includes('*')) {
      // Convert glob pattern to regex
      // First, escape special regex characters except *
      let regexPattern = pattern
        .replace(/\./g, '\\.') // Escape dots
        .replace(/\?/g, '\\?')  // Escape question marks
        .replace(/\+/g, '\\+')  // Escape plus signs
        .replace(/\^/g, '\\^')  // Escape carets
        .replace(/\$/g, '\\$')  // Escape dollar signs
        .replace(/\(/g, '\\(')  // Escape parentheses
        .replace(/\)/g, '\\)')
        .replace(/\[/g, '\\[')  // Escape brackets
        .replace(/\]/g, '\\]')
        .replace(/\{/g, '\\{')  // Escape braces
        .replace(/\}/g, '\\}')
        .replace(/\|/g, '\\|'); // Escape pipes

      // Then convert glob wildcards to regex
      regexPattern = regexPattern
        .replace(/\*\*/g, '___DOUBLESTAR___') // Temporarily replace **
        .replace(/\*/g, '[^/]*')               // * matches anything except /
        .replace(/___DOUBLESTAR___/g, '.*');  // ** matches anything including /

      const regex = new RegExp('^' + regexPattern + '$');
      return regex.test(filePath);
    }
    return filePath.includes(pattern);
  });
}

// Minify JavaScript file
async function minifyJS(inputPath, outputPath) {
  if (shouldIgnore(inputPath)) {
    console.log(chalk.yellow(`  Skipping (ignored): ${inputPath}`));
    return;
  }

  try {
    const code = fs.readFileSync(inputPath, 'utf8');
    const result = await minify(code, {
      sourceMap: {
        filename: path.basename(outputPath),
        url: path.basename(outputPath) + '.map'
      },
      compress: {
        dead_code: true,
        drop_console: false, // Keep console for debugging
        drop_debugger: true,
        keep_classnames: true,
        keep_fnames: false,
        passes: 2
      },
      mangle: {
        keep_classnames: true
      },
      format: {
        comments: false
      }
    });

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write minified code
    fs.writeFileSync(outputPath, result.code);

    // Write source map
    if (result.map) {
      fs.writeFileSync(outputPath + '.map', result.map);
    }

    // Calculate size reduction
    const originalSize = Buffer.byteLength(code, 'utf8');
    const minifiedSize = Buffer.byteLength(result.code, 'utf8');
    const reduction = ((1 - minifiedSize / originalSize) * 100).toFixed(1);

    console.log(chalk.green(`  ✓ ${inputPath} → ${outputPath}`));
    console.log(chalk.gray(`    ${formatBytes(originalSize)} → ${formatBytes(minifiedSize)} (${reduction}% reduction)`));
  } catch (error) {
    console.error(chalk.red(`  ✗ Error minifying ${inputPath}:`), error.message);
    throw error;
  }
}

// Minify CSS file
function minifyCSS(inputPath, outputPath) {
  if (shouldIgnore(inputPath)) {
    console.log(chalk.yellow(`  Skipping (ignored): ${inputPath}`));
    return;
  }

  try {
    const code = fs.readFileSync(inputPath, 'utf8');
    const result = new CleanCSS({
      sourceMap: true,
      level: 2,
      returnPromise: false
    }).minify(code);

    if (result.errors.length > 0) {
      throw new Error(result.errors.join('\n'));
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write minified CSS
    fs.writeFileSync(outputPath, result.styles);

    // Write source map
    if (result.sourceMap) {
      fs.writeFileSync(outputPath + '.map', result.sourceMap.toString());
    }

    // Calculate size reduction
    const originalSize = Buffer.byteLength(code, 'utf8');
    const minifiedSize = Buffer.byteLength(result.styles, 'utf8');
    const reduction = ((1 - minifiedSize / originalSize) * 100).toFixed(1);

    console.log(chalk.green(`  ✓ ${inputPath} → ${outputPath}`));
    console.log(chalk.gray(`    ${formatBytes(originalSize)} → ${formatBytes(minifiedSize)} (${reduction}% reduction)`));
  } catch (error) {
    console.error(chalk.red(`  ✗ Error minifying ${inputPath}:`), error.message);
    throw error;
  }
}

// Generate production HTML file
function generateProductionHTML(inputPath, outputPath) {
  if (shouldIgnore(inputPath)) {
    console.log(chalk.yellow(`  Skipping (ignored): ${inputPath}`));
    return;
  }

  try {
    let html = fs.readFileSync(inputPath, 'utf8');

    // Replace JS references with minified versions
    html = html.replace(/src="(js\/[^"]+\.js)(\?[^"]*)?"/g, (match, jsPath) => {
      // Skip locations.js as it's data, not code to minify
      if (jsPath.includes('locations.js') || jsPath.includes('config-loader.js')) {
        return match;
      }
      const minPath = jsPath.replace('.js', '.min.js');
      return `src="${minPath}"`;
    });

    // Replace CSS references with minified versions
    html = html.replace(/href="(css\/[^"]+\.css)"/g, (match, cssPath) => {
      const minPath = cssPath.replace('.css', '.min.css');
      return `href="${minPath}"`;
    });

    // Add production meta tag
    const metaTag = '\n    <meta name="build-version" content="production">';
    html = html.replace('</head>', `${metaTag}\n</head>`);

    // Write production HTML
    fs.writeFileSync(outputPath, html);

    console.log(chalk.green(`  ✓ ${inputPath} → ${outputPath}`));
  } catch (error) {
    console.error(chalk.red(`  ✗ Error generating production HTML for ${inputPath}:`), error.message);
    throw error;
  }
}

// Format bytes to human-readable format
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Clean generated files
function clean() {
  console.log(chalk.cyan('\n🧹 Cleaning generated files...\n'));

  const patterns = [
    'js/**/*.min.js',
    'js/**/*.min.js.map',
    'css/**/*.min.css',
    'css/**/*.min.css.map',
    '*.prod.html'
  ];

  let deletedCount = 0;

  patterns.forEach(pattern => {
    if (pattern.includes('**')) {
      // Handle recursive patterns
      const baseDir = pattern.split('**')[0];
      const extension = pattern.split('**')[1];
      if (fs.existsSync(baseDir)) {
        deleteRecursive(baseDir, extension);
      }
    } else {
      // Handle single file patterns
      const files = fs.readdirSync('.');
      files.forEach(file => {
        if (file.endsWith('.prod.html')) {
          fs.unlinkSync(file);
          console.log(chalk.gray(`  Deleted: ${file}`));
          deletedCount++;
        }
      });
    }
  });

  function deleteRecursive(dir, extension) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        deleteRecursive(filePath, extension);
      } else if (filePath.endsWith(extension)) {
        fs.unlinkSync(filePath);
        console.log(chalk.gray(`  Deleted: ${filePath}`));
        deletedCount++;
      }
    });
  }

  console.log(chalk.green(`\n✓ Cleaned ${deletedCount} generated files\n`));
}

// Main build function
async function build(options = {}) {
  const startTime = Date.now();

  console.log(chalk.cyan('\n🚀 RivianSpotter Production Build\n'));

  readBuildIgnore();

  try {
    // Minify JavaScript
    if (!options.cssOnly && !options.htmlOnly) {
      console.log(chalk.cyan('📦 Minifying JavaScript files...\n'));
      for (const jsFile of config.jsFiles) {
        const inputPath = path.join(__dirname, jsFile);
        if (fs.existsSync(inputPath)) {
          const outputPath = inputPath.replace('.js', '.min.js');
          await minifyJS(inputPath, outputPath);
        } else {
          console.log(chalk.yellow(`  ⚠ File not found: ${jsFile}`));
        }
      }
      console.log('');
    }

    // Minify CSS
    if (!options.jsOnly && !options.htmlOnly) {
      console.log(chalk.cyan('🎨 Minifying CSS files...\n'));
      for (const cssFile of config.cssFiles) {
        const inputPath = path.join(__dirname, cssFile);
        if (fs.existsSync(inputPath)) {
          const outputPath = inputPath.replace('.css', '.min.css');
          minifyCSS(inputPath, outputPath);
        } else {
          console.log(chalk.yellow(`  ⚠ File not found: ${cssFile}`));
        }
      }
      console.log('');
    }

    // Generate production HTML
    if (!options.jsOnly && !options.cssOnly) {
      console.log(chalk.cyan('📄 Generating production HTML files...\n'));
      for (const htmlFile of config.htmlFiles) {
        const inputPath = path.join(__dirname, htmlFile);
        if (fs.existsSync(inputPath)) {
          const outputPath = inputPath.replace('.html', '.prod.html');
          generateProductionHTML(inputPath, outputPath);
        } else {
          console.log(chalk.yellow(`  ⚠ File not found: ${htmlFile}`));
        }
      }
      console.log('');
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(chalk.green(`✓ Build completed successfully in ${duration}s\n`));
    console.log(chalk.cyan('📋 Next steps:'));
    console.log(chalk.gray('  1. Test the production files locally'));
    console.log(chalk.gray('  2. Upload *.prod.html, *.min.js, and *.min.css files to your server'));
    console.log(chalk.gray('  3. Rename *.prod.html to *.html on the server (or configure web server)'));
    console.log(chalk.gray('  4. See DEPLOYMENT.md for detailed deployment instructions\n'));

  } catch (error) {
    console.error(chalk.red('\n✗ Build failed:'), error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  jsOnly: args.includes('--js-only'),
  cssOnly: args.includes('--css-only'),
  htmlOnly: args.includes('--html-only'),
  clean: args.includes('--clean')
};

// Run build or clean
if (options.clean) {
  clean();
} else {
  build(options);
}
