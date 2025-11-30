/**
 * Global JavaScript for PrintOra Theme
 * Handles common functionality across the theme
 */

(function() {
  'use strict';

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Add any global initialization here
    console.log('PrintOra theme initialized');
  }

  // Expose global utilities
  window.PrintOra = {
    // Add global utilities here if needed
  };
})();

