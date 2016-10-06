$(document).ready(function(){
  $('#rocks').attr('src', $('#rocks').attr('src') + "?load");
  $('#pano').attr('src', $('#pano').attr('src') + "?load");
  $('.parallax').parallax();
});
