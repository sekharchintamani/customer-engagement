/**
 * MOBILENAV.JS
 *
 * Controls the behavior of the main navigation bar on mobile-szed screens.
 * At present, this is handled by the Bootstrap "collapse" script, to
 * replicate the functionality of the main WP marketing site.
 */

$(function() {
  // prevent clicks on mobile nav button scrolling page
  $('.c-nav-menu--main__mobile-toggle').on('click',function(e) {
    e.preventDefault();
  });
});
