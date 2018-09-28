$(document).ready(function(){
  let loaded = 0;
  $('#rocks').attr('src', $('#rocks').attr('src') + "?load" + Date.now());
  $('#pano').attr('src', $('#pano').attr('src') + "?load" + Date.now());
  $('.parallax').parallax();
});