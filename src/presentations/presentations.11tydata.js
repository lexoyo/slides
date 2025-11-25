const fs = require('fs');
const path = require('path');

module.exports = {
  layout: "presentation.njk",
  eleventyComputed: {
    // Generate permalink based on filename
    permalink: (data) => {
      const basename = path.basename(data.page.inputPath, '.md');
      return `/presentations/${basename}/index.html`;
    },
    // Read raw content without frontmatter for slide processing
    rawContent: (data) => {
      const filepath = data.page.inputPath;
      if (fs.existsSync(filepath)) {
        const content = fs.readFileSync(filepath, 'utf8');
        // Remove frontmatter
        return content.replace(/^---[\s\S]*?---\n/, '');
      }
      return '';
    }
  }
};
