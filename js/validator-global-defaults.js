;jQuery.validator.setDefaults({
  // highlight:      function () {/*void*/},
  errorClass:     'c-form-element__help',
  highlight:      function (element) {
    $(element).parents('.c-form-element').addClass('c-has-error');
  },
  unhighlight:    function (element) {
    $(element).parents('.c-form-element').removeClass('c-has-error');
  },
  errorPlacement: function (error, element) {
    error.appendTo( element.parents('.c-form-element') );
    element.parents('.c-form-element').addClass('c-has-error');
  },
  success:        function (label, element) {
    $(element).parents('.c-form-element').removeClass('c-has-error');
  }
});
