const markdownIt = require("markdown-it");

module.exports = function(eleventyConfig) {
  // Copy static assets
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/assets");

  // Initialize markdown-it
  const md = markdownIt({ html: true });

  // Parse presenter notes from markdown
  eleventyConfig.addFilter("extractNotes", function(content) {
    const notesMatch = content.match(/<!--\s*notes\s*\n([\s\S]*?)\n-->/i);
    return notesMatch ? notesMatch[1].trim() : '';
  });

  // Remove notes from slide content
  eleventyConfig.addFilter("removeNotes", function(content) {
    return content.replace(/<!--\s*notes\s*\n[\s\S]*?\n-->/gi, '');
  });

  // Extract background images from bg: directives
  eleventyConfig.addFilter("extractBgImages", function(rawContent) {
    const bgImages = [];
    const slides = rawContent.split(/\n---+\n/);
    slides.forEach(slide => {
      const bgMatch = slide.match(/^bg:\s*(.+)$/m);
      if (bgMatch) {
        const bgImage = bgMatch[1].trim();
        if (bgImage && !bgImages.includes(bgImage)) {
          bgImages.push(bgImage);
        }
      }
    });
    return bgImages;
  });

  // Process raw markdown content before template processing
  eleventyConfig.addFilter("processSlides", function(rawContent) {
    // Split by --- separator
    const slides = rawContent.split(/\n---+\n/).filter(slide => slide.trim());

    return slides.map((slide, index) => {
      // Extract notes
      const notesMatch = slide.match(/<!--\s*notes\s*\n([\s\S]*?)\n-->/i);
      const notes = notesMatch ? notesMatch[1].trim() : '';

      // Extract theme directive
      const themeMatch = slide.match(/^theme:\s*(.+)$/m);
      const theme = themeMatch ? themeMatch[1].trim() : null;

      // Extract title directive
      const titleMatch = slide.match(/^title:\s*(.+)$/m);
      const hideTitle = titleMatch ? titleMatch[1].trim() === 'false' : false;

      // Remove notes, theme directive, title directive, and render markdown
      let contentWithoutNotes = slide.replace(/<!--\s*notes\s*\n[\s\S]*?\n-->/gi, '');
      if (theme) {
        contentWithoutNotes = contentWithoutNotes.replace(/^theme:\s*.+$\n?/m, '');
      }
      if (titleMatch) {
        contentWithoutNotes = contentWithoutNotes.replace(/^title:\s*.+$\n?/m, '');
      }
      const htmlContent = md.render(contentWithoutNotes);

      return {
        index,
        content: htmlContent,
        notes,
        theme,
        hideTitle
      };
    });
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
};
