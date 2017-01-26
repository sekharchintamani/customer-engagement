;(function ($, window, document, undefined) {
  $(function() {

    // Add state class to radios when selected
    $('body').on( 'mouseup, change', 'input[type=radio]', setSelectedState);

    $('input[type=radio]:checked').each(setSelectedState);

    function setSelectedState(){
     var
       name = this.name;
       $related_inputs = $('input[type=radio][name='+name+']'),
       selected_class = 'is-selected'
       ;

     $related_inputs.parents('.c-radio').removeClass(selected_class);
     $(this).parents('.c-radio').addClass(selected_class);
    }
  });
})(jQuery, window, document);
