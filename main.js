$(document).ready(function(){
  $('#rocks').attr('src', $('#rocks').attr('src') + "?" +Math.rand);
  $('#pano').attr('src', $('#pano').attr('src') + "?" +Math.rand);
  $('.parallax').parallax();
});
