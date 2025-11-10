const fs = require('fs');
const path = require('path');

module.exports = {
  eleventyComputed: {
    rawContent: (data) => {
      // Read the raw file content
      const filepath = path.join(data.page.inputPath);
      if (fs.existsSync(filepath)) {
        const content = fs.readFileSync(filepath, 'utf8');
        // Remove frontmatter
        return content.replace(/^---[\s\S]*?---\n/, '');
      }
      return '';
    }
  }
};
